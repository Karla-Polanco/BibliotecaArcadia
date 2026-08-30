/**
 * ============================================================================
 * READER MANAGER - ORQUESTADOR DEL MOTOR DE LECTURA EPUB
 * ============================================================================
 * Fachada sobre epub.js: gestiona el ciclo de vida del libro, el renderizado
 * seguro en iframe, navegación fluida, inyección de temas y persistencia de CFI.
 */

import { dbManager } from '../db.js';
import { LocationsManager } from './LocationsManager.js';
import { ReaderSettings } from './ReaderSettings.js';
import { annotationManager } from '../annotations/AnnotationManager.js';
import { floatingMenu } from '../ui/FloatingMenu.js';
import { appState } from '../state.js';

export class ReaderManager {
  constructor() {
    this.book = null;
    this.rendition = null;
    this.locationsManager = null;
    this.currentBookId = null;
    this.currentBookData = null;
    this.currentSettings = null;
    this.currentCfi = null;
    this.toc = [];
    this.saveProgressTimeout = null;
    this.onRelocatedCallbacks = new Set();
  }

  /**
   * Abre y renderiza un libro EPUB en el contenedor especificado.
   * @param {string} bookId - ID del libro en IndexedDB
   * @param {HTMLElement|string} targetElement - Contenedor en el DOM
   * @param {string} [initialCfi] - Posición inicial opcional (para saltar a notas/citas)
   * @returns {Promise<Object>} Metadatos y tabla de contenidos
   */
  async openBook(bookId, targetElement, initialCfi = null) {
    this.destroy(); // Limpiar sesión previa si existe

    this.currentBookId = bookId;
    this.currentBookData = await dbManager.get('books', bookId);
    if (!this.currentBookData) {
      throw new Error(`El libro con ID ${bookId} no se encuentra en la base de datos.`);
    }

    // 1. Obtener los datos binarios del EPUB (Blob o ArrayBuffer)
    let bookSource = this.currentBookData.fileBlob;

    // Si el libro es una muestra sin fileBlob propio, cargar el EPUB de prueba
    if (!bookSource) {
      bookSource = await this._loadFallbackEpub();
    }

    const arrayBuffer = bookSource instanceof ArrayBuffer ? bookSource : await bookSource.arrayBuffer();

    // 2. Inicializar instancia de epub.js
    if (!window.ePub) {
      throw new Error('La librería epub.js no está disponible en el entorno global.');
    }

    this.book = window.ePub(arrayBuffer);

    // 3. Obtener configuración específica del libro desde IndexedDB
    this.currentSettings = await ReaderSettings.get(bookId);

    // 4. Configurar Rendition
    const container = typeof targetElement === 'string' ? document.getElementById(targetElement) : targetElement;
    container.innerHTML = '';

    this.rendition = this.book.renderTo(container, {
      width: '100%',
      height: '100%',
      flow: this.currentSettings.flowMode === 'paginated' ? 'paginated' : 'scrolled-doc',
      spread: this.currentSettings.columns === 2 ? 'always' : 'none',
      allowScriptedContent: false // Seguridad contra XSS en libros
    });

    // 5. Inyectar estilos y temas en el iframe (inicial y en cada nuevo capítulo cargado)
    const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'mystic-night';
    if (this.rendition.hooks && this.rendition.hooks.content) {
      this.rendition.hooks.content.register((contents) => {
        ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);

        if (contents.document) {
          // Atajos de teclado dentro del iframe
          contents.document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
              e.preventDefault();
              this.nextPage();
            } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
              e.preventDefault();
              this.prevPage();
            }
          });

