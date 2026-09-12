/**
 * ============================================================================
 * CUSTOM SELECT - DESPLEGABLE PERSONALIZADO
 * ============================================================================
 * Convierte un <select> nativo en un desplegable con el diseño de la app:
 * botón con chevron animado y menú propio con check en la opción activa.
 * El <select> original se conserva sincronizado (sigue emitiendo 'change'),
 * así que los listeners existentes continúan funcionando sin cambios.
 */

export class CustomSelect {
  /**
   * Mejora un <select> nativo. Seguro de llamar varias veces: ignora
   * elementos ya mejorados.
   * @param {HTMLSelectElement} selectEl - Select nativo a mejorar
   * @returns {{sync: Function, close: Function} | null}
   */
  static enhance(selectEl) {
    if (!selectEl || selectEl.dataset.cselect === '1') return null;
    selectEl.dataset.cselect = '1';

    const doc = selectEl.ownerDocument;

    const wrapper = doc.createElement('div');
    wrapper.className = 'cselect';
    selectEl.parentNode.insertBefore(wrapper, selectEl);
    wrapper.appendChild(selectEl);

    // Ocultar el chevron decorativo antiguo (toolbar de biblioteca)
    const host = wrapper.parentElement;
    if (host) {
      const oldChevron = host.querySelector(':scope > .sort-icon-chevron');
      if (oldChevron) oldChevron.style.display = 'none';
    }

    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'cselect-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');

    const label = doc.createElement('span');
    label.className = 'cselect-label';

    const chev = doc.createElement('span');
    chev.className = 'cselect-chev';
    chev.setAttribute('aria-hidden', 'true');
    chev.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>';

    btn.append(label, chev);

    const menu = doc.createElement('div');
    menu.className = 'cselect-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;

    const CHECK_SVG = '<svg class="cselect-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';

    const syncFromNative = () => {
      const opt = selectEl.selectedOptions.length > 0 ? selectEl.selectedOptions[0] : null;
      label.textContent = opt ? opt.textContent.trim() : '';
      btn.setAttribute('aria-label', label.textContent);
      menu.querySelectorAll('.cselect-option').forEach(o => {
        const selected = o.dataset.value === selectEl.value;
        o.classList.toggle('selected', selected);
        o.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
    };

    const buildMenu = () => {
      menu.innerHTML = '';
      Array.from(selectEl.options).forEach(opt => {
        const text = opt.textContent.trim();
        const o = doc.createElement('div');
        o.className = 'cselect-option';
        o.setAttribute('role', 'option');
        o.dataset.value = opt.value;
        o.title = text;
        o.innerHTML = CHECK_SVG + '<span class="cselect-text"></span>';
        o.querySelector('.cselect-text').textContent = text;
        o.addEventListener('click', () => {
          if (selectEl.value !== opt.value) {
            selectEl.value = opt.value;
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          }
          syncFromNative();
          close();
          btn.focus();
        });
        menu.appendChild(o);
      });
      syncFromNative();
    };

    const open = () => {
      buildMenu();
      menu.hidden = false;
      wrapper.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      if (menu.hidden) return;
      menu.hidden = true;
      wrapper.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    };
    const toggle = () => (menu.hidden ? open() : close());

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
      } else if ((e.key === 'Enter' || e.key === ' ') && menu.hidden) {
        e.preventDefault();
        open();
      }
    });
    menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        btn.focus();
      }
    });
    doc.addEventListener('pointerdown', (e) => {
      if (!wrapper.contains(e.target)) close();
    }, true);

    // Si el valor cambia por código, reflejarlo en el botón
    selectEl.addEventListener('change', syncFromNative);

    wrapper.append(btn, menu);
    buildMenu();

    return { sync: syncFromNative, close };
  }
}
