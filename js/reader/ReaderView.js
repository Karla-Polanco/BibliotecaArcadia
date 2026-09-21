/**
 * ============================================================================
 * READER VIEW - CONTROLADOR DE LA INTERFAZ DEL LECTOR
 * ============================================================================
 * Maneja la pantalla completa, drawer de Tabla de Contenidos, barras inmersivas,
 * gestos táctiles, atajos de teclado y sincronización de progreso.
 */

import { readerManager } from './ReaderManager.js';
import { ReaderSettings } from './ReaderSettings.js';
import { SearchManager } from './SearchManager.js';
import { ScaleManager } from '../ui/ScaleManager.js';
import { Toast } from '../ui/Toast.js';
import { appState } from '../state.js';

export class ReaderView {
  constructor() {
    this.container = document.getElementById('reader-view');
    this.contentEl = document.getElementById('reader-content');
    this.headerEl = document.querySelector('.reader-header');
    this.footerEl = document.querySelector('.reader-footer');
    this.titleEl = document.getElementById('reader-book-title');
    this.chapterEl = document.getElementById('reader-chapter-title');
    this.progressFillEl = document.getElementById('reader-progress-fill');
    this.progressTextEl = document.getElementById('reader-progress-text');
    this.infoTitleEl = document.getElementById('reader-info-title');
    this.infoChapterEl = document.getElementById('reader-info-chapter');
    this.infoProgressEl = document.getElementById('reader-info-progress');
    this.tocDrawerEl = document.getElementById('reader-toc-drawer');
    this.tocBackdropEl = document.getElementById('reader-toc-backdrop');
    this.tocListEl = document.getElementById('toc-content-list');
    this.tabChaptersBtn = document.getElementById('tab-toc-chapters');
    this.spinnerEl = document.getElementById('reader-loading-spinner');
    this.settingsPanelEl = document.getElementById('reader-settings-panel');
    this.settingsBackdropEl = document.getElementById('reader-settings-backdrop');

    // Elementos de Búsqueda
    this.searchBtn = document.getElementById('btn-reader-search');
    this.searchPanelEl = document.getElementById('reader-search-panel');
    this.searchBackdropEl = document.getElementById('reader-search-backdrop');
    this.searchInput = document.getElementById('input-reader-search');
    this.searchClearBtn = document.getElementById('btn-clear-reader-search');
    this.searchCloseBtn = document.getElementById('btn-close-reader-search');
    this.searchStatusText = document.getElementById('search-status-text');
    this.searchResultsList = document.getElementById('search-results-list');
    this.searchManager = null;

    this.isOpen = false;
    this.currentBookId = null;
    this.lastTouchTimestamp = 0;
    this._lastChapterTitle = '';
    this._lastChapterHref = '';
    this._markedKey = '';
    this._unsubRelocated = null;

    this.initEvents();
  }

