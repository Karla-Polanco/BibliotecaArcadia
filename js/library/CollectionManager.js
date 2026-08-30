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
   * Limpia colecciones de prueba residuales y garantiza una biblioteca limpia.
   */
  static async initPresets(books = []) {
    try {
      // Purgar colecciones de prueba
      const testIds = ['col-filosofia', 'col-ficcion', 'col-clasicos'];
      for (const id of testIds) {
        try {
          await dbManager.delete('collections', id);
        } catch (_) {}
      }

      // Purgar relaciones de libros de prueba o de colecciones de prueba
      try {
        const allRels = await dbManager.getAll('book_collections');
        for (const rel of allRels) {
          const isTestCol = testIds.includes(rel.collectionId);
          const isTestBook = rel.bookId && String(rel.bookId).startsWith('book-');
          if (isTestCol || isTestBook) {
            try {
              await dbManager.delete('book_collections', rel.id || [rel.bookId, rel.collectionId]);
            } catch (_) {}
          }
        }
      } catch (_) {}

      return await this.getAllCollections();
    } catch (e) {
      console.warn('Aviso en initPresets de colecciones:', e);
      return [];
    }
  }

  /**
   * Obtiene todas las colecciones creadas por el usuario.
   */
  static async getAllCollections() {
    try {
      const all = await dbManager.getAll('collections');
      // Filtrar cualquier residuo de prueba si existiese
      const testIds = ['col-filosofia', 'col-ficcion', 'col-clasicos'];
      return (all || []).filter(c => !testIds.includes(c.id));
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
   * Elimina una colección y todas sus relaciones con libros en cascada de forma 100% segura.
   */
  static async deleteCollection(id) {
    // 1. Eliminar relaciones asociadas en book_collections
    try {
      const allRels = await dbManager.getAll('book_collections');
      for (const rel of allRels) {
        if (rel.collectionId === id) {
          try {
            await dbManager.delete('book_collections', rel.id || [rel.bookId, rel.collectionId]);
          } catch (_) {}
        }
      }
    } catch (err) {
      console.warn('Aviso limpiando relaciones de colección:', err);
    }

    // 2. Eliminar la colección directamente del store 'collections'
    await dbManager.delete('collections', id);

    // 3. Notificar a toda la aplicación
    appState.notify('collectionDeleted', id);
    return true;
  }

  /**
   * Asocia un libro a una colección (evita duplicados).
   */
  static async addBookToCollection(bookId, collectionId) {
    try {
      const allRels = await dbManager.getAll('book_collections');
      const alreadyLinked = allRels.some(r => r.bookId === bookId && r.collectionId === collectionId);
      if (alreadyLinked) return;

      const rel = {
        id: `${bookId}_${collectionId}`,
        bookId,
        collectionId,
        addedAt: Date.now()
      };

      await dbManager.put('book_collections', rel);
      appState.notify('bookCollectionChanged', { bookId, collectionId });
    } catch (err) {
      console.warn('Error al asociar libro a colección:', err);
    }
  }

  /**
   * Desasocia un libro de una colección.
   */
  static async removeBookFromCollection(bookId, collectionId) {
    try {
      const relId = `${bookId}_${collectionId}`;
      try { await dbManager.delete('book_collections', relId); } catch (_) {}
      try { await dbManager.delete('book_collections', [bookId, collectionId]); } catch (_) {}
      appState.notify('bookCollectionChanged', { bookId, collectionId });
    } catch (err) {
      console.warn('Error al desasociar libro de colección:', err);
    }
  }

  /**
   * Obtiene las colecciones a las que pertenece un libro.
   */
  static async getCollectionsForBook(bookId) {
    try {
      const allRels = await dbManager.getAll('book_collections');
      const colIds = allRels.filter(r => r.bookId === bookId).map(r => r.collectionId);
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
      const allRels = await dbManager.getAll('book_collections');
      const bookIds = allRels.filter(r => r.collectionId === collectionId).map(r => r.bookId);
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
