/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS
 * ============================================================================
 * Soporta Cerúleo Claro, Lavanda Claro, Beige Cálido, Bosque de la Mañana,
 * Niebla Serena y Abismo Nocturno.
 */

export class ThemeManager {
  static THEMES = {
    CERULEAN_LIGHT: 'cerulean-light',
    LAVENDER_LIGHT: 'lavender-light',
    WINE_POETRY: 'serene-fog',
    ENCHANTED_FOREST: 'enchanted-forest',
    CLEAR_SKY: 'clear-sky',
    ABYSS_DARK: 'abyss-dark'
  };

  static STORAGE_KEY = 'arcadia_theme';

  constructor() {
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.CERULEAN_LIGHT;
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
   * Normaliza aliases legacy (mystic-night → cerulean-light, deep-twilight, system, wine-poetry).
   * @param {string} themeName - Nombre del tema
   */
  applyTheme(themeName) {
    if (!themeName || typeof themeName !== 'string') {
      themeName = ThemeManager.THEMES.CERULEAN_LIGHT;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy
    if (themeName === 'system' || themeName === 'deep-twilight' || themeName === 'mystic-night' || themeName === 'wine-poetry') {
      if (themeName === 'wine-poetry') themeName = ThemeManager.THEMES.WINE_POETRY;
      else themeName = ThemeManager.THEMES.CERULEAN_LIGHT;
    }
    // Alias adicional: mystic-night ya mapeado arriba, pero por si viene con espacios/casing
    if (themeName === 'mystic-night') themeName = ThemeManager.THEMES.CERULEAN_LIGHT;

    const knownThemes = new Set([
      ThemeManager.THEMES.CERULEAN_LIGHT,
      ThemeManager.THEMES.LAVENDER_LIGHT,
      ThemeManager.THEMES.WINE_POETRY,
      ThemeManager.THEMES.ENCHANTED_FOREST,
      ThemeManager.THEMES.CLEAR_SKY,
      ThemeManager.THEMES.ABYSS_DARK
    ]);
    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando cerulean-light`);
      themeName = ThemeManager.THEMES.CERULEAN_LIGHT;
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
   * Sincroniza el color de la barra del navegador / splash con el tema.
   * @param {string} themeName
   */
  _updateThemeColor(themeName) {
    const themeColors = {
      'cerulean-light': '#EEF4F8',
      'lavender-light': '#F8F6FC',
      'clear-sky': '#F8F4EC',
      'enchanted-forest': '#F2F7F3',
      'serene-fog': '#FBF7F8',
      'abyss-dark': '#0F1216'
    };
    const color = themeColors[themeName] || '#EEF4F8';
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
      'cerulean-light': { bg: '#EEF4F8', bg2: '#D5E5EE', star1: '#A8D0E3', star2: '#39789F', star3: '#183B55' },
      'mystic-night': { bg: '#EEF4F8', bg2: '#D5E5EE', star1: '#A8D0E3', star2: '#39789F', star3: '#183B55' },
      'clear-sky': { bg: '#F8F4EC', bg2: '#E9DBC8', star1: '#E5D1B4', star2: '#C8A987', star3: '#71523C' },
      'enchanted-forest': { bg: '#F2F7F3', bg2: '#D7E7DB', star1: '#A9D5B6', star2: '#73A685', star3: '#234E35' },
      'lavender-light': { bg: '#F8F6FC', bg2: '#E7E0F2', star1: '#D0C4EA', star2: '#A392C8', star3: '#514276' },
      'serene-fog': { bg: '#FBF7F8', bg2: '#EBDCE3', star1: '#E7B4CA', star2: '#B88BA0', star3: '#633546' },
      'abyss-dark': { bg: '#0F1216', bg2: '#2C3741', star1: '#B8CAD6', star2: '#A7BBC9', star3: '#536A7D' },
      'paper': { bg: '#F8F4EC', bg2: '#E9DBC8', star1: '#FFFFFF', star2: '#C8A987', star3: '#71523C' },
      'neutral': { bg: '#F2F7F3', bg2: '#D7E7DB', star1: '#FFFFFF', star2: '#A0A0A0', star3: '#555555' }
    };

    const p = themePalettes[themeName] || themePalettes['cerulean-light'];
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
