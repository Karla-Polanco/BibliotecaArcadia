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

    // Suscripción a eventos de anotaciones para badges
    appState.subscribe('annotationAdded', () => this.updateBadges());
    appState.subscribe('annotationRemoved', () => this.updateBadges());
    appState.subscribe('noteAdded', () => this.updateBadges());
    appState.subscribe('noteDeleted', () => this.updateBadges());

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
    appState.subscribe('collectionDeleted', () => {
      if (appState.get('activeFilter')?.startsWith('collection:')) {
        appState.set('activeFilter', 'all');
      }
      this.updateBadges();
      this.applyFiltersAndRender();
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
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; border-radius: var(--radius-sm); padding-right: 4px;" class="nav-item ${isColActive ? 'active' : ''}">
          <a href="#col-${col.id}" class="nav-item-link" data-nav-filter="collection:${col.id}" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; padding: 6px 8px; text-decoration: none; color: inherit;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${col.color || '#5B4CC4'}; flex-shrink: 0;"></span>
            <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: var(--text-xs);">${this.escapeHtml(col.name)}</span>
          </a>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span class="nav-badge" style="font-size: 0.65rem; padding: 1px 5px;">${count}</span>
            <button class="btn-col-options" data-col-id="${col.id}" title="Opciones" style="color: var(--color-text-muted); cursor: pointer; padding: 2px; border-radius: 3px;">
              <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos de selección de colección
    listEl.querySelectorAll('[data-nav-filter]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const f = item.dataset.navFilter;
        document.querySelectorAll('[data-nav-filter]').forEach(el => el.closest('.nav-item')?.classList.remove('active'));
        item.closest('.nav-item')?.classList.add('active');
        appState.set('activeFilter', f);
      });
    });

    // Eventos de opciones de colección (Editar / Eliminar)
    listEl.querySelectorAll('.btn-col-options').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const colId = btn.dataset.colId;
        const col = collections.find(c => c.id === colId);
        if (!col) return;

        const action = confirm(`Colección: "${col.name}"\n\n¿Deseas editar esta colección?\n(Aceptar = Editar, Cancelar = Opciones de eliminación)`);
        if (action) {
          CollectionModal.openEditModal(col, () => this.updateBadges());
        } else {
          if (confirm(`¿Eliminar la colección "${col.name}"?\n(Los libros no se borrarán de la biblioteca)`)) {
            await CollectionManager.deleteCollection(col.id);
            Toast.success('Colección eliminada.');
            this.updateBadges();
          }
        }
      });
    });
  }

  /**
   * Aplica filtros de texto, categoría y ordenamiento.
   */
  async applyFiltersAndRender() {
    const filter = appState.get('activeFilter') || 'all';

    // Si el filtro activo es "Notas y subrayados", delegar a AnnotationsView
    if (filter === 'annotations') {
      if (this.annotationsView) {
        this.annotationsView.loadAndRender();
      }
      return;
    }

    // Si el filtro activo es "Vocabulario", delegar a VocabularyView
    if (filter === 'vocabulary') {
      if (this.vocabularyView) {
        this.vocabularyView.loadAndRender();
      }
      return;
    }

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

    const query = (appState.get('searchQuery') || '').trim().toLowerCase();
    const sortBy = appState.get('sortBy') || 'recent';

    // 1. Filtrar por categoría / colección
    let result = books.filter(book => {
      if (isCustomCollection) return true;
      if (filter === 'all') return true;
      if (filter === 'favorites') return book.favorite;
      return book.status === filter;
    });

    // 2. Filtrar por texto de búsqueda (título o autor)
    if (query) {
      result = result.filter(book =>
        (book.title || '').toLowerCase().includes(query) ||
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
    if (!this.activeCollectionData) return '';
    const col = this.activeCollectionData;
    return `
      <div class="collection-header-banner" style="grid-column: 1 / -1; width: 100%; margin-bottom: 20px; padding: 18px 24px; border-radius: var(--radius-md); background-color: var(--color-surface); border: 1px solid var(--color-border); border-left: 5px solid ${col.color || 'var(--color-primary-light)'}; display: flex; align-items: center; justify-content: space-between; gap: 16px;">
        <div>
          <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: ${col.color || 'var(--color-primary-light)'};">Colección personalizada</span>
          <h2 style="font-size: var(--text-lg); font-weight: bold; color: var(--color-text); margin: 4px 0;">${this.escapeHtml(col.name)}</h2>
          ${col.description ? `<p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 0;">${this.escapeHtml(col.description)}</p>` : ''}
        </div>
        <button id="btn-edit-active-col" style="padding: 8px 16px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: bold; background-color: var(--color-surface-hover); color: var(--color-text); cursor: pointer;">Editar colección</button>
      </div>
    `;
  }

  /**
   * Renderiza el catálogo según el modo (Grid vs Lista).
   */
  render() {
    if (!this.container) return;
    const viewMode = appState.get('viewMode') || 'grid';

    if (this.filteredBooks.length === 0) {
      this.container.innerHTML = `
        ${this.renderCollectionHeader()}
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-muted);">
          <svg style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 style="font-size: var(--text-md); color: var(--color-text); margin-bottom: 8px;">No se encontraron libros en esta vista</h3>
          <p style="font-size: var(--text-sm);">Puedes añadir libros usando el menú de opciones (···) de cada tarjeta.</p>
        </div>
      `;
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
    const cardsHtml = this.filteredBooks.map(book => `
      <article class="book-card" data-book-id="${book.id}">
        <div class="book-cover-container">
          ${book.coverDataUrl ? `
            <img src="${book.coverDataUrl}" alt="${this.escapeHtml(book.title)}" class="book-cover-img" loading="lazy">
          ` : `
            <div class="book-cover-placeholder" style="background: ${book.coverGradient || 'var(--banner-gradient)'};">
              <div class="placeholder-spine"></div>
              <svg class="placeholder-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div class="placeholder-title">${this.escapeHtml(book.title)}</div>
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

          ${book.progress > 0 ? `
            <div class="card-progress-bar">
              <div class="card-progress-fill" style="width: ${book.progress}%;"></div>
            </div>
          ` : ''}
        </div>

        <div class="book-meta">
          <h4 class="book-title" title="${this.escapeHtml(book.title)}">${this.escapeHtml(book.title)}</h4>
          <span class="book-author">${this.escapeHtml(book.author)}</span>
          <div class="book-badge-info">
            <span>${this.getStatusLabel(book.status)}</span>
            ${book.progress > 0 ? `<span>${book.progress}%</span>` : ''}
          </div>
        </div>
      </article>
    `).join('');

    this.container.innerHTML = headerHtml + cardsHtml;
  }

  /**
   * Renderizado en formato Lista (List).
   */
  renderList() {
    this.container.className = 'books-list';
    const headerHtml = this.renderCollectionHeader();
    const itemsHtml = this.filteredBooks.map(book => `
      <div class="book-list-item" data-book-id="${book.id}">
        <div class="list-item-left">
          ${book.coverDataUrl ? `
            <img src="${book.coverDataUrl}" alt="${this.escapeHtml(book.title)}" class="list-cover-thumb" style="object-fit: cover;">
          ` : `
            <div class="list-cover-thumb" style="background: ${book.coverGradient || 'var(--banner-gradient)'};">
              <svg style="width: 20px; height: 20px; opacity: 0.85;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          `}
          <div class="list-info">
            <h4 class="list-title">${this.escapeHtml(book.title)}</h4>
            <span class="list-author">${this.escapeHtml(book.author)}</span>
          </div>
        </div>

        <div class="list-item-right">
          <div class="list-progress-box">
            <div class="list-progress-bar">
              <div class="list-progress-fill" style="width: ${book.progress || 0}%;"></div>
            </div>
            <span class="list-progress-text">${book.progress || 0}%</span>
          </div>

          <span class="list-status-badge ${book.status}">${this.getStatusLabel(book.status)}</span>

          <button class="btn-book-fav ${book.favorite ? 'is-fav' : ''}" style="position: static; opacity: 1; transform: none;" data-action="toggle-fav" data-id="${book.id}">
            <svg style="width: 18px; height: 18px;" fill="${book.favorite ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>

          <button class="btn-book-fav" style="position: static; opacity: 1; transform: none;" data-action="book-options" data-id="${book.id}">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
        </div>
      </div>
    `).join('');

    this.container.innerHTML = headerHtml + itemsHtml;
  }

  /**
   * Vincula interactividad de clics, favoritos y opciones en tarjetas.
   */
  attachCardEvents() {
    // Botón de editar colección activa en el banner
    const btnEditCol = this.container.querySelector('#btn-edit-active-col');
    if (btnEditCol && this.activeCollectionData) {
      btnEditCol.addEventListener('click', () => {
        CollectionModal.openEditModal(this.activeCollectionData, () => this.updateBadges());
      });
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
    menu.style.cssText = `
      position: fixed;
      background-color: var(--color-surface-elevated, #242424);
      border: 1px solid var(--color-border, #303030);
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-card);
      padding: 6px;
      z-index: var(--z-floating-menu, 110);
      min-width: 160px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    const rect = triggerEl.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.min(window.innerWidth - 180, rect.left)}px`;

    menu.innerHTML = `
      <button class="menu-action-btn" data-opt="read" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 6px; font-size: var(--text-xs); color: var(--color-primary-light); cursor: pointer;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <span>Leer libro</span>
      </button>
      <button class="menu-action-btn" data-opt="edit" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 6px; font-size: var(--text-xs); color: var(--color-text); cursor: pointer;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
        <span>Editar detalles</span>
      </button>
      <button class="menu-action-btn" data-opt="collections" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 6px; font-size: var(--text-xs); color: var(--color-text); cursor: pointer;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
        <span>Colecciones...</span>
      </button>
      <button class="menu-action-btn" data-opt="delete" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; border-radius: 6px; font-size: var(--text-xs); color: #EF4444; cursor: pointer;">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
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

    menu.querySelector('[data-opt="delete"]').addEventListener('click', () => {
      menu.remove();
      this.confirmDeleteBook(book);
    });
  }

  /**
   * Diálogo para editar metadatos básicos (título y autor).
   */
  async promptEditBook(book) {
    const newTitle = prompt('Editar título del libro:', book.title);
    if (newTitle === null) return;

    const newAuthor = prompt('Editar autor:', book.author);
    if (newAuthor === null) return;

    try {
      await this.bookManager.updateBook(book.id, {
        title: newTitle.trim() || book.title,
        author: newAuthor.trim() || book.author
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
    const confirmed = confirm(`¿Estás seguro de que deseas eliminar "${book.title}" de tu biblioteca local?`);
    if (!confirmed) return;

    try {
      await this.bookManager.deleteBook(book.id);
      Toast.success(`"${book.title}" ha sido eliminado.`);
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
   * Actualiza el libro activo en la barra inferior de lectura actual.
   */
  selectCurrentBook(book) {
    appState.set('currentReadingId', book.id);
    const titleEl = document.getElementById('current-reading-title');
    const metaEl = document.getElementById('current-reading-meta');
    const thumbEl = document.getElementById('current-reading-thumb');

    if (titleEl) titleEl.textContent = book.title;
    if (metaEl) metaEl.textContent = `${book.author} · ${book.progress || 0}% leído`;
    if (thumbEl) {
      if (book.coverDataUrl) {
        thumbEl.innerHTML = `<img src="${book.coverDataUrl}" style="width: 100%; height: 100%; object-fit: cover; border-radius: inherit;">`;
      } else {
        thumbEl.innerHTML = `
          <svg style="width: 22px; height: 22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        `;
        thumbEl.style.background = book.coverGradient || 'var(--banner-gradient)';
      }
    }
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
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
