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

export class FloatingMenu {
  constructor() {
    this.menuEl = null;
    this.noteModalEl = null;
    this.activeSelection = null; // { cfiRange, text, chapterTitle }
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

    // Botones de colores para resaltar (el color es dinámico, el tamaño va por clase)
    const colorsHtml = Object.entries(AnnotationManager.COLORS).map(([name, conf]) => `
      <button class="menu-color-btn" data-color="${name}" title="Resaltar en ${conf.name}" style="background-color: ${conf.border};"
        aria-label="Resaltar ${conf.name}"></button>
    `).join('');

    this.menuEl.innerHTML = `
      <div class="floating-colors">
        ${colorsHtml}
      </div>

      <!-- Subrayar -->
      <button class="floating-btn" id="btn-float-underline" title="Subrayar" aria-label="Subrayar texto"
        style="font-size: 13px; font-weight: bold; text-decoration: underline;">U</button>

      <!-- Nota -->
      <button class="floating-btn" id="btn-float-note" title="Añadir nota" aria-label="Añadir nota">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        <span>Nota</span>
      </button>

      <!-- Definir Vocabulario -->
      <button class="floating-btn" id="btn-float-define" title="Definición y fonética" aria-label="Definir palabra">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
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

    const underlineBtn = this.menuEl.querySelector('#btn-float-underline');
    if (underlineBtn) {
      underlineBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.activeSelection) {
          try {
            await annotationManager.addUnderline(
              this.activeSelection.cfiRange,
              this.activeSelection.text,
              'terracotta',
              this.activeSelection.chapterTitle
            );
            Toast.success('Texto subrayado.');
          } catch (err) {
            console.warn('Error al subrayar:', err);
            Toast.error('No se pudo guardar el subrayado.');
          }
          this.hide();
        }
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
          chapterTitle: document.getElementById('reader-chapter-title')?.textContent || 'Capítulo actual'
        };

        this.showAt(x, y);
      } catch (err) {
        console.warn('Error al calcular coordenadas de selección:', err);
      }
    });

    // Ocultar al cambiar de página
    rendition.on('relocated', () => this.hide());
  }

  showAt(x, y) {
    if (!this.menuEl) return;

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
   */
  async openNoteDialog(selection) {
    const quote = selection.text.length > 120 ? selection.text.substring(0, 120).trimEnd() + '…' : selection.text;
    const noteText = await Modal.prompt({
      title: 'Nota al margen',
      message: `Cita seleccionada:\n«${quote}»`,
      placeholder: 'Escribe tu nota o reflexión personal...',
      multiline: true,
      confirmText: 'Guardar nota'
    });

    if (noteText === null || !noteText.trim()) return;

    try {
      const cleanTitle = noteText.trim().length > 35
        ? noteText.trim().substring(0, 35).trimEnd() + '…'
        : noteText.trim();
      await NoteManager.createNote({
        bookId: annotationManager.currentBookId || 'general',
        cfiRange: selection.cfiRange,
        selectedText: selection.text,
        title: cleanTitle,
        content: noteText.trim()
      });
      // También agregar un resaltado suave en tono ámbar (sin bloquear si falla)
      try {
        await annotationManager.addHighlight(selection.cfiRange, selection.text, 'amber', selection.chapterTitle);
      } catch (_) {}
      Toast.success('Nota guardada con éxito.');
    } catch (err) {
      Toast.error('Error al guardar la nota.');
    }
  }

  /**
   * Menú emergente para eliminar o editar un resaltado existente.
   */
  async showAnnotationOptions(annotation) {
    const short = annotation.text ? annotation.text.substring(0, 60) : 'Pasaje seleccionado';
    const quote = annotation.text && annotation.text.length > 60 ? short.trimEnd() + '…' : short;
    const confirmed = await Modal.confirm({
      title: 'Eliminar anotación',
      message: `Cita: «${quote}»\n\n¿Deseas eliminar este ${annotation.type === 'underline' ? 'subrayado' : 'resaltado'}?`,
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
