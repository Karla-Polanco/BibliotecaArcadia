/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS Y CREADOR DE TEMAS PERSONALIZADOS
 * ============================================================================
 * Soporta Azul Boreal, Lavanda Crepuscular, Marfil Clásico, Verde Oliva,
 * Rosa Antiguo, Noche de Tinta y Creador de Temas Personalizados (Color Picker).
 */

export class ThemeManager {
  static THEMES = {
    PLUM: 'plum',
    SAGE_CREAM: 'sage-cream',
    LIGHT: 'light',
    NAVY_SUMMIT: 'navy-summit',
    COZY_BROWN: 'cozy-brown',
    NOIR_SILVER: 'noir-silver',
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
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.LIGHT;
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
      themeName = ThemeManager.THEMES.LIGHT;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy → nuevos nombres
    // boreal-blue / cerulean-light → navy-summit (azul ejecutivo)
    if (themeName === 'cerulean-light' || themeName === 'boreal-blue') themeName = ThemeManager.THEMES.NAVY_SUMMIT;
    // twilight-lavender / lavender-light → plum (ciruela & lavanda)
    else if (themeName === 'lavender-light' || themeName === 'twilight-lavender') themeName = ThemeManager.THEMES.PLUM;
    // classic-ivory / clear-sky → cozy-brown (beige & brown)
    else if (themeName === 'clear-sky' || themeName === 'classic-ivory') themeName = ThemeManager.THEMES.COZY_BROWN;
    // olive-green / enchanted-forest / mint → sage-cream (salvia & crema)
    else if (themeName === 'enchanted-forest' || themeName === 'mint' || themeName === 'olive-green') themeName = ThemeManager.THEMES.SAGE_CREAM;
    // oscuros cálidos y fríos → noir-silver (único oscuro)
    else if (themeName === 'serene-fog' || themeName === 'wine-poetry' || themeName === 'wine' || themeName === 'antique-pink' || themeName === 'toasted-ash') themeName = ThemeManager.THEMES.NOIR_SILVER;
    else if (themeName === 'abyss-dark' || themeName === 'mystic-night' || themeName === 'deep-twilight' || themeName === 'system' || themeName === 'night-ink') themeName = ThemeManager.THEMES.NOIR_SILVER;

    const knownThemes = new Set([
      ThemeManager.THEMES.PLUM,
      ThemeManager.THEMES.SAGE_CREAM,
      ThemeManager.THEMES.LIGHT,
      ThemeManager.THEMES.NAVY_SUMMIT,
      ThemeManager.THEMES.COZY_BROWN,
      ThemeManager.THEMES.NOIR_SILVER,
      ThemeManager.THEMES.CUSTOM
    ]);

    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando light`);
      themeName = ThemeManager.THEMES.LIGHT;
    }

    this.currentTheme = themeName;
    localStorage.setItem(ThemeManager.STORAGE_KEY, themeName);
    // Cambio instantáneo sin flash: se suprimen todas las transiciones/
    // animaciones justo antes del swap para que el nuevo tema pinte de
    // golpe en el siguiente frame (sin fundido claro <-> oscuro ni
    // parpadeo del patrón de fondo). La clase se retira en doble rAF.
    const root = document.documentElement;
    root.classList.add('theme-no-transition');
    // Limpieza por si un cambio anterior no alcanzó a retirar la clase
    // (p. ej. pestaña en segundo plano sin rAF).
    clearTimeout(this._themeT);
    root.setAttribute('data-theme', themeName);

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

    // Forzar reflow para que el swap aplique ya sin transiciones y
    // retirar la clase en doble rAF (con fallback por si no hay rAF).
    try { void root.offsetWidth; } catch (_) {}
    const release = () => root.classList.remove('theme-no-transition');
    try {
      requestAnimationFrame(() => requestAnimationFrame(release));
    } catch (_) {}
    clearTimeout(this._themeT);
    this._themeT = setTimeout(release, 60);

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
      'plum': { bg: '#EEE9F2', surface: '#F8F5FA', dark: false },
      'sage-cream': { bg: '#E5ECE1', surface: '#F5F7F2', dark: false },
      'light': { bg: '#F0F0F2', surface: '#FAFAFB', dark: false },
      'navy-summit': { bg: '#E5EBF4', surface: '#F4F7FC', dark: false },
      'cozy-brown': { bg: '#EDE1D1', surface: '#FAF4EC', dark: false },
      'noir-silver': { bg: '#0D0D0D', surface: '#181818', dark: true }
    };

    let current = themeColors[themeName] || themeColors['light'];
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
