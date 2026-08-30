/**
 * ============================================================================
 * READER SETTINGS - GESTIÓN DE CONFIGURACIÓN AVANZADA POR LIBRO
 * ============================================================================
 * Maneja fuentes, tamaños, grosor, interlineado, márgenes, columnas, flujo
 * y temas visuales con persistencia individual en IndexedDB.
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
    theme: 'inherit'     // 'inherit', 'mystic-night', 'lavender-light', 'deep-twilight'
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
   * Inyecta y actualiza los estilos en el Rendition de epub.js.
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
    let paddingHoriz = '32px';
    if (settings.margins === 'compact') paddingHoriz = '16px';
    else if (settings.margins === 'relaxed') paddingHoriz = '56px';

    // 3. Reglas de estilo para el documento interno del libro
    rendition.themes.default({
      'body': {
        'padding': `0 ${paddingHoriz} !important`,
        'margin': '0 auto !important',
        'color': `${themeColors.text} !important`,
        'background': `${themeColors.bg} !important`,
        'font-family': `${this._getFontStack(settings.fontFamily)} !important`,
        'font-size': `${settings.fontSize}px !important`,
        'font-weight': `${settings.fontWeight === 'bold' ? '700' : (settings.fontWeight === 'medium' ? '500' : '400')} !important`,
        'line-height': `${settings.lineHeight} !important`,
        '-webkit-font-smoothing': 'antialiased'
      },
      'p': {
        'margin-bottom': '1em !important',
        'line-height': 'inherit !important',
        'color': `${themeColors.text} !important`
      },
      'h1, h2, h3, h4, h5, h6': {
        'color': `${themeColors.heading} !important`,
        'font-family': `${this._getFontStack(settings.fontFamily)} !important`,
        'margin-top': '1.5em !important',
        'margin-bottom': '0.5em !important'
      },
      'a': {
        'color': `${themeColors.accent} !important`,
        'text-decoration': 'none !important'
      },
      'blockquote': {
        'border-left': `3px solid ${themeColors.accent} !important`,
        'padding-left': '16px !important',
        'margin-left': '0 !important',
        'font-style': 'italic !important',
        'opacity': '0.9'
      }
    });

    // 4. Configuración de columnas (spread)
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
    // mystic-night por defecto
    return {
      bg: '#111111',
      text: '#E5E3EB',
      heading: '#F2F0F7',
      accent: '#5B4CC4'
    };
  }
}
