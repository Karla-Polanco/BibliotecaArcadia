/**
 * ============================================================================
 * SETTINGS VIEW - VISTA GENERAL DE AJUSTES, TEMAS Y DASHBOARD DE HÁBITOS
 * ============================================================================
 * Presenta el Dashboard de Hábitos de Lectura (Estadísticas y Rachas),
 * el Creador de Temas Personalizados (Color Picker), los 6 temas predefinidos,
 * la escala visual y la administración de copias de seguridad.
 */

import { ThemeManager } from './ThemeManager.js';
import { ScaleManager } from './ScaleManager.js';
import { BackupManager } from './BackupManager.js';
import { ReadingStatsManager } from './ReadingStatsManager.js';
import { dbManager } from '../db.js';
import { appState } from '../state.js';
import { Toast } from './Toast.js';
import { Icons } from './Icons.js';

export class SettingsView {
  constructor(containerElement, themeManager) {
    this.container = containerElement;
    this.themeManager = themeManager || new ThemeManager();
    this._eventsSubscribed = false;
  }

  async loadAndRender() {
    await this.render();
  }

  /**
   * Recarga dinámicamente solo los valores numéricos del dashboard sin parpadear la UI.
   */
  async refreshStats() {
    if (!this.container) return;
    let allBooks = [];
    try {
      allBooks = await dbManager.getAll('books');
    } catch (_) {}

    const stats = ReadingStatsManager.getStats(allBooks);
    const streakEl = this.container.querySelector('#stat-streak-value');
    const streakLbl = this.container.querySelector('#stat-streak-label');
    const timeEl = this.container.querySelector('#stat-time-value');

    if (streakEl) streakEl.textContent = stats.streakDays;
    if (streakLbl) streakLbl.textContent = stats.streakDays === 1 ? 'Día seguido' : 'Días seguidos';
    if (timeEl) timeEl.textContent = stats.timeFormatted;
  }

