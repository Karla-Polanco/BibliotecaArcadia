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
import { CustomSelect } from '../ui/CustomSelect.js';

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
      <!-- Panel de Encabezado Superior -->
      <div class="annotations-header-panel">
        <div class="annotations-header-top">
          <div>
            <span class="panel-category-tag">Cuaderno de Lectura</span>
            <h1 class="panel-heading">Notas y Subrayados</h1>
            <p class="panel-description">Citas destacadas, pasajes subrayados y anotaciones personales recopiladas durante tus lecturas.</p>
          </div>

          <!-- Filtros junto al título -->
          <div class="panel-actions-row">
            <select id="select-filter-book">
              <option value="all">Todos los libros</option>
              ${this.books.map(b => `<option value="${b.id}" ${b.id === this.selectedBookId ? 'selected' : ''}>${this.escapeHtml(b.title)}</option>`).join('')}
            </select>

            <!-- Filtro de Tipo por Select -->
            <select id="select-filter-type">
              <option value="all" ${this.activeType === 'all' ? 'selected' : ''}>Todos (${totalCount})</option>
              <option value="highlight" ${this.activeType === 'highlight' ? 'selected' : ''}>Resaltados (${highlightCount})</option>
              <option value="underline" ${this.activeType === 'underline' ? 'selected' : ''}>Subrayados (${underlineCount})</option>
              <option value="note" ${this.activeType === 'note' ? 'selected' : ''}>Notas (${noteCount})</option>
            </select>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 12px;">
          <!-- Buscador de Notas y Citas -->
          <div class="panel-search-bar">
            <svg style="width: 14px; height: 14px; color: var(--color-text-muted); flex-shrink: 0; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" id="input-annot-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en notas y citas...">
          </div>
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas de Anotaciones -->
      <div class="annotations-cards-grid">
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
    const accentHex = colorConf.border || '#D4AF37';

    return `
      <article class="annotation-card" data-item-id="${item.id}" data-kind="${item.kind}" data-book-id="${item.bookId}" data-cfi="${item.cfi || ''}" style="--card-accent-color: ${accentHex};">
        <div class="annotation-card-header">
          <div class="annotation-tag-group">
            <span class="annotation-type-badge" style="background-color: ${item.kind === 'note' ? 'color-mix(in srgb, var(--color-primary-light) 18%, transparent)' : 'color-mix(in srgb, ' + accentHex + ' 18%, transparent)'}; color: ${item.kind === 'note' ? 'var(--color-primary-light)' : accentHex}; border: 1px solid ${item.kind === 'note' ? 'color-mix(in srgb, var(--color-primary-light) 35%, transparent)' : accentHex};">
              ${item.kind === 'note' ? `
                <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              ` : `
                <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              `}
              <span>${this.getKindLabel(item.kind)}</span>
            </span>
            <span class="annotation-date">${dateStr}</span>
          </div>

          <button class="btn-delete-annot btn-card-action" data-action="delete" data-id="${item.id}" data-kind="${item.kind}" title="Eliminar cita/nota">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

        ${item.text ? `
          <blockquote class="annotation-quote" style="--card-accent-color: ${accentHex};">«${this.escapeHtml(item.text)}»</blockquote>
        ` : ''}

        ${item.noteContent ? `
          <div class="annotation-user-note">
            <div class="annotation-user-note-label">
              <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/></svg>
              <span>Anotación personal</span>
            </div>
            ${this.escapeHtml(item.noteContent)}
          </div>
        ` : ''}

        <div class="annotation-card-footer">
          <div style="display: flex; flex-direction: column; min-width: 0; gap: 2px;">
            <span style="font-size: var(--text-xs); font-weight: 600; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📖 ${this.escapeHtml(bookTitle)}</span>
            ${item.chapter ? `<span style="font-size: 0.7rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.chapter)}</span>` : ''}
          </div>

          ${item.cfi ? `
            <button class="btn-jump-cfi" data-action="jump" data-book-id="${item.bookId}" data-cfi="${item.cfi}" style="
              background-color: var(--color-surface-hover);
              color: var(--color-primary-light);
              font-size: var(--text-xs);
              font-weight: 600;
              padding: 6px 14px;
              border-radius: var(--radius-full);
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
              await dbManager.delete('notes', id);
              appState.notify('noteDeleted', id);
            } else {
              await dbManager.delete('annotations', id);
              appState.notify('annotationRemoved', id);
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
