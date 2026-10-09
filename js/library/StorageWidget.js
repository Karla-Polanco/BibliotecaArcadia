/**
 * ============================================================================
 * STORAGE WIDGET - GESTOR Y MONITOR DE ALMACENAMIENTO LOCAL
 * ============================================================================
 * Consulta la StorageManager API nativa del navegador para reportar el consumo
 * exacto en disco y solicita persistencia contra evicción.
 */

export class StorageWidget {
  /**
   * @param {HTMLElement} fillElement - Elemento visual de la barra de progreso
   * @param {HTMLElement} textElement - Elemento que muestra el texto descriptivo
   */
  constructor(fillElement, textElement) {
    this.fillEl = fillElement;
    this.textEl = textElement;
    this.isPersistent = false;
    this.widgetEl = document.querySelector('.storage-widget');
    this.toggleBtn = document.querySelector('.btn-storage-toggle');
    this.headerEl = document.querySelector('.storage-header');
  }

  /**
   * Inicializa eventos de colapso, solicita cuota persistente y actualiza las métricas.
   */
  async init() {
    this.setupMinimizeToggle();
    await this.requestPersistence();
    await this.update();
  }

  /**
   * Configura el botón para colapsar/expandir el widget y persiste la preferencia en localStorage.
   */
  setupMinimizeToggle() {
    if (!this.widgetEl) {
      this.widgetEl = document.querySelector('.storage-widget');
    }
    if (!this.widgetEl) return;

    if (!this.toggleBtn) {
      this.toggleBtn = this.widgetEl.querySelector('.btn-storage-toggle');
    }
    if (!this.headerEl) {
      this.headerEl = this.widgetEl.querySelector('.storage-header');
    }

    // Restaurar estado colapsado guardado por el usuario
    const savedState = localStorage.getItem('arcadia_storage_collapsed');
    if (savedState === 'true') {
      this.widgetEl.classList.add('is-collapsed');
    }

    const handleToggle = (e) => {
      e.stopPropagation();
      const isNowCollapsed = this.widgetEl.classList.toggle('is-collapsed');
      localStorage.setItem('arcadia_storage_collapsed', isNowCollapsed ? 'true' : 'false');
    };

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', handleToggle);
    }
    if (this.headerEl) {
      this.headerEl.addEventListener('click', (e) => {
        if (e.target.closest('.btn-storage-toggle')) return;
        handleToggle(e);
      });
    }
  }

  /**
   * Solicita al navegador persistencia de datos para prevenir desalojos automáticos de IndexedDB.
   */
  async requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        this.isPersistent = await navigator.storage.persist();
        if (this.isPersistent) {
          console.log('✦ Almacenamiento persistente garantizado por el navegador.');
        }
      } catch (e) {
        console.warn('No se pudo solicitar persistencia de almacenamiento:', e);
      }
    }
  }

  /**
   * Consulta el uso actual y la cuota total con navigator.storage.estimate y actualiza el DOM.
   */
  async update() {
    const setProgress = (pct) => {
      const track = document.getElementById('storage-progress-track');
      if (track) {
        track.setAttribute('aria-valuenow', String(Math.round(pct)));
        track.setAttribute('aria-valuetext', `${Math.round(pct)}% de almacenamiento usado`);
      }
    };
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1;

        const usedMB = (usageBytes / (1024 * 1024)).toFixed(1);
        const totalGB = (quotaBytes / (1024 * 1024 * 1024)).toFixed(1);
        const percentage = Math.min(100, Math.max(3, Math.round((usageBytes / quotaBytes) * 100)));

        if (this.textEl) {
          this.textEl.textContent = `${usedMB} MB de ${totalGB} GB usados`;
          this.textEl.title = this.isPersistent ? 'Almacenamiento persistente activo' : 'Almacenamiento estándar';
        }

        if (this.fillEl) {
          this.fillEl.style.width = `${percentage}%`;
        }
        setProgress(percentage);
        return;
      } catch (err) {
        console.warn('Error al consultar StorageEstimate:', err);
      }
    }

    // Fallback si no está soportado (sin datos inventados: estado indeterminado)
    if (this.textEl) this.textEl.textContent = 'Almacenamiento no disponible en este navegador';
    if (this.fillEl) this.fillEl.style.width = '0%';
    setProgress(0);
  }
}
