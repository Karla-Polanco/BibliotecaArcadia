/**
 * ============================================================================
 * SEARCH MANAGER - BUSCADOR DE TEXTO COMPLETO DENTRO DEL EPUB
 * ============================================================================
 * Escanea los elementos de spine del libro, localiza coincidencias de texto,
 * extrae fragmentos contextuales (snippets) y devuelve selectores CFI de salto.
 */

import { dbManager } from '../db.js';

export class SearchManager {
  constructor(bookInstance) {
    this.book = bookInstance;
    this.isSearching = false;
  }

  /**
   * Ejecuta una búsqueda de texto completo a lo largo de todos los capítulos del EPUB.
   * @param {string} query - Término de búsqueda
   * @param {number} maxResults - Límite de resultados para rendimiento
   * @returns {Promise<Array<{ cfi: string, excerpt: string, chapterTitle: string }>>}
   */
  async search(query, maxResults = 80) {
    const cleanQuery = (query || '').trim();
    if (!cleanQuery || cleanQuery.length < 2 || !this.book || !this.book.spine) {
      return [];
    }

    this.isSearching = true;
    const allResults = [];
    const spineItems = this.book.spine.spineItems || [];

    // Guardar término en el historial de IndexedDB
    try {
      await dbManager.put('searchHistory', {
        id: `search-${Date.now()}`,
        query: cleanQuery,
        bookId: this.book.package ? (this.book.package.metadata?.identifier || 'book') : 'book',
        searchedAt: Date.now()
      });
    } catch (e) {}

    for (let i = 0; i < spineItems.length; i++) {
      if (!this.isSearching || allResults.length >= maxResults) break;

      const item = spineItems[i];
      try {
        // Cargar sección en memoria
        await item.load(this.book.load.bind(this.book));

        // Obtener título del capítulo para este item
        const chapterTitle = this._findChapterTitle(item.href) || `Sección ${i + 1}`;

        // Ejecutar búsqueda nativa de la sección en epub.js
        let results = [];
        if (typeof item.find === 'function') {
          results = item.find(cleanQuery);
        } else {
          results = this._fallbackFind(item, cleanQuery);
        }

        results.forEach(r => {
          if (allResults.length < maxResults) {
            allResults.push({
              cfi: r.cfi,
              excerpt: (r.excerpt || '').trim(),
              chapterTitle: chapterTitle
            });
          }
        });

        // Descargar sección para liberar memoria
        if (typeof item.unload === 'function') {
          item.unload();
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
   * Búsqueda fallback en el documento si la sección carece de método find propio.
   * @private
   */
  _fallbackFind(item, query) {
    if (!item.document || !item.document.body) return [];
    const text = item.document.body.innerText || item.document.body.textContent || '';
    const results = [];
    let pos = 0;
    const qLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    while ((pos = textLower.indexOf(qLower, pos)) !== -1) {
      const start = Math.max(0, pos - 45);
      const end = Math.min(text.length, pos + query.length + 45);
      const excerpt = '...' + text.substring(start, end).replace(/\s+/g, ' ') + '...';

      results.push({
        cfi: item.cfiBase,
        excerpt: excerpt
      });

      pos += query.length;
      if (results.length > 20) break;
    }
    return results;
  }

  /**
   * Resuelve el nombre del capítulo a partir de la tabla de contenidos.
   * @private
   */
  _findChapterTitle(href) {
    if (!href || !this.book.navigation || !this.book.navigation.toc) return '';
    const cleanHref = href.split('#')[0];

    const searchToc = (items) => {
      for (const it of items) {
        if (it.href && it.href.includes(cleanHref)) {
          return it.label ? it.label.trim() : '';
        }
        if (it.subitems && it.subitems.length > 0) {
          const found = searchToc(it.subitems);
          if (found) return found;
        }
      }
      return '';
    };

    return searchToc(this.book.navigation.toc);
  }
}
