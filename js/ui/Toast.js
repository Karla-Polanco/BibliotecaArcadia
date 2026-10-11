/**
 * ============================================================================
 * TOAST NOTIFIER - NOTIFICACIONES ACCESIBLES
 * ============================================================================
 * Proporciona avisos emergentes no intrusivos con soporte para ARIA live region.
 */

import { Icons } from './Icons.js';

export class Toast {
  static container = null;

  static _ensureContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  /**
   * Muestra un mensaje emergente.
   * Dura 8 segundos por defecto, se pausa al pasar el cursor por encima
   * y siempre puede cerrarse manualmente con su botón ✕.
   * @param {string} message - Texto a mostrar
   * @param {'info'|'success'|'error'|'warning'} type - Tipo de notificación
   * @param {number} duration - Duración en milisegundos (defecto: 8000ms, 0 = persistente)
   */
  static show(message, type = 'info', duration = 8000) {
    const container = this._ensureContainer();
    this._ensureCloseStyles();

    const toastEl = document.createElement('div');
    toastEl.className = `toast-message toast-${type}`;

    toastEl.innerHTML = `
      <div class="toast-body-content">
        ${this._getTypeIcon(type)}
        <span>${this._escape(message)}</span>
      </div>
      <button class="toast-close-btn btn--close" aria-label="Cerrar notificación" title="Cerrar">
        ${Icons.CLOSE}
      </button>
    `;

    container.appendChild(toastEl);

    // Animación de entrada (vía clase, sin inline styles)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toastEl.classList.add('toast-visible'));
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      toastEl.classList.remove('toast-visible');
      setTimeout(() => toastEl.remove(), 250);
    };

    const closeBtn = toastEl.querySelector('.toast-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismiss();
    });

    // Auto-cierre con pausa al pasar el cursor (para poder leer con calma)
    let remaining = duration;
    let timer = null;
    let startedAt = 0;
    const schedule = () => {
      clearTimeout(timer);
      if (remaining <= 0 || duration <= 0) return;
      startedAt = Date.now();
      timer = setTimeout(dismiss, remaining);
    };
    toastEl.addEventListener('mouseenter', () => {
      clearTimeout(timer);
      if (duration > 0) remaining -= Date.now() - startedAt;
    });
    toastEl.addEventListener('mouseleave', () => {
      if (dismissed) return;
      if (duration <= 0) return;
      if (remaining <= 0) { dismiss(); return; }
      schedule();
    });

    if (duration > 0) {
      schedule();
    }
  }

  static _ensureCloseStyles() {
    // No-op (styles in main.css)
  }

  static success(msg, duration) { this.show(msg, 'success', duration); }
  static error(msg, duration) { this.show(msg, 'error', duration); }
  static info(msg, duration) { this.show(msg, 'info', duration); }
  static warning(msg, duration) { this.show(msg, 'warning', duration); }

  static _getTypeColor(type) {
    // El color vive en CSS (.toast-success / .toast-error / ...).
    // Se mantiene por compatibilidad, pero ya no se inyecta inline.
    switch (type) {
      case 'success': return 'var(--state-success)';
      case 'error': return 'var(--state-danger)';
      case 'warning': return 'var(--state-warning, #F59E0B)';
      default: return 'var(--color-primary-light)';
    }
  }

  static _getTypeIcon(type) {
    switch (type) {
      case 'success':
        return '<svg class="toast-icon success" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>';
      case 'error':
        return '<svg class="toast-icon error" aria-hidden="true"><use href="./assets/icons/icons.svg#close"></use></svg>';
      case 'warning':
        return '<svg class="toast-icon warning" aria-hidden="true"><use href="./assets/icons/icons.svg#alert-triangle"></use></svg>';
      default:
        return '<svg class="toast-icon info" aria-hidden="true"><use href="./assets/icons/icons.svg#info-circle"></use></svg>';
    }
  }

  static _escape(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
