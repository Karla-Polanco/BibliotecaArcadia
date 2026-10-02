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
              <svg class="icon-lg" fill="currentColor" viewBox="0 0 512 512" aria-hidden="true"><g transform="translate(0,512) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M3854 4896 c-396 -164 -825 -584 -1216 -1189 -43 -67 -79 -126 -81 -131 -2 -6 -53 33 -113 85 -517 452 -1072 695 -1602 702 l-134 2 -24 -28 c-24 -28 -24 -30 -24 -241 l0 -213 -87 -17 c-137 -27 -191 -44 -208 -68 -12 -18 -15 -54 -15 -180 l0 -158 -103 0 c-87 0 -110 -3 -147 -22 -24 -13 -53 -36 -64 -51 -21 -28 -21 -30 -21 -1560 l0 -1532 23 -33 c52 -72 -27 -67 1092 -67 1155 0 1011 -13 1272 112 l158 75 172 -82 c106 -50 199 -88 241 -96 56 -12 233 -14 1046 -12 l977 3 41 27 c80 53 74 -88 71 1616 l-3 1521 -21 28 c-40 53 -79 67 -196 71 l-106 4 -4 160 c-3 159 -3 160 -30 183 -25 21 -123 49 -240 70 l-38 6 0 214 c0 209 -1 215 -23 241 -23 26 -24 26 -156 26 -123 -1 -201 -7 -243 -18 -16 -5 -17 16 -20 265 -3 255 -4 272 -23 290 -35 34 -64 34 -151 -3z m9 -218 c3 -24 5 -642 6 -1374 l1 -1331 -94 -46 c-330 -159 -752 -570 -1060 -1032 l-66 -99 0 1315 0 1315 61 99 c283 459 580 807 881 1034 82 62 242 161 259 161 4 0 9 -19 12 -42z m-2796 -494 c436 -64 891 -299 1309 -678 l101 -91 8 -339 c4 -186 4 -797 0 -1358 l-8 -1019 -36 33 c-61 57 -141 122 -238 192 -412 296 -880 482 -1270 503 l-113 6 0 1389 0 1388 73 -6 c39 -3 118 -12 174 -20z m3241 -1366 l2 -1388 -54 0 c-92 0 -277 -28 -418 -64 -243 -61 -527 -189 -766 -345 -74 -49 -118 -73 -112 -61 33 61 233 295 364 425 215 214 403 351 584 425 42 18 86 41 97 51 20 19 20 34 23 1169 l2 1148 30 7 c36 8 197 23 225 21 20 -1 20 -9 23 -1388z m-3648 -297 c0 -1158 1 -1200 19 -1222 17 -22 28 -24 167 -30 315 -15 559 -81 866 -235 97 -49 288 -160 288 -168 0 -2 -48 12 -107 29 -234 71 -448 104 -724 112 -235 7 -471 -13 -637 -54 l-22 -5 0 1370 0 1371 63 14 c34 9 68 16 75 16 9 1 12 -245 12 -1198z m3880 1184 c19 -4 43 -9 53 -11 16 -5 17 -79 17 -1376 l0 -1370 -23 6 c-13 3 -82 16 -153 28 -175 30 -605 33 -784 5 -140 -22 -311 -59 -421 -92 -45 -14 -84 -24 -85 -22 -7 6 185 117 301 175 290 144 598 222 876 222 93 0 102 2 124 25 l25 24 0 1201 c0 1139 1 1201 18 1196 9 -2 33 -7 52 -11z m-4190 -1784 l0 -1380 24 -28 24 -28 844 0 843 0 93 48 92 47 58 -29 c108 -55 110 -49 -35 -118 -70 -34 -148 -67 -173 -72 -29 -7 -386 -11 -997 -11 l-953 0 0 1475 0 1475 90 0 90 0 0 -1379z m4600 -96 l0 -1475 -956 0 -955 0 -75 25 c-41 14 -118 47 -171 74 l-98 48 80 40 79 40 100 -48 99 -49 856 2 856 3 2 1395 c2 767 5 1401 8 1408 3 8 31 12 90 12 l85 0 0 -1475z m-3492 -999 c156 -24 322 -63 476 -113 224 -74 233 -73 -661 -73 l-764 0 3 72 3 72 55 12 c48 11 211 36 320 48 78 9 470 -4 568 -18z m2987 -10 c82 -14 153 -30 158 -35 4 -4 7 -37 5 -72 l-3 -64 -761 -3 c-890 -3 -884 -3 -658 71 159 52 320 89 479 111 169 24 175 24 410 21 182 -3 246 -8 370 -29z"/><path d="M1071 3613 c-12 -10 -24 -34 -27 -53 -10 -62 11 -75 186 -119 316 -79 606 -221 901 -442 77 -57 114 -79 136 -79 39 0 76 40 76 82 0 39 -35 71 -203 189 -286 200 -605 347 -900 415 -126 29 -141 29 -169 7z"/><path d="M1093 2949 c-27 -10 -53 -47 -53 -76 0 -46 39 -71 140 -93 298 -63 628 -219 925 -435 66 -48 129 -92 141 -97 48 -22 112 41 98 98 -14 53 -348 280 -587 397 -249 123 -598 231 -664 206z"/><path d="M1065 2175 c-26 -25 -32 -63 -15 -94 11 -21 43 -35 120 -51 323 -70 655 -228 971 -464 58 -44 111 -76 125 -76 29 0 71 37 79 71 9 36 -25 73 -149 164 -305 222 -632 378 -956 455 -113 27 -145 26 -175 -5z"/></g></svg>
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
          <svg class="icon-sm text-muted flex-shrink-0 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text" id="input-vocab-search" class="panel-search-input" value="${this.escapeHtml(this.searchQuery)}" placeholder="Buscar en tu cuaderno...">
        </div>
      </div>

      <!-- Tarjetas de Vocabulario -->
      <div class="vocab-cards-grid">
        ${filtered.length === 0 ? `
          <div class="library-empty-state">
            <div class="empty-state-icon">
              <svg class="icon-xl color-primary-light" fill="currentColor" viewBox="0 0 512 512" aria-hidden="true"><g transform="translate(0,512) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M3854 4896 c-396 -164 -825 -584 -1216 -1189 -43 -67 -79 -126 -81 -131 -2 -6 -53 33 -113 85 -517 452 -1072 695 -1602 702 l-134 2 -24 -28 c-24 -28 -24 -30 -24 -241 l0 -213 -87 -17 c-137 -27 -191 -44 -208 -68 -12 -18 -15 -54 -15 -180 l0 -158 -103 0 c-87 0 -110 -3 -147 -22 -24 -13 -53 -36 -64 -51 -21 -28 -21 -30 -21 -1560 l0 -1532 23 -33 c52 -72 -27 -67 1092 -67 1155 0 1011 -13 1272 112 l158 75 172 -82 c106 -50 199 -88 241 -96 56 -12 233 -14 1046 -12 l977 3 41 27 c80 53 74 -88 71 1616 l-3 1521 -21 28 c-40 53 -79 67 -196 71 l-106 4 -4 160 c-3 159 -3 160 -30 183 -25 21 -123 49 -240 70 l-38 6 0 214 c0 209 -1 215 -23 241 -23 26 -24 26 -156 26 -123 -1 -201 -7 -243 -18 -16 -5 -17 16 -20 265 -3 255 -4 272 -23 290 -35 34 -64 34 -151 -3z m9 -218 c3 -24 5 -642 6 -1374 l1 -1331 -94 -46 c-330 -159 -752 -570 -1060 -1032 l-66 -99 0 1315 0 1315 61 99 c283 459 580 807 881 1034 82 62 242 161 259 161 4 0 9 -19 12 -42z m-2796 -494 c436 -64 891 -299 1309 -678 l101 -91 8 -339 c4 -186 4 -797 0 -1358 l-8 -1019 -36 33 c-61 57 -141 122 -238 192 -412 296 -880 482 -1270 503 l-113 6 0 1389 0 1388 73 -6 c39 -3 118 -12 174 -20z m3241 -1366 l2 -1388 -54 0 c-92 0 -277 -28 -418 -64 -243 -61 -527 -189 -766 -345 -74 -49 -118 -73 -112 -61 33 61 233 295 364 425 215 214 403 351 584 425 42 18 86 41 97 51 20 19 20 34 23 1169 l2 1148 30 7 c36 8 197 23 225 21 20 -1 20 -9 23 -1388z m-3648 -297 c0 -1158 1 -1200 19 -1222 17 -22 28 -24 167 -30 315 -15 559 -81 866 -235 97 -49 288 -160 288 -168 0 -2 -48 12 -107 29 -234 71 -448 104 -724 112 -235 7 -471 -13 -637 -54 l-22 -5 0 1370 0 1371 63 14 c34 9 68 16 75 16 9 1 12 -245 12 -1198z m3880 1184 c19 -4 43 -9 53 -11 16 -5 17 -79 17 -1376 l0 -1370 -23 6 c-13 3 -82 16 -153 28 -175 30 -605 33 -784 5 -140 -22 -311 -59 -421 -92 -45 -14 -84 -24 -85 -22 -7 6 185 117 301 175 290 144 598 222 876 222 93 0 102 2 124 25 l25 24 0 1201 c0 1139 1 1201 18 1196 9 -2 33 -7 52 -11z m-4190 -1784 l0 -1380 24 -28 24 -28 844 0 843 0 93 48 92 47 58 -29 c108 -55 110 -49 -35 -118 -70 -34 -148 -67 -173 -72 -29 -7 -386 -11 -997 -11 l-953 0 0 1475 0 1475 90 0 90 0 0 -1379z m4600 -96 l0 -1475 -956 0 -955 0 -75 25 c-41 14 -118 47 -171 74 l-98 48 80 40 79 40 100 -48 99 -49 856 2 856 3 2 1395 c2 767 5 1401 8 1408 3 8 31 12 90 12 l85 0 0 -1475z m-3492 -999 c156 -24 322 -63 476 -113 224 -74 233 -73 -661 -73 l-764 0 3 72 3 72 55 12 c48 11 211 36 320 48 78 9 470 -4 568 -18z m2987 -10 c82 -14 153 -30 158 -35 4 -4 7 -37 5 -72 l-3 -64 -761 -3 c-890 -3 -884 -3 -658 71 159 52 320 89 479 111 169 24 175 24 410 21 182 -3 246 -8 370 -29z"/><path d="M1071 3613 c-12 -10 -24 -34 -27 -53 -10 -62 11 -75 186 -119 316 -79 606 -221 901 -442 77 -57 114 -79 136 -79 39 0 76 40 76 82 0 39 -35 71 -203 189 -286 200 -605 347 -900 415 -126 29 -141 29 -169 7z"/><path d="M1093 2949 c-27 -10 -53 -47 -53 -76 0 -46 39 -71 140 -93 298 -63 628 -219 925 -435 66 -48 129 -92 141 -97 48 -22 112 41 98 98 -14 53 -348 280 -587 397 -249 123 -598 231 -664 206z"/><path d="M1065 2175 c-26 -25 -32 -63 -15 -94 11 -21 43 -35 120 -51 323 -70 655 -228 971 -464 58 -44 111 -76 125 -76 29 0 71 37 79 71 9 36 -25 73 -149 164 -305 222 -632 378 -956 455 -113 27 -145 26 -175 -5z"/></g></svg>
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
                  <svg class="icon-md" fill="currentColor" viewBox="0 0 25.871 25.871"><g><g><path d="M22.521,0c-5.334,1.076-9.402,5.67-9.402,5.67l-0.224,2.31l-0.93-0.979 c-4.267,4.842-4.711,11.917-4.711,11.917c0.064,0.313,0.172,0.559,0.305,0.757l9.966-13.029L8.526,20.335 c0.485,0.121,0.917,0.036,0.917,0.036C19.321,15.67,21.261,9.187,21.261,9.187l-2.03-0.673l2.758-0.42 c0.073-0.23,0.142-0.458,0.203-0.679C23.471,2.883,22.521,0,22.521,0z"></path><path d="M7.56,19.675c-0.97,1.389-3.43,4.533-4.55,6.196l1.363-0.695c0,0,2.321-2.71,4.15-4.841 C8.188,20.251,7.824,20.061,7.56,19.675z"></path></g></g></svg>
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
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
