/**
 * ============================================================================
 * READER VIEW - CONTROLADOR DE LA INTERFAZ DEL LECTOR
 * ============================================================================
 * Maneja la pantalla completa, drawer de Tabla de Contenidos, barras inmersivas,
 * gestos táctiles, atajos de teclado y sincronización de progreso.
 */

import { readerManager } from './ReaderManager.js';
import { ReaderSettings } from './ReaderSettings.js';
import { BookmarkManager } from './BookmarkManager.js';
import { SearchManager } from './SearchManager.js';
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
    this.tocDrawerEl = document.getElementById('reader-toc-drawer');
    this.tocBackdropEl = document.getElementById('reader-toc-backdrop');
    this.tocListEl = document.getElementById('toc-content-list');
    this.bookmarksListEl = document.getElementById('bookmarks-content-list');
    this.tabChaptersBtn = document.getElementById('tab-toc-chapters');
    this.tabBookmarksBtn = document.getElementById('tab-toc-bookmarks');
    this.spinnerEl = document.getElementById('reader-loading-spinner');
    this.settingsPanelEl = document.getElementById('reader-settings-panel');
    this.settingsBackdropEl = document.getElementById('reader-settings-backdrop');

    // Elementos de Marcadores y Búsqueda
    this.bookmarkBtn = document.getElementById('btn-reader-bookmark');
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

    // 2. Botones de Navegación Lateral (Prev / Next)
    const prevBtn = document.getElementById('btn-reader-prev');
    const nextBtn = document.getElementById('btn-reader-next');
    if (prevBtn) prevBtn.addEventListener('click', () => readerManager.prevPage());
    if (nextBtn) nextBtn.addEventListener('click', () => readerManager.nextPage());

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

    // Pestañas del Drawer: Capítulos vs Marcadores
    if (this.tabChaptersBtn && this.tabBookmarksBtn) {
      this.tabChaptersBtn.addEventListener('click', () => {
        this.tabChaptersBtn.classList.add('active');
        this.tabBookmarksBtn.classList.remove('active');
        if (this.tocListEl) this.tocListEl.style.display = 'flex';
        if (this.bookmarksListEl) this.bookmarksListEl.style.display = 'none';
      });

      this.tabBookmarksBtn.addEventListener('click', () => {
        this.tabBookmarksBtn.classList.add('active');
        this.tabChaptersBtn.classList.remove('active');
        if (this.tocListEl) this.tocListEl.style.display = 'none';
        if (this.bookmarksListEl) {
          this.bookmarksListEl.style.display = 'flex';
          this.renderBookmarks();
        }
      });
    }

    // 5. Botón de Marcador de Posición
    if (this.bookmarkBtn) {
      this.bookmarkBtn.addEventListener('click', async () => {
        if (!this.currentBookId || !readerManager.currentCfi) return;

        const chapter = this.chapterEl ? this.chapterEl.textContent : 'Página marcada';
        const progressText = this.progressTextEl ? this.progressTextEl.textContent : '0%';
        const pct = parseFloat(progressText) || 0;

        const res = await BookmarkManager.toggleBookmark({
          bookId: this.currentBookId,
          cfi: readerManager.currentCfi,
          chapterTitle: chapter,
          percentage: pct,
          textSnippet: ''
        });

        this.bookmarkBtn.classList.toggle('bookmark-active', res.added);
        if (res.added) {
          Toast.success('Marcador añadido a esta página.');
        } else {
          Toast.info('Marcador retirado.');
        }
        this.renderBookmarks();
      });
    }

    // 6. Botón y Panel de Búsqueda Intra-Libro
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
      progressTrack.addEventListener('click', (e) => {
        const rect = progressTrack.getBoundingClientRect();
        const clickRatio = (e.clientX - rect.left) / rect.width;
        const targetPercent = Math.max(0, Math.min(100, clickRatio * 100));
        readerManager.goToPercentage(targetPercent);
      });
    }

    // 8. Sincronización de Ubicación
    readerManager.onRelocated((data) => {
      this.updateLocationInfo(data);
    });

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
  }

  /**
   * Abre un libro en el lector.
   * @param {string} bookId - ID del libro en IndexedDB
   * @param {string} [initialCfi] - Rango CFI opcional para saltar a un fragmento
   */
  async open(bookId, initialCfi = null) {
    this.currentBookId = bookId;
    this.isOpen = true;

    if (this.container) {
      this.container.classList.add('active');
    }
    if (this.spinnerEl) {
      this.spinnerEl.style.display = 'flex';
    }

    try {
      localStorage.setItem('arcadia_active_view', 'reader');
      localStorage.setItem('arcadia_active_book_id', bookId);

      const result = await readerManager.openBook(bookId, 'reader-content', initialCfi);

      if (this.titleEl && result.book) {
        this.titleEl.textContent = result.book.title;
      }

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
    this.toggleToc(false);
    readerManager.destroy();

    // Actualizar el estado global y limpiar persistencia del lector
    localStorage.setItem('arcadia_active_view', 'library');
    localStorage.removeItem('arcadia_active_book_id');

    appState.set('activeView', 'library');
  }

  /**
   * Actualiza los datos de cabecera y barra de progreso.
   */
  updateLocationInfo(data) {
    if (this.chapterEl && data.chapterTitle) {
      this.chapterEl.textContent = data.chapterTitle;
    }
    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${data.percentage}%`;
    }
    if (this.progressTextEl) {
      this.progressTextEl.textContent = `${data.percentage}%`;
    }

    // Actualizar capítulo activo en el drawer TOC
    if (this.tocListEl) {
      const activeItem = this.tocListEl.querySelector('.toc-item.active');
      if (activeItem) activeItem.classList.remove('active');

      const items = this.tocListEl.querySelectorAll('.toc-item');
      for (const it of items) {
        if (it.textContent.trim() === (data.chapterTitle || '').trim()) {
          it.classList.add('active');
          break;
        }
      }
    }

    // Comprobar si la página actual tiene marcador
    if (this.bookmarkBtn && this.currentBookId && data.cfi) {
      BookmarkManager.isBookmarked(this.currentBookId, data.cfi).then(bm => {
        if (this.bookmarkBtn) {
          this.bookmarkBtn.classList.toggle('bookmark-active', !!bm);
        }
      }).catch(() => {});
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

    // Evento de clic en capítulo
    this.tocListEl.querySelectorAll('.toc-item').forEach(itemEl => {
      itemEl.addEventListener('click', () => {
        const href = itemEl.dataset.href;
        if (href) {
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
    } else {
      this.tocDrawerEl.classList.remove('open');
      this.tocBackdropEl.classList.remove('open');
    }
  }

  /**
   * Alterna pantalla completa (Fullscreen API).
   */
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }

  /**
   * Gestos táctiles y detección de toques para alternar páginas y barras de herramientas.
   */
  initTouchAndClickZones() {
    let touchStartX = 0;
    let touchStartY = 0;

    const viewport = document.getElementById('reader-viewport');
    if (!viewport) return;

    viewport.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        this.lastTouchTimestamp = Date.now();
        const deltaX = e.changedTouches[0].clientX - touchStartX;
        const deltaY = e.changedTouches[0].clientY - touchStartY;

        // Deslizamiento horizontal (Swipe > 30px)
        if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX < 0) {
            readerManager.nextPage();
          } else {
            readerManager.prevPage();
          }
        }
      }
    }, { passive: true });

    // Alternar barras (Header y Footer) al pulsar en el viewport
    viewport.addEventListener('click', (e) => {
      if (Date.now() - this.lastTouchTimestamp < 650) return;
      if (e.target.closest('button, a, .btn-reader-nav, .btn-footer-chapter')) return;

      const width = window.innerWidth;
      const clickX = e.clientX;

      if (clickX < width * 0.35) {
        readerManager.prevPage();
      } else if (clickX > width * 0.65) {
        readerManager.nextPage();
      } else {
        if (this.container) {
          this.container.classList.toggle('bars-hidden');
        }
      }
    });
  }

  /**
   * Conecta oyentes de toque (swipe/tap), clic y teclado dentro del iframe del libro.
   * Esto permite pasar de página deslizando o tocando los lados de la pantalla en móviles.
   * @param {Object} contents - Objeto contents de epub.js
   */
  attachIframeEvents(contents) {
    if (!contents || !contents.document) return;
    const doc = contents.document;
    const win = contents.window || window;

    // Evitar adjuntar múltiples escuchadores repetidos sobre el mismo documento
    if (doc._arcadiaEventsAttached) return;
    doc._arcadiaEventsAttached = true;

    const settings = readerManager.getSettings();
    const isScrolledMode = settings && settings.flowMode === 'scrolled-doc';

    // Inyectar tarjeta al final del capítulo si estamos en modo Desplazamiento
    if (isScrolledMode) {
      this.injectChapterEndCard(doc, win);
    }

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;

    // 1. Detección de Swipe y Taps táctiles en móviles
    doc.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    }, { passive: true });

    doc.addEventListener('touchend', (e) => {
      if (e.changedTouches && e.changedTouches.length === 1) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const deltaTime = Date.now() - touchStartTime;

        // Registrar timestamp para suprimir clics sintéticos del navegador móvil
        this.lastTouchTimestamp = Date.now();

        if (!isScrolledMode) {
          // --- MODO PAGINACIÓN ---
          // A) Deslizamiento horizontal rápido (Swipe > 25px)
          if (Math.abs(deltaX) > 25 && Math.abs(deltaX) > Math.abs(deltaY) && deltaTime < 700) {
            if (deltaX < 0) {
              readerManager.nextPage();
            } else {
              readerManager.prevPage();
            }
            return;
          }

          // B) Toque directo sin arrastre (Tap Zones precisas tipo Kindle)
          if (Math.abs(deltaX) < 16 && Math.abs(deltaY) < 16 && deltaTime < 450) {
            let selection = '';
            try {
              selection = (win.getSelection ? win.getSelection().toString() : '') ||
                          (window.getSelection ? window.getSelection().toString() : '');
            } catch (_) {}

            if (selection && selection.trim().length > 0) return;

            const screenWidth = win.innerWidth || window.innerWidth;

            // 35% Izquierdo: página anterior
            if (touchEndX < screenWidth * 0.35) {
              readerManager.prevPage();
            }
            // 35% Derecho: página siguiente
            else if (touchEndX > screenWidth * 0.65) {
              readerManager.nextPage();
            }
            // 30% Central: alternar barras de lectura inmersiva
            else {
              if (this.container) {
                this.container.classList.toggle('bars-hidden');
              }
            }
          }
        } else {
          // --- MODO DESPLAZAMIENTO (SCROLLED-DOC) ---
          // Deslizamiento horizontal explícito para saltar capítulos
          if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 35 && deltaTime < 600) {
            if (deltaX < 0) {
              readerManager.nextChapter();
            } else {
              readerManager.prevChapter();
            }
            return;
          }

          // Toque en el tercio central para mostrar/ocultar barras
          if (Math.abs(deltaX) < 16 && Math.abs(deltaY) < 16 && deltaTime < 450) {
            let selection = '';
            try {
              selection = (win.getSelection ? win.getSelection().toString() : '');
            } catch (_) {}

            if (!selection || selection.trim().length === 0) {
              const screenWidth = win.innerWidth || window.innerWidth;
              if (touchEndX > screenWidth * 0.25 && touchEndX < screenWidth * 0.75) {
                if (this.container) {
                  this.container.classList.toggle('bars-hidden');
                }
              }
            }
          }
        }
      }
    }, { passive: true });

    // 2. Detección de clics de ratón (Escritorio)
    doc.addEventListener('click', (e) => {
      // Ignorar clics sintéticos disparados inmediatamente después de un toque táctil
      if (Date.now() - this.lastTouchTimestamp < 650) return;

      if (e.target.closest('a, button, input, .arcadia-chapter-nav-card')) return;

      let selection = '';
      try {
        selection = (win.getSelection ? win.getSelection().toString() : '') ||
                    (window.getSelection ? window.getSelection().toString() : '');
      } catch (_) {}

      if (selection && selection.trim().length > 0) return;

      const screenWidth = win.innerWidth || window.innerWidth;
      const clickX = e.clientX;

      if (!isScrolledMode) {
        if (clickX < screenWidth * 0.35) {
          readerManager.prevPage();
        } else if (clickX > screenWidth * 0.65) {
          readerManager.nextPage();
        } else {
          if (this.container) {
            this.container.classList.toggle('bars-hidden');
          }
        }
      } else {
        if (clickX > screenWidth * 0.25 && clickX < screenWidth * 0.75) {
          if (this.container) {
            this.container.classList.toggle('bars-hidden');
          }
        }
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
  }

  /**
   * Inyecta una tarjeta visual al final del capítulo en modo Desplazamiento
   * permitiendo continuar al siguiente capítulo con un toque cómodo.
   */
  injectChapterEndCard(doc, win) {
    if (!doc || !doc.body) return;
    if (doc.getElementById('arcadia-chapter-end-card')) return;

    const currentLoc = readerManager.rendition ? readerManager.rendition.currentLocation() : null;
    const chapterHref = currentLoc?.start?.href;
    const chapterTitle = readerManager._findChapterTitle ? readerManager._findChapterTitle(chapterHref) : 'este capítulo';

    const card = doc.createElement('div');
    card.id = 'arcadia-chapter-end-card';
    card.className = 'arcadia-chapter-nav-card';
    card.style.cssText = `
      margin: 60px auto 90px auto !important;
      padding: 26px 20px !important;
      border-radius: 16px !important;
      background: rgba(125, 125, 125, 0.08) !important;
      border: 1px solid rgba(125, 125, 125, 0.2) !important;
      text-align: center !important;
      max-width: 480px !important;
      width: 90% !important;
      box-sizing: border-box !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    card.innerHTML = `
      <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.12em; opacity: 0.7; margin-bottom: 6px;">✦ Fin del capítulo ✦</div>
      <div style="font-size: 1rem; font-weight: 700; margin-bottom: 18px; opacity: 0.92; line-height: 1.35;">${chapterTitle}</div>
      <div style="display: flex; gap: 12px; justify-content: center; align-items: center; flex-wrap: wrap;">
        <button id="btn-card-prev-chapter" style="padding: 10px 20px; border-radius: 999px; background: rgba(125,125,125,0.15); border: 1px solid rgba(125,125,125,0.3); color: inherit; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">← Cap. anterior</button>
        <button id="btn-card-next-chapter" style="padding: 10px 24px; border-radius: 999px; background: #5B4CC4; border: none; color: #FFFFFF; font-size: 0.84rem; font-weight: bold; cursor: pointer; box-shadow: 0 4px 14px rgba(91, 76, 196, 0.4); transition: transform 0.2s;">Siguiente capítulo →</button>
      </div>
    `;

    const btnPrev = card.querySelector('#btn-card-prev-chapter');
    const btnNext = card.querySelector('#btn-card-next-chapter');

    if (btnPrev) {
      btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        readerManager.prevChapter();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        readerManager.nextChapter();
      });
    }

    doc.body.appendChild(card);
  }

  /**
   * Abre o cierra el panel de configuración del lector.
   */
  toggleSettings(show) {
    if (!this.settingsPanelEl || !this.settingsBackdropEl) return;

    const isOpen = show !== undefined ? show : !this.settingsPanelEl.classList.contains('open');
    if (isOpen) {
      this.toggleToc(false); // Cerrar TOC si está abierto
      this.syncSettingsUI(readerManager.getSettings());
      this.settingsPanelEl.classList.add('open');
      this.settingsBackdropEl.classList.add('open');
    } else {
      this.settingsPanelEl.classList.remove('open');
      this.settingsBackdropEl.classList.remove('open');
    }
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

    // 5. Modo de Lectura (Paginación vs Desplazamiento)
    document.querySelectorAll('#flow-mode-options [data-flow]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.flow === (settings.flowMode || 'paginated'));
    });

    // 6. Columnas
    document.querySelectorAll('#columns-options [data-col]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.col) === settings.columns);
    });

    // 7. Tema del lector
    document.querySelectorAll('#reader-theme-options [data-reader-theme]').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.readerTheme === (settings.theme || 'inherit'));
    });

    // 8. Actualizar variables CSS del contenedor principal del lector para que coincida con el tema seleccionado
    const effectiveTheme = settings.theme && settings.theme !== 'inherit' ? settings.theme : (document.documentElement.getAttribute('data-theme') || 'mystic-night');
    const themeColors = ReaderSettings._getThemeColors(effectiveTheme);
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

    // 5. Modo de Lectura (Paginación / Desplazamiento)
    document.querySelectorAll('#flow-mode-options [data-flow]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const flow = btn.dataset.flow;
        await readerManager.setFlowMode(flow);
        const updated = readerManager.getSettings();
        this.syncSettingsUI(updated);
      });
    });

    // 6. Columnas
    document.querySelectorAll('#columns-options [data-col]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const cols = parseInt(btn.dataset.col);
        const updated = await readerManager.updateSettings({ columns: cols });
        this.syncSettingsUI(updated);
      });
    });

    // 7. Tema del Lector
    document.querySelectorAll('#reader-theme-options [data-reader-theme]').forEach(chip => {
      chip.addEventListener('click', async () => {
        const theme = chip.dataset.readerTheme;
        const updated = await readerManager.updateSettings({ theme });
        this.syncSettingsUI(updated);
      });
    });
  }

  /**
   * Renderiza la lista de marcadores del libro actual en el drawer lateral.
   */
  async renderBookmarks() {
    if (!this.bookmarksListEl || !this.currentBookId) return;

    const bookmarks = await BookmarkManager.getBookmarksForBook(this.currentBookId);

    if (!bookmarks || bookmarks.length === 0) {
      this.bookmarksListEl.innerHTML = `
        <div style="padding: 30px 20px; text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
          <svg style="width: 36px; height: 36px; margin: 0 auto 10px; opacity: 0.4;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <p>No hay páginas marcadas en este libro.</p>
          <span style="font-size: 0.75rem; opacity: 0.7;">Pulsa el icono de cinta en la cabecera para marcar la página actual.</span>
        </div>
      `;
      return;
    }

    this.bookmarksListEl.innerHTML = bookmarks.map(bm => {
      const dateStr = bm.createdAt ? new Date(bm.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '';
      return `
        <div class="bookmark-item" data-cfi="${this.escapeHtml(bm.cfi)}">
          <div class="bookmark-header">
            <span class="bookmark-chapter">${this.escapeHtml(bm.chapterTitle)}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="bookmark-percentage">${bm.percentage}%</span>
              <button class="btn-delete-bm" data-action="delete-bm" data-id="${bm.id}" title="Eliminar marcador" style="color: var(--color-text-muted); padding: 2px; cursor: pointer;">
                <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          <span style="font-size: 0.7rem; color: var(--color-text-muted);">${dateStr}</span>
        </div>
      `;
    }).join('');

    // Evento de clic en marcador para saltar
    this.bookmarksListEl.querySelectorAll('.bookmark-item').forEach(itemEl => {
      itemEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete-bm"]')) return;
        const cfi = itemEl.dataset.cfi;
        if (cfi) {
          readerManager.goTo(cfi);
          this.toggleToc(false);
        }
      });
    });

    // Evento de eliminar marcador
    this.bookmarksListEl.querySelectorAll('[data-action="delete-bm"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        await BookmarkManager.removeBookmark(id);
        Toast.info('Marcador eliminado.');
        this.renderBookmarks();
        // Actualizar botón de cinta
        if (this.bookmarkBtn && readerManager.currentCfi) {
          const isStillBm = await BookmarkManager.isBookmarked(this.currentBookId, readerManager.currentCfi);
          this.bookmarkBtn.classList.toggle('bookmark-active', !!isStillBm);
        }
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

    this.searchManager = new SearchManager(readerManager.book);
    const results = await this.searchManager.search(query, 60);

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
      itemEl.addEventListener('click', () => {
        const cfi = itemEl.dataset.cfi;
        if (cfi) {
          readerManager.goTo(cfi);
          this.toggleSearch(false);
          Toast.success('Navegado a la coincidencia.');
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
