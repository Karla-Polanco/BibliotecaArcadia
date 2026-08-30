/**
 * ============================================================================
 * VOCABULARY VIEW - CUADERNO DE VOCABULARIO Y FONÉTICA
 * ============================================================================
 * Vista centralizada de términos aprendidos con pronunciación por voz,
 * definiciones, oraciones de contexto y seguimiento de dominio léxico.
 */

import { VocabularyManager } from './VocabularyManager.js';
import { dbManager } from '../db.js';
import { appState } from '../state.js';
import { Toast } from '../ui/Toast.js';

export class VocabularyView {
  constructor(containerElement) {
    this.container = containerElement;
    this.words = [];
    this.books = [];
    this.activeTab = 'all'; // 'all' | 'learning' | 'mastered'
    this.searchQuery = '';

    this.initEvents();
  }

  initEvents() {
    appState.subscribe('wordAdded', () => this.refresh());
    appState.subscribe('wordUpdated', () => this.refresh());
    appState.subscribe('wordRemoved', () => this.refresh());
  }

  async loadAndRender() {
    this.words = await VocabularyManager.getAllWords();
    this.books = await dbManager.getAll('books');
    this.render();
  }

  async refresh() {
    if (appState.get('activeFilter') === 'vocabulary') {
      await this.loadAndRender();
    }
  }

