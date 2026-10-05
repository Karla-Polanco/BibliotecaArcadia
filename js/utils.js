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
