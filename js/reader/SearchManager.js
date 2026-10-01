/**
 * ============================================================================
 * SEARCH MANAGER - BUSCADOR DE TEXTO COMPLETO DENTRO DEL EPUB
 * ============================================================================
 * Escanea los elementos de spine del libro, localiza coincidencias de texto,
 * extrae fragmentos contextuales (snippets) y devuelve selectores CFI de salto.
 */

import { dbManager } from '../db.js';

export class SearchManager {
  constructor(bookInstance, bookId = null) {
    this.book = bookInstance;
    this.bookId = bookId;
    this.isSearching = false;
  }

  /**
   * Ejecuta una búsqueda de texto completo dentro de un capítulo específico o del libro.
   * @param {string} query - Término de búsqueda
   * @param {number} maxResults - Límite de resultados para rendimiento
   * @param {string|null} targetHref - Href del capítulo actual para limitar la búsqueda al capítulo activo
   * @returns {Promise<Array<{ cfi: string, excerpt: string, chapterTitle: string }>>}
   */
  async search(query, maxResults = 80, targetHref = null) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery || cleanQuery.length < 2 || !this.book || !this.book.spine) {
      return [];
    }

    this.isSearching = true;
    const allResults = [];
    const spine = this.book.spine;
    let spineItems = (spine && (spine.spineItems || spine.items)) || [];

    if (spineItems.length > 0 && typeof spineItems[0].find !== 'function' && typeof spine.get === 'function') {
      const resolved = [];
      for (let k = 0; k < spineItems.length; k++) {
        try {
          const sec = spine.get(k);
          if (sec) resolved.push(sec);
        } catch (_) {}
      }
      if (resolved.length > 0) spineItems = resolved;
    }

    // Si se pasa targetHref, filtrar spineItems para buscar EXCLUSIVAMENTE en el capítulo actual
    if (targetHref) {
      const getFilename = (pathStr) => {
        let clean = String(pathStr || '').split('#')[0].split('?')[0].trim();
        try { clean = decodeURIComponent(clean); } catch (_) {}
        const parts = clean.split('/');
        return parts[parts.length - 1].toLowerCase();
      };
      const targetFile = getFilename(targetHref);
      if (targetFile) {
        const filtered = spineItems.filter(item => getFilename(item.href) === targetFile);
        if (filtered.length > 0) {
          spineItems = filtered;
        }
      }
    }

    // Guardar término en el historial de IndexedDB (con ambos campos para compatibilidad de índices)
    try {
      const now = Date.now();
      await dbManager.put('searchHistory', {
        id: `search-${now}-${Math.random().toString(36).slice(2, 7)}`,
        query: cleanQuery,
        bookId: this.bookId || (this.book.package ? (this.book.package.metadata?.identifier || 'book') : 'book'),
        searchedAt: now,
        timestamp: now
      });
    } catch (e) {}

    for (let i = 0; i < spineItems.length; i++) {
      if (!this.isSearching || allResults.length >= maxResults) break;

      const item = spineItems[i];
      if (!item || typeof item.load !== 'function') continue;
      try {
        // Cargar sección en memoria. Section.load necesita el request del libro
        // (book.load resuelve URLs dentro del ZIP); sin él, this.request es
        // undefined y la carga falla en libros importados como ArrayBuffer.
        if (item.contents && item.document) {
          // Ya cargada (p. ej. capítulo visible): reutilizar sin recargar.
        } else if (typeof this.book.load === 'function') {
          try {
            await item.load(this.book.load.bind(this.book));
          } catch (loadErr) {
            // Reintento sin argumentos por compat con otras versiones
            await item.load();
          }
        } else {
          await item.load();
        }

        // Obtener título del capítulo para este item
        const chapterTitle = this._findChapterTitle(item.href) || `Sección ${i + 1}`;

        // Ejecutar búsqueda nativa de la sección en epub.js
        let results = [];
        if (typeof item.find === 'function') {
          try {
            const raw = await item.find(cleanQuery);
            results = Array.isArray(raw) ? raw : [];
          } catch (findErr) {
            console.warn(`Error en item.find para sección ${i}:`, findErr);
            results = [];
          }
        }
        
        if ((!results || results.length === 0) && item.document) {
          results = this._fallbackFind(item, cleanQuery);
        }

        if (Array.isArray(results)) {
          results.forEach(r => {
            if (allResults.length < maxResults && r && (r.cfi || item.cfiBase)) {
              allResults.push({
                cfi: r.cfi || item.cfiBase,
                excerpt: (r.excerpt || '').trim() || cleanQuery,
                chapterTitle: chapterTitle
              });
            }
          });
        }

        // Descargar sección para liberar memoria (salvo que sea la sección activa)
        if (typeof item.unload === 'function') {
          try { item.unload(); } catch (_) {}
        }
      } catch (err) {
        console.warn(`Error al buscar en sección ${i}:`, err);
      }
    }

    this.isSearching = false;
    return allResults;
  }

  /**
   * Cancela una búsqueda activa en curso.
   */
  cancel() {
    this.isSearching = false;
  }

  /**
   * Búsqueda fallback cuando item.find no devuelve nada.
   * - Funciona con documentos XML/XHTML (sin body/innerText).
   * - Insensible a mayúsculas y tildes.
   * - Intenta generar CFI preciso por rango; si no, usa cfiBase.
   * @private
   */
  _fallbackFind(item, query) {
    const doc = item.document;
    if (!doc) return [];
    // document puede ser XML (XHTML): body/innerText no existen.
    const root = doc.body || doc.documentElement;
    if (!root) return [];
    const norm = (s) => String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const normQuery = norm(query);
    if (!normQuery) return [];
    const results = [];

    // 1) Recorrer nodos de texto para poder crear Rangos → CFI preciso.
    let textNodes = [];
    try {
      const walkerSrc = (doc.createTreeWalker ? doc : document);
      const walker = walkerSrc.createTreeWalker(root, 4 /* NodeFilter.SHOW_TEXT */, null, false);
      let n;
      while ((n = walker.nextNode())) {
        if (n.textContent && n.textContent.trim().length > 0) textNodes.push(n);
      }
    } catch (_) {
      textNodes = [];
    }

    const pushResult = (excerpt, cfi) => {
      results.push({ cfi: cfi || item.cfiBase, excerpt });
    };

    if (textNodes.length > 0) {
      for (const node of textNodes) {
        if (results.length >= 20) break;
        const original = node.textContent || '';
        const searchable = norm(original);
        let from = 0;
        while (true) {
          const hit = searchable.indexOf(normQuery, from);
          if (hit === -1) break;
          const start = Math.max(0, hit - 45);
          const end = Math.min(original.length, hit + query.length + 45);
          const excerpt = '...' + original.substring(start, end).replace(/\s+/g, ' ').trim() + '...';
          let cfi = item.cfiBase;
          try {
            if (typeof doc.createRange === 'function' && typeof item.cfiFromRange === 'function') {
              const range = doc.createRange();
              range.setStart(node, Math.max(0, hit));
              range.setEnd(node, Math.min(original.length, hit + query.length));
              cfi = item.cfiFromRange(range) || item.cfiBase;
            }
          } catch (_) {}
          pushResult(excerpt, cfi);
          from = hit + normQuery.length;
          if (results.length >= 20) break;
        }
      }
      if (results.length > 0) return results;
    }

    // 2) Último recurso: buscar sobre el texto completo del capítulo.
    const fullText = root.textContent || root.innerText || '';
    if (!fullText) return [];
    const fullNorm = norm(fullText);
    let pos = 0;
    while ((pos = fullNorm.indexOf(normQuery, pos)) !== -1) {
      const start = Math.max(0, pos - 45);
      const end = Math.min(fullText.length, pos + query.length + 45);
      const excerpt = '...' + fullText.substring(start, end).replace(/\s+/g, ' ').trim() + '...';
      pushResult(excerpt, item.cfiBase);
      pos += normQuery.length;
      if (results.length >= 20) break;
    }
    return results;
  }

  /**
   * Resuelve el nombre del capítulo a partir de la tabla de contenidos o DOM.
   * Soporta libros de relatos/antologías (ej: "La Asesina y el Lord pirata — Capítulo 1").
   * @private
   */
  _findChapterTitle(href, doc = null) {
    const getFilename = (pathStr) => {
      let clean = String(pathStr || '').split('#')[0].split('?')[0].trim();
      try { clean = decodeURIComponent(clean); } catch (_) {}
      const parts = clean.split('/');
      return parts[parts.length - 1].toLowerCase();
    };

    const cleanPath = (p) => {
      if (!p) return '';
      let str = String(p).split('#')[0].split('?')[0].trim();
      try { str = decodeURIComponent(str); } catch (_) {}
      return str.toLowerCase();
    };

    const cleanFullHref = (p) => {
      if (!p) return '';
      let str = String(p).trim();
      try { str = decodeURIComponent(str); } catch (_) {}
      return str.toLowerCase();
    };

    const targetFile = getFilename(href);
    const targetPath = cleanPath(href);
    const targetFull = cleanFullHref(href);

    // Formatear etiquetas puramente numéricas o romanas ("1", "01", "I" -> "Capítulo 1")
    const formatChapterLabel = (rawLabel) => {
      if (!rawLabel) return '';
      const trimmed = rawLabel.trim();
      if (/^\d+\.?$/.test(trimmed)) {
        return `Capítulo ${parseInt(trimmed, 10)}`;
      }
      if (/^(?=[MDCLXVI])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})\.?$/i.test(trimmed)) {
        return `Capítulo ${trimmed.replace(/\.$/, '')}`;
      }
      return trimmed;
    };

    // 1. Coincidencia Inteligente por la Tabla de Contenidos (TOC)
    // Buscamos de Hijos -> Padre (Leaf-First) para obtener la coincidencia más específica en antologías.
    const toc = (this.book && this.book.navigation && this.book.navigation.toc) || [];
    if (targetFile && toc.length > 0) {
      const searchTocRecursive = (items, parentItem = null) => {
        for (const item of items) {
          if (item.subitems && item.subitems.length > 0) {
            const childResult = searchTocRecursive(item.subitems, item);
            if (childResult) return childResult;
          }

          const itemPath = cleanPath(item.href);
          const itemFile = getFilename(item.href);
          const itemFull = cleanFullHref(item.href);

          const isMatch = (
            (itemFull && targetFull && (itemFull === targetFull || targetFull.endsWith(itemFull))) ||
            (itemPath && targetPath && (itemPath === targetPath || targetPath.endsWith(itemPath) || itemPath.endsWith(targetPath))) ||
            (itemFile && targetFile && itemFile === targetFile)
          );

          if (isMatch) {
            let label = item.label ? formatChapterLabel(item.label) : '';
            const parentLabel = parentItem && parentItem.label ? parentItem.label.trim() : '';

            if (label) {
              if (parentLabel && !parentLabel.toLowerCase().includes('contenido') && !parentLabel.toLowerCase().includes('índice')) {
                if (/^Capítulo\s+\d+/i.test(label) || /^\d+$/.test(item.label?.trim() || '')) {
                  return `${parentLabel} — ${label}`;
                }
              }
              return label;
            }
          }
        }
        return '';
      };

      const foundLabel = searchTocRecursive(toc);
      if (foundLabel) return foundLabel;
    }

    // 2. Extraer del DOM (Combinar relato/parte en h1 + capítulo en h2)
    if (doc) {
      try {
        const h1El = doc.querySelector('h1, .story-title, .relato-titulo, .part-title');
        const chapterEl = doc.querySelector('h2, h3, .chapter-title, .chapter-name, .chapter-number, .capitulo-titulo, .capitulo, [class*="chapter"], [class*="capitulo"]');

        let storyTitle = h1El ? (h1El.textContent || '').replace(/\s+/g, ' ').trim() : '';
        let chapterTitle = chapterEl ? (chapterEl.textContent || '').replace(/\s+/g, ' ').trim() : '';

        if (chapterTitle) {
          chapterTitle = formatChapterLabel(chapterTitle);
        }

        if (storyTitle && chapterTitle && storyTitle !== chapterTitle) {
          if (!/^capítulo/i.test(storyTitle) && storyTitle.length >= 2 && storyTitle.length <= 80) {
            if (/^capítulo/i.test(chapterTitle) || /^\d+$/.test(chapterTitle)) {
              return `${storyTitle} — ${formatChapterLabel(chapterTitle)}`;
            }
          }
        }

        if (chapterTitle && chapterTitle.length >= 1 && chapterTitle.length <= 100) {
          return chapterTitle;
        }

        if (storyTitle && storyTitle.length >= 2 && storyTitle.length <= 100) {
          return formatChapterLabel(storyTitle);
        }

        if (doc.title) {
          const docTitle = (doc.title || '').replace(/\s+/g, ' ').trim();
          if (docTitle && docTitle.length >= 2 && docTitle.length <= 100 && !docTitle.toLowerCase().endsWith('.xhtml') && !docTitle.toLowerCase().endsWith('.html')) {
            return formatChapterLabel(docTitle);
          }
        }
      } catch (_) {}
    }

    // 3. Reconocimiento explícito de páginas preliminares o patrón numérico en nombre de archivo
    if (targetFile) {
      if (targetFile.includes('cover') || targetFile.includes('portada')) return 'Portada';
      if (targetFile.includes('title') || targetFile.includes('titulo')) return 'Página de título';
      if (targetFile.includes('copyright') || targetFile.includes('credito') || targetFile.includes('colophon')) return 'Créditos';
      if (targetFile.includes('dedicat') || targetFile.includes('dedicac')) return 'Dedicatoria';
      if (targetFile.includes('prolog') || targetFile.includes('preface') || targetFile.includes('prefacio')) return 'Prólogo';
      if (targetFile.includes('epilog')) return 'Epílogo';
      if (targetFile.includes('toc') || targetFile.includes('nav') || targetFile.includes('indice')) return 'Tabla de contenidos';

      // Extracción de número de capítulo del nombre de archivo (ej: relato1_cap01.xhtml -> Capítulo 1)
      const fnNumMatch = targetFile.match(/(?:cap|chap|ch|capitulo|capitulo_|_c)[-_]?0*(\d+)/i) || targetFile.match(/[-_]0*(\d+)\.x?html$/i);
      if (fnNumMatch && fnNumMatch[1]) {
        const num = parseInt(fnNumMatch[1], 10);
        if (num > 0) {
          return `Capítulo ${num}`;
        }
      }
    }

    // 4. Calcular el número exacto de capítulo (descontando preliminares)
    const items = (this.book && this.book.spine && (this.book.spine.items || this.book.spine.spineItems)) || [];
    if (href && items.length > 0) {
      const idx = items.findIndex(it => getFilename(it.href) === targetFile);
      if (idx !== -1) {
        const isFrontMatter = (fn) => (
          fn.includes('cover') || fn.includes('portada') ||
          fn.includes('title') || fn.includes('titulo') ||
          fn.includes('copyright') || fn.includes('credito') || fn.includes('colophon') ||
          fn.includes('dedicat') || fn.includes('dedicac') ||
          fn.includes('prolog') || fn.includes('preface') || fn.includes('prefacio') ||
          fn.includes('toc') || fn.includes('nav') || fn.includes('indice') ||
          fn.includes('intro') || fn.includes('presentacion')
        );

        let realChapterCount = 0;
        for (let k = 0; k <= idx; k++) {
          const fn = getFilename(items[k]?.href);
          if (!isFrontMatter(fn)) {
            realChapterCount++;
          }
        }
        if (realChapterCount > 0) {
          return `Capítulo ${realChapterCount}`;
        }
      }
    }

    return 'Portada';
  }
}
