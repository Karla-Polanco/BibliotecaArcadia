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
    textAlign: 'left',    // 'left', 'justify', 'center', 'right'
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
    const alignVal = settings.textAlign || 'left';

    // 2. Generar bloque CSS optimizado para el motor de paginación de epub.js
    const customCss = `
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('https://cdn.jsdelivr.net/gh/antijingoist/opendyslexic@master/compiled/OpenDyslexic-Regular.otf') format('opentype');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
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
        -webkit-touch-callout: none !important;
      }

      body {
        margin: 0 auto !important;
        max-width: 920px !important;
        padding-top: 48px !important;
        padding-left: 32px !important;
        padding-right: 32px !important;
        padding-bottom: 48px !important;
        font-family: ${fontStack} !important;
        font-size: ${settings.fontSize}px !important;
        font-weight: ${fontWeightVal} !important;
        line-height: ${settings.lineHeight} !important;
        text-align: ${alignVal} !important;
        box-sizing: border-box !important;
        overflow-x: hidden !important;
        word-break: normal !important;
        overflow-wrap: break-word !important;
        -webkit-hyphens: auto !important;
        -ms-hyphens: auto !important;
        hyphens: auto !important;
        -webkit-touch-callout: none !important;
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
        text-align: ${alignVal} !important;
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
        background: rgba(200, 162, 97, 0.28) !important;
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

      /* NOTA: el overlay SVG de anotaciones de epub.js vive en el documento
         principal, así que su estilo real está en css/reader.css (apartado 10).
         Estas reglas solo quedan como respaldo dentro del iframe. */
      /* 1. Subrayado Recto */
      .arcadia-underline,
      svg .arcadia-underline,
      svg line.arcadia-underline,
      svg rect.arcadia-underline,
      svg polygon.arcadia-underline {
        fill: none !important;
        stroke-width: 2.5px !important;
        stroke-dasharray: none !important;
        cursor: pointer !important;
      }

      /* 2. Tachado (Line-through / Strikethrough) */
      .arcadia-strikethrough,
      svg .arcadia-strikethrough,
      svg line.arcadia-strikethrough,
      svg rect.arcadia-strikethrough,
      svg polygon.arcadia-strikethrough {
        fill: none !important;
        stroke-width: 2.5px !important;
        stroke-dasharray: none !important;
        transform: translateY(-0.45em) !important;
        transform-box: fill-box !important;
        transform-origin: center !important;
        cursor: pointer !important;
      }

      /* 3. Subrayado Ondulado / Punteado */
      .arcadia-wavy-underline,
      svg .arcadia-wavy-underline,
      svg line.arcadia-wavy-underline,
      svg rect.arcadia-wavy-underline,
      svg polygon.arcadia-wavy-underline {
        fill: none !important;
        stroke-width: 2.5px !important;
        stroke-dasharray: 4, 3 !important;
        stroke-linecap: round !important;
        cursor: pointer !important;
      }

      .arcadia-underline:hover, .arcadia-strikethrough:hover, .arcadia-wavy-underline:hover {
        filter: brightness(1.25) !important;
      }

      ::-webkit-scrollbar {
        display: none !important;
      }

      html, body {
        scrollbar-width: none !important;
      }

      @media (max-width: 768px) {
        body {
          max-width: 100% !important;
          padding-left: 20px !important;
          padding-right: 20px !important;
          padding-top: 24px !important;
          padding-bottom: 24px !important;
        }
      }
      @media (min-width: 1280px) {
        body {
          max-width: 1020px !important;
          padding-left: 40px !important;
          padding-right: 40px !important;
        }
      }
      @media (min-width: 1600px) {
        body {
          max-width: 1100px !important;
        }
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
          'margin': '0 auto',
          'max-width': '920px',
          'padding-top': '48px',
          'padding-bottom': '48px',
          'padding-left': '32px',
          'padding-right': '32px',
          'color': themeColors.text,
          'background': themeColors.bg,
          'font-family': fontStack,
          'font-size': `${settings.fontSize}px`,
          'font-weight': fontWeightVal,
          'line-height': settings.lineHeight,
          'text-align': alignVal,
          'box-sizing': 'border-box',
          'overflow-x': 'hidden',
          'word-break': 'normal',
          'overflow-wrap': 'break-word'
        },
        'p, span, div, li, em, strong, b, i, blockquote, a': {
          'font-family': fontStack,
          'font-weight': fontWeightVal,
          'text-align': alignVal,
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

        // Inyectar enlace a Google Fonts curado en el head del iframe
        const fontsHref = 'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Literata:ital,opsz,wght@0,7..72,400;0,7..72,600;0,7..72,700;0,7..72,800;1,7..72,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=Lora:ital,wght@0,400;0,600;0,700;1,400&family=EB+Garamond:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@400;500;600;700;800&family=Roboto:ital,wght@0,400;0,500;0,700;0,900;1,400&family=Lexend:wght@400;500;600;700&family=Cinzel:wght@600;700&display=swap';
        let fontLink = content.document.getElementById('arcadia-google-fonts');
        if (!fontLink) {
          fontLink = content.document.createElement('link');
          fontLink.id = 'arcadia-google-fonts';
          fontLink.rel = 'stylesheet';
          content.document.head.appendChild(fontLink);
        }
        if (fontLink.href !== fontsHref) {
          fontLink.href = fontsHref;
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
      case 'Source Serif 4':
        return "'Source Serif 4', Georgia, serif";
      case 'Merriweather':
        return "'Source Serif 4', Georgia, serif";
      case 'Lora':
        return "'Lora', Georgia, serif";
      case 'EB Garamond':
      case 'EBGaramond':
      case 'Garamond':
        return "'EB Garamond', Garamond, Georgia, serif";
      case 'Playfair':
      case 'Playfair Display':
        return "'Playfair Display', Georgia, serif";
      case 'Atkinson':
      case 'Atkinson Hyperlegible':
        return "'Atkinson Hyperlegible', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Poppins':
        return "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Inter':
        return "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'Roboto':
        return "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      case 'OpenDyslexic':
      case 'Dyslexic':
        return "'OpenDyslexic', 'Lexend', sans-serif";
      default:
        return "'Literata', Georgia, serif";
    }
  }

  /**
   * Obtiene la paleta de colores para el lector.
   */
  static _getThemeColors(themeName) {
    // Alias legacy: 'wine' → 'serene-fog'
    if (themeName === 'wine') themeName = 'serene-fog';
    if (themeName === 'lavender-light') {
      return {
        bg: '#F9F8F6',
        text: '#23222B',
        heading: '#1B1A27',
        accent: '#6A58A3'
      };
    }
    if (themeName === 'oled') {
      return {
        bg: '#07090D',
        text: '#CCD1DC',
        heading: '#E8EAF0',
        accent: '#C8A261'
      };
    }
    if (themeName === 'mint') {
      return {
        bg: '#EDF3EE',
        text: '#203328',
        heading: '#15261C',
        accent: '#457356'
      };
    }
    if (themeName === 'paper') {
      return {
        bg: '#F4EFE6',
        text: '#322921',
        heading: '#1E1812',
        accent: '#8C653C'
      };
    }
    if (themeName === 'neutral') {
      return {
        bg: '#1D2128',
        text: '#E0E3E8',
        heading: '#FFFFFF',
        accent: '#B5ADA0'
      };
    }
    if (themeName === 'enchanted-forest') {
      return {
        bg: '#EDF3EE',
        text: '#203328',
        heading: '#15261C',
        accent: '#457356'
      };
    }
    if (themeName === 'clear-sky') {
      return {
        bg: '#FAF7F2',
        text: '#4A342A',
        heading: '#3A2A1E',
        accent: '#9A8472'
      };
    }
    if (themeName === 'wine' || themeName === 'serene-fog') {
      return {
        bg: '#F8F3F5',
        text: '#2D1A23',
        heading: '#25151C',
        accent: '#955B73'
      };
    }
    // mystic-night por defecto — noche profunda (lectura oscura)
    return {
      bg: '#1C2B48',
      text: '#E8ECEF',
      heading: '#FFFFFF',
      accent: '#8EB1D1'
    };
  }
}
