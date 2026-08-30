/**
 * ============================================================================
 * APP STATE - STORE REACTIVO CENTRALIZADO (PUB/SUB)
 * ============================================================================
 * Maneja el estado global de la interfaz con persistencia de vista y navegación.
 */

export class AppState {
  constructor() {
    this.state = {
      activeView: localStorage.getItem('arcadia_active_view') || 'library',       // 'library', 'reader', 'settings'
      activeFilter: localStorage.getItem('arcadia_active_filter') || 'all',       // 'all', 'to_read', 'reading', 'completed', 'favorites', 'annotations', 'vocabulary', 'col-...'
      viewMode: localStorage.getItem('arcadia_view_mode') || 'grid',              // 'grid' | 'list'
      sortBy: 'recent',            // 'recent', 'title', 'author', 'progress'
      searchQuery: '',
      currentReadingId: localStorage.getItem('arcadia_active_book_id') || 'book-1', // ID del libro en lectura activa
      selectedTheme: localStorage.getItem('arcadia_theme') || 'mystic-night'
    };

    this.subscribers = new Map();
  }

  /**
   * Obtiene un valor del estado.
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Actualiza una propiedad del estado y notifica a los suscriptores.
   * @param {string} key - Clave del estado
   * @param {*} value - Nuevo valor
   * @param {boolean} [forceNotify=false] - Forzar notificación aun si el valor es igual
   */
  set(key, value, forceNotify = false) {
    const isSame = this.state[key] === value;
    if (isSame && !forceNotify) return;

    this.state[key] = value;

    if (key === 'viewMode') {
      localStorage.setItem('arcadia_view_mode', value);
    }
    if (key === 'activeFilter') {
      localStorage.setItem('arcadia_active_filter', value);
      if (this.state.activeView !== 'reader') {
        const hashVal = value === 'all' ? '#library' : `#${value}`;
        try {
          if (window.location.hash !== hashVal) {
            history.replaceState(null, '', hashVal);
          }
        } catch (_) {}
      }
    }
    if (key === 'activeView') {
      localStorage.setItem('arcadia_active_view', value);
    }
    if (key === 'currentReadingId') {
      localStorage.setItem('arcadia_active_book_id', value);
    }

    this.notify(key, value);
  }

  /**
   * Suscribe un callback a cambios de una propiedad específica.
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);

    return () => {
      this.subscribers.get(key).delete(callback);
    };
  }

  /**
   * Notifica a los suscriptores.
   */
  notify(key, value) {
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).forEach(cb => {
        try {
          cb(value, this.state);
        } catch (err) {
          console.error(`Error en suscriptor para ${key}:`, err);
        }
      });
    }
  }
}

// Instancia singleton para toda la aplicación
export const appState = new AppState();
