/**
 * ============================================================================
 * READER SETTINGS - GESTIÓN DE CONFIGURACIÓN AVANZADA POR LIBRO
 * ============================================================================
 * Maneja fuentes, tamaños, grosor, interlineado, modo de lectura (paginación vs scroll)
 * y temas visuales con persistencia global e individual e inyección en iframes.
 */

import { dbManager } from '../db.js';

export class ReaderSettings {
  static DEFAULT_SETTINGS = {
    fontFamily: 'Literata',
    fontSize: 18,
    fontWeight: 'normal', // 'normal' (400), 'medium' (600), 'bold' (800)
    lineHeight: 1.6,
    columns: 1,           // 1 o 2 columnas
    flowMode: 'paginated', // 'paginated' o 'scrolled-doc'
    theme: 'inherit'      // 'inherit', 'mystic-night', 'lavender-light', 'sepia', 'deep-twilight', 'enchanted-forest', 'clear-sky', 'mystic-purple'
  };

  /**
   * Obtiene la configuración guardada para un libro o las preferencias globales guardadas.
   * @param {string} bookId - ID del libro
   * @returns {Promise<Object>} Ajustes del libro
   */
  static async get(bookId) {
    let globalPref = {};
    try {
      const g = localStorage.getItem('arcadia_reader_prefs');
      if (g) globalPref = JSON.parse(g);
    } catch (_) {}

    try {
      const saved = await dbManager.get('readerSettings', bookId);
      return { ...this.DEFAULT_SETTINGS, ...globalPref, ...(saved || {}), bookId };
    } catch (e) {
      return { ...this.DEFAULT_SETTINGS, ...globalPref, bookId };
    }
  }

  /**
   * Guarda las preferencias personalizadas para un libro y como preferencia global.
   * @param {string} bookId - ID del libro
   * @param {Object} newSettings - Nuevos ajustes
   */
  static async save(bookId, newSettings) {
    const current = await this.get(bookId);
    const updated = { ...current, ...newSettings, bookId };
    
    // 1. Guardar en IndexedDB para este libro específico
    await dbManager.put('readerSettings', updated);

    // 2. Guardar también como preferencia global para que persista al salir y entrar
    try {
      const { bookId: _, ...globalData } = updated;
      localStorage.setItem('arcadia_reader_prefs', JSON.stringify(globalData));
    } catch (_) {}

    return updated;
  }

  /**
   * Inyecta y actualiza los estilos en el Rendition de epub.js y en todos los iframes activos.
   * @param {Object} rendition - Objeto Rendition de epub.js
   * @param {Object} settings - Configuración a aplicar
   * @param {string} effectiveTheme - Tema visual activo
   */
  static apply(rendition, settings, effectiveTheme = 'mystic-night') {
    if (!rendition) return;

    // 1. Determinar tema de color (heredado o individual)
    const readerTheme = settings.theme && settings.theme !== 'inherit' ? settings.theme : effectiveTheme;
    const themeColors = this._getThemeColors(readerTheme);

    const fontStack = this._getFontStack(settings.fontFamily);
    // Peso de fuente: Normal (400), Medio (600), Negrita (800)
    const fontWeightVal = settings.fontWeight === 'bold' ? '800' : (settings.fontWeight === 'medium' ? '600' : '400');

    // 2. Generar bloque CSS optimizado para el motor de paginación de epub.js
    const customCss = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;0,7..72,800;1,7..72,400&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&display=swap');

      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/dist/OpenDyslexic-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }

      html, body {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        background-color: ${themeColors.bg} !important;
        color: ${themeColors.text} !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: optimizeLegibility !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }

      body {
        margin: 0 !important;
        padding: 0 !important;
        font-family: ${fontStack} !important;
        font-size: ${settings.fontSize}px !important;
        font-weight: ${fontWeightVal} !important;
        line-height: ${settings.lineHeight} !important;
        box-sizing: border-box !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
      }

      *, p, span, div, li, em, strong, b, i, blockquote, a {
        font-family: ${fontStack} !important;
        box-sizing: border-box !important;
      }

      p, div, li, blockquote {
        color: ${themeColors.text} !important;
        font-size: inherit !important;
        line-height: ${settings.lineHeight} !important;
        font-weight: ${fontWeightVal} !important;
        margin-top: 0 !important;
        margin-bottom: 1.15em !important;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${themeColors.heading} !important;
        font-family: ${fontStack} !important;
        font-weight: ${settings.fontWeight === 'bold' ? '900' : '700'} !important;
        margin-top: 1.4em !important;
        margin-bottom: 0.6em !important;
      }

      a {
        color: ${themeColors.accent} !important;
        text-decoration: none !important;
      }

      blockquote {
        border-left: 3px solid ${themeColors.accent} !important;
        padding-left: 16px !important;
        margin: 1.2em 0 1.2em 0 !important;
        font-style: italic !important;
        opacity: 0.95 !important;
      }

