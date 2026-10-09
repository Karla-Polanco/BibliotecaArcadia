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
import { Icons } from '../ui/Icons.js';
import { escapeHtml } from '../utils.js';

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
              <svg class="icon-lg" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
            </div>
            <div class="header-card-text">
              <span class="panel-category-tag">CUADERNO LÉXICO</span>
              <h1 class="panel-heading">Vocabulario y Fonética</h1>
              <p class="panel-description">Tus palabras, tus definiciones. Añádelas aquí o con «Definir» mientras lees.</p>
            </div>
          </div>
          <div class="panel-actions-row">
            <span class="collection-count-pill">${totalCount} ${totalCount === 1 ? 'palabra' : 'palabras'}</span>
            <button id="btn-add-word-manual" class="btn btn--sm btn--primary">
              ${Icons.PLUS}
              <span>Añadir palabra</span>
            </button>
          </div>
        </div>

        <!-- Buscador -->
        <div class="panel-search-bar">
          <svg class="icon-sm text-muted flex-shrink-0 pointer-events-none" aria-hidden="true"><use href="./assets/icons/icons.svg#search"></use></svg>
          <input type="text" id="input-vocab-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en tu cuaderno...">
        </div>
      </div>

      <!-- Tarjetas de Vocabulario -->
      <div class="vocab-cards-grid">
        ${filtered.length === 0 ? `
          <div class="library-empty-state">
            <div class="empty-state-icon">
              <svg class="icon-xl color-primary-light" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
            </div>
            <h3 class="empty-state-title">${this.searchQuery ? 'Sin resultados' : 'Tu cuaderno está vacío'}</h3>
            <p class="empty-state-desc">
              ${this.searchQuery ? `No se encontraron palabras que coincidan con «<strong>${this.escapeHtml(this.searchQuery)}</strong>». Prueba con otro término.` : 'Crea tu primera palabra o usa «Definir» mientras lees. Tus términos aparecerán aquí.'}
            </p>
            ${this.searchQuery ? `<button id="btn-vocab-clear-search" class="btn btn--ghost"><span>Limpiar búsqueda</span></button>` : `<button id="btn-add-word-empty" class="btn btn--primary">${Icons.PLUS}<span>Añadir mi primera palabra</span></button>`}
          </div>
        ` : filtered.map(w => {
          const book = this.books.find(b => b.id === w.bookId);
          const bookTitle = book ? book.title : 'Nota personal';
          const formattedDate = new Date(w.dateAdded || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
          const escAttr = (v) => this.escapeHtml(v).replace(/"/g, '&quot;');
          return `
            <div class="vocab-card" data-word-id="${w.id}">
              <!-- Cabecera Superior -->
              <div class="vocab-card-header">
                <div class="vocab-card-header-left">
                  <h3 class="vocab-word-title">${this.escapeHtml(w.word)}</h3>
                  <button class="btn-card-speak btn btn--icon btn--circle btn--ghost" data-word="${this.escapeHtml(w.word)}" title="Escuchar pronunciación" aria-label="Escuchar pronunciación">
                    ${Icons.SPEAKER}
                  </button>
                </div>

                <div class="vocab-card-header-actions">
                  <button class="btn-card-edit btn btn--icon btn--circle btn--ghost" data-action="edit-word" data-id="${w.id}" title="Editar término" aria-label="Editar">
                    ${Icons.EDIT}
                  </button>
                  <button class="btn-card-del btn btn--icon btn--circle btn--danger" data-action="delete-word" data-id="${w.id}" title="Eliminar término" aria-label="Eliminar">
                    ${Icons.TRASH}
                  </button>
                </div>
              </div>

              <!-- Píldora Fonética (Si existe) -->
              ${w.phonetic ? `
                <div class="vocab-phonetic-row">
                  <div class="vocab-phonetic-badge">
                    <span>${this.escapeHtml(w.phonetic)}</span>
                  </div>
                </div>
              ` : ''}

              <!-- Caja de Definición -->
              <div class="vocab-definition-box">
                <p class="vocab-definition-text">
                  ${this.escapeHtml(w.definition)}
                </p>
                <div class="vocab-leaf-watermark" aria-hidden="true">
                  <svg class="icon-md" aria-hidden="true"><use href="./assets/icons/icons.svg#quill"></use></svg>
                </div>
              </div>

              <!-- Cita de Contexto (Si existe) -->
              ${w.contextSentence ? `
                <div class="vocab-context-box">
                  «${this.escapeHtml(w.contextSentence)}»
                </div>
              ` : ''}

              <!-- Pie: Libro y Fecha -->
              <div class="vocab-card-footer">
                <div class="vocab-footer-source">
                  <span title="${this.escapeHtml(bookTitle)}">📖 ${this.escapeHtml(bookTitle)}</span>
                </div>
                <span class="vocab-footer-date">${formattedDate}</span>
              </div>

              <!-- Botones de Acción Inferiores (Escuchar y Copiar) -->
              <div class="vocab-card-actions">
                <button class="btn-listen-word vocab-pill-btn btn btn--sm btn--ghost" data-action="speak-word" data-word="${escAttr(w.word)}" title="Escuchar pronunciación">
                  ${Icons.SPEAKER}
                  <span>Escuchar</span>
                </button>
                <button class="btn-copy-word vocab-pill-btn btn btn--sm btn--ghost" data-action="copy-word" data-word="${escAttr(w.word)}" data-definition="${escAttr(w.definition || '')}" title="Copiar palabra y definición">
                  ${Icons.COPY}
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
    let style = document.getElementById('vocab-view-styles');
    if (!style) {
      style = document.createElement('style');
      style.id = 'vocab-view-styles';
      document.head.appendChild(style);
    }
    style.textContent = `
      .vocab-card { position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .vocab-card::before { content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 5px; background-color: var(--color-primary-light); border-radius: 16px 0 0 16px; }
      .vocab-card:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08) !important; border-color: color-mix(in srgb, var(--color-primary-light) 40%, var(--color-border)) !important; }
      #input-vocab-search:focus { border-color: var(--color-border-focus) !important; }
    `;
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
    overlay.className = 'theme-modal-overlay-custom active';

    overlay.innerHTML = `
      <div class="theme-modal-dialog vocab-modal-dialog">
        <div class="theme-modal-header mb-3">
          <div>
            <h2 class="theme-modal-title text-base">${isEditing ? 'Editar palabra' : 'Añadir palabra al vocabulario'}</h2>
            <p class="theme-modal-subtitle">${isEditing ? 'Modifica los campos y guarda los cambios.' : 'Completa los campos para agregar un nuevo término.'}</p>
          </div>
          <button class="theme-modal-close btn--close" id="btn-close-add-word" aria-label="Cerrar modal">
            ${Icons.CLOSE}
          </button>
        </div>

        <div class="vocab-modal-form-group">
          <!-- Palabra -->
          <div>
            <label class="vocab-modal-label">Palabra</label>
            <input type="text" id="add-word-input" class="vocab-modal-field" placeholder="Ej. Ataraxia, Epifanía..." value="${isEditing ? escAttr(wordToEdit.word) : ''}">
            <span id="add-word-lookup-status" class="vocab-modal-status-text hidden">Buscando definición...</span>
          </div>

          <!-- Fonética -->
          <div>
            <label class="vocab-modal-label">Fonética</label>
            <input type="text" id="add-word-phonetic" class="vocab-modal-field" placeholder="Ej. /a.taˈɾak.sja/" value="${isEditing ? escAttr(wordToEdit.phonetic || '') : ''}">
          </div>

          <!-- Definición -->
          <div>
            <label class="vocab-modal-label">Definición</label>
            <textarea id="add-word-definition" class="vocab-modal-field textarea-def" placeholder="Significado del término...">${isEditing ? this.escapeHtml(wordToEdit.definition || '') : ''}</textarea>
          </div>

          <!-- Oración de contexto -->
          <div>
            <label class="vocab-modal-label">Oración de contexto</label>
            <textarea id="add-word-context" class="vocab-modal-field textarea-context" placeholder="Ej. Buscaba la ataraxia a través de la lectura sosegada.">${isEditing ? this.escapeHtml(wordToEdit.contextSentence || '') : ''}</textarea>
          </div>
        </div>

        <div class="flex-end-gap">
          <button id="btn-cancel-add-word" class="btn btn--ghost">Cancelar</button>
          <button id="btn-save-add-word" class="btn btn--primary">
            ${Icons.SAVE}
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
    return escapeHtml(text);
  }
}
