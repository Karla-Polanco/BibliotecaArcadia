/**
 * ============================================================================
 * APP BOOTSTRAP - BIBLIOTECA ARCADIA
 * ============================================================================
 * Punto de entrada principal: orquestación de temas, citas, navegación y vistas.
 */

import { ThemeManager } from './ui/ThemeManager.js';
import { QuotesService } from './quotes/QuotesService.js';
import { LibraryView } from './library/LibraryView.js';
import { BookManager } from './library/BookManager.js';
import { StorageWidget } from './library/StorageWidget.js';
import { ReaderView } from './reader/ReaderView.js';
import { AnnotationsView } from './annotations/AnnotationsView.js';
import { VocabularyView } from './vocabulary/VocabularyView.js';
import { VocabularyManager } from './vocabulary/VocabularyManager.js';
import { PWAManager } from './pwa/PWAManager.js';
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
  }

  async init() {
    // 1. Inicializar PWA (Service Worker, Offline y Prompt de Instalación)
    PWAManager.init();

    // 2. Inicializar Gestor de Temas
    this.themeManager.init();

    // 3. Inicializar Cita Literaria en Banner
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

    // 5. Inicializar Controlador del Lector EPUB
    this.readerView = new ReaderView();

    // 6. Inicializar Vista Centralizada de Notas y Subrayados
    const booksContainer = document.getElementById('books-container');
    if (booksContainer) {
      this.annotationsView = new AnnotationsView(
        booksContainer,
        (bookId, cfi) => this.readerView.open(bookId, cfi)
      );

      // 7. Inicializar Vista de Vocabulario y Fonética
      this.vocabularyView = new VocabularyView(booksContainer);

      // 8. Inicializar Vista de Biblioteca conectada a IndexedDB y al Lector
      this.libraryView = new LibraryView(
        booksContainer,
        this.bookManager,
        (bookId) => this.readerView.open(bookId),
        this.annotationsView,
        this.vocabularyView
      );
    }

    // 9. Vincular Botón "Continuar leyendo" de la barra inferior
    const btnContinue = document.getElementById('btn-continue-reading');
    if (btnContinue) {
      btnContinue.addEventListener('click', () => {
        const books = this.bookManager.getAllBooks();
        if (books.length === 0) {
          Toast.info('Tu biblioteca está vacía. Haz clic en "Subir libro (EPUB)" para agregar tus lecturas.');
          document.getElementById('epub-file-input')?.click();
          return;
        }

        const currentId = appState.get('currentReadingId') || books[0].id;
        if (currentId && this.readerView) {
          this.readerView.open(currentId);
        }
      });
    }

    // 8. Vincular Controles de Barra de Herramientas y Subida
    this.initToolbarControls();

    // 9. Vincular Navegación del Sidebar y Móvil
    this.initNavigation();

    // 10. Vincular Modal de Selector de Temas
    this.initThemeModal();

    // 11. Restaurar vista, filtro o libro activo tras recargar la página
    this.restorePreviousState();

    console.log('✦ Biblioteca Arcadia inicializada con éxito (Fase 3: Motor de Lectura EPUB con epub.js)');
  }

  /**
   * Inicializa el banner con la cita y la rotación interactiva.
   */
  initQuoteBanner() {
    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');
    const refreshBtn = document.getElementById('btn-refresh-quote');

    if (!quoteTextEl || !quoteAuthorEl || !refreshBtn) return;

    // Mostrar cita inicial
    const initialQuote = this.quotesService.getCurrentQuote();
    quoteTextEl.textContent = initialQuote.text;
    quoteAuthorEl.textContent = `— ${initialQuote.author}`;

    // Evento de refresco
    refreshBtn.addEventListener('click', () => {
      refreshBtn.classList.add('spinning');
      quoteTextEl.style.opacity = '0';
      quoteAuthorEl.style.opacity = '0';

      setTimeout(() => {
        const nextQuote = this.quotesService.getNextQuote();
        quoteTextEl.textContent = nextQuote.text;
        quoteAuthorEl.textContent = `— ${nextQuote.author}`;
        quoteTextEl.style.opacity = '1';
        quoteAuthorEl.style.opacity = '1';
        refreshBtn.classList.remove('spinning');
      }, 250);
    });
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

    // Enlaces del Sidebar (Filtros de Colección)
    document.querySelectorAll('[data-nav-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const filter = item.dataset.navFilter;

        // Actualizar clase activa en enlaces
        document.querySelectorAll('[data-nav-filter]').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        // Sincronizar con Bottom Nav si aplica
        document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(mItem => {
          mItem.classList.toggle('active', mItem.dataset.navFilter === filter);
        });

        appState.set('activeFilter', filter);
        toggleDrawer(false);
      });
    });

    // Enlaces de la Bottom Navigation móvil
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
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
   * Widget de Almacenamiento Local (Cálculo real si la Storage API está disponible).
   */
  async initStorageWidget() {
    const storageTextEl = document.getElementById('storage-info-text');
    const storageFillEl = document.getElementById('storage-progress-fill');

    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
        const totalGB = (estimate.quota / (1024 * 1024 * 1024)).toFixed(1);
        const percent = Math.min(100, Math.max(5, Math.round((estimate.usage / estimate.quota) * 100)));

        if (storageTextEl) {
          storageTextEl.textContent = `${usedMB} MB de ${totalGB} GB usados`;
        }
        if (storageFillEl) {
          storageFillEl.style.width = `${percent}%`;
        }
        return;
      } catch {
        // Fallback a valores simulados de referencia
      }
    }

    /**
   * Restaura la vista, sección o libro activo previo a la recarga de página (F5 / Ctrl+R).
   */
  restorePreviousState() {
    const hash = window.location.hash;
    const savedView = localStorage.getItem('arcadia_active_view');
    const savedBookId = localStorage.getItem('arcadia_active_book_id');
    const savedFilter = localStorage.getItem('arcadia_active_filter') || 'all';

    // 1. Si estábamos dentro del lector EPUB
    if (hash.startsWith('#reader/')) {
      const bookId = hash.replace('#reader/', '');
      if (bookId && this.readerView) {
        setTimeout(() => this.readerView.open(bookId), 60);
        return;
      }
    } else if (savedView === 'reader' && savedBookId && this.readerView) {
      setTimeout(() => this.readerView.open(savedBookId), 60);
      return;
    }

    // 2. Si estábamos en un filtro o sección específica
    let targetFilter = savedFilter;
    if (hash && hash !== '#' && hash !== '#library') {
      targetFilter = hash.replace('#', '');
    }

    if (targetFilter) {
      document.querySelectorAll('[data-nav-filter]').forEach(el => {
        el.classList.toggle('active', el.dataset.navFilter === targetFilter);
      });
      document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(mItem => {
        mItem.classList.toggle('active', mItem.dataset.navFilter === targetFilter);
      });
      appState.set('activeFilter', targetFilter);
    }

    // Oyente para navegación por historial del navegador (Atrás / Adelante)
    window.addEventListener('hashchange', () => {
      const currentHash = window.location.hash;
      if (currentHash.startsWith('#reader/')) {
        const bId = currentHash.replace('#reader/', '');
        if (bId && this.readerView && !this.readerView.isOpen) {
          this.readerView.open(bId);
        }
      } else if (this.readerView && this.readerView.isOpen) {
        this.readerView.close();
      } else {
        const f = currentHash.replace('#', '') || 'all';
        appState.set('activeFilter', f);
      }
    });
  }
}

// Arrancar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
