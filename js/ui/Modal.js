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
      overlay.className = 'arcadia-modal-overlay active';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      const confirmBtnBg = danger
        ? 'background: linear-gradient(135deg, #DC2626, #B91C1C); color: #FFF; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35);'
        : 'background: var(--color-primary-light, #7B6BF0); color: #FFF; box-shadow: 0 4px 12px rgba(123, 107, 240, 0.35);';

      const defaultIcon = danger
        ? `<svg style="width: 24px; height: 24px; color: #EF4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
        : `<svg style="width: 24px; height: 24px; color: var(--color-primary-light, #7B6BF0);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

      overlay.innerHTML = `
        <div class="arcadia-modal-card" style="
          width: 100%;
          max-width: 440px;
          background-color: var(--color-surface, #1E1C2E);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
          border-radius: var(--radius-lg, 16px);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-text, #FFF);
          display: flex;
          flex-direction: column;
          gap: 18px;
        ">
          <div style="display: flex; gap: 14px; align-items: flex-start;">
            <div style="
              width: 44px;
              height: 44px;
              border-radius: 12px;
              background-color: var(--color-surface-hover, rgba(255, 255, 255, 0.05));
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            ">
              ${icon || defaultIcon}
            </div>
            <div style="flex: 1;">
              <h3 style="font-size: 1.1rem; font-weight: 700; margin: 0 0 6px 0; color: var(--color-text, #FFF);">${this.escapeHtml(title)}</h3>
              <p style="font-size: 0.88rem; color: var(--color-text-secondary, #A09DB8); line-height: 1.5; margin: 0; white-space: pre-line;">${this.escapeHtml(message)}</p>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px;">
            <button id="modal-cancel-btn" style="
              padding: 9px 18px;
              border-radius: var(--radius-sm, 8px);
              background: var(--color-surface-hover, rgba(255, 255, 255, 0.06));
              border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
              color: var(--color-text-secondary, #A09DB8);
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
            ">${this.escapeHtml(cancelText)}</button>

            <button id="modal-confirm-btn" style="
              padding: 9px 22px;
              border-radius: var(--radius-sm, 8px);
              border: none;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
              ${confirmBtnBg}
            ">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Trigger animaciones de entrada
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(1)';
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 180);
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
      overlay.className = 'arcadia-modal-overlay active';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      const inputElement = multiline
        ? `<textarea id="modal-prompt-input" rows="3" placeholder="${this.escapeHtml(placeholder)}" style="
            width: 100%;
            padding: 12px 14px;
            border-radius: var(--radius-sm, 8px);
            background-color: var(--color-surface-elevated, #161522);
            border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
            color: var(--color-text, #FFF);
            font-size: 0.9rem;
            outline: none;
            resize: vertical;
            font-family: inherit;
            line-height: 1.45;
          ">${this.escapeHtml(defaultValue)}</textarea>`
        : `<input type="text" id="modal-prompt-input" value="${this.escapeHtml(defaultValue)}" placeholder="${this.escapeHtml(placeholder)}" autocomplete="off" style="
            width: 100%;
            padding: 12px 14px;
            border-radius: var(--radius-sm, 8px);
            background-color: var(--color-surface-elevated, #161522);
            border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
            color: var(--color-text, #FFF);
            font-size: 0.9rem;
            outline: none;
            font-family: inherit;
          ">`;

      overlay.innerHTML = `
        <div class="arcadia-modal-card" style="
          width: 100%;
          max-width: 460px;
          background-color: var(--color-surface, #1E1C2E);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
          border-radius: var(--radius-lg, 16px);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-text, #FFF);
          display: flex;
          flex-direction: column;
          gap: 16px;
        ">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0 0 6px 0; color: var(--color-text, #FFF);">${this.escapeHtml(title)}</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary, #A09DB8); line-height: 1.45; margin: 0; white-space: pre-line;">${this.escapeHtml(message)}</p>
          </div>

          <div>
            ${inputElement}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button id="modal-cancel-btn" style="
              padding: 9px 18px;
              border-radius: var(--radius-sm, 8px);
              background: var(--color-surface-hover, rgba(255, 255, 255, 0.06));
              border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
              color: var(--color-text-secondary, #A09DB8);
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
            ">${this.escapeHtml(cancelText)}</button>

            <button id="modal-confirm-btn" style="
              padding: 9px 22px;
              border-radius: var(--radius-sm, 8px);
              border: none;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              background: var(--color-primary-light, #7B6BF0);
              color: #FFF;
              box-shadow: 0 4px 12px rgba(123, 107, 240, 0.35);
              transition: all 0.15s ease;
            ">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(1)';
        const input = overlay.querySelector('#modal-prompt-input');
        if (input) {
          input.focus();
          if (!multiline) input.select();
        }
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          window.removeEventListener('keydown', keyHandler);
          resolve(result);
        }, 180);
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
      overlay.className = 'arcadia-modal-overlay active';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      overlay.innerHTML = `
        <div class="arcadia-modal-card" style="
          width: 100%;
          max-width: 460px;
          background-color: var(--color-surface, #1E1C2E);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
          border-radius: var(--radius-lg, 16px);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-text, #FFF);
          display: flex;
          flex-direction: column;
          gap: 18px;
        ">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 700; margin: 0 0 4px 0;">Editar información del libro</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-secondary, #A09DB8); margin: 0;">Modifica los metadatos visibles de este ejemplar en tu biblioteca.</p>
          </div>

          <form id="edit-book-form" style="display: flex; flex-direction: column; gap: 14px;">
            <div>
              <label style="display: block; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted, #75718E); margin-bottom: 6px;">Título del libro</label>
              <input type="text" id="edit-book-title" value="${this.escapeHtml(book.title)}" required style="
                width: 100%;
                padding: 10px 14px;
                border-radius: var(--radius-sm, 8px);
                background-color: var(--color-surface-elevated, #161522);
                border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
                color: var(--color-text, #FFF);
                font-size: 0.9rem;
                outline: none;
              ">
            </div>

            <div>
              <label style="display: block; font-size: 0.72rem; text-transform: uppercase; font-weight: 700; color: var(--color-text-muted, #75718E); margin-bottom: 6px;">Autor</label>
              <input type="text" id="edit-book-author" value="${this.escapeHtml(book.author)}" required style="
                width: 100%;
                padding: 10px 14px;
                border-radius: var(--radius-sm, 8px);
                background-color: var(--color-surface-elevated, #161522);
                border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
                color: var(--color-text, #FFF);
                font-size: 0.9rem;
                outline: none;
              ">
            </div>

            <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
              <button type="button" id="modal-cancel-btn" style="
                padding: 9px 18px;
                border-radius: var(--radius-sm, 8px);
                background: var(--color-surface-hover, rgba(255, 255, 255, 0.06));
                border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
                color: var(--color-text-secondary, #A09DB8);
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
              ">Cancelar</button>

              <button type="submit" style="
                padding: 9px 22px;
                border-radius: var(--radius-sm, 8px);
                border: none;
                font-size: 0.85rem;
                font-weight: 600;
                cursor: pointer;
                background: var(--color-primary-light, #7B6BF0);
                color: #FFF;
                box-shadow: 0 4px 12px rgba(123, 107, 240, 0.35);
              ">Guardar cambios</button>
            </div>
          </form>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(1)';
        overlay.querySelector('#edit-book-title')?.focus();
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 180);
      };

      overlay.querySelector('#modal-cancel-btn').addEventListener('click', () => close(null));
      overlay.querySelector('#edit-book-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = overlay.querySelector('#edit-book-title').value.trim();
        const author = overlay.querySelector('#edit-book-author').value.trim();
        close({ title, author });
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
      overlay.className = 'arcadia-modal-overlay active';
      overlay.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      overlay.innerHTML = `
        <div class="arcadia-modal-card" style="
          width: 100%;
          max-width: 420px;
          background-color: var(--color-surface, #1E1C2E);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
          border-radius: var(--radius-lg, 16px);
          padding: 24px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-text, #FFF);
          display: flex;
          flex-direction: column;
          gap: 16px;
        ">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${collection.color || '#5B4CC4'}; flex-shrink: 0;"></span>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin: 0;">${this.escapeHtml(collection.name)}</h3>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-text-secondary, #A09DB8); margin: 0;">Selecciona la acción que deseas realizar con esta colección:</p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
            <button id="btn-col-action-edit" style="
              display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
              background: var(--color-surface-hover, rgba(255, 255, 255, 0.06)); border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
              color: var(--color-text, #FFF); font-size: 0.88rem; font-weight: 600; cursor: pointer; text-align: left;
            ">
              <svg style="width: 16px; height: 16px; color: var(--color-primary-light, #7B6BF0);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span>Editar nombre, color o descripción</span>
            </button>

            <button id="btn-col-action-delete" style="
              display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: var(--radius-sm, 8px);
              background: rgba(220, 38, 38, 0.1); border: 1px solid rgba(220, 38, 38, 0.25);
              color: #F87171; font-size: 0.88rem; font-weight: 600; cursor: pointer; text-align: left;
            ">
              <svg style="width: 16px; height: 16px; color: #EF4444;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span>Eliminar colección</span>
            </button>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
            <button id="btn-col-action-cancel" style="
              padding: 8px 18px; border-radius: var(--radius-sm, 8px); background: transparent; border: none;
              color: var(--color-text-muted, #75718E); font-size: 0.82rem; font-weight: 600; cursor: pointer;
            ">Cerrar</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(1)';
      });

      const close = (action) => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          resolve(action);
        }, 180);
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
      overlay.className = 'arcadia-modal-overlay active';
      overlay.style.cssText = `
        position: fixed !important;
        inset: 0 !important;
        z-index: 99999 !important;
        background: rgba(0, 0, 0, 0.75) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 20px !important;
        opacity: 0;
        transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;

      overlay.innerHTML = `
        <div class="arcadia-modal-card" style="
          width: 100%;
          max-width: 480px;
          background-color: var(--color-surface, #1E1C2E);
          border: 1px solid var(--color-border, rgba(255, 255, 255, 0.12));
          border-radius: var(--radius-lg, 18px);
          padding: 28px 24px;
          box-shadow: 0 25px 60px -12px rgba(0, 0, 0, 0.75);
          transform: scale(0.95);
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          color: var(--color-text, #FFF);
          display: flex;
          flex-direction: column;
          gap: 18px;
        ">
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
              <svg style="width: 26px; height: 26px; color: #FFF;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <span style="font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-primary-light, #5B4CC4);">Aplicación Web Progresiva</span>
              <h3 style="font-size: 1.25rem; font-weight: 700; margin: 2px 0 0 0; color: var(--color-text, #FFF);">Instalar Biblioteca Arcadia</h3>
            </div>
          </div>

          <!-- Descripción -->
          <p style="font-size: 0.88rem; color: var(--color-text-secondary, #A09DB8); line-height: 1.5; margin: 0;">
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
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text, #FFF);">Acceso directo y pantalla completa</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted, #8E88A8);">Ábrela desde el escritorio o inicio sin barras de navegación del explorador.</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; line-height: 1.2;">📖</span>
              <div>
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text, #FFF);">Lectura 100% sin conexión</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted, #8E88A8);">Todos tus libros EPUB, notas, marcas y citas disponibles sin internet.</span>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: flex-start;">
              <span style="font-size: 1.1rem; line-height: 1.2;">🔒</span>
              <div>
                <strong style="font-size: 0.84rem; display: block; color: var(--color-text, #FFF);">Totalmente privada y local</strong>
                <span style="font-size: 0.78rem; color: var(--color-text-muted, #8E88A8);">Tus libros se almacenan en tu dispositivo; cero rastreo y cero servidores externos.</span>
              </div>
            </div>
          </div>

          <div id="install-instruction-box" style="display: none; font-size: 0.82rem; color: var(--color-text-secondary); background: rgba(91, 76, 196, 0.08); border: 1px solid var(--color-primary-glow); border-radius: 8px; padding: 12px 14px; line-height: 1.5;"></div>

          <!-- Botones de Acción -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 4px;">
            <button id="btn-cancel-install" style="
              padding: 9px 18px;
              border-radius: var(--radius-md, 8px);
              background: var(--color-surface-hover, rgba(255, 255, 255, 0.06));
              border: 1px solid var(--color-border, rgba(255, 255, 255, 0.1));
              color: var(--color-text-secondary, #A09DB8);
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s ease;
            ">Cancelar</button>

            <button id="btn-confirm-install" style="
              padding: 9px 22px;
              border-radius: var(--radius-md, 8px);
              border: none;
              font-size: 0.85rem;
              font-weight: 600;
              cursor: pointer;
              background: var(--color-primary-light, #5B4CC4);
              color: #FFF;
              box-shadow: 0 4px 14px var(--color-primary-glow, rgba(91, 76, 196, 0.35));
              transition: all 0.15s ease;
              display: inline-flex;
              align-items: center;
              gap: 6px;
            ">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span id="btn-confirm-install-text">Instalar ahora</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(1)';
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.arcadia-modal-card');
        if (card) card.style.transform = 'scale(0.95)';
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 180);
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
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
