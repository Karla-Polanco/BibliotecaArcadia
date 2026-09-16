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
    this.isNavigating = false;
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

const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
const effectiveSpread = (!isMobile && this.currentSettings.columns === 2) ? 'always' : 'auto';

    const { width: rendWidth, height: rendHeight } = this.computeRenditionSize();

    this.rendition = this.book.renderTo(container, {
      width: rendWidth + 'px',
      height: rendHeight + 'px',
      flow: 'scrolled-doc',
      spread: effectiveSpread,
      allowScriptedContent: false
    });

    // 5. Inyectar estilos y temas en el iframe (inicial y en cada nuevo capítulo cargado)
    const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'mystic-night';
    if (this.rendition.hooks && this.rendition.hooks.content) {
      this.rendition.hooks.content.register((contents) => {
        ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);
        window.dispatchEvent(new CustomEvent('arcadia:reader-content-loaded', { detail: { contents } }));
      });
    }
    ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);

    // 6. Cargar Tabla de Contenidos (TOC)
    await this.book.loaded.navigation;
    this.toc = this.book.navigation.toc || [];

    // 7. Inicializar Gestor de Ubicaciones (en segundo plano, sin bloquear la apertura)
    this.locationsManager = new LocationsManager(this.book, bookId);
    this.locationsManager.init().catch(() => {});

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
   * Navega a la siguiente página con bloqueo contra pulsaciones múltiples.
   */
  async nextPage() {
    if (!this.rendition || this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.rendition.next();
        this._resetScrollTop();
    } catch (err) {
      console.warn('[ReaderManager] nextPage:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 200);
    }
  }

  /**
   * Navega a la página anterior con bloqueo contra pulsaciones múltiples.
   */
  async prevPage() {
    if (!this.rendition || this.isNavigating) return;
    this.isNavigating = true;
    try {
      await this.rendition.prev();
        this._resetScrollTop();
    } catch (err) {
      console.warn('[ReaderManager] prevPage:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 200);
    }
  }

  /**
   * Salta al capítulo siguiente de forma fluida (ideal para Desplazamiento).
   */
  async nextChapter() {
    if (!this.book || !this.rendition || this.isNavigating) return;
    this.isNavigating = true;
    try {
      const currentLoc = this.rendition.currentLocation();
      const currentHref = currentLoc?.start?.href;
      if (currentHref && this.book.spine && this.book.spine.items) {
        const items = this.book.spine.items;
        const currentIndex = items.findIndex(item => item.href === currentHref || item.url === currentHref || currentHref.includes(item.href));
        if (currentIndex !== -1 && currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1];
          await this.rendition.display(nextItem.href);
          this._resetScrollTop();
          return;
        }
      }
      await this.rendition.next();
      this._resetScrollTop();
    } catch (err) {
      console.warn('[ReaderManager] nextChapter:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 250);
    }
  }

  /**
   * Salta al capítulo anterior de forma fluida (ideal para Desplazamiento).
   */
  async prevChapter() {
    if (!this.book || !this.rendition || this.isNavigating) return;
    this.isNavigating = true;
    try {
      const currentLoc = this.rendition.currentLocation();
      const currentHref = currentLoc?.start?.href;
      if (currentHref && this.book.spine && this.book.spine.items) {
        const items = this.book.spine.items;
        const currentIndex = items.findIndex(item => item.href === currentHref || item.url === currentHref || currentHref.includes(item.href));
        if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1];
          await this.rendition.display(prevItem.href);
          this._resetScrollTop();
          return;
        }
      }
      await this.rendition.prev();
      this._resetScrollTop();
    } catch (err) {
      console.warn('[ReaderManager] prevChapter:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 250);
    }
  }

  /**
   * Resetea el scroll vertical al inicio del documento.
   * @private
   */
  _resetScrollTop() {
    try {
      const contents = this.rendition.getContents ? this.rendition.getContents() : [];
      contents.forEach(content => {
        if (content && content.window) {
          content.window.scrollTo(0, 0);
        }
        if (content && content.document && content.document.documentElement) {
          content.document.documentElement.scrollTop = 0;
        }
        if (content && content.document && content.document.body) {
          content.document.body.scrollTop = 0;
        }
      });
    } catch (_) {}
  }

  /**
   * Salta a una posición CFI o href de capítulo.
   */
  async goTo(target) {
    if (!this.rendition || !target) return;
    try {
      await this.rendition.display(target);
    } catch (err) {
      console.warn('[ReaderManager] goTo falló:', err);
      // Reintentar sin fragmento (#...) si el CFI/href incluye ancla
      try {
        const clean = String(target).split('#')[0];
        if (clean && clean !== target) {
          await this.rendition.display(clean);
          return;
        }
      } catch (_) {}
      throw err;
    }
  }

  /**
   * Salta a un porcentaje aproximado (0 a 100).
   * Retorna false si las ubicaciones aún no están listas.
   */
  async goToPercentage(pct) {
    if (!this.locationsManager) return false;
    if (!this.locationsManager.isReady) {
      console.info('[ReaderManager] Ubicaciones aún generándose, reintentando...');
      // Esperar hasta 3s a que estén listas sin bloquear la UI
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 500));
        if (this.locationsManager?.isReady) break;
      }
      if (!this.locationsManager?.isReady) return false;
    }
    try {
      const cfi = this.locationsManager.getCfiFromPercentage(pct);
      if (!cfi) return false;
      await this.goTo(cfi);
      return true;
    } catch (err) {
      console.warn('[ReaderManager] goToPercentage falló:', err);
      return false;
    }
  }

  /**
   * Obtiene la configuración activa del libro.
   */
  getSettings() {
    return this.currentSettings || ReaderSettings.DEFAULT_SETTINGS;
  }

  /**
   * Calcula el tamaño del rendition según el viewport visible actual.
   * Se mide el contenedor del viewport (no el contenido) para no crecer
   * sin límite cuando el libro ya está renderizado.
   */
  computeRenditionSize() {
    const viewportEl = document.getElementById('reader-viewport');
    const vw = (viewportEl?.clientWidth || window.innerWidth || 800);
    const vh = (viewportEl?.clientHeight || window.innerHeight || 600);
    return {
      width: Math.min(Math.max(280, vw), 900),
      height: Math.max(320, vh)
    };
  }

  /**
   * Reajusta el rendition al tamaño visible actual (tras ocultar/mostrar
   * las barras inmersivas, rotar o redimensionar la ventana).
   * Sin esto el iframe conserva su tamaño viejo y deja franjas negras.
   */
  resizeToViewport() {
    if (!this.rendition || !this.book) return false;
    try {
      if (typeof this.rendition.resize === 'function') {
        const { width, height } = this.computeRenditionSize();
        this.rendition.resize(width, height);
        return true;
      }
    } catch (err) {
      console.warn('[ReaderManager] resizeToViewport falló:', err);
    }
    return false;
  }

  /**
   * Actualiza la configuración del libro en IndexedDB y la aplica al vuelo.
   * @param {Object} partialSettings - Propiedades a modificar
   * @returns {Promise<Object>} Configuración actualizada
   */
  async updateSettings(partialSettings) {
    if (!this.currentBookId) return;

    this.currentSettings = await ReaderSettings.save(this.currentBookId, partialSettings);
    if (this.rendition) {
      const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'mystic-night';
      ReaderSettings.apply(this.rendition, this.currentSettings, activeGlobalTheme);
    }

    return this.currentSettings;
  }

