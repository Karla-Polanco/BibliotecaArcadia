/**
 * ============================================================================
 * MODAL SYSTEM - DIÁLOGOS Y VENTANAS MODALES ELEGANTES
 * ============================================================================
 * Reemplazo 100% moderno y estético para alert(), confirm() y prompt().
 * Totalmente asíncrono basado en Promises, accesible por teclado y con
 * animaciones y diseño coherentes con el tema de la Biblioteca Arcadia.
 */

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

      const confirmClass = danger ? 'arcadia-modal-btn arcadia-modal-btn--danger' : 'arcadia-modal-btn arcadia-modal-btn--primary';

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
            <button id="modal-cancel-btn" class="arcadia-modal-btn arcadia-modal-btn--ghost">${this.escapeHtml(cancelText)}</button>
            <button id="modal-confirm-btn" class="${confirmClass}">${this.escapeHtml(confirmText)}</button>
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
            <button id="modal-cancel-btn" class="arcadia-modal-btn arcadia-modal-btn--ghost">${this.escapeHtml(cancelText)}</button>
            <button id="modal-confirm-btn" class="arcadia-modal-btn arcadia-modal-btn--primary">${this.escapeHtml(confirmText)}</button>
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
          <button class="note-margin-close" id="note-margin-x" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
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
            <button id="note-margin-cancel" class="note-margin-btn note-margin-btn--cancel">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              <span>Cancelar</span>
            </button>
            <button id="note-margin-save" class="note-margin-btn note-margin-btn--save">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
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
   * Muestra un diálogo modal especializado para editar los detalles de un libro (título y autor simultáneos).
   */
  static editBookDetails(book) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'arcadia-modal-overlay';

      overlay.innerHTML = `
        <div class="arcadia-modal-card arcadia-modal-card--md">
          <div>
            <h3 class="arcadia-modal-title" style="font-size: 1.2rem;">Editar información del libro</h3>
            <p class="arcadia-modal-text">Modifica los metadatos visibles de este ejemplar en tu biblioteca.</p>
          </div>

          <form id="edit-book-form" class="arcadia-modal-form">
            <div class="arcadia-modal-field">
              <label>Título del libro</label>
              <input type="text" id="edit-book-title" value="${this.escapeHtml(book.title)}" required>
            </div>

            <div class="arcadia-modal-field">
              <label>Saga <span style="font-weight: 400; opacity: 0.7;">(opcional)</span></label>
              <input type="text" id="edit-book-saga" value="${this.escapeHtml(book.saga || '')}" placeholder="Ej: Trono de Cristal" autocomplete="off">
            </div>

            <div class="arcadia-modal-field">
              <label>Autor</label>
              <input type="text" id="edit-book-author" value="${this.escapeHtml(book.author)}" required>
            </div>

            <div class="arcadia-modal-actions">
              <button type="button" id="modal-cancel-btn" class="arcadia-modal-btn arcadia-modal-btn--ghost">Cancelar</button>
              <button type="submit" class="arcadia-modal-btn arcadia-modal-btn--primary">Guardar cambios</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
      requestAnimationFrame(() => overlay.querySelector('#edit-book-title')?.focus());

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
        close({ title, saga, author });
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 002-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <h3 class="col-action-name">${this.escapeHtml(collection.name)}</h3>
            <button class="col-action-close" id="btn-col-action-x" aria-label="Cerrar">
              <svg style="width: 15px; height: 15px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <p class="col-action-sub">Elige qué hacer con esta colección.</p>

          <div class="col-action-list">
            <button id="btn-col-action-edit" class="col-action-btn">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              <span class="col-action-btn-label">Editar nombre, color o descripción</span>
            </button>

            <button id="btn-col-action-delete" class="col-action-btn col-action-btn--delete">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              <span class="col-action-btn-label">Eliminar colección</span>
            </button>
          </div>

          <div class="col-action-foot">
            <button id="btn-col-action-cancel" class="arcadia-modal-btn arcadia-modal-btn--ghost">Cerrar</button>
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
            <button id="btn-cancel-install" class="arcadia-modal-btn arcadia-modal-btn--ghost">Cancelar</button>

            <button id="btn-confirm-install" class="arcadia-modal-btn arcadia-modal-btn--primary" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
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
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
