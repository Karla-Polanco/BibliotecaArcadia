/**
 * ============================================================================
 * DATABASE MANAGER - CAPA UNIFICADA DE ACCESO A INDEXEDDB
 * ============================================================================
 * Maneja transacciones seguras con sintaxis async/await y define todos los
 * object stores e índices según la especificación técnica de la Fase 0.
 */

export class DatabaseManager {
  static DB_NAME = 'ArcadiaEpubDB';
  static DB_VERSION = 2;

  constructor() {
    this.db = null;
    this.isReady = false;
    this._initPromise = null;
  }

  /**
   * Abre o inicializa la base de datos IndexedDB.
   * Retorna una promesa que resuelve con la instancia abierta.
   */
  async init() {
    if (this.db) return this.db;
    if (this._initPromise) return this._initPromise;

    this._initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DatabaseManager.DB_NAME, DatabaseManager.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._setupSchema(db);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.isReady = true;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Error al abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });

    return this._initPromise;
  }

  /**
   * Configura las tiendas de objetos (Object Stores) e índices de la base de datos.
   * @private
   */
  _setupSchema(db) {
    // 1. books (Almacena metadatos y Blob binario del EPUB)
    if (!db.objectStoreNames.contains('books')) {
      const booksStore = db.createObjectStore('books', { keyPath: 'id' });
      booksStore.createIndex('by_title', 'title', { unique: false });
      booksStore.createIndex('by_author', 'author', { unique: false });
      booksStore.createIndex('by_added', 'addedAt', { unique: false });
      booksStore.createIndex('by_lastRead', 'lastReadAt', { unique: false });
      booksStore.createIndex('by_status', 'status', { unique: false });
      booksStore.createIndex('by_favorite', 'favorite', { unique: false });
    }

    // 2. readingProgress (Posición CFI, porcentaje y capítulo actual)
    if (!db.objectStoreNames.contains('readingProgress')) {
      const progressStore = db.createObjectStore('readingProgress', { keyPath: 'bookId' });
      progressStore.createIndex('by_percentage', 'percentage', { unique: false });
      progressStore.createIndex('by_updatedAt', 'updatedAt', { unique: false });
    }

    // 3. readerSettings (Preferencias visuales personalizadas por libro)
    if (!db.objectStoreNames.contains('readerSettings')) {
      db.createObjectStore('readerSettings', { keyPath: 'bookId' });
    }

    // 4. annotations (Resaltados y subrayados basados en CFI)
    if (!db.objectStoreNames.contains('annotations')) {
      const annotStore = db.createObjectStore('annotations', { keyPath: 'id' });
      annotStore.createIndex('by_bookId', 'bookId', { unique: false });
      annotStore.createIndex('by_type', 'type', { unique: false });
      annotStore.createIndex('by_color', 'color', { unique: false });
      annotStore.createIndex('by_createdAt', 'createdAt', { unique: false });
    }

    // 5. notes (Notas asociadas a texto o notas libres)
    if (!db.objectStoreNames.contains('notes')) {
      const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
      notesStore.createIndex('by_bookId', 'bookId', { unique: false });
      notesStore.createIndex('by_cfi', 'cfiRange', { unique: false });
      notesStore.createIndex('by_createdAt', 'createdAt', { unique: false });
    }

    // 6. bookmarks (Marcadores manuales rápidos)
    if (!db.objectStoreNames.contains('bookmarks')) {
      const bookmarksStore = db.createObjectStore('bookmarks', { keyPath: 'id' });
      bookmarksStore.createIndex('by_bookId', 'bookId', { unique: false });
      bookmarksStore.createIndex('by_createdAt', 'createdAt', { unique: false });
    }

    // 7. collections (Colecciones y carpetas)
    if (!db.objectStoreNames.contains('collections')) {
      const colStore = db.createObjectStore('collections', { keyPath: 'id' });
      colStore.createIndex('by_name', 'name', { unique: true });
      colStore.createIndex('by_order', 'orderIndex', { unique: false });
    }

    // 8. book_collections (Tabla intermedia N:M entre libros y colecciones)
    if (!db.objectStoreNames.contains('book_collections')) {
      const bookColStore = db.createObjectStore('book_collections', { keyPath: ['bookId', 'collectionId'] });
      bookColStore.createIndex('by_book', 'bookId', { unique: false });
      bookColStore.createIndex('by_collection', 'collectionId', { unique: false });
    }

    // 9. words (Vocabulario personal y fonética)
    if (!db.objectStoreNames.contains('words')) {
      const wordsStore = db.createObjectStore('words', { keyPath: 'id' });
      wordsStore.createIndex('by_word', 'word', { unique: false });
      wordsStore.createIndex('by_bookId', 'bookId', { unique: false });
      wordsStore.createIndex('by_createdAt', 'createdAt', { unique: false });
    }

    // 10. searchHistory (Historial de búsquedas recientes)
    if (!db.objectStoreNames.contains('searchHistory')) {
      const searchStore = db.createObjectStore('searchHistory', { keyPath: 'id' });
      searchStore.createIndex('by_query', 'query', { unique: false });
      searchStore.createIndex('by_timestamp', 'timestamp', { unique: false });
    }

    // 11. positionHistory (Historial de saltos de posición en lectura)
    if (!db.objectStoreNames.contains('positionHistory')) {
      const posStore = db.createObjectStore('positionHistory', { keyPath: 'id' });
      posStore.createIndex('by_bookId', 'bookId', { unique: false });
      posStore.createIndex('by_timestamp', 'timestamp', { unique: false });
    }

    // 12. quotes (Banco y colección de frases y citas literarias del usuario)
    if (!db.objectStoreNames.contains('quotes')) {
      const quotesStore = db.createObjectStore('quotes', { keyPath: 'id' });
      quotesStore.createIndex('by_author', 'author', { unique: false });
      quotesStore.createIndex('by_favorite', 'favorite', { unique: false });
      quotesStore.createIndex('by_createdAt', 'createdAt', { unique: false });
    }
  }

  /**
   * Obtiene un registro por clave primaria.
   */
  async get(storeName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Obtiene todos los registros de una tienda.
   */
  async getAll(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Inserta o actualiza un registro.
   */
  async put(storeName, value) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Elimina un registro por clave primaria.
   */
  async delete(storeName, key) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Consulta registros utilizando un índice específico.
   */
  async getByIndex(storeName, indexName, queryValue) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(queryValue);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Cuenta la cantidad de registros en una tienda.
   */
  async count(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Limpia todos los registros de una tienda.
   */
  async clear(storeName) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

// Instancia singleton compartida
export const dbManager = new DatabaseManager();