  render() {
    if (!this.container) return;
    this.container.className = 'vocabulary-view-wrapper';

    // Filtrado
    let filtered = [...this.words];
    if (this.activeTab === 'learning') {
      filtered = filtered.filter(w => !w.mastered);
    } else if (this.activeTab === 'mastered') {
      filtered = filtered.filter(w => w.mastered);
    }

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        (w.word || '').toLowerCase().includes(q) ||
        (w.definition || '').toLowerCase().includes(q) ||
        (w.contextSentence || '').toLowerCase().includes(q)
      );
    }

    const totalCount = this.words.length;
    const learningCount = this.words.filter(w => !w.mastered).length;
    const masteredCount = this.words.filter(w => w.mastered).length;

    this.container.innerHTML = `
      <div class="vocab-header-panel" style="width: 100%; margin-bottom: 24px; padding: 24px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-surface), var(--color-surface-secondary)); border: 1px solid var(--color-border); border-left: 5px solid var(--color-primary-light);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 18px;">
          <div>
            <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: var(--color-primary-light); letter-spacing: 0.05em;">Cuaderno Léxico</span>
            <h1 style="font-size: var(--text-xl); font-weight: bold; color: var(--color-text); margin: 4px 0;">Vocabulario y Fonética</h1>
            <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 0;">Palabras descubiertas durante tus sesiones de lectura con pronunciación en voz alta.</p>
          </div>
          <button id="btn-add-word-manual" style="
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
          ">
            <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Añadir palabra</span>
          </button>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <!-- Filtros de Pestaña -->
          <div style="display: flex; gap: 8px;">
            <button class="vocab-tab-btn ${this.activeTab === 'all' ? 'active' : ''}" data-tab="all" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeTab === 'all' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeTab === 'all' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
            ">Todas (${totalCount})</button>

            <button class="vocab-tab-btn ${this.activeTab === 'learning' ? 'active' : ''}" data-tab="learning" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeTab === 'learning' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeTab === 'learning' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
            ">Por aprender (${learningCount})</button>

            <button class="vocab-tab-btn ${this.activeTab === 'mastered' ? 'active' : ''}" data-tab="mastered" style="
              padding: 6px 14px; border-radius: var(--radius-sm); font-size: var(--text-xs); cursor: pointer; border: 1px solid var(--color-border);
              background-color: ${this.activeTab === 'mastered' ? 'var(--color-primary-light)' : 'var(--color-surface)'};
              color: ${this.activeTab === 'mastered' ? '#FFF' : 'var(--color-text-secondary)'};
              font-weight: bold;
            ">Dominadas (${masteredCount})</button>
          </div>

          <!-- Buscador de Vocabulario -->
          <div style="position: relative; width: 220px;">
            <input type="text" id="input-vocab-search" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar término..." style="
              width: 100%; padding: 6px 12px 6px 30px; border-radius: var(--radius-sm); background-color: var(--color-surface); border: 1px solid var(--color-border); color: var(--color-text); font-size: var(--text-xs); outline: none;
            ">
            <svg style="position: absolute; left: 9px; top: 7px; width: 14px; height: 14px; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </div>
        </div>
      </div>

      <!-- Tarjetas de Vocabulario (Flashcards) -->
      <div class="vocab-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; width: 100%;">
        ${filtered.length === 0 ? `
          <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--color-text-muted);">
            <svg style="width: 42px; height: 42px; margin: 0 auto 12px; opacity: 0.4;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <p style="font-size: var(--text-sm);">No hay palabras en esta categoría.</p>
            <span style="font-size: 0.75rem;">Selecciona una palabra mientras lees en el lector y pulsa «Definir».</span>
          </div>
        ` : filtered.map(w => {
          const book = this.books.find(b => b.id === w.bookId);
          const bookTitle = book ? book.title : 'Libro general';
          return `
            <div class="vocab-card" data-word-id="${w.id}" style="
              background-color: var(--color-surface);
              border: 1px solid var(--color-border);
              border-radius: var(--radius-md);
              padding: 18px;
              display: flex;
              flex-direction: column;
              gap: 12px;
              transition: transform 0.15s ease, box-shadow 0.15s ease;
            ">
              <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 1.15rem; font-weight: bold; color: var(--color-text); margin: 0;">${this.escapeHtml(w.word)}</h3>
                    <button class="btn-card-speak" data-word="${this.escapeHtml(w.word)}" title="Escuchar pronunciación" style="
                      width: 26px; height: 26px; border-radius: 50%; background-color: var(--color-surface-hover); color: var(--color-primary-light); display: flex; align-items: center; justify-content: center; cursor: pointer; border: none;
                    ">
                      <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                  </div>
                  ${w.phonetic ? `<span style="font-family: monospace; font-size: 0.72rem; color: var(--color-primary-light);">${this.escapeHtml(w.phonetic)}</span>` : ''}
                </div>

                <div style="display: flex; align-items: center; gap: 4px;">
                  <button class="btn-card-mastered ${w.mastered ? 'mastered' : ''}" data-action="toggle-mastered" data-id="${w.id}" title="${w.mastered ? 'Marcada como dominada' : 'Marcar como dominada'}" style="
                    padding: 3px 8px; border-radius: 12px; font-size: 0.68rem; font-weight: bold; cursor: pointer;
                    background-color: ${w.mastered ? 'rgba(16, 185, 129, 0.15)' : 'var(--color-surface-hover)'};
                    color: ${w.mastered ? '#10B981' : 'var(--color-text-muted)'};
                    border: 1px solid ${w.mastered ? '#10B981' : 'transparent'};
                  ">
                    ${w.mastered ? '✓ Dominada' : '○ Por aprender'}
                  </button>

                  <button class="btn-card-del" data-action="delete-word" data-id="${w.id}" title="Eliminar término" style="
                    color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: 4px;
                  ">
                    <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              <!-- Definición -->
              <p style="font-size: var(--text-xs); line-height: 1.45; color: var(--color-text); margin: 0; background-color: var(--color-surface-elevated); padding: 10px; border-radius: var(--radius-sm);">
                ${this.escapeHtml(w.definition)}
              </p>

              <!-- Cita de contexto si existe -->
              ${w.contextSentence ? `
                <div style="font-size: 0.72rem; color: var(--color-text-secondary); font-style: italic; border-left: 2px solid var(--color-primary-light); padding-left: 8px; margin: 0;">
                  «${this.escapeHtml(w.contextSentence)}»
                </div>
              ` : ''}

              <!-- Pie de tarjeta -->
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.68rem; color: var(--color-text-muted); padding-top: 4px; border-top: 1px solid var(--color-border);">
                <span title="${this.escapeHtml(bookTitle)}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">📖 ${this.escapeHtml(bookTitle)}</span>
                <span>${new Date(w.dateAdded).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.attachEvents();
  }

  attachEvents() {
    // Pestañas de filtrado
    this.container.querySelectorAll('.vocab-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.dataset.tab;
        this.render();
      });
    });

    // Búsqueda en vivo
    const searchInput = this.container.querySelector('#input-vocab-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Botón manual de añadir palabra
    const addManualBtn = this.container.querySelector('#btn-add-word-manual');
    if (addManualBtn) {
      addManualBtn.addEventListener('click', () => this.promptAddWord());
    }

    // Botones de pronunciación fonética
    this.container.querySelectorAll('.btn-card-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.dataset.word;
        if (word) VocabularyManager.speakWord(word);
      });
    });

    // Botones de alternar dominada
    this.container.querySelectorAll('[data-action="toggle-mastered"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const isMastered = await VocabularyManager.toggleMastered(id);
        Toast.info(isMastered ? '¡Palabra dominada!' : 'Palabra marcada por aprender.');
        this.loadAndRender();
      });
    });

    // Botones de eliminar palabra
    this.container.querySelectorAll('[data-action="delete-word"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (confirm('¿Eliminar este término del vocabulario?')) {
          await VocabularyManager.removeWord(id);
          Toast.info('Término eliminado.');
          this.loadAndRender();
        }
      });
    });
  }

  async promptAddWord() {
    const rawWord = prompt('Introduce la palabra que deseas agregar:');
    if (!rawWord || !rawWord.trim()) return;

    Toast.info(`Buscando definición para «${rawWord.trim()}»...`);
    const defData = await VocabularyManager.lookupDefinition(rawWord.trim());

    const def = prompt('Definición del término:', defData.definition);
    if (def === null) return;

    try {
      await VocabularyManager.addWord({
        word: defData.word,
        definition: def.trim() || defData.definition,
        phonetic: defData.phonetic,
        bookId: 'general',
        contextSentence: ''
      });
      Toast.success(`«${defData.word}» agregada al vocabulario.`);
      this.loadAndRender();
    } catch (err) {
      Toast.error('No se pudo guardar la palabra.');
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
