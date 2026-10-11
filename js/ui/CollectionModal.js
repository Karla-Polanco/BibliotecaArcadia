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
import { Icons } from './Icons.js';
import { escapeHtml, escapeAttr } from '../utils.js';

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
      <button type="button" class="color-swatch-chip ${c.value === selectedColor ? 'active' : ''}" data-color="${c.value}" style="background-color: ${c.value};" title="${c.name}" aria-label="Color ${c.name}" aria-pressed="${c.value === selectedColor}"></button>
    `).join('');

    overlay.innerHTML = `
      <div class="theme-modal-dialog arcadia-modal-card--md">
        <div class="theme-modal-header">
          <div>
            <h2 class="theme-modal-title">${isEdit ? 'Editar Colección' : 'Nueva Colección'}</h2>
            <p class="theme-modal-subtitle">${isEdit ? 'Modifica los campos y guarda los cambios.' : 'Completa los campos para agregar una nueva colección.'}</p>
          </div>
          <button class="theme-modal-close btn--close" id="btn-close-col-modal" aria-label="Cerrar modal">
            ${Icons.CLOSE}
          </button>
        </div>

        <form id="col-form" class="arcadia-modal-form">
          <div class="arcadia-modal-field">
            <div class="vocab-modal-label-row">
              <label for="col-name">Nombre de la colección <span class="vocab-modal-required-dot" aria-hidden="true"></span></label>
            </div>
            <input type="text" id="col-name" required value="${isEdit ? this.escapeHtml(collectionToEdit.name) : ''}" placeholder="Ej. Novelas Históricas, Ensayo..." autocomplete="off">
          </div>

          <div class="arcadia-modal-field">
            <div class="vocab-modal-label-row">
              <label for="col-desc">Descripción</label>
              <span class="vocab-modal-optional-tag">Opcional</span>
            </div>
            <textarea id="col-desc" rows="2" placeholder="Breve nota sobre esta temática...">${isEdit ? this.escapeHtml(collectionToEdit.description || '') : ''}</textarea>
          </div>

          <div class="arcadia-modal-field">
            <div class="vocab-modal-label-row">
              <label>Color distintivo</label>
            </div>
            <div id="col-colors-wrapper" class="col-colors-wrapper" role="group" aria-label="Color distintivo">
              ${colorsHtml}
            </div>
          </div>

          <div class="arcadia-modal-actions">
            ${isEdit ? `
              <button type="button" id="btn-col-delete" class="btn btn--danger modal-action-push-left">
                ${Icons.TRASH}
                <span>Eliminar</span>
              </button>
            ` : ''}
            <button type="button" id="btn-col-cancel" class="btn btn--ghost">Cancelar</button>
            <button type="submit" id="btn-col-save" class="btn btn--primary" disabled>${Icons.SAVE}<span>Guardar</span></button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));

    // Guardar deshabilitado hasta escribir el nombre (igual que vocabulario)
    const colNameInput = overlay.querySelector('#col-name');
    const colSaveBtn = overlay.querySelector('#btn-col-save');
    const syncColSaveState = () => {
      if (colSaveBtn) colSaveBtn.disabled = colNameInput.value.trim().length === 0;
    };
    if (colNameInput) colNameInput.addEventListener('input', syncColSaveState);
    syncColSaveState();

    // Selección de color — solo alterna la clase .active (el estilo vive en CSS)
    overlay.querySelectorAll('.color-swatch-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedColor = chip.dataset.color;
        overlay.querySelectorAll('.color-swatch-chip').forEach(c => {
          const isActive = c.dataset.color === selectedColor;
          c.classList.toggle('active', isActive);
          c.setAttribute('aria-pressed', isActive);
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
      <div class="theme-modal-dialog arcadia-modal-card--md">
        <div class="theme-modal-header">
          <div>
            <h2 class="theme-modal-title">Asignar a Colección</h2>
            <span class="theme-modal-subtitle">${this.escapeHtml(book.title)}</span>
          </div>
          <button class="theme-modal-close btn--close" id="btn-close-assign-modal" aria-label="Cerrar modal">
            ${Icons.CLOSE}
          </button>
        </div>

        <div class="assign-collections-list">
          ${collections.length === 0 ? `
            <div class="assign-empty">
              No hay colecciones creadas. Crea una colección en el menú lateral.
            </div>
          ` : (await (async ()=>{
            const counts = await CollectionManager.getCollectionCounts();
            return collections.map(col => {
              const isLinked = linkedIds.has(col.id);
              const count = counts[col.id]||0;
              return `
            <label class="assign-item ${isLinked?'selected':''}">
              <span class="assign-check" aria-hidden="true">${isLinked?'✓':''}</span>
              <input type="checkbox" data-col-id="${col.id}" ${isLinked ? 'checked' : ''} hidden>
              <span class="assign-dot" style="background-color:${col.color||'#5B4CC4'};"></span>
              <span class="assign-name">${this.escapeHtml(col.name)}</span>
              <span class="assign-count">${count} libros</span>
            </label>
          `;}).join('');
          })())}
        </div>

        <div class="arcadia-modal-actions">
          <button id="btn-done-assign" class="btn btn--primary">${Icons.CHECK}<span>Listo</span></button>
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

    // Checkbox toggling - solo alterna .selected (el estilo vive en CSS)
    overlay.querySelectorAll('input[type="checkbox"]').forEach(chk => {
      const label = chk.closest('.assign-item');
      const checkEl = label?.querySelector('.assign-check');
      chk.addEventListener('change', async () => {
        const colId = chk.dataset.colId;
        if (chk.checked) {
          await CollectionManager.addBookToCollection(book.id, colId);
          Toast.success('Libro añadido a la colección.');
          if(label){label.classList.add('selected');if(checkEl){checkEl.textContent='✓';}}
        } else {
          await CollectionManager.removeBookFromCollection(book.id, colId);
          Toast.info('Libro retirado de la colección.');
          if(label){label.classList.remove('selected');if(checkEl){checkEl.textContent='';}}
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
    return escapeHtml(text);
  }
  static escapeAttr(text) {
    return escapeAttr(text);
  }
}
