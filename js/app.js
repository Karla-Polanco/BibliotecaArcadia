/**
 * ============================================================================
 * APP BOOTSTRAP - BIBLIOTECA ARCADIA
 * ============================================================================
 * Punto de entrada principal: orquestación de temas, citas, navegación y vistas.
 */

import { ThemeManager } from './ui/ThemeManager.js';
import { QuotesService } from './quotes/QuotesService.js';
import { QuotesView } from './quotes/QuotesView.js';
import { QuotesManager } from './quotes/QuotesManager.js';
import { QuoteModal } from './ui/QuoteModal.js';
import { LibraryView } from './library/LibraryView.js';
import { BookManager } from './library/BookManager.js';
import { StorageWidget } from './library/StorageWidget.js';
import { ReaderView } from './reader/ReaderView.js';
import { AnnotationsView } from './annotations/AnnotationsView.js';
import { VocabularyView } from './vocabulary/VocabularyView.js';
import { VocabularyManager } from './vocabulary/VocabularyManager.js';
import { PWAManager } from './pwa/PWAManager.js';
import { Toast } from './ui/Toast.js';
import { appState } from './state.js';

class App {
  constructor() {
    this.themeManager = new ThemeManager();
    this.quotesService = new QuotesService();
    this.storageWidget = null;
    this.bookManager = null;
    this.libraryView = null;
    this.readerView = null;
    this.annotationsView = null;
    this.vocabularyView = null;
    this.quotesView = null;
  }

