/**
 * ============================================================================
 * COLLECTION MANAGER - GESTOR DE COLECCIONES Y BIBLIOTECA INTELIGENTE
 * ============================================================================
 * Gestiona colecciones personalizadas (estanterías temáticas) y sus relaciones
 * N:M con los libros en los stores 'collections' y 'book_collections'.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class CollectionManager {
  static PRESET_COLORS = [
    { name: 'Púrpura Místico', value: '#5B4CC4' },
    { name: 'Azul Océano', value: '#368EDC' },
    { name: 'Esmeralda', value: '#10B981' },
    { name: 'Ámbar', value: '#F59E0B' },
    { name: 'Rosa Coral', value: '#F43F5E' },
    { name: 'Índigo', value: '#6366F1' }
  ];

  /**
   * Inicializa las colecciones predeterminadas si el store está vacío.
   */
  static async initPresets(books = []) {
    try {
      const existing = await dbManager.getAll('collections');
      if (existing && existing.length > 0) return existing;

      // Crear colecciones predefinidas iniciales
      const presets = [
        {
          id: 'col-filosofia',
          name: 'Filosofía y Pensamiento',
          description: 'Reflexiones fundamentales, ética y cosmovisión.',
          color: '#5B4CC4',
          createdAt: Date.now() - 300000
        },
        {
          id: 'col-ficcion',
          name: 'Ciencia Ficción & Distopía',
          description: 'Universos paralelos, futuro y literatura especulativa.',
          color: '#368EDC',
          createdAt: Date.now() - 200000
        },
        {
          id: 'col-clasicos',
          name: 'Clásicos Universales',
          description: 'Obras maestras de la literatura inmortal.',
          color: '#F59E0B',
          createdAt: Date.now() - 100000
        }
      ];

      for (const col of presets) {
        await dbManager.put('collections', col);
      }

      // Asociar algunos libros si existen
      if (books && books.length >= 6) {
        await this.addBookToCollection(books[0].id, 'col-filosofia');
        await this.addBookToCollection(books[1].id, 'col-filosofia');
        await this.addBookToCollection(books[2].id, 'col-ficcion');
        await this.addBookToCollection(books[3].id, 'col-ficcion');
        await this.addBookToCollection(books[4].id, 'col-clasicos');
        await this.addBookToCollection(books[5].id, 'col-clasicos');
      }

      return await dbManager.getAll('collections');
    } catch (e) {
      console.warn('Error al inicializar colecciones:', e);
      return [];
    }
  }

  /**
   * Obtiene todas las colecciones.
   */
  static async getAllCollections() {
    try {
      return await dbManager.getAll('collections');
    } catch (e) {
      return [];
    }
  }

  /**
   * Crea una nueva colección personalizada.
   */
  static async createCollection(name, description = '', color = '#5B4CC4') {
    if (!name || !name.trim()) throw new Error('El nombre de la colección es obligatorio.');

    const col = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `col-${Date.now()}`,
      name: name.trim(),
      description: (description || '').trim(),
      color: color || '#5B4CC4',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await dbManager.put('collections', col);
    appState.notify('collectionAdded', col);
    return col;
  }

  /**
   * Actualiza los datos de una colección.
   */
  static async updateCollection(id, updates) {
    const existing = await dbManager.get('collections', id);
    if (!existing) throw new Error('Colección no encontrada.');

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };

    await dbManager.put('collections', updated);
    appState.notify('collectionUpdated', updated);
    return updated;
  }

  /**
   * Elimina una colección y todas sus relaciones con libros en cascada.
   */
  static async deleteCollection(id) {
    // 1. Eliminar relaciones en book_collections
    const relations = await dbManager.getByIndex('book_collections', 'by_collectionId', id);
    for (const rel of relations) {
      await dbManager.delete('book_collections', rel.id);
    }

    // 2. Eliminar la colección
    await dbManager.delete('collections', id);
    appState.notify('collectionDeleted', id);
    return true;
  }

  /**
   * Asocia un libro a una colección (evita duplicados).
   */
  static async addBookToCollection(bookId, collectionId) {
    const existingRels = await dbManager.getByIndex('book_collections', 'by_collectionId', collectionId);
    const alreadyLinked = existingRels.some(r => r.bookId === bookId);
    if (alreadyLinked) return;

    const rel = {
      id: `${bookId}_${collectionId}`,
      bookId,
      collectionId,
      addedAt: Date.now()
    };

    await dbManager.put('book_collections', rel);
    appState.notify('bookCollectionChanged', { bookId, collectionId });
  }

  /**
   * Desasocia un libro de una colección.
   */
  static async removeBookFromCollection(bookId, collectionId) {
    const relId = `${bookId}_${collectionId}`;
    await dbManager.delete('book_collections', relId);
    appState.notify('bookCollectionChanged', { bookId, collectionId });
  }

  /**
   * Obtiene las colecciones a las que pertenece un libro.
   */
  static async getCollectionsForBook(bookId) {
    try {
      const rels = await dbManager.getByIndex('book_collections', 'by_bookId', bookId);
      const colIds = rels.map(r => r.collectionId);
      const allCols = await this.getAllCollections();
      return allCols.filter(c => colIds.includes(c.id));
    } catch (e) {
      return [];
    }
  }

  /**
   * Obtiene todos los libros asignados a una colección.
   */
  static async getBooksInCollection(collectionId) {
    try {
      const rels = await dbManager.getByIndex('book_collections', 'by_collectionId', collectionId);
      const bookIds = rels.map(r => r.bookId);
      const allBooks = await dbManager.getAll('books');
      return allBooks.filter(b => bookIds.includes(b.id));
    } catch (e) {
      return [];
    }
  }

  /**
   * Obtiene el número de libros contenidos en cada colección.
   */
  static async getCollectionCounts() {
    try {
      const allRels = await dbManager.getAll('book_collections');
      const counts = {};
      allRels.forEach(r => {
        counts[r.collectionId] = (counts[r.collectionId] || 0) + 1;
      });
      return counts;
    } catch (e) {
      return {};
    }
  }
}
