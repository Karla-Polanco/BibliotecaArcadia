/**
 * ============================================================================
 * BOOKMARK MANAGER - GESTOR DE MARCADORES DE PÁGINA
 * ============================================================================
 * Maneja la creación, persistencia y eliminación de marcadores de posición
 * en el store 'bookmarks' de IndexedDB.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class BookmarkManager {
  /**
   * Obtiene todos los marcadores guardados para un libro.
   * @param {string} bookId - ID del libro
   */
  static async getBookmarksForBook(bookId) {
    try {
      const items = await dbManager.getByIndex('bookmarks', 'by_bookId', bookId);
      return (items || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (e) {
      console.warn('Error al recuperar marcadores:', e);
      return [];
    }
  }

  /**
   * Comprueba si la ubicación actual ya tiene un marcador registrado.
   * @param {string} bookId - ID del libro
   * @param {string} cfi - Posición CFI actual
   */
  static async isBookmarked(bookId, cfi) {
    if (!bookId || !cfi) return null;
    const bookmarks = await this.getBookmarksForBook(bookId);
    // Comparación por CFI o prefijo de sección
    const cleanCfi = cfi.split('!')[1] || cfi;
    return bookmarks.find(b => b.cfi === cfi || (b.cfi && b.cfi.split('!')[1] === cleanCfi)) || null;
  }

  /**
   * Alterna un marcador en la posición actual (agrega o elimina).
   * @param {Object} data - { bookId, cfi, chapterTitle, percentage, textSnippet }
   * @returns {Promise<{ added: boolean, bookmarkId: string }>}
   */
  static async toggleBookmark({ bookId, cfi, chapterTitle, percentage, textSnippet }) {
    if (!bookId || !cfi) throw new Error('Se requiere bookId y cfi para marcar.');

    const existing = await this.isBookmarked(bookId, cfi);
    if (existing) {
      await dbManager.delete('bookmarks', existing.id);
      appState.notify('bookmarkRemoved', { bookId, bookmarkId: existing.id });
      return { added: false, bookmarkId: existing.id };
    }

    const bookmark = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `bm-${Date.now()}`,
      bookId,
      cfi,
      chapterTitle: chapterTitle || 'Página marcada',
      percentage: typeof percentage === 'number' ? percentage : 0,
      textSnippet: (textSnippet || '').trim().substring(0, 120),
      createdAt: Date.now()
    };

    await dbManager.put('bookmarks', bookmark);
    appState.notify('bookmarkAdded', bookmark);
    return { added: true, bookmark };
  }

  /**
   * Elimina un marcador por su ID.
   */
  static async removeBookmark(bookmarkId) {
    await dbManager.delete('bookmarks', bookmarkId);
    appState.notify('bookmarkRemoved', { bookmarkId });
    return true;
  }
}
