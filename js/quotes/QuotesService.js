/**
 * ============================================================================
 * QUOTES SERVICE - BANCO Y ROTACIÓN DE FRASES LITERARIAS
 * ============================================================================
 * Sincroniza la frase del banner superior con las frases creadas por el usuario en IndexedDB.
 */

import { QuotesManager } from './QuotesManager.js';
import { appState } from '../state.js';

export class QuotesService {
  constructor() {
    this.quotes = [];
    this.currentIndex = 0;
    this.isReady = false;

    this.defaultPlaceholder = {
      id: 'placeholder',
      text: "«Aún no tienes frases guardadas. ¡Crea tu propia colección de citas literarias y pensamientos favoritos!»",
      author: "Biblioteca Arcadia",
      source: "",
      isPlaceholder: true
    };

    this.initEvents();
  }

  initEvents() {
    appState.subscribe('quoteAdded', async () => {
      await this.reload();
      this.updateBannerDOM();
    });
    appState.subscribe('quoteUpdated', async () => {
      await this.reload();
      this.updateBannerDOM();
    });
    appState.subscribe('quoteDeleted', async () => {
      await this.reload();
      this.updateBannerDOM();
    });
  }

  /**
   * Carga las frases del usuario desde IndexedDB.
   */
  async reload() {
    this.quotes = await QuotesManager.getAllQuotes();
    this.isReady = true;

    // Recuperar índice previamente guardado o ajustar a los límites
    try {
      const savedId = localStorage.getItem('arcadia_active_banner_quote_id');
      if (savedId && this.quotes.length > 0) {
        const foundIdx = this.quotes.findIndex(q => q.id === savedId);
        if (foundIdx !== -1) {
          this.currentIndex = foundIdx;
          return;
        }
      }

      const saved = localStorage.getItem('arcadia_saved_quote_idx');
      if (saved !== null && !isNaN(parseInt(saved)) && parseInt(saved) >= 0 && parseInt(saved) < this.quotes.length) {
        this.currentIndex = parseInt(saved);
      } else {
        this.currentIndex = 0;
      }
    } catch (e) {
      this.currentIndex = 0;
    }
  }

  /**
   * Obtiene la cita actual para el banner.
   */
  getCurrentQuote() {
    if (this.quotes.length === 0) {
      return this.defaultPlaceholder;
    }
    if (this.currentIndex >= this.quotes.length) {
      this.currentIndex = 0;
    }
    return this.quotes[this.currentIndex];
  }

  /**
   * Obtiene la siguiente cita de forma aleatoria/secuencial persistiendo la elección.
   */
  getNextQuote() {
    if (this.quotes.length <= 1) {
      this.currentIndex = 0;
      return this.getCurrentQuote();
    }

    let nextIndex;
    do {
      nextIndex = Math.floor(Math.random() * this.quotes.length);
    } while (nextIndex === this.currentIndex && this.quotes.length > 1);

    this.currentIndex = nextIndex;
    const current = this.quotes[this.currentIndex];

    try {
      localStorage.setItem('arcadia_saved_quote_idx', this.currentIndex.toString());
      if (current && current.id) {
        localStorage.setItem('arcadia_active_banner_quote_id', current.id);
      }
    } catch (e) {}

    return current;
  }

  /**
   * Fija una cita específica para mostrarse en el banner superior.
   * @param {string} quoteId
   */
  setBannerQuote(quoteId) {
    const idx = this.quotes.findIndex(q => q.id === quoteId);
    if (idx !== -1) {
      this.currentIndex = idx;
      try {
        localStorage.setItem('arcadia_saved_quote_idx', this.currentIndex.toString());
        localStorage.setItem('arcadia_active_banner_quote_id', quoteId);
      } catch (e) {}
      this.updateBannerDOM();
    }
  }

  /**
   * Actualiza el DOM del banner superior inmediatamente.
   */
  updateBannerDOM() {
    const quoteTextEl = document.getElementById('quote-text');
    const quoteAuthorEl = document.getElementById('quote-author');
    const quoteSourceEl = document.getElementById('quote-source');

    if (!quoteTextEl || !quoteAuthorEl) return;

    const current = this.getCurrentQuote();
    quoteTextEl.textContent = current.text;
    quoteAuthorEl.textContent = `— ${current.author}`;
    if (quoteSourceEl) {
      quoteSourceEl.textContent = current.source ? ` · ${current.source}` : '';
    }
  }
}
