/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS
 * ============================================================================
 * Soporta Nocturno Místico, Lavanda Claro, Crepúsculo Profundo y Tema del Sistema.
 */

export class ThemeManager {
  static THEMES = {
    MYSTIC_NIGHT: 'mystic-night',
    LAVENDER_LIGHT: 'lavender-light',
    WINE_POETRY: 'serene-fog',
    DEEP_TWILIGHT: 'deep-twilight',
    ENCHANTED_FOREST: 'enchanted-forest',
    CLEAR_SKY: 'clear-sky'
  };

  static STORAGE_KEY = 'arcadia_theme';

  constructor() {
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.MYSTIC_NIGHT;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._handleSystemThemeChange = this._handleSystemThemeChange.bind(this);
  }

  /**
   * Inicializa el tema en el DOM y vincula escuchadores del sistema.
   */
  init() {
    this.applyTheme(this.currentTheme);

    // Escucha cambios en las preferencias del sistema operativo
    if (this.mediaQuery && this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', this._handleSystemThemeChange);
    }
  }

  /**
   * Aplica un tema al documento raíz.
   * Normaliza aliases legacy y el tema 'deep-twilight' no existente en CSS.
   * @param {string} themeName - Nombre del tema
   */
  applyTheme(themeName) {
    if (!themeName || typeof themeName !== 'string') {
      themeName = ThemeManager.THEMES.MYSTIC_NIGHT;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy: 'system' y 'deep-twilight' ya no existen
    if (themeName === 'system' || themeName === ThemeManager.THEMES.DEEP_TWILIGHT) {
      themeName = ThemeManager.THEMES.MYSTIC_NIGHT;
    }
    const knownThemes = new Set([
      ThemeManager.THEMES.MYSTIC_NIGHT,
      ThemeManager.THEMES.LAVENDER_LIGHT,
      ThemeManager.THEMES.WINE_POETRY,
      ThemeManager.THEMES.ENCHANTED_FOREST,
      ThemeManager.THEMES.CLEAR_SKY
    ]);
    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando mystic-night`);
      themeName = ThemeManager.THEMES.MYSTIC_NIGHT;
    }

    this.currentTheme = themeName;
    localStorage.setItem(ThemeManager.STORAGE_KEY, themeName);

    document.documentElement.setAttribute('data-theme', themeName);
    this._updateFavicon(themeName);

    // Despachar evento para componentes que requieran sincronizarse
    window.dispatchEvent(new CustomEvent('arcadia:themechange', {
      detail: { theme: themeName }
    }));
  }

  /**
   * Retorna el tema seleccionado por el usuario.
   */
  getTheme() {
    return this.currentTheme;
  }

  /**
   * Manejador para cambios en prefers-color-scheme (ya no hay tema system, no-op)
   */
  _handleSystemThemeChange(e) {}

  /**
   * Actualiza dinámicamente el favicon de la pestaña con la paleta de colores del tema.
   * @param {string} themeName 
   */
  _updateFavicon(themeName) {
    const themePalettes = {
      'mystic-night': { bg: '#E8ECEF', bg2: '#C4D8E5', star1: '#A7C7E7', star2: '#8EB1D1', star3: '#5A7FAF' },
      'deep-twilight': { bg: '#0B1D3A', bg2: '#06101F', star1: '#D7E1EC', star2: '#8FA9C4', star3: '#1B4167' },
      'clear-sky': { bg: '#0F2338', bg2: '#061322', star1: '#E0F2FE', star2: '#60A5FA', star3: '#2563EB' },
      'enchanted-forest': { bg: '#0D2818', bg2: '#04120A', star1: '#DCFCE7', star2: '#4ADE80', star3: '#227D48' },
      'lavender-light': { bg: '#271E56', bg2: '#130C33', star1: '#DDD6FE', star2: '#A78BFA', star3: '#6C5CE7' },
      'serene-fog': { bg: '#F6F0F1', bg2: '#E4C9D2', star1: '#FFFFFF', star2: '#C2A3B0', star3: '#8A6573' },
      'paper': { bg: '#F4F1EA', bg2: '#E4C9A2', star1: '#FFFFFF', star2: '#C2A36B', star3: '#8B6914' },
      'neutral': { bg: '#252525', bg2: '#101010', star1: '#FFFFFF', star2: '#A0A0A0', star3: '#555555' }
    };

    const p = themePalettes[themeName] || themePalettes['mystic-night'];
    // Trío de estrellas (grande al centro, dos pequeñas a los lados y abajo),
    // igual que el icono de la app. Tamaño explícito: algunos navegadores
    // no muestran favicons con width/height en porcentaje.
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="favBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${p.bg}"/>
      <stop offset="100%" stop-color="${p.bg2}"/>
    </linearGradient>
    <linearGradient id="favStarGrad" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0%" stop-color="${p.star1}"/>
      <stop offset="55%" stop-color="${p.star2}"/>
      <stop offset="100%" stop-color="${p.star3}"/>
    </linearGradient>
    <polygon id="favS8" points="245,170 164.8,163.9 187.5,132.5 156.1,155.2 150,75 143.9,155.2 112.5,132.5 135.2,163.9 55,170 135.2,176.1 112.5,207.5 143.9,184.8 150,265 156.1,184.8 187.5,207.5 164.8,176.1"/>
  </defs>
  <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#favBg)"/>
  <g fill="url(#favStarGrad)">
    <use href="#favS8" transform="translate(12.3 6.7) scale(0.131)"/>
    <use href="#favS8" transform="translate(7.6 29.1) scale(0.0525)"/>
    <use href="#favS8" transform="translate(40.6 29.1) scale(0.0525)"/>
  </g>
</svg>`;

    try {
      const dataUri = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      const faviconLink = document.getElementById('app-favicon') || document.querySelector("link[rel*='icon']");
      if (faviconLink) {
        faviconLink.href = dataUri;
      }
      const appleTouch = document.querySelector("link[rel='apple-touch-icon']");
      if (appleTouch) {
        appleTouch.href = dataUri;
      }
    } catch (e) {
      console.warn('Favicon update warning:', e);
    }
  }
}
