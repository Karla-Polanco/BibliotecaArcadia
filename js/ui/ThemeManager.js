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
    CLEAR_SKY: 'clear-sky',
    ABYSS_DARK: 'abyss-dark'
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
      ThemeManager.THEMES.CLEAR_SKY,
      ThemeManager.THEMES.ABYSS_DARK
    ]);
    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando mystic-night`);
      themeName = ThemeManager.THEMES.MYSTIC_NIGHT;
    }

    this.currentTheme = themeName;
    localStorage.setItem(ThemeManager.STORAGE_KEY, themeName);

    document.documentElement.setAttribute('data-theme', themeName);
    this._updateFavicon(themeName);
    this._updateThemeColor(themeName);

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
   * Sincroniza el color de la barra del navegador / splash con el tema claro.
   * @param {string} themeName
   */
  _updateThemeColor(themeName) {
    const themeColors = {
      'mystic-night': '#E8ECEF',
      'lavender-light': '#FBF9FF',
      'clear-sky': '#FAF7F2',
      'enchanted-forest': '#F5F9F6',
      'serene-fog': '#FBF8F9',
      'abyss-dark': '#141214'
    };
    const color = themeColors[themeName] || '#E8ECEF';
    try {
      let meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', color);
      // Para PWA en iOS / standalone
      let meta2 = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (meta2) meta2.setAttribute('content', color);
    } catch (_) {}
  }

  /**
   * Actualiza dinámicamente el favicon de la pestaña con la paleta de colores del tema.
   * @param {string} themeName 
   */
  _updateFavicon(themeName) {
    const themePalettes = {
      'mystic-night': { bg: '#E8ECEF', bg2: '#C4D8E5', star1: '#A7C7E7', star2: '#8EB1D1', star3: '#5A7FAF' },
      'deep-twilight': { bg: '#E8ECEF', bg2: '#C4D8E5', star1: '#A7C7E7', star2: '#8EB1D1', star3: '#5A7FAF' },
      'clear-sky': { bg: '#FAF7F2', bg2: '#EFE3CE', star1: '#EFE3CE', star2: '#C8B39A', star3: '#9A8472' },
      'enchanted-forest': { bg: '#F5F9F6', bg2: '#D5E8DB', star1: '#6EE7B7', star2: '#4E8565', star3: '#2C6343' },
      'lavender-light': { bg: '#FBF9FF', bg2: '#E2DAF3', star1: '#C4B5FD', star2: '#7D6FB5', star3: '#5E4FA2' },
      'serene-fog': { bg: '#FBF8F9', bg2: '#F2E6EB', star1: '#F9A8D4', star2: '#955B73', star3: '#754157' },
      'paper': { bg: '#FAF7F2', bg2: '#E0D1B8', star1: '#FFFFFF', star2: '#C8B39A', star3: '#9A8472' },
      'neutral': { bg: '#EDF3EE', bg2: '#D5E8DB', star1: '#FFFFFF', star2: '#A0A0A0', star3: '#555555' }
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
