/**
 * ============================================================================
 * ANNOTATIONS VIEW - VISTA GENERAL DE NOTAS Y SUBRAYADOS
 * ============================================================================
 * Presenta el catálogo centralizado de citas, resaltados y notas del usuario
 * con filtros por libro, tipo, búsqueda en vivo y salto directo a la lectura.
 * Diseñado con el mismo lenguaje visual que el Cuaderno de Vocabulario.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';
import { escapeHtml } from '../utils.js';
import { Toast } from '../ui/Toast.js';
import { AnnotationManager, annotationManager } from './AnnotationManager.js';
import { Modal } from '../ui/Modal.js';
import { CustomSelect } from '../ui/CustomSelect.js';
import { Icons } from '../ui/Icons.js';

export class AnnotationsView {
  constructor(containerElement, onOpenBookCfi) {
    this.container = containerElement;
    this.onOpenBookCfi = onOpenBookCfi;
    this.annotations = [];
    this.notes = [];
    this.books = [];
    this.activeType = 'all'; // 'all', 'highlight', 'underline', 'note'
    this.selectedBookId = 'all';
    this.searchQuery = '';

    this.initEvents();
  }

  initEvents() {
    appState.subscribe('annotationAdded', () => this.refresh());
    appState.subscribe('annotationRemoved', () => this.refresh());
    appState.subscribe('noteAdded', () => this.refresh());
    appState.subscribe('noteDeleted', () => this.refresh());
    appState.subscribe('noteUpdated', () => this.refresh());
  }

  /**
   * Carga los datos desde IndexedDB y renderiza la vista.
   */
  async loadAndRender() {
    this.annotations = await dbManager.getAll('annotations');
    this.notes = await dbManager.getAll('notes');
    this.books = await dbManager.getAll('books');

    this.render();
  }

  async refresh() {
    if (appState.get('activeFilter') === 'annotations') {
      await this.loadAndRender();
    }
  }

  /**
   * Renderizado de la estructura y el listado de citas/notas.
   */
  render() {
    if (!this.container) return;

    // Combinar y normalizar anotaciones y notas
    const items = [];

    this.annotations.forEach(a => {
      // Las marcas negras de nota no se listan aparte: ya están representadas
      // por su tarjeta de nota (evita duplicados en el cuaderno).
      if (a.type === 'note-underline') return;
      items.push({
        id: a.id,
        kind: a.type || 'highlight', // 'highlight' | 'underline'
        bookId: a.bookId,
        cfi: a.cfiRange,
        text: a.text,
        noteContent: null,
        color: a.color || 'amber',
        chapter: a.chapterTitle,
        date: a.createdAt
      });
    });

    this.notes.forEach(n => {
      items.push({
        id: n.id,
        kind: 'note',
        bookId: n.bookId,
        cfi: n.cfiRange,
        text: n.selectedText,
        noteContent: n.content,
        color: n.color || 'lavender',
        chapter: n.title,
        date: n.createdAt
      });
    });

    // Ordenar por fecha descendente
    items.sort((a, b) => (b.date || 0) - (a.date || 0));

    // Conteo por categorías antes del filtro (tachado y ondulado cuentan como subrayados)
    const totalCount = items.length;
    const highlightCount = items.filter(i => i.kind === 'highlight').length;
    const underlineCount = items.filter(i => AnnotationManager.isUnderlineFamily(i.kind)).length;
    const noteCount = items.filter(i => i.kind === 'note').length;

    // Filtrar por libro, tipo y búsqueda
    let filtered = items.filter(item => {
      // Filtro de tipo
      if (this.activeType !== 'all') {
        if (this.activeType === 'note' && item.kind !== 'note') return false;
        if (this.activeType === 'highlight' && item.kind !== 'highlight') return false;
        if (this.activeType === 'underline' && !AnnotationManager.isUnderlineFamily(item.kind)) return false;
      }

      // Filtro de libro
      if (this.selectedBookId !== 'all' && item.bookId !== this.selectedBookId) {
        return false;
      }

      // Filtro de texto
      if (this.searchQuery) {
        const q = this.searchQuery.toLowerCase();
        const matchesText = (item.text || '').toLowerCase().includes(q);
        const matchesNote = (item.noteContent || '').toLowerCase().includes(q);
        if (!matchesText && !matchesNote) return false;
      }

      return true;
    });

    this.container.className = 'annotations-feed-view';
    this.container.innerHTML = `
      <!-- Panel de Encabezado Superior -->
      <div class="annotations-header-panel">
        <div class="header-card-top">
          <div class="header-card-brand-group">
            <div class="header-card-icon-box header-card-icon-box--notes">
              <svg class="icon-lg" aria-hidden="true"><use href="./assets/icons/icons.svg#pencil"></use></svg>
            </div>
            <div class="header-card-text">
              <span class="panel-category-tag">CUADERNO DE LECTURA</span>
              <h1 class="panel-heading">Notas y Subrayados</h1>
              <p class="panel-description">Citas destacadas, pasajes subrayados y anotaciones personales recopiladas durante tus lecturas.</p>
            </div>
          </div>

          <!-- Filtros junto al título -->
          <div class="panel-actions-row">
            <select id="select-filter-book" class="header-card-select">
              <option value="all">Todos los libros</option>
              ${this.books.map(b => `<option value="${b.id}" ${b.id === this.selectedBookId ? 'selected' : ''}>${this.escapeHtml(b.title)}</option>`).join('')}
            </select>

            <!-- Filtro de Tipo por Select -->
            <select id="select-filter-type" class="header-card-select">
              <option value="all" ${this.activeType === 'all' ? 'selected' : ''}>Todos (${totalCount})</option>
              <option value="highlight" ${this.activeType === 'highlight' ? 'selected' : ''}>Resaltados (${highlightCount})</option>
              <option value="underline" ${this.activeType === 'underline' ? 'selected' : ''}>Subrayados (${underlineCount})</option>
              <option value="note" ${this.activeType === 'note' ? 'selected' : ''}>Notas (${noteCount})</option>
            </select>
          </div>
        </div>

        <!-- Buscador de Notas y Citas -->
        <div class="panel-search-bar">
          <svg class="icon-sm text-muted flex-shrink-0 pointer-events-none" aria-hidden="true"><use href="./assets/icons/icons.svg#search"></use></svg>
          <input type="text" id="input-annot-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en notas y citas...">
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas de Anotaciones -->
      <div class="annotations-cards-grid">
        ${filtered.length === 0 ? `
          <div class="library-empty-state">
            <div class="empty-state-icon">
              <svg class="icon-xl color-primary-light" aria-hidden="true"><use href="./assets/icons/icons.svg#pencil"></use></svg>
            </div>
            <h3 class="empty-state-title">${this.searchQuery ? 'Sin resultados' : 'Aún no hay notas'}</h3>
            <p class="empty-state-desc">
              ${this.searchQuery ? `No se encontraron notas ni subrayados que coincidan con «<strong>${this.escapeHtml(this.searchQuery)}</strong>». Prueba con otro término de búsqueda.` : 'Selecciona texto mientras lees en cualquier libro para resaltar pasajes o añadir notas personales. Tus citas aparecerán aquí.'}
            </p>
            ${this.searchQuery ? `<button id="btn-annot-clear-search" class="btn btn--ghost"><span>Limpiar búsqueda</span></button>` : `<button id="btn-annot-go-library" class="btn btn--ghost"><span>Ver toda la biblioteca</span></button>`}
          </div>
        ` : filtered.map(item => this.renderCard(item)).join('')}
      </div>
    `;

    this.attachEvents();
  }

  renderCard(item) {
    const book = this.books.find(b => b.id === item.bookId);
    const bookTitle = book ? book.title : 'Libro general';
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const kindClass = item.kind === 'note'
      ? 'annot--note'
      : (item.kind === 'highlight' ? 'annot--highlight' : 'annot--underline');

    return `
      <article class="annotation-card ${kindClass}" data-item-id="${item.id}" data-kind="${item.kind}" data-book-id="${item.bookId}" data-cfi="${item.cfi || ''}">
        <div class="annotation-card-header">
          <div class="annotation-tag-group">
            <span class="annotation-type-badge">
              ${this.badgeIcon(item.kind)}
              <span>${this.getKindLabel(item.kind)}</span>
            </span>
            <span class="annot-sep" aria-hidden="true">|</span>
            <span class="annotation-date">
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#calendar"></use></svg>
              <span>${dateStr}</span>
            </span>
          </div>

          <button class="btn-delete-annot btn btn--icon btn--danger btn-card-action" data-action="delete" data-id="${item.id}" data-kind="${item.kind}" title="Eliminar cita/nota" aria-label="Eliminar">
            ${Icons.TRASH}
          </button>
        </div>

        ${item.text ? `
          <blockquote class="annotation-quote">«${this.escapeHtml(item.text)}»</blockquote>
        ` : ''}

        ${item.noteContent ? `
          <div class="annotation-user-note">
            <div class="annotation-user-note-label">
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#message-square"></use></svg>
              <span>Anotación personal</span>
            </div>
            <p class="annotation-user-note-text">${this.escapeHtml(item.noteContent)}</p>
          </div>
        ` : ''}

        <div class="annotation-card-footer">
          <div class="annot-book">
            <span class="annot-book-row">
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
              <strong class="annot-book-title">${this.escapeHtml(bookTitle)}</strong>
            </span>
          </div>

          ${item.cfi ? `
            <button type="button" class="btn-jump-cfi btn btn--sm" data-action="jump" data-book-id="${item.bookId}" data-cfi="${item.cfi}">
              <span>Ir al pasaje</span>
              ${Icons.ARROW_RIGHT}
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  badgeIcon(kind) {
    if (kind === 'note') {
      return `<svg aria-hidden="true"><use href="./assets/icons/icons.svg#pencil"></use></svg>`;
    }
    if (kind === 'highlight') {
      return `<svg aria-hidden="true"><use href="./assets/icons/icons.svg#file-text"></use></svg>`;
    }
    return `<svg aria-hidden="true"><use href="./assets/icons/icons.svg#underline"></use></svg>`;
  }

  attachEvents() {
    // 1. Selector de tipo
    const selectType = this.container.querySelector('#select-filter-type');
    if (selectType) {
      selectType.addEventListener('change', (e) => {
        this.activeType = e.target.value;
        this.render();
      });
      CustomSelect.enhance(selectType);
    }

    // 2. Selector de libro
    const selectBook = this.container.querySelector('#select-filter-book');
    if (selectBook) {
      selectBook.addEventListener('change', (e) => {
        this.selectedBookId = e.target.value;
        this.render();
      });
      CustomSelect.enhance(selectBook);
    }

    // 3. Buscador en vivo
    const searchInput = this.container.querySelector('#input-annot-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const newSearchInput = this.container.querySelector('#input-annot-search');
        if (newSearchInput) {
          newSearchInput.focus();
          newSearchInput.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
        }
      });
    }

    // 3b. Botones del estado vacío (mismo diseño que Colecciones)
    const btnClearAnnot = this.container.querySelector('#btn-annot-clear-search');
    if (btnClearAnnot) {
      btnClearAnnot.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
        const newInput = this.container.querySelector('#input-annot-search');
        if (newInput) newInput.focus();
      });
    }
    const btnGoLibrary = this.container.querySelector('#btn-annot-go-library');
    if (btnGoLibrary) {
      btnGoLibrary.addEventListener('click', () => {
        this.searchQuery = '';
        appState.set('activeFilter', 'all');
        document.querySelectorAll('[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === 'all');
        });
        document.querySelectorAll('.mobile-nav-link[data-nav-filter]').forEach(el => {
          el.classList.toggle('active', el.dataset.navFilter === 'all');
        });
      });
    }

    // 4. Salto directo al lector
    this.container.querySelectorAll('[data-action="jump"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookId = btn.dataset.bookId;
        const cfi = btn.dataset.cfi;
        if (this.onOpenBookCfi) {
          this.onOpenBookCfi(bookId, cfi);
        }
      });
    });

    // 5. Eliminar
    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const kind = btn.dataset.kind;
        const confirmed = await Modal.confirm({
          title: 'Eliminar elemento',
          message: `¿Estás seguro de que deseas eliminar este ${kind === 'note' ? 'comentario' : 'subrayado'}?`,
          danger: true,
          confirmText: 'Eliminar'
        });

        if (confirmed) {
          try {
            if (kind === 'note') {
              // La nota vive junto a su subrayado negro fino sobre el mismo
              // pasaje: borrar ambos para no dejar la línea fantasma.
              const card = btn.closest('[data-book-id]');
              const noteBookId = card?.dataset.bookId || null;
              const noteCfi = card?.dataset.cfi || null;
              if (noteBookId && noteCfi) {
                const linked = this.annotations.filter(a =>
                  a.bookId === noteBookId && (a.cfiRange === noteCfi || a.noteId === id));
                for (const h of linked) {
                  try { await annotationManager.removeAnnotation(h.id); } catch (_) {}
                }
                // Si el manager no tiene el libro abierto, borrar directo en DB
                if (linked.length === 0) {
                  try {
                    const allMarks = await dbManager.getAll('annotations').catch(() => []);
                    const orphans = (allMarks || []).filter(a =>
                      a.type === 'note-underline' && (a.noteId === id || (a.bookId === noteBookId && a.cfiRange === noteCfi)));
                    for (const o of orphans) {
                      try { await dbManager.delete('annotations', o.id); } catch (_) {}
                    }
                  } catch (_) {}
                }
              }
              await dbManager.delete('notes', id);
              appState.notify('noteDeleted', id);
            } else {
              // Vía el manager: borra de DB y desancla el overlay en vivo
              // (sin esto el subrayado seguía visible hasta recargar)
              await annotationManager.removeAnnotation(id);
            }
            Toast.success('Elemento eliminado.');
          } catch (err) {
            console.warn('Error al eliminar anotación:', err);
            Toast.error('No se pudo eliminar el elemento.');
          }
          this.loadAndRender();
        }
      });
    });
  }

  getKindLabel(kind) {
    switch (kind) {
      case 'highlight': return 'Resaltado';
      case 'underline': return 'Subrayado';
      case 'strikethrough': return 'Tachado';
      case 'wavy': return 'Subrayado punteado';
      case 'note': return 'Nota';
      default: return 'Anotación';
    }
  }

  escapeHtml(text) {
    return escapeHtml(text);
  }
}
