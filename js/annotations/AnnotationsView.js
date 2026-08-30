/**
 * ============================================================================
 * ANNOTATIONS VIEW - VISTA GENERAL DE NOTAS Y SUBRAYADOS
 * ============================================================================
 * Presenta el catálogo centralizado de citas, resaltados y notas del usuario
 * con filtros por libro, tipo, búsqueda en vivo y salto directo a la lectura.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';
import { Toast } from '../ui/Toast.js';
import { AnnotationManager } from './AnnotationManager.js';

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
      items.push({
        id: a.id,
        kind: a.type, // 'highlight' | 'underline'
        bookId: a.bookId,
        cfi: a.cfiRange,
        text: a.text,
        noteContent: null,
        color: a.color,
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
        color: n.color,
        chapter: n.title,
        date: n.createdAt
      });
    });

    // Ordenar por fecha descendente
    items.sort((a, b) => (b.date || 0) - (a.date || 0));

    // Filtrar
    let filtered = items.filter(item => {
      // Filtro de tipo
      if (this.activeType !== 'all') {
        if (this.activeType === 'note' && item.kind !== 'note') return false;
        if (this.activeType === 'highlight' && item.kind !== 'highlight') return false;
        if (this.activeType === 'underline' && item.kind !== 'underline') return false;
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
      <div class="annotations-toolbar" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="font-size: var(--text-xl); font-weight: var(--weight-bold); color: var(--color-text);">Notas y Subrayados</h2>
            <span style="font-size: var(--text-xs); color: var(--color-text-muted);">${filtered.length} elementos encontrados</span>
          </div>

          <!-- Filtro por Libro -->
          <div class="sort-select-wrapper" style="min-width: 200px;">
            <select id="select-filter-book" class="sort-select" style="width: 100%;">
              <option value="all">Todos los libros</option>
              ${this.books.map(b => `<option value="${b.id}" ${b.id === this.selectedBookId ? 'selected' : ''}>${this.escapeHtml(b.title)}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Píldoras de Filtro por Tipo -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="setting-pill-btn ${this.activeType === 'all' ? 'active' : ''}" data-type-filter="all">Todos</button>
          <button class="setting-pill-btn ${this.activeType === 'highlight' ? 'active' : ''}" data-type-filter="highlight">Resaltados</button>
          <button class="setting-pill-btn ${this.activeType === 'underline' ? 'active' : ''}" data-type-filter="underline">Subrayados</button>
          <button class="setting-pill-btn ${this.activeType === 'note' ? 'active' : ''}" data-type-filter="note">Notas</button>
        </div>
      </div>

      <div class="annotations-list" style="display: flex; flex-direction: column; gap: 16px;">
        ${filtered.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; color: var(--color-text-muted);">
            <svg style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.5;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <h3 style="font-size: var(--text-md); color: var(--color-text); margin-bottom: 8px;">No hay notas ni subrayados</h3>
            <p style="font-size: var(--text-sm);">Selecciona texto mientras lees en el visor para resaltar pasajes o añadir notas.</p>
          </div>
        ` : filtered.map(item => this.renderCard(item)).join('')}
      </div>
    `;

    this.attachEvents();
  }

  renderCard(item) {
    const book = this.books.find(b => b.id === item.bookId);
    const bookTitle = book ? book.title : 'Libro desconocido';
    const dateStr = item.date ? new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const colorConf = AnnotationManager.COLORS[item.color] || AnnotationManager.COLORS.yellow;

    return `
      <article class="annotation-card" data-item-id="${item.id}" data-kind="${item.kind}" data-book-id="${item.bookId}" data-cfi="${item.cfi || ''}" style="
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-left: 4px solid ${colorConf.border};
        border-radius: var(--radius-md);
        padding: var(--space-md);
        display: flex;
        flex-direction: column;
        gap: 12px;
        transition: transform var(--transition-fast), border-color var(--transition-fast);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="
              font-size: 0.7rem;
              text-transform: uppercase;
              font-weight: bold;
              padding: 2px 8px;
              border-radius: var(--radius-full);
              background-color: ${item.kind === 'note' ? 'var(--color-primary-dark)' : 'var(--color-surface-secondary)'};
              color: ${colorConf.border};
            ">${this.getKindLabel(item.kind)}</span>
            <span style="font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 500;">${dateStr}</span>
          </div>

          <button class="btn-delete-annot" data-action="delete" data-id="${item.id}" data-kind="${item.kind}" title="Eliminar" style="color: var(--color-text-muted); padding: 4px; border-radius: 4px; cursor: pointer;">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

        ${item.text ? `
          <blockquote style="
            font-family: var(--font-serif);
            font-size: var(--text-sm);
            color: var(--color-text);
            line-height: 1.5;
            font-style: italic;
            background-color: var(--color-surface-hover);
            padding: 8px 12px;
            border-radius: var(--radius-sm);
          ">«${this.escapeHtml(item.text)}»</blockquote>
        ` : ''}

        ${item.noteContent ? `
          <div style="font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.4; padding-left: 2px;">
            ${this.escapeHtml(item.noteContent)}
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border-subtle); padding-top: 10px; margin-top: 2px;">
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: var(--text-xs); font-weight: bold; color: var(--color-text);">${this.escapeHtml(bookTitle)}</span>
            <span style="font-size: 0.7rem; color: var(--color-text-muted);">${this.escapeHtml(item.chapter || '')}</span>
          </div>

          ${item.cfi ? `
            <button class="btn-jump-cfi" data-action="jump" data-book-id="${item.bookId}" data-cfi="${item.cfi}" style="
              background-color: var(--color-surface-secondary);
              color: var(--color-primary-light);
              font-size: var(--text-xs);
              font-weight: bold;
              padding: 6px 12px;
              border-radius: var(--radius-full);
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            ">
              <span>Ir al pasaje</span>
              <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  attachEvents() {
    // 1. Selector de tipo
    this.container.querySelectorAll('[data-type-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeType = btn.dataset.typeFilter;
        this.render();
      });
    });

    // 2. Selector de libro
    const selectBook = this.container.querySelector('#select-filter-book');
    if (selectBook) {
      selectBook.addEventListener('change', (e) => {
        this.selectedBookId = e.target.value;
        this.render();
      });
    }

    // 3. Salto directo al lector
    this.container.querySelectorAll('[data-action="jump"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const bookId = btn.dataset.bookId;
        const cfi = btn.dataset.cfi;
        if (this.onOpenBookCfi) {
          this.onOpenBookCfi(bookId, cfi);
        }
      });
    });

    // 4. Eliminar
    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const kind = btn.dataset.kind;
        if (confirm('¿Deseas eliminar este elemento?')) {
          if (kind === 'note') {
            await dbManager.delete('notes', id);
          } else {
            await dbManager.delete('annotations', id);
          }
          Toast.success('Elemento eliminado.');
          this.loadAndRender();
        }
      });
    });
  }

  getKindLabel(kind) {
    switch (kind) {
      case 'highlight': return 'Resaltado';
      case 'underline': return 'Subrayado';
      case 'note': return 'Nota';
      default: return 'Anotación';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
