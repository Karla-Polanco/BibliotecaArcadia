/**
 * ============================================================================
 * TOAST NOTIFIER - NOTIFICACIONES ACCESIBLES
 * ============================================================================
 * Proporciona avisos emergentes no intrusivos con soporte para ARIA live region.
 */

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
   * @param {string} message - Texto a mostrar
   * @param {'info'|'success'|'error'|'warning'} type - Tipo de notificación
   * @param {number} duration - Duración en milisegundos (defecto: 3500ms)
   */
  static show(message, type = 'info', duration = 3500) {
    const container = this._ensureContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast-message toast-${type}`;
    toastEl.style.cssText = `
      background-color: var(--color-surface-elevated, #242424);
      color: var(--color-text, #F2F0F7);
      border: 1px solid var(--color-border, #303030);
      border-left: 4px solid ${this._getTypeColor(type)};
      padding: 12px 16px;
      border-radius: var(--radius-md, 12px);
      box-shadow: var(--shadow-card, 0 10px 30px rgba(0,0,0,0.5));
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
      <div style="display: flex; align-items: center; gap: 10px;">
        ${this._getTypeIcon(type)}
        <span>${this._escape(message)}</span>
      </div>
      <button style="color: var(--color-text-muted); padding: 4px; border-radius: 4px; cursor: pointer;" aria-label="Cerrar">
        <svg style="width: 14px; height: 14px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    `;

    container.appendChild(toastEl);

    // Animación de entrada
    requestAnimationFrame(() => {
      toastEl.style.transform = 'translateY(0)';
      toastEl.style.opacity = '1';
    });

    const closeBtn = toastEl.querySelector('button');
    const dismiss = () => {
      toastEl.style.transform = 'translateY(12px)';
      toastEl.style.opacity = '0';
      setTimeout(() => toastEl.remove(), 250);
    };

    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
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
        return '<svg style="width: 18px; height: 18px; color: #10B981; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
      case 'error':
        return '<svg style="width: 18px; height: 18px; color: #EF4444; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
      case 'warning':
        return '<svg style="width: 18px; height: 18px; color: #F59E0B; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
      default:
        return '<svg style="width: 18px; height: 18px; color: var(--color-primary-light); flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    }
  }

  static _escape(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}
