/**
 * ============================================================================
 * LIBRARY VIEW - VISTA DE BIBLIOTECA CONECTADA A INDEXEDDB
 * ============================================================================
 * Maneja renderizado de libros, Drag & Drop de EPUBs, edición de metadatos,
 * eliminación persistente, favoritos y conmutación Grid/Lista.
 */

import { appState } from '../state.js';
import { dbManager } from '../db.js';
import { CollectionManager } from './CollectionManager.js';
import { CollectionModal } from '../ui/CollectionModal.js';
import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';

export class LibraryView {
  constructor(containerElement, bookManager, onOpenBook = null, annotationsView = null, vocabularyView = null) {
    this.container = containerElement;
    this.bookManager = bookManager;
    this.onOpenBook = onOpenBook;
    this.annotationsView = annotationsView;
    this.vocabularyView = vocabularyView;
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
   * Actualiza los contadores de badges numéricos en el sidebar y móvil.
   */
  async updateBadges() {
    const books = this.bookManager.getAllBooks();
    const totalCount = books.length;
    const toReadCount = books.filter(b => b.status === 'to_read').length;
    const readingCount = books.filter(b => b.status === 'reading').length;
    const completedCount = books.filter(b => b.status === 'completed').length;
    const favCount = books.filter(b => b.favorite).length;

    const elTotal = document.getElementById('badge-library-total');
    const elToRead = document.getElementById('badge-to-read');
    const elReading = document.getElementById('badge-reading');
    const elCompleted = document.getElementById('badge-completed');
    const elFav = document.getElementById('badge-favorites');
    const elMobileBadge = document.querySelector('.mobile-nav-badge');
    const elAnnotations = document.getElementById('badge-annotations');

    if (elTotal) elTotal.textContent = totalCount;
    if (elToRead) elToRead.textContent = toReadCount;
    if (elReading) elReading.textContent = readingCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elFav) elFav.textContent = favCount;
    if (elMobileBadge) elMobileBadge.textContent = totalCount;

    if (elAnnotations) {
      try {
        const annotsCount = await dbManager.count('annotations');
        const notesCount = await dbManager.count('notes');
        elAnnotations.textContent = annotsCount + notesCount;
      } catch (e) {
        elAnnotations.textContent = '0';
      }
    }

    const elVocab = document.getElementById('badge-vocabulary');
    if (elVocab) {
      try {
        const wordsCount = await dbManager.count('words');
        elVocab.textContent = wordsCount;
      } catch (e) {
        elVocab.textContent = '0';
      }
    }

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
    const counts = await CollectionManager.getCollectionCounts();
    const activeFilter = appState.get('activeFilter') || 'all';

    listEl.innerHTML = collections.map(col => {
      const isColActive = activeFilter === `collection:${col.id}`;
      const count = counts[col.id] || 0;
      const colColor = col.color || '#5B4CC4';
      return `
        <div class="collection-nav-item ${isColActive ? 'active' : ''}" style="--col-accent: ${colColor};" data-col-item-id="${col.id}">
          <button type="button" class="collection-nav-link" data-nav-filter="collection:${col.id}" aria-label="Abrir colección ${this.escapeAttr(col.name)}">
            <span class="collection-badge-icon" aria-hidden="true">
              <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </span>
            <span class="collection-nav-name">${this.escapeHtml(col.name)}</span>
          </button>
          <div class="collection-nav-right">
            <span class="collection-count-badge">${count}</span>
            <button class="btn-col-options" data-col-id="${col.id}" title="Opciones de colección" aria-label="Opciones de colección ${this.escapeAttr(col.name)}">
              <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
              </svg>
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
      if (this.annotationsView) {
        this.annotationsView.loadAndRender();
      }
      return;
    }

    // Si el filtro activo es "Vocabulario", ocultar el encabezado de biblioteca y delegar a VocabularyView
    if (filter === 'vocabulary') {
      if (libraryHeader) libraryHeader.style.display = 'none';
      if (this.vocabularyView) {
        this.vocabularyView.loadAndRender();
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
            <div class="collection-header-top">
              <div>
                <span class="panel-category-tag" style="color: ${this.escapeAttr(colColor)};">✦ Colección</span>
                <h1 class="panel-heading" style="margin: 2px 0 4px 0;">${this.escapeHtml(col.name)}</h1>
                <p class="panel-description">${col.description ? this.escapeHtml(col.description) : 'Libros asignados a esta colección personal.'}</p>
              </div>
              <div class="panel-actions-row">
                <span class="collection-count-pill">${books.length} ${books.length === 1 ? 'libro' : 'libros'}</span>
                <button type="button" id="btn-edit-active-col" class="btn-col-header-action" title="Editar colección">
                  <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  <span>Editar</span>
                </button>
                <button type="button" id="btn-delete-active-col" class="btn-col-header-action btn-col-header-action--danger" title="Eliminar colección">
                  <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>

            <div class="panel-search-bar">
              <svg style="width: 14px; height: 14px; color: var(--color-text-muted); flex-shrink: 0; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
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
            <svg style="width: 36px; height: 36px; color: var(--color-primary-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h3 class="empty-state-title">${emptyTitle}</h3>
          <p class="empty-state-desc">
            ${emptyDesc}
          </p>
          ${showUploadBtn ? `
            <button id="btn-empty-upload" class="arcadia-modal-btn arcadia-modal-btn--primary">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              <span>Subir libro (EPUB)</span>
            </button>
          ` : ''}
          ${showResetBtn ? `
            <button id="btn-empty-reset" class="arcadia-modal-btn arcadia-modal-btn--ghost">
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
            <svg style="width: 16px; height: 16px;" fill="${book.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <!-- Botón Menú de Opciones -->
          <button class="btn-book-fav" style="top: 8px; left: 8px; right: auto;" data-action="book-options" data-id="${book.id}" aria-label="Opciones del libro">
            <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>


        </div>

        <div class="book-meta">
          <h4 class="book-title" title="${this.escapeHtml(book.title)}">${this.escapeHtml(book.title)}</h4>
          ${book.saga ? `<span class="book-saga">${this.escapeHtml(book.saga)}</span>` : ''}
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
      const helper = pct === 0 ? 'Aún no has empezado' : this.getStatusLabel(book.status);
      return `
      <div class="book-list-item" data-book-id="${book.id}">
        <div class="list-cover-wrapper">
          <div class="book-spine-3d" aria-hidden="true"></div>
          ${book.coverDataUrl ? `
            <img src="${book.coverDataUrl}" alt="${this.escapeHtml(book.title)}" class="list-cover-thumb">
          ` : `
            <div class="list-cover-thumb list-cover-placeholder" style="background: ${book.coverGradient || 'var(--banner-gradient)'};">
              <img src="assets/icons/logo-transparent.png" alt="" style="width: 40px; height: auto; opacity: 0.92; filter: drop-shadow(0 1px 4px rgba(0,0,0,0.5));">
            </div>
          `}
        </div>
        <div class="list-main">
          <div class="list-info">
            ${book.saga ? `<span class="list-saga">${this.escapeHtml(book.saga)}</span>` : ''}
            <h4 class="list-title">${this.escapeHtml(book.title)}</h4>
            <span class="list-author">${this.escapeHtml(book.author)}</span>
            <div class="list-status-row">
              <span class="list-status-badge ${book.status}">${book.status==='reading'?`<svg style="width:11px;height:11px;flex-shrink:0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>`:''}${this.getStatusLabel(book.status)}</span>
              <span class="list-status-helper">${helper}</span>
            </div>
          </div>
          <div class="list-progress-area">
            <div class="list-progress-bar">
              <div class="list-progress-fill" style="width: ${pct}%;"></div>
            </div>
            <span class="list-progress-text">${pct}%</span>
          </div>
        </div>
        <div class="list-item-actions-row">
          <button class="btn-list-action ${book.favorite ? 'is-fav' : ''}" data-action="toggle-fav" data-id="${book.id}" aria-label="Favorito" title="Favorito">
            <svg style="width: 18px; height: 18px;" fill="${book.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button class="btn-list-action" data-action="book-options" data-id="${book.id}" aria-label="Menú de opciones" title="Menú de opciones">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
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
      <button class="menu-action-btn menu-action-btn--primary" data-opt="read">
        <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <span>Leer libro</span>
      </button>
      <button class="menu-action-btn" data-opt="edit">
        <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        <span>Editar detalles</span>
      </button>
      <button class="menu-action-btn" data-opt="collections">
        <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>Colecciones...</span>
      </button>
      <button class="menu-action-btn" data-opt="download">
        <svg style="width: 15px; height: 15px; color: var(--color-primary-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>Descargar EPUB</span>
      </button>
      <button class="menu-action-btn menu-action-btn--danger" data-opt="delete">
        <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        <span>Eliminar libro</span>
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
        author: updated.author || book.author
      });
      Toast.success('Detalles del libro actualizados.');
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
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  escapeAttr(text) {
    return this.escapeHtml(text);
  }
}
