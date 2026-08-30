/**
 * ============================================================================
 * NOTE MANAGER - GESTOR DE NOTAS ASOCIADAS Y LIBRES
 * ============================================================================
 * Maneja notas vinculadas a selecciones de texto (CFI) y notas independientes
 * de libro con persistencia completa en el store 'notes' de IndexedDB.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class NoteManager {
  /**
   * Obtiene todas las notas asociadas a un libro.
   * @param {string} bookId - ID del libro
   */
  static async getNotesForBook(bookId) {
    try {
      return await dbManager.getByIndex('notes', 'by_bookId', bookId);
    } catch (e) {
      console.warn('Error al obtener notas:', e);
      return [];
    }
  }

  /**
   * Obtiene todas las notas registradas en la biblioteca.
   */
  static async getAllNotes() {
    try {
      return await dbManager.getAll('notes');
    } catch (e) {
      return [];
    }
  }

  /**
   * Crea una nota vinculada a una selección de texto o una nota libre.
   * @param {Object} data - Datos de la nota
   */
  static async createNote({ bookId, cfiRange = null, selectedText = '', title = '', content = '', color = 'yellow' }) {
    if (!bookId) throw new Error('Se requiere bookId para registrar una nota.');
    if (!content.trim() && !title.trim()) throw new Error('La nota no puede estar vacía.');

    const note = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `note-${Date.now()}`,
      bookId,
      cfiRange,
      selectedText: (selectedText || '').trim(),
      title: (title || '').trim() || (selectedText ? selectedText.substring(0, 40) + '...' : 'Nota de lectura'),
      content: content.trim(),
      color: color || 'yellow',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dbManager.put('notes', note);
    appState.notify('noteAdded', note);
    return note;
  }

  /**
   * Actualiza una nota existente.
   */
  static async updateNote(noteId, updates) {
    const existing = await dbManager.get('notes', noteId);
    if (!existing) throw new Error('Nota no encontrada.');

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await dbManager.put('notes', updated);
    appState.notify('noteUpdated', updated);
    return updated;
  }

  /**
   * Elimina una nota por su ID.
   */
  static async deleteNote(noteId) {
    await dbManager.delete('notes', noteId);
    appState.notify('noteDeleted', noteId);
    return true;
  }
}