  /**
   * Vincula oyentes de eventos de teclado, gestos táctiles y botones.
   */
  initEvents() {
    // 1. Botón Volver a Biblioteca
    const backBtn = document.getElementById('btn-reader-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.close());
    }

    // Botones de navegación de capítulo en la barra inferior
    const prevChapterBtn = document.getElementById('btn-footer-prev-chapter');
    const nextChapterBtn = document.getElementById('btn-footer-next-chapter');
    if (prevChapterBtn) prevChapterBtn.addEventListener('click', () => readerManager.prevChapter());
    if (nextChapterBtn) nextChapterBtn.addEventListener('click', () => readerManager.nextChapter());

    // 3. Atajos de Teclado
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        readerManager.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        readerManager.prevPage();
      } else if (e.key === 'Escape') {
        if (this.searchPanelEl && this.searchPanelEl.classList.contains('open')) {
          this.toggleSearch(false);
        } else if (this.settingsPanelEl && this.settingsPanelEl.classList.contains('open')) {
          this.toggleSettings(false);
        } else if (this.tocDrawerEl && this.tocDrawerEl.classList.contains('open')) {
          this.toggleToc(false);
        } else {
          this.close();
        }
      }
    });

    // 4. Escuchar evento cuando se inyecta un capítulo en el iframe para vincular eventos táctiles y de clic
    window.addEventListener('arcadia:reader-content-loaded', (e) => {
      if (e.detail && e.detail.contents) {
        this.attachIframeEvents(e.detail.contents);
      }
    });

    // 4. Botón y Drawer de Tabla de Contenidos (TOC) y Marcadores
    const tocBtn = document.getElementById('btn-reader-toc');
    const tocCloseBtn = document.getElementById('toc-close-btn');

    if (tocBtn) {
      tocBtn.addEventListener('click', () => this.toggleToc());
    }
    if (tocCloseBtn) {
      tocCloseBtn.addEventListener('click', () => this.toggleToc(false));
    }
    if (this.tocBackdropEl) {
      this.tocBackdropEl.addEventListener('click', () => this.toggleToc(false));
    }

    // 5. Botón y Panel de Búsqueda Intra-Libro
    if (this.searchBtn) {
      this.searchBtn.addEventListener('click', () => this.toggleSearch());
    }
    if (this.searchBackdropEl) {
      this.searchBackdropEl.addEventListener('click', () => this.toggleSearch(false));
    }
    if (this.searchCloseBtn) {
      this.searchCloseBtn.addEventListener('click', () => this.toggleSearch(false));
    }
    if (this.searchInput) {
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.executeSearch();
        }
      });
      this.searchInput.addEventListener('input', () => {
        if (this.searchClearBtn) {
          this.searchClearBtn.style.display = this.searchInput.value ? 'block' : 'none';
        }
      });
    }

    const searchSubmitBtn = document.getElementById('btn-submit-reader-search');
    if (searchSubmitBtn) {
      searchSubmitBtn.addEventListener('click', () => this.executeSearch());
    }

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchClearBtn.style.display = 'none';
        if (this.searchResultsList) this.searchResultsList.innerHTML = '';
        if (this.searchStatusText) this.searchStatusText.textContent = 'Escribe y pulsa Buscar o Enter';
        this.searchInput.focus();
      });
    }

    // 7. Botón y Panel de Ajustes de Lectura
    const settingsBtn = document.getElementById('btn-reader-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.toggleSettings());
    }
    if (this.settingsBackdropEl) {
      this.settingsBackdropEl.addEventListener('click', () => this.toggleSettings(false));
    }

    // 6. Botón de Pantalla Completa
    const fullscreenBtn = document.getElementById('btn-reader-fullscreen');
    if (fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // 7. Barra de Progreso Interactiva
    const progressTrack = document.getElementById('reader-progress-track');
    if (progressTrack) {
      progressTrack.addEventListener('click', async (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickRatio = (e.clientX - rect.left) / rect.width;
        const targetPercent = Math.max(0, Math.min(100, clickRatio * 100));
        try {
          const ok = await readerManager.goToPercentage(targetPercent);
          if (!ok && this.searchStatusText !== undefined) {
            Toast.info('Aún calculando ubicaciones del libro… inténtalo en unos segundos.');
          }
        } catch (err) {
          console.warn('Salto por porcentaje falló:', err);
          Toast.error('No se pudo saltar a esa posición.');
        }
      });
    }

    // 8. Sincronización de Ubicación: ver open(), que (re)crea la suscripción
    // en cada apertura porque ReaderManager.destroy() limpia los callbacks.

    // 9. Inicializar Controles del Panel de Ajustes
    this.initSettingsControls();

    // 10. Gestos Táctiles y Toque para Modo Inmersivo
    this.initTouchAndClickZones();

    // 11. Oyente de cambio global de tema
    window.addEventListener('arcadia:themechange', () => {
      if (this.isOpen && readerManager.rendition) {
        readerManager.updateSettings({});
      }
    });

    // 11b. Atajos de teclado en la ventana principal mientras el lector está activo
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      // Si el foco está en un input de búsqueda o textarea, no interceptar
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        readerManager.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        readerManager.prevPage();
      } else if (e.key === 'Escape') {
        if (this.settingsPanelEl?.classList.contains('open')) {
          this.toggleSettings(false);
        } else if (this.searchPanelEl?.classList.contains('open')) {
          this.toggleSearch(false);
        } else if (this.tocDrawerEl?.classList.contains('open')) {
          this.toggleToc(false);
        } else {
          this.close();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (!e.ctrlKey && !e.metaKey) {
          this.toggleFullscreen();
        }
      }
    });

    // 12. Reajustar el libro al rotar o redimensionar la ventana.
    // (Mostrar/ocultar barras ya no cambia el layout: siempre flotan.)
    let winResizeT = null;
    window.addEventListener('resize', () => {
      if (!this.isOpen) return;
      clearTimeout(winResizeT);
      winResizeT = setTimeout(() => {
        try { readerManager.resizeToViewport(); } catch (_) {}
      }, 250);
    });
    window.addEventListener('orientationchange', () => {
      if (!this.isOpen) return;
      setTimeout(() => {
        try { readerManager.resizeToViewport(); } catch (_) {}
      }, 350);
    });
  }

  /**
   * Abre un libro en el lector.
   * @param {string} bookId - ID del libro en IndexedDB
   * @param {string} [initialCfi] - Rango CFI opcional para saltar a un fragmento
   */
  async open(bookId, initialCfi = null) {
    this.currentBookId = bookId;
    this.isOpen = true;

    // Bloquear el scroll de la página de fondo (su barra se veía sobre el lector)
    try { document.body.classList.add('reader-open'); } catch (_) {}
    try { document.documentElement.classList.add('reader-open'); } catch (_) {}

    if (this.container) {
      this.container.classList.add('active');
    }
    if (this.spinnerEl) {
      this.spinnerEl.style.display = 'flex';
    }

    try {
      localStorage.setItem('arcadia_active_view', 'reader');
      localStorage.setItem('arcadia_active_book_id', bookId);

      // (Re)suscribirse a la ubicación en cada apertura: destroy() limpia
      // los callbacks y la suscripción del constructor quedaría muerta.
      if (this._unsubRelocated) {
        try { this._unsubRelocated(); } catch (_) {}
      }
      this._unsubRelocated = readerManager.onRelocated((data) => {
        this.updateLocationInfo(data);
      });

      const result = await readerManager.openBook(bookId, 'reader-content', initialCfi);

      if (this.titleEl && result.book) {
        this.titleEl.textContent = result.book.title;
      }

      // Reiniciar la marca de capítulo del libro anterior antes de reconstruir
      this._lastChapterTitle = '';
      this._lastChapterHref = '';
      this._markedKey = '';
      this.renderToc(result.toc);

      // Sincronizar UI de ajustes
      const currentSettings = readerManager.getSettings();
      this.syncSettingsUI(currentSettings);
    } catch (err) {
      console.error('Error al abrir el libro en el lector:', err);
      Toast.error(err.message || 'No se pudo abrir el libro.');
      this.close();
    } finally {
      if (this.spinnerEl) {
        this.spinnerEl.style.display = 'none';
      }
    }
  }

  /**
   * Cierra el lector y vuelve a la biblioteca.
   */
  close() {
    this.isOpen = false;
    if (this.container) {
      this.container.classList.remove('active');
    }
    // Restaurar el scroll de la página de fondo
    try { document.body.classList.remove('reader-open'); } catch (_) {}
    try { document.documentElement.classList.remove('reader-open'); } catch (_) {}
    this.toggleToc(false);
    readerManager.destroy();
    if (this._unsubRelocated) {
      try { this._unsubRelocated(); } catch (_) {}
      this._unsubRelocated = null;
    }

    // Actualizar el estado global y limpiar persistencia del lector
    localStorage.setItem('arcadia_active_view', 'library');
    localStorage.removeItem('arcadia_active_book_id');

    appState.set('activeView', 'library');
  }

  /**
   * Actualiza los datos de cabecera y barra de progreso.
   * ReaderManager emite {cfi, chapterTitle, percentage, location}.
   * El título del libro se fijó en open(); aquí solo se actualiza si viene explícito.
   */
  updateLocationInfo(data) {
    if (!data) return;
    if (this.titleEl && data.title) {
      this.titleEl.textContent = data.title;
      if (this.infoTitleEl) this.infoTitleEl.textContent = data.title;
    }
    if (this.chapterEl && data.chapterTitle) {
      this.chapterEl.textContent = data.chapterTitle;
      if (this.infoChapterEl) this.infoChapterEl.textContent = data.chapterTitle;
    }
    const pct = typeof data.percentage === 'number' && !isNaN(data.percentage)
      ? Math.max(0, Math.min(100, Math.round(data.percentage * 10) / 10))
      : 0;
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${pct}%`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `${pct}%`;
      if (this.infoProgressEl) this.infoProgressEl.textContent = `${pct}%`;
    }
    // Accesibilidad: exponer progreso como progressbar
    const track = document.getElementById('reader-progress-track');
    if (track) {
      track.setAttribute('aria-valuenow', String(Math.round(pct)));
      track.setAttribute('aria-valuetext', `${pct}% leído`);
    }

    // Actualizar capítulo activo en el drawer TOC
    if (data.chapterTitle) {
      this._lastChapterTitle = data.chapterTitle;
    }
    const href = data.chapterHref || data.location?.start?.href || '';
    if (href) {
      this._lastChapterHref = href;
    }
    this._markActiveTocItem(false);

  }

  /**
   * Normaliza un título para comparar (minúsculas, espacios colapsados).
   * @private
   */
  _normTitle(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Marca el capítulo en curso en el drawer TOC, como el menú lateral.
   * @param {boolean} scroll - Desplazar la lista hasta el capítulo activo
   * @private
   */
  _markActiveTocItem(scroll = false) {
    if (!this.tocListEl) return;

    // Normaliza hrefs (los EPUB suelen codificar espacios/acentos: %20, %C3...)
    const normHref = (h) => {
      let s = String(h || '').split('#')[0].split('?')[0].trim();
      try { s = decodeURIComponent(s); } catch (_) {}
      try { s = decodeURI(s); } catch (_) {}
      return s;
    };
    const currentHref = normHref(this._lastChapterHref);
    const target = this._normTitle(this._lastChapterTitle);
    if (!currentHref && !target) return;

    // Atajo: si ya está marcado este capítulo, solo desplazar si se pide
    const markKey = `${currentHref}|${target}`;
    if (markKey === this._markedKey) {
      if (scroll) {
        const active = this.tocListEl.querySelector('.toc-item.active');
        try { active && active.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch (_) {}
      }
      return;
    }
    this._markedKey = markKey;

    const prev = this.tocListEl.querySelector('.toc-item.active');
    if (prev) prev.classList.remove('active');

    const items = this.tocListEl.querySelectorAll('.toc-item');
    let match = null;
    // 1) Coincidencia por href (la más fiable)
    if (currentHref) {
      for (const it of items) {
        const itemHref = normHref(it.dataset.href);
        if (itemHref && (itemHref === currentHref || currentHref.endsWith(itemHref) || itemHref.endsWith(currentHref))) {
          match = it;
          break;
        }
      }
    }
    // 2) Coincidencia exacta por título normalizado
    if (!match && target) {
      for (const it of items) {
        if (this._normTitle(it.textContent) === target) { match = it; break; }
      }
    }
    // 3) Respaldo: coincidencia parcial (por si el ejemplar abrevia el título)
    if (!match && target) {
      for (const it of items) {
        const label = this._normTitle(it.textContent);
        if (label && (label.includes(target) || target.includes(label))) { match = it; break; }
      }
    }
    if (match) {
      match.classList.add('active');
      if (scroll && typeof match.scrollIntoView === 'function') {
        // Salto instantáneo: el 'smooth' a lo largo de listas grandes se percibe como retardo
        match.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      }
    }
  }

  /**
   * Renderiza la lista de la Tabla de Contenidos.
   */
  renderToc(tocItems) {
    if (!this.tocListEl) return;

    if (!tocItems || tocItems.length === 0) {
      this.tocListEl.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
          No se encontró tabla de contenidos en este ejemplar.
        </div>
      `;
      return;
    }

    const buildItemsHtml = (items, level = 0) => {
      return items.map(item => `
        <div class="toc-item ${level > 0 ? 'nested' : ''}" data-href="${this.escapeHtml(item.href)}">
          ${this.escapeHtml(item.label ? item.label.trim() : 'Sección sin título')}
        </div>
        ${item.subitems && item.subitems.length > 0 ? buildItemsHtml(item.subitems, level + 1) : ''}
      `).join('');
    };

    this.tocListEl.innerHTML = buildItemsHtml(tocItems);
    this._markedKey = '';

    // Reaplicar la marca del capítulo en curso tras reconstruir la lista
    this._markActiveTocItem(false);

    // Evento de clic en capítulo
    this.tocListEl.querySelectorAll('.toc-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const href = itemEl.dataset.href;
        if (href) {
          // Marca optimista inmediata: el relocated tarda en llegar
          this._lastChapterHref = href;
          const label = (itemEl.textContent || '').trim();
          if (label) this._lastChapterTitle = label;
          this._markActiveTocItem(false);
          readerManager.goTo(href);
          this.toggleToc(false);
        }
      });
    });
  }

  /**
   * Abre o cierra el Drawer de la Tabla de Contenidos.
   */
  toggleToc(show) {
    if (!this.tocDrawerEl || !this.tocBackdropEl) return;

    const isOpen = show !== undefined ? show : !this.tocDrawerEl.classList.contains('open');
    if (isOpen) {
      this.tocDrawerEl.classList.add('open');
      this.tocBackdropEl.classList.add('open');
      // Sincronizar con la ubicación real del rendition (no depende de eventos previos)
      try {
        const live = readerManager.getCurrentChapter ? readerManager.getCurrentChapter() : null;
        if (live) {
          if (live.href) this._lastChapterHref = live.href;
          if (live.title) this._lastChapterTitle = live.title;
        }
      } catch (_) {}
      // Llevar la vista hasta el capítulo en curso al abrir
      requestAnimationFrame(() => this._markActiveTocItem(true));
    } else {
      this.tocDrawerEl.classList.remove('open');
      this.tocBackdropEl.classList.remove('open');
    }
    document.getElementById('btn-reader-toc')?.setAttribute('aria-expanded', String(isOpen));
  }

  /**
   * Alterna pantalla completa (Fullscreen API).
   */
  toggleFullscreen() {
    const btn = document.getElementById('btn-reader-fullscreen');
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().then(() => btn?.setAttribute('aria-pressed', 'true')).catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => btn?.setAttribute('aria-pressed', 'false')).catch(() => {});
      }
    }
  }

  /**
   * Gestos táctiles y detección de toques para alternar páginas y barras de herramientas.
   */
  initTouchAndClickZones() {
    const viewport = document.getElementById('reader-viewport');
    if (!viewport) return;

    // Alternar barras y botones al pulsar en el fondo del visor
    viewport.addEventListener('click', (e) => {
      if (Date.now() - this.lastTouchTimestamp < 650) return;
      if (e.target.closest('button, a, .btn-footer-chapter')) return;

      if (this.container) {
        this.container.classList.toggle('bars-hidden');
      }
    });
  }

  /**
   * Conecta oyentes de toque (tap), clic y teclado dentro del iframe del libro.
   * El toque en pantalla SOLO conmuta la visibilidad del menú y de los botones de cambio de hoja.
   * El cambio de hoja se realiza EXCLUSIVAMENTE mediante los botones laterales.
   * @param {Object} contents - Objeto contents de epub.js
   */
  attachIframeEvents(contents) {
    if (!contents || !contents.document) return;
    const doc = contents.document;
    const win = contents.window || window;

    if (doc._arcadiaEventsAttached) return;
    doc._arcadiaEventsAttached = true;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // 1. Detección de toques táctiles en la pantalla (Móviles)
    doc.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    doc.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        this.lastTouchTimestamp = Date.now();

        // 1. Detección de Gesto Swipe Horizontal (Deslizar para cambiar de página)
        const isHorizontalSwipe = Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6 && deltaTime < 650;
        if (isHorizontalSwipe) {
          if (deltaX < 0) {
            readerManager.nextPage();
          } else {
            readerManager.prevPage();
          }
          return;
        }

        // 2. Toque simple (tap rápido) para alternar barras
        if (Math.abs(deltaX) < 18 && Math.abs(deltaY) < 18 && deltaTime < 500) {
          let selection = '';
          try {
            selection = (win.getSelection ? win.getSelection().toString() : '') ||
                        (window.getSelection ? window.getSelection().toString() : '');
          } catch (_) {}

          if (selection && selection.trim().length > 0) return;

          if (this.container) {
            this.container.classList.toggle('bars-hidden');
          }
        }
      }
    }, { passive: true });

    // 2. Detección de clics de ratón en pantalla (Escritorio)
    doc.addEventListener('click', (e) => {
      if (Date.now() - this.lastTouchTimestamp < 650) return;
      if (e.target.closest('a, button, input, .arcadia-chapter-nav-card')) return;

      let selection = '';
      try {
        selection = (win.getSelection ? win.getSelection().toString() : '') ||
                    (window.getSelection ? window.getSelection().toString() : '');
      } catch (_) {}

      if (selection && selection.trim().length > 0) return;

      if (this.container) {
        this.container.classList.toggle('bars-hidden');
      }
    });

    // 3. Atajos de teclado dentro del iframe
    doc.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        readerManager.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        readerManager.prevPage();
      }
    });

    // 4. Suprimir menú contextual nativo al seleccionar texto
    doc.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Abre o cierra el panel de configuración del lector.
   */
  toggleSettings(show) {
    if (!this.settingsPanelEl || !this.settingsBackdropEl) return;

    const isOpen = show !== undefined ? show : !this.settingsPanelEl.classList.contains('open');
    if (isOpen) {
      this.toggleToc(false);
      this.syncSettingsUI(readerManager.getSettings());
      ScaleManager.initControls();
      this.settingsPanelEl.classList.add('open');
      this.settingsBackdropEl.classList.add('open');
    } else {
      this.settingsPanelEl.classList.remove('open');
      this.settingsBackdropEl.classList.remove('open');
    }
    document.getElementById('btn-reader-settings')?.setAttribute('aria-expanded', String(isOpen));
  }

  /**
   * Sincroniza visualmente los botones activos del panel con la configuración del libro.
   */
  syncSettingsUI(settings) {
    if (!settings) return;

    // 1. Fuente
    document.querySelectorAll('#font-family-options [data-font]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.font === settings.fontFamily);
    });

    // 2. Tamaño de fuente
    const sizeDisplay = document.getElementById('font-size-display');
    if (sizeDisplay) {
      sizeDisplay.textContent = `${settings.fontSize}px`;
    }

    // 3. Grosor
    document.querySelectorAll('#font-weight-options [data-weight]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.weight === settings.fontWeight);
    });

    // 4. Interlineado
    document.querySelectorAll('#line-height-options [data-lh]').forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.lh) === settings.lineHeight);
    });

    // 4b. Alineación de Texto
    document.querySelectorAll('#font-align-options [data-align]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.align === (settings.textAlign || 'left'));
    });

    // 5. Tema del lector (soporta alias legacy 'wine' → 'serene-fog')
    document.querySelectorAll('#reader-theme-options [data-reader-theme]').forEach(chip => {
      const themeVal = (settings.theme || 'inherit');
      const normalizedChip = chip.dataset.readerTheme === 'wine' ? 'serene-fog' : chip.dataset.readerTheme;
      const normalizedTheme = themeVal === 'wine' ? 'serene-fog' : themeVal;
      const isActive = normalizedChip === normalizedTheme;
      chip.classList.toggle('active', isActive);
      if (chip.getAttribute('role') === 'radio') {
        chip.setAttribute('aria-checked', String(isActive));
      }
    });

    // 6. Actualizar variables CSS del contenedor principal del lector para que coincida con el tema seleccionado
    let themeColors;
    if (!settings.theme || settings.theme === 'inherit') {
      const cs = getComputedStyle(document.documentElement);
      themeColors = {
        bg: cs.getPropertyValue('--reader-bg').trim() || cs.getPropertyValue('--color-background').trim(),
        text: cs.getPropertyValue('--reader-text').trim() || cs.getPropertyValue('--color-text').trim(),
        heading: cs.getPropertyValue('--reader-text').trim(),
        accent: cs.getPropertyValue('--color-primary-light').trim()
      };
    } else {
      themeColors = ReaderSettings._getThemeColors(settings.theme);
    }
    if (this.container) {
      this.container.style.setProperty('--reader-bg', themeColors.bg);
      this.container.style.setProperty('--reader-text', themeColors.text);
    }
  }

  /**
   * Vincula los botones del panel de ajustes para aplicar cambios en caliente y persistirlos.
   */
  initSettingsControls() {
    // 1. Tipografía
    document.querySelectorAll('#font-family-options [data-font]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const font = btn.dataset.font;
        const updated = await readerManager.updateSettings({ fontFamily: font });
        this.syncSettingsUI(updated);
      });
    });

    // 2. Tamaño de Fuente
    const btnDecrease = document.getElementById('btn-font-decrease');
    const btnIncrease = document.getElementById('btn-font-increase');

    if (btnDecrease) {
      btnDecrease.addEventListener('click', async () => {
        const cur = readerManager.getSettings();
        const newSize = Math.max(12, cur.fontSize - 2);
        const updated = await readerManager.updateSettings({ fontSize: newSize });
        this.syncSettingsUI(updated);
      });
    }

    if (btnIncrease) {
      btnIncrease.addEventListener('click', async () => {
        const cur = readerManager.getSettings();
        const newSize = Math.min(36, cur.fontSize + 2);
        const updated = await readerManager.updateSettings({ fontSize: newSize });
        this.syncSettingsUI(updated);
      });
    }

    // 3. Grosor de Fuente
    document.querySelectorAll('#font-weight-options [data-weight]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const weight = btn.dataset.weight;
        const updated = await readerManager.updateSettings({ fontWeight: weight });
        this.syncSettingsUI(updated);
      });
    });

    // 4. Interlineado
    document.querySelectorAll('#line-height-options [data-lh]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const lh = parseFloat(btn.dataset.lh);
        const updated = await readerManager.updateSettings({ lineHeight: lh });
        this.syncSettingsUI(updated);
      });
    });

    // 4b. Alineación de Texto
    document.querySelectorAll('#font-align-options [data-align]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const align = btn.dataset.align;
        const updated = await readerManager.updateSettings({ textAlign: align });
        this.syncSettingsUI(updated);
      });
    });

    // 5. Tema del Lector
    document.querySelectorAll('#reader-theme-options [data-reader-theme]').forEach(chip => {
      chip.addEventListener('click', async () => {
        const theme = chip.dataset.readerTheme;
        const updated = await readerManager.updateSettings({ theme });
        this.syncSettingsUI(updated);
      });
    });
  }

  /**
   * Abre o cierra el panel de búsqueda intra-libro.
   */
  toggleSearch(show) {
    if (!this.searchPanelEl || !this.searchBackdropEl) return;

    const isOpen = show !== undefined ? show : !this.searchPanelEl.classList.contains('open');
    if (isOpen) {
      this.toggleToc(false);
      this.toggleSettings(false);
      this.searchPanelEl.classList.add('open');
      this.searchBackdropEl.classList.add('open');
      setTimeout(() => this.searchInput?.focus(), 150);
    } else {
      this.searchPanelEl.classList.remove('open');
      this.searchBackdropEl.classList.remove('open');
      if (this.searchManager) {
        this.searchManager.cancel();
      }
    }
    document.getElementById('btn-reader-search')?.setAttribute('aria-expanded', String(isOpen));
  }

  /**
   * Ejecuta la búsqueda de texto completo en los capítulos del libro.
   */
  async executeSearch() {
    if (!this.searchInput || !readerManager.book) return;
    const query = this.searchInput.value.trim();

    if (!query || query.length < 2) {
      if (this.searchStatusText) this.searchStatusText.textContent = 'Ingresa al menos 2 caracteres';
      return;
    }

    if (this.searchStatusText) {
      this.searchStatusText.textContent = 'Buscando en todos los capítulos...';
    }
    if (this.searchResultsList) {
      this.searchResultsList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--color-text-muted); font-size: var(--text-sm);">
          <div class="loading-ring" style="width: 28px; height: 28px; margin: 0 auto 12px; border-width: 2px;"></div>
          <span>Buscando coincidencias...</span>
        </div>
      `;
    }

    this.searchManager = new SearchManager(readerManager.book, readerManager.currentBookId);
    let results = [];
    try {
      results = await this.searchManager.search(query, 60);
    } catch (err) {
      console.warn('Búsqueda falló:', err);
      if (this.searchStatusText) this.searchStatusText.textContent = 'Error en la búsqueda';
      if (this.searchResultsList) this.searchResultsList.innerHTML = '';
      return;
    }

    if (!this.searchResultsList) return;

    if (results.length === 0) {
      if (this.searchStatusText) this.searchStatusText.textContent = '0 resultados';
      this.searchResultsList.innerHTML = `
        <div style="text-align: center; padding: 30px; color: var(--color-text-muted); font-size: var(--text-sm);">
          No se encontraron coincidencias para «${this.escapeHtml(query)}».
        </div>
      `;
      return;
    }

    if (this.searchStatusText) {
      this.searchStatusText.textContent = `${results.length} coincidencias encontradas`;
    }

    // Resaltar la coincidencia dentro del fragmento
    const qRegex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    this.searchResultsList.innerHTML = results.map(r => {
      const highlightedSnippet = this.escapeHtml(r.excerpt).replace(qRegex, '<span class="search-match-highlight">$1</span>');
      return `
        <div class="search-result-item" data-cfi="${this.escapeHtml(r.cfi)}">
          <div style="font-size: 0.7rem; font-weight: bold; color: var(--color-primary-light); margin-bottom: 4px;">
            ${this.escapeHtml(r.chapterTitle)}
          </div>
          <div style="font-size: var(--text-xs); color: var(--color-text); line-height: 1.4;">
            ${highlightedSnippet}
          </div>
        </div>
      `;
    }).join('');

    // Evento de clic en resultado de búsqueda
    this.searchResultsList.querySelectorAll('.search-result-item').forEach(itemEl => {
      itemEl.addEventListener('click', async () => {
        const cfi = itemEl.dataset.cfi;
        if (cfi) {
          try {
            await readerManager.goTo(cfi);
            this.toggleSearch(false);
            Toast.success('Navegado a la coincidencia.');
          } catch (err) {
            console.warn('Salto a coincidencia falló:', err);
            Toast.error('No se pudo navegar a ese pasaje.');
          }
        }
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
