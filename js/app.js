/**
 * ============================================================================
 * APP BOOTSTRAP - BIBLIOTECA ARCADIA
 * ============================================================================
 * Punto de entrada principal: orquestación de temas, citas, navegación y vistas.
 */

import { ThemeManager } from './ui/ThemeManager.js';
import { ScaleManager } from './ui/ScaleManager.js';
import { LibraryView } from './library/LibraryView.js';
import { BookManager } from './library/BookManager.js';
import { StorageWidget } from './library/StorageWidget.js';
import { ReaderView } from './reader/ReaderView.js';
import { AnnotationsView } from './annotations/AnnotationsView.js';
import { VocabularyView } from './vocabulary/VocabularyView.js';
import { VocabularyManager } from './vocabulary/VocabularyManager.js';
import { PWAManager } from './pwa/PWAManager.js';
import { Toast } from './ui/Toast.js';
import { CustomSelect } from './ui/CustomSelect.js';
import { BackupManager } from './ui/BackupManager.js';
import { appState } from './state.js';

class App {
  constructor() {
    this.themeManager = new ThemeManager();
    this.storageWidget = null;
    this.bookManager = null;
    this.libraryView = null;
    this.readerView = null;
    this.annotationsView = null;
    this.vocabularyView = null;
  }

  async init() {
    try {
    // 1. Inicializar PWA (Service Worker, Offline y Prompt de Instalación)
    PWAManager.init();

    // 2. Inicializar Gestor de Temas y Escala Global de Tipografía
    this.themeManager.init();
    ScaleManager.init();

    // 3. Inicializar Widget de Almacenamiento Local
    const storageFillEl = document.getElementById('storage-progress-fill');
    const storageTextEl = document.getElementById('storage-info-text');
    this.storageWidget = new StorageWidget(storageFillEl, storageTextEl);
    try {
      await this.storageWidget.init();
    } catch (e) {
      console.warn('[App] StorageWidget init falló:', e);
    }

    // 4. Inicializar Gestor de Libros y Persistencia IndexedDB
    this.bookManager = new BookManager(this.storageWidget);
    await this.bookManager.init();

    // Inicializar vocabulario predeterminado si el store está vacío
    try {
      await VocabularyManager.initPresets();
    } catch (e) {
      console.warn('[App] Vocabulary presets falló:', e);
    }

    // 5. Inicializar Controlador del Lector EPUB
    this.readerView = new ReaderView();

    // 6. Inicializar Vistas de Anotaciones, Vocabulario y Biblioteca
    const booksContainer = document.getElementById('books-container');
    if (booksContainer) {
      this.annotationsView = new AnnotationsView(
        booksContainer,
        (bookId, cfi) => this.readerView.open(bookId, cfi)
      );

      this.vocabularyView = new VocabularyView(booksContainer);

      this.libraryView = new LibraryView(
        booksContainer,
        this.bookManager,
        (bookId) => this.readerView.open(bookId),
        this.annotationsView,
        this.vocabularyView
      );
    }

    // 7. Vincular Controles de Barra de Herramientas y Subida
    this.initToolbarControls();

    // 8. Vincular Navegación del Sidebar y Móvil
    this.initNavigation();

    // 9. Vincular Modal de Selector de Temas y Ajustes
    this.initThemeModal();

    // 10. Restaurar última vista, libro o sección activa al recargar
    await this.restoreLastState();

    console.log('✦ Biblioteca Arcadia inicializada con éxito');
    } catch (err) {
      console.error('[App] Error fatal en init():', err);
      try {
        Toast.error('Error al iniciar la biblioteca. Recarga la página.');
      } catch (_) {}
    } finally {
      this.hideSplashScreen();
    }
  }

  /**
   * Oculta suavemente la pantalla de carga inicial sin saltos ni desplazamientos.
   */
  hideSplashScreen() {
    const splash = document.getElementById('app-splash');
    if (splash) {
      splash.style.opacity = '0';
      setTimeout(() => {
        if (splash) {
          splash.style.visibility = 'hidden';
          if (splash.parentNode) {
            splash.parentNode.removeChild(splash);
          }
        }
      }, 360);
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
      CustomSelect.enhance(sortSelect);
    }

    // Toggle Grid / Lista
    if (btnGrid && btnList) {
      const updateToggleButtons = (mode) => {
        const isGrid = mode === 'grid';
        btnGrid.classList.toggle('active', isGrid);
        btnList.classList.toggle('active', !isGrid);
        btnGrid.setAttribute('aria-pressed', String(isGrid));
        btnList.setAttribute('aria-pressed', String(!isGrid));
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
   * Usa delegación de eventos para soportar colecciones dinámicas.
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
          mobileToggle?.setAttribute('aria-expanded', 'true');
        } else {
          sidebar.classList.remove('drawer-open');
          backdrop.classList.remove('active');
          mobileToggle?.setAttribute('aria-expanded', 'false');
        }
      }
    };

