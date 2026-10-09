/**
 * ============================================================================
 * APP STATE - STORE REACTIVO CENTRALIZADO (PUB/SUB)
 * ============================================================================
 * Maneja el estado global de la interfaz sin acoplamiento a frameworks.
 */

/**
 * Lee de forma segura una clave de localStorage con valor de respaldo si falla.
 * @param {string} key
 * @param {*} [fallback=null]
 * @returns {string|null}
 */
function safeGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * Guarda de forma segura una clave en localStorage ignorando errores de cuota o privacidad.
 * @param {string} key
 * @param {string} value
 */
function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

export class AppState {
  constructor() {
    this.state = {
      activeView: 'library',       // Vista activa: 'library', 'current', 'favorites', 'annotations', 'vocabulary', 'settings'
      activeFilter: safeGet('arcadia_active_filter', 'all') || 'all', // Filtro de catálogo: 'all', 'to_read', 'reading', 'completed', 'favorites' o 'collection:ID'
      viewMode: safeGet('arcadia_view_mode', 'grid') || 'grid', // Modo de presentación: 'grid' o 'list'
      sortBy: 'recent',            // Criterio de ordenación: 'recent', 'title', 'author', 'progress'
      searchQuery: '',             // Término de búsqueda textual en biblioteca
      currentReadingId: null,      // ID del libro en lectura activa (null = ninguno)
      selectedTheme: (()=>{
        let t = safeGet('arcadia_theme', 'light') || 'light';
        // Normalización y migración retrocompatible de temas antiguos
        if (t === 'cerulean-light' || t === 'boreal-blue') t = 'navy-summit';
        if (t === 'lavender-light' || t === 'twilight-lavender') t = 'plum';
        if (t === 'clear-sky' || t === 'classic-ivory') t = 'cozy-brown';
        if (t === 'enchanted-forest' || t === 'mint' || t === 'olive-green') t = 'sage-cream';
        if (t === 'serene-fog' || t === 'wine-poetry' || t === 'wine' || t === 'antique-pink' || t === 'toasted-ash') t = 'noir-silver';
        if (t === 'abyss-dark' || t === 'mystic-night' || t === 'deep-twilight' || t === 'night-ink' || t === 'system') t = 'noir-silver';
        return t;
      })()
    };

    // Mapa de suscriptores reactivos: key -> Set<callback>
    this.subscribers = new Map();
  }

  /**
   * Obtiene el valor actual de una clave del estado reactivo.
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    return this.state[key];
  }

  /**
   * Actualiza una propiedad del estado, persiste cambios clave y notifica a suscriptores.
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (this.state[key] === value) return;
    this.state[key] = value;

    // Sincronización persistente en almacenamiento local
    if (key === 'viewMode') {
      safeSet('arcadia_view_mode', value);
    }
    if (key === 'activeFilter') {
      safeSet('arcadia_active_filter', value);
    }
    if (key === 'selectedTheme') {
      safeSet('arcadia_theme', value);
    }

    this.notify(key, value);
  }

  /**
   * Registra un callback que reacciona a cambios de una clave específica.
   * @param {string} key
   * @param {Function} callback - Recibe (nuevoValor, estadoCompleto)
   * @returns {Function} Función para cancelar la suscripción
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
   * Emite la notificación de cambio a todos los observadores registrados.
   * @param {string} key
   * @param {*} value
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

// Instancia singleton compartida en toda la aplicación
export const appState = new AppState();
