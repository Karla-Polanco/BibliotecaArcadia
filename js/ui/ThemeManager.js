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
    } else {
      document.documentElement.setAttribute('data-theme', themeName);
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
      window.dispatchEvent(new CustomEvent('arcadia:themechange', {
        detail: { theme: ThemeManager.THEMES.SYSTEM, effectiveTheme }
      }));
    }
  }
}