    if (mobileToggle) {
      mobileToggle.addEventListener('click', () => toggleDrawer(true));
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => toggleDrawer(false));
    }

    const applyFilter = (filter, sourceEl = null) => {
      if (!filter) return;
      // Actualizar clase activa en enlaces (sidebar + móvil + modal estados)
      document.querySelectorAll('[data-nav-filter]').forEach(el => {
        const isActive = el.dataset.navFilter === filter;
        el.classList.toggle('active', isActive);
        // Para colecciones renderizadas en el sidebar
        if (el.classList.contains('nav-item-link')) {
          el.closest('.nav-item')?.classList.toggle('active', isActive);
        }
        if (el.classList.contains('collection-nav-link')) {
          el.closest('.collection-nav-item')?.classList.toggle('active', isActive);
        }
      });

      document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(mItem => {
        mItem.classList.toggle('active', mItem.dataset.navFilter === filter);
      });

      appState.set('activeFilter', filter);
      try {
        localStorage.setItem('arcadia_active_filter', filter);
      } catch (_) {}
      toggleDrawer(false);
    };

    // Delegación global: cualquier [data-nav-filter] presente o futuro
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav-filter]');
      if (navEl && !navEl.dataset.navDelegated) {
        if (navEl.tagName === 'A') e.preventDefault();
        const filter = navEl.dataset.navFilter;
        if (filter) {
          applyFilter(filter, navEl);
        }
      }

      const actionLink = e.target.closest('.mobile-nav-link[data-action="open-settings"]');
      if (actionLink) {
        e.preventDefault();
        this.openThemeModal();
      }
    });

    // Enlaces de la Bottom Navigation móvil con data-action (compat)
    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const action = link.dataset.action;
        if (action === 'open-settings') {
          // Ya manejado por delegación, evitar doble apertura
          e.preventDefault();
          return;
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
    if (!modal) return;
    const closeBtn = document.getElementById('modal-close-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeThemeModal());
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeThemeModal();
    });

    // Botones de copia de seguridad (Exportar e Importar)
    const btnExport = document.getElementById('btn-export-backup');
    if (btnExport) {
      btnExport.addEventListener('click', () => BackupManager.exportBackup());
    }
    const btnImport = document.getElementById('btn-import-backup');
    if (btnImport) {
      btnImport.addEventListener('click', () => BackupManager.triggerFileInput());
    }

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
      ScaleManager.initControls();
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
   * Restaura la última vista activa (lector con el libro abierto en su página, o la sección/filtro activo).
   */
  async restoreLastState() {
    try {
      if (window.location.hash) {
        try {
          history.replaceState(null, '', window.location.pathname + window.location.search);
        } catch (_) {}
      }

      let savedView = null;
      let savedBookId = null;
      let targetFilter = 'all';
      try {
        savedView = localStorage.getItem('arcadia_active_view');
        savedBookId = localStorage.getItem('arcadia_active_book_id');
        targetFilter = localStorage.getItem('arcadia_active_filter') || 'all';
        if (targetFilter === 'quotes') {
          targetFilter = 'all';
          localStorage.setItem('arcadia_active_filter', 'all');
        }
        localStorage.removeItem('arcadia_saved_quote_idx');
        localStorage.removeItem('arcadia_active_banner_quote_id');
      } catch (_) {}

      // 1. Si estaba leyendo un libro, reabrir el lector en ese libro
      if (savedView === 'reader' && savedBookId && this.bookManager) {
        try {
          const book = await this.bookManager.getBook(savedBookId);
          if (book && this.readerView) {
            await this.readerView.open(savedBookId);
            return;
          }
        } catch (e) {
          console.warn('[App] No se pudo restaurar el libro anterior:', e);
        }
        // Limpiar estado corrupto
        try {
          localStorage.setItem('arcadia_active_view', 'library');
          localStorage.removeItem('arcadia_active_book_id');
        } catch (_) {}
      }

      // 2. Si estaba en una sección (Notas, Vocabulario, Frases, Favoritos, etc.), restaurar filtro
      if (targetFilter && targetFilter !== 'all') {
        appState.set('activeFilter', targetFilter);
        document.querySelectorAll('[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === targetFilter);
        });
        document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === targetFilter);
        });
      }
    } catch (err) {
      console.warn('[App] restoreLastState falló:', err);
    }
  }
}

// Arrancar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch((err) => {
    console.error('[App] init() rechazado:', err);
  });
  // Exponer para depuración
  window.__arcadiaApp = app;
});
