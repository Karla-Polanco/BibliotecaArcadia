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

export class FloatingMenu {
  constructor() {
    this.menuEl = null;
    this.noteModalEl = null;
    this.activeSelection = null; // { cfiRange, text, chapterTitle }
    this._initElements();
  }

  _initElements() {
    // 1. Contenedor de la Barra Flotante
    this.menuEl = document.createElement('div');
    this.menuEl.className = 'reader-floating-menu';
    this.menuEl.setAttribute('role', 'toolbar');
    this.menuEl.setAttribute('aria-label', 'Acciones de texto');
    this.menuEl.style.cssText = `
      position: fixed;
      z-index: 250;
      background-color: var(--color-surface-elevated, #242424);
      border: 1px solid var(--color-border, #303030);
      border-radius: var(--radius-full, 9999px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0;
      pointer-events: none;
      transform: translate(-50%, -100%) scale(0.92);
      transition: opacity 0.15s ease, transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    // Botones de colores para resaltar
    const colorsHtml = Object.entries(AnnotationManager.COLORS).map(([name, conf]) => `
      <button class="menu-color-btn" data-color="${name}" title="Resaltar en ${conf.name}" style="
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background-color: ${conf.border};
        border: 2px solid rgba(255, 255, 255, 0.3);
        cursor: pointer;
        transition: transform 0.15s ease;
      " aria-label="Resaltar ${conf.name}"></button>
    `).join('');

    this.menuEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 5px; padding-right: 6px; border-right: 1px solid var(--color-border, #303030);">
        ${colorsHtml}
      </div>

      <!-- Subrayar -->
      <button class="floating-btn" id="btn-float-underline" title="Subrayar" aria-label="Subrayar texto" style="
        padding: 6px 8px; border-radius: 6px; color: var(--color-text); cursor: pointer; font-size: 13px; font-weight: bold; text-decoration: underline;
      ">U</button>

      <!-- Nota -->
      <button class="floating-btn" id="btn-float-note" title="Añadir nota" aria-label="Añadir nota" style="
        padding: 6px 8px; border-radius: 6px; color: var(--color-text); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px;
      ">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        <span>Nota</span>
      </button>

      <!-- Definir Vocabulario -->
      <button class="floating-btn" id="btn-float-define" title="Definición y fonética" aria-label="Definir palabra" style="
        padding: 6px 8px; border-radius: 6px; color: var(--color-text); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 12px;
      ">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
        <span>Definir</span>
      </button>

      <!-- Copiar -->
      <button class="floating-btn" id="btn-float-copy" title="Copiar texto" aria-label="Copiar texto" style="
        padding: 6px 8px; border-radius: 6px; color: var(--color-text-muted); cursor: pointer;
      ">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
      </button>
    `;

    document.body.appendChild(this.menuEl);

    // Eventos de botones
    this.menuEl.querySelectorAll('.menu-color-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const color = btn.dataset.color;
        if (this.activeSelection) {
          await annotationManager.addHighlight(
            this.activeSelection.cfiRange,
            this.activeSelection.text,
            color,
            this.activeSelection.chapterTitle
          );
          Toast.success('Texto resaltado.');
          this.hide();
        }
      });
    });

    const underlineBtn = this.menuEl.querySelector('#btn-float-underline');
    if (underlineBtn) {
      underlineBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (this.activeSelection) {
          await annotationManager.addUnderline(
            this.activeSelection.cfiRange,
            this.activeSelection.text,
            'purple',
            this.activeSelection.chapterTitle
          );
          Toast.success('Texto subrayado.');
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

    // Escuchar clics en anotaciones existentes para eliminarlas
    window.addEventListener('arcadia:annotation-clicked', (e) => {
      this.showAnnotationOptions(e.detail.annotation);
    });
  }

  /**
   * Conecta los eventos de selección del Rendition de epub.js.
   * @param {Object} rendition - Instancia de Rendition
   */
  attach(rendition) {
    rendition.on('selected', (cfiRange, contents) => {
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
    this.menuEl.style.left = `${x}px`;
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
   * Diálogo modal para redactar una nota vinculada.
   */
  openNoteDialog(selection) {
    const quote = selection.text.length > 120 ? selection.text.substring(0, 120) + '...' : selection.text;
    const noteText = prompt(`Crear nota para la cita:\n\n"${quote}"\n\nEscribe tu nota aquí:`);

    if (noteText === null || !noteText.trim()) return;

    NoteManager.createNote({
      bookId: annotationManager.currentBookId,
      cfiRange: selection.cfiRange,
      selectedText: selection.text,
      title: noteText.trim().substring(0, 35) + '...',
      content: noteText.trim()
    }).then(() => {
      // También agregar un resaltado suave en amarillo
      annotationManager.addHighlight(selection.cfiRange, selection.text, 'yellow', selection.chapterTitle);
      Toast.success('Nota guardada con éxito.');
    }).catch(err => {
      Toast.error('Error al guardar la nota.');
    });
  }

  /**
   * Menú emergente para eliminar o editar un resaltado existente.
   */
  showAnnotationOptions(annotation) {
    const confirmed = confirm(`Anotación: "${annotation.text.substring(0, 60)}..."\n\n¿Deseas eliminar este ${annotation.type === 'underline' ? 'subrayado' : 'resaltado'}?`);
    if (confirmed) {
      annotationManager.removeAnnotation(annotation.id).then(() => {
        Toast.success('Anotación eliminada.');
      });
    }
  }

  /**
   * Abre modal de definición léxica y pronunciación fonética.
   */
  async openDefinitionModal(selection) {
    const rawWord = selection.text.trim();
    if (!rawWord) return;

    Toast.info(`Buscando «${rawWord}»...`);
    const defData = await VocabularyManager.lookupDefinition(rawWord);

    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay active';
    overlay.style.zIndex = '300';

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 440px; padding: 24px;">
        <div class="theme-modal-header" style="margin-bottom: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <h2 class="theme-modal-title" style="font-size: 1.4rem; text-transform: capitalize;">${this.escapeHtml(defData.word)}</h2>
              <button id="btn-speak-word" title="Escuchar pronunciación fonética" style="
                width: 32px; height: 32px; border-radius: 50%; background-color: var(--color-primary-light); color: #FFF; display: flex; align-items: center; justify-content: center; cursor: pointer; border: none;
              ">
                <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
              </button>
            </div>
            ${defData.phonetic ? `<span style="font-family: monospace; font-size: var(--text-xs); color: var(--color-primary-light);">${this.escapeHtml(defData.phonetic)}</span>` : ''}
          </div>
          <button class="theme-modal-close" id="btn-close-def-modal">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div style="margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px;">
          <div style="padding: 12px; border-radius: var(--radius-sm); background-color: var(--color-surface); border: 1px solid var(--color-border);">
            <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: var(--color-text-muted); display: block; margin-bottom: 4px;">Definición</span>
            <p style="font-size: var(--text-sm); line-height: 1.5; color: var(--color-text); margin: 0;">${this.escapeHtml(defData.definition)}</p>
          </div>

          ${selection.text.length > rawWord.length ? `
            <div style="padding: 10px 12px; border-radius: var(--radius-sm); background-color: var(--color-surface); border: 1px solid var(--color-border);">
              <span style="font-size: 0.7rem; text-transform: uppercase; font-weight: bold; color: var(--color-text-muted); display: block; margin-bottom: 4px;">Contexto en el libro</span>
              <p style="font-size: var(--text-xs); font-style: italic; color: var(--color-text-secondary); margin: 0;">«${this.escapeHtml(selection.text)}»</p>
            </div>
          ` : ''}
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btn-cancel-def" style="padding: 8px 16px; border-radius: var(--radius-sm); font-size: var(--text-xs); color: var(--color-text-secondary); cursor: pointer;">Cerrar</button>
          <button id="btn-save-vocab" style="padding: 8px 18px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: bold; background-color: var(--color-primary-light); color: #FFFFFF; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            <span>Guardar en Vocabulario</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

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

    // Guardar en vocabulario
    overlay.querySelector('#btn-save-vocab').addEventListener('click', async () => {
      try {
        await VocabularyManager.addWord({
          word: defData.word,
          contextSentence: selection.text,
          definition: defData.definition,
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
