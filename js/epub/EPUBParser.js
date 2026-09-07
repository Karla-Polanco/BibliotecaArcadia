/**
 * ============================================================================
 * EPUB PARSER - EXTRACCIÓN DE METADATOS Y PORTADA
 * ============================================================================
 * Desempaqueta el contenedor EPUB mediante JSZip y DOMParser nativo sin
 * requerir renderizar el libro completo en memoria.
 */

export class EPUBParser {
  /**
   * Garantiza que la librería JSZip esté disponible en el entorno global.
   * @private
   */
  static async _ensureJSZip() {
    if (window.JSZip) return window.JSZip;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'assets/libs/jszip.min.js';
      script.onload = () => resolve(window.JSZip);
      script.onerror = () => reject(new Error('No se pudo cargar JSZip desde assets/libs/jszip.min.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Procesa un archivo EPUB y extrae sus metadatos y portada.
   * @param {File|Blob} file - Archivo EPUB binario
   * @returns {Promise<Object>} Entidad Libro completa para almacenamiento
   */
  static async parse(file) {
    const JSZip = await this._ensureJSZip();
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Localizar y leer META-INF/container.xml
    const containerFile = zip.file('META-INF/container.xml');
    if (!containerFile) {
      throw new Error('El archivo EPUB no contiene META-INF/container.xml');
    }

    const containerXmlText = await containerFile.async('text');
    const domParser = new DOMParser();
    const containerDoc = domParser.parseFromString(containerXmlText, 'application/xml');

    const rootfileEl = containerDoc.querySelector('rootfile');
    if (!rootfileEl) {
      throw new Error('No se encontró elemento rootfile en container.xml');
    }

    const opfPath = rootfileEl.getAttribute('full-path');
    if (!opfPath) {
      throw new Error('El archivo OPF principal no está especificado en container.xml');
    }

    // 2. Directorio base del OPF dentro del ZIP (ej. "OEBPS/" o "")
    const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    // 3. Leer y parsear el archivo .opf del paquete
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      throw new Error(`No se encontró el archivo OPF en la ruta: ${opfPath}`);
    }

    const opfXmlText = await opfFile.async('text');
    const opfDoc = domParser.parseFromString(opfXmlText, 'application/xml');

    // 4. Extraer Metadatos (con valores seguros de respaldo)
    const title = this._getXmlText(opfDoc, 'title') || file.name.replace(/\.epub$/i, '') || 'Título desconocido';
    const author = this._getXmlText(opfDoc, 'creator') || 'Autor desconocido';
    const description = this._getXmlText(opfDoc, 'description') || '';
    const publisher = this._getXmlText(opfDoc, 'publisher') || 'Publicación independiente';
    const language = this._getXmlText(opfDoc, 'language') || 'es';
    const identifier = this._getXmlText(opfDoc, 'identifier') || '';
    const publicationDate = this._getXmlText(opfDoc, 'date') || new Date().toISOString().split('T')[0];

    // 5. Extraer Portada
    const coverDataUrl = await this._extractCover(zip, opfDoc, opfDir);
    const coverColorDominant = this._generateRandomCoverGradient();

    // 6. Generar UUID único y estructura de entidad
    const bookId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : this._fallbackUUID();

    return {
      id: bookId,
      title: title.trim(),
      author: author.trim(),
      description: description.trim(),
      publisher: publisher.trim(),
      language: language.trim(),
      identifier: identifier.trim(),
      publicationDate: publicationDate.trim(),
      coverDataUrl: coverDataUrl,
      coverColorDominant: coverColorDominant,
      coverGradient: coverColorDominant,
      fileBlob: file,
      fileSize: file.size,
      totalLocations: 0,
      status: 'to_read',
      progress: 0,
      favorite: false,
      addedAt: Date.now(),
      lastReadAt: null,
      isRealEpub: true
    };
  }

  /**
   * Extrae la imagen de portada desde el paquete ZIP.
   * @private
   */
  static async _extractCover(zip, opfDoc, opfDir) {
    try {
      let coverHref = null;

      // Estrategia A: <meta name="cover" content="item-id" />
      const coverMeta = opfDoc.querySelector('metadata > meta[name="cover"]');
      if (coverMeta) {
        const coverId = coverMeta.getAttribute('content');
        if (coverId) {
          const item = opfDoc.querySelector(`manifest > item[id="${coverId}"]`);
          if (item) coverHref = item.getAttribute('href');
        }
      }

      // Estrategia B: <item properties="cover-image" ... /> (EPUB 3)
      if (!coverHref) {
        const item3 = opfDoc.querySelector('manifest > item[properties*="cover-image"]');
        if (item3) coverHref = item3.getAttribute('href');
      }

      // Estrategia C: item con id="cover" o href que contenga "cover"
      if (!coverHref) {
        const itemCover = opfDoc.querySelector('manifest > item[id*="cover" i][media-type^="image/"]');
        if (itemCover) coverHref = itemCover.getAttribute('href');
      }

      if (!coverHref) {
        const anyCover = opfDoc.querySelector('manifest > item[href*="cover" i][media-type^="image/"]');
        if (anyCover) coverHref = anyCover.getAttribute('href');
      }

      if (!coverHref) return null;

      // Normalizar la ruta dentro del ZIP
      const fullCoverPath = this._resolvePath(opfDir, coverHref);
      const coverZipFile = zip.file(fullCoverPath) || zip.file(decodeURIComponent(fullCoverPath));

      if (!coverZipFile) return null;

      // Determinar MIME type
      let mimeType = 'image/jpeg';
      if (fullCoverPath.endsWith('.png')) mimeType = 'image/png';
      else if (fullCoverPath.endsWith('.webp')) mimeType = 'image/webp';
      else if (fullCoverPath.endsWith('.gif')) mimeType = 'image/gif';

      const base64Data = await coverZipFile.async('base64');
      return `data:${mimeType};base64,${base64Data}`;
    } catch (e) {
      console.warn('No se pudo extraer la portada del EPUB:', e);
      return null;
    }
  }

  /**
   * Resuelve rutas relativas dentro de la estructura de carpetas del ZIP.
   * @private
   */
  static _resolvePath(baseDir, relativePath) {
    if (!baseDir) return relativePath;
    const parts = (baseDir + relativePath).split('/');
    const resolved = [];
    for (const p of parts) {
      if (p === '..') {
        resolved.pop();
      } else if (p && p !== '.') {
        resolved.push(p);
      }
    }
    return resolved.join('/');
  }

  /**
   * Obtiene el texto de una etiqueta dentro del namespace dc de Dublín Core.
   * @private
   */
  static _getXmlText(doc, tagName) {
    const el = doc.querySelector(`dc\\:${tagName}, ${tagName}`);
    return el ? el.textContent.trim() : '';
  }

  /**
   * Genera un degradado místico aleatorio para libros sin portada.
   * @private
   */
  static _generateRandomCoverGradient() {
    const gradients = [
      'linear-gradient(135deg, #17113D 0%, #30256F 50%, #368EDC 100%)',
      'linear-gradient(135deg, #30256F 0%, #5B4CC4 60%, #E5A93C 100%)',
      'linear-gradient(135deg, #0F1A30 0%, #253358 60%, #4A5FA5 100%)',
      'linear-gradient(135deg, #181818 0%, #30256F 50%, #5B4CC4 100%)',
      'linear-gradient(135deg, #111111 0%, #17113D 60%, #368EDC 100%)',
      'linear-gradient(135deg, #253358 0%, #5B4CC4 60%, #F5A623 100%)',
      'linear-gradient(135deg, #0B111E 0%, #162238 60%, #368EDC 100%)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
  }

  /**
   * Fallback para generación de UUIDv4 en navegadores antiguos.
   * @private
   */
  static _fallbackUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
