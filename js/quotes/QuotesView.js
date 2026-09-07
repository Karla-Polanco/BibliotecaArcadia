/**
 * ============================================================================
 * QUOTES VIEW - CUADERNO DE FRASES Y CITAS LITERARIAS
 * ============================================================================
 * Vista centralizada donde el usuario puede gestionar, escribir, buscar,
 * editar, eliminar y fijar en el banner sus propias citas y frases favoritas.
 */

import { QuotesManager } from './QuotesManager.js';
import { QuoteModal } from '../ui/QuoteModal.js';
import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';
import { appState } from '../state.js';

export class QuotesView {
  constructor(containerElement, quotesService = null) {
    this.container = containerElement;
    this.quotesService = quotesService;
    this.quotes = [];
    this.activeTab = 'all'; // 'all' | 'favorites'
    this.searchQuery = '';

    this.initEvents();
  }

  initEvents() {
    appState.subscribe('quoteAdded', () => this.refresh());
    appState.subscribe('quoteUpdated', () => this.refresh());
    appState.subscribe('quoteDeleted', () => this.refresh());
  }

  /**
   * Carga las frases desde IndexedDB y renderiza la vista.
   */
  async loadAndRender() {
    this.quotes = await QuotesManager.getAllQuotes();
    this.render();
  }

  async refresh() {
    if (appState.get('activeFilter') === 'quotes') {
      await this.loadAndRender();
    }
  }

  /**
   * Renderizado general de la vista.
   */
  render() {
    if (!this.container) return;
    this.container.className = 'quotes-view-wrapper';

    // Filtrar según pestaña y búsqueda
    let filtered = [...this.quotes];
    if (this.activeTab === 'favorites') {
      filtered = filtered.filter(q => q.favorite);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        (item.text || '').toLowerCase().includes(q) ||
        (item.author || '').toLowerCase().includes(q) ||
        (item.source || '').toLowerCase().includes(q)
      );
    }

    const totalCount = this.quotes.length;
    const favCount = this.quotes.filter(q => q.favorite).length;