      img, svg {
        max-width: 100% !important;
        height: auto !important;
      }

      ::selection {
        background: rgba(123, 107, 240, 0.35) !important;
      }
    `;

    // 3. Registrar en rendition.themes de epub.js
    try {
      rendition.themes.default({
        'html, body': {
          'width': '100% !important',
          'max-width': '100% !important',
          'margin': '0 !important',
          'padding': '0 !important',
          'color': `${themeColors.text} !important`,
          'background': `${themeColors.bg} !important`,
          'font-family': `${fontStack} !important`,
          'font-size': `${settings.fontSize}px !important`,
          'font-weight': `${fontWeightVal} !important`,
          'line-height': `${settings.lineHeight} !important`,
          'box-sizing': 'border-box !important'
        },
        'p, span, div, li, em, strong, b, i, blockquote, a': {
          'font-family': `${fontStack} !important`,
          'font-weight': `${fontWeightVal} !important`,
          'color': `${themeColors.text} !important`
        }
      });
    } catch (_) {}

    // 4. Inyectar directamente en los iframes renderizados
    try {
      const contents = rendition.getContents ? rendition.getContents() : [];
      contents.forEach(content => {
        if (!content || !content.document) return;

        // Inyectar enlace a Google Fonts en el head del iframe si no existe
        if (!content.document.getElementById('arcadia-google-fonts')) {
          const fontLink = content.document.createElement('link');
          fontLink.id = 'arcadia-google-fonts';
          fontLink.rel = 'stylesheet';
          fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,500;0,7..72,600;0,7..72,700;0,7..72,800;1,7..72,400&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Inter:wght@300;400;500;600;700;800&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400&display=swap';
          content.document.head.appendChild(fontLink);
        }

        let styleTag = content.document.getElementById('arcadia-reader-custom-style');
        if (!styleTag) {
          styleTag = content.document.createElement('style');
          styleTag.id = 'arcadia-reader-custom-style';
          content.document.head.appendChild(styleTag);
        }
        styleTag.textContent = customCss;
      });
    } catch (e) {
      console.warn('Aviso inyectando estilos en iframe:', e);
    }

    // 5. Configuración de columnas (spread)
    if (rendition.spread) {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      const effectiveSpread = (!isMobile && settings.columns === 2) ? 'always' : 'none';
      rendition.spread(effectiveSpread);
    }
  }

  /**
   * Resuelve la pila de fuentes con fallbacks seguros.
   * @private
   */
  static _getFontStack(fontName) {
    switch (fontName) {
      case 'Literata':
        return "'Literata', Georgia, serif";
      case 'Merriweather':
        return "'Merriweather', Georgia, serif";
      case 'Lora':
        return "'Lora', Georgia, serif";
      case 'EB Garamond':
      case 'EBGaramond':
      case 'Garamond':
        return "'EB Garamond', 'Garamond', Georgia, serif";
      case 'Playfair':
      case 'Playfair Display':
        return "'Playfair Display', Georgia, serif";
      case 'Poppins':
        return "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Inter':
        return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Roboto':
        return "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'OpenDyslexic':
      case 'Dyslexic':
        return "'OpenDyslexic', 'Comic Sans MS', sans-serif";
      default:
        return "'Literata', Georgia, serif";
    }
  }

  /**
   * Obtiene la paleta de colores para el lector.
   */
  static _getThemeColors(themeName) {
    if (themeName === 'lavender-light') {
      return {
        bg: '#FCFBFE',
        text: '#201C30',
        heading: '#1A162B',
        accent: '#5B4CC4'
      };
    }
    if (themeName === 'sepia') {
      return {
        bg: '#FBF0D9',
        text: '#3D2F1D',
        heading: '#2B1F11',
        accent: '#8C5B23'
      };
    }
    if (themeName === 'deep-twilight') {
      return {
        bg: '#0B111E',
        text: '#E5ECF8',
        heading: '#F0F4FC',
        accent: '#F5A623'
      };
    }
    if (themeName === 'enchanted-forest') {
      return {
        bg: '#F5F0E6',
        text: '#262922',
        heading: '#1E2B1A',
        accent: '#6C8B5E'
      };
    }
    if (themeName === 'clear-sky') {
      return {
        bg: '#EBF4FA',
        text: '#132D48',
        heading: '#0F233B',
        accent: '#3182CE'
      };
    }
    if (themeName === 'mystic-purple') {
      return {
        bg: '#18132B',
        text: '#EFEBFB',
        heading: '#F7F5FE',
        accent: '#8B5CF6'
      };
    }
    // mystic-night por defecto
    return {
      bg: '#111111',
      text: '#E5E3EB',
      heading: '#F2F0F7',
      accent: '#5B4CC4'
    };
  }
}
