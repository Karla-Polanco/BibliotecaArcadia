/**
 * ============================================================================
 * BOOK MANAGER - GESTOR PRINCIPAL DE LIBROS Y PERSISTENCIA
 * ============================================================================
 * Coordina la validación, parseo, inserción en IndexedDB, edición y borrado.
 */

import { dbManager } from '../db.js';
import { EPUBValidator } from '../epub/EPUBValidator.js';
import { EPUBParser } from '../epub/EPUBParser.js';
import { appState } from '../state.js';

export class BookManager {
  constructor(storageWidget = null) {
    this.storageWidget = storageWidget;
    this.books = [];
  }

  /**
   * Inicializa la base de datos y carga únicamente los libros subidos por el usuario.
   * Purga automáticamente cualquier libro ficticio/mock que haya quedado en IndexedDB.
   */
  async init() {
    await dbManager.init();
    let storedBooks = await dbManager.getAll('books');

    // Purgar libros de demostración previos (id con prefijo 'book-' o sin fileBlob)
    const mockBookIds = storedBooks
      .filter(b => (b.id && b.id.startsWith('book-')) || !b.fileBlob)
      .map(b => b.id);

    if (mockBookIds.length > 0) {
      console.log(`✦ Eliminando ${mockBookIds.length} libros de ejemplo de la base de datos local...`);
      for (const id of mockBookIds) {
        await dbManager.delete('books', id);
        await dbManager.delete('readingProgress', id);
        await dbManager.delete('readerSettings', id);
      }
      storedBooks = await dbManager.getAll('books');
    }

    this.books = storedBooks;
    if (this.storageWidget) {
      await this.storageWidget.update();
    }
    return this.books;
  }

  /**
   * Retorna todos los libros disponibles.
   */
  getAllBooks() {
    return this.books;
  }

  /**
   * Obtiene un libro por su ID.
   */
  async getBook(id) {
    return await dbManager.get('books', id);
  }

  /**
   * Importa un archivo EPUB validándolo, parseando metadatos y guardándolo en IndexedDB.
   * @param {File|Blob} file - Archivo EPUB
   * @returns {Promise<Object>} Entidad Libro creada
   */
  async importEpub(file) {
    // 1. Validar integridad y formato
    const validation = await EPUBValidator.validate(file);
    if (!validation.valid) {
      throw new Error(validation.error || 'Archivo EPUB no válido.');
    }

    // 2. Parsear metadatos y extraer portada
    const newBook = await EPUBParser.parse(file);

    // 3. Guardar en IndexedDB
    await dbManager.put('books', newBook);

    // 4. Inicializar registro de progreso por defecto
    await dbManager.put('readingProgress', {
      bookId: newBook.id,
      currentCfi: '',
      chapterHref: '',
      chapterTitle: 'Inicio',
      percentage: 0,
      currentPage: 1,
      totalPages: 1,
      updatedAt: Date.now()
    });

    // 5. Inicializar configuración visual personalizada por libro
    await dbManager.put('readerSettings', {
      bookId: newBook.id,
      fontFamily: 'Literata',
      fontSize: 18,
      fontWeight: 'normal',
      lineHeight: 1.6,
      letterSpacing: 0,
      margins: 'normal',
      contentWidth: 800,
      columns: 1,
      flowMode: 'paginated',
      theme: 'system'
    });

    // 6. Actualizar memoria y cuota de almacenamiento
    this.books.unshift(newBook);
    if (this.storageWidget) {
      await this.storageWidget.update();
    }

    appState.notify('bookAdded', newBook);
    return newBook;
  }

  /**
   * Actualiza propiedades de un libro (ej. título, autor, status).
   */
  async updateBook(id, fields) {
    const book = await dbManager.get('books', id);
    if (!book) throw new Error('Libro no encontrado.');

    const updatedBook = { ...book, ...fields };
    await dbManager.put('books', updatedBook);

    const index = this.books.findIndex(b => b.id === id);
    if (index !== -1) {
      this.books[index] = updatedBook;
    }

    appState.notify('bookUpdated', updatedBook);
    return updatedBook;
  }

  /**
   * Alterna el estado de favorito de un libro.
   */
  async toggleFavorite(id) {
    const book = this.books.find(b => b.id === id);
    if (book) {
      const newFav = !book.favorite;
      return await this.updateBook(id, { favorite: newFav });
    }
  }

  /**
   * Elimina un libro de IndexedDB y purga sus registros relacionales.
   */
  async deleteBook(id) {
    // Eliminar libro
    await dbManager.delete('books', id);

    // Eliminar progreso y ajustes asociados
    try {
      await dbManager.delete('readingProgress', id);
      await dbManager.delete('readerSettings', id);

      // Limpiar anotaciones asociadas
      const annots = await dbManager.getByIndex('annotations', 'by_bookId', id);
      for (const a of annots) {
        await dbManager.delete('annotations', a.id);
      }

      // Limpiar notas asociadas
      const notes = await dbManager.getByIndex('notes', 'by_bookId', id);
      for (const n of notes) {
        await dbManager.delete('notes', n.id);
      }

      // Limpiar marcadores asociados
      const bmarks = await dbManager.getByIndex('bookmarks', 'by_bookId', id);
      for (const bm of bmarks) {
        await dbManager.delete('bookmarks', bm.id);
      }
    } catch (err) {
      console.warn('Advertencia al purgar registros secundarios del libro:', err);
    }

    this.books = this.books.filter(b => b.id !== id);

    if (this.storageWidget) {
      await this.storageWidget.update();
    }

    appState.notify('bookDeleted', id);
    return true;
  }
}
