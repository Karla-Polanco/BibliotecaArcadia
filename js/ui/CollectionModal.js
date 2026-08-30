/**
 * ============================================================================
 * COLLECTION MODAL - DIÁLOGO DE GESTIÓN Y ASIGNACIÓN DE COLECCIONES
 * ============================================================================
 * Modales accesibles para crear nuevas estanterías, editar existentes y
 * asociar libros a colecciones mediante selectores visuales.
 */

import { CollectionManager } from '../library/CollectionManager.js';
import { Toast } from './Toast.js';

export class CollectionModal {
  /**
   * Abre modal para crear o editar una colección.
   * @param {Object} [collectionToEdit] - Si se pasa, modo edición
   * @param {Function} [onSaved] - Callback tras guardar
   */
  static openEditModal(collectionToEdit = null, onSaved = null) {
    const isEdit = !!collectionToEdit;
    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay active';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    let selectedColor = isEdit ? collectionToEdit.color : CollectionManager.PRESET_COLORS[0].value;

    const colorsHtml = CollectionManager.PRESET_COLORS.map(c => `
      <div class="color-swatch-chip ${c.value === selectedColor ? 'active' : ''}" data-color="${c.value}" style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: ${c.value};
        cursor: pointer;
        border: 2px solid ${c.value === selectedColor ? '#FFFFFF' : 'transparent'};
        box-shadow: ${c.value === selectedColor ? '0 0 0 2px var(--color-primary-light)' : 'none'};
        transition: transform 0.15s ease;
      " title="${c.name}"></div>
    `).join('');

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 440px; padding: 24px;">
        <div class="theme-modal-header" style="margin-bottom: 16px;">
          <h2 class="theme-modal-title">${isEdit ? 'Editar Colección' : 'Nueva Colección'}</h2>
          <button class="theme-modal-close" id="btn-close-col-modal">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form id="col-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: 6px; font-weight: bold;">NOMBRE DE LA COLECCIÓN</label>
            <input type="text" id="col-name" required value="${isEdit ? this.escapeHtml(collectionToEdit.name) : ''}" placeholder="Ej. Novelas Históricas, Ensayo..." style="
              width: 100%;
              padding: 10px 14px;
              border-radius: var(--radius-sm);
              background-color: var(--color-surface);
              border: 1px solid var(--color-border);
              color: var(--color-text);
              font-size: var(--text-sm);
              outline: none;
            ">
          </div>

          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: 6px; font-weight: bold;">DESCRIPCIÓN (OPCIONAL)</label>
            <textarea id="col-desc" rows="2" placeholder="Breve nota sobre esta temática..." style="
              width: 100%;
              padding: 10px 14px;
              border-radius: var(--radius-sm);
              background-color: var(--color-surface);
              border: 1px solid var(--color-border);
              color: var(--color-text);
              font-size: var(--text-sm);
              outline: none;
              resize: none;
            ">${isEdit ? this.escapeHtml(collectionToEdit.description || '') : ''}</textarea>
          </div>

          <div>
            <label style="display: block; font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: 8px; font-weight: bold;">COLOR DISTINTIVO</label>
            <div id="col-colors-wrapper" style="display: flex; gap: 10px; align-items: center;">
              ${colorsHtml}
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
            <button type="button" id="btn-col-cancel" style="padding: 8px 16px; border-radius: var(--radius-sm); font-size: var(--text-xs); color: var(--color-text-secondary); cursor: pointer;">Cancelar</button>
            <button type="submit" style="padding: 8px 20px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: bold; background-color: var(--color-primary-light); color: #FFFFFF; cursor: pointer;">Guardar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Selección de color
    overlay.querySelectorAll('.color-swatch-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedColor = chip.dataset.color;
        overlay.querySelectorAll('.color-swatch-chip').forEach(c => {
          c.style.border = c.dataset.color === selectedColor ? '2px solid #FFFFFF' : 'transparent';
          c.style.boxShadow = c.dataset.color === selectedColor ? '0 0 0 2px var(--color-primary-light)' : 'none';
        });
      });
    });

    const closeModal = () => overlay.remove();
    overlay.querySelector('#btn-close-col-modal').addEventListener('click', closeModal);
    overlay.querySelector('#btn-col-cancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Guardar
    overlay.querySelector('#col-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = overlay.querySelector('#col-name').value.trim();
      const desc = overlay.querySelector('#col-desc').value.trim();

      if (!name) return;

      try {
        if (isEdit) {
          await CollectionManager.updateCollection(collectionToEdit.id, {
            name,
            description: desc,
            color: selectedColor
          });
          Toast.success(`Colección "${name}" actualizada.`);
        } else {
          await CollectionManager.createCollection(name, desc, selectedColor);
          Toast.success(`Colección "${name}" creada.`);
        }
        closeModal();
        if (onSaved) onSaved();
      } catch (err) {
        Toast.error(err.message || 'Error al guardar colección.');
      }
    });
  }

  /**
   * Abre modal para asignar un libro a colecciones mediante checkboxes interactivos.
   * @param {Object} book - Libro a asociar
   * @param {Function} [onChanged] - Callback tras alternar colección
   */
  static async openAssignModal(book, onChanged = null) {
    const collections = await CollectionManager.getAllCollections();
    const bookCollections = await CollectionManager.getCollectionsForBook(book.id);
    const linkedIds = new Set(bookCollections.map(c => c.id));

    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay active';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      height: 100dvh;
      z-index: 99999;
      background: rgba(0, 0, 0, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
    `;

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 420px; padding: 24px;">
        <div class="theme-modal-header" style="margin-bottom: 16px;">
          <div>
            <h2 class="theme-modal-title">Asignar a Colección</h2>
            <span style="font-size: var(--text-xs); color: var(--color-text-muted);">${this.escapeHtml(book.title)}</span>
          </div>
          <button class="theme-modal-close" id="btn-close-assign-modal">
            <svg style="width: 20px; height: 20px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="assign-collections-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">
          ${collections.length === 0 ? `
            <div style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: var(--text-xs);">
              No hay colecciones creadas. Crea una colección en el menú lateral.
            </div>
          ` : collections.map(col => `
            <label style="
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 12px;
              border-radius: var(--radius-sm);
              background-color: var(--color-surface);
              border: 1px solid var(--color-border);
              cursor: pointer;
              transition: background-color var(--transition-fast);
            ">
              <input type="checkbox" data-col-id="${col.id}" ${linkedIds.has(col.id) ? 'checked' : ''} style="accent-color: var(--color-primary-light); width: 16px; height: 16px;">
              <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${col.color || '#5B4CC4'};"></span>
              <div style="flex: 1; display: flex; flex-direction: column;">
                <span style="font-size: var(--text-xs); font-weight: bold; color: var(--color-text);">${this.escapeHtml(col.name)}</span>
                ${col.description ? `<span style="font-size: 0.7rem; color: var(--color-text-muted);">${this.escapeHtml(col.description)}</span>` : ''}
              </div>
            </label>
          `).join('')}
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button id="btn-done-assign" style="padding: 8px 20px; border-radius: var(--radius-sm); font-size: var(--text-xs); font-weight: bold; background-color: var(--color-primary-light); color: #FFFFFF; cursor: pointer;">Listo</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#btn-close-assign-modal').addEventListener('click', closeModal);
    overlay.querySelector('#btn-done-assign').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Checkbox toggling
    overlay.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', async () => {
        const colId = chk.dataset.colId;
        if (chk.checked) {
          await CollectionManager.addBookToCollection(book.id, colId);
          Toast.success('Libro añadido a la colección.');
        } else {
          await CollectionManager.removeBookFromCollection(book.id, colId);
          Toast.info('Libro retirado de la colección.');
        }
        if (onChanged) onChanged();
      });
    });
  }

  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
