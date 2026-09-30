/**
 * ============================================================================
 * THEME MANAGER - CONTROLADOR DE TEMAS CSS
 * ============================================================================
 * Soporta Cerúleo Claro, Lavanda Claro, Beige Cálido, Bosque de la Mañana,
 * Niebla Serena y Abismo Nocturno.
 */

export class ThemeManager {
  static THEMES = {
    BOREAL_BLUE: 'boreal-blue',
    TWILIGHT_LAVENDER: 'twilight-lavender',
    CLASSIC_IVORY: 'classic-ivory',
    OLIVE_GREEN: 'olive-green',
    ANTIQUE_PINK: 'antique-pink',
    NIGHT_INK: 'night-ink'
  };

  static STORAGE_KEY = 'arcadia_theme';

  constructor() {
    this.currentTheme = localStorage.getItem(ThemeManager.STORAGE_KEY) || ThemeManager.THEMES.BOREAL_BLUE;
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
   * Normaliza aliases legacy (cerulean-light, lavender-light, clear-sky, enchanted-forest, serene-fog, abyss-dark, etc.).
   * @param {string} themeName - Nombre del tema
   */
  applyTheme(themeName) {
    if (!themeName || typeof themeName !== 'string') {
      themeName = ThemeManager.THEMES.BOREAL_BLUE;
    }
    themeName = themeName.trim();

    // Normalizar temas legacy
    if (themeName === 'cerulean-light') themeName = ThemeManager.THEMES.BOREAL_BLUE;
    else if (themeName === 'lavender-light') themeName = ThemeManager.THEMES.TWILIGHT_LAVENDER;
    else if (themeName === 'clear-sky') themeName = ThemeManager.THEMES.CLASSIC_IVORY;
    else if (themeName === 'enchanted-forest' || themeName === 'mint') themeName = ThemeManager.THEMES.OLIVE_GREEN;
    else if (themeName === 'serene-fog' || themeName === 'wine-poetry' || themeName === 'wine') themeName = ThemeManager.THEMES.ANTIQUE_PINK;
    else if (themeName === 'abyss-dark' || themeName === 'mystic-night' || themeName === 'deep-twilight' || themeName === 'system') themeName = ThemeManager.THEMES.NIGHT_INK;

    const knownThemes = new Set([
      ThemeManager.THEMES.BOREAL_BLUE,
      ThemeManager.THEMES.TWILIGHT_LAVENDER,
      ThemeManager.THEMES.CLASSIC_IVORY,
      ThemeManager.THEMES.OLIVE_GREEN,
      ThemeManager.THEMES.ANTIQUE_PINK,
      ThemeManager.THEMES.NIGHT_INK
    ]);
    if (!knownThemes.has(themeName)) {
      console.warn(`[ThemeManager] Tema desconocido "${themeName}", usando boreal-blue`);
      themeName = ThemeManager.THEMES.BOREAL_BLUE;
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
   * Sincroniza el color de la barra del navegador, barra de estado y navegación Android con el tema.
   * @param {string} themeName
   */
  _updateThemeColor(themeName) {
    const themeColors = {
      'boreal-blue': { bg: '#EEF3F7', surface: '#F8FAFC', dark: false },
      'twilight-lavender': { bg: '#F4F1F7', surface: '#FCFAFD', dark: false },
      'classic-ivory': { bg: '#F4EFE6', surface: '#FAF7F1', dark: false },
      'olive-green': { bg: '#EEF4F0', surface: '#F8FAF8', dark: false },
      'antique-pink': { bg: '#F7F2F3', surface: '#FDFBFC', dark: false },
      'night-ink': { bg: '#0E1114', surface: '#15191E', dark: true }
    };
    const current = themeColors[themeName] || themeColors['boreal-blue'];
    const color = current.bg;
    const isDark = current.dark;
    const navColor = current.surface || color;

    try {
      const metaTags = document.querySelectorAll('meta[name="theme-color"]');
      if (metaTags && metaTags.length > 0) {
        metaTags.forEach((meta) => meta.setAttribute('content', color));
      } else {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = color;
        document.head.appendChild(meta);
      }
    } catch (_) {}

    // Sincronización nativa para contenedores Android APK / WebView / Capacitor / Cordova
    try {
      if (window.Android && typeof window.Android.setNavigationBarColor === 'function') {
        window.Android.setNavigationBarColor(navColor, isDark);
      }
      if (window.Android && typeof window.Android.setStatusBarColor === 'function') {
        window.Android.setStatusBarColor(color, isDark);
      }
      if (window.Capacitor?.Plugins?.StatusBar) {
        window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color });
      }
      if (window.Capacitor?.Plugins?.NavigationBar) {
        window.Capacitor.Plugins.NavigationBar.setColor({ color: navColor, darkButtons: !isDark });
      }
      if (window.NavigationBar && typeof window.NavigationBar.backgroundColorByHexString === 'function') {
        window.NavigationBar.backgroundColorByHexString(navColor, !isDark);
      }
    } catch (_) {}
  }

  /**
   * @deprecated Favicon ahora es estático (libro dorado en assets/icons/favicon.svg).
   * Se conserva como no-op para compatibilidad por si se llama desde código legacy.
   */
  _updateFavicon() {}
}
