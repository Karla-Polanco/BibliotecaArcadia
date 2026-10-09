/**
 * ============================================================================
 * LIBRARY VIEW - VISTA DE BIBLIOTECA CONECTADA A INDEXEDDB
 * ============================================================================
 * Maneja renderizado de libros, Drag & Drop de EPUBs, edición de metadatos,
 * eliminación persistente, favoritos y conmutación Grid/Lista.
 */

import { appState } from '../state.js';
import { escapeHtml, escapeAttr } from '../utils.js';
import { CollectionManager } from './CollectionManager.js';
import { CollectionModal } from '../ui/CollectionModal.js';
import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';
import { SettingsView } from '../ui/SettingsView.js';
import { Icons } from '../ui/Icons.js';

export class LibraryView {
  constructor(containerElement, bookManager, onOpenBook = null, annotationsView = null, vocabularyView = null, settingsView = null) {
    this.container = containerElement;
    this.bookManager = bookManager;
    this.onOpenBook = onOpenBook;
    this.annotationsView = annotationsView;
    this.vocabularyView = vocabularyView;
    this.settingsView = settingsView || new SettingsView(containerElement);
    this.filteredBooks = [];
    this.init();
  }

  async init() {
    // Inicializar presets de colecciones si está vacío
    await CollectionManager.initPresets(this.bookManager.getAllBooks());

    // Suscripción a cambios de estado
    appState.subscribe('viewMode', () => this.render());
    appState.subscribe('searchQuery', () => this.applyFiltersAndRender());
    appState.subscribe('sortBy', () => this.applyFiltersAndRender());
    appState.subscribe('activeFilter', () => this.applyFiltersAndRender());

    // Suscripción a eventos del gestor de libros
    appState.subscribe('bookAdded', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });
    appState.subscribe('bookUpdated', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });
    appState.subscribe('bookDeleted', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });

    // Suscripción a eventos de anotaciones para badges (incluye noteUpdated)
    appState.subscribe('annotationAdded', () => this.updateBadges());
    appState.subscribe('annotationRemoved', () => this.updateBadges());
    appState.subscribe('noteAdded', () => this.updateBadges());
    appState.subscribe('noteDeleted', () => this.updateBadges());
    appState.subscribe('noteUpdated', () => this.updateBadges());

    // Suscripción a eventos de vocabulario para badges
    appState.subscribe('wordAdded', () => this.updateBadges());
    appState.subscribe('wordUpdated', () => this.updateBadges());
    appState.subscribe('wordRemoved', () => this.updateBadges());

    // Suscripción a eventos de colecciones
    appState.subscribe('collectionAdded', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });
    appState.subscribe('collectionUpdated', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });
    appState.subscribe('collectionDeleted', async (deletedId) => {
      const currentFilter = appState.get('activeFilter');
      // Solo resetear si se estaba viendo la colección eliminada (no cualquier colección)
      if (currentFilter === `collection:${deletedId}`) {
        appState.set('activeFilter', 'all');
      }
      await this.updateBadges();
      await this.applyFiltersAndRender();
    });
    appState.subscribe('bookCollectionChanged', () => {
      this.updateBadges();
      this.applyFiltersAndRender();
    });

    // Botón de crear colección
    const btnCreateCol = document.getElementById('btn-create-collection');
    if (btnCreateCol) {
      btnCreateCol.addEventListener('click', () => {
        CollectionModal.openEditModal(null, () => this.updateBadges());
      });
    }

    this.initDragAndDrop();
    this.updateBadges();
    this.applyFiltersAndRender();
  }

  /**
   * Actualiza el estado derivado del sidebar (sin badges).
   */
  async updateBadges() {
    const books = this.bookManager.getAllBooks();
    const totalCount = books.length;

    if (totalCount > 0) {
      const currentId = appState.get('currentReadingId');
      const readingBook = books.find(b => b.id === currentId) || books[0];
      if (readingBook) {
        this.selectCurrentBook(readingBook);
      }
    }

    // Renderizar colecciones dinámicas en el sidebar
    await this.renderSidebarCollections();
  }

  /**
   * Renderiza la lista dinámica de colecciones en el sidebar lateral.
   */
  async renderSidebarCollections() {
    const listEl = document.getElementById('custom-collections-list');
    if (!listEl) return;

    const collections = await CollectionManager.getAllCollections();
    const activeFilter = appState.get('activeFilter') || 'all';

    listEl.innerHTML = collections.map((col, idx) => {
      const isColActive = activeFilter === `collection:${col.id}`;
      const defaultColors = ['#EC4899', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'];
      const colColor = col.color || defaultColors[idx % defaultColors.length];

      const iconSvg = `<svg style="width: 16px; height: 16px;" aria-hidden="true"><use href="./assets/icons/icons.svg#epub-logo"></use></svg>`;

      return `
        <div class="collection-nav-item ${isColActive ? 'active' : ''}" style="--col-accent: ${colColor};" data-col-item-id="${col.id}">
          <button type="button" class="collection-nav-link" data-nav-filter="collection:${col.id}" aria-label="Abrir colección ${this.escapeAttr(col.name)}">
            <span class="collection-badge-icon" aria-hidden="true">
              ${iconSvg}
            </span>
            <span class="collection-nav-name">${this.escapeHtml(col.name)}</span>
          </button>
          <div class="collection-nav-right">
            <button class="btn-col-options" data-col-id="${col.id}" title="Opciones de colección" aria-label="Opciones de colección ${this.escapeAttr(col.name)}">
              <svg style="width: 13px; height: 13px;" aria-hidden="true"><use href="./assets/icons/icons.svg#more"></use></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos de selección de colección (delegados en App.initNavigation;
    // aquí solo se refuerza el estado visual del wrapper .collection-nav-item)
    listEl.querySelectorAll('[data-nav-filter]').forEach(item => {
      item.addEventListener('click', () => {
        // El filtro real lo aplica la delegación global en app.js.
        // Solo sincronizamos la clase del contenedor para feedback inmediato.
        listEl.querySelectorAll('.collection-nav-item').forEach(el => el.classList.remove('active'));
        item.closest('.collection-nav-item')?.classList.add('active');
      });
    });

    // Eventos de opciones de colección (Editar / Eliminar)
    listEl.querySelectorAll('.btn-col-options').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const colId = btn.dataset.colId;
        const col = collections.find(c => c.id === colId);
        if (!col) return;

        const action = await Modal.collectionActionModal(col);
        if (action === 'edit') {
          CollectionModal.openEditModal(col, () => this.updateBadges());
        } else if (action === 'delete') {
          const confirmed = await Modal.confirm({
            title: 'Eliminar colección',
            message: `¿Estás seguro de que deseas eliminar la colección «${col.name}»?\n\nLos libros continuarán intactos en tu biblioteca.`,
            danger: true,
            confirmText: 'Eliminar colección'
          });

          if (confirmed) {
            await CollectionManager.deleteCollection(col.id);
            Toast.success('Colección eliminada.');
            if (appState.get('activeFilter') === `collection:${col.id}`) {
              appState.set('activeFilter', 'all');
            }
            await this.updateBadges();
            await this.applyFiltersAndRender();
          }
        }
      });
    });
  }

  /**
   * Aplica filtros de texto, categoría y ordenamiento.
   */
  async applyFiltersAndRender(renderColHeader = true) {
    const filter = appState.get('activeFilter') || 'all';
    const libraryHeader = document.querySelector('.library-header');

    if (this._lastAppliedFilter !== filter) {
      this.collectionSearchQuery = '';
      this._lastAppliedFilter = filter;
    }

    // Si el filtro activo es "Notas y subrayados", ocultar el encabezado de biblioteca y delegar a AnnotationsView
    if (filter === 'annotations') {
      if (libraryHeader) libraryHeader.style.display = 'none';
      this.container.className = 'annotations-view';
      this.container.innerHTML = '<div class="view-loading" aria-busy="true"></div>';
      if (this.annotationsView) {
        this.annotationsView.loadAndRender();
      }
      return;
    }

    // Si el filtro activo es "Vocabulario", ocultar el encabezado de biblioteca y delegar a VocabularyView
    if (filter === 'vocabulary') {
      if (libraryHeader) libraryHeader.style.display = 'none';
      this.container.className = 'vocabulary-view';
      this.container.innerHTML = '<div class="view-loading" aria-busy="true"></div>';
      if (this.vocabularyView) {
        this.vocabularyView.loadAndRender();
      }
      return;
    }

    // Si el filtro activo es "Ajustes", ocultar el encabezado de biblioteca y delegar a SettingsView
    if (filter === 'settings') {
      if (libraryHeader) libraryHeader.style.display = 'none';
      this.container.className = 'settings-page-view';
      this.container.innerHTML = '<div class="view-loading" aria-busy="true"></div>';
      if (this.settingsView) {
        this.settingsView.loadAndRender();
      }
      return;
    }

    // En vistas de catálogo o colección, mostrar siempre el encabezado de biblioteca
    if (libraryHeader) libraryHeader.style.display = 'block';

    let books = [];
    let isCustomCollection = false;

    if (filter.startsWith('collection:')) {
      const colId = filter.split(':')[1];
      books = await CollectionManager.getBooksInCollection(colId);
      this.activeCollectionData = (await CollectionManager.getAllCollections()).find(c => c.id === colId) || null;
      isCustomCollection = true;
    } else {
      books = this.bookManager.getAllBooks();
      this.activeCollectionData = null;
    }

    const headerTop = document.querySelector('.library-header-top');
    const uploadBtn = document.getElementById('btn-upload-trigger');
    const libraryControls = document.querySelector('.library-controls');

    if (headerTop) {
      if (isCustomCollection && this.activeCollectionData) {
        if (libraryHeader) libraryHeader.classList.add('in-collection-view');
        const col = this.activeCollectionData;
        const colColor = col.color || 'var(--color-primary-light)';
        if (uploadBtn) uploadBtn.style.display = 'none';
        if (libraryControls) libraryControls.style.display = 'none';

        let colWrap = headerTop.querySelector('#col-header-custom-wrap');
        if (!colWrap) {
          colWrap = document.createElement('div');
          colWrap.id = 'col-header-custom-wrap';
          headerTop.appendChild(colWrap);
        }
        colWrap.className = 'collection-header-panel';
        colWrap.style.cssText = '';
        colWrap.style.display = 'flex';
        colWrap.style.setProperty('--col-accent', colColor);

        const stdTitle = headerTop.querySelector('.library-title');
        if (stdTitle) stdTitle.style.display = 'none';

        if (renderColHeader || !colWrap.innerHTML.trim()) {
          colWrap.innerHTML = `
            <div class="header-card-top">
              <div class="header-card-brand-group">
                <div class="header-card-icon-box">
                  <svg style="width: 24px; height: 24px;" aria-hidden="true"><use href="./assets/icons/icons.svg#epub-logo"></use></svg>
                </div>
                <div class="header-card-text">
                  <span class="panel-category-tag" style="color: ${this.escapeAttr(colColor)};">COLECCIÓN</span>
                  <h1 class="panel-heading">${this.escapeHtml(col.name)}</h1>
                  <p class="panel-description">${col.description ? this.escapeHtml(col.description) : 'Libros asignados a esta colección personal.'}</p>
                </div>
              </div>
              <div class="panel-actions-row">
                <span class="collection-count-pill">
                  <svg style="width: 13px; height: 13px;" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
                  ${books.length} ${books.length === 1 ? 'libro' : 'libros'}
                </span>
                <button type="button" id="btn-edit-active-col" class="btn btn--sm btn--ghost" title="Editar colección">
                  ${Icons.EDIT}
                  <span>Editar</span>
                </button>
                <button type="button" id="btn-delete-active-col" class="btn btn--sm btn--danger" title="Eliminar colección">
                  ${Icons.TRASH}
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <div class="panel-search-bar">
              <svg style="width: 14px; height: 14px; color: var(--color-text-muted); flex-shrink: 0; pointer-events: none;" aria-hidden="true"><use href="./assets/icons/icons.svg#search"></use></svg>
              <input type="text" id="input-col-search" class="panel-search-input" value="${this.escapeHtml(this.collectionSearchQuery || '')}" placeholder="Buscar en esta colección...">
            </div>
          `;

          const inputColSearch = colWrap.querySelector('#input-col-search');
          if (inputColSearch) {
            inputColSearch.addEventListener('input', (e) => {
              this.collectionSearchQuery = e.target.value.trim().toLowerCase();
              this.applyFiltersAndRender(false);
            });
          }
        }
      } else {
        if (libraryHeader) libraryHeader.classList.remove('in-collection-view');
        const colWrap = headerTop.querySelector('#col-header-custom-wrap');
        if (colWrap) colWrap.style.display = 'none';

        const stdTitle = headerTop.querySelector('.library-title');
        if (stdTitle) {
          stdTitle.style.display = '';
          if (filter === 'all') stdTitle.textContent = 'Biblioteca';
          else if (filter === 'reading') stdTitle.textContent = 'Leyendo actualmente';
          else if (filter === 'to_read') stdTitle.textContent = 'Por leer';
          else if (filter === 'completed') stdTitle.textContent = 'Libros leídos';
          else if (filter === 'favorites') stdTitle.textContent = 'Mis favoritos';
          else stdTitle.textContent = 'Biblioteca';
        }

        // Píldora de conteo junto al título (Biblioteca y Favoritos)
        const countPill = headerTop.querySelector('#library-count-pill');
        if (countPill) {
          if (filter === 'all') {
            const n = books.length;
            countPill.textContent = `${n} ${n === 1 ? 'libro' : 'libros'}`;
            countPill.style.display = '';
          } else if (filter === 'favorites') {
            const n = books.filter(b => b.favorite).length;
            countPill.textContent = `${n} ${n === 1 ? 'favorito' : 'favoritos'}`;
            countPill.style.display = '';
          } else {
            countPill.style.display = 'none';
          }
        }

        if (uploadBtn) uploadBtn.style.display = '';
        if (libraryControls) libraryControls.style.display = '';
      }
    }

    const query = (appState.get('searchQuery') || '').trim().toLowerCase();
    const sortBy = appState.get('sortBy') || 'recent';

    // 1. Filtrar por categoría / colección
    let result = books.filter(book => {
      if (isCustomCollection) return true;
      if (filter === 'all') return true;
      if (filter === 'favorites') return book.favorite;
      return book.status === filter;
    });

    // 2. Filtrar por texto de búsqueda (título, saga o autor)
    if (isCustomCollection && this.collectionSearchQuery) {
      result = result.filter(book =>
        (book.title || '').toLowerCase().includes(this.collectionSearchQuery) ||
        (book.saga || '').toLowerCase().includes(this.collectionSearchQuery) ||
        (book.author || '').toLowerCase().includes(this.collectionSearchQuery)
      );
    } else if (query && !isCustomCollection) {
      result = result.filter(book =>
        (book.title || '').toLowerCase().includes(query) ||
        (book.saga || '').toLowerCase().includes(query) ||
        (book.author || '').toLowerCase().includes(query)
      );
    }

    // 3. Ordenamiento
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return (b.lastReadAt || b.addedAt) - (a.lastReadAt || a.addedAt);
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'author') {
        return (a.author || '').localeCompare(b.author || '');
      }
      if (sortBy === 'progress') {
        return (b.progress || 0) - (a.progress || 0);
      }
      return 0;
    });

    this.filteredBooks = result;
    this.render();
  }

  /**
   * Genera el encabezado banner para la colección activa.
   */
  renderCollectionHeader() {
    return '';
  }

  /**
   * Renderiza el catálogo según el modo (Grid vs Lista).
   */
  render() {
    if (!this.container) return;
    const viewMode = appState.get('viewMode') || 'grid';
    const filter = appState.get('activeFilter') || 'all';
    const query = (appState.get('searchQuery') || '').trim();

    if (this.filteredBooks.length === 0) {
      let emptyTitle = 'Tu biblioteca está vacía';
      let emptyDesc = 'No hay libros cargados todavía. Arrastra y suelta aquí tus archivos <strong>.epub</strong> o pulsa el botón para subir tus libros y comenzar a leer.';
      let showUploadBtn = true;
      let showResetBtn = false;

      if (query || (filter.startsWith('collection:') && this.collectionSearchQuery)) {
        const activeQ = filter.startsWith('collection:') ? this.collectionSearchQuery : query;
        emptyTitle = 'Sin resultados';
        emptyDesc = `No se encontraron libros que coincidan con la búsqueda «<strong>${this.escapeHtml(activeQ)}</strong>».`;
        showUploadBtn = false;
        showResetBtn = true;
      } else if (filter === 'reading') {
        emptyTitle = 'Sin lecturas en curso';
        emptyDesc = 'Cuando abras y leas un libro de tu biblioteca, aparecerá automáticamente aquí para que continúes donde lo dejaste.';
        showUploadBtn = false;
        showResetBtn = true;
      } else if (filter === 'favorites') {
        emptyTitle = 'No tienes favoritos';
        emptyDesc = 'Marca tus libros preferidos con la estrella dorada para acceder a ellos rápidamente desde esta sección.';
        showUploadBtn = false;
        showResetBtn = true;
      } else if (filter === 'to_read') {
        emptyTitle = 'Sin libros por leer';
        emptyDesc = 'Organiza tu lista de lecturas pendientes marcando libros como «Por leer».';
        showUploadBtn = false;
        showResetBtn = true;
      } else if (filter === 'completed') {
        emptyTitle = 'No hay libros terminados';
        emptyDesc = 'Los libros que completes al 100% de lectura se archivarán automáticamente en esta sección.';
        showUploadBtn = false;
        showResetBtn = true;
      } else if (filter.startsWith('collection:')) {
        emptyTitle = 'Esta colección está vacía';
        emptyDesc = 'Añade libros a esta colección desde el menú de opciones de cualquier libro en tu biblioteca.';
        showUploadBtn = false;
        showResetBtn = true;
      }

      this.container.innerHTML = `
        ${this.renderCollectionHeader()}
        <div class="library-empty-state">
          <div class="empty-state-icon">
            <svg style="width: 36px; height: 36px; color: var(--color-primary-light);" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
          </div>
          <h3 class="empty-state-title">${emptyTitle}</h3>
          <p class="empty-state-desc">
            ${emptyDesc}
          </p>
          ${showUploadBtn ? `
            <button id="btn-empty-upload" class="btn btn--primary">
              ${Icons.IMPORT}
              <span>Subir libro (EPUB)</span>
            </button>
          ` : ''}
          ${showResetBtn ? `
            <button id="btn-empty-reset" class="btn btn--ghost">
              <span>Ver toda la biblioteca</span>
            </button>
          ` : ''}
        </div>
      `;

      const btnEmptyUpload = this.container.querySelector('#btn-empty-upload');
      if (btnEmptyUpload) {
        btnEmptyUpload.addEventListener('click', () => {
          document.getElementById('epub-file-input')?.click();
        });
      }
      const btnEmptyReset = this.container.querySelector('#btn-empty-reset');
      if (btnEmptyReset) {
        btnEmptyReset.addEventListener('click', () => {
          appState.set('searchQuery', '');
          const searchInput = document.getElementById('library-search');
          if (searchInput) searchInput.value = '';
          appState.set('activeFilter', 'all');
          document.querySelectorAll('[data-nav-filter]').forEach(el => {
            el.classList.toggle('active', el.dataset.navFilter === 'all');
          });
          document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(el => {
            el.classList.toggle('active', el.dataset.navFilter === 'all');
          });
        });
      }

      this.attachCardEvents();
      return;
    }

    if (viewMode === 'grid') {
      this.renderGrid();
    } else {
      this.renderList();
    }

    this.attachCardEvents();
  }

  /**
   * Renderizado en formato Cuadrícula (Grid).
   */
  renderGrid() {
    this.container.className = 'books-grid';
    const headerHtml = this.renderCollectionHeader();
    const RING_C = 56.55;
    const cardsHtml = this.filteredBooks.map(book => {
      const pct = Math.max(0, Math.min(100, Math.round(book.progress || 0)));
      const offset = (RING_C * (1 - pct / 100)).toFixed(2);
      return `
      <article class="book-card" data-book-id="${book.id}">
        <div class="book-cover-container">
          <div class="book-spine-3d" aria-hidden="true"></div>
          ${book.coverDataUrl ? `
            <img src="${book.coverDataUrl}" alt="${this.escapeHtml(book.title)}" class="book-cover-img" loading="lazy">
          ` : `
            <div class="book-cover-placeholder" style="background: ${book.coverGradient || 'var(--banner-gradient)'};">
              <div class="placeholder-spine"></div>
              <img src="assets/icons/logo-transparent.png" alt="" class="placeholder-icon-emblem">
              <div class="placeholder-title">${this.escapeHtml(book.title)}</div>
              ${book.author ? `<div class="placeholder-author">${this.escapeHtml(book.author)}</div>` : ''}
            </div>
          `}

          <!-- Botón de Favorito -->
          <button class="btn-book-fav ${book.favorite ? 'is-fav' : ''}" data-action="toggle-fav" data-id="${book.id}" aria-label="Favorito">
            <svg style="width: 16px; height: 16px;" aria-hidden="true"><use href="./assets/icons/icons.svg#${book.favorite ? 'star-fill' : 'star'}"></use></svg>
          </button>

          <!-- Botón Menú de Opciones -->
          <button class="btn-book-fav" style="top: 8px; left: 8px; right: auto;" data-action="book-options" data-id="${book.id}" aria-label="Opciones del libro">
            <svg style="width: 16px; height: 16px;" aria-hidden="true"><use href="./assets/icons/icons.svg#more"></use></svg>
          </button>


        </div>

        <div class="book-meta">
          <h4 class="book-title" title="${this.escapeHtml(book.title)}">${this.escapeHtml(book.title)}</h4>
          ${book.saga ? `<span class="book-saga">${this.escapeHtml(book.saga)}</span>` : `<span class="book-saga book-saga--empty" aria-hidden="true">&nbsp;</span>`}
          <span class="book-author">${this.escapeHtml(book.author)}</span>
          <div class="book-badge-info">
            <span class="book-status">${this.getStatusLabel(book.status)}</span>
            <span class="grid-progress" title="Progreso de lectura: ${pct}%">
              <svg class="grid-progress-ring" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" class="ring-track"></circle>
                <circle cx="12" cy="12" r="9" class="ring-fill" stroke-dasharray="${RING_C}" stroke-dashoffset="${offset}"></circle>
              </svg>
              <span class="grid-progress-text">${pct}%</span>
            </span>
          </div>
        </div>
      </article>
    `;}).join('');

    this.container.innerHTML = headerHtml + cardsHtml;
  }

  /**
   * Renderizado en formato Lista (List) según el orden solicitado (Imagen 3).
   * Estructura: Nombre, autor, estado, barra de progreso, botón de favoritos y menú.
   */
  renderList() {
    this.container.className = 'books-list';
    const headerHtml = this.renderCollectionHeader();
    const itemsHtml = this.filteredBooks.map(book => {
      const pct = Math.max(0, Math.min(100, Math.round(book.progress || 0)));
      let helper = '';
      if (pct === 0) {
        helper = 'Aún no has empezado';
      } else if (book.lastReadChapterTitle && !book.lastReadChapterTitle.includes('%')) {
        helper = book.lastReadChapterTitle;
      }
      const bookIconSvg = `<svg style="width:12px;height:12px;flex-shrink:0" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>`;

      return `
      <div class="book-list-item" data-book-id="${book.id}">
        <div class="list-cover-wrapper">
          <div class="book-spine-3d" aria-hidden="true"></div>
          ${book.coverDataUrl ? `
            <img src="${book.coverDataUrl}" alt="${this.escapeHtml(book.title)}" class="list-cover-thumb" loading="lazy">
          ` : `
            <div class="list-cover-thumb list-cover-placeholder" style="background: ${book.coverGradient || 'var(--banner-gradient)'};">
              <img src="assets/icons/logo-transparent.png" alt="" style="width: 36px; height: auto; opacity: 0.92; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.5));">
            </div>
          `}
        </div>

        <div class="list-content-column">
          <div class="list-info-row">
            <div class="list-info">
              ${book.saga ? `<span class="list-saga">${this.escapeHtml(book.saga)}</span>` : `<span class="list-saga list-saga--empty" aria-hidden="true">&nbsp;</span>`}
              <h4 class="list-title">${this.escapeHtml(book.title)}</h4>
              <span class="list-author">${this.escapeHtml(book.author)}</span>
            </div>

            <div class="list-item-actions-row">
              <button class="btn-list-action ${book.favorite ? 'is-fav' : ''}" data-action="toggle-fav" data-id="${book.id}" aria-label="Favorito" title="Favorito">
                <svg style="width: 18px; height: 18px;" aria-hidden="true"><use href="./assets/icons/icons.svg#${book.favorite ? 'star-fill' : 'star'}"></use></svg>
              </button>
              <button class="btn-list-action" data-action="book-options" data-id="${book.id}" aria-label="Menú de opciones" title="Menú de opciones">
                <svg style="width: 18px; height: 18px;" aria-hidden="true"><use href="./assets/icons/icons.svg#more"></use></svg>
              </button>
            </div>
          </div>

          <div class="list-progress-row">
            <div class="list-progress-bar">
              <div class="list-progress-fill" style="width: ${pct}%;"></div>
            </div>
            <span class="list-progress-text">${pct}%</span>
          </div>

          <div class="list-status-row">
            <span class="list-status-badge ${book.status}">${this.getStatusLabel(book.status)}</span>
            ${helper ? `<span class="list-status-helper">${this.escapeHtml(helper)}</span>` : ''}
          </div>
        </div>
      </div>
    `;}).join('');
    this.container.innerHTML = headerHtml + itemsHtml;
  }

  /**
   * Vincula interactividad de clics, favoritos y opciones en tarjetas.
   */
  attachCardEvents() {
    // Botón de editar colección activa en el encabezado
    const btnEditCol = document.getElementById('btn-edit-active-col');
    if (btnEditCol && this.activeCollectionData) {
      btnEditCol.onclick = () => {
        CollectionModal.openEditModal(this.activeCollectionData, async () => {
          await this.updateBadges();
          await this.applyFiltersAndRender();
        });
      };
    }

    // Botón de eliminar colección activa en el encabezado
    const btnDeleteCol = document.getElementById('btn-delete-active-col');
    if (btnDeleteCol && this.activeCollectionData) {
      btnDeleteCol.onclick = async () => {
        const col = this.activeCollectionData;
        const confirmed = await Modal.confirm({
          title: 'Eliminar colección',
          message: `¿Estás seguro de que deseas eliminar la colección «${col.name}»?\n\nLos libros continuarán intactos en tu biblioteca.`,
          danger: true,
          confirmText: 'Eliminar'
        });

        if (confirmed) {
          await CollectionManager.deleteCollection(col.id);
          Toast.success('Colección eliminada.');
          appState.set('activeFilter', 'all');
          await this.updateBadges();
          await this.applyFiltersAndRender();
        }
      };
    }
    // Favoritos
    this.container.querySelectorAll('[data-action="toggle-fav"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        try {
          await this.bookManager.toggleFavorite(id);
        } catch (err) {
          Toast.error('Error al actualizar favorito.');
        }
      });
    });

    // Menú de Opciones (Editar / Eliminar)
    this.container.querySelectorAll('[data-action="book-options"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const book = this.bookManager.getAllBooks().find(b => b.id === id);
        if (book) this.showBookOptionsMenu(book, btn);
      });
    });

    // Clic en la tarjeta (Seleccionar y Abrir en el Lector)
    this.container.querySelectorAll('[data-book-id]').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const bookId = item.dataset.bookId;
        const book = this.bookManager.getAllBooks().find(b => b.id === bookId);
        if (book) {
          this.selectCurrentBook(book);
          if (this.onOpenBook) {
            this.onOpenBook(book.id);
          }
        }
      });
    });
  }

  /**
   * Despliega un menú contextual flotante para editar o eliminar el libro.
   */
  showBookOptionsMenu(book, triggerEl) {
    // Eliminar menús previos si existen
    document.querySelectorAll('.context-menu-floating').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'context-menu-floating';

    const rect = triggerEl.getBoundingClientRect();
    // Alinear derecha del menú con derecha del botón, como el select
    const menuWidth = 200;
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.min(window.innerWidth - menuWidth - 10, Math.max(10, rect.right - menuWidth))}px`;

    menu.innerHTML = `
      <button class="menu-action-btn" data-opt="read" style="background: color-mix(in srgb, var(--color-primary-light) 12%, transparent);">
        ${Icons.BOOK}
        <span style="flex:1; text-align:left;">Leer libro</span>
        <svg style="width:14px;height:14px;opacity:.5" aria-hidden="true"><use href="./assets/icons/icons.svg#chevron-right"></use></svg>
      </button>
      <button class="menu-action-btn" data-opt="edit">
        ${Icons.EDIT}
        <span style="flex:1; text-align:left;">Editar detalles</span>
      </button>
      <button class="menu-action-btn" data-opt="collections">
        <svg class="btn-icon-svg" aria-hidden="true"><use href="./assets/icons/icons.svg#archive"></use></svg>
        <span style="flex:1; text-align:left;">Colecciones...</span>
        <svg style="width:14px;height:14px;opacity:.5" aria-hidden="true"><use href="./assets/icons/icons.svg#chevron-right"></use></svg>
      </button>
      <button class="menu-action-btn" data-opt="download">
        ${Icons.EXPORT}
        <span style="flex:1; text-align:left;">Descargar EPUB</span>
        <span style="font-size:0.62rem; padding:2px 6px; border-radius:999px; background:color-mix(in srgb, var(--color-primary-light) 14%, transparent); color:var(--color-primary); font-weight:700;">EPUB</span>
      </button>
      <div style="height:1px; background:var(--color-border); margin:4px 0; opacity:.6;"></div>
      <button class="menu-action-btn" data-opt="delete" style="background: var(--state-danger-bg, rgba(200, 90, 84, 0.12)); color: var(--state-danger, #C85A54);">
        ${Icons.TRASH}
        <span style="flex:1; text-align:left; font-weight:600;">Eliminar libro</span>
      </button>
    `;

    document.body.appendChild(menu);

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);

    menu.querySelector('[data-opt="read"]').addEventListener('click', () => {
      menu.remove();
      this.selectCurrentBook(book);
      if (this.onOpenBook) this.onOpenBook(book.id);
    });

    menu.querySelector('[data-opt="edit"]').addEventListener('click', () => {
      menu.remove();
      this.promptEditBook(book);
    });

    menu.querySelector('[data-opt="collections"]').addEventListener('click', () => {
      menu.remove();
      CollectionModal.openAssignModal(book, () => this.updateBadges());
    });

    const downloadBtn = menu.querySelector('[data-opt="download"]');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        menu.remove();
        this.downloadBookEpub(book);
      });
    }

    menu.querySelector('[data-opt="delete"]').addEventListener('click', () => {
      menu.remove();
      this.confirmDeleteBook(book);
    });
  }

  /**
   * Descarga el archivo EPUB original guardado en IndexedDB.
   */
  async downloadBookEpub(book) {
    if (!book || !book.fileBlob) {
      Toast.error('Archivo binario no disponible.');
      return;
    }
    try {
      const url = URL.createObjectURL(book.fileBlob);
      const a = document.createElement('a');
      const safeTitle = (book.title || 'libro').replace(/[\\/:*?"<>|]/g, '_');
      a.href = url;
      a.download = `${safeTitle}.epub`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 500);
      Toast.success(`Descargando «${book.title}»...`);
    } catch (err) {
      console.warn('Error descargando EPUB:', err);
      Toast.error('No se pudo descargar el archivo.');
    }
  }

  /**
   * Diálogo para editar metadatos básicos (título y autor).
   */
  async promptEditBook(book) {
    const updated = await Modal.editBookDetails(book);
    if (!updated) return;

    try {
      await this.bookManager.updateBook(book.id, {
        title: updated.title || book.title,
        saga: updated.saga || '',
        author: updated.author || book.author,
        coverDataUrl: updated.coverDataUrl !== undefined ? updated.coverDataUrl : book.coverDataUrl
      });
      Toast.success('Información y portada del libro actualizadas.');
      await this.applyFiltersAndRender();
    } catch (err) {
      Toast.error('No se pudieron guardar los cambios.');
    }
  }

  /**
   * Diálogo de confirmación para eliminar un libro de IndexedDB.
   */
  async confirmDeleteBook(book) {
    const confirmed = await Modal.confirm({
      title: 'Eliminar libro',
      message: `¿Estás seguro de que deseas eliminar «${book.title}» de tu biblioteca local?\n\nSe eliminarán permanentemente el archivo, sus notas y su progreso de lectura.`,
      danger: true,
      confirmText: 'Eliminar libro'
    });

    if (!confirmed) return;

    try {
      await this.bookManager.deleteBook(book.id);
      Toast.success(`«${book.title}» ha sido eliminado.`);
    } catch (err) {
      Toast.error('Error al eliminar el libro de IndexedDB.');
    }
  }

  /**
   * Soporte nativo para arrastrar y soltar (Drag & Drop) archivos EPUB.
   */
  initDragAndDrop() {
    const dropZone = document.body;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.add('drag-over-active');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drag-over-active');
      });
    });

    dropZone.addEventListener('drop', async (e) => {
      const files = e.dataTransfer ? e.dataTransfer.files : [];
      if (files && files.length > 0) {
        for (const file of Array.from(files)) {
          if (file.name.toLowerCase().endsWith('.epub')) {
            await this.handleFileUpload(file);
          } else {
            Toast.warning(`El archivo "${file.name}" no es un libro EPUB.`);
          }
        }
      }
    });
  }

  /**
   * Procesa la subida de un archivo EPUB.
   */
  async handleFileUpload(file) {
    Toast.info(`Procesando "${file.name}"...`);
    try {
      const newBook = await this.bookManager.importEpub(file);
      Toast.success(`¡"${newBook.title}" añadido con éxito a la biblioteca!`);
      this.selectCurrentBook(newBook);
    } catch (err) {
      console.error('Error al importar EPUB:', err);
      Toast.error(err.message || 'Error al procesar el archivo EPUB.');
    }
  }

  /**
   * Registra el libro activo como lectura en curso.
   */
  selectCurrentBook(book) {
    appState.set('currentReadingId', book.id);
  }

  getStatusLabel(status) {
    switch (status) {
      case 'reading': return 'En lectura';
      case 'completed': return 'Completado';
      case 'to_read': return 'Por leer';
      default: return '';
    }
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }

  escapeAttr(text) {
    return escapeAttr(text);
  }
}
