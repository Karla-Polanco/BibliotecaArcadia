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
              <svg style="width: 24px; height: 24px;" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
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
                <svg style="width: 18px; height: 18px; color: var(--color-primary);" fill="currentColor" viewBox="0 0 6.35 6.35" aria-hidden="true"><path fill="currentColor" d="m 0.26485,5.8204456 a 0.2645835,0.2645835 0 0 0 -0.26563,0.26563 0.2645835,0.2645835 0 0 0 0.26563,0.26367 h 5.82031 a 0.2645835,0.2645835 0 0 0 0.26562,-0.26367 0.2645835,0.2645835 0 0 0 -0.26562,-0.26563 z"/><path fill="currentColor" d="m 1.16328,3.9688856 c -0.34722,0 -0.63476,0.28754 -0.63476,0.63477 v 1.48242 a 0.26460996,0.26460996 0 0 0 0.26562,0.26367 h 1.0586 a 0.26460996,0.26460996 0 0 0 0.26367,-0.26367 v -1.48242 c 0,-0.34723 -0.28755,-0.63477 -0.63477,-0.63477 z"/><path fill="currentColor" d="m 3.0168,3.0684956 c -0.34722,0 -0.63477,0.28753 -0.63477,0.63477 v 2.38281 a 0.26460996,0.26460996 0 0 0 0.26367,0.26367 h 1.0586 a 0.26460996,0.26460996 0 0 0 0.26367,-0.26367 v -2.38281 c 0,-0.34724 -0.28755,-0.63477 -0.63477,-0.63477 z"/><path fill="currentColor" d="m 4.86836,2.2755256 c -0.34722,0 -0.63477,0.28754 -0.63477,0.63477 v 3.17578 a 0.26460996,0.26460996 0 0 0 0.26368,0.26367 h 1.05859 a 0.26460996,0.26460996 0 0 0 0.26563,-0.26367 v -3.17578 c 0,-0.34723 -0.2895,-0.63477 -0.63672,-0.63477 z"/><path fill="currentColor" d="M 4.6205208,2.5237e-4 A 0.2645835,0.2645835 0 0 0 4.3564534,0.26380219 0.2645835,0.2645835 0 0 0 4.6205208,0.52941905 H 4.8938883 C 3.3974791,1.8159538 1.8306324,2.6151331 0.2161369,2.9142865 A 0.2645835,0.2645835 0 0 0 0.0052984,3.2227949 0.2645835,0.2645835 0 0 0 0.3117388,3.4357016 C 2.050091,3.1136013 3.722697,2.2498105 5.2923138,0.88753671 V 1.1991456 A 0.2645835,0.2645835 0 0 0 5.5558626,1.4647625 0.2645835,0.2645835 0 0 0 5.8214805,1.1991456 V 0.41986501 C 5.8215308,0.19150501 5.62816,2.0237e-4 5.3998008,2.5237e-4 Z"/></svg>
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
            <!-- 1. Azul Boreal -->
            <div class="theme-card-item ${currentTheme === 'boreal-blue' ? 'selected' : ''}" data-theme-value="boreal-blue" style="--theme-accent-color: #235677;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #EEF3F7 0%, #D4E2EB 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #235677;"></span>
                  <span class="theme-dot" style="background: #4A7A99;"></span>
                  <span class="theme-dot" style="background: #577D95;"></span>
                  <span class="theme-dot" style="background: #B7CBD9;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Azul Boreal</h4>
                <p class="theme-card-desc">Fresco, limpio y diurno.</p>
              </div>
            </div>

            <!-- 2. Marfil Clásico -->
            <div class="theme-card-item ${currentTheme === 'classic-ivory' ? 'selected' : ''}" data-theme-value="classic-ivory" style="--theme-accent-color: #6D4828;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #FAF7F1 0%, #DBC8B0 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #6D4828;"></span>
                  <span class="theme-dot" style="background: #8E6540;"></span>
                  <span class="theme-dot" style="background: #997554;"></span>
                  <span class="theme-dot" style="background: #CBB99E;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Marfil Clásico</h4>
                <p class="theme-card-desc">Editorial, cálido y tradicional.</p>
              </div>
            </div>

            <!-- 3. Verde Oliva -->
            <div class="theme-card-item ${currentTheme === 'olive-green' ? 'selected' : ''}" data-theme-value="olive-green" style="--theme-accent-color: #2C5D40;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #E7EEE9 0%, #C5DACD 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #2C5D40;"></span>
                  <span class="theme-dot" style="background: #4D7E60;"></span>
                  <span class="theme-dot" style="background: #658E76;"></span>
                  <span class="theme-dot" style="background: #B2C7B9;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Verde Oliva</h4>
                <p class="theme-card-desc">Natural, descanso visual y salvia.</p>
              </div>
            </div>

            <!-- 4. Lavanda Crepuscular -->
            <div class="theme-card-item ${currentTheme === 'twilight-lavender' ? 'selected' : ''}" data-theme-value="twilight-lavender" style="--theme-accent-color: #4C2E6B;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #D9D1E3 0%, #C2B4D3 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #4C2E6B;"></span>
                  <span class="theme-dot" style="background: #6E4994;"></span>
                  <span class="theme-dot" style="background: #8060A0;"></span>
                  <span class="theme-dot" style="background: #B2A4C2;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Lavanda Crepuscular</h4>
                <p class="theme-card-desc">Penumbra, suave y vespertina.</p>
              </div>
            </div>

            <!-- 5. Ceniza Tostada -->
            <div class="theme-card-item ${(currentTheme === 'toasted-ash' || currentTheme === 'antique-pink') ? 'selected' : ''}" data-theme-value="toasted-ash" style="--theme-accent-color: #A36B42;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #1A1613 0%, #2F2620 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill" style="background: rgba(255,255,255,0.2);"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #A36B42;"></span>
                  <span class="theme-dot" style="background: #C48E66;"></span>
                  <span class="theme-dot" style="background: #BCA390;"></span>
                  <span class="theme-dot" style="background: #423831;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Ceniza Tostada</h4>
                <p class="theme-card-desc">Íntimo, amaderado y muy cálido.</p>
              </div>
            </div>

            <!-- 6. Noche de Tinta -->
            <div class="theme-card-item ${currentTheme === 'night-ink' ? 'selected' : ''}" data-theme-value="night-ink" style="--theme-accent-color: #527A99;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #0D1115 0%, #1C242E 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div class="theme-card-mini-pill" style="background: rgba(255,255,255,0.2);"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #527A99;"></span>
                  <span class="theme-dot" style="background: #7E9EB5;"></span>
                  <span class="theme-dot" style="background: #9DB4C4;"></span>
                  <span class="theme-dot" style="background: #2A3642;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Noche de Tinta</h4>
                <p class="theme-card-desc">Profundo, sobrio e inmersivo.</p>
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
