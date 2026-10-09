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
        ? `<svg style="width: 22px; height: 22px; color: #EF4444;" aria-hidden="true"><use href="./assets/icons/icons.svg#alert-triangle"></use></svg>`
        : `<svg style="width: 22px; height: 22px; color: var(--color-gold, #D4AF37);" aria-hidden="true"><use href="./assets/icons/icons.svg#info-circle"></use></svg>`;

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
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#note"></use></svg>
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
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#note"></use></svg>
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
                    <svg style="width: 24px; height: 24px; color: var(--color-text-muted);" aria-hidden="true"><use href="./assets/icons/icons.svg#image"></use></svg>
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
              <svg width="18" height="18" aria-hidden="true"><use href="./assets/icons/icons.svg#epub-logo"></use></svg>
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
              <svg style="width: 24px; height: 24px; color: #FFF;" aria-hidden="true"><use href="./assets/icons/icons.svg#download"></use></svg>
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