/**
    * Modo de lectura fijo en Desplazamiento (scroll continuo).
    */
  async setFlowMode() {
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
   * Además registra el salto en positionHistory (máx. 50 por libro).
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

      // 1b. Registrar en positionHistory (útil para "volver atrás")
      try {
        const now = Date.now();
        await dbManager.put('positionHistory', {
          id: `pos-${this.currentBookId}-${now}`,
          bookId: this.currentBookId,
          cfi,
          chapterHref: chapterHref || '',
          percentage,
          timestamp: now
        });
        // Poda: conservar solo las 50 más recientes
        const allPos = await dbManager.getByIndex('positionHistory', 'by_bookId', this.currentBookId).catch(() => []);
        if ((allPos || []).length > 50) {
          const sorted = [...allPos].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          const extras = sorted.slice(0, sorted.length - 50);
          for (const old of extras) {
            try { await dbManager.delete('positionHistory', old.id); } catch (_) {}
          }
        }
      } catch (_) {}

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
   * Carga el EPUB de muestra local como fallback seguro (solo datos legacy sin Blob).
   * Los libros normales siempre tienen fileBlob (EPUBParser.parse).
   * @private
   */
  async _loadFallbackEpub() {
    const candidates = [
      'assets/sample/sample_book.epub',
      './assets/sample/sample_book.epub'
    ];
    for (const url of candidates) {
      try {
        const resp = await fetch(url);
        if (resp && resp.ok) {
          return await resp.arrayBuffer();
        }
      } catch (_) {
        // probar siguiente candidato
      }
    }

    throw new Error('Este libro no tiene archivo EPUB válido (registro antiguo sin datos). Elimínalo y vuelve a importarlo.');
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