  async render() {
    if (!this.container) return;

    const currentTheme = this.themeManager.getTheme();
    const customColors = this.themeManager.getCustomColors();

    // Obtener libros para estadísticas iniciales
    let allBooks = [];
    try {
      allBooks = await dbManager.getAll('books');
    } catch (_) {}

    const stats = ReadingStatsManager.getStats(allBooks);

    this.container.className = 'settings-page-view';
    this.container.innerHTML = `
      <div class="collection-header-panel">
        <div class="header-card-top">
          <div class="header-card-brand-group">
            <div class="header-card-icon-box settings-header-icon">
              <svg aria-hidden="true"><use href="./assets/icons/icons.svg#settings"></use></svg>
            </div>
            <div class="header-card-text">
              <span class="panel-category-tag">CONFIGURACIÓN Y HÁBITOS</span>
              <h1 class="panel-heading">Ajustes &amp; Dashboard</h1>
              <p class="panel-description">Revisa tus hábitos de lectura, personaliza la paleta de colores y administra tus copias de seguridad.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-content-wrapper">

        <!-- SECCIÓN 1: DASHBOARD DE HÁBITOS DE LECTURA (100% PRIVADO Y AUTOMÁTICO) -->
        <section class="settings-card-section" aria-label="Hábitos de lectura">
          <div class="settings-section-head">
            <div>
              <h3 class="settings-section-title">
                <svg aria-hidden="true"><use href="./assets/icons/icons.svg#chart-bar"></use></svg>
                Dashboard de Hábitos de Lectura
              </h3>
              <p class="settings-section-desc">
                Estadísticas locales y privadas acumuladas en este dispositivo.
              </p>
            </div>
            <span class="settings-offline-badge">
              100% Offline &amp; Privado
            </span>
          </div>

          <!-- Métrica Cards Grid (2 Tarjetas Compactas) -->
          <div class="stats-cards-grid">
            <!-- Card 1: Racha de Lectura -->
            <div class="stat-card">
              <div class="stat-card-icon stat-card-icon--streak" aria-hidden="true">
                <svg class="icon-md icon-fire" aria-hidden="true"><use href="./assets/icons/icons.svg#fire"></use></svg>
              </div>
              <div class="stat-card-info">
                <span id="stat-streak-value" class="stat-card-value">${stats.streakDays}</span>
                <span id="stat-streak-label" class="stat-card-label">${stats.streakDays === 1 ? 'Día seguido' : 'Días seguidos'}</span>
              </div>
            </div>

            <!-- Card 2: Tiempo Total Invertido -->
            <div class="stat-card">
              <div class="stat-card-icon stat-card-icon--time" aria-hidden="true">
                <svg class="icon-md icon-clock-color" aria-hidden="true"><use href="./assets/icons/icons.svg#clock-color"></use></svg>
              </div>
              <div class="stat-card-info">
                <span id="stat-time-value" class="stat-card-value">${stats.timeFormatted}</span>
                <span class="stat-card-label">Tiempo total</span>
              </div>
            </div>
          </div>
        </section>

        <!-- SECCIÓN 2: PALETA DE TEMAS PREDEFINIDOS Y COLOR PICKER PERSONALIZADO -->
        <section class="settings-card-section" aria-label="Temas de color">
          <div class="settings-section-head--stack">
            <h3 class="settings-section-title">
              Paleta y Temas de Color
            </h3>
            <p class="settings-section-desc">
              Selecciona uno de los temas predefinidos o diseña tu propia paleta personalizada.
            </p>
          </div>

          <div class="theme-options-grid">
            <!-- 1. Marino & Blanco -->
            <div class="theme-card-item ${currentTheme === 'navy-white' ? 'selected' : ''}" data-theme-value="navy-white" style="--theme-accent-color: #304861;" tabindex="0" role="button" aria-pressed="${currentTheme === 'navy-white' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #D9E2EB 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #304861;"></span>
                  <span class="theme-dot" style="background: #62778F;"></span>
                  <span class="theme-dot" style="background: #8797A9;"></span>
                  <span class="theme-dot" style="background: #C6D0DC;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Marino & Blanco</h4>
                <p class="theme-card-desc">Académico, sobrio y preciso.</p>
              </div>
            </div>

            <!-- 2. Amatista & Marfil -->
            <div class="theme-card-item ${currentTheme === 'amethyst-ivory' ? 'selected' : ''}" data-theme-value="amethyst-ivory" style="--theme-accent-color: #584B5F;" tabindex="0" role="button" aria-pressed="${currentTheme === 'amethyst-ivory' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #DDD6E0 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #584B5F;"></span>
                  <span class="theme-dot" style="background: #796C80;"></span>
                  <span class="theme-dot" style="background: #918593;"></span>
                  <span class="theme-dot" style="background: #CEC6D1;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Amatista & Marfil</h4>
                <p class="theme-card-desc">Culto, sereno y elegante.</p>
              </div>
            </div>

            <!-- 3. Oliva & Marfil -->
            <div class="theme-card-item ${currentTheme === 'olive-ivory' ? 'selected' : ''}" data-theme-value="olive-ivory" style="--theme-accent-color: #4F5B48;" tabindex="0" role="button" aria-pressed="${currentTheme === 'olive-ivory' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #DBE0D5 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #4F5B48;"></span>
                  <span class="theme-dot" style="background: #707C69;"></span>
                  <span class="theme-dot" style="background: #919A8B;"></span>
                  <span class="theme-dot" style="background: #CBD1C5;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Oliva & Marfil</h4>
                <p class="theme-card-desc">Natural, sereno y atemporal.</p>
              </div>
            </div>

            <!-- 4. Clásico Claro -->
            <div class="theme-card-item ${currentTheme === 'classic-light' ? 'selected' : ''}" data-theme-value="classic-light" style="--theme-accent-color: #34363C;" tabindex="0" role="button" aria-pressed="${currentTheme === 'classic-light' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #DEDFE2 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #34363C;"></span>
                  <span class="theme-dot" style="background: #60636B;"></span>
                  <span class="theme-dot" style="background: #858890;"></span>
                  <span class="theme-dot" style="background: #CBCDD2;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Clásico Claro</h4>
                <p class="theme-card-desc">Atemporal, universal y limpio.</p>
              </div>
            </div>

            <!-- 5. Sepia & Café -->
            <div class="theme-card-item ${currentTheme === 'sepia-coffee' ? 'selected' : ''}" data-theme-value="sepia-coffee" style="--theme-accent-color: #5B5146;" tabindex="0" role="button" aria-pressed="${currentTheme === 'sepia-coffee' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #DFD6C9 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #5B5146;"></span>
                  <span class="theme-dot" style="background: #7B7063;"></span>
                  <span class="theme-dot" style="background: #958A7C;"></span>
                  <span class="theme-dot" style="background: #D3CCC1;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Sepia & Café</h4>
                <p class="theme-card-desc">Cálido, literario y acogedor.</p>
              </div>
            </div>

            <!-- 6. Clásico Noche -->
            <div class="theme-card-item ${currentTheme === 'classic-night' ? 'selected' : ''}" data-theme-value="classic-night" style="--theme-accent-color: #FFFFFF;" tabindex="0" role="button" aria-pressed="${currentTheme === 'classic-night' ? 'true' : 'false'}">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #2A2A2A 0%, #000000 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill" style="background: rgba(255,255,255,0.2);"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #FFFFFF;"></span>
                  <span class="theme-dot" style="background: #D4D4D4;"></span>
                  <span class="theme-dot" style="background: #A3A3A3;"></span>
                  <span class="theme-dot" style="background: #2E2E2E;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Clásico Noche</h4>
                <p class="theme-card-desc">Opuesto al Claro: negro y blanco.</p>
              </div>
            </div>
          </div>

          <!-- CREADOR DE TEMA PERSONALIZADO (COLOR PICKER) -->
          <div class="custom-creator-block">
            <div>
              <h4 class="custom-creator-title">
                <svg class="icon-sm" aria-hidden="true"><use href="./assets/icons/icons.svg#settings"></use></svg>
                Creador de tema personalizado
              </h4>
              <p class="settings-section-desc">Parte de un tema o elige tus propios colores.</p>
            </div>

            <div class="custom-preset-row" id="custom-preset-row">
              <button type="button" class="custom-preset-pill" data-preset="rosa" data-bg="#F7F2F3" data-surface="#FDFBFC" data-text="#25151C" data-primary="#94576F">
                <span class="preset-dot" aria-hidden="true"><span style="background: #F7F2F3;"></span><span style="background: #94576F;"></span></span>Rosa
              </button>
              <button type="button" class="custom-preset-pill" data-preset="salvia" data-bg="#EEF4F0" data-surface="#F8FAF8" data-text="#122219" data-primary="#2C5D40">
                <span class="preset-dot" aria-hidden="true"><span style="background: #EEF4F0;"></span><span style="background: #2C5D40;"></span></span>Salvia
              </button>
              <button type="button" class="custom-preset-pill" data-preset="sepia" data-bg="#EADFC8" data-surface="#F6EEDC" data-text="#3B2F20" data-primary="#9A5B2E">
                <span class="preset-dot" aria-hidden="true"><span style="background: #EADFC8;"></span><span style="background: #9A5B2E;"></span></span>Sepia
              </button>
              <button type="button" class="custom-preset-pill" data-preset="noche" data-bg="#10141A" data-surface="#1A202C" data-text="#F3F4F6" data-primary="#3B82F6">
                <span class="preset-dot" aria-hidden="true"><span style="background: #10141A;"></span><span style="background: #3B82F6;"></span></span>Noche
              </button>
            </div>

            <div class="custom-colors-grid">
              <div class="custom-color-card">
                <input type="color" id="custom-color-bg" class="custom-color-input" value="${customColors.bg}" aria-label="Color de fondo">
                <div>
                  <label for="custom-color-bg">Fondo</label>
                  <span id="custom-hex-bg">${customColors.bg}</span>
                </div>
              </div>

              <div class="custom-color-card">
                <input type="color" id="custom-color-surface" class="custom-color-input" value="${customColors.surface}" aria-label="Color de superficie">
                <div>
                  <label for="custom-color-surface">Superficie</label>
                  <span id="custom-hex-surface">${customColors.surface}</span>
                </div>
              </div>

              <div class="custom-color-card">
                <input type="color" id="custom-color-text" class="custom-color-input" value="${customColors.text}" aria-label="Color de texto">
                <div>
                  <label for="custom-color-text">Texto principal</label>
                  <span id="custom-hex-text">${customColors.text}</span>
                </div>
              </div>

              <div class="custom-color-card">
                <input type="color" id="custom-color-primary" class="custom-color-input" value="${customColors.primary}" aria-label="Color primario">
                <div>
                  <label for="custom-color-primary">Color primario</label>
                  <span id="custom-hex-primary">${customColors.primary}</span>
                </div>
              </div>
            </div>

            <div class="custom-apply-row">
              <button type="button" id="btn-reset-custom-theme" class="btn btn--ghost btn--pill">Restablecer</button>
              <button type="button" id="btn-apply-custom-theme" class="btn btn--primary btn--pill">
                ${Icons.CHECK}
                <span>Aplicar tema</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Seccion 3: Tamaño de Letras y Escala Visual -->
        <section class="settings-card-section" aria-label="Escala visual">
          <div class="settings-section-row">
            <div>
              <h3 class="settings-section-title">
                Tamaño de Letras de la App
              </h3>
              <p class="settings-section-desc">
                Ajusta la escala visual y la tipografía general de la aplicación.
              </p>
            </div>
            <div class="scale-stepper-wrapper">
              <button type="button" id="btn-scale-decrease" class="btn-scale-step" title="Reducir tamaño" aria-label="Reducir tamaño"><span>A</span><span class="scale-step-sign">-</span></button>
              <span id="label-scale-percent" class="label-scale-value" aria-live="polite">100%</span>
              <button type="button" id="btn-scale-increase" class="btn-scale-step" title="Aumentar tamaño" aria-label="Aumentar tamaño"><span>A</span><span class="scale-step-sign">+</span></button>
            </div>
          </div>
        </section>

        <!-- Seccion 4: Copia de Seguridad y Datos -->
        <section class="settings-card-section" aria-label="Copia de seguridad">
          <div class="settings-section-row">
            <div>
              <h3 class="settings-section-title">
                Copia de Seguridad y Datos
              </h3>
              <p class="settings-section-desc">
                Guarda tus notas, citas, colecciones y progreso en un archivo JSON o restáuralos en otro dispositivo.
              </p>
            </div>
            <div class="settings-btn-group">
              <button type="button" id="btn-export-backup" class="btn btn--ghost btn-backup-action">
                ${Icons.EXPORT}
                <span>Exportar backup</span>
              </button>
              <button type="button" id="btn-import-backup" class="btn btn--primary btn-backup-action">
                ${Icons.IMPORT}
                <span>Importar backup</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    `;

    this.initEvents();
  }

