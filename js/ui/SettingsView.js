/**
 * ============================================================================
 * SETTINGS VIEW - VISTA GENERAL DE AJUSTES Y CONFIGURACIÓN
 * ============================================================================
 * Presenta la sección de ajustes de la aplicación (Temas de color, Escala
 * tipográfica visual, Copia de seguridad y Datos) con diseño de tarjetas paleta.
 */

import { ThemeManager } from './ThemeManager.js';
import { ScaleManager } from './ScaleManager.js';
import { BackupManager } from './BackupManager.js';
import { appState } from '../state.js';

export class SettingsView {
  constructor(containerElement, themeManager) {
    this.container = containerElement;
    this.themeManager = themeManager || new ThemeManager();
  }

  loadAndRender() {
    this.render();
  }

  render() {
    if (!this.container) return;

    const currentTheme = this.themeManager.getTheme();

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
              <span class="panel-category-tag" style="color: var(--color-primary-light);">CONFIGURACIÓN</span>
              <h1 class="panel-heading">Ajustes</h1>
              <p class="panel-description">Personaliza la paleta de color, escala visual de texto y administra copias de seguridad.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-content-wrapper" style="margin-top: 24px; display: flex; flex-direction: column; gap: 24px;">
        <!-- Seccion: Paleta y Sistema de Temas -->
        <section class="settings-card-section" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 24px;">
          <div style="margin-bottom: 18px;">
            <h3 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text); margin: 0 0 4px 0;">
              Paleta y Sistema de Temas
            </h3>
            <p style="font-size: 0.82rem; color: var(--color-text-secondary); margin: 0;">
              Selecciona el ambiente estético que mejor se adapte a tu momento de lectura.
            </p>
          </div>

          <div class="theme-options-grid">
            <!-- 1. Azul Boreal -->
            <div class="theme-card-item ${currentTheme === 'boreal-blue' ? 'selected' : ''}" data-theme-value="boreal-blue" style="--theme-accent-color: #235677;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #EEF3F7 0%, #D8E5F0 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #235677;"></span>
                  <span class="theme-dot" style="background: #4A7A99;"></span>
                  <span class="theme-dot" style="background: #6B9BB9;"></span>
                  <span class="theme-dot" style="background: #D8E5F0;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Azul Boreal</h4>
                <p class="theme-card-desc">Fresco, limpio y luminoso. Acentos azul boreal.</p>
              </div>
            </div>

            <!-- 2. Lavanda Crepuscular -->
            <div class="theme-card-item ${currentTheme === 'twilight-lavender' ? 'selected' : ''}" data-theme-value="twilight-lavender" style="--theme-accent-color: #5C3D7B;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #F4F1F7 0%, #E2DAEC 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #5C3D7B;"></span>
                  <span class="theme-dot" style="background: #7E619E;"></span>
                  <span class="theme-dot" style="background: #A184C0;"></span>
                  <span class="theme-dot" style="background: #D7CBE3;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Lavanda Crepuscular</h4>
                <p class="theme-card-desc">Serena, delicada y elegante. Tonos vespertinos.</p>
              </div>
            </div>

            <!-- 3. Marfil Clásico -->
            <div class="theme-card-item ${currentTheme === 'classic-ivory' ? 'selected' : ''}" data-theme-value="classic-ivory" style="--theme-accent-color: #C05A34;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #F4EFE6 0%, #E6DBC9 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #C05A34;"></span>
                  <span class="theme-dot" style="background: #D98852;"></span>
                  <span class="theme-dot" style="background: #6D8456;"></span>
                  <span class="theme-dot" style="background: #D89A3E;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Marfil Clásico</h4>
                <p class="theme-card-desc">Crema y terracota, cálido y tradicional como siempre.</p>
              </div>
            </div>

            <!-- 4. Verde Oliva -->
            <div class="theme-card-item ${currentTheme === 'olive-green' ? 'selected' : ''}" data-theme-value="olive-green" style="--theme-accent-color: #2C5D40;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #EEF4F0 0%, #D3E4D8 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #2C5D40;"></span>
                  <span class="theme-dot" style="background: #528063;"></span>
                  <span class="theme-dot" style="background: #79A78A;"></span>
                  <span class="theme-dot" style="background: #C3DBCB;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Verde Oliva</h4>
                <p class="theme-card-desc">Natural, equilibrado y tranquilo. Inspiración orgánica.</p>
              </div>
            </div>

            <!-- 5. Rosa Antiguo -->
            <div class="theme-card-item ${currentTheme === 'antique-pink' ? 'selected' : ''}" data-theme-value="antique-pink" style="--theme-accent-color: #70364C;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #F7F2F3 0%, #EAD6DE 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #70364C;"></span>
                  <span class="theme-dot" style="background: #94576F;"></span>
                  <span class="theme-dot" style="background: #B87B93;"></span>
                  <span class="theme-dot" style="background: #E2C2CF;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Rosa Antiguo</h4>
                <p class="theme-card-desc">Cálido, íntimo y romántico. Carácter literario.</p>
              </div>
            </div>

            <!-- 6. Noche de Tinta -->
            <div class="theme-card-item ${currentTheme === 'night-ink' ? 'selected' : ''}" data-theme-value="night-ink" style="--theme-accent-color: #83A6BE;">
              <div class="theme-card-preview-box" style="background: linear-gradient(135deg, #0E1114 0%, #1D2630 100%);">
                <div class="theme-card-preview-top">
                  <div class="theme-card-check-badge">
                    <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div class="theme-card-mini-pill" style="background: rgba(255,255,255,0.2);"></div>
                </div>
                <div class="theme-card-preview-dots">
                  <span class="theme-dot" style="background: #527A99;"></span>
                  <span class="theme-dot" style="background: #83A6BE;"></span>
                  <span class="theme-dot" style="background: #A4C2D6;"></span>
                  <span class="theme-dot" style="background: #2B3742;"></span>
                </div>
              </div>
              <div class="theme-card-meta">
                <h4 class="theme-card-title">Noche de Tinta</h4>
                <p class="theme-card-desc">Profundo, sobrio e inmersivo. Lectura nocturna.</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Seccion: Tamaño de Letras y Escala Visual -->
        <section class="settings-card-section">
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

        <!-- Seccion: Copia de Seguridad y Datos -->
        <section class="settings-card-section">
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
              <button type="button" id="btn-export-backup" class="arcadia-modal-btn arcadia-modal-btn--ghost btn-backup-action">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span>Exportar backup</span>
              </button>
              <button type="button" id="btn-import-backup" class="arcadia-modal-btn arcadia-modal-btn--primary btn-backup-action">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
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
    // Vincular tarjetas de tema
    this.container.querySelectorAll('.theme-card-item').forEach(card => {
      card.addEventListener('click', () => {
        const theme = card.dataset.themeValue;
        this.themeManager.applyTheme(theme);
        this.container.querySelectorAll('.theme-card-item').forEach(c => {
          c.classList.toggle('selected', c.dataset.themeValue === theme);
        });
      });
    });

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
