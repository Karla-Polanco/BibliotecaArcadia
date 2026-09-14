/**
 * ============================================================================
 * READER SETTINGS - GESTIÓN DE CONFIGURACIÓN AVANZADA POR LIBRO
 * ============================================================================
* Maneja fuentes, tamaños, grosor, interlineado y temas visuales con persistencia global e individual e inyección en iframes.
 */

import { dbManager } from '../db.js';

export class ReaderSettings {
  static DEFAULT_SETTINGS = {
    fontFamily: 'Literata',
    fontSize: 18,
    fontWeight: 'normal', // 'normal' (400), 'medium' (600), 'bold' (800)
    lineHeight: 1.6,
    columns: 1,           // 1 o 2 columnas
    flowMode: 'scrolled-doc', // Desplazamiento continuo (scroll)
    theme: 'inherit'      // 'inherit', 'mystic-night', 'lavender-light', 'paper', 'neutral', 'enchanted-forest', 'clear-sky', 'wine'
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
      return { ...this.DEFAULT_SETTINGS, ...globalPref, ...(saved || {}), bookId, flowMode: 'scrolled-doc' };
    } catch (e) {
      return { ...this.DEFAULT_SETTINGS, ...globalPref, bookId, flowMode: 'scrolled-doc' };
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
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/npm/opendyslexic@1.0.3/dist/OpenDyslexic-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
      }

      html {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
        background-color: ${themeColors.bg} !important;
        color: ${themeColors.text} !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: optimizeLegibility !important;
      }

      body {
        margin: 0 auto !important;
        max-width: 880px !important;
        padding-top: 72px !important;
        padding-left: 20px !important;
        padding-right: 20px !important;
        padding-bottom: 68px !important;
        font-family: ${fontStack} !important;
        font-size: ${settings.fontSize}px !important;
        font-weight: ${fontWeightVal} !important;
        line-height: ${settings.lineHeight} !important;
        text-align: justify !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        -webkit-hyphens: auto !important;
        -ms-hyphens: auto !important;
        hyphens: auto !important;
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
        text-align: justify !important;
        margin-top: 0 !important;
        margin-bottom: 1.15em !important;
        -webkit-hyphens: auto !important;
        -ms-hyphens: auto !important;
        hyphens: auto !important;
      }

      h1, h2, h3, h4, h5, h6 {
        color: ${themeColors.heading} !important;
        font-family: ${fontStack} !important;
        font-weight: ${settings.fontWeight === 'bold' ? '900' : '700'} !important;
        text-align: center !important;
        margin-top: 1.4em !important;
        margin-bottom: 0.6em !important;
      }

      /* Títulos de capítulo marcados con clases o ids del propio libro */
      [class*="capitul" i], [class*="capítul" i], [class*="chapter" i],
      [class*="titul" i], [class*="títul" i], [class*="title" i],
      [class*="heading" i], [class*="cabecera" i],
      [id*="capitul" i], [id*="chapter" i],
      [id*="titul" i], [id*="title" i] {
        text-align: center !important;
      }

