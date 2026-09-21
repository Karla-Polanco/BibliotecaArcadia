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
        <div class="arcadia-modal-card arcadia-modal-card--sm">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${collection.color || '#5B4CC4'}; box-shadow: 0 0 0 2px rgba(255,255,255,0.15); flex-shrink: 0;"></span>
            <h3 class="arcadia-modal-title">${this.escapeHtml(collection.name)}</h3>
          </div>
          <p class="arcadia-modal-text">Selecciona la acción que deseas realizar con esta colección:</p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            <button id="btn-col-action-edit" class="arcadia-modal-btn" style="justify-content: flex-start; background: var(--color-surface-hover); border: 1px solid var(--color-border); color: var(--color-text);">
              <svg style="width: 16px; height: 16px; color: var(--color-primary-light); flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>Editar nombre, color o descripción</span>
            </button>

            <button id="btn-col-action-delete" class="arcadia-modal-btn" style="justify-content: flex-start; background: rgba(220, 38, 38, 0.1); border-color: rgba(220, 38, 38, 0.25); color: #F87171;">
              <svg style="width: 16px; height: 16px; color: #EF4444; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Eliminar colección</span>
            </button>
          </div>

          <div class="arcadia-modal-actions">
            <button id="btn-col-action-cancel" class="arcadia-modal-btn arcadia-modal-btn--ghost" style="border: none; background: transparent;">Cerrar</button>
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
              <span style="font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary-light, #5B4CC4);">Aplicación Móvil & PWA</span>
              <h3 style="font-family: 'Cinzel', serif; font-size: 1.25rem; font-weight: 700; margin: 2px 0 0 0; color: var(--color-text); letter-spacing: 0.02em;">Instalar Biblioteca Arcadia</h3>
            </div>
          </div>

          <!-- Descripción -->
          <p style="font-size: 0.88rem; color: var(--color-text-secondary); line-height: 1.5; margin: 0;">
            Disfruta de Arcadia como una aplicación nativa en tu dispositivo móvil o computadora, 100% offline y a pantalla completa.
          </p>

          <!-- Opciones de Instalación / Descarga -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Opción 1: Instalación WebAPK / PWA instantánea -->
            <button id="btn-action-install-pwa" type="button" style="
              display: flex;
              align-items: center;
              gap: 14px;
              background: var(--color-surface);
              border: 1.5px solid var(--color-border);
              border-radius: 12px;
              padding: 14px 16px;
              text-align: left;
              cursor: pointer;
              transition: all 0.2s ease;
              color: var(--color-text);
              box-shadow: var(--shadow-sm);
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: var(--color-badge-bg, rgba(57, 120, 159, 0.12));
                color: var(--color-primary);
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              ">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div style="flex: 1;">
                <strong style="font-size: 0.88rem; display: block; color: var(--color-text);">Instalar en este dispositivo (Recomendado)</strong>
                <span style="font-size: 0.76rem; color: var(--color-text-muted);">Instala la app directamente en Android, Windows o iOS en 1 clic.</span>
              </div>
              <span style="font-size: 0.72rem; font-weight: 700; color: var(--color-primary); background: var(--color-badge-bg); padding: 4px 8px; border-radius: 6px;">Directo</span>
            </button>

            <!-- Opción 2: Descargar APK Android -->
            <a id="btn-action-download-apk" href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" style="
              display: flex;
              align-items: center;
              gap: 14px;
              background: var(--color-surface);
              border: 1.5px solid var(--color-border);
              border-radius: 12px;
              padding: 14px 16px;
              text-align: left;
              cursor: pointer;
              transition: all 0.2s ease;
              color: var(--color-text);
              text-decoration: none;
              box-shadow: var(--shadow-sm);
            ">
              <div style="
                width: 40px;
                height: 40px;
                border-radius: 10px;
                background: rgba(46, 125, 50, 0.12);
                color: #2E7D32;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              ">
                <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <div style="flex: 1;">
                <strong style="font-size: 0.88rem; display: block; color: var(--color-text);">Descargar paquete instalador APK (.apk)</strong>
                <span style="font-size: 0.76rem; color: var(--color-text-muted);">Genera o descarga el archivo .apk independiente para Android.</span>
              </div>
              <span style="font-size: 0.72rem; font-weight: 700; color: #2E7D32; background: rgba(46, 125, 50, 0.12); padding: 4px 8px; border-radius: 6px;">.APK</span>
            </a>
          </div>

          <div id="install-instruction-box" style="display: none; font-size: 0.82rem; color: var(--color-text-secondary); background: var(--color-surface-secondary); border: 1px solid var(--color-border); border-radius: 8px; padding: 12px 14px; line-height: 1.5;"></div>

          <!-- Botones de Acción -->
          <div class="arcadia-modal-actions" style="margin-top: 8px;">
            <button id="btn-cancel-install" class="arcadia-modal-btn arcadia-modal-btn--ghost" style="width: 100%;">Cerrar</button>
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

      const installPwaBtn = overlay.querySelector('#btn-action-install-pwa');
      installPwaBtn.addEventListener('click', async () => {
        if (isStandalone) {
          const infoBox = overlay.querySelector('#install-instruction-box');
          infoBox.style.display = 'block';
          infoBox.innerHTML = '✨ <strong>¡Ya estás usando la aplicación instalada!</strong> Arcadia ya se encuentra ejecutándose como app en este dispositivo.';
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
          const infoBox = overlay.querySelector('#install-instruction-box');
          infoBox.style.display = 'block';
          infoBox.innerHTML = `
            <strong>Instalación manual según tu navegador:</strong><br>
            • <strong>Chrome / Edge:</strong> Haz clic en los tres puntos (⋮) &gt; <em>«Instalar aplicación»</em> o <em>«Añadir a inicio»</em>.<br>
            • <strong>Safari (iPhone / iPad):</strong> Pulsa el botón Compartir ⬆️ y selecciona <em>«Añadir a pantalla de inicio»</em>.<br>
            • <strong>Android:</strong> Pulsa el menú (⋮) de tu navegador y selecciona <em>«Instalar aplicación»</em>.
          `;
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
