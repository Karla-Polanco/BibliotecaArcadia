/**
 * ============================================================================
 * APP STATE - STORE REACTIVO CENTRALIZADO (PUB/SUB)
 * ============================================================================
 * Maneja el estado global de la interfaz sin acoplamiento a frameworks.
 */

export class AppState {
  constructor() {
    this.state = {
      activeView: 'library',       // 'library', 'current', 'favorites', 'annotations', 'vocabulary', 'settings'
      activeFilter: 'all',         // 'all', 'to_read', 'reading', 'completed', 'favorites'
      viewMode: localStorage.getItem('arcadia_view_mode') || 'grid', // 'grid' | 'list'
      sortBy: 'recent',            // 'recent', 'title', 'author', 'progress'
      searchQuery: '',
      currentReadingId: 'book-1',  // ID del libro en lectura activa
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
   */
  set(key, value) {
    if (this.state[key] === value) return;
    this.state[key] = value;

    if (key === 'viewMode') {
      localStorage.setItem('arcadia_view_mode', value);
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
