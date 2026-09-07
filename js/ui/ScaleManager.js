/**
 * ============================================================================
 * SCALE MANAGER - CONTROLADOR DE TAMAÑO DE TEXTO Y ZOOM DE LA APLICACIÓN
 * ============================================================================
 * Permite ajustar la escala global de la interfaz y la tipografía con persistencia
 * en localStorage y aplicación instantánea en documentElement.
 */

export class ScaleManager {
  static STORAGE_KEY = 'arcadia_ui_scale';
  static DEFAULT_SCALE = 100;
  static MIN_SCALE = 80;
  static MAX_SCALE = 150;
  static STEP = 5;

  static currentScale = ScaleManager.DEFAULT_SCALE;

  /**
   * Inicializa la escala guardada en localStorage o la predeterminada.
   */
  static init() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && !isNaN(parseInt(saved))) {
        this.currentScale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, parseInt(saved)));
      } else {
        this.currentScale = this.DEFAULT_SCALE;
      }
    } catch (e) {
      this.currentScale = this.DEFAULT_SCALE;
    }

    this.applyScale(this.currentScale, false);
    this.initControls();
  }

  /**
   * Aplica la escala al elemento raíz del documento.
   * @param {number} percent - Porcentaje de escala (ej. 90, 100, 115, 130)
   * @param {boolean} persist - Si debe guardarse en localStorage
   */
  static applyScale(percent, persist = true) {
    const scale = Math.max(this.MIN_SCALE, Math.min(this.MAX_SCALE, Math.round(percent)));
    this.currentScale = scale;

    const basePx = 16.5;
    const computedPx = (basePx * (scale / 100)).toFixed(2);
    document.documentElement.style.fontSize = `${computedPx}px`;

    if (persist) {
      try {
        localStorage.setItem(this.STORAGE_KEY, scale.toString());
      } catch (e) {}
    }

    this.updateControlsUI();
  }

  /**
   * Sincroniza los controles del modal de Ajustes con la escala activa.
   */
  static updateControlsUI() {
    const labelEl = document.getElementById('label-scale-percent');
    if (labelEl) {
      labelEl.textContent = `${this.currentScale}%`;
    }

    document.querySelectorAll('.btn-ui-scale-preset').forEach(btn => {
      const presetScale = parseInt(btn.dataset.scale);
      btn.classList.toggle('active', presetScale === this.currentScale);
    });
  }

  /**
   * Vincula los botones de incremento, decremento y presets de escala.
   */
  static initControls() {
    const btnDecrease = document.getElementById('btn-scale-decrease');
    const btnIncrease = document.getElementById('btn-scale-increase');

    if (btnDecrease) {
      btnDecrease.addEventListener('click', () => {
        this.applyScale(this.currentScale - this.STEP);
      });
    }

    if (btnIncrease) {
      btnIncrease.addEventListener('click', () => {
        this.applyScale(this.currentScale + this.STEP);
      });
    }

    document.querySelectorAll('.btn-ui-scale-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt(btn.dataset.scale);
        if (!isNaN(val)) {
          this.applyScale(val);
        }
      });
    });

    this.updateControlsUI();
  }
}
