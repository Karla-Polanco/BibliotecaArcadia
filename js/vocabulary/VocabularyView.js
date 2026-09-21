/**
 * ============================================================================
 * VOCABULARY VIEW - CUADERNO DE VOCABULARIO Y FONÉTICA
 * ============================================================================
 * Términos creados por el usuario con pronunciación por voz,
 * definiciones y oraciones de contexto.
 */

import { VocabularyManager } from './VocabularyManager.js';
import { dbManager } from '../db.js';
import { appState } from '../state.js';
import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';

export class VocabularyView {
  constructor(containerElement) {
    this.container = containerElement;
    this.words = [];
    this.books = [];
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
    this.injectStyles();

    // Filtrado por búsqueda
    let filtered = [...this.words];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        (w.word || '').toLowerCase().includes(q) ||
        (w.definition || '').toLowerCase().includes(q) ||
        (w.contextSentence || '').toLowerCase().includes(q)
      );
    }

    const totalCount = this.words.length;

    this.container.innerHTML = `
      <div class="vocab-header-panel">
        <div class="header-card-top">
          <div class="header-card-brand-group">
            <div class="header-card-icon-box header-card-icon-box--vocab">
              <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div class="header-card-text">
              <span class="panel-category-tag">CUADERNO LÉXICO</span>
              <h1 class="panel-heading">Vocabulario y Fonética</h1>
              <p class="panel-description">Tus palabras, tus definiciones. Añádelas aquí o con «Definir» mientras lees.</p>
            </div>
          </div>
          <div class="panel-actions-row">
            <span class="collection-count-pill">${totalCount} ${totalCount === 1 ? 'palabra' : 'palabras'}</span>
            <button id="btn-add-word-manual" class="btn-col-header-action btn-col-header-action--primary">
              <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>Añadir palabra</span>
            </button>
          </div>
        </div>

        <!-- Buscador -->
        <div class="panel-search-bar">
          <svg style="width: 14px; height: 14px; color: var(--color-text-muted); flex-shrink: 0; pointer-events: none;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="input-vocab-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en tu cuaderno...">
        </div>
      </div>

      <!-- Tarjetas de Vocabulario -->
      <div class="vocab-cards-grid">
        ${filtered.length === 0 ? `
          <div class="library-empty-state">
            <div class="empty-state-icon">
              <svg style="width: 36px; height: 36px; color: var(--color-primary-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 class="empty-state-title">${this.searchQuery ? 'Sin resultados' : 'Tu cuaderno está vacío'}</h3>
            <p class="empty-state-desc">
              ${this.searchQuery ? `No se encontraron palabras que coincidan con «<strong>${this.escapeHtml(this.searchQuery)}</strong>». Prueba con otro término.` : 'Crea tu primera palabra o usa «Definir» mientras lees. Tus términos aparecerán aquí.'}
            </p>
            ${this.searchQuery ? `<button id="btn-vocab-clear-search" class="arcadia-modal-btn arcadia-modal-btn--ghost"><span>Limpiar búsqueda</span></button>` : `<button id="btn-add-word-empty" class="arcadia-modal-btn arcadia-modal-btn--primary"><svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg><span>Añadir mi primera palabra</span></button>`}
          </div>
        ` : filtered.map(w => {
          const book = this.books.find(b => b.id === w.bookId);
          const bookTitle = book ? book.title : 'Nota personal';
          const escAttr = (v) => this.escapeHtml(v).replace(/"/g, '&quot;');
          return `
            <div class="vocab-card" data-word-id="${w.id}">
              <div class="vocab-card-header">
                <div style="min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 class="vocab-word-title">${this.escapeHtml(w.word)}</h3>
                    <button class="btn-card-speak" data-word="${this.escapeHtml(w.word)}" title="Escuchar pronunciación" style="
                      width: 28px; height: 28px; border-radius: 50%; background-color: var(--color-surface-hover); color: var(--color-primary-light); display: flex; align-items: center; justify-content: center; cursor: pointer; border: 1px solid var(--color-border); flex-shrink: 0; transition: all 0.18s ease;
                    ">
                      <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                    </button>
                  </div>
                  ${w.phonetic ? `<span class="vocab-phonetic-badge">${this.escapeHtml(w.phonetic)}</span>` : ''}
                </div>

                <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
                  <button class="btn-card-edit btn-card-action" data-action="edit-word" data-id="${w.id}" title="Editar término">
                    <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>

                  <button class="btn-card-del btn-card-action" data-action="delete-word" data-id="${w.id}" title="Eliminar término">
                    <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </div>

              <!-- Definición -->
              <div class="vocab-definition-box">
                <p class="vocab-definition-text">
                  ${this.escapeHtml(w.definition)}
                </p>
              </div>

              <!-- Cita de contexto si existe -->
              ${w.contextSentence ? `
                <div class="vocab-context-box">
                  «${this.escapeHtml(w.contextSentence)}»
                </div>
              ` : ''}

              <!-- Pie: libro y fecha -->
              <div class="vocab-card-footer">
                <span title="${this.escapeHtml(bookTitle)}" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 190px;">📖 ${this.escapeHtml(bookTitle)}</span>
                <span style="flex-shrink: 0;">${new Date(w.dateAdded).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
              </div>

              <!-- Acciones inferiores -->
              <div class="vocab-card-actions">
                <button class="btn-listen-word vocab-action-btn" data-action="speak-word" data-word="${escAttr(w.word)}" title="Escuchar pronunciación">
                  <svg style="width: 13px; height: 13px; color: var(--color-primary-light);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                  <span>Escuchar</span>
                </button>
                <button class="btn-copy-word vocab-action-btn" data-action="copy-word" data-word="${escAttr(w.word)}" data-definition="${escAttr(w.definition || '')}" title="Copiar palabra y definición">
                  <svg style="width: 13px; height: 13px; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
                  <span>Copiar</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.attachEvents();
  }

  injectStyles() {
    if (document.getElementById('vocab-view-styles')) return;
    const style = document.createElement('style');
    style.id = 'vocab-view-styles';
    style.textContent = `
      .vocab-card { position: relative; overflow: hidden; transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
      .vocab-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--color-border-focus); }
      .vocab-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--color-primary-light), var(--color-secondary)); opacity: 0; transition: opacity 0.18s ease; }
      .vocab-card:hover::before { opacity: 1; }
      .btn-card-speak:hover { background-color: var(--color-primary-light) !important; color: #FFF !important; }
      .btn-card-edit:hover { color: var(--color-primary-light) !important; background-color: var(--color-surface-hover) !important; }
      .btn-card-del:hover { color: #EF4444 !important; background-color: var(--color-surface-hover) !important; }
      #btn-add-word-manual:hover, #btn-add-word-empty:hover { filter: brightness(1.12); }
      #input-vocab-search:focus { border-color: var(--color-border-focus) !important; }
    `;
    document.head.appendChild(style);
  }

  attachEvents() {
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

    // Botón de estado vacío (mismo diseño que Colecciones - primario)
    const addEmptyBtn = this.container.querySelector('#btn-add-word-empty');
    if (addEmptyBtn) {
      addEmptyBtn.addEventListener('click', () => this.promptAddWord());
    }

    // Botón limpiar búsqueda del estado vacío (mismo diseño que Colecciones - ghost)
    const btnClearVocab = this.container.querySelector('#btn-vocab-clear-search');
    if (btnClearVocab) {
      btnClearVocab.addEventListener('click', () => {
        this.searchQuery = '';
        this.render();
        // Restaurar foco en el buscador principal del panel
        const newInput = this.container.querySelector('#input-vocab-search');
        if (newInput) newInput.focus();
      });
    }

    // Botones de pronunciación fonética (círculo junto a la palabra)
    this.container.querySelectorAll('.btn-card-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = btn.dataset.word;
        if (word) VocabularyManager.speakWord(word);
      });
    });

    // Botones inferiores: escuchar y copiar (como en Frases y Citas)
    this.container.querySelectorAll('[data-action="speak-word"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.dataset.word) VocabularyManager.speakWord(btn.dataset.word);
      });
    });

    this.container.querySelectorAll('[data-action="copy-word"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const toCopy = `${btn.dataset.word || ''} — ${btn.dataset.definition || ''}`.trim();
        if (!toCopy || toCopy === '—') return;
        navigator.clipboard.writeText(toCopy)
          .then(() => Toast.success('Palabra copiada al portapapeles.'))
          .catch(() => Toast.info(toCopy));
      });
    });

    // Botones de editar palabra
    this.container.querySelectorAll('[data-action="edit-word"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const w = this.words.find(x => String(x.id) === String(btn.dataset.id));
        if (w) this.promptAddWord(w);
      });
    });

    // Botones de eliminar palabra
    this.container.querySelectorAll('[data-action="delete-word"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const confirmed = await Modal.confirm({
          title: 'Eliminar término',
          message: '¿Estás seguro de que deseas eliminar este término de tu cuaderno de vocabulario?',
          danger: true,
          confirmText: 'Eliminar'
        });

        if (confirmed) {
          await VocabularyManager.removeWord(id);
          Toast.info('Término eliminado.');
          this.loadAndRender();
        }
      });
    });
  }

  async promptAddWord(wordToEdit = null) {
    const isEditing = !!wordToEdit;
    const escAttr = (v) => this.escapeHtml(v).replace(/"/g, '&quot;');
    // Crear modal personalizado con los 4 campos
    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay active';
    overlay.style.cssText = `
      position: fixed; inset: 0; top: 0; left: 0;
      width: 100vw; height: 100vh; height: 100dvh;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px; box-sizing: border-box;
    `;

    const fieldStyle = `
      width: 100%; background: var(--color-surface-elevated, #161625);
      border: 1px solid var(--color-border, #333); border-radius: var(--radius-sm, 6px);
      color: var(--color-text, #fff); padding: 10px; font-size: var(--text-sm, 0.875rem);
      box-sizing: border-box; font-family: inherit; line-height: 1.4;
    `;

    const labelStyle = `
      font-size: 0.7rem; text-transform: uppercase; font-weight: bold;
      color: var(--color-primary-light); display: block; margin-bottom: 6px;
      letter-spacing: 0.03em;
    `;

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 460px; padding: 24px;">
        <div class="theme-modal-header" style="margin-bottom: 18px;">
          <div>
            <h2 class="theme-modal-title" style="font-size: 1.2rem;">${isEditing ? 'Editar palabra' : 'Añadir palabra al vocabulario'}</h2>
            <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 4px 0 0;">${isEditing ? 'Modifica los campos y guarda los cambios.' : 'Completa los campos para agregar un nuevo término.'}</p>
          </div>
          <button class="theme-modal-close" id="btn-close-add-word">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 18px;">
          <!-- Palabra -->
          <div>
            <label style="${labelStyle}">Palabra</label>
            <input type="text" id="add-word-input" placeholder="Ej. Ataraxia, Epifanía..." value="${isEditing ? escAttr(wordToEdit.word) : ''}" style="${fieldStyle}">
            <span id="add-word-lookup-status" style="font-size: 0.7rem; color: var(--color-text-muted); margin-top: 4px; display: none;">Buscando definición...</span>
          </div>

          <!-- Fonética -->
          <div>
            <label style="${labelStyle}">Fonética</label>
            <input type="text" id="add-word-phonetic" placeholder="Ej. /a.taˈɾak.sja/" value="${isEditing ? escAttr(wordToEdit.phonetic || '') : ''}" style="${fieldStyle}">
          </div>

          <!-- Definición -->
          <div>
            <label style="${labelStyle}">Definición</label>
            <textarea id="add-word-definition" placeholder="Significado del término..." style="${fieldStyle} min-height: 70px; resize: vertical;">${isEditing ? this.escapeHtml(wordToEdit.definition || '') : ''}</textarea>
          </div>

          <!-- Oración de contexto -->
          <div>
            <label style="${labelStyle}">Oración de contexto</label>
            <textarea id="add-word-context" placeholder="Ej. Buscaba la ataraxia a través de la lectura sosegada." style="${fieldStyle} min-height: 50px; resize: vertical; font-style: italic;">${isEditing ? this.escapeHtml(wordToEdit.contextSentence || '') : ''}</textarea>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btn-cancel-add-word" style="padding: 8px 16px; border-radius: var(--radius-sm); font-size: var(--text-xs); color: var(--color-text-secondary); cursor: pointer; background: none; border: none;">Cancelar</button>
          <button id="btn-save-add-word" style="padding: 10px 20px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: bold; background-color: var(--color-primary-light); color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px; border: none;">
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>${isEditing ? 'Guardar cambios' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const wordInput = overlay.querySelector('#add-word-input');
    const phoneticInput = overlay.querySelector('#add-word-phonetic');
    const definitionInput = overlay.querySelector('#add-word-definition');
    const contextInput = overlay.querySelector('#add-word-context');
    const lookupStatus = overlay.querySelector('#add-word-lookup-status');

    // Auto-buscar definición al salir del campo de palabra
    let lookupTimeout = null;
    const autoLookup = async () => {
      const rawWord = wordInput.value.trim();
      if (!rawWord || rawWord.length < 2) return;

      lookupStatus.style.display = 'block';
      lookupStatus.textContent = `Buscando «${rawWord}»...`;

      try {
        const defData = await VocabularyManager.lookupDefinition(rawWord);
        // Solo pre-rellenar si el campo está vacío
        if (!phoneticInput.value.trim()) {
          phoneticInput.value = defData.phonetic || '';
        }
        if (!definitionInput.value.trim()) {
          definitionInput.value = defData.definition || '';
        }
        lookupStatus.textContent = `Definición encontrada (${defData.source === 'local' ? 'diccionario local' : defData.source === 'api' ? 'API externa' : 'estimación'}).`;
      } catch (err) {
        lookupStatus.textContent = 'No se encontró definición automática.';
      }
    };

    wordInput.addEventListener('blur', () => {
      clearTimeout(lookupTimeout);
      lookupTimeout = setTimeout(autoLookup, 200);
    });

    // Cerrar modal
    const closeModal = () => overlay.remove();
    overlay.querySelector('#btn-close-add-word').addEventListener('click', closeModal);
    overlay.querySelector('#btn-cancel-add-word').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Guardar
    overlay.querySelector('#btn-save-add-word').addEventListener('click', async () => {
      const rawWord = wordInput.value.trim();
      if (!rawWord) {
        Toast.error('Escribe al menos una palabra.');
        wordInput.focus();
        return;
      }
      const normalizedWord = rawWord.charAt(0).toUpperCase() + rawWord.slice(1).toLowerCase();
      const phonetic = phoneticInput.value.trim();
      const definition = definitionInput.value.trim() || 'Definición pendiente de personalizar.';
      const contextSentence = contextInput.value.trim();

      try {
        if (isEditing) {
          await VocabularyManager.updateWord(wordToEdit.id, {
            word: normalizedWord,
            phonetic: phonetic,
            definition: definition,
            contextSentence: contextSentence
          });
          Toast.success(`«${normalizedWord}» actualizada.`);
        } else {
          await VocabularyManager.addWord({
            word: rawWord,
            phonetic: phonetic,
            definition: definition,
            contextSentence: contextSentence,
            bookId: 'general'
          });
          Toast.success(`«${normalizedWord}» agregada al vocabulario.`);
        }
        closeModal();
        this.loadAndRender();
      } catch (err) {
        Toast.error('No se pudo guardar la palabra.');
      }
    });

    // Enfocar el campo de palabra al abrir
    setTimeout(() => wordInput.focus(), 150);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
