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
import { escapeHtml } from '../utils.js';

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
        <svg style="width: 14px; height: 14px;" aria-hidden="true"><use href="./assets/icons/icons.svg#pencil"></use></svg>
        <span>Nota</span>
      </button>

      <!-- Definir Vocabulario -->
      <button class="floating-btn" id="btn-float-define" title="Definición y fonética" aria-label="Definir palabra">
        <svg style="width: 14px; height: 14px;" aria-hidden="true"><use href="./assets/icons/icons.svg#icon-library"></use></svg>
        <span>Definir</span>
      </button>

      <!-- Copiar -->
      <button class="floating-btn floating-btn--icon" id="btn-float-copy" title="Copiar texto" aria-label="Copiar texto">
        <svg style="width: 14px; height: 14px;" aria-hidden="true"><use href="./assets/icons/icons.svg#clipboard-export"></use></svg>
      </button>

      <!-- Cerrar -->
      <button class="floating-btn floating-btn--close" id="btn-float-close" title="Cerrar barra" aria-label="Cerrar barra">
        <svg style="width: 14px; height: 14px;" aria-hidden="true"><use href="./assets/icons/icons.svg#close"></use></svg>
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
                <svg style="width: 16px; height: 16px;" aria-hidden="true"><use href="./assets/icons/icons.svg#speaker"></use></svg>
              </button>
            </div>
            ${defData.phonetic ? `<span style="font-family: monospace; font-size: var(--text-xs); color: var(--color-primary-light);">${this.escapeHtml(defData.phonetic)}</span>` : ''}
          </div>
          <button class="theme-modal-close" id="btn-close-def-modal" aria-label="Cerrar modal">
            <svg style="width: 18px; height: 18px;" aria-hidden="true"><use href="./assets/icons/icons.svg#close"></use></svg>
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
            <svg style="width: 14px; height: 14px;" aria-hidden="true"><use href="./assets/icons/icons.svg#plus"></use></svg>
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
    return escapeHtml(text);
  }
}

export const floatingMenu = new FloatingMenu();