          // Clics laterales dentro del iframe para pasar de página
          contents.document.addEventListener('click', (e) => {
            const sel = contents.window ? contents.window.getSelection() : null;
            if (sel && sel.toString().trim().length > 0) return;
            if (e.target.closest('a, button, input')) return;

            const width = contents.window.innerWidth;
            const clickX = e.clientX;
            if (clickX < width * 0.25) {
              this.prevPage();
            } else if (clickX > width * 0.75) {
              this.nextPage();
            } else {
              const readerEl = document.getElementById('reader-view');
              if (readerEl) readerEl.classList.toggle('immersive');
            }
          });
        }
      });
    }
    ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);

    // 6. Cargar Tabla de Contenidos (TOC)
    await this.book.loaded.navigation;
    this.toc = this.book.navigation.toc || [];

    // 7. Inicializar Gestor de Ubicaciones
    this.locationsManager = new LocationsManager(this.book, bookId);
    this.locationsManager.init(); // En segundo plano

    // 8. Recuperar posición de lectura (priorizar initialCfi si viene de una nota)
    let targetCfi = initialCfi;
    if (!targetCfi) {
      const progressData = await dbManager.get('readingProgress', bookId);
      targetCfi = progressData && progressData.currentCfi ? progressData.currentCfi : undefined;
    }

    // 9. Conectar Gestor de Anotaciones y Barra Flotante
    await annotationManager.attach(this.rendition, bookId);
    floatingMenu.attach(this.rendition);

    // 10. Mostrar el libro en la posición correspondiente
    await this.rendition.display(targetCfi);

    // 11. Vincular oyente de cambio de ubicación (relocated)
    this.rendition.on('relocated', (location) => {
      this._handleRelocated(location);
    });

    return {
      book: this.currentBookData,
      toc: this.toc
    };
  }

  /**
   * Navega a la siguiente página.
   */
  nextPage() {
    if (this.rendition) {
      try {
        this.rendition.next();
      } catch (e) {
        console.warn('Aviso en nextPage:', e);
      }
    }
  }

  /**
   * Navega a la página anterior.
   */
  prevPage() {
    if (this.rendition) {
      try {
        this.rendition.prev();
      } catch (e) {
        console.warn('Aviso en prevPage:', e);
      }
    }
  }

  /**
   * Salta a una posición CFI o href de capítulo.
   */
  async goTo(target) {
    if (this.rendition && target) {
      await this.rendition.display(target);
    }
  }

  /**
   * Salta a un porcentaje aproximado (0 a 100).
   */
  async goToPercentage(pct) {
    if (this.locationsManager) {
      const cfi = this.locationsManager.getCfiFromPercentage(pct);
      if (cfi) await this.goTo(cfi);
    }
  }

  /**
   * Obtiene la configuración activa del libro.
   */
  getSettings() {
    return this.currentSettings || ReaderSettings.DEFAULT_SETTINGS;
  }

  /**
   * Actualiza la configuración del libro en IndexedDB y la aplica al vuelo.
   * @param {Object} partialSettings - Propiedades a modificar
   * @returns {Promise<Object>} Configuración actualizada
   */
  async updateSettings(partialSettings) {
    if (!this.currentBookId || !this.rendition) return;

    this.currentSettings = await ReaderSettings.save(this.currentBookId, partialSettings);
    const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'mystic-night';
    ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);

    return this.currentSettings;
  }

  /**
   * Manejador de evento al cambiar de página o ubicación.
   * @private
   */
  _handleRelocated(location) {
    if (!location || !location.start) return;

    const startCfi = location.start.cfi;
    this.currentCfi = startCfi;

    // Obtener título de capítulo si está disponible
    const chapterHref = location.start.href;
    const chapterTitle = this._findChapterTitle(chapterHref) || 'Capítulo actual';

    // Calcular porcentaje
    let percentage = 0;
    if (location.start.percentage) {
      percentage = Math.round(location.start.percentage * 1000) / 10;
    } else if (this.locationsManager) {
      percentage = this.locationsManager.getPercentage(startCfi);
    }

    // Persistir asíncronamente con debounce para no saturar IndexedDB
    clearTimeout(this.saveProgressTimeout);
    this.saveProgressTimeout = setTimeout(async () => {
      await this._saveReadingProgress(startCfi, chapterHref, chapterTitle, percentage);
    }, 400);

    // Notificar a los observadores suscritos de la UI
    const locationPayload = {
      cfi: startCfi,
      chapterTitle,
      percentage,
      location
    };

    this.onRelocatedCallbacks.forEach(cb => {
      try { cb(locationPayload); } catch (e) { console.error(e); }
    });
  }

  /**
   * Guarda el avance en IndexedDB y actualiza el estado general del libro.
   * @private
   */
  async _saveReadingProgress(cfi, chapterHref, chapterTitle, percentage) {
    if (!this.currentBookId) return;

    try {
      // 1. Guardar en readingProgress
      await dbManager.put('readingProgress', {
        bookId: this.currentBookId,
        currentCfi: cfi,
        chapterHref: chapterHref || '',
        chapterTitle: chapterTitle,
        percentage: percentage,
        updatedAt: Date.now()
      });

      // 2. Actualizar metadatos del libro en books
      const book = await dbManager.get('books', this.currentBookId);
      if (book) {
        book.progress = Math.min(100, Math.max(0, Math.round(percentage)));
        book.lastReadAt = Date.now();
        if (book.progress >= 100) {
          book.status = 'completed';
        } else if (book.progress > 0) {
          book.status = 'reading';
        }
        await dbManager.put('books', book);
        appState.notify('bookUpdated', book);
      }
    } catch (err) {
      console.warn('Error al guardar progreso de lectura:', err);
    }
  }

  /**
   * Busca el nombre legible del capítulo en la tabla de contenidos por href.
   * @private
   */
  _findChapterTitle(href) {
    if (!href || !this.toc) return '';
    const cleanHref = href.split('#')[0];

    const searchToc = (items) => {
      for (const item of items) {
        if (item.href && item.href.includes(cleanHref)) {
          return item.label ? item.label.trim() : '';
        }
        if (item.subitems && item.subitems.length > 0) {
          const found = searchToc(item.subitems);
          if (found) return found;
        }
      }
      return '';
    };

    return searchToc(this.toc);
  }

  /**
   * Carga el EPUB de muestra local como fallback seguro.
   * @private
   */
  async _loadFallbackEpub() {
    try {
      const resp = await fetch('assets/sample/sample_book.epub');
      if (resp.ok) {
        return await resp.arrayBuffer();
      }
    } catch (e) {
      // Intentar ruta alternativa
    }

    try {
      const resp2 = await fetch('scratch/test_book.epub');
      if (resp2.ok) {
        return await resp2.arrayBuffer();
      }
    } catch (e2) {}

    throw new Error('No se encontraron datos binarios EPUB para este libro.');
  }

  /**
   * Registra un callback para recibir cambios de ubicación.
   */
  onRelocated(callback) {
    this.onRelocatedCallbacks.add(callback);
    return () => this.onRelocatedCallbacks.delete(callback);
  }

  /**
   * Destruye el renderizador y libera recursos en memoria.
   */
  destroy() {
    if (this.rendition) {
      try { this.rendition.destroy(); } catch (e) {}
      this.rendition = null;
    }
    if (this.book) {
      try { this.book.destroy(); } catch (e) {}
      this.book = null;
    }
    this.locationsManager = null;
    this.currentBookId = null;
    this.currentBookData = null;
    this.currentCfi = null;
    this.toc = [];
    clearTimeout(this.saveProgressTimeout);
    this.onRelocatedCallbacks.clear();

    try {
      annotationManager.detach();
      floatingMenu.hide();
    } catch (e) {}
  }
}

// Instancia singleton compartida
export const readerManager = new ReaderManager();
