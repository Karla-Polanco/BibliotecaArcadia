/**
 * ============================================================================
 * READER SETTINGS - GESTIÓN DE CONFIGURACIÓN AVANZADA POR LIBRO
 * ============================================================================
 * Maneja fuentes, tamaños, grosor, interlineado, márgenes, columnas, flujo
 * y temas visuales con persistencia individual en IndexedDB e inyección directa en iframe.
 */

import { dbManager } from '../db.js';

export class ReaderSettings {
  static DEFAULT_SETTINGS = {
    fontFamily: 'Literata',
    fontSize: 18,
    fontWeight: 'normal',
    lineHeight: 1.6,
    margins: 'normal',   // 'compact', 'normal', 'relaxed'
    columns: 1,          // 1 o 2 columnas
    flowMode: 'paginated', // 'paginated' o 'scrolled-doc'
    theme: 'inherit'     // 'inherit', 'mystic-night', 'lavender-light', 'deep-twilight', 'enchanted-forest', 'clear-sky'
  };

  /**
   * Obtiene la configuración guardada para un libro específico o los valores por defecto.
   * @param {string} bookId - ID del libro
   * @returns {Promise<Object>} Ajustes del libro
   */
  static async get(bookId) {
    try {
      const saved = await dbManager.get('readerSettings', bookId);
      return { ...this.DEFAULT_SETTINGS, ...(saved || {}), bookId };
    } catch (e) {
      return { ...this.DEFAULT_SETTINGS, bookId };
    }
  }

  /**
   * Guarda las preferencias personalizadas para un libro en IndexedDB.
   * @param {string} bookId - ID del libro
   * @param {Object} newSettings - Nuevos ajustes
   */
  static async save(bookId, newSettings) {
    const current = await this.get(bookId);
    const updated = { ...current, ...newSettings, bookId };
    await dbManager.put('readerSettings', updated);
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

    // 2. Determinar padding lateral según márgenes
    let paddingHoriz = '28px';
    if (settings.margins === 'compact') paddingHoriz = '12px';
    else if (settings.margins === 'relaxed') paddingHoriz = '48px';

    const fontStack = this._getFontStack(settings.fontFamily);
    const fontWeightVal = settings.fontWeight === 'bold' ? '700' : (settings.fontWeight === 'medium' ? '500' : '400');

    // 3. Generar bloque CSS completo para inyección
    const customCss = `
      @import url('https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;1,7..72,400&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Roboto:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap');

      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/dist/OpenDyslexic-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }

      html, body {
        background-color: ${themeColors.bg} !important;
        color: ${themeColors.text} !important;
      }

      body {
        padding: 0 ${paddingHoriz} !important;
        margin: 0 auto !important;
        color: ${themeColors.text} !important;
        background: ${themeColors.bg} !important;
        font-family: ${fontStack} !important;
        font-size: ${settings.fontSize}px !important;
        font-weight: ${fontWeightVal} !important;
        line-height: ${settings.lineHeight} !important;
        -webkit-font-smoothing: antialiased !important;
      }

      *, p, span, div, li, em, strong, b, i, blockquote, a {
        font-family: ${fontStack} !important;
      }

      p, div, li, blockquote {
        color: ${themeColors.text} !important;
        font-size: inherit !important;
        line-height: ${settings.lineHeight} !important;
        font-weight: ${fontWeightVal} !important;
      }

      p {
        margin-bottom: 1.15em !important;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${themeColors.heading} !important;
        font-family: ${fontStack} !important;
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
        margin-left: 0 !important;
        font-style: italic !important;
        opacity: 0.95 !important;
      }

      ::selection {
        background: rgba(123, 107, 240, 0.35) !important;
      }
    `;

    // 4. Registrar en rendition.themes de epub.js
    try {
      rendition.themes.default({
        'body': {
          'padding': `0 ${paddingHoriz} !important`,
          'color': `${themeColors.text} !important`,
          'background': `${themeColors.bg} !important`,
          'font-family': `${fontStack} !important`,
          'font-size': `${settings.fontSize}px !important`,
          'line-height': `${settings.lineHeight} !important`
        },
        'p, span, div, li, em, strong, b, i, blockquote, a': {
          'font-family': `${fontStack} !important`
        }
      });
    } catch (_) {}

    // 5. Inyectar / Actualizar directamente en los iframes renderizados
    try {
      const contents = rendition.getContents ? rendition.getContents() : [];
      contents.forEach(content => {
        if (!content || !content.document) return;
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

    // 6. Configuración de columnas (spread)
    if (rendition.spread) {
      rendition.spread(settings.columns === 2 ? 'always' : 'none');
    }
  }

  /**
   * Resuelve la pila de fuentes con fallbacks seguros.
   * @private
   */
  static _getFontStack(fontName) {
    switch (fontName) {
      case 'Literata':
        return "'Literata', 'Merriweather', Georgia, 'Times New Roman', serif";
      case 'Merriweather':
        return "'Merriweather', Georgia, 'Times New Roman', serif";
      case 'Roboto':
        return "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Inter':
        return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'OpenDyslexic':
        return "'OpenDyslexic', 'Comic Sans MS', sans-serif";
      default:
        return "'Literata', Georgia, serif";
    }
  }

  /**
   * Obtiene la paleta de colores para el lector.
   * @private
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
    // mystic-night por defecto
    return {
      bg: '#111111',
      text: '#E5E3EB',
      heading: '#F2F0F7',
      accent: '#5B4CC4'
    };
  }
}
