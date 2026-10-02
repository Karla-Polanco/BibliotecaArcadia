/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS Y CREADOR DE TEMAS PERSONALIZADOS
 * ============================================================================
 * Soporta Azul Boreal, Lavanda Crepuscular, Marfil Clásico, Verde Oliva,
 * Rosa Antiguo, Noche de Tinta y Creador de Temas Personalizados (Color Picker).
 */

export class ThemeManager {
  static THEMES = {
    BOREAL_BLUE: 'boreal-blue',
    TWILIGHT_LAVENDER: 'twilight-lavender',
    CLASSIC_IVORY: 'classic-ivory',
    OLIVE_GREEN: 'olive-green',
    ANTIQUE_PINK: 'antique-pink',
    TOASTED_ASH: 'toasted-ash',
    NIGHT_INK: 'night-ink',
    CUSTOM: 'custom'
  };

  static STORAGE_KEY = 'arcadia_theme';
  static CUSTOM_COLORS_KEY = 'arcadia_custom_colors';

  static DEFAULT_CUSTOM_COLORS = {
    bg: '#10141A',
    surface: '#1A202C',
    primary: '#3B82F6',
    text: '#F3F4F6'
  };

  constructor() {
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.BOREAL_BLUE;
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._handleSystemThemeChange = this._handleSystemThemeChange.bind(this);
  }

  /**
   * Inicializa el tema en el DOM.
   */
  init() {
    this.applyTheme(this.currentTheme);
    if (this.mediaQuery && this.mediaQuery.addEventListener) {
      this.mediaQuery.addEventListener('change', this._handleSystemThemeChange);
    }
  }

  /**
   * Obtiene los colores del tema personalizado guardados en localStorage.
   */
  getCustomColors() {
    try {
      const raw = localStorage.getItem(ThemeManager.CUSTOM_COLORS_KEY);
      if (raw) return { ...ThemeManager.DEFAULT_CUSTOM_COLORS, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...ThemeManager.DEFAULT_CUSTOM_COLORS };
  }

  /**
   * Guarda y aplica una paleta de colores personalizada.
   * @param {Object} colors - { bg, surface, primary, text }
   */
  saveCustomColors(colors) {
    const merged = { ...this.getCustomColors(), ...colors };
    try {
      localStorage.setItem(ThemeManager.CUSTOM_COLORS_KEY, JSON.stringify(merged));
    } catch (_) {}
    this.applyTheme(ThemeManager.THEMES.CUSTOM, merged);
  }

  /**
   * Aplica un tema al documento raíz.
   * @param {string} themeName - Nombre del tema
   * @param {Object} [customColors] - Colores opcionales para tema personalizado
   */
  applyTheme(themeName, customColors = null) {
    if (!themeName || typeof themeName !== 'string') {
      themeName = ThemeManager.THEMES.BOREAL_BLUE;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy
    if (themeName === 'cerulean-light') themeName = ThemeManager.THEMES.BOREAL_BLUE;
    else if (themeName === 'lavender-light') themeName = ThemeManager.THEMES.TWILIGHT_LAVENDER;
    else if (themeName === 'clear-sky') themeName = ThemeManager.THEMES.CLASSIC_IVORY;
    else if (themeName === 'enchanted-forest' || themeName === 'mint') themeName = ThemeManager.THEMES.OLIVE_GREEN;
    else if (themeName === 'serene-fog' || themeName === 'wine-poetry' || themeName === 'wine' || themeName === 'antique-pink') themeName = ThemeManager.THEMES.TOASTED_ASH;
    else if (themeName === 'abyss-dark' || themeName === 'mystic-night' || themeName === 'deep-twilight' || themeName === 'system') themeName = ThemeManager.THEMES.NIGHT_INK;

    const knownThemes = new Set([
      ThemeManager.THEMES.BOREAL_BLUE,
      ThemeManager.THEMES.TWILIGHT_LAVENDER,
      ThemeManager.THEMES.CLASSIC_IVORY,
      ThemeManager.THEMES.OLIVE_GREEN,
      ThemeManager.THEMES.TOASTED_ASH,
      ThemeManager.THEMES.NIGHT_INK,
      ThemeManager.THEMES.CUSTOM
    ]);

    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando boreal-blue`);
      themeName = ThemeManager.THEMES.BOREAL_BLUE;
    }

    this.currentTheme = themeName;
    localStorage.setItem(ThemeManager.STORAGE_KEY, themeName);
    document.documentElement.setAttribute('data-theme', themeName);

    // Si es tema personalizado, inyectar variables CSS directas en :root
    if (themeName === ThemeManager.THEMES.CUSTOM) {
      const colors = customColors || this.getCustomColors();
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--color-background', colors.bg);
      rootStyle.setProperty('--color-surface', colors.surface);
      rootStyle.setProperty('--color-surface-secondary', colors.surface);
      rootStyle.setProperty('--color-surface-elevated', colors.surface);
      rootStyle.setProperty('--color-primary', colors.primary);
      rootStyle.setProperty('--color-primary-light', colors.primary);
      rootStyle.setProperty('--color-primary-dark', colors.primary);
      rootStyle.setProperty('--color-text', colors.text);
      rootStyle.setProperty('--color-text-secondary', colors.text);
      rootStyle.setProperty('--color-border', 'rgba(255, 255, 255, 0.16)');
      rootStyle.setProperty('--color-border-subtle', 'rgba(255, 255, 255, 0.08)');
      rootStyle.setProperty('--theme-bg-pattern', 'none');
    } else {
      // Limpiar propiedades en línea si se vuelve a un tema predefinido
      const rootStyle = document.documentElement.style;
      ['--color-background', '--color-surface', '--color-surface-secondary', '--color-surface-elevated',
       '--color-primary', '--color-primary-light', '--color-primary-dark', '--color-text',
       '--color-text-secondary', '--color-border', '--color-border-subtle', '--theme-bg-pattern'].forEach(prop => {
        rootStyle.removeProperty(prop);
      });
    }

    this._updateThemeColor(themeName);

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

  _handleSystemThemeChange(e) {}

  _updateThemeColor(themeName) {
    const themeColors = {
      'boreal-blue': { bg: '#EEF3F7', surface: '#F8FAFC', dark: false },
      'twilight-lavender': { bg: '#D9D1E3', surface: '#E8E2F0', dark: false },
      'classic-ivory': { bg: '#F4EFE6', surface: '#FAF7F1', dark: false },
      'olive-green': { bg: '#E7EEE9', surface: '#F4F8F5', dark: false },
      'toasted-ash': { bg: '#1A1613', surface: '#221D1A', dark: true },
      'antique-pink': { bg: '#1A1613', surface: '#221D1A', dark: true },
      'night-ink': { bg: '#0D1115', surface: '#141A20', dark: true }
    };

    let current = themeColors[themeName] || themeColors['boreal-blue'];
    if (themeName === ThemeManager.THEMES.CUSTOM) {
      const cc = this.getCustomColors();
      current = { bg: cc.bg, surface: cc.surface, dark: true };
    }

    const color = current.bg;
    const isDark = current.dark;
    const navColor = current.surface || color;

    try {
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags && metaTags.length > 0) {
        metaTags.forEach((meta) => meta.setAttribute('content', color));
      }
    } catch (_) {}
  }

  _updateFavicon() {}
}
