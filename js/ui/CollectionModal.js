/**
 * ============================================================================
 * COLLECTION MODAL - DIÁLOGO DE GESTIÓN Y ASIGNACIÓN DE COLECCIONES
 * ============================================================================
 * Modales accesibles para crear nuevas estanterías, editar existentes y
 * asociar libros a colecciones mediante selectores visuales.
 */

import { CollectionManager } from '../library/CollectionManager.js';
import { Toast } from './Toast.js';
import { Modal } from './Modal.js';

export class CollectionModal {
  /**
   * Abre modal para crear o editar una colección.
   * @param {Object} [collectionToEdit] - Si se pasa, modo edición
   * @param {Function} [onSaved] - Callback tras guardar
   */
  static openEditModal(collectionToEdit = null, onSaved = null) {
    const isEdit = !!collectionToEdit;
    const overlay = document.createElement('div');
    overlay.className = 'theme-modal-overlay';

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
      <div class="theme-modal-dialog" style="max-width: 440px;">
        <div class="theme-modal-header">
          <h2 class="theme-modal-title">${isEdit ? 'Editar Colección' : 'Nueva Colección'}</h2>
          <button class="theme-modal-close" id="btn-close-col-modal" aria-label="Cerrar modal">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form id="col-form" class="arcadia-modal-form">
          <div class="arcadia-modal-field">
            <label>Nombre de la colección</label>
            <input type="text" id="col-name" required value="${isEdit ? this.escapeHtml(collectionToEdit.name) : ''}" placeholder="Ej. Novelas Históricas, Ensayo...">
          </div>

          <div class="arcadia-modal-field">
            <label>Descripción (opcional)</label>
            <textarea id="col-desc" rows="2" placeholder="Breve nota sobre esta temática...">${isEdit ? this.escapeHtml(collectionToEdit.description || '') : ''}</textarea>
          </div>

          <div class="arcadia-modal-field">
            <label>Color distintivo</label>
            <div id="col-colors-wrapper" style="display: flex; gap: 10px; align-items: center; padding-top: 4px;">
              ${colorsHtml}
            </div>
          </div>

          <div class="arcadia-modal-actions" style="margin-top: 16px;">
            ${isEdit ? `
              <button type="button" id="btn-col-delete" class="arcadia-modal-btn arcadia-modal-btn--danger" style="margin-right: auto;">
                <svg style="width: 13px; height: 13px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                <span>Eliminar</span>
              </button>
            ` : ''}
            <button type="button" id="btn-col-cancel" class="arcadia-modal-btn arcadia-modal-btn--ghost">Cancelar</button>
            <button type="submit" class="arcadia-modal-btn arcadia-modal-btn--primary">Guardar</button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

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

    // Eliminar Colección (si está en modo edición)
    if (isEdit) {
      const btnDelete = overlay.querySelector('#btn-col-delete');
      if (btnDelete) {
        btnDelete.addEventListener('click', async () => {
          const confirmed = await Modal.confirm({
            title: 'Eliminar colección',
            message: `¿Estás seguro de que deseas eliminar la colección «${collectionToEdit.name}»?\n\nLos libros continuarán intactos en tu biblioteca.`,
            danger: true,
            confirmText: 'Eliminar colección'
          });

          if (confirmed) {
            await CollectionManager.deleteCollection(collectionToEdit.id);
            closeModal();
            Toast.success('Colección eliminada con éxito.');
            if (onSaved) onSaved();
          }
        });
      }
    }

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
    overlay.className = 'theme-modal-overlay';

    overlay.innerHTML = `
      <div class="theme-modal-dialog" style="max-width: 440px;">
        <div class="theme-modal-header" style="margin-bottom: 16px;">
          <div>
            <h2 class="theme-modal-title" style="font-family: 'Cinzel', serif; letter-spacing: 0.03em;">Asignar a Colección</h2>
            <span style="font-size: var(--text-xs); color: var(--color-text-secondary); display: block; margin-top: 2px;">${this.escapeHtml(book.title)}</span>
          </div>
          <button class="theme-modal-close" id="btn-close-assign-modal" aria-label="Cerrar modal">
            <svg style="width: 18px; height: 18px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="assign-collections-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 340px; overflow-y: auto; margin-bottom: 20px; padding-right: 2px;">
          ${collections.length === 0 ? `
            <div style="padding: 24px 16px; text-align: center; color: var(--color-text-muted); font-size: var(--text-xs);">
              No hay colecciones creadas. Crea una colección en el menú lateral.
            </div>
          ` : (await (async ()=>{
            const counts = await CollectionManager.getCollectionCounts();
            return collections.map(col => {
              const isLinked = linkedIds.has(col.id);
              const count = counts[col.id]||0;
              return `
            <label class="assign-item ${isLinked?'selected':''}" style="
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 12px 16px;
              border-radius: 12px;
              background-color: ${isLinked?'color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))':'var(--color-surface)'};
              border: 1px solid ${isLinked?'var(--color-primary)':'var(--color-border)'};
              cursor: pointer;
              transition: all var(--transition-fast);
            ">
              <span class="assign-check" style="width:18px;height:18px;border-radius:6px;border:1.5px solid ${isLinked?'var(--color-primary)':'var(--color-border)'};background:${isLinked?'var(--color-primary)':'transparent'};display:grid;place-items:center;flex-shrink:0;color:#FFF;font-size:11px;font-weight:700;line-height:1;">${isLinked?'✓':''}</span>
              <input type="checkbox" data-col-id="${col.id}" ${isLinked ? 'checked' : ''} hidden>
              <span style="width:8px; height:8px; border-radius:50%; background-color:${col.color||'#5B4CC4'}; flex-shrink:0;"></span>
              <span style="flex:1; font-size:0.82rem; font-weight:700; color:var(--color-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; text-transform:uppercase; letter-spacing:0.03em;">${this.escapeHtml(col.name)}</span>
              <span style="font-size:0.74rem; color:var(--color-text-muted); flex-shrink:0;">${count} libros</span>
            </label>
          `;}).join('');
          })())}
        </div>

        <div class="arcadia-modal-actions">
          <button id="btn-done-assign" class="arcadia-modal-btn arcadia-modal-btn--primary">Listo</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

    const closeModal = () => overlay.remove();
    overlay.querySelector('#btn-close-assign-modal').addEventListener('click', closeModal);
    overlay.querySelector('#btn-done-assign').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // Checkbox toggling - actualizar estilo pill
    overlay.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const label = chk.closest('.assign-item');
      const checkEl = label?.querySelector('.assign-check');
      chk.addEventListener('change', async () => {
        const colId = chk.dataset.colId;
        if (chk.checked) {
          await CollectionManager.addBookToCollection(book.id, colId);
          Toast.success('Libro añadido a la colección.');
          if(label){label.classList.add('selected');label.style.background='color-mix(in srgb, var(--color-primary) 10%, var(--color-surface))';label.style.borderColor='var(--color-primary)';if(checkEl){checkEl.style.background='var(--color-primary)';checkEl.style.borderColor='var(--color-primary)';checkEl.textContent='✓';}}
        } else {
          await CollectionManager.removeBookFromCollection(book.id, colId);
          Toast.info('Libro retirado de la colección.');
          if(label){label.classList.remove('selected');label.style.background='var(--color-surface)';label.style.borderColor='var(--color-border)';if(checkEl){checkEl.style.background='transparent';checkEl.style.borderColor='var(--color-border)';checkEl.textContent='';}}
        }
        if (onChanged) onChanged();
      });
      // click en label ya toggles checkbox nativo, pero asegurar
      if(label){
        label.addEventListener('click', (e)=>{
          if(e.target!==chk){ e.preventDefault(); chk.checked=!chk.checked; chk.dispatchEvent(new Event('change',{bubbles:true}));}
        });
      }
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
  static escapeAttr(text) {
    return this.escapeHtml(text);
  }
}
