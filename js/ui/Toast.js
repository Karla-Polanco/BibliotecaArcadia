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
      this.container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: var(--z-toast, 300);
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
        max-width: 90vw;
        width: 380px;
      `;
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
    toastEl.style.cssText = `
      background-color: var(--toast-bg, var(--color-surface-elevated, var(--color-surface)));
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-left: 4px solid ${this._getTypeColor(type)};
      padding: 12px 16px;
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-xl, 0 10px 30px rgba(0,0,0,0.35));
      font-size: var(--text-sm, 14px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      pointer-events: auto;
      transform: translateY(12px);
      opacity: 0;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    `;

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

    // Animación de entrada
    requestAnimationFrame(() => {
      toastEl.style.transform = 'translateY(0)';
      toastEl.style.opacity = '1';
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      clearTimeout(timer);
      toastEl.style.transform = 'translateY(12px)';
      toastEl.style.opacity = '0';
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
    switch (type) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return 'var(--color-primary-light, #5B4CC4)';
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
