/**
 * ============================================================================
 * QUOTES MANAGER - GESTOR DE FRASES Y CITAS LITERARIAS EN INDEXEDDB
 * ============================================================================
 * Maneja el almacenamiento persistente, creación, edición, eliminación y
 * marcado de favoritas de las citas del usuario en IndexedDB.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class QuotesManager {
  /**
   * Obtiene todas las frases guardadas por el usuario.
   * @returns {Promise<Array>} Lista de citas
   */
  static async getAllQuotes() {
    try {
      const quotes = await dbManager.getAll('quotes');
      return (quotes || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (err) {
      console.warn('Error al obtener citas de IndexedDB:', err);
      return [];
    }
  }

  /**
   * Obtiene una cita por su ID.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async getQuoteById(id) {
    try {
      return await dbManager.get('quotes', id);
    } catch (e) {
      return null;
    }
  }

  /**
   * Guarda una nueva frase creada por el usuario.
   * @param {Object} data - { text, author, source, favorite }
   * @returns {Promise<Object>} Cita creada
   */
  static async addQuote({ text, author, source, favorite = false }) {
    if (!text || !text.trim()) {
      throw new Error('El texto de la frase es obligatorio.');
    }

    const cleanText = text.trim();
    const cleanAuthor = (author && author.trim()) ? author.trim() : 'Anónimo';
    const cleanSource = (source && source.trim()) ? source.trim() : '';

    const newQuote = {
      id: 'quote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: cleanText.startsWith('«') ? cleanText : `«${cleanText}»`,
      author: cleanAuthor,
      source: cleanSource,
      favorite: !!favorite,
      createdAt: Date.now()
    };

    await dbManager.put('quotes', newQuote);
    appState.notify('quoteAdded', newQuote);
    return newQuote;
  }

  /**
   * Actualiza una frase existente.
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>} Cita actualizada
   */
  static async updateQuote(id, data) {
    const existing = await this.getQuoteById(id);
    if (!existing) {
      throw new Error('No se encontró la frase especificada.');
    }

    const updated = {
      ...existing,
      ...data,
      text: data.text !== undefined ? (data.text.trim().startsWith('«') ? data.text.trim() : `«${data.text.trim()}»`) : existing.text,
      author: data.author !== undefined ? (data.author.trim() || 'Anónimo') : existing.author,
      source: data.source !== undefined ? data.source.trim() : existing.source,
      updatedAt: Date.now()
    };

    await dbManager.put('quotes', updated);
    appState.notify('quoteUpdated', updated);
    return updated;
  }

  /**
   * Elimina una frase.
   * @param {string} id
   */
  static async deleteQuote(id) {
    await dbManager.delete('quotes', id);
    appState.notify('quoteDeleted', { id });
  }

  /**
   * Alterna el estado de favorita de una frase.
   * @param {string} id
   * @returns {Promise<boolean>} Nuevo estado de favorita
   */
  static async toggleFavorite(id) {
    const quote = await this.getQuoteById(id);
    if (!quote) return false;

    quote.favorite = !quote.favorite;
    await dbManager.put('quotes', quote);
    appState.notify('quoteUpdated', quote);
    return quote.favorite;
  }
}