  async init() {
    // 1. Inicializar PWA (Service Worker, Offline y Prompt de Instalación)
    PWAManager.init();

    // 2. Inicializar Gestor de Temas
    this.themeManager.init();

    // 3. Cargar citas literarias del usuario y configurar Banner
    await this.quotesService.reload();
    this.initQuoteBanner();

    // 4. Inicializar Widget de Almacenamiento Local
    const storageFillEl = document.getElementById('storage-progress-fill');
    const storageTextEl = document.getElementById('storage-info-text');
    this.storageWidget = new StorageWidget(storageFillEl, storageTextEl);
    await this.storageWidget.init();

    // 5. Inicializar Gestor de Libros y Persistencia IndexedDB
    this.bookManager = new BookManager(this.storageWidget);
    await this.bookManager.init();

    // Inicializar vocabulario predeterminado si el store está vacío
    await VocabularyManager.initPresets();

    // 6. Inicializar Controlador del Lector EPUB
    this.readerView = new ReaderView();

    // 7. Inicializar Vistas de Anotaciones, Vocabulario, Frases y Biblioteca
    const booksContainer = document.getElementById('books-container');
    if (booksContainer) {
      this.annotationsView = new AnnotationsView(
        booksContainer,
        (bookId, cfi) => this.readerView.open(bookId, cfi)
      );

      this.vocabularyView = new VocabularyView(booksContainer);

      this.quotesView = new QuotesView(booksContainer, this.quotesService);

      this.libraryView = new LibraryView(
        booksContainer,
        this.bookManager,
        (bookId) => this.readerView.open(bookId),
        this.annotationsView,
        this.vocabularyView,
        this.quotesView
      );
    }

    // 8. Vincular Botón "Continuar leyendo" de la barra inferior
    const btnContinue = document.getElementById('btn-continue-reading');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        const books = this.bookManager.getAllBooks();
        if (books.length === 0) {
          Toast.info('Tu biblioteca está vacía. Sube un libro (EPUB) para comenzar.');
          document.getElementById('epub-file-input')?.click();
          return;
        }

        const currentId = appState.get('currentReadingId') || books[0].id;
        if (currentId && this.readerView) {
          this.readerView.open(currentId);
        }
      });
    }

    // 9. Vincular Controles de Barra de Herramientas y Subida
    this.initToolbarControls();

    // 10. Vincular Navegación del Sidebar y Móvil
    this.initNavigation();

    // 11. Vincular Modal de Selector de Temas y Ajustes
    this.initThemeModal();
    this.initReadingBarPreferences();

    // 12. Restaurar última vista, libro o sección activa al recargar
    await this.restoreLastState();

    console.log('✦ Biblioteca Arcadia inicializada con éxito');
  }

  /**
   * Inicializa el banner con la cita y la rotación interactiva.
   */
  initQuoteBanner() {
    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');
    const quoteSourceEl = document.getElementById('quote-source');
    const refreshBtn = document.getElementById('btn-refresh-quote');
    const addQuoteBtn = document.getElementById('btn-banner-add-quote');
    const manageQuotesBtn = document.getElementById('btn-banner-manage-quotes');

    if (!quoteTextEl || !quoteAuthorEl) return;

    // Mostrar cita inicial persistida
    this.quotesService.updateBannerDOM();

    // Rotar frase con animación fluida
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        refreshBtn.classList.add('spinning');
        quoteTextEl.style.opacity = '0';
        quoteAuthorEl.style.opacity = '0';
        if (quoteSourceEl) quoteSourceEl.style.opacity = '0';

        setTimeout(() => {
          const nextQuote = this.quotesService.getNextQuote();
          quoteTextEl.textContent = nextQuote.text;
          quoteAuthorEl.textContent = `— ${nextQuote.author}`;
          if (quoteSourceEl) {
            quoteSourceEl.textContent = nextQuote.source ? ` · ${nextQuote.source}` : '';
            quoteSourceEl.style.opacity = '1';
          }
          quoteTextEl.style.opacity = '1';
          quoteAuthorEl.style.opacity = '1';
          refreshBtn.classList.remove('spinning');
        }, 200);
      });
    }

    // Botón añadir frase desde el banner
    if (addQuoteBtn) {
      addQuoteBtn.addEventListener('click', () => {
        QuoteModal.open(null, async () => {
          await this.quotesService.reload();
          this.quotesService.updateBannerDOM();
        });
      });
    }

    // Botón gestionar todas las frases
    if (manageQuotesBtn) {
      manageQuotesBtn.addEventListener('click', () => {
        appState.set('activeFilter', 'quotes');
        localStorage.setItem('arcadia_active_filter', 'quotes');
        document.querySelectorAll('[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === 'quotes');
        });
      });
    }
  }

  /**
   * Controles de búsqueda, ordenación y cambio Grid/Lista.
   */
  initToolbarControls() {
    const searchInput = document.getElementById('library-search');
    const sortSelect = document.getElementById('library-sort');
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');

    // Búsqueda en tiempo real
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          appState.set('searchQuery', e.target.value);
        }, 150);
      });
    }

    // Ordenamiento
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        appState.set('sortBy', e.target.value);
      });
    }

    // Toggle Grid / Lista
    if (btnGrid && btnList) {
      const updateToggleButtons = (mode) => {
        if (mode === 'grid') {
          btnGrid.classList.add('active');
          btnList.classList.remove('active');
        } else {
          btnList.classList.add('active');
          btnGrid.classList.remove('active');
        }
      };

      updateToggleButtons(appState.get('viewMode'));

      btnGrid.addEventListener('click', () => {
        appState.set('viewMode', 'grid');
        updateToggleButtons('grid');
      });

      btnList.addEventListener('click', () => {
        appState.set('viewMode', 'list');
        updateToggleButtons('list');
      });
    }

    // Subida de archivos EPUB
    const fileInput = document.getElementById('epub-file-input');
    const uploadBtn = document.getElementById('btn-upload-trigger');
    const mobileUploadBtn = document.getElementById('mobile-upload-trigger');

    const triggerUpload = () => {
      if (fileInput) fileInput.click();
    };

    if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
    if (mobileUploadBtn) mobileUploadBtn.addEventListener('click', triggerUpload);

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          for (const file of Array.from(files)) {
            if (this.libraryView) {
              await this.libraryView.handleFileUpload(file);
            }
          }
          fileInput.value = '';
        }
      });
    }
  }

  /**
   * Navegación del Sidebar, Drawer lateral móvil y Bottom Nav.
   */
  initNavigation() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const mobileToggle = document.getElementById('mobile-nav-toggle');

    // Función para alternar Drawer lateral en móvil
    const toggleDrawer = (open) => {
      if (sidebar && backdrop) {
        if (open) {
          sidebar.classList.add('drawer-open');
          backdrop.classList.add('active');
        } else {
          sidebar.classList.remove('drawer-open');
          backdrop.classList.remove('active');
        }
      }
    };

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => toggleDrawer(true));
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => toggleDrawer(false));
    }

    // Enlaces del Sidebar (Filtros de Colección y Vistas)
    document.querySelectorAll('[data-nav-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = item.dataset.navFilter;
        if (!filter) return;

        // Actualizar clase activa en enlaces
        document.querySelectorAll('[data-nav-filter]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Sincronizar con Bottom Nav si aplica
        document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(mItem => {
          mItem.classList.toggle('active', mItem.dataset.navFilter === filter);
        });

        appState.set('activeFilter', filter);
        localStorage.setItem('arcadia_active_filter', filter);
        toggleDrawer(false);
      });
    });

    // Enlaces de la Bottom Navigation móvil
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = link.dataset.navFilter;
        const action = link.dataset.action;

        if (action === 'open-settings') {
          this.openThemeModal();
          return;
        }

        if (filter) {
          document.querySelectorAll('.mobile-nav-link').forEach(l => l.classList.remove('active'));
          link.classList.add('active');

          document.querySelectorAll('[data-nav-filter]').forEach(sItem => {
            sItem.classList.toggle('active', sItem.dataset.navFilter === filter);
          });

          appState.set('activeFilter', filter);
          localStorage.setItem('arcadia_active_filter', filter);
        }
      });
    });

    // Ajustes en el Sidebar abre el modal de temas
    const settingsNavItem = document.getElementById('nav-settings');
    if (settingsNavItem) {
      settingsNavItem.addEventListener('click', (e) => {
        e.preventDefault();
        this.openThemeModal();
        toggleDrawer(false);
      });
    }
  }

  /**
   * Modal interactivo para seleccionar temas con previsualización exacta.
   */
  initThemeModal() {
    const modal = document.getElementById('theme-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeThemeModal());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeThemeModal();
    });

    // Tarjetas de opción de tema
    document.querySelectorAll('.theme-option-card').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.themeValue;
        this.themeManager.applyTheme(theme);
        this.updateThemeModalActiveCard(theme);
      });
    });

    this.updateThemeModalActiveCard(this.themeManager.getTheme());
  }

  openThemeModal() {
    const modal = document.getElementById('theme-modal');
    if (modal) {
      this.updateThemeModalActiveCard(this.themeManager.getTheme());
      modal.classList.add('active');
    }
  }

  closeThemeModal() {
    const modal = document.getElementById('theme-modal');
    if (modal) modal.classList.remove('active');
  }

  updateThemeModalActiveCard(activeTheme) {
    document.querySelectorAll('.theme-option-card').forEach(card => {
      card.classList.toggle('selected', card.dataset.themeValue === activeTheme);
    });
  }

  /**
   * Inicializa la preferencia de visibilidad para la barra inferior de "Lectura Actual".
   */
  initReadingBarPreferences() {
    const readingBar = document.getElementById('current-reading-bar');
    const toggleInput = document.getElementById('toggle-reading-bar');
    const dismissBtn = document.getElementById('btn-dismiss-reading-bar');

    const isVisible = localStorage.getItem('arcadia_show_reading_bar') !== 'false';

    if (readingBar) {
      readingBar.classList.toggle('hidden-by-setting', !isVisible);
    }
    if (toggleInput) {
      toggleInput.checked = isVisible;
      toggleInput.addEventListener('change', (e) => {
        const show = e.target.checked;
        localStorage.setItem('arcadia_show_reading_bar', show ? 'true' : 'false');
        if (readingBar) {
          readingBar.classList.toggle('hidden-by-setting', !show);
        }
        if (show) {
          Toast.success('Barra de lectura actual activada.');
        } else {
          Toast.info('Barra de lectura actual oculta.');
        }
      });
    }

    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        localStorage.setItem('arcadia_show_reading_bar', 'false');
        if (readingBar) {
          readingBar.classList.add('hidden-by-setting');
        }
        if (toggleInput) {
          toggleInput.checked = false;
        }
        Toast.info('Barra de lectura oculta. Puedes volver a activarla en Ajustes.');
      });
    }
  }

  /**
   * Restaura la última vista activa (lector con el libro abierto en su página, o la sección/filtro activo).
   */
  async restoreLastState() {
    if (window.location.hash) {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (_) {}
    }

    const savedView = localStorage.getItem('arcadia_active_view');
    const savedBookId = localStorage.getItem('arcadia_active_book_id');

    // 1. Si estaba leyendo un libro, reabrir el lector en ese libro
    if (savedView === 'reader' && savedBookId && this.bookManager) {
      const book = this.bookManager.getBookById(savedBookId);
      if (book && this.readerView) {
        await this.readerView.open(savedBookId);
        return;
      }
    }

    // 2. Si estaba en una sección (Notas, Vocabulario, Frases, Favoritos, etc.), restaurar filtro
    const targetFilter = localStorage.getItem('arcadia_active_filter') || 'all';

    if (targetFilter && targetFilter !== 'all') {
      appState.set('activeFilter', targetFilter);
      document.querySelectorAll('[data-nav-filter]').forEach(el => {
        el.classList.toggle('active', el.dataset.navFilter === targetFilter);
      });
      document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(el => {
        el.classList.toggle('active', el.dataset.navFilter === targetFilter);
      });
    }
  }
}

// Arrancar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
