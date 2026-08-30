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
import { Toast } from '../ui/Toast.js';
import { AnnotationManager } from './AnnotationManager.js';
import { Modal } from '../ui/Modal.js';

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
        kind: a.type || 'highlight', // 'highlight' | 'underline'
        bookId: a.bookId,
        cfi: a.cfiRange,
        text: a.text,
        noteContent: null,
        color: a.color || 'yellow',
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
        color: n.color || 'purple',
        chapter: n.title,
        date: n.createdAt
      });
    });

    // Ordenar por fecha descendente
    items.sort((a, b) => (b.date || 0) - (a.date || 0));

    // Conteo por categorías antes del filtro
    const totalCount = items.length;
    const highlightCount = items.filter(i => i.kind === 'highlight').length;
    const underlineCount = items.filter(i => i.kind === 'underline').length;
    const noteCount = items.filter(i => i.kind === 'note').length;

    // Filtrar por libro, tipo y búsqueda
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
      <!-- Panel de Encabezado Superior (Igual al Cuaderno de Vocabulario) -->
      <div class="annotations-header-panel" style="width: 100%; margin-bottom: 24px; padding: 24px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary)); border: 1px solid var(--color-border); border-left: 5px solid var(--color-primary-light);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
          <div>
            <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: var(--color-primary-light); letter-spacing: 0.05em;">Cuaderno de Lectura</span>
            <h1 style="font-size: var(--text-xl); font-weight: bold; color: var(--color-text); margin: 4px 0;">Notas y Subrayados</h1>
            <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 0;">Citas destacadas, pasajes subrayados y anotaciones personales recopiladas durante tus lecturas.</p>
          </div>

          <!-- Filtro por Libro -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <select id="select-filter-book" style="
              padding: 7px 14px;
              border-radius: var(--radius-sm);
              background-color: var(--color-surface);
              border: 1px solid var(--color-border);
              color: var(--color-text);
              font-size: var(--text-xs);
              font-weight: 500;
              outline: none;
              cursor: pointer;
            ">
              <option value="all">Todos los libros</option>
              ${this.books.map(b => `<option value="${b.id}" ${b.id === this.selectedBookId ? 'selected' : ''}>${this.escapeHtml(b.title)}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <!-- Filtros de Pestaña Horizontales -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="annot-tab-btn ${this.activeType === 'all' ? 'active' : ''}" data-type-filter="all" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeType === 'all' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeType === 'all' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Todos (${totalCount})</button>

            <button class="annot-tab-btn ${this.activeType === 'highlight' ? 'active' : ''}" data-type-filter="highlight" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeType === 'highlight' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeType === 'highlight' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Resaltados (${highlightCount})</button>

            <button class="annot-tab-btn ${this.activeType === 'underline' ? 'active' : ''}" data-type-filter="underline" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeType === 'underline' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeType === 'underline' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Subrayados (${underlineCount})</button>

            <button class="annot-tab-btn ${this.activeType === 'note' ? 'active' : ''}" data-type-filter="note" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeType === 'note' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeType === 'note' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Notas (${noteCount})</button>
          </div>

          <!-- Buscador de Notas y Citas -->
          <div style="position: relative; width: 220px;">
            <input type="text" id="input-annot-search" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en notas y citas..." style="
              width: 100%; padding: 6px 12px 6px 30px; border-radius: var(--radius-sm); background-color: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-size: var(--text-xs); outline: none; box-sizing: border-box;
            ">
            <svg style="position: absolute; left: 9px; top: 7px; width: 14px; height: 14px; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas de Anotaciones -->
      <div class="annotations-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; width: 100%;">
        ${filtered.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-muted);">
            <svg style="width: 48px; height: 48px; margin: 0 auto 16px; opacity: 0.4;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <h3 style="font-size: var(--text-md); color: var(--color-text); margin-bottom: 8px;">No hay notas ni subrayados</h3>
            <p style="font-size: var(--text-sm);">Selecciona texto mientras lees en el visor para resaltar pasajes o añadir notas personales.</p>
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
    const colorConf = AnnotationManager.COLORS[item.color] || AnnotationManager.COLORS.yellow;

    return `
      <article class="annotation-card" data-item-id="${item.id}" data-kind="${item.kind}" data-book-id="${item.bookId}" data-cfi="${item.cfi || ''}" style="
        background-color: var(--color-surface);
        border: 1px solid var(--color-border);
        border-left: 4px solid ${colorConf.border};
        border-radius: var(--radius-md);
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        transition: transform var(--transition-fast), box-shadow var(--transition-fast);
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="
              font-size: 0.68rem;
              text-transform: uppercase;
              font-weight: bold;
              padding: 2px 8px;
              border-radius: var(--radius-full, 999px);
              background-color: ${item.kind === 'note' ? 'rgba(123, 107, 240, 0.15)' : 'var(--color-surface-hover)'};
              color: ${item.kind === 'note' ? 'var(--color-primary-light)' : colorConf.border};
              border: 1px solid ${item.kind === 'note' ? 'rgba(123, 107, 240, 0.3)' : colorConf.border};
            ">${this.getKindLabel(item.kind)}</span>
            <span style="font-size: var(--text-xs); color: var(--color-text-muted); font-weight: 500;">${dateStr}</span>
          </div>

          <button class="btn-delete-annot" data-action="delete" data-id="${item.id}" data-kind="${item.kind}" title="Eliminar" style="
            color: var(--color-text-muted); padding: 4px; border-radius: 4px; cursor: pointer; background: transparent; border: none;
          ">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

        ${item.text ? `
          <blockquote style="
            font-family: var(--font-serif, Georgia, serif);
            font-size: var(--text-sm);
            color: var(--color-text);
            line-height: 1.5;
            font-style: italic;
            background-color: var(--color-surface-hover);
            padding: 10px 14px;
            border-radius: var(--radius-sm);
            margin: 0;
            border-left: 3px solid ${colorConf.border};
          ">«${this.escapeHtml(item.text)}»</blockquote>
        ` : ''}

        ${item.noteContent ? `
          <div style="
            font-size: var(--text-xs);
            color: var(--color-text);
            line-height: 1.4;
            padding: 8px 10px;
            background-color: var(--color-surface-secondary);
            border-radius: var(--radius-sm);
            border: 1px dashed var(--color-border);
          ">
            <strong style="color: var(--color-primary-light); display: block; margin-bottom: 2px;">Nota:</strong>
            ${this.escapeHtml(item.noteContent)}
          </div>
        ` : ''}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 10px; margin-top: auto; gap: 8px; flex-wrap: wrap;">
          <div style="display: flex; flex-direction: column; min-width: 0;">
            <span style="font-size: var(--text-xs); font-weight: bold; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(bookTitle)}</span>
            <span style="font-size: 0.7rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.chapter || '')}</span>
          </div>

          ${item.cfi ? `
            <button class="btn-jump-cfi" data-action="jump" data-book-id="${item.bookId}" data-cfi="${item.cfi}" style="
              background-color: var(--color-surface-hover);
              color: var(--color-primary-light);
              font-size: var(--text-xs);
              font-weight: bold;
              padding: 6px 12px;
              border-radius: var(--radius-full, 999px);
              border: 1px solid var(--color-border);
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              margin-left: auto;
              transition: all 0.15s ease;
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
