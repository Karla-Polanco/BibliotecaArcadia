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
import { AnnotationManager, annotationManager } from './AnnotationManager.js';
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
              <svg class="icon-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
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
          <svg class="icon-sm text-muted flex-shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="input-annot-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en notas y citas...">
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas de Anotaciones -->
      <div class="annotations-cards-grid">
        ${filtered.length === 0 ? `
          <div class="library-empty-state">
            <div class="empty-state-icon">
              <svg class="icon-xl color-primary-light" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <h3 class="empty-state-title">${this.searchQuery ? 'Sin resultados' : 'Aún no hay notas'}</h3>
            <p class="empty-state-desc">
              ${this.searchQuery ? `No se encontraron notas ni subrayados que coincidan con «<strong>${this.escapeHtml(this.searchQuery)}</strong>». Prueba con otro término de búsqueda.` : 'Selecciona texto mientras lees en cualquier libro para resaltar pasajes o añadir notas personales. Tus citas aparecerán aquí.'}
            </p>
            ${this.searchQuery ? `<button id="btn-annot-clear-search" class="arcadia-modal-btn arcadia-modal-btn--ghost"><span>Limpiar búsqueda</span></button>` : `<button id="btn-annot-go-library" class="arcadia-modal-btn arcadia-modal-btn--ghost"><span>Ver toda la biblioteca</span></button>`}
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M8 2.5v4M16 2.5v4M3 10h18"/></svg>
              <span>${dateStr}</span>
            </span>
          </div>

          <button class="btn-delete-annot btn-card-action" data-action="delete" data-id="${item.id}" data-kind="${item.kind}" title="Eliminar cita/nota" aria-label="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>

        ${item.text ? `
          <blockquote class="annotation-quote">«${this.escapeHtml(item.text)}»</blockquote>
        ` : ''}

        ${item.noteContent ? `
          <div class="annotation-user-note">
            <div class="annotation-user-note-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M9 9h6M9 12h3"/></svg>
              <span>Anotación personal</span>
            </div>
            <p class="annotation-user-note-text">${this.escapeHtml(item.noteContent)}</p>
          </div>
        ` : ''}

        <div class="annotation-card-footer">
          <div class="annot-book">
            <span class="annot-book-row">
              <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true"><g transform="translate(0,512) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M3854 4896 c-396 -164 -825 -584 -1216 -1189 -43 -67 -79 -126 -81 -131 -2 -6 -53 33 -113 85 -517 452 -1072 695 -1602 702 l-134 2 -24 -28 c-24 -28 -24 -30 -24 -241 l0 -213 -87 -17 c-137 -27 -191 -44 -208 -68 -12 -18 -15 -54 -15 -180 l0 -158 -103 0 c-87 0 -110 -3 -147 -22 -24 -13 -53 -36 -64 -51 -21 -28 -21 -30 -21 -1560 l0 -1532 23 -33 c52 -72 -27 -67 1092 -67 1155 0 1011 -13 1272 112 l158 75 172 -82 c106 -50 199 -88 241 -96 56 -12 233 -14 1046 -12 l977 3 41 27 c80 53 74 -88 71 1616 l-3 1521 -21 28 c-40 53 -79 67 -196 71 l-106 4 -4 160 c-3 159 -3 160 -30 183 -25 21 -123 49 -240 70 l-38 6 0 214 c0 209 -1 215 -23 241 -23 26 -24 26 -156 26 -123 -1 -201 -7 -243 -18 -16 -5 -17 16 -20 265 -3 255 -4 272 -23 290 -35 34 -64 34 -151 -3z m9 -218 c3 -24 5 -642 6 -1374 l1 -1331 -94 -46 c-330 -159 -752 -570 -1060 -1032 l-66 -99 0 1315 0 1315 61 99 c283 459 580 807 881 1034 82 62 242 161 259 161 4 0 9 -19 12 -42z m-2796 -494 c436 -64 891 -299 1309 -678 l101 -91 8 -339 c4 -186 4 -797 0 -1358 l-8 -1019 -36 33 c-61 57 -141 122 -238 192 -412 296 -880 482 -1270 503 l-113 6 0 1389 0 1388 73 -6 c39 -3 118 -12 174 -20z m3241 -1366 l2 -1388 -54 0 c-92 0 -277 -28 -418 -64 -243 -61 -527 -189 -766 -345 -74 -49 -118 -73 -112 -61 33 61 233 295 364 425 215 214 403 351 584 425 42 18 86 41 97 51 20 19 20 34 23 1169 l2 1148 30 7 c36 8 197 23 225 21 20 -1 20 -9 23 -1388z m-3648 -297 c0 -1158 1 -1200 19 -1222 17 -22 28 -24 167 -30 315 -15 559 -81 866 -235 97 -49 288 -160 288 -168 0 -2 -48 12 -107 29 -234 71 -448 104 -724 112 -235 7 -471 -13 -637 -54 l-22 -5 0 1370 0 1371 63 14 c34 9 68 16 75 16 9 1 12 -245 12 -1198z m3880 1184 c19 -4 43 -9 53 -11 16 -5 17 -79 17 -1376 l0 -1370 -23 6 c-13 3 -82 16 -153 28 -175 30 -605 33 -784 5 -140 -22 -311 -59 -421 -92 -45 -14 -84 -24 -85 -22 -7 6 185 117 301 175 290 144 598 222 876 222 93 0 102 2 124 25 l25 24 0 1201 c0 1139 1 1201 18 1196 9 -2 33 -7 52 -11z m-4190 -1784 l0 -1380 24 -28 24 -28 844 0 843 0 93 48 92 47 58 -29 c108 -55 110 -49 -35 -118 -70 -34 -148 -67 -173 -72 -29 -7 -386 -11 -997 -11 l-953 0 0 1475 0 1475 90 0 90 0 0 -1379z m4600 -96 l0 -1475 -956 0 -955 0 -75 25 c-41 14 -118 47 -171 74 l-98 48 80 40 79 40 100 -48 99 -49 856 2 856 3 2 1395 c2 767 5 1401 8 1408 3 8 31 12 90 12 l85 0 0 -1475z m-3492 -999 c156 -24 322 -63 476 -113 224 -74 233 -73 -661 -73 l-764 0 3 72 3 72 55 12 c48 11 211 36 320 48 78 9 470 -4 568 -18z m2987 -10 c82 -14 153 -30 158 -35 4 -4 7 -37 5 -72 l-3 -64 -761 -3 c-890 -3 -884 -3 -658 71 159 52 320 89 479 111 169 24 175 24 410 21 182 -3 246 -8 370 -29z"/><path d="M1071 3613 c-12 -10 -24 -34 -27 -53 -10 -62 11 -75 186 -119 316 -79 606 -221 901 -442 77 -57 114 -79 136 -79 39 0 76 40 76 82 0 39 -35 71 -203 189 -286 200 -605 347 -900 415 -126 29 -141 29 -169 7z"/><path d="M1093 2949 c-27 -10 -53 -47 -53 -76 0 -46 39 -71 140 -93 298 -63 628 -219 925 -435 66 -48 129 -92 141 -97 48 -22 112 41 98 98 -14 53 -348 280 -587 397 -249 123 -598 231 -664 206z"/><path d="M1065 2175 c-26 -25 -32 -63 -15 -94 11 -21 43 -35 120 -51 323 -70 655 -228 971 -464 58 -44 111 -76 125 -76 29 0 71 37 79 71 9 36 -25 73 -149 164 -305 222 -632 378 -956 455 -113 27 -145 26 -175 -5z"/></g></svg>
              <strong class="annot-book-title">${this.escapeHtml(bookTitle)}</strong>
            </span>
          </div>

          ${item.cfi ? `
            <button class="btn-jump-cfi" data-action="jump" data-book-id="${item.bookId}" data-cfi="${item.cfi}">
              <span>Ir al pasaje</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          ` : ''}
        </div>
      </article>
    `;
  }

  badgeIcon(kind) {
    if (kind === 'note') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`;
    }
    if (kind === 'highlight') {
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3v7a6 6 0 0012 0V3"/><path d="M4 21h16"/></svg>`;
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
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
