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
      <div class="collection-header-panel settings-header-panel">
        <div class="header-card-top">
          <div class="header-card-brand-group">
            <div class="header-card-icon-box" style="background: color-mix(in srgb, var(--color-primary-light) 18%, var(--color-surface)); color: var(--color-primary-light);">
              <svg style="width: 24px; height: 24px;" aria-hidden="true"><use href="./assets/icons/icons.svg#settings"></use></svg>
            </div>
            <div class="header-card-text">
              <span class="panel-category-tag" style="color: var(--color-primary-light);">CONFIGURACIÓN Y HÁBITOS</span>
              <h1 class="panel-heading">Ajustes & Dashboard</h1>
              <p class="panel-description">Revisa tus hábitos de lectura, personaliza la paleta de colores y administra tus copias de seguridad.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-content-wrapper" style="margin-top: 20px; display: flex; flex-direction: column; gap: 20px; width: 100%; box-sizing: border-box;">

        <!-- 📈 SECCIÓN 1: DASHBOARD DE HÁBITOS DE LECTURA (100% PRIVADO Y AUTOMÁTICO) -->
        <section class="settings-card-section" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 20px; width: 100%; box-sizing: border-box; overflow: hidden;">
          <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text); margin: 0 0 2px 0; display: flex; align-items: center; gap: 8px;">
                <svg style="width: 18px; height: 18px; color: var(--color-primary);" aria-hidden="true"><use href="./assets/icons/icons.svg#chart-bar"></use></svg>
                Dashboard de Hábitos de Lectura
              </h3>
              <p style="font-size: 0.80rem; color: var(--color-text-secondary); margin: 0;">
                Estadísticas locales y privadas acumuladas en este dispositivo.
              </p>
            </div>
            <span style="font-size: 0.70rem; padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--color-primary-light) 12%, transparent); color: var(--color-primary); font-weight: 600;">
              100% Offline & Privado
            </span>
          </div>

          <!-- Métrica Cards Grid (2 Tarjetas Compactas) -->
          <div class="stats-cards-grid">
            <!-- Card 1: Racha de Lectura -->
            <div class="stat-card">
              <div class="stat-card-icon" style="background: rgba(255, 107, 107, 0.12); color: #FF6B6B;">🔥</div>
              <div class="stat-card-info">
                <span id="stat-streak-value" class="stat-card-value">${stats.streakDays}</span>
                <span id="stat-streak-label" class="stat-card-label">${stats.streakDays === 1 ? 'Día seguido' : 'Días seguidos'}</span>
              </div>
            </div>

            <!-- Card 2: Tiempo Total Invertido -->
            <div class="stat-card">
              <div class="stat-card-icon" style="background: rgba(139, 92, 246, 0.12); color: #8B5CF6;">⏱️</div>
              <div class="stat-card-info">
                <span id="stat-time-value" class="stat-card-value">${stats.timeFormatted}</span>
                <span class="stat-card-label">Tiempo total</span>
              </div>
            </div>
          </div>
        </section>

        <!-- 🎨 SECCIÓN 2: PALETA DE TEMAS PREDEFINIDOS Y COLOR PICKER PERSONALIZADO -->
        <section class="settings-card-section" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; width: 100%; box-sizing: border-box;">
          <div style="margin-bottom: 18px;">
            <h3 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text); margin: 0 0 4px 0;">
              Paleta y Temas de Color
            </h3>
            <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 0;">
              Selecciona uno de los temas predefinidos o diseña tu propia paleta personalizada.
            </p>
          </div>

          <div class="theme-options-grid">
            <!-- 1. Ciruela & Lavanda -->
            <div class="theme-card-item ${currentTheme === 'plum' ? 'selected' : ''}" data-theme-value="plum" style="--theme-accent-color: #633C84;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #DCCCE9 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #633C84;"></span>
                  <span class="theme-dot" style="background: #895FA8;"></span>
                  <span class="theme-dot" style="background: #A788C4;"></span>
                  <span class="theme-dot" style="background: #C8BAD6;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Ciruela & Lavanda</h4>
                <p class="theme-card-desc">Misterioso, espiritual y elegante.</p>
              </div>
            </div>

            <!-- 2. Salvia & Crema -->
            <div class="theme-card-item ${currentTheme === 'sage-cream' ? 'selected' : ''}" data-theme-value="sage-cream" style="--theme-accent-color: #4C6843;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FAFAF7 0%, #C8D7C3 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #4C6843;"></span>
                  <span class="theme-dot" style="background: #708C68;"></span>
                  <span class="theme-dot" style="background: #97A88F;"></span>
                  <span class="theme-dot" style="background: #BDCBB7;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Salvia & Crema</h4>
                <p class="theme-card-desc">Botánico, suave y descanso visual.</p>
              </div>
            </div>

            <!-- 3. Clásico Claro -->
            <div class="theme-card-item ${currentTheme === 'light' ? 'selected' : ''}" data-theme-value="light" style="--theme-accent-color: #2B2C34;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #D6D8E0 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #2B2C34;"></span>
                  <span class="theme-dot" style="background: #525462;"></span>
                  <span class="theme-dot" style="background: #747787;"></span>
                  <span class="theme-dot" style="background: #CACCD4;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Clásico Claro</h4>
                <p class="theme-card-desc">Limpio, universal y alto contraste.</p>
              </div>
            </div>

            <!-- 4. Marino & Blanco -->
            <div class="theme-card-item ${currentTheme === 'navy-summit' ? 'selected' : ''}" data-theme-value="navy-summit" style="--theme-accent-color: #142A4F;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FFFFFF 0%, #C2D5EE 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #142A4F;"></span>
                  <span class="theme-dot" style="background: #2D4F82;"></span>
                  <span class="theme-dot" style="background: #637FAD;"></span>
                  <span class="theme-dot" style="background: #B2C3DE;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Marino & Blanco</h4>
                <p class="theme-card-desc">Ejecutivo, formal y preciso.</p>
              </div>
            </div>

            <!-- 5. Beige & Brown -->
            <div class="theme-card-item ${currentTheme === 'cozy-brown' ? 'selected' : ''}" data-theme-value="cozy-brown" style="--theme-accent-color: #6B4E3D;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FAF4EC 0%, #D7C2AB 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #6B4E3D;"></span>
                  <span class="theme-dot" style="background: #8E6B55;"></span>
                  <span class="theme-dot" style="background: #A67C52;"></span>
                  <span class="theme-dot" style="background: #D1BBA2;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Beige & Brown</h4>
                <p class="theme-card-desc">Acogedor, cálido y café con leche.</p>
              </div>
            </div>

            <!-- 6. Noir & Silver -->
            <div class="theme-card-item ${currentTheme === 'noir-silver' ? 'selected' : ''}" data-theme-value="noir-silver" style="--theme-accent-color: #8E8E8E;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #242424 0%, #0D0D0D 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" aria-hidden="true"><use href="./assets/icons/icons.svg#check"></use></svg>
                  </div>
                  <div class="theme-card-mini-pill" style="background: rgba(255,255,255,0.2);"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #E6E6E6;"></span>
                  <span class="theme-dot" style="background: #B5B5B5;"></span>
                  <span class="theme-dot" style="background: #8E8E8E;"></span>
                  <span class="theme-dot" style="background: #383838;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Noir & Silver</h4>
                <p class="theme-card-desc">Sobrio, lujoso y nocturno.</p>
              </div>
            </div>
          </div>

          <!-- CREADOR DE TEMA PERSONALIZADO (COLOR PICKER) -->
          <div style="margin-top: 24px; padding-top: 20px; border-top: 1px dashed var(--color-border);">
            <div style="margin-bottom: 6px;">
              <h4 style="font-size: 0.95rem; font-weight: 800; color: var(--color-text); margin: 0; display: flex; align-items: center; gap: 6px;">🎨 Creador de tema personalizado</h4>
              <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 4px 0 0 0;">Parte de un tema o elige tus propios colores.</p>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0 16px 0;" id="custom-preset-row">
              <button type="button" class="custom-preset-pill" data-preset="rosa" data-bg="#F7F2F3" data-surface="#FDFBFC" data-text="#25151C" data-primary="#94576F" style="display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); font-size: 0.78rem; font-weight: 600; color: var(--color-text); cursor: pointer;">
                <span class="preset-dot" aria-hidden="true"><span style="background: #F7F2F3;"></span><span style="background: #94576F;"></span></span>Rosa
              </button>
              <button type="button" class="custom-preset-pill" data-preset="salvia" data-bg="#EEF4F0" data-surface="#F8FAF8" data-text="#122219" data-primary="#2C5D40" style="display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); font-size: 0.78rem; font-weight: 600; color: var(--color-text); cursor: pointer;">
                <span class="preset-dot" aria-hidden="true"><span style="background: #EEF4F0;"></span><span style="background: #2C5D40;"></span></span>Salvia
              </button>
              <button type="button" class="custom-preset-pill" data-preset="sepia" data-bg="#EADFC8" data-surface="#F6EEDC" data-text="#3B2F20" data-primary="#9A5B2E" style="display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); font-size: 0.78rem; font-weight: 600; color: var(--color-text); cursor: pointer;">
                <span class="preset-dot" aria-hidden="true"><span style="background: #EADFC8;"></span><span style="background: #9A5B2E;"></span></span>Sepia
              </button>
              <button type="button" class="custom-preset-pill" data-preset="noche" data-bg="#10141A" data-surface="#1A202C" data-text="#F3F4F6" data-primary="#3B82F6" style="display: flex; align-items: center; gap: 7px; padding: 5px 12px 5px 5px; border-radius: 999px; border: 1px solid var(--color-border); background: var(--color-surface); font-size: 0.78rem; font-weight: 600; color: var(--color-text); cursor: pointer;">
                <span class="preset-dot" aria-hidden="true"><span style="background: #10141A;"></span><span style="background: #3B82F6;"></span></span>Noche
              </button>
            </div>

            <div class="custom-colors-grid" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
              <div class="custom-color-card" style="display: flex; align-items: center; gap: 12px; background: var(--color-surface-elevated); padding: 10px 12px; border-radius: 14px; border: 1px solid var(--color-border-subtle); min-width: 0;">
                <input type="color" id="custom-color-bg" class="custom-color-input" value="${customColors.bg}">
                <div style="min-width: 0;">
                  <label for="custom-color-bg" style="font-size: 0.78rem; font-weight: 500; display: block; color: var(--color-text-muted);">Fondo</label>
                  <span id="custom-hex-bg" style="font-size: 0.85rem; font-weight: 800; color: var(--color-text);">${customColors.bg}</span>
                </div>
              </div>

              <div class="custom-color-card" style="display: flex; align-items: center; gap: 12px; background: var(--color-surface-elevated); padding: 10px 12px; border-radius: 14px; border: 1px solid var(--color-border-subtle); min-width: 0;">
                <input type="color" id="custom-color-surface" class="custom-color-input" value="${customColors.surface}">
                <div style="min-width: 0;">
                  <label for="custom-color-surface" style="font-size: 0.78rem; font-weight: 500; display: block; color: var(--color-text-muted);">Superficie</label>
                  <span id="custom-hex-surface" style="font-size: 0.85rem; font-weight: 800; color: var(--color-text);">${customColors.surface}</span>
                </div>
              </div>

              <div class="custom-color-card" style="display: flex; align-items: center; gap: 12px; background: var(--color-surface-elevated); padding: 10px 12px; border-radius: 14px; border: 1px solid var(--color-border-subtle); min-width: 0;">
                <input type="color" id="custom-color-text" class="custom-color-input" value="${customColors.text}">
                <div style="min-width: 0;">
                  <label for="custom-color-text" style="font-size: 0.78rem; font-weight: 500; display: block; color: var(--color-text-muted);">Texto principal</label>
                  <span id="custom-hex-text" style="font-size: 0.85rem; font-weight: 800; color: var(--color-text);">${customColors.text}</span>
                </div>
              </div>

              <div class="custom-color-card" style="display: flex; align-items: center; gap: 12px; background: var(--color-surface-elevated); padding: 10px 12px; border-radius: 14px; border: 1px solid var(--color-border-subtle); min-width: 0;">
                <input type="color" id="custom-color-primary" class="custom-color-input" value="${customColors.primary}">
                <div style="min-width: 0;">
                  <label for="custom-color-primary" style="font-size: 0.78rem; font-weight: 500; display: block; color: var(--color-text-muted);">Color primario</label>
                  <span id="custom-hex-primary" style="font-size: 0.85rem; font-weight: 800; color: var(--color-text);">${customColors.primary}</span>
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 16px;">
              <button type="button" id="btn-reset-custom-theme" class="btn btn--ghost" style="border-radius: 999px; padding: 10px 20px; font-size: 0.85rem;">Restablecer</button>
              <button type="button" id="btn-apply-custom-theme" class="btn btn--primary" style="flex: 1; border-radius: 999px; padding: 10px 20px; font-size: 0.85rem; font-weight: 700;">
                ${Icons.CHECK}
                <span>Aplicar tema</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Seccion 3: Tamaño de Letras y Escala Visual -->
        <section class="settings-card-section" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; width: 100%; box-sizing: border-box;">
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
              <button type="button" id="btn-scale-decrease" class="btn-scale-step" title="Reducir tamaño" aria-label="Reducir tamaño"><span class="scale-step-cap">A</span><span class="scale-step-sign">-</span></button>
              <span id="label-scale-percent" class="label-scale-value" aria-live="polite">100%</span>
              <button type="button" id="btn-scale-increase" class="btn-scale-step" title="Aumentar tamaño" aria-label="Aumentar tamaño"><span class="scale-step-cap">A</span><span class="scale-step-sign">+</span></button>
            </div>
          </div>
        </section>

        <!-- Seccion 4: Copia de Seguridad y Datos -->
        <section class="settings-card-section" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px; width: 100%; box-sizing: border-box;">
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
      card.addEventListener('click', () => {
        const theme = card.dataset.themeValue;
        this.themeManager.applyTheme(theme);
        this.container.querySelectorAll('.theme-card-item').forEach(c => {
          c.classList.toggle('selected', c.dataset.themeValue === theme);
        });
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
          const isActive = p === pill;
          p.style.borderColor = isActive ? 'var(--color-primary)' : 'var(--color-border)';
          p.style.background = isActive ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)';
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
          p.style.borderColor = 'var(--color-border)';
          p.style.background = 'var(--color-surface)';
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
