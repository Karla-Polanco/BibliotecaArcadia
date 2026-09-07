/**
 * ============================================================================
 * QUOTE MODAL - MODAL PARA CREAR Y EDITAR FRASES Y CITAS LITERARIAS
 * ============================================================================
 */

import { QuotesManager } from '../quotes/QuotesManager.js';
import { Toast } from './Toast.js';

export class QuoteModal {
  /**
   * Abre el modal para crear una nueva frase o editar una existente.
   * @param {Object|null} editQuote - Si se pasa, edita esta frase
   * @param {Function} onSaved - Callback ejecutado al guardar
   */
  static open(editQuote = null, onSaved = null) {
    // Eliminar modales previos si existieran
    const prev = document.getElementById('arcadia-quote-modal');
    if (prev) prev.remove();

    const isEdit = !!editQuote;
    const initialText = isEdit ? (editQuote.text || '').replace(/^«|»$/g, '') : '';
    const initialAuthor = isEdit ? (editQuote.author || '') : '';
    const initialSource = isEdit ? (editQuote.source || '') : '';
    const initialFavorite = isEdit ? !!editQuote.favorite : false;

    const backdrop = document.createElement('div');
    backdrop.id = 'arcadia-quote-modal';
    backdrop.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      background-color: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      opacity: 0;
      transition: opacity 0.2s ease;
      box-sizing: border-box;
    `;

    backdrop.innerHTML = `
      <div style="
        background: var(--color-surface, #1E1B2E);
        border: 1px solid var(--color-border, rgba(255,255,255,0.12));
        border-radius: var(--radius-lg, 16px);
        width: 100%;
        max-width: 520px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        animation: modalScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      ">
        <!-- Header -->
        <div style="padding: 20px 24px 16px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--color-border, rgba(255,255,255,0.08));">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background-color: var(--color-surface-secondary); display: flex; align-items: center; justify-content: center; color: var(--color-primary-light);">
              <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
            <div>
              <h2 style="margin: 0; font-size: 1.1rem; font-weight: bold; color: var(--color-text, #FFF);">${isEdit ? 'Editar Frase' : 'Nueva Frase Literaria'}</h2>
              <span style="font-size: 0.72rem; color: var(--color-text-muted);">Escribe una cita memorable o reflexión personal</span>
            </div>
          </div>
          <button id="btn-modal-close" style="background: none; border: none; color: var(--color-text-muted); cursor: pointer; padding: 4px; border-radius: 4px;">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Form Body -->
        <form id="form-quote-modal" style="padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; margin: 0;">
          <!-- Texto de la frase -->
          <div>
            <label style="display: block; font-size: 0.75rem; font-weight: bold; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Cita o Frase *</label>
            <textarea id="modal-quote-text" rows="4" placeholder="Escribe aquí tu frase literaria favorita o reflexión..." required style="
              width: 100%;
              box-sizing: border-box;
              padding: 12px 14px;
              border-radius: var(--radius-sm, 8px);
              background-color: var(--color-background, #12101C);
              border: 1.5px solid var(--color-border, rgba(255,255,255,0.12));
              color: var(--color-text, #FFF);
              font-family: var(--font-serif, Georgia, serif);
              font-size: 1.1rem;
              font-style: italic;
              line-height: 1.55;
              resize: vertical;
              outline: none;
            ">${initialText}</textarea>
          </div>

          <!-- Autor y Fuente en 2 columnas -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: bold; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Autor</label>
              <input type="text" id="modal-quote-author" value="${initialAuthor}" placeholder="Ej: Gabriel García Márquez" style="
                width: 100%;
                box-sizing: border-box;
                padding: 10px 12px;
                border-radius: var(--radius-sm, 8px);
                background-color: var(--color-background, #12101C);
                border: 1.5px solid var(--color-border, rgba(255,255,255,0.12));
                color: var(--color-text, #FFF);
                font-size: 0.85rem;
                outline: none;
              ">
            </div>

            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: bold; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Libro o Fuente (Opcional)</label>
              <input type="text" id="modal-quote-source" value="${initialSource}" placeholder="Ej: Cien años de soledad" style="
                width: 100%;
                box-sizing: border-box;
                padding: 10px 12px;
                border-radius: var(--radius-sm, 8px);
                background-color: var(--color-background, #12101C);
                border: 1.5px solid var(--color-border, rgba(255,255,255,0.12));
                color: var(--color-text, #FFF);
                font-size: 0.85rem;
                outline: none;
              ">
            </div>
          </div>

          <!-- Checkbox Favorita -->
          <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--color-text-secondary); cursor: pointer;">
            <input type="checkbox" id="modal-quote-favorite" ${initialFavorite ? 'checked' : ''} style="accent-color: var(--color-primary-light); width: 16px; height: 16px; cursor: pointer;">
            <span>Marcar como frase destacada / favorita ⭐</span>
          </label>

          <!-- Footer Actions -->
          <div style="display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 8px; border-top: 1px solid var(--color-border, rgba(255,255,255,0.08)); padding-top: 16px;">
            <button type="button" id="btn-modal-cancel" style="
              padding: 9px 18px;
              border-radius: var(--radius-sm, 8px);
              background-color: var(--color-surface-hover, rgba(255,255,255,0.08));
              color: var(--color-text, #FFF);
              font-size: 0.82rem;
              font-weight: 600;
              border: 1px solid var(--color-border, rgba(255,255,255,0.12));
              cursor: pointer;
            ">Cancelar</button>

            <button type="submit" id="btn-modal-save" style="
              padding: 9px 22px;
              border-radius: var(--radius-sm, 8px);
              background-color: var(--color-primary-light);
              color: #FFFFFF;
              font-size: 0.82rem;
              font-weight: bold;
              border: none;
              cursor: pointer;
              box-shadow: 0 4px 12px var(--color-primary-glow, rgba(123,107,240,0.4));
            ">${isEdit ? 'Guardar Cambios' : 'Añadir Frase'}</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      document.getElementById('modal-quote-text')?.focus();
    });

    const close = () => {
      backdrop.style.opacity = '0';
      setTimeout(() => backdrop.remove(), 200);
    };

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.querySelector('#btn-modal-close')?.addEventListener('click', close);
    backdrop.querySelector('#btn-modal-cancel')?.addEventListener('click', close);

    backdrop.querySelector('#form-quote-modal')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const textVal = document.getElementById('modal-quote-text')?.value.trim();
      const authorVal = document.getElementById('modal-quote-author')?.value.trim();
      const sourceVal = document.getElementById('modal-quote-source')?.value.trim();
      const favVal = document.getElementById('modal-quote-favorite')?.checked;

      if (!textVal) {
        Toast.error('Por favor escribe el texto de la frase.');
        return;
      }

      try {
        if (isEdit) {
          await QuotesManager.updateQuote(editQuote.id, {
            text: textVal,
            author: authorVal,
            source: sourceVal,
            favorite: favVal
          });
          Toast.success('Frase actualizada correctamente.');
        } else {
          await QuotesManager.addQuote({
            text: textVal,
            author: authorVal,
            source: sourceVal,
            favorite: favVal
          });
          Toast.success('¡Frase añadida a tu colección!');
        }

        close();
        if (onSaved) onSaved();
      } catch (err) {
        console.error(err);
        Toast.error(err.message || 'Error al guardar la frase.');
      }
    });
  }
}
