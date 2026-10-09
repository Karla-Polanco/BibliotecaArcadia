/**
 * ============================================================================
 * LOCATIONS MANAGER - CÁLCULO Y PERSISTENCIA DE UBICACIONES CFI
 * ============================================================================
 * Genera, almacena y recupera el mapa de ubicaciones de epub.js para cálculo
 * exacto de porcentajes y páginas con carga instantánea sin congelar la UI.
 */

import { dbManager } from '../db.js';

export class LocationsManager {
  /**
   * @param {Object} bookInstance - Instancia ePub de epub.js
   * @param {string} bookId - ID del libro en IndexedDB
   */
  constructor(bookInstance, bookId) {
    this.book = bookInstance;
    this.bookId = bookId;
    this.isReady = false;
  }

  /**
   * Inicializa las ubicaciones del libro cargándolas de IndexedDB o generándolas en segundo plano.
   */
  async init() {
    if (!this.book || !this.book.locations) return;

    try {
      // 1. Cargar ubicaciones serializadas si ya fueron calculadas previamente
      const bookData = await dbManager.get('books', this.bookId);
      if (bookData && bookData.cachedLocations) {
        this.book.locations.load(bookData.cachedLocations);
        this.isReady = true;
        return;
      }

      // 2. Si no están cacheadas, generarlas en segundo plano sin congelar la interfaz
      await this.generateAndSave();
    } catch (err) {
      console.warn('Advertencia en LocationsManager.init():', err);
    }
  }

  /**
   * Genera el mapa de ubicaciones CFI (1024 caracteres por bloque) y lo guarda en IndexedDB.
   */
  async generateAndSave() {
    try {
      await this.book.locations.generate(1024);
      const serialized = this.book.locations.save();

      const bookData = await dbManager.get('books', this.bookId);
      if (bookData) {
        bookData.cachedLocations = serialized;
        bookData.totalLocations = this.book.locations.total || 0;
        await dbManager.put('books', bookData);
      }

      this.isReady = true;
    } catch (err) {
      console.warn('No se pudo generar mapa de ubicaciones en segundo plano:', err);
    }
  }

  /**
   * Obtiene el porcentaje de avance (0.0 a 100.0) correspondiente a una posición CFI.
   * @param {string} cfi - Canonical Fragment Identifier
   * @returns {number} Porcentaje redondeado a 1 decimal (ej. 42.5)
   */
  getPercentage(cfi) {
    if (!this.isReady || !cfi || !this.book.locations) return 0;
    try {
      const frac = this.book.locations.percentageFromCfi(cfi);
      if (typeof frac === 'number' && !isNaN(frac)) {
        return Math.min(100, Math.max(0, Math.round(frac * 1000) / 10));
      }
    } catch (e) {
      // Retorna 0 si el CFI aún no está indexado
    }
    return 0;
  }

  /**
   * Calcula el CFI correspondiente a un porcentaje de lectura determinado.
   * @param {number} percentage - Valor entre 0 y 100
   * @returns {string|null}
   */
  getCfiFromPercentage(percentage) {
    if (!this.isReady || !this.book.locations) return null;
    try {
      const frac = Math.max(0, Math.min(1, percentage / 100));
      return this.book.locations.cfiFromPercentage(frac);
    } catch (e) {
      return null;
    }
  }
}