    this.container.innerHTML = `
      <!-- Panel de Encabezado Superior (Estilo Cuaderno Arcadia) -->
      <div class="quotes-header-panel" style="width: 100%; margin-bottom: 24px; padding: 24px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary)); border: 1px solid var(--color-border); border-left: 5px solid var(--color-primary-light);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
          <div>
            <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: var(--color-primary-light); letter-spacing: 0.05em;">Cuaderno Literario</span>
            <h1 style="font-size: var(--text-xl); font-weight: bold; color: var(--color-text); margin: 4px 0;">Frases y Citas Literarias</h1>
            <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 0;">Tu colección personal de reflexiones, citas célebres y pensamientos memorables.</p>
          </div>

          <button id="btn-add-quote-trigger" style="
            padding: 8px 18px;
            border-radius: var(--radius-sm);
            font-size: var(--text-xs);
            font-weight: bold;
            background-color: var(--color-primary-light);
            color: #FFFFFF;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            border: none;
            box-shadow: 0 4px 12px var(--color-primary-glow, rgba(123, 107, 240, 0.4));
          ">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Añadir frase</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <!-- Filtros de Pestaña -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="quote-tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeTab === 'all' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeTab === 'all' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Todas (${totalCount})</button>

            <button class="quote-tab-btn ${this.activeTab === 'favorites' ? 'active' : ''}" data-tab="favorites" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeTab === 'favorites' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeTab === 'favorites' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
              transition: all 0.15s ease;
            ">Favoritas (${favCount})</button>
          </div>

          <!-- Buscador de Frases -->
          <div style="position: relative; width: 240px;">
            <input type="text" id="input-quotes-search" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar frase, autor o libro..." style="
              width: 100%; padding: 6px 12px 6px 30px; border-radius: var(--radius-sm); background-color: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-size: var(--text-xs); outline: none; box-sizing: border-box;
            ">
            <svg style="position: absolute; left: 9px; top: 7px; width: 14px; height: 14px; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Cuadrícula de Tarjetas de Frases -->
      <div class="quotes-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; width: 100%;">
        ${filtered.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--color-text-muted);">
            <div style="width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; background: var(--color-surface-hover); display: flex; align-items: center; justify-content: center; color: var(--color-primary-light);">
              <svg style="width: 32px; height: 32px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <h3 style="font-size: var(--text-md); font-weight: bold; color: var(--color-text); margin-bottom: 6px;">No tienes frases en esta sección</h3>
            <p style="font-size: var(--text-sm); color: var(--color-text-secondary); max-width: 400px; margin: 0 auto 18px;">
              Escribe tus citas literarias favoritas, reflexiones o pensamientos para verlos rotar en el banner superior.
            </p>
            <button id="btn-empty-add-quote" style="
              padding: 9px 20px; border-radius: var(--radius-sm); background-color: var(--color-primary-light); color: #FFF; font-size: var(--text-xs); font-weight: bold; border: none; cursor: pointer;
            ">
              <span>Escribir mi primera frase</span>
            </button>
          </div>
        ` : filtered.map(item => this.renderQuoteCard(item)).join('')}
      </div>
    `;

    this.attachEvents();
  }

  renderQuoteCard(item) {
    const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
    const isCurrentBanner = this.quotesService && this.quotesService.getCurrentQuote().id === item.id;

    return `
      <article class="quote-card" data-quote-id="${item.id}" style="
        background-color: var(--color-surface);
        border: 1px solid ${item.favorite ? 'var(--color-primary-light)' : 'var(--color-border)'};
        border-radius: var(--radius-md);
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
      ">
        <!-- Marca de Agua Ornamental -->
        <span style="position: absolute; right: 14px; top: 10px; font-size: 4rem; line-height: 1; font-family: Georgia, serif; color: var(--color-primary-light); opacity: 0.08; pointer-events: none; user-select: none;">“</span>

        <!-- Fila Superior: Favorito, Fecha y Acciones -->
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn-toggle-fav-quote" data-action="toggle-fav" data-id="${item.id}" title="${item.favorite ? 'Quitar de favoritas' : 'Marcar como favorita'}" style="
              background: none; border: none; cursor: pointer; padding: 2px; color: ${item.favorite ? '#F59E0B' : 'var(--color-text-muted)'}; display: flex; align-items: center; font-size: 1.1rem;
            ">
              ${item.favorite ? '★' : '☆'}
            </button>
            <span style="font-size: 0.72rem; color: var(--color-text-muted); font-weight: 500;">${dateStr}</span>
          </div>

          <div style="display: flex; align-items: center; gap: 4px;">
            <button class="btn-edit-quote" data-action="edit" data-id="${item.id}" title="Editar frase" style="
              color: var(--color-text-muted); padding: 4px; border-radius: 4px; cursor: pointer; background: transparent; border: none;
            ">
              <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            </button>

            <button class="btn-delete-quote" data-action="delete" data-id="${item.id}" title="Eliminar frase" style="
              color: var(--color-text-muted); padding: 4px; border-radius: 4px; cursor: pointer; background: transparent; border: none;
            ">
              <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

        <!-- Texto de la Cita -->
        <blockquote style="
          font-family: var(--font-serif, Georgia, serif);
          font-size: 1.22rem;
          color: var(--color-text);
          line-height: 1.6;
          font-style: italic;
          margin: 4px 0 6px 0;
          padding-left: 14px;
          border-left: 3.5px solid var(--color-primary-light);
        ">${this.escapeHtml(item.text)}</blockquote>

        <!-- Autor y Fuente -->
        <div style="display: flex; flex-direction: column; gap: 3px;">
          <span style="font-size: 0.85rem; font-weight: bold; color: var(--color-text); letter-spacing: 0.03em; text-transform: uppercase;">— ${this.escapeHtml(item.author || 'Anónimo')}</span>
          ${item.source ? `<span style="font-size: 0.78rem; color: var(--color-text-muted); font-style: italic;">${this.escapeHtml(item.source)}</span>` : ''}
        </div>

        <!-- Acciones Inferiores -->
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: auto; gap: 8px; flex-wrap: wrap;">
          <button class="btn-pin-banner" data-action="pin" data-id="${item.id}" style="
            background-color: ${isCurrentBanner ? 'var(--color-primary-light)' : 'var(--color-surface-hover)'};
            color: ${isCurrentBanner ? '#FFF' : 'var(--color-text)'};
            font-size: var(--text-xs);
            font-weight: 600;
            padding: 5px 12px;
            border-radius: var(--radius-sm);
            border: 1px solid var(--color-border);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: all 0.15s ease;
          ">
            <span>${isCurrentBanner ? '✓ En el Banner' : '📌 Mostrar en Banner'}</span>
          </button>

          <button class="btn-copy-quote" data-action="copy" data-text="${this.escapeHtml(item.text)}" data-author="${this.escapeHtml(item.author)}" style="
            background: none;
            border: none;
            color: var(--color-text-muted);
            font-size: var(--text-xs);
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          ">
            <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            <span>Copiar</span>
          </button>
        </div>
      </article>
    `;
  }

  attachEvents() {
    // 1. Añadir nueva frase
    const addBtn = this.container.querySelector('#btn-add-quote-trigger');
    const emptyAddBtn = this.container.querySelector('#btn-empty-add-quote');
    const openNewModal = () => QuoteModal.open(null, () => this.loadAndRender());

    if (addBtn) addBtn.addEventListener('click', openNewModal);
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', openNewModal);

    // 2. Filtro de pestañas
    this.container.querySelectorAll('.quote-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    // 3. Buscador en vivo
    const searchInput = this.container.querySelector('#input-quotes-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
        const newSearch = this.container.querySelector('#input-quotes-search');
        if (newSearch) {
          newSearch.focus();
          newSearch.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
        }
      });
    }

    // 4. Alternar favorita
    this.container.querySelectorAll('[data-action="toggle-fav"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        await QuotesManager.toggleFavorite(id);
        this.loadAndRender();
      });
    });

    // 5. Editar frase
    this.container.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const quote = await QuotesManager.getQuoteById(id);
        if (quote) {
          QuoteModal.open(quote, () => this.loadAndRender());
        }
      });
    });

    // 6. Eliminar frase
    this.container.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const confirmed = await Modal.confirm({
          title: 'Eliminar frase',
          message: '¿Estás seguro de que deseas eliminar esta frase de tu colección?',
          danger: true,
          confirmText: 'Eliminar'
        });

        if (confirmed) {
          await QuotesManager.deleteQuote(id);
          Toast.success('Frase eliminada.');
          this.loadAndRender();
        }
      });
    });

    // 7. Fijar en Banner superior
    this.container.querySelectorAll('[data-action="pin"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (this.quotesService) {
          this.quotesService.setBannerQuote(id);
          Toast.success('Frase fijada en el banner superior.');
          this.render();
        }
      });
    });

    // 8. Copiar frase
    this.container.querySelectorAll('[data-action="copy"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.dataset.text;
        const author = btn.dataset.author;
        const toCopy = `${text} — ${author}`;
        navigator.clipboard.writeText(toCopy)
          .then(() => Toast.success('Frase copiada al portapapeles.'))
          .catch(() => Toast.info(toCopy));
      });
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
