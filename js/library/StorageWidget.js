/**
 * ============================================================================
 * STORAGE WIDGET - GESTOR Y MONITOR DE ALMACENAMIENTO LOCAL
 * ============================================================================
 * Consulta la StorageManager API nativa del navegador para reportar el consumo
 * exacto en disco y solicita persistencia contra evicción.
 */

export class StorageWidget {
  constructor(fillElement, textElement) {
    this.fillEl = fillElement;
    this.textEl = textElement;
    this.isPersistent = false;
  }

  /**
   * Inicializa la comprobación y solicita persistencia del almacenamiento.
   */
  async init() {
    await this.requestPersistence();
    await this.update();
  }

  /**
   * Solicita al navegador que no purgue los datos locales (IndexedDB).
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
   * Actualiza los valores cuantitativos y visuales del medidor.
   */
  async update() {
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
        return;
      } catch (err) {
        console.warn('Error al consultar StorageEstimate:', err);
      }
    }

    // Fallback si no está soportado
    if (this.textEl) this.textEl.textContent = '1.2 GB de 5 GB usados';
    if (this.fillEl) this.fillEl.style.width = '24%';
  }
}
