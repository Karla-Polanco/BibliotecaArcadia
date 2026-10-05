/**
 * ============================================================================
 * MODAL SYSTEM - DIÁLOGOS Y VENTANAS MODALES ELEGANTES
 * ============================================================================
 * Reemplazo 100% moderno y estético para alert(), confirm() y prompt().
 * Totalmente asíncrono basado en Promises, accesible por teclado y con
 * animaciones y diseño coherentes con el tema de la Biblioteca Arcadia.
 */

import { Icons } from './Icons.js';
import { escapeHtml } from '../utils.js';

export class Modal {
  /**
   * Muestra un diálogo de confirmación asíncrono.
   * @param {Object} options
   * @param {string} [options.title] - Título del diálogo
   * @param {string} options.message - Mensaje de confirmación
   * @param {string} [options.confirmText='Aceptar'] - Texto del botón de confirmación
   * @param {string} [options.cancelText='Cancelar'] - Texto del botón cancelar
   * @param {boolean} [options.danger=false] - Si es una acción destructiva (rojo)
   * @param {string} [options.icon] - SVG o icono personalizado
   * @returns {Promise<boolean>} Resuelve a true si se confirma, false si se cancela
   */
  static confirm({
    title = 'Confirmar acción',
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    danger = false,
    icon = null
  }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';

      const confirmClass = danger ? 'btn btn--danger' : 'btn btn--primary';
      const btnIcon = danger ? Icons.TRASH : (/edit/i.test(confirmText) ? Icons.EDIT : (/guardar|salvar/i.test(confirmText) ? Icons.SAVE : Icons.CHECK));
      const confirmLabel = `${btnIcon}<span>${this.escapeHtml(confirmText)}</span>`;

      const defaultIcon = danger
        ? `<svg style="width: 22px; height: 22px; color: #EF4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
        : `<svg style="width: 22px; height: 22px; color: var(--color-gold, #D4AF37);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

      overlay.innerHTML = `
        <div class="arcadia-modal-card arcadia-modal-card--sm">
          <div class="arcadia-modal-row">
            <div class="arcadia-modal-icon">
              ${icon || defaultIcon}
            </div>
            <div style="flex: 1; min-width: 0;">
              <h3 class="arcadia-modal-title">${this.escapeHtml(title)}</h3>
              <p class="arcadia-modal-text">${this.escapeHtml(message)}</p>
            </div>
          </div>

          <div class="arcadia-modal-actions">
            <button id="modal-cancel-btn" class="btn btn--ghost">${this.escapeHtml(cancelText)}</button>
            <button id="modal-confirm-btn" class="${confirmClass}">${confirmLabel}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Entrada: el CSS anima opacity + blur del overlay y scale del card
      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 260);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') close(false);
        if (e.key === 'Enter') close(true);
      };

      window.addEventListener('keydown', keyHandler);
      overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => close(false));
      overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      overlay.querySelector('#modal-confirm-btn').focus();
    });
  }

  /**
   * Muestra un diálogo modal para solicitar un texto al usuario (reemplazo de prompt()).
   * @param {Object} options
   * @param {string} [options.title] - Título del diálogo
   * @param {string} options.message - Instrucción o descripción
   * @param {string} [options.defaultValue=''] - Valor inicial en el campo
   * @param {string} [options.placeholder=''] - Texto marcador de posición
   * @param {boolean} [options.multiline=false] - Usar textarea en vez de input
   * @param {string} [options.confirmText='Guardar'] - Texto de confirmación
   * @param {string} [options.cancelText='Cancelar'] - Texto de cancelación
   * @returns {Promise<string|null>} Resuelve con el texto ingresado o null si se cancela
   */
  static prompt({
    title = 'Introducir información',
    message,
    defaultValue = '',
    placeholder = '',
    multiline = false,
    confirmText = 'Guardar',
    cancelText = 'Cancelar'
  }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';

      const inputElement = multiline
        ? `<textarea id="modal-prompt-input" rows="3" placeholder="${this.escapeHtml(placeholder)}">${this.escapeHtml(defaultValue)}</textarea>`
        : `<input type="text" id="modal-prompt-input" value="${this.escapeHtml(defaultValue)}" placeholder="${this.escapeHtml(placeholder)}" autocomplete="off">`;

      const promptConfirmIcon = /guardar|salvar/i.test(confirmText) ? Icons.SAVE : Icons.CHECK;

      overlay.innerHTML = `
        <div class="arcadia-modal-card arcadia-modal-card--md">
          <div>
            <h3 class="arcadia-modal-title">${this.escapeHtml(title)}</h3>
            <p class="arcadia-modal-text">${this.escapeHtml(message)}</p>
          </div>

          <div>
            ${inputElement}
          </div>

          <div class="arcadia-modal-actions">
            <button id="modal-cancel-btn" class="btn btn--ghost">${this.escapeHtml(cancelText)}</button>
            <button id="modal-confirm-btn" class="btn btn--primary">${promptConfirmIcon}<span>${this.escapeHtml(confirmText)}</span></button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
      requestAnimationFrame(() => {
        const input = overlay.querySelector('#modal-prompt-input');
        if (input) {
          input.focus();
          if (!multiline) input.select();
        }
      });

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 260);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && (!multiline || e.ctrlKey || e.metaKey)) {
          const val = overlay.querySelector('#modal-prompt-input')?.value;
          close(val !== undefined ? val : null);
        }
      };

      window.addEventListener('keydown', keyHandler);
      overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => close(null));
      overlay.querySelector('#modal-confirm-btn').addEventListener('click', () => {
        const val = overlay.querySelector('#modal-prompt-input')?.value;
        close(val !== undefined ? val : null);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  /**
   * Muestra el modal "NOTA AL MARGEN" con el diseño de la maqueta:
   * título serif con icono, cita seleccionada, divisor, textarea y
   * botones Cancelar / Guardar nota.
   * @param {Object} options
   * @param {string} [options.quote=''] - Cita seleccionada (sin comillas latinas)
   * @param {string} [options.defaultValue=''] - Valor inicial del textarea
   * @param {string} [options.placeholder='Escribe tu nota aquí...'] - Placeholder
   * @returns {Promise<string|null>} Texto ingresado o null si se cancela
   */
  static noteDialog({
    quote = '',
    defaultValue = '',
    placeholder = 'Escribe tu nota aquí...'
  } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay note-margin-overlay';

      const safeQuote = this.escapeHtml(quote);
      const safeValue = this.escapeHtml(defaultValue);
      const safePlaceholder = this.escapeHtml(placeholder);

      overlay.innerHTML = `
        <div class="note-margin-card" role="dialog" aria-modal="true" aria-labelledby="note-margin-title">
          <button class="note-margin-close btn--close" id="note-margin-x" aria-label="Cerrar">
            ${Icons.CLOSE}
          </button>

          <div class="note-margin-head">
            <span class="note-margin-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path opacity="0.75" d="M8 11H16" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path opacity="0.75" d="M8 16H12" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <h3 class="note-margin-title" id="note-margin-title">NOTA AL MARGEN</h3>
          </div>

          <p class="note-margin-label">Cita seleccionada:</p>
          <p class="note-margin-quote">&laquo;${safeQuote}&raquo;</p>

          <div class="note-margin-divider" aria-hidden="true"></div>

          <label class="sr-only" for="note-margin-input">Escribe tu nota</label>
          <textarea id="note-margin-input" class="note-margin-textarea" placeholder="${safePlaceholder}">${safeValue}</textarea>

          <div class="note-margin-actions">
            <button id="note-margin-cancel" class="note-margin-btn btn btn--ghost">
              ${Icons.CLOSE}
              <span>Cancelar</span>
            </button>
            <button id="note-margin-save" class="note-margin-btn btn btn--primary">
              ${Icons.SAVE}
              <span>Guardar nota</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
      requestAnimationFrame(() => {
        const input = overlay.querySelector('#note-margin-input');
        if (input) input.focus();
      });

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 260);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          const val = overlay.querySelector('#note-margin-input')?.value;
          close(val !== undefined ? val : null);
        }
      };

      window.addEventListener('keydown', keyHandler);
      overlay.querySelector('#note-margin-x').addEventListener('click', () => close(null));
      overlay.querySelector('#note-margin-cancel').addEventListener('click', () => close(null));
      overlay.querySelector('#note-margin-save').addEventListener('click', () => {
        const val = overlay.querySelector('#note-margin-input')?.value;
        close(val !== undefined ? val : null);
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  /**
   * Muestra el mini-modal de lectura de nota (maqueta: NOTA + cita + contenido
   * + Eliminar / Editar / Cerrar). Se abre al pulsar el pasaje subrayado en negro.
   * @param {Object} options
   * @param {string} [options.quote=''] - Pasaje citado (sin comillas latinas)
   * @param {string} [options.content=''] - Texto de la nota
   * @returns {Promise<'edit'|'delete'|'close'>} Acción elegida por el usuario
   */
  static viewNote({ quote = '', content = '' } = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay note-view-overlay';

      const safeQuote = this.escapeHtml(quote);
      const safeContent = this.escapeHtml(content);

      overlay.innerHTML = `
        <div class="note-view-card" role="dialog" aria-modal="true" aria-labelledby="note-view-title">
          <button class="note-view-close btn--close" id="note-view-x" aria-label="Cerrar">
            ${Icons.CLOSE}
          </button>

          <div class="note-view-head">
            <span class="note-view-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16 2V5" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path opacity="0.75" d="M8 11H16" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
                <path opacity="0.75" d="M8 16H12" stroke="currentColor" stroke-width="1.5" stroke-miterlimit="10" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
            <h3 class="note-view-title" id="note-view-title">NOTA</h3>
          </div>

          ${safeQuote ? `<p class="note-view-quote">&laquo;${safeQuote}&raquo;</p>` : ''}

          <div class="note-view-divider" aria-hidden="true"></div>

          <p class="note-view-content">${safeContent || '<span style="opacity:.6">Sin contenido</span>'}</p>

          <div class="note-view-actions">
            <button id="note-view-delete" class="note-view-btn btn btn--danger">
              ${Icons.TRASH}
              <span>Eliminar</span>
            </button>
            <span class="note-view-spacer"></span>
            <button id="note-view-edit" class="note-view-btn btn btn--primary">
              ${Icons.EDIT}
              <span>Editar</span>
            </button>
            <button id="note-view-close" class="note-view-btn btn btn--ghost">
              <span>Cerrar</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 260);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') close('close');
      };

      window.addEventListener('keydown', keyHandler);
      overlay.querySelector('#note-view-x').addEventListener('click', () => close('close'));
      overlay.querySelector('#note-view-close').addEventListener('click', () => close('close'));
      overlay.querySelector('#note-view-edit').addEventListener('click', () => close('edit'));
      overlay.querySelector('#note-view-delete').addEventListener('click', () => close('delete'));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close('close');
      });
    });
  }

  /**
   * Muestra un diálogo modal especializado para editar los detalles de un libro (título y autor simultáneos).
   */
  static editBookDetails(book) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';
      let currentCoverDataUrl = book.coverDataUrl || null;

      overlay.innerHTML = `
        <div class="arcadia-modal-card arcadia-modal-card--md">
          <div>
            <h3 class="arcadia-modal-title" style="font-size: 1.2rem;">Editar información del libro</h3>
            <p class="arcadia-modal-text">Modifica la portada, título, autor y saga de este ejemplar.</p>
          </div>

          <form id="edit-book-form" class="arcadia-modal-form">
            <!-- Selector y Vista Previa de Portada -->
            <div class="arcadia-modal-field">
              <label>Portada del libro</label>
              <div style="display: flex; gap: 14px; align-items: center; background: var(--color-surface-secondary); padding: 12px; border-radius: 12px; border: 1px solid var(--color-border-subtle);">
                <div id="edit-cover-preview-box" style="width: 54px; height: 80px; border-radius: 6px; overflow: hidden; background: var(--color-surface); flex-shrink: 0; border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center;">
                  ${currentCoverDataUrl ? `
                    <img src="${currentCoverDataUrl}" alt="Portada" style="width: 100%; height: 100%; object-fit: cover;">
                  ` : `
                    <svg style="width: 24px; height: 24px; color: var(--color-text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  `}
                </div>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <button type="button" id="btn-change-cover-trigger" class="btn btn--ghost btn--sm" style="font-size: 0.78rem; padding: 6px 12px; height: auto;">
                    Seleccionar nueva portada
                  </button>
                  <input type="file" id="edit-book-cover-input" accept="image/*" style="display: none;">
                  <span style="font-size: 0.72rem; color: var(--color-text-muted);">Formatos aceptados: JPG, PNG, WEBP.</span>
                </div>
              </div>
            </div>

            <div class="arcadia-modal-field">
              <label>Título del libro</label>
              <input type="text" id="edit-book-title" value="${this.escapeHtml(book.title)}" required>
            </div>

            <div class="arcadia-modal-field">
              <label>Autor</label>
              <input type="text" id="edit-book-author" value="${this.escapeHtml(book.author)}" required>
            </div>

            <div class="arcadia-modal-field">
              <label>Saga <span style="font-weight: 400; opacity: 0.7;">(opcional)</span></label>
              <input type="text" id="edit-book-saga" value="${this.escapeHtml(book.saga || '')}" placeholder="Ej: Trono de Cristal" autocomplete="off">
            </div>

            <div class="arcadia-modal-actions">
              <button type="button" id="modal-cancel-btn" class="btn btn--ghost">Cancelar</button>
              <button type="submit" class="btn btn--primary">${Icons.SAVE}<span>Guardar cambios</span></button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
      requestAnimationFrame(() => overlay.querySelector('#edit-book-title')?.focus());

      // Vincular cambio de archivo de portada
      const coverInput = overlay.querySelector('#edit-book-cover-input');
      const coverTrigger = overlay.querySelector('#btn-change-cover-trigger');
      const previewBox = overlay.querySelector('#edit-cover-preview-box');

      if (coverTrigger && coverInput) {
        coverTrigger.addEventListener('click', () => coverInput.click());
        coverInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (evt) => {
              currentCoverDataUrl = evt.target.result;
              if (previewBox) {
                previewBox.innerHTML = `<img src="${currentCoverDataUrl}" alt="Portada" style="width: 100%; height: 100%; object-fit: cover;">`;
              }
            };
            reader.readAsDataURL(file);
          }
        });
      }

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 260);
      };

      overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => close(null));
      overlay.querySelector('#edit-book-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = overlay.querySelector('#edit-book-title').value.trim();
        const saga = overlay.querySelector('#edit-book-saga')?.value.trim() || '';
        const author = overlay.querySelector('#edit-book-author').value.trim();
        close({ title, saga, author, coverDataUrl: currentCoverDataUrl });
      });
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  /**
   * Muestra un diálogo modal para las opciones de una colección en el sidebar (Editar o Eliminar).
   */
  static collectionActionModal(collection) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';

      overlay.innerHTML = `
        <div class="arcadia-modal-card col-action-modal" style="--col-accent: ${collection.color || '#5B4CC4'};">
          <div class="col-action-head">
            <span class="col-action-badge" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true"><path fill="currentColor" d="M57.063 20.218l1.029-1.698s.906-1.502.906-3.519c0-4.886-4.662-4.757-4.662-4.757L44.179 7.479L38.638 2l-7.291 1.985l-2.391-.651l-1.817 1.797l-10.497 2.858s-4.04-.111-4.04 4.123c0 1.748.786 3.05.786 3.05l1.351 2.23l-1.187 1.172l-5.86 1.596s-4.662-.129-4.662 4.757a7.56 7.56 0 0 0 .779 3.281L2 29.987l.949.376c.021.051.029.108.07.149c1.835 1.839 1.684 4.309 1.422 5.643l-1.109 1.111l8.401 4.039L23.271 60.35c1.849 2.906 5.774 1.088 5.774 1.088l29.649-14.256l-1.109-1.111c-.262-1.334-.413-3.804 1.422-5.644c.041-.041.049-.098.07-.148l.949-.377l-5.513-5.45l6.33-3.043l-.961-.963c-.227-1.156-.358-3.297 1.233-4.891c.035-.036.041-.084.06-.129l.825-.327l-4.937-4.881m-5.685-8.835l-1.25 1.978l-3.234-3.198l4.484 1.22M39.176 7.144l4.643 4.963l-16.789 6.067l-3.965-6.156l16.111-4.874M15.744 19.052l11.457 18.911l-21.827-8.658l10.37-10.253m-4.775 2.067l-1.345 1.33l-.538-.825l1.883-.505m-4.247 1.034l1.252 1.927l-2.713 2.682a5.586 5.586 0 0 1-.331-1.845c0-1.826.906-2.521 1.792-2.764M5.154 37.026l.015-.058l25.147 11.007l-24.95-11.894c.023-.135.041-.284.06-.434l19.533 8.18l-19.465-9.116a7.723 7.723 0 0 0-.086-1.245l18.079 7.445L5.165 32.4a6.048 6.048 0 0 0-.47-1.137l24.883 10.625l.566.934c1.167 1.834 3.284 1.495 4.351 1.177c1.475.728 4.119 2.412 3.442 4.893c-.357 1.312-1.142 1.948-2.399 1.948c-1.273 0-2.544-.666-2.557-.675L5.154 37.026M30.2 50.185l-1.966.814l-1.67-2.563l3.636 1.749m-7.614 5.381l-7.729-12.759l7.682 3.693l3.633 5.592c-1.465.626-3.102 2.055-3.586 3.474m34.033-12.184a7.731 7.731 0 0 0-.086 1.245l-19.465 9.116l19.533-8.18c.019.149.036.299.06.434l-24.95 11.895l25.147-11.007a.982.982 0 0 1 .015.058L29.046 60.08c-.013.009-1.282.675-2.557.675c-1.258 0-2.042-.637-2.399-1.948c-.918-3.367 4.302-5.276 4.38-5.305l4.575-1.952c.491.209 3.994 1.584 5.711-1.115l1.083-1.786l17.494-7.47a6.12 6.12 0 0 0-.471 1.137L38.54 50.827l18.079-7.445m.034-4.161l-14.825 6.144l4.114-6.791l6.767-3.253l3.944 3.9m2.393-11.107a6.9 6.9 0 0 0-.075 1.079l-16.868 7.9l16.928-7.089c.017.129.031.26.052.376L37.459 40.688l21.794-9.539a.46.46 0 0 1 .013.05L35.149 42.586c-.011.007-1.112.585-2.216.585c-1.091 0-1.77-.553-2.079-1.689c-.796-2.918 3.728-4.572 3.796-4.597l25.014-10.68a5.268 5.268 0 0 0-.407.986l-15.88 7.376l15.669-6.453" /></svg>
            </span>
            <h3 class="col-action-name">${this.escapeHtml(collection.name)}</h3>
            <button class="col-action-close btn--close" id="btn-col-action-x" aria-label="Cerrar">
              ${Icons.CLOSE}
            </button>
          </div>

          <p class="col-action-sub">Elige qué hacer con esta colección.</p>

          <div class="col-action-list">
            <button type="button" id="btn-col-action-edit" class="col-action-btn btn btn--ghost">
              ${Icons.EDIT}
              <span class="col-action-btn-label">Editar colección</span>
            </button>

            <button type="button" id="btn-col-action-delete" class="col-action-btn col-action-btn--delete btn btn--danger">
              ${Icons.TRASH}
              <span class="col-action-btn-label">Eliminar colección</span>
            </button>
          </div>

          <div class="col-action-foot">
            <button type="button" id="btn-col-action-cancel" class="btn btn--ghost">Cerrar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

      const close = (action) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(action);
        }, 260);
      };

      overlay.querySelector('#btn-col-action-edit').addEventListener('click', () => close('edit'));
      overlay.querySelector('#btn-col-action-delete').addEventListener('click', () => close('delete'));
      overlay.querySelector('#btn-col-action-cancel').addEventListener('click', () => close(null));
      overlay.querySelector('#btn-col-action-x').addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(null);
      });
    });
  }

  /**
   * Muestra el modal estético de instalación de la PWA (Biblioteca Arcadia).
   */
  static showInstallModal(deferredPrompt, onPromptHandled) {
    return new Promise((resolve) => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';

      overlay.innerHTML = `
        <div class="arcadia-modal-card arcadia-modal-card--lg">
          <!-- Encabezado con Icono -->
          <div style="display: flex; gap: 16px; align-items: center;">
            <div style="
              width: 52px;
              height: 52px;
              border-radius: 14px;
              background: linear-gradient(135deg, var(--color-primary, #30256F), var(--color-primary-light, #5B4CC4));
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              box-shadow: 0 8px 20px -4px var(--color-primary-glow, rgba(91, 76, 196, 0.4));
              border: 1px solid rgba(255, 255, 255, 0.15);
            ">
              <svg style="width: 24px; height: 24px; color: #FFF;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary-light, #5B4CC4);">Aplicación Web Progresiva</span>
              <h3 style="font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 700; margin: 2px 0 0 0; color: var(--color-text); letter-spacing: 0.02em;">Instalar Biblioteca Arcadia</h3>
            </div>
          </div>

          <!-- Descripción -->
          <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.5; margin: 0;">
            Instala Arcadia en tu equipo o dispositivo móvil para disfrutar de una lectura fluida, privada y a pantalla completa.
          </p>

          <!-- Beneficios -->
          <div style="
            display: flex;
            flex-direction: column;
            gap: 12px;
            background: var(--color-surface-secondary, rgba(255, 255, 255, 0.03));
            border: 1px solid var(--color-border-subtle, rgba(255, 255, 255, 0.08));
            border-radius: 12px;
            padding: 14px 16px;
          ">
            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; line-height: 1.2;">⚡</span>
              <div>
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text);">Acceso directo y pantalla completa</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted);">Ábrela desde el escritorio o inicio sin barras de navegación del explorador.</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; line-height: 1.2;">📖</span>
              <div>
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text);">Lectura 100% sin conexión</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted);">Todos tus libros EPUB, notas, marcas y citas disponibles sin internet.</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; line-height: 1.2;">🔒</span>
              <div>
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text);">Totalmente privada y local</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted);">Tus libros se almacenan en tu dispositivo; cero rastreo y cero servidores externos.</span>
              </div>
            </div>
          </div>

          <div id="install-instruction-box" style="display: none; font-size: 0.82rem; color: var(--color-text-secondary); background: rgba(91, 76, 196, 0.08); border: 1px solid var(--color-primary-glow); border-radius: 8px; padding: 12px 14px; line-height: 1.5;"></div>

          <!-- Botones de Acción -->
          <div class="arcadia-modal-actions">
            <button id="btn-cancel-install" class="btn btn--ghost">Cancelar</button>

            <button id="btn-confirm-install" class="btn btn--primary">
              ${Icons.EXPORT}
              <span id="btn-confirm-install-text">Instalar ahora</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

      const close = (result) => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 260);
      };

      overlay.querySelector('#btn-cancel-install').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });

      const confirmBtn = overlay.querySelector('#btn-confirm-install');
      confirmBtn.addEventListener('click', async () => {
        if (isStandalone) {
          const infoBox = overlay.querySelector('#install-instruction-box');
          infoBox.style.display = 'block';
          infoBox.innerHTML = '✨ <strong>¡Ya estás usando la aplicación instalada!</strong> Arcadia ya se encuentra ejecutándose como app en este dispositivo.';
          confirmBtn.style.display = 'none';
          return;
        }

        if (deferredPrompt) {
          try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (typeof onPromptHandled === 'function') onPromptHandled(outcome);
            close(outcome === 'accepted');
          } catch (err) {
            console.warn('[PWA] Error en prompt:', err);
            close(false);
          }
        } else {
          // Instrucciones para instalación en navegador
          const infoBox = overlay.querySelector('#install-instruction-box');
          infoBox.style.display = 'block';
          infoBox.innerHTML = `
            <strong>Instalación manual según tu navegador:</strong><br>
            • <strong>Chrome / Edge:</strong> Haz clic en el icono 🖥️ o ➕ en el lado derecho de la barra de direcciones superior, o ve al menú (tres puntos) &gt; <em>Instalar aplicación</em>.<br>
            • <strong>Safari (iPhone / iPad):</strong> Pulsa el botón Compartir ⬆️ y selecciona <em>«Añadir a pantalla de inicio»</em>.<br>
            • <strong>Android:</strong> Pulsa el menú (⋮) de tu navegador y selecciona <em>«Instalar aplicación»</em> o <em>«Añadir a inicio»</em>.
          `;
          overlay.querySelector('#btn-confirm-install-text').textContent = '¡Entendido!';
          confirmBtn.onclick = () => close(true);
        }
      });
    });
  }

  static escapeHtml(text) {
    return escapeHtml(text);
  }
}
