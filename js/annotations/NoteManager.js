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
   * Obtiene todas las notas asociadas a un libro específico.
   * @param {string} bookId - ID del libro
   * @returns {Promise<Array<Object>>}
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
   * @returns {Promise<Array<Object>>}
   */
  static async getAllNotes() {
    try {
      return await dbManager.getAll('notes');
    } catch (e) {
      return [];
    }
  }

  /**
   * Crea una nota vinculada a una selección de texto o una nota libre del libro.
   * @param {Object} data
   * @param {string} data.bookId - ID del libro obligatorio
   * @param {string|null} [data.cfiRange=null] - Rango CFI si la nota está anclada a un texto
   * @param {string} [data.selectedText=''] - Fragmento de texto subrayado o seleccionado
   * @param {string} [data.title=''] - Título de la nota o capítulo
   * @param {string} [data.content=''] - Contenido redactado por el usuario
   * @param {string} [data.color='yellow'] - Color distintivo de la nota
   * @returns {Promise<Object>} Nota persistida
   */
  static async createNote({ bookId, cfiRange = null, selectedText = '', title = '', content = '', color = 'yellow' }) {
    if (!bookId) throw new Error('Se requiere bookId para registrar una nota.');
    if (!content.trim() && !title.trim()) throw new Error('La nota no puede estar vacía.');

    const cleanSelected = (selectedText || '').trim();
    const fallbackTitle = cleanSelected
      ? (cleanSelected.length > 40 ? cleanSelected.substring(0, 40).trimEnd() + '…' : cleanSelected)
      : 'Nota de lectura';
    const note = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `note-${Date.now()}`,
      bookId,
      cfiRange,
      selectedText: cleanSelected,
      title: (title || '').trim() || fallbackTitle,
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
   * Actualiza el contenido, título o propiedades de una nota existente.
   * @param {string} noteId - ID de la nota
   * @param {Object} updates - Propiedades a actualizar
   * @returns {Promise<Object>}
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
   * Elimina una nota por su ID de IndexedDB y notifica el cambio.
   * @param {string} noteId - ID de la nota a eliminar
   * @returns {Promise<boolean>}
   */
  static async deleteNote(noteId) {
    await dbManager.delete('notes', noteId);
    appState.notify('noteDeleted', noteId);
    return true;
  }
}
