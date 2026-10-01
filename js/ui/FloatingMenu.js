/**
 * ============================================================================
 * FLOATING MENU - BARRA CONTEXTUAL FLOTANTE AL SELECCIONAR TEXTO
 * ============================================================================
 * Barra emergente ergonómica posicionada sobre la selección de texto dentro del
 * iframe de epub.js con acciones de Resaltado, Subrayado, Nota y Copiar.
 */

import { annotationManager, AnnotationManager } from '../annotations/AnnotationManager.js';
import { NoteManager } from '../annotations/NoteManager.js';
import { VocabularyManager } from '../vocabulary/VocabularyManager.js';
import { Toast } from './Toast.js';
import { Modal } from './Modal.js';
import { dbManager } from '../db.js';

export class FloatingMenu {
  constructor() {
    this.menuEl = null;
    this.noteModalEl = null;
    this.activeSelection = null; // { cfiRange, text, chapterTitle }
    this.activeColor = 'terracotta'; // color usado por las 3 líneas (recta, tachado, punteada)
    this._linePopup = null; // mini-paleta de color de línea (vive en el body)
    this._lastContents = null; // último contents del iframe (para limpiar la selección al cerrar)
    this._initElements();
  }

  _initElements() {
    // 1. Contenedor de la Barra Flotante
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'reader-floating-menu';
    this.menuEl.setAttribute('role', 'toolbar');
    this.menuEl.setAttribute('aria-label', 'Acciones de texto');
    // El aspecto visual vive en reader.css (.reader-floating-menu);
    // aquí solo se posiciona vía showAt/hide.

    // Botones de colores: solo resaltan (el color de líneas va aparte).
    // El negro ('note') es exclusivo de las notas: no se ofrece en las paletas.
    const paletteEntries = Object.entries(AnnotationManager.COLORS).filter(([name]) => name !== 'note');
    const colorsHtml = paletteEntries.map(([name, conf]) => `
      <button class="menu-color-btn" data-color="${name}" title="Resaltar en ${conf.name}" style="background-color: ${conf.border};"
        aria-label="Resaltar ${conf.name}"></button>
    `).join('');

    // Mini-paleta para el color de las líneas (no resalta, solo elige color)
    const lineColorsHtml = paletteEntries.map(([name, conf]) => `
      <button class="line-color-dot" data-color="${name}" title="${conf.name}" style="background-color: ${conf.border};"
        aria-label="Línea en ${conf.name}"></button>
    `).join('');

    this.menuEl.innerHTML = `
      <div class="floating-colors">
        ${colorsHtml}
      </div>

      <!-- Color de línea (propio, no resalta al elegirlo) -->
      <button class="floating-btn line-color-btn" id="btn-line-color" title="Color de línea" aria-label="Color de línea">
        <span class="line-color-preview" id="line-color-preview"></span>
      </button>

      <!-- 3 Opciones de Subrayado / Decoración (Imagen 4) -->
      <button class="floating-btn floating-btn--underline" id="btn-float-underline" data-style="underline" title="Subrayado recto" aria-label="Subrayado recto"
        style="font-family: serif; font-size: 14px; font-weight: bold; text-decoration: underline; text-underline-offset: 2px;">T</button>
      <button class="floating-btn floating-btn--underline" id="btn-float-strikethrough" data-style="strikethrough" title="Tachado" aria-label="Tachado"
        style="font-family: serif; font-size: 14px; font-weight: bold; text-decoration: line-through;">T</button>
      <button class="floating-btn floating-btn--underline" id="btn-float-wavy" data-style="wavy" title="Subrayado punteado" aria-label="Subrayado punteado"
        style="font-family: serif; font-size: 14px; font-weight: bold; text-decoration: underline dotted; text-underline-offset: 3px; text-decoration-thickness: 2.5px;">T</button>

      <!-- Nota -->
      <button class="floating-btn" id="btn-float-note" title="Añadir nota" aria-label="Añadir nota">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        <span>Nota</span>
      </button>

      <!-- Definir Vocabulario -->
      <button class="floating-btn" id="btn-float-define" title="Definición y fonética" aria-label="Definir palabra">
        <svg style="width: 14px; height: 14px;" fill="currentColor" viewBox="0 0 512 512" aria-hidden="true"><g transform="translate(0,512) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M3854 4896 c-396 -164 -825 -584 -1216 -1189 -43 -67 -79 -126 -81 -131 -2 -6 -53 33 -113 85 -517 452 -1072 695 -1602 702 l-134 2 -24 -28 c-24 -28 -24 -30 -24 -241 l0 -213 -87 -17 c-137 -27 -191 -44 -208 -68 -12 -18 -15 -54 -15 -180 l0 -158 -103 0 c-87 0 -110 -3 -147 -22 -24 -13 -53 -36 -64 -51 -21 -28 -21 -30 -21 -1560 l0 -1532 23 -33 c52 -72 -27 -67 1092 -67 1155 0 1011 -13 1272 112 l158 75 172 -82 c106 -50 199 -88 241 -96 56 -12 233 -14 1046 -12 l977 3 41 27 c80 53 74 -88 71 1616 l-3 1521 -21 28 c-40 53 -79 67 -196 71 l-106 4 -4 160 c-3 159 -3 160 -30 183 -25 21 -123 49 -240 70 l-38 6 0 214 c0 209 -1 215 -23 241 -23 26 -24 26 -156 26 -123 -1 -201 -7 -243 -18 -16 -5 -17 16 -20 265 -3 255 -4 272 -23 290 -35 34 -64 34 -151 -3z m9 -218 c3 -24 5 -642 6 -1374 l1 -1331 -94 -46 c-330 -159 -752 -570 -1060 -1032 l-66 -99 0 1315 0 1315 61 99 c283 459 580 807 881 1034 82 62 242 161 259 161 4 0 9 -19 12 -42z m-2796 -494 c436 -64 891 -299 1309 -678 l101 -91 8 -339 c4 -186 4 -797 0 -1358 l-8 -1019 -36 33 c-61 57 -141 122 -238 192 -412 296 -880 482 -1270 503 l-113 6 0 1389 0 1388 73 -6 c39 -3 118 -12 174 -20z m3241 -1366 l2 -1388 -54 0 c-92 0 -277 -28 -418 -64 -243 -61 -527 -189 -766 -345 -74 -49 -118 -73 -112 -61 33 61 233 295 364 425 215 214 403 351 584 425 42 18 86 41 97 51 20 19 20 34 23 1169 l2 1148 30 7 c36 8 197 23 225 21 20 -1 20 -9 23 -1388z m-3648 -297 c0 -1158 1 -1200 19 -1222 17 -22 28 -24 167 -30 315 -15 559 -81 866 -235 97 -49 288 -160 288 -168 0 -2 -48 12 -107 29 -234 71 -448 104 -724 112 -235 7 -471 -13 -637 -54 l-22 -5 0 1370 0 1371 63 14 c34 9 68 16 75 16 9 1 12 -245 12 -1198z m3880 1184 c19 -4 43 -9 53 -11 16 -5 17 -79 17 -1376 l0 -1370 -23 6 c-13 3 -82 16 -153 28 -175 30 -605 33 -784 5 -140 -22 -311 -59 -421 -92 -45 -14 -84 -24 -85 -22 -7 6 185 117 301 175 290 144 598 222 876 222 93 0 102 2 124 25 l25 24 0 1201 c0 1139 1 1201 18 1196 9 -2 33 -7 52 -11z m-4190 -1784 l0 -1380 24 -28 24 -28 844 0 843 0 93 48 92 47 58 -29 c108 -55 110 -49 -35 -118 -70 -34 -148 -67 -173 -72 -29 -7 -386 -11 -997 -11 l-953 0 0 1475 0 1475 90 0 90 0 0 -1379z m4600 -96 l0 -1475 -956 0 -955 0 -75 25 c-41 14 -118 47 -171 74 l-98 48 80 40 79 40 100 -48 99 -49 856 2 856 3 2 1395 c2 767 5 1401 8 1408 3 8 31 12 90 12 l85 0 0 -1475z m-3492 -999 c156 -24 322 -63 476 -113 224 -74 233 -73 -661 -73 l-764 0 3 72 3 72 55 12 c48 11 211 36 320 48 78 9 470 -4 568 -18z m2987 -10 c82 -14 153 -30 158 -35 4 -4 7 -37 5 -72 l-3 -64 -761 -3 c-890 -3 -884 -3 -658 71 159 52 320 89 479 111 169 24 175 24 410 21 182 -3 246 -8 370 -29z"/><path d="M1071 3613 c-12 -10 -24 -34 -27 -53 -10 -62 11 -75 186 -119 316 -79 606 -221 901 -442 77 -57 114 -79 136 -79 39 0 76 40 76 82 0 39 -35 71 -203 189 -286 200 -605 347 -900 415 -126 29 -141 29 -169 7z"/><path d="M1093 2949 c-27 -10 -53 -47 -53 -76 0 -46 39 -71 140 -93 298 -63 628 -219 925 -435 66 -48 129 -92 141 -97 48 -22 112 41 98 98 -14 53 -348 280 -587 397 -249 123 -598 231 -664 206z"/><path d="M1065 2175 c-26 -25 -32 -63 -15 -94 11 -21 43 -35 120 -51 323 -70 655 -228 971 -464 58 -44 111 -76 125 -76 29 0 71 37 79 71 9 36 -25 73 -149 164 -305 222 -632 378 -956 455 -113 27 -145 26 -175 -5z"/></g></svg>
        <span>Definir</span>
      </button>

      <!-- Copiar -->
      <button class="floating-btn floating-btn--icon" id="btn-float-copy" title="Copiar texto" aria-label="Copiar texto">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
      </button>

      <!-- Cerrar -->
      <button class="floating-btn floating-btn--close" id="btn-float-close" title="Cerrar barra" aria-label="Cerrar barra">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    `;

    document.body.appendChild(this.menuEl);

    // Mini-paleta en el body (fuera del menú: el backdrop-filter del menú
    // rompería su posicionamiento fixed si viviera dentro)
    this._linePopup = document.createElement('div');
    this._linePopup.className = 'line-color-popup';
    this._linePopup.hidden = true;
    this._linePopup.innerHTML = lineColorsHtml;
    document.body.appendChild(this._linePopup);

    // Eventos de botones
    this.menuEl.querySelectorAll('.menu-color-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const color = btn.dataset.color;
        if (this.activeSelection) {
          try {
            await annotationManager.addHighlight(
              this.activeSelection.cfiRange,
              this.activeSelection.text,
              color,
              this.activeSelection.chapterTitle
            );
            Toast.success('Texto resaltado.');
          } catch (err) {
            console.warn('Error al resaltar:', err);
            Toast.error('No se pudo guardar el resaltado.');
          }
          this.hide();
        }
      });
    });

    // 3 Estilos de Subrayado (usan el color activo, no un fijo)
    this.menuEl.querySelectorAll('.floating-btn--underline').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const style = btn.dataset.style || 'underline';
        if (this.activeSelection) {
          try {
            await annotationManager.addUnderline(
              this.activeSelection.cfiRange,
              this.activeSelection.text,
              this.activeColor,
              this.activeSelection.chapterTitle,
              style
            );
            const colorName = (AnnotationManager.COLORS[this.activeColor] || {}).name || '';
            const suffix = colorName ? ` (${colorName})` : '';
            const msg = style === 'strikethrough' ? `Texto tachado${suffix}.` : (style === 'wavy' ? `Subrayado punteado${suffix}.` : `Subrayado recto${suffix}.`);
            Toast.success(msg);
          } catch (err) {
            console.warn('Error al subrayar:', err);
            Toast.error('No se pudo guardar el subrayado.');
          }
          this.hide();
        }
      });
    });

    // Picker de color de línea: elige color sin resaltar el texto
    const lineColorBtn = this.menuEl.querySelector('#btn-line-color');
    const lineColorPopup = this._linePopup;
    if (lineColorBtn && lineColorPopup) {
      lineColorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleLineColorPopup();
      });
      lineColorPopup.querySelectorAll('.line-color-dot').forEach(dot => {
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setActiveColor(dot.dataset.color);
          this._hideLineColorPopup();
        });
      });
      // Cerrar la paleta al tocar fuera (sin cerrar la barra)
      document.addEventListener('click', (e) => {
        if (lineColorPopup.hidden) return;
        if (lineColorPopup.contains(e.target) || lineColorBtn.contains(e.target)) return;
        this._hideLineColorPopup();
      });
    }

    const noteBtn = this.menuEl.querySelector('#btn-float-note');
    if (noteBtn) {
      noteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.activeSelection) {
          const sel = { ...this.activeSelection };
          this.hide();
          this.openNoteDialog(sel);
        }
      });
    }

    const defineBtn = this.menuEl.querySelector('#btn-float-define');
    if (defineBtn) {
      defineBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.activeSelection && this.activeSelection.text) {
          const sel = { ...this.activeSelection };
          this.hide();
          await this.openDefinitionModal(sel);
        }
      });
    }

    const copyBtn = this.menuEl.querySelector('#btn-float-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.activeSelection && this.activeSelection.text) {
          try {
            await navigator.clipboard.writeText(this.activeSelection.text);
            Toast.success('Copiado al portapapeles.');
          } catch (err) {
            Toast.error('No se pudo copiar el texto.');
          }
          this.hide();
        }
      });
    }

    const closeBtn = this.menuEl.querySelector('#btn-float-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dismiss();
      });
    }

    // Escuchar clics en anotaciones existentes para eliminarlas
    window.addEventListener('arcadia:annotation-clicked', (e) => {
      this.showAnnotationOptions(e.detail.annotation);
    });

    // Cerrar la barra con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.hide();
    });
  }

  /**
   * Conecta los eventos de selección del Rendition de epub.js.
   * @param {Object} rendition - Instancia de Rendition
   */
  attach(rendition) {
    rendition.on('selected', (cfiRange, contents) => {
      this._lastContents = contents;
      const selection = contents.window.getSelection();
      const text = selection ? selection.toString().trim() : '';

      if (!text) {
        this.hide();
        return;
      }

      // Obtener coordenadas de la selección
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const iframe = contents.document.defaultView.frameElement;
        const iframeRect = iframe.getBoundingClientRect();

        const x = iframeRect.left + rect.left + rect.width / 2;
        const y = Math.max(70, iframeRect.top + rect.top - 12);

        this.activeSelection = {
          cfiRange,
          text,
          chapterTitle: document.getElementById('reader-chapter-title')?.textContent || 'Capítulo 1'
        };

        this.showAt(x, y);
      } catch (err) {
        console.warn('Error al calcular coordenadas de selección:', err);
      }
    });

    // Ocultar al cambiar de página
    rendition.on('relocated', () => this.hide());
  }

  /**
   * Fija el color activo para las líneas y refresca su previsualización.
   */
  setActiveColor(color) {
    if (!AnnotationManager.COLORS[color]) return;
    if (color === 'note') return; // negro reservado a notas, no seleccionable
    this.activeColor = color;
    this._refreshLineColorUI();
  }

  /**
   * Marca el punto de color activo y tiñe las 3 T con ese color para
   * previsualizar cómo quedará la línea en el texto.
   * @private
   */
  _refreshLineColorUI() {
    if (!this.menuEl) return;
    if (this.activeColor === 'note') this.activeColor = 'terracotta';
    const conf = AnnotationManager.COLORS[this.activeColor] || {};
    const hex = conf.border || '#FF8E6B';
    const name = conf.name || '';
    const preview = this.menuEl.querySelector('#line-color-preview');
    if (preview) preview.style.backgroundColor = hex;
    const picker = this.menuEl.querySelector('#btn-line-color');
    if (picker) {
      picker.title = name ? `Color de línea: ${name}` : 'Color de línea';
      picker.setAttribute('aria-label', picker.title);
    }
    this._linePopup?.querySelectorAll('.line-color-dot').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === this.activeColor);
    });
    this.menuEl.querySelectorAll('.floating-btn--underline').forEach(b => {
      b.style.color = hex;
      b.style.textDecorationColor = hex;
      const base = b.dataset.style === 'strikethrough' ? 'Tachado' : (b.dataset.style === 'wavy' ? 'Subrayado punteado' : 'Subrayado recto');
      b.title = name ? `${base} en ${name}` : base;
      b.setAttribute('aria-label', b.title);
    });
  }

  /**
   * Muestra u oculta la mini-paleta de color de línea junto a la barra.
   * @private
   */
  _toggleLineColorPopup() {
    const popup = this._linePopup;
    const picker = this.menuEl?.querySelector('#btn-line-color');
    if (!popup || !picker) return;
    if (!popup.hidden) {
      popup.hidden = true;
      return;
    }
    popup.hidden = false;
    // Posicionar bajo el botón, centrada y sin salirse de la pantalla
    const r = picker.getBoundingClientRect();
    const pw = popup.offsetWidth || 220;
    const cx = Math.max(pw / 2 + 8, Math.min(window.innerWidth - pw / 2 - 8, r.left + r.width / 2));
    popup.style.left = `${cx}px`;
    popup.style.top = `${Math.min(window.innerHeight - 60, r.bottom + 8)}px`;
  }

  /**
   * @private
   */
  _hideLineColorPopup() {
    if (this._linePopup) this._linePopup.hidden = true;
  }

  showAt(x, y) {
    if (!this.menuEl) return;

    // Refrescar el color activo de las líneas en cada apertura
    this._refreshLineColorUI();

    // En móvil se oculta la opción de Copiar para no estorbar al subrayar
    const copyBtn = this.menuEl.querySelector('#btn-float-copy');
    if (copyBtn) {
      copyBtn.style.display = window.innerWidth <= 768 ? 'none' : '';
    }

    // Hacer visible brevemente para medir el ancho real
    this.menuEl.style.opacity = '0';
    this.menuEl.style.transform = 'translate(-50%, -100%) scale(1)';
    this.menuEl.style.pointerEvents = 'none';
    this.menuEl.style.display = 'flex';

    const menuWidth = this.menuEl.offsetWidth;
    const viewportWidth = window.innerWidth;
    const margin = 8;

    // Clampear X para que la barra no se salga de la pantalla
    const minX = menuWidth / 2 + margin;
    const maxX = viewportWidth - menuWidth / 2 - margin;
    const clampedX = Math.max(minX, Math.min(maxX, x));

    this.menuEl.style.left = `${clampedX}px`;
    this.menuEl.style.top = `${y}px`;
    this.menuEl.style.opacity = '1';
    this.menuEl.style.pointerEvents = 'auto';
    this.menuEl.style.transform = 'translate(-50%, -100%) scale(1)';
  }

  hide() {
    if (!this.menuEl) return;
    this._hideLineColorPopup();
    this.menuEl.style.opacity = '0';
    this.menuEl.style.pointerEvents = 'none';
    this.menuEl.style.transform = 'translate(-50%, -100%) scale(0.92)';
    this.activeSelection = null;
  }

  /**
   * Cierra la barra y limpia la selección del libro para que no reaparezca.
   */
  dismiss() {
    try {
      const w = this._lastContents && this._lastContents.window;
      const sel = w && w.getSelection ? w.getSelection() : null;
      if (sel && sel.removeAllRanges) sel.removeAllRanges();
    } catch (_) {}
    this.hide();
  }

  /**
   * Diálogo modal para redactar una nota vinculada.
   * Al guardar, el pasaje queda subrayado con línea negra fina
   * (marca 'note-underline') y al pulsarla se abre el mini-modal.
   * Si se pasa existingNote, edita en lugar de crear.
   */
  async openNoteDialog(selection, existingNote = null) {
    const quote = selection.text.length > 120 ? selection.text.substring(0, 120).trimEnd() + '…' : selection.text;
    const noteText = await Modal.noteDialog({
      quote,
      defaultValue: existingNote ? (existingNote.content || '') : '',
      placeholder: 'Escribe tu nota aquí...'
    });

    if (noteText === null || !noteText.trim()) return;

    try {
      const cleanTitle = noteText.trim().length > 35
        ? noteText.trim().substring(0, 35).trimEnd() + '…'
        : noteText.trim();
      const bookId = annotationManager.currentBookId || existingNote?.bookId || 'general';

      if (existingNote) {
        await NoteManager.updateNote(existingNote.id, {
          content: noteText.trim(),
          title: cleanTitle,
          selectedText: selection.text || existingNote.selectedText,
          cfiRange: selection.cfiRange || existingNote.cfiRange
        });
        // Asegurar que la marca negra existe tras editar (por si era nota antigua)
        const mark = annotationManager.findNoteMark(existingNote.id, selection.cfiRange || existingNote.cfiRange);
        if (!mark && (selection.cfiRange || existingNote.cfiRange)) {
          try {
            await annotationManager.addNoteMark(
              selection.cfiRange || existingNote.cfiRange,
              selection.text || existingNote.selectedText || '',
              selection.chapterTitle || 'Capítulo 1',
              existingNote.id
            );
          } catch (_) {}
        }
        Toast.success('Nota actualizada.');
      } else {
        const note = await NoteManager.createNote({
          bookId,
          cfiRange: selection.cfiRange,
          selectedText: selection.text,
          title: cleanTitle,
          content: noteText.trim()
        });
        // Subrayado negro fino sobre el pasaje
        try {
          await annotationManager.addNoteMark(
            selection.cfiRange,
            selection.text,
            selection.chapterTitle || 'Capítulo 1',
            note.id
          );
        } catch (markErr) {
          console.warn('Nota guardada pero no se pudo marcar el pasaje:', markErr);
        }
        Toast.success('Nota guardada con éxito.');
      }
    } catch (err) {
      Toast.error('Error al guardar la nota.');
    }
  }

  /**
   * Localiza la nota vinculada a una marca de subrayado negro.
   * @private
   */
  async _findLinkedNote(annotation) {
    if (!annotation) return null;
    try {
      if (annotation.noteId) {
        const byId = await dbManager.get('notes', annotation.noteId).catch(() => null);
        if (byId) return byId;
      }
      const bookId = annotationManager.currentBookId || annotation.bookId;
      if (bookId && annotation.cfiRange) {
        const notes = await NoteManager.getNotesForBook(bookId).catch(() => []);
        const match = (notes || []).find(n => n.cfiRange === annotation.cfiRange);
        if (match) return match;
        if (annotation.noteId) {
          const byIdLoose = (notes || []).find(n => n.id === annotation.noteId);
          if (byIdLoose) return byIdLoose;
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Mini-modal de lectura de nota (maqueta NOTA): cita + contenido
   * + Eliminar / Editar / Cerrar.
   */
  async showNoteViewModal(note, annotation) {
    const action = await Modal.viewNote({
      quote: note.selectedText || annotation.text || '',
      content: note.content || ''
    });

    if (action === 'edit') {
      await this.openNoteDialog({
        cfiRange: note.cfiRange || annotation.cfiRange,
        text: note.selectedText || annotation.text || '',
        chapterTitle: annotation.chapterTitle || 'Capítulo 1'
      }, note);
    } else if (action === 'delete') {
      const confirmed = await Modal.confirm({
        title: 'Eliminar nota',
        message: '¿Estás seguro de que deseas eliminar esta nota y su subrayado?',
        danger: true,
        confirmText: 'Eliminar'
      });
      if (!confirmed) return;
      try {
        // Borrar la nota y su(s) marca(s) negra(s) para no dejar subrayado fantasma
        await NoteManager.deleteNote(note.id);
        const bookId = annotationManager.currentBookId || note.bookId;
        if (bookId) {
          const marks = (annotationManager.annotations || []).filter(a =>
            a.type === 'note-underline' &&
            (a.noteId === note.id || (note.cfiRange && a.cfiRange === note.cfiRange))
          );
          for (const m of marks) {
            try { await annotationManager.removeAnnotation(m.id); } catch (_) {}
          }
          // Por si la marca en memoria no estaba cargada, intentar borrado directo por CFI conocido
          if (marks.length === 0 && annotation && annotation.id) {
            try { await annotationManager.removeAnnotation(annotation.id); } catch (_) {}
          }
        } else if (annotation && annotation.id) {
          try { await annotationManager.removeAnnotation(annotation.id); } catch (_) {}
        }
        Toast.success('Nota eliminada.');
      } catch (err) {
        console.warn('Error al eliminar nota:', err);
        Toast.error('No se pudo eliminar la nota.');
      }
    }
  }

  /**
   * Menú emergente al pulsar un pasaje marcado.
   * - Marca negra de nota -> mini-modal NOTA (ver / editar / eliminar).
   * - Resaltados y subrayados -> confirmación de eliminación (comportamiento previo).
   */
  async showAnnotationOptions(annotation) {
    // 1. Marca de nota: abrir el pequeño modal con la nota
    if (annotation && annotation.type === 'note-underline') {
      const note = await this._findLinkedNote(annotation);
      if (note) {
        await this.showNoteViewModal(note, annotation);
      } else {
        // Marca huérfana (nota borrada externamente): ofrecer quitar el subrayado
        const confirmed = await Modal.confirm({
          title: 'Quitar subrayado',
          message: 'Esta marca ya no tiene nota asociada. ¿Deseas quitar el subrayado del pasaje?',
          danger: true,
          confirmText: 'Quitar'
        });
        if (confirmed) {
          await annotationManager.removeAnnotation(annotation.id);
          Toast.success('Subrayado eliminado.');
        }
      }
      return;
    }

    const short = annotation.text ? annotation.text.substring(0, 60) : 'Pasaje seleccionado';
    const quote = annotation.text && annotation.text.length > 60 ? short.trimEnd() + '…' : short;
    const typeNoun = annotation.type === 'highlight'
      ? 'resaltado'
      : (annotation.type === 'strikethrough' ? 'tachado' : 'subrayado');
    const confirmed = await Modal.confirm({
      title: 'Eliminar anotación',
      message: `Cita: «${quote}»\n\n¿Deseas eliminar este ${typeNoun}?`,
      danger: true,
      confirmText: 'Eliminar'
    });

    if (confirmed) {
      await annotationManager.removeAnnotation(annotation.id);
      Toast.success('Anotación eliminada.');
    }
  }

  /**
   * Abre modal de definición léxica y pronunciación fonética con campos editables.
   */
  async openDefinitionModal(selection) {
    const rawWord = selection.text.trim();
    if (!rawWord) return;

    Toast.info(`Buscando «${rawWord}»...`);
    const defData = await VocabularyManager.lookupDefinition(rawWord);

    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay';

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 440px;">
        <div class="theme-modal-header" style="margin-bottom: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 class="theme-modal-title" style="font-family: 'Cinzel', serif; font-size: 1.35rem; letter-spacing: 0.03em; text-transform: capitalize;">${this.escapeHtml(defData.word)}</h2>
              <button id="btn-speak-word" title="Escuchar pronunciación fonética" style="
                width: 32px; height: 32px; border-radius: 50%; background: var(--color-surface-hover); border: 1px solid var(--color-border); color: var(--color-gold, #D4AF37); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.18s ease;
              ">
                <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              </button>
            </div>
            ${defData.phonetic ? `<span style="font-family: monospace; font-size: var(--text-xs); color: var(--color-primary-light);">${this.escapeHtml(defData.phonetic)}</span>` : ''}
          </div>
          <button class="theme-modal-close" id="btn-close-def-modal" aria-label="Cerrar modal">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style="margin-bottom: 20px; display: flex; flex-direction: column; gap: 12px;">
          <!-- Definición editable -->
          <div class="arcadia-modal-field" style="margin-bottom: 0;">
            <label style="color: var(--color-gold, #D4AF37);">Definición</label>
            <textarea id="def-modal-definition" rows="3" style="width: 100%; min-height: 70px; resize: vertical; box-sizing: border-box;">${this.escapeHtml(defData.definition)}</textarea>
          </div>

          <!-- Contexto en el libro (siempre visible y editable) -->
          <div class="arcadia-modal-field" style="margin-bottom: 0;">
            <label>Contexto en el libro</label>
            <textarea id="def-modal-context" rows="2" style="width: 100%; min-height: 50px; font-style: italic; resize: vertical; box-sizing: border-box; color: var(--color-text-secondary);">${this.escapeHtml(selection.text)}</textarea>
          </div>
        </div>

        <div class="arcadia-modal-actions">
          <button id="btn-cancel-def" class="arcadia-modal-btn arcadia-modal-btn--ghost">Cerrar</button>
          <button id="btn-save-vocab" class="arcadia-modal-btn arcadia-modal-btn--primary" style="display: inline-flex; align-items: center; gap: 6px;">
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 4v16m8-8H4"/></svg>
            <span>Guardar</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

    const closeModal = () => overlay.remove();
    overlay.querySelector('#btn-close-def-modal').addEventListener('click', closeModal);
    overlay.querySelector('#btn-cancel-def').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Pronunciación con Web Speech API
    const speakBtn = overlay.querySelector('#btn-speak-word');
    speakBtn.addEventListener('click', () => {
      VocabularyManager.speakWord(defData.word);
    });

    // Guardar en vocabulario (usando valores editados de los textareas)
    overlay.querySelector('#btn-save-vocab').addEventListener('click', async () => {
      const editedDefinition = overlay.querySelector('#def-modal-definition').value.trim();
      const editedContext = overlay.querySelector('#def-modal-context').value.trim();

      try {
        await VocabularyManager.addWord({
          word: defData.word,
          contextSentence: editedContext || selection.text,
          definition: editedDefinition || defData.definition,
          phonetic: defData.phonetic,
          bookId: annotationManager.currentBookId || 'general'
        });
        Toast.success(`«${defData.word}» guardada en tu vocabulario.`);
        closeModal();
      } catch (e) {
        Toast.error('No se pudo guardar en vocabulario.');
      }
    });
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

export const floatingMenu = new FloatingMenu();