  initEvents() {
    // Suscribir eventos para auto-recargar métricas cuando cambian los libros o el progreso
    if (!this._eventsSubscribed) {
      this._eventsSubscribed = true;
      appState.subscribe('bookUpdated', () => this.refreshStats());
      appState.subscribe('bookAdded', () => this.refreshStats());
      appState.subscribe('bookDeleted', () => this.refreshStats());
      appState.subscribe('activeFilter', (filter) => {
        if (filter === 'settings') {
          this.refreshStats();
        }
      });
    }

    // Vincular tarjetas de tema predefinidas
    this.container.querySelectorAll('.theme-card-item').forEach(card => {
      const selectCard = () => {
        const theme = card.dataset.themeValue;
        this.themeManager.applyTheme(theme);
        this.container.querySelectorAll('.theme-card-item').forEach(c => {
          const isSelected = c.dataset.themeValue === theme;
          c.classList.toggle('selected', isSelected);
          c.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        });
      };
      card.addEventListener('click', selectCard);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCard();
        }
      });
    });

    // Vincular Color Pickers del Tema Personalizado
    const bgPicker = this.container.querySelector('#custom-color-bg');
    const surfacePicker = this.container.querySelector('#custom-color-surface');
    const primaryPicker = this.container.querySelector('#custom-color-primary');
    const textPicker = this.container.querySelector('#custom-color-text');

    if (bgPicker) {
      bgPicker.addEventListener('input', (e) => {
        const span = this.container.querySelector('#custom-hex-bg');
        if (span) span.textContent = e.target.value.toUpperCase();
      });
    }
    if (surfacePicker) {
      surfacePicker.addEventListener('input', (e) => {
        const span = this.container.querySelector('#custom-hex-surface');
        if (span) span.textContent = e.target.value.toUpperCase();
      });
    }
    if (primaryPicker) {
      primaryPicker.addEventListener('input', (e) => {
        const span = this.container.querySelector('#custom-hex-primary');
        if (span) span.textContent = e.target.value.toUpperCase();
      });
    }
    if (textPicker) {
      textPicker.addEventListener('input', (e) => {
        const span = this.container.querySelector('#custom-hex-text');
        if (span) span.textContent = e.target.value.toUpperCase();
      });
    }

    const syncCustomInputs = (colors) => {
      if (bgPicker) { bgPicker.value = colors.bg; }
      if (surfacePicker) { surfacePicker.value = colors.surface; }
      if (textPicker) { textPicker.value = colors.text; }
      if (primaryPicker) { primaryPicker.value = colors.primary; }
      const hexBg = this.container.querySelector('#custom-hex-bg');
      const hexSurface = this.container.querySelector('#custom-hex-surface');
      const hexText = this.container.querySelector('#custom-hex-text');
      const hexPrimary = this.container.querySelector('#custom-hex-primary');
      if (hexBg) hexBg.textContent = String(colors.bg).toUpperCase();
      if (hexSurface) hexSurface.textContent = String(colors.surface).toUpperCase();
      if (hexText) hexText.textContent = String(colors.text).toUpperCase();
      if (hexPrimary) hexPrimary.textContent = String(colors.primary).toUpperCase();
    };

    // Presets rápidos: Rosa / Salvia / Sepia / Noche (solo rellenan, no aplican)
    this.container.querySelectorAll('.custom-preset-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        syncCustomInputs({
          bg: pill.dataset.bg,
          surface: pill.dataset.surface,
          text: pill.dataset.text,
          primary: pill.dataset.primary
        });
        this.container.querySelectorAll('.custom-preset-pill').forEach(p => {
          p.classList.toggle('active', p === pill);
        });
      });
    });

    const btnApplyCustom = this.container.querySelector('#btn-apply-custom-theme');
    if (btnApplyCustom) {
      btnApplyCustom.addEventListener('click', () => {
        const customColors = {
          bg: bgPicker?.value || '#10141A',
          surface: surfacePicker?.value || '#1A202C',
          primary: primaryPicker?.value || '#3B82F6',
          text: textPicker?.value || '#F3F4F6'
        };
        this.themeManager.saveCustomColors(customColors);
        this.container.querySelectorAll('.theme-card-item').forEach(c => c.classList.remove('selected'));
        Toast.success('Tema personalizado aplicado.');
      });
    }

    const btnResetCustom = this.container.querySelector('#btn-reset-custom-theme');
    if (btnResetCustom) {
      btnResetCustom.addEventListener('click', () => {
        const defaults = { ...(ThemeManager.DEFAULT_CUSTOM_COLORS || { bg: '#10141A', surface: '#1A202C', primary: '#3B82F6', text: '#F3F4F6' }) };
        syncCustomInputs(defaults);
        this.container.querySelectorAll('.custom-preset-pill').forEach(p => {
          p.classList.remove('active');
        });
      });
    }

    // Vincular controles de escala visual
    ScaleManager.initControls();

    // Vincular botones de backup
    const btnExport = this.container.querySelector('#btn-export-backup');
    if (btnExport) {
      btnExport.addEventListener('click', () => BackupManager.exportBackup());
    }
    const btnImport = this.container.querySelector('#btn-import-backup');
    if (btnImport) {
      btnImport.addEventListener('click', () => BackupManager.triggerFileInput());
    }
  }
}
