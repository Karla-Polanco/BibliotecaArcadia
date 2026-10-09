/**
 * ============================================================================
 * APP BOOTSTRAP - BIBLIOTECA ARCADIA
 * ============================================================================
 * Punto de entrada principal: orquesta ciclo de vida, navegación, temas y vistas.
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

  /**
   * Inicializa de forma ordenada todos los subsistemas de la aplicación.
   */
  async init() {
    try {
    // 1. PWA: Registra el Service Worker y el detector de instalación
    PWAManager.init();

    // 2. Personalización: Aplica el tema guardado y escala tipográfica
    this.themeManager.init();
    ScaleManager.init();

    // 3. Almacenamiento: Monitor de uso de cuota local en disco
    const storageFillEl = document.getElementById('storage-progress-fill');
    const storageTextEl = document.getElementById('storage-info-text');
    this.storageWidget = new StorageWidget(storageFillEl, storageTextEl);
    try {
      await this.storageWidget.init();
    } catch (e) {
      console.warn('[App] StorageWidget init falló:', e);
    }

    // 4. Libros: Carga catálogo desde IndexedDB y asegura datos de vocabulario
    this.bookManager = new BookManager(this.storageWidget);
    await this.bookManager.init();

    try {
      await VocabularyManager.initPresets();
    } catch (e) {
      console.warn('[App] Vocabulary presets falló:', e);
    }

    // 5. Lector: Controlador del visor de libros EPUB
    this.readerView = new ReaderView();

    // 6. Vistas: Instancia vistas de anotaciones, vocabulario y biblioteca
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

    // 7. Eventos: Controles de barra de herramientas (búsqueda, orden y vista)
    this.initToolbarControls();

    // 8. Navegación: Barra lateral, drawer móvil y botones inferiores
    this.initNavigation();

    // 9. Restauración: Reanuda última lectura o filtro activo tras recarga
    await this.restoreLastState();
    } catch (err) {
      console.error('[App] Error fatal en init():', err);
      try {
        Toast.error('Error al iniciar la biblioteca. Recarga la página.');
      } catch (_) {}
      try { document.documentElement.classList.remove('is-booting'); } catch (_) {}
    }
  }

  /**
   * Configura los controles de búsqueda en vivo, ordenación y alternancia Grid/Lista.
   */
  initToolbarControls() {
    const searchInput = document.getElementById('library-search');
    const sortSelect = document.getElementById('library-sort');
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');

    // Búsqueda en tiempo real con debounce de 150ms
    if (searchInput) {
      let debounceTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          appState.set('searchQuery', e.target.value);
        }, 150);
      });
    }

    // Selector de ordenación con soporte para CustomSelect accesible
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        appState.set('sortBy', e.target.value);
      });
      CustomSelect.enhance(sortSelect);
    }

    // Alternador de modo de visualización: Cuadrícula o Lista
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

    // Selector de archivo para subida de libros EPUB
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
   * Gestiona la navegación de la barra lateral, menú drawer móvil y enlaces delegados.
   */
  initNavigation() {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    const mobileToggle = document.getElementById('mobile-nav-toggle');

    // Apertura y cierre del drawer lateral en dispositivos móviles
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

    // Aplica el filtro seleccionado y sincroniza los estados visuales en el menú
    const applyFilter = (filter, sourceEl = null) => {
      if (!filter) return;
      document.querySelectorAll('[data-nav-filter]').forEach(el => {
        const isActive = el.dataset.navFilter === filter;
        el.classList.toggle('active', isActive);
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

    // Delegación global de clics para soportar enlaces estáticos y colecciones dinámicas
    document.addEventListener('click', (e) => {
      const navEl = e.target.closest('[data-nav-filter]');
      if (navEl && !navEl.dataset.navDelegated) {
        if (navEl.tagName === 'A') e.preventDefault();
        const filter = navEl.dataset.navFilter;
        if (filter) {
          applyFilter(filter, navEl);
        }
      }
    });
  }

  /**
   * Restaura la última sesión activa (libro abierto en lectura o sección filtrada).
   */
  async restoreLastState() {
    const finishBoot = () => {
      try {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('is-booting');
        });
      } catch (_) {
        try { document.documentElement.classList.remove('is-booting'); } catch (_) {}
      }
    };
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

      // 1. Reanudar lectura si el usuario tenía un libro abierto
      if (savedView === 'reader' && savedBookId && this.bookManager) {
        try {
          const book = await this.bookManager.getBook(savedBookId);
          if (book && this.readerView) {
            await this.readerView.open(savedBookId);
            finishBoot();
            return;
          }
        } catch (e) {
          console.warn('[App] No se pudo restaurar el libro anterior:', e);
        }
        try {
          localStorage.setItem('arcadia_active_view', 'library');
          localStorage.removeItem('arcadia_active_book_id');
        } catch (_) {}
      }

      // 2. Restaurar sección o filtro activo (Favoritos, Notas, Vocabulario, etc.)
      if (targetFilter && targetFilter !== 'all') {
        appState.set('activeFilter', targetFilter);
        document.querySelectorAll('[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === targetFilter);
        });
        document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === targetFilter);
        });
      }
      finishBoot();
    } catch (err) {
      console.warn('[App] restoreLastState falló:', err);
      finishBoot();
    }
  }
}

// Inicialización de la aplicación al cargar el árbol DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch((err) => {
    console.error('[App] init() rechazado:', err);
  });
  // Instancia accesible para depuración en consola del desarrollador
  window.__arcadiaApp = app;
});
