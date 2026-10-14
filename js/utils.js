/**
 * ============================================================================
 * UTILS - FUNCIONES DE UTILIDAD GENERALES DE ARCADIA
 * ============================================================================
 * Sanitización de cadenas, escape HTML/atributos y funciones auxiliares.
 */

/**
 * Escapa caracteres especiales de HTML para prevenir inyección XSS.
 * @param {string|number|null|undefined} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escapa valores para ser insertados con seguridad en atributos HTML.
 * @param {string|number|null|undefined} text
 * @returns {string}
 */
export function escapeAttr(text) {
  return escapeHtml(text);
}

/**
 * Limita la frecuencia de ejecución de una función (debounce).
 * @param {Function} fn
 * @param {number} delay
 * @returns {Function}
 */
export function debounce(fn, delay = 150) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Formatea un tamaño en bytes a formato legible (KB, MB, GB).
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Normaliza nombres de temas antiguos a su equivalente actual.
 * Fuente única de verdad para la migración retrocompatible de temas.
 * NOTA: el script inline de index.html mantiene su propia copia porque
 * se ejecuta antes de que los módulos estén disponibles (evita flash).
 * @param {string} t - Nombre de tema guardado
 * @returns {string} Nombre de tema normalizado
 */
export function normalizeThemeName(t) {
  if (t === 'cerulean-light' || t === 'boreal-blue' || t === 'navy-summit') t = 'navy-white';
  if (t === 'lavender-light' || t === 'twilight-lavender' || t === 'plum') t = 'amethyst-ivory';
  if (t === 'clear-sky' || t === 'classic-ivory' || t === 'cozy-brown') t = 'sepia-coffee';
  if (t === 'enchanted-forest' || t === 'mint' || t === 'olive-green' || t === 'sage-cream') t = 'olive-ivory';
  if (t === 'light') t = 'classic-light';
  if (t === 'serene-fog' || t === 'wine-poetry' || t === 'wine' || t === 'antique-pink' || t === 'toasted-ash') t = 'classic-night';
  if (t === 'abyss-dark' || t === 'mystic-night' || t === 'deep-twilight' || t === 'night-ink' || t === 'system') t = 'classic-night';
  if (t === 'noir-silver') t = 'classic-night';
  return t;
}
