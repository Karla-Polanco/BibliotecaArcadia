/**
 * ============================================================================
 * ANNOTATION MANAGER - GESTOR DE RESALTADOS Y SUBRAYADOS CON PERSISTENCIA CFI
 * ============================================================================
 * Maneja la creación, persistencia en IndexedDB y renderizado en epub.js de
 * anotaciones basadas en Canonical Fragment Identifiers (EPUB CFI).
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class AnnotationManager {
  static COLORS = {
    amber:     { bg: 'rgba(255, 195, 77, 0.38)', border: '#FFC34D', name: 'Ámbar Suave' },      // BUTTER YELLOW 4th #FFC34D
    sage:      { bg: 'rgba(143, 181, 119, 0.38)', border: '#8FB577', name: 'Verde Salvia' },   // MATCHA LATTE 4th #8FB577
    slate:     { bg: 'rgba(122, 182, 245, 0.38)', border: '#7AB6F5', name: 'Azul Pizarra' },   // SKY DAYDREAM 4th #7AB6F5
    lavender:  { bg: 'rgba(167, 139, 250, 0.38)', border: '#A78BFA', name: 'Lavanda Tenue' },  // LAVENDER FOG 4th #A78BFA
    rose:      { bg: 'rgba(179, 90, 109, 0.38)', border: '#B35A6D', name: 'Rosa Empolvado' },   // MOODY ROSE 4th #B35A6D (polvo editorial)
    terracotta:{ bg: 'rgba(255, 142, 107, 0.38)', border: '#FF8E6B', name: 'Terracota Cálida' } // PEACH GLOW 4th #FF8E6B
  };

  // Mapa de compatibilidad para anotaciones antiguas (yellow→amber, etc.)
  static LEGACY_COLOR_MAP = {
    yellow: 'amber',
    gold: 'terracotta',
    green: 'sage',
    blue: 'slate',
    purple: 'lavender',
    pink: 'rose'
  };

  constructor() {
    this.rendition = null;
    this.currentBookId = null;
    this.annotations = [];
  }

  /**
   * Conecta el gestor al Rendition activo de epub.js y carga anotaciones del libro.
   * @param {Object} rendition - Instancia de Rendition
   * @param {string} bookId - ID del libro
   */
  async attach(rendition, bookId) {
    this.rendition = rendition;
    this.currentBookId = bookId;
    this.annotations = await this.getAnnotationsForBook(bookId);

    // Re-aplicar todas las anotaciones existentes al cargar o cambiar de sección
    this.applyAllToRendition();

    this.rendition.on('rendered', () => {
      this.applyAllToRendition();
    });
  }

  /**
   * Obtiene las anotaciones del libro desde IndexedDB.
   */
  async getAnnotationsForBook(bookId) {
    try {
      return await dbManager.getByIndex('annotations', 'by_bookId', bookId);
    } catch (e) {
      console.warn('Error al recuperar anotaciones:', e);
      return [];
    }
  }

  /**
   * Aplica las anotaciones cargadas en el motor de epub.js.
   */
  applyAllToRendition() {
    if (!this.rendition || !this.annotations) return;

    this.annotations.forEach(annot => {
      this._renderOnRendition(annot);
    });
  }

  /**
   * Añade un resaltado de texto (Highlight).
   * @param {string} cfiRange - Rango CFI
   * @param {string} text - Texto seleccionado
   * @param {string} color - Nombre del color (yellow, green, blue, purple, orange, pink)
   * @param {string} chapterTitle - Título del capítulo
   */
  async addHighlight(cfiRange, text, color = 'amber', chapterTitle = '') {
    return await this._createAnnotation(cfiRange, text, 'highlight', color, chapterTitle);
  }

  /**
   * Añade un subrayado de texto (Underline).
   * @param {string} cfiRange - Rango CFI
   * @param {string} text - Texto seleccionado
   * @param {string} color - Nombre del color
   * @param {string} chapterTitle - Título del capítulo
   */
  async addUnderline(cfiRange, text, color = 'terracotta', chapterTitle = '') {
    return await this._createAnnotation(cfiRange, text, 'underline', color, chapterTitle);
  }

  /**
   * Crea y almacena una entidad de anotación en IndexedDB y en epub.js.
   * @private
   */
  async _createAnnotation(cfiRange, text, type, color, chapterTitle) {
    if (!this.currentBookId) throw new Error('No hay un libro activo.');

    const annotation = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `annot-${Date.now()}`,
      bookId: this.currentBookId,
      cfiRange: cfiRange,
      text: (text || '').trim(),
      type: type, // 'highlight' o 'underline'
      color: color,
      chapterTitle: chapterTitle || 'Capítulo actual',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // Guardar en IndexedDB
    await dbManager.put('annotations', annotation);
    this.annotations.push(annotation);

    // Renderizar inmediatamente en epub.js
    this._renderOnRendition(annotation);

    appState.notify('annotationAdded', annotation);
    return annotation;
  }

  /**
   * Renderiza la anotación físicamente sobre el texto de epub.js.
   * @private
   */
  _renderOnRendition(annot) {
    if (!this.rendition) return;

    // Resolver color legacy → nuevo
    let colorKey = annot.color;
    if (AnnotationManager.LEGACY_COLOR_MAP[colorKey]) {
      colorKey = AnnotationManager.LEGACY_COLOR_MAP[colorKey];
    }
    const colorConfig = AnnotationManager.COLORS[colorKey] || AnnotationManager.COLORS.amber;

    try {
      if (annot.type === 'underline') {
        this.rendition.annotations.underline(
          annot.cfiRange,
          { id: annot.id },
          () => this.onAnnotationClicked(annot),
          'arcadia-underline',
          { 'stroke': colorConfig.border, 'stroke-width': '2.5px', 'mix-blend-mode': 'multiply' }
        );
      } else {
        this.rendition.annotations.highlight(
          annot.cfiRange,
          { id: annot.id },
          () => this.onAnnotationClicked(annot),
          'arcadia-highlight',
          { 'fill': colorConfig.bg, 'fill-opacity': '0.95', 'mix-blend-mode': 'multiply' }
        );
      }
    } catch (err) {
      // Si la sección aún no está montada en el DOM de epub.js
    }
  }

  /**
   * Elimina una anotación de IndexedDB y de la vista del lector.
   * @param {string} annotationId - ID de la anotación
   */
  async removeAnnotation(annotationId) {
    const annot = this.annotations.find(a => a.id === annotationId);
    if (!annot) return;

    // Eliminar de IndexedDB
    await dbManager.delete('annotations', annotationId);
    this.annotations = this.annotations.filter(a => a.id !== annotationId);

    // Eliminar del rendition
    if (this.rendition) {
      try {
        this.rendition.annotations.remove(annot.cfiRange, annot.type);
      } catch (e) {}
    }

    appState.notify('annotationRemoved', annotationId);
    return true;
  }

  /**
   * Manejador disparado al hacer clic sobre un texto ya resaltado/subrayado.
   */
  onAnnotationClicked(annot) {
    window.dispatchEvent(new CustomEvent('arcadia:annotation-clicked', {
      detail: { annotation: annot }
    }));
  }

  /**
   * Desconecta el gestor y limpia recursos.
   */
  detach() {
    this.rendition = null;
    this.currentBookId = null;
    this.annotations = [];
  }
}

export const annotationManager = new AnnotationManager();
