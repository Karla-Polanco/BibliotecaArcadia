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
    // Favicon estático: libro dorado (assets/icons/favicon.svg). No sobreescribir
    // dinámicamente para que el icono del navegador no cambie con el tema.
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
      if (meta2) meta2.setAttribute('content', themeName === 'abyss-dark' ? 'black-translucent' : 'default');
    } catch (_) {}
  }

  /**
   * @deprecated Favicon ahora es estático (libro dorado en assets/icons/favicon.svg).
   * Se conserva como no-op para compatibilidad por si se llama desde código legacy.
   */
  _updateFavicon() {}
}
