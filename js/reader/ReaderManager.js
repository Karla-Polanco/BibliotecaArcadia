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
    this.currentChapterHref = '';
    this.currentChapterTitle = '';
    this.toc = [];
    this.saveProgressTimeout = null;
    this._pendingSave = null;
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
    const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'boreal-blue';
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
    this.locationsManager.init().then(() => {
      try {
        const loc = this.rendition && this.rendition.currentLocation
          ? this.rendition.currentLocation() : null;
        if (loc && loc.start) this._handleRelocated(loc);
      } catch (_) {}
    }).catch(() => {});

    // 8. Recuperar posición de lectura (priorizar initialCfi si viene de una nota)
    let targetCfi = initialCfi;
    if (!targetCfi) {
      const progressData = await dbManager.get('readingProgress', bookId);
      targetCfi = progressData && progressData.currentCfi ? progressData.currentCfi : undefined;
    }

    // 9. Conectar Gestor de Anotaciones y Barra Flotante
    await annotationManager.attach(this.rendition, bookId);
    floatingMenu.attach(this.rendition);

    // 10. Vincular oyente de cambio de ubicación ANTES de mostrar (si no,
    // el primer evento 'relocated' del display inicial se pierde y la
    // cabecera, el progreso y el capítulo activo quedan sin sincronizar)
    this.rendition.on('relocated', (location) => {
      this._handleRelocated(location);
    });

    // 11. Mostrar el libro en la posición correspondiente.
    // Si el CFI guardado está obsoleto y deja el visor vacío, reintentar desde el inicio.
    let displayed = false;
    let displayError = null;
    if (targetCfi) {
      try {
        await this.rendition.display(targetCfi);
        displayed = true;
      } catch (err) {
        displayError = err;
      }
      if (displayed && this._isRenditionBlank()) {
        displayed = false;
      }
    }
    if (!displayed) {
      try {
        await this.rendition.display();
      } catch (err) {
        if (displayError) throw displayError;
        throw err;
      }
    }

    return {
      book: this.currentBookData,
      toc: this.toc
    };
  }

  /**
   * Detecta si el rendition quedó sin contenido visible (p. ej. por un CFI
   * guardado obsoleto). Revisa el texto real de las vistas activas.
   * @private
   */
  _isRenditionBlank() {
    try {
      const contents = this.rendition && this.rendition.getContents ? this.rendition.getContents() : [];
      if (!contents || contents.length === 0) return true;
      return !contents.some(c => {
        try {
          const txt = (c.document && c.document.body && c.document.body.textContent || '').trim();
          return txt.length > 0;
        } catch (_) { return false; }
      });
    } catch (_) { return false; }
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
        const currentIndex = this._getSpineIndex(currentHref);
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
        const currentIndex = this._getSpineIndex(currentHref);
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
   * Resuelve el índice de un href dentro del spine (o -1 si no se encuentra).
   * Fuente única de verdad: la usan nextChapter(), prevChapter() y
   * getChapterNavState() para que el estado de los botones nunca se
   * contradiga con la navegación real. Normaliza quitando fragmentos (#...).
   * @private
   */
  _getSpineIndex(href) {
    if (!href || !this.book || !this.book.spine || !this.book.spine.items) return -1;
    const strip = (s) => String(s || '').split('#')[0].split('?')[0].trim();
    const target = strip(href);
    return this.book.spine.items.findIndex(item => {
      const a = strip(item.href);
      const b = strip(item.url);
      return (a && (a === target || target.startsWith(a))) ||
             (b && (b === target || target.startsWith(b)));
    });
  }

  /**
   * Indica si la posición actual es el primer o el último capítulo del spine.
   * Si el href no se puede resolver devuelve ambos en false (botones
   * habilitados) para no dejar al usuario sin salida.
   * @returns {{isFirst: boolean, isLast: boolean, total: number, index: number}}
   */
  getChapterNavState() {
    const items = (this.book && this.book.spine && this.book.spine.items) || [];
    const empty = { isFirst: false, isLast: false, total: items.length, index: -1 };
    if (items.length === 0 || !this.rendition) return empty;
    let href = '';
    try {
      const loc = this.rendition.currentLocation ? this.rendition.currentLocation() : null;
      href = (loc && loc.start && loc.start.href) || this.currentChapterHref || '';
    } catch (_) { return empty; }
    const index = this._getSpineIndex(href);
    if (index === -1) return empty;
    return {
      index,
      total: items.length,
      isFirst: index <= 0,
      isLast: index >= items.length - 1
    };
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
    // Desktop web: permitir columna más ancha para reducir gutters vacíos
    const cap = window.innerWidth >= 1600 ? 1200 : (window.innerWidth >= 1280 ? 1120 : 1024);
    return {
      width: Math.min(Math.max(280, vw), cap),
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
      const activeGlobalTheme = document.documentElement.getAttribute('data-theme') || 'boreal-blue';
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
    let chapterTitle = this._findChapterTitle(chapterHref);

    if (!chapterTitle) {
      try {
        const contents = this.rendition && this.rendition.getContents ? this.rendition.getContents() : [];
        if (contents && contents.length > 0 && contents[0].document) {
          chapterTitle = this._findChapterTitle(chapterHref, contents[0].document);
        }
      } catch (_) {}
    }

    if (!chapterTitle) {
      const idx = this._getSpineIndex(chapterHref);
      chapterTitle = idx !== -1 ? `Capítulo ${idx + 1}` : 'Capítulo 1';
    }

    this.currentChapterHref = chapterHref || '';
    this.currentChapterTitle = chapterTitle;

    // Calcular porcentaje (0% real es falsy: comprobar tipo explícito)
    let percentage = 0;
    const rawPct = location.start.percentage;
    if (typeof rawPct === 'number' && !isNaN(rawPct)) {
      percentage = Math.round(rawPct * 1000) / 10;
    } else if (this.locationsManager) {
      percentage = this.locationsManager.getPercentage(startCfi);
    }

    // No persistir un 0 temporal mientras locations no está listo:
    // pisaría el avance real en IndexedDB. A la UI sí se le avisa.
    const locationsReady = !this.locationsManager || this.locationsManager.isReady;
    if (percentage === 0 && !locationsReady && this.currentCfi) {
      // Solo notificar, sin programar guardado
    } else {
      clearTimeout(this.saveProgressTimeout);
      this._pendingSave = { cfi: startCfi, href: chapterHref, title: chapterTitle, percentage };
      this.saveProgressTimeout = setTimeout(async () => {
        const p = this._pendingSave;
        this._pendingSave = null;
        await this._saveReadingProgress(p.cfi, p.href, p.title, p.percentage);
      }, 400);
    }

    // Notificar a los observadores suscritos de la UI
    const locationPayload = {
      cfi: startCfi,
      chapterHref: chapterHref || '',
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
   * Busca el nombre legible del capítulo en la tabla de contenidos por href o DOM.
   * @private
   */
  /**
   * Busca el nombre legible del capítulo en la tabla de contenidos por href o DOM.
   * Soporta libros de relatos/antologías (ej: "La Asesina y el Lord pirata — Capítulo 1").
   * @private
   */
  _findChapterTitle(href, doc = null) {
    const getFilename = (pathStr) => {
      let clean = String(pathStr || '').split('#')[0].split('?')[0].trim();
      try { clean = decodeURIComponent(clean); } catch (_) {}
      const parts = clean.split('/');
      return parts[parts.length - 1].toLowerCase();
    };

    const cleanPath = (p) => {
      if (!p) return '';
      let str = String(p).split('#')[0].split('?')[0].trim();
      try { str = decodeURIComponent(str); } catch (_) {}
      return str.toLowerCase();
    };

    const cleanFullHref = (p) => {
      if (!p) return '';
      let str = String(p).trim();
      try { str = decodeURIComponent(str); } catch (_) {}
      return str.toLowerCase();
    };

    const targetFile = getFilename(href);
    const targetPath = cleanPath(href);
    const targetFull = cleanFullHref(href);

    // Formatear etiquetas puramente numéricas o romanas ("1", "01", "I" -> "Capítulo 1")
    const formatChapterLabel = (rawLabel) => {
      if (!rawLabel) return '';
      const trimmed = rawLabel.trim();
      if (/^\d+\.?$/.test(trimmed)) {
        return `Capítulo ${parseInt(trimmed, 10)}`;
      }
      if (/^(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\.?$/i.test(trimmed)) {
        return `Capítulo ${trimmed.replace(/\.$/, '')}`;
      }
      return trimmed;
    };

    // 1. Coincidencia Inteligente por la Tabla de Contenidos (TOC)
    // Buscamos de Hijos -> Padre (Leaf-First) para obtener la coincidencia más específica en antologías.
    const toc = (this.book && this.book.navigation && this.book.navigation.toc) || this.toc || [];
    if (targetFile && toc.length > 0) {
      const searchTocRecursive = (items, parentItem = null) => {
        for (const item of items) {
          if (item.subitems && item.subitems.length > 0) {
            const childResult = searchTocRecursive(item.subitems, item);
            if (childResult) return childResult;
          }

          const itemPath = cleanPath(item.href);
          const itemFile = getFilename(item.href);
          const itemFull = cleanFullHref(item.href);

          const isMatch = (
            (itemFull && targetFull && (itemFull === targetFull || targetFull.endsWith(itemFull))) ||
            (itemPath && targetPath && (itemPath === targetPath || targetPath.endsWith(itemPath) || itemPath.endsWith(targetPath))) ||
            (itemFile && targetFile && itemFile === targetFile)
          );

          if (isMatch) {
            let label = item.label ? formatChapterLabel(item.label) : '';
            const parentLabel = parentItem && parentItem.label ? parentItem.label.trim() : '';

            if (label) {
              if (parentLabel && !parentLabel.toLowerCase().includes('contenido') && !parentLabel.toLowerCase().includes('índice')) {
                if (/^Capítulo\s+\d+/i.test(label) || /^\d+$/.test(item.label?.trim() || '')) {
                  return `${parentLabel} — ${label}`;
                }
              }
              return label;
            }
          }
        }
        return '';
      };

      const foundLabel = searchTocRecursive(toc);
      if (foundLabel) return foundLabel;
    }

    // 2. Extraer del DOM (Combinar relato/parte en h1 + capítulo en h2)
    if (doc && doc.body) {
      try {
        const h1El = doc.querySelector('h1, .story-title, .relato-titulo, .part-title');
        const chapterEl = doc.querySelector('h2, h3, .chapter-title, .chapter-name, .chapter-number, .capitulo-titulo, .capitulo, [class*="chapter"], [class*="capitulo"]');

        let storyTitle = h1El ? (h1El.textContent || '').replace(/\s+/g, ' ').trim() : '';
        let chapterTitle = chapterEl ? (chapterEl.textContent || '').replace(/\s+/g, ' ').trim() : '';

        if (chapterTitle) {
          chapterTitle = formatChapterLabel(chapterTitle);
        }

        if (storyTitle && chapterTitle && storyTitle !== chapterTitle) {
          if (!/^capítulo/i.test(storyTitle) && storyTitle.length >= 2 && storyTitle.length <= 80) {
            if (/^capítulo/i.test(chapterTitle) || /^\d+$/.test(chapterTitle)) {
              return `${storyTitle} — ${formatChapterLabel(chapterTitle)}`;
            }
          }
        }

        if (chapterTitle && chapterTitle.length >= 1 && chapterTitle.length <= 100) {
          return chapterTitle;
        }

        if (storyTitle && storyTitle.length >= 2 && storyTitle.length <= 100) {
          return formatChapterLabel(storyTitle);
        }

        if (doc.title) {
          const docTitle = doc.title.replace(/\s+/g, ' ').trim();
          if (docTitle && docTitle.length >= 2 && docTitle.length <= 100 &&
              !docTitle.toLowerCase().endsWith('.xhtml') &&
              !docTitle.toLowerCase().endsWith('.html') &&
              !docTitle.toLowerCase().endsWith('.xml')) {
            return formatChapterLabel(docTitle);
          }
        }
      } catch (_) {}
    }

    // 3. Reconocimiento explícito de páginas preliminares o patrón numérico en nombre de archivo
    if (targetFile) {
      if (targetFile.includes('cover') || targetFile.includes('portada')) return 'Portada';
      if (targetFile.includes('title') || targetFile.includes('titulo')) return 'Página de título';
      if (targetFile.includes('copyright') || targetFile.includes('credito') || targetFile.includes('colophon')) return 'Créditos';
      if (targetFile.includes('dedicat') || targetFile.includes('dedicac')) return 'Dedicatoria';
      if (targetFile.includes('prolog') || targetFile.includes('preface') || targetFile.includes('prefacio')) return 'Prólogo';
      if (targetFile.includes('epilog')) return 'Epílogo';
      if (targetFile.includes('toc') || targetFile.includes('nav') || targetFile.includes('indice')) return 'Tabla de contenidos';
      if (targetFile.includes('intro') || targetFile.includes('presentacion')) return 'Introducción';

      // Extracción de número de capítulo del nombre de archivo (ej: relato1_cap01.xhtml -> Capítulo 1)
      const fnNumMatch = targetFile.match(/(?:cap|chap|ch|capitulo|capitulo_|_c)[-_]?0*(\d+)/i) || targetFile.match(/[-_]0*(\d+)\.x?html$/i);
      if (fnNumMatch && fnNumMatch[1]) {
        const num = parseInt(fnNumMatch[1], 10);
        if (num > 0) {
          return `Capítulo ${num}`;
        }
      }
    }

    // 4. Calcular el número correlativo de capítulo (descontando preliminares)
    const items = (this.book && this.book.spine && (this.book.spine.items || this.book.spine.spineItems)) || [];
    if (href && items.length > 0) {
      const idx = this._getSpineIndex ? this._getSpineIndex(href) : items.findIndex(it => getFilename(it.href) === targetFile);
      if (idx !== -1) {
        const isFrontMatter = (fn) => (
          fn.includes('cover') || fn.includes('portada') ||
          fn.includes('title') || fn.includes('titulo') ||
          fn.includes('copyright') || fn.includes('credito') || fn.includes('colophon') ||
          fn.includes('dedicat') || fn.includes('dedicac') ||
          fn.includes('prolog') || fn.includes('preface') || fn.includes('prefacio') ||
          fn.includes('toc') || fn.includes('nav') || fn.includes('indice') ||
          fn.includes('intro') || fn.includes('presentacion')
        );

        let realChapterCount = 0;
        for (let k = 0; k <= idx; k++) {
          const fn = getFilename(items[k]?.href);
          if (!isFrontMatter(fn)) {
            realChapterCount++;
          }
        }
        if (realChapterCount > 0) {
          return `Capítulo ${realChapterCount}`;
        }
      }
    }

    return 'Portada';
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
   * Devuelve el capítulo en curso.
   * @returns {{href: string, title: string}}
   */
  getCurrentChapter() {
    let href = '';
    let title = '';
    try {
      const loc = this.rendition && this.rendition.currentLocation
        ? this.rendition.currentLocation()
        : null;
      href = (loc && loc.start && loc.start.href) || '';
    } catch (_) {}
    if (!href) href = this.currentChapterHref || '';
    if (href) {
      try {
        title = this._findChapterTitle(href) || '';
      } catch (_) {}
    }
    if (!title) {
      title = this.currentChapterTitle || 'Capítulo 1';
    }
    return { href, title };
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
    this.currentChapterHref = '';
    this.currentChapterTitle = '';
    this.toc = [];
    clearTimeout(this.saveProgressTimeout);
    if (this._pendingSave) {
      const p = this._pendingSave;
      this._pendingSave = null;
      // Flush sin esperar: no perder el último avance al cerrar rápido
      this._saveReadingProgress(p.cfi, p.href, p.title, p.percentage).catch(() => {});
    }
    this.onRelocatedCallbacks.clear();

    try {
      annotationManager.detach();
      floatingMenu.hide();
    } catch (e) {}
  }
}

// Instancia singleton compartida
export const readerManager = new ReaderManager();