      /* Ornamentos del capítulo (icono bajo el título): imágenes sueltas o en contenedor */
      body > img, body > svg {
        display: block !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      figure {
        text-align: center !important;
        margin-left: auto !important;
        margin-right: auto !important;
      }

      p:has(> img), div:has(> img),
      p:has(> svg), div:has(> svg),
      p:has(> a > img), div:has(> a > img) {
        text-align: center !important;
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
        background: rgba(212, 175, 55, 0.38) !important;
        color: inherit !important;
      }

      .arcadia-highlight {
        border-radius: 3px !important;
        padding: 1px 0 !important;
        transition: filter 0.15s ease !important;
        cursor: pointer !important;
      }

      .arcadia-highlight:hover {
        filter: brightness(1.15) !important;
      }

      .arcadia-underline {
        text-decoration: underline !important;
        text-underline-offset: 3px !important;
        text-decoration-thickness: 2.5px !important;
        cursor: pointer !important;
        transition: filter 0.15s ease !important;
      }

      .arcadia-underline:hover {
        filter: brightness(1.25) !important;
      }

      ::-webkit-scrollbar {
        display: none !important;
      }

      html, body {
        scrollbar-width: none !important;
      }
    `;

    // 3. Registrar en rendition.themes de epub.js
    try {
      rendition.themes.default({
        'html': {
          'width': '100%',
          'max-width': '100%',
          'margin': '0',
          'padding': '0',
          'background': themeColors.bg,
          'box-sizing': 'border-box',
          'overflow-x': 'hidden'
        },
        'body': {
          'margin': '0',
          'padding-top': '72px',
          'padding-bottom': '68px',
          'padding-left': '20px',
          'padding-right': '20px',
          'color': themeColors.text,
          'background': themeColors.bg,
          'font-family': fontStack,
          'font-size': `${settings.fontSize}px`,
          'font-weight': fontWeightVal,
          'line-height': settings.lineHeight,
          'text-align': 'justify',
          'box-sizing': 'border-box',
          'overflow-x': 'hidden',
          'word-break': 'normal',
          'overflow-wrap': 'break-word'
        },
        'p, span, div, li, em, strong, b, i, blockquote, a': {
          'font-family': fontStack,
          'font-weight': fontWeightVal,
          'text-align': 'justify',
          'color': themeColors.text
        },
        'h1, h2, h3, h4, h5, h6': {
          'text-align': 'center'
        }
      });
    } catch (_) {}

    // 4. Inyectar directamente en los iframes renderizados
    try {
      const contents = rendition.getContents ? rendition.getContents() : [];
      contents.forEach(content => {
        if (!content || !content.document) return;

        // Inyectar enlace a Google Fonts curado en el head del iframe si no existe
        if (!content.document.getElementById('arcadia-google-fonts')) {
          const fontLink = content.document.createElement('link');
          fontLink.id = 'arcadia-google-fonts';
          fontLink.rel = 'stylesheet';
          fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Literata:opsz,wght@7..72,400;7..72,600;7..72,700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=Atkinson+Hyperlegible:wght@400;700&family=Cinzel:wght@600;700&display=swap';
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
      const effectiveSpread = (!isMobile && settings.columns === 2) ? 'always' : 'auto';
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
      case 'Source Serif':
      case 'SourceSerif':
        return "'Source Serif 4', Georgia, serif";
      case 'Merriweather':
        return "'Source Serif 4', Georgia, serif";
      case 'Lora':
        // Curado: Lora migra a Literata (serif literaria curada)
        return "'Literata', Georgia, serif";
      case 'EB Garamond':
      case 'EBGaramond':
      case 'Garamond':
        return "'Source Serif 4', Georgia, serif";
      case 'Playfair':
      case 'Playfair Display':
        return "'Cinzel', Georgia, serif";
      case 'Atkinson':
      case 'Atkinson Hyperlegible':
        return "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Poppins':
        return "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Inter':
      case 'Roboto':
        // Curado: Inter/Roboto migran a Poppins (sans UI curado)
        return "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
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
    // Alias legacy: 'wine' → 'wine-poetry'
    if (themeName === 'wine') themeName = 'wine-poetry';
    if (themeName === 'lavender-light') {
      return {
        bg: '#FAF8FC',
        text: '#242032',
        heading: '#161324',
        accent: '#6454D6'
      };
    }
    if (themeName === 'oled') {
      return {
        bg: '#000000',
        text: '#D5D8DE',
        heading: '#FFFFFF',
        accent: '#D4AF37'
      };
    }
    if (themeName === 'mint') {
      return {
        bg: '#EAF0E8',
        text: '#1C2E1E',
        heading: '#122013',
        accent: '#2D7A4D'
      };
    }
    if (themeName === 'paper') {
      return {
        bg: '#F7F1E3',
        text: '#2D251E',
        heading: '#1C1714',
        accent: '#8C6630'
      };
    }
    if (themeName === 'neutral') {
      return {
        bg: '#222222',
        text: '#E8EAED',
        heading: '#FFFFFF',
        accent: '#B3ADA2'
      };
    }
    if (themeName === 'enchanted-forest') {
      return {
        bg: '#F2F6F3',
        text: '#22382B',
        heading: '#15261C',
        accent: '#2D7A4D'
      };
    }
    if (themeName === 'clear-sky') {
      return {
        bg: '#EFF5FB',
        text: '#16283D',
        heading: '#0F1D2E',
        accent: '#2A6EE8'
      };
    }
    if (themeName === 'wine' || themeName === 'wine-poetry') {
      return {
        bg: '#F8F3F4',
        text: '#36222B',
        heading: '#25151C',
        accent: '#8A4363'
      };
    }
    // mystic-night por defecto
    return {
      bg: '#080D1D',
      text: '#E2E7F5',
      heading: '#FFFFFF',
      accent: '#849DFF'
    };
  }
}
