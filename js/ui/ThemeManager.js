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
    WINE_POETRY: 'wine-poetry',
    DEEP_TWILIGHT: 'deep-twilight',
    ENCHANTED_FOREST: 'enchanted-forest',
    CLEAR_SKY: 'clear-sky',
    SYSTEM: 'system'
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
   * @param {string} themeName - Nombre del tema
   */
  applyTheme(themeName) {
    if (!themeName || typeof themeName !== 'string') {
      themeName = ThemeManager.THEMES.MYSTIC_NIGHT;
    }
    themeName = themeName.trim();

    this.currentTheme = themeName;
    localStorage.setItem(ThemeManager.STORAGE_KEY, themeName);

    if (themeName === ThemeManager.THEMES.SYSTEM) {
      // Detección en tiempo real: si el SO es oscuro -> mystic-night, si es claro -> lavender-light
      const effectiveTheme = this.mediaQuery.matches ? ThemeManager.THEMES.MYSTIC_NIGHT : ThemeManager.THEMES.LAVENDER_LIGHT;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      this._updateFavicon(effectiveTheme);
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
      this._updateFavicon(themeName);
    }

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
   * Manejador para cambios en prefers-color-scheme cuando el tema es 'system'.
   */
  _handleSystemThemeChange(e) {
    if (this.currentTheme === ThemeManager.THEMES.SYSTEM) {
      const effectiveTheme = e.matches ? ThemeManager.THEMES.MYSTIC_NIGHT : ThemeManager.THEMES.LAVENDER_LIGHT;
      document.documentElement.setAttribute('data-theme', effectiveTheme);
      this._updateFavicon(effectiveTheme);
      window.dispatchEvent(new CustomEvent('arcadia:themechange', {
        detail: { theme: ThemeManager.THEMES.SYSTEM, effectiveTheme }
      }));
    }
  }

  /**
   * Actualiza dinámicamente el favicon de la pestaña con la paleta de colores del tema.
   * @param {string} themeName 
   */
  _updateFavicon(themeName) {
    const themePalettes = {
      'mystic-night': { bg: '#0F172A', bg2: '#020408', star1: '#AEBEFF', star2: '#718CFF', star3: '#3156C9' },
      'clear-sky': { bg: '#0F2338', bg2: '#061322', star1: '#E0F2FE', star2: '#60A5FA', star3: '#2563EB' },
      'enchanted-forest': { bg: '#0D2818', bg2: '#04120A', star1: '#DCFCE7', star2: '#4ADE80', star3: '#227D48' },
      'lavender-light': { bg: '#271E56', bg2: '#130C33', star1: '#DDD6FE', star2: '#A78BFA', star3: '#6C5CE7' },
      'wine-poetry': { bg: '#211019', bg2: '#0D040A', star1: '#FCE7F3', star2: '#E08DAA', star3: '#C47791' }
    };

    const p = themePalettes[themeName] || themePalettes['mystic-night'];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 20 20" width="100%" height="100%">
  <defs>
    <linearGradient id="favStarGrad" x1="10%" y1="0%" x2="90%" y2="100%">
      <stop offset="0%" stop-color="${p.star1}"/>
      <stop offset="50%" stop-color="${p.star2}"/>
      <stop offset="100%" stop-color="${p.star3}"/>
    </linearGradient>
    <linearGradient id="starStrokeGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${p.star2}"/>
      <stop offset="50%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="${p.star3}"/>
    </linearGradient>
  </defs>
  <path d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z" 
        fill="url(#favStarGrad)" stroke="url(#starStrokeGrad)" stroke-width="0.3" stroke-linejoin="round"/>
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
