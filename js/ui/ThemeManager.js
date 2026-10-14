/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS Y CREADOR DE TEMAS PERSONALIZADOS
 * ============================================================================
 * Soporta Marino & Blanco, Amatista & Marfil, Oliva & Marfil, Clásico Claro,
 * Sepia & Café, Clásico Noche y Creador de Temas Personalizados (Color Picker).
 */

export class ThemeManager {
  static THEMES = {
    NAVY_WHITE: 'navy-white',
    AMETHYST_IVORY: 'amethyst-ivory',
    OLIVE_IVORY: 'olive-ivory',
    CLASSIC_LIGHT: 'classic-light',
    SEPIA_COFFEE: 'sepia-coffee',
    CLASSIC_NIGHT: 'classic-night',
    // Alias legacy: noir-silver → classic-night
    NOIR_SILVER: 'classic-night',
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
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.CLASSIC_LIGHT;
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
      themeName = ThemeManager.THEMES.CLASSIC_LIGHT;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy → nuevos nombres
    // boreal-blue / cerulean-light / navy-summit → navy-white (académico azul)
    if (themeName === 'cerulean-light' || themeName === 'boreal-blue' || themeName === 'navy-summit') themeName = ThemeManager.THEMES.NAVY_WHITE;
    // twilight-lavender / lavender-light / plum → amethyst-ivory (amatista)
    else if (themeName === 'lavender-light' || themeName === 'twilight-lavender' || themeName === 'plum') themeName = ThemeManager.THEMES.AMETHYST_IVORY;
    // classic-ivory / clear-sky / cozy-brown → sepia-coffee (cálido)
    else if (themeName === 'clear-sky' || themeName === 'classic-ivory' || themeName === 'cozy-brown') themeName = ThemeManager.THEMES.SEPIA_COFFEE;
    // olive-green / enchanted-forest / mint / sage-cream → olive-ivory (oliva)
    else if (themeName === 'enchanted-forest' || themeName === 'mint' || themeName === 'olive-green' || themeName === 'sage-cream') themeName = ThemeManager.THEMES.OLIVE_IVORY;
    // light → classic-light (nuevo nombre del tema por defecto)
    else if (themeName === 'light') themeName = ThemeManager.THEMES.CLASSIC_LIGHT;
    // noir-silver legacy → classic-night (opuesto a classic-light, negro & blanco)
    else if (themeName === 'noir-silver') themeName = ThemeManager.THEMES.CLASSIC_NIGHT;
    // oscuros cálidos y fríos → classic-night (único oscuro)
    else if (themeName === 'serene-fog' || themeName === 'wine-poetry' || themeName === 'wine' || themeName === 'antique-pink' || themeName === 'toasted-ash') themeName = ThemeManager.THEMES.CLASSIC_NIGHT;
    else if (themeName === 'abyss-dark' || themeName === 'mystic-night' || themeName === 'deep-twilight' || themeName === 'system' || themeName === 'night-ink') themeName = ThemeManager.THEMES.CLASSIC_NIGHT;

    const knownThemes = new Set([
      ThemeManager.THEMES.NAVY_WHITE,
      ThemeManager.THEMES.AMETHYST_IVORY,
      ThemeManager.THEMES.OLIVE_IVORY,
      ThemeManager.THEMES.CLASSIC_LIGHT,
      ThemeManager.THEMES.SEPIA_COFFEE,
      ThemeManager.THEMES.CLASSIC_NIGHT,
      ThemeManager.THEMES.CUSTOM
    ]);

    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando classic-light`);
      themeName = ThemeManager.THEMES.CLASSIC_LIGHT;
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

    // Si es tema personalizado, inyectar solo las 4 variables maestras en el
    // elemento raíz. El resto de la UI se deriva automáticamente vía
    // color-mix en css/themes.css [data-theme="custom"].
    if (themeName === ThemeManager.THEMES.CUSTOM) {
      const colors = customColors || this.getCustomColors();
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty('--custom-bg', colors.bg);
      rootStyle.setProperty('--custom-surface', colors.surface);
      rootStyle.setProperty('--custom-text', colors.text);
      rootStyle.setProperty('--custom-primary', colors.primary);
      // Activa la variante clara/oscura de themes.css:
      // [data-theme="custom"][data-custom-mode="light"] vs base dark.
      try {
        root.setAttribute('data-custom-mode', ThemeManager.isLightColor(colors.bg) ? 'light' : 'dark');
      } catch (_) {}
      // Limpieza de inyección legacy (derivadas directas) por migración:
      // antes se pisaban --color-* y --theme-bg-pattern en línea, lo que
      // rompía la derivación automática con color-mix.
      ['--color-background', '--color-surface', '--color-surface-secondary', '--color-surface-elevated',
       '--color-primary', '--color-primary-light', '--color-primary-dark', '--color-text',
       '--color-text-secondary', '--color-border', '--color-border-subtle', '--theme-bg-pattern'].forEach(prop => {
        rootStyle.removeProperty(prop);
      });
    } else {
      // Limpiar propiedades en línea si se vuelve a un tema predefinido
      const rootStyle = document.documentElement.style;
      try { root.removeAttribute('data-custom-mode'); } catch (_) {}
      ['--custom-bg', '--custom-surface', '--custom-text', '--custom-primary',
       '--color-background', '--color-surface', '--color-surface-secondary', '--color-surface-elevated',
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

  /**
   * Detecta si un color hex es claro (luminancia relativa > 0.5).
   * Usado para activar [data-custom-mode="light"] y color-scheme correcto.
   */
  static isLightColor(hex) {
    try {
      let h = String(hex || '').trim().replace('#', '');
      if (h.length === 3) h = h.split('').map(c => c + c).join('');
      if (h.length !== 6) return false;
      const r = parseInt(h.slice(0, 2), 16) / 255;
      const g = parseInt(h.slice(2, 4), 16) / 255;
      const b = parseInt(h.slice(4, 6), 16) / 255;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return lum > 0.5;
    } catch (_) {
      return false;
    }
  }

  _handleSystemThemeChange(e) {}

  _updateThemeColor(themeName) {
    const themeColors = {
      'navy-white': { bg: '#EDF1F6', surface: '#F9FBFD', dark: false },
      'amethyst-ivory': { bg: '#F2F0F3', surface: '#FBF9FC', dark: false },
      'olive-ivory': { bg: '#F0F1EC', surface: '#FAFAF6', dark: false },
      'classic-light': { bg: '#F1F1F2', surface: '#FAFAFA', dark: false },
      'sepia-coffee': { bg: '#F3F0EA', surface: '#FBFAF7', dark: false },
      'classic-night': { bg: '#000000', surface: '#0A0A0A', dark: true }
    };

    let current = themeColors[themeName] || themeColors['classic-light'];
    if (themeName === ThemeManager.THEMES.CUSTOM) {
      const cc = this.getCustomColors();
      const isLight = ThemeManager.isLightColor(cc.bg);
      current = { bg: cc.bg, surface: cc.surface, dark: !isLight };
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
