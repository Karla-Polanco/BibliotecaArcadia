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
    terracotta:{ bg: 'rgba(255, 142, 107, 0.38)', border: '#FF8E6B', name: 'Terracota Cálida' }, // PEACH GLOW 4th #FF8E6B
    note:      { bg: 'transparent', border: '#111111', name: 'Nota' }
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

  // Los tres estilos de línea comparten el motor 'underline' de epub.js
  static isUnderlineFamily(type) {
    return type === 'underline' || type === 'strikethrough' || type === 'wavy';
  }

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

    // Migración: notas antiguas sin marca visual -> crear su subrayado negro fino
    try {
      const notes = await dbManager.getByIndex('notes', 'by_bookId', bookId).catch(() => []);
      for (const note of (notes || [])) {
        if (!note || !note.cfiRange) continue;
        const exists = this.annotations.some(a =>
          (a.type === 'note-underline') &&
          (a.noteId === note.id || a.cfiRange === note.cfiRange)
        );
        if (!exists) {
          try {
            await this._createAnnotation(
              note.cfiRange,
              note.selectedText || '',
              'note-underline',
              'note',
              note.title || 'Capítulo 1',
              { noteId: note.id, silent: true }
            );
          } catch (_) {}
        }
      }
    } catch (_) {}

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
   * Añade un subrayado o decoración de texto (Underline, Strikethrough, Wavy).
   * @param {string} cfiRange - Rango CFI
   * @param {string} text - Texto seleccionado
   * @param {string} color - Nombre del color
   * @param {string} chapterTitle - Título del capítulo
   * @param {string} style - Variante: 'underline', 'strikethrough', 'wavy'
   */
  async addUnderline(cfiRange, text, color = 'terracotta', chapterTitle = '', style = 'underline') {
    const annotType = (style === 'strikethrough' || style === 'wavy') ? style : 'underline';
    return await this._createAnnotation(cfiRange, text, annotType, color, chapterTitle);
  }

  /**
   * Crea la marca visual de una nota: subrayado negro, fino (1px).
   * @param {string} cfiRange - Rango CFI del pasaje
   * @param {string} text - Texto seleccionado
   * @param {string} chapterTitle - Título del capítulo
   * @param {string} noteId - ID de la nota vinculada en el store 'notes'
   */
  async addNoteMark(cfiRange, text, chapterTitle = '', noteId = null) {
    return await this._createAnnotation(cfiRange, text, 'note-underline', 'note', chapterTitle, { noteId });
  }

  /**
   * Busca la marca de nota vinculada a un noteId o CFI.
   */
  findNoteMark(noteId, cfiRange) {
    if (!this.annotations) return null;
    return this.annotations.find(a =>
      a.type === 'note-underline' &&
      ((noteId && a.noteId === noteId) || (cfiRange && a.cfiRange === cfiRange))
    ) || null;
  }

  /**
   * Crea y almacena una entidad de anotación en IndexedDB y en epub.js.
   * @private
   */
  async _createAnnotation(cfiRange, text, type, color, chapterTitle, extra = {}) {
    if (!this.currentBookId) throw new Error('No hay un libro activo.');

    const annotation = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `annot-${Date.now()}`,
      bookId: this.currentBookId,
      cfiRange: cfiRange,
      text: (text || '').trim(),
      type: type, // 'highlight', 'underline', 'strikethrough', 'wavy', 'note-underline'
      color: color,
      chapterTitle: chapterTitle || 'Capítulo 1',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (extra && extra.noteId) {
      annotation.noteId = extra.noteId;
    }

    // Guardar en IndexedDB
    await dbManager.put('annotations', annotation);
    this.annotations.push(annotation);

    // Renderizar inmediatamente en epub.js
    this._renderOnRendition(annotation);

    if (!extra || !extra.silent) {
      appState.notify('annotationAdded', annotation);
    }
    return annotation;
  }

  /**
   * Renderiza la anotación físicamente sobre el texto de epub.js.
   * @private
   */
  _renderOnRendition(annot) {
    if (!this.rendition) return;

    // Resolver color legacy → nuevo.
    // 'note' (negro) es exclusivo de note-underline: si un resaltado o
    // subrayado normal lo trae (paleta antigua), degradar a ámbar/terracota.
    let colorKey = annot.color;
    if (AnnotationManager.LEGACY_COLOR_MAP[colorKey]) {
      colorKey = AnnotationManager.LEGACY_COLOR_MAP[colorKey];
    }
    if (colorKey === 'note' && annot.type !== 'note-underline') {
      colorKey = annot.type === 'highlight' ? 'amber' : 'terracotta';
    }
    const colorConfig = AnnotationManager.COLORS[colorKey] || AnnotationManager.COLORS.amber;

    try {
      if (annot.type === 'note-underline') {
        // Marca de nota: línea fina (1px) del color del texto.
        // En temas claros el texto es casi negro; en temas oscuros es
        // marfil/ámbar claro, así la línea siempre contrasta sin cambiar JS
        // al cambiar de tema (currentColor se re-resuelve solo).
        this.rendition.annotations.underline(
          annot.cfiRange,
          { id: annot.id },
          () => this.onAnnotationClicked(annot),
          'arcadia-note-underline',
          { 'stroke': 'currentColor', 'stroke-width': '1px', 'stroke-opacity': '1', 'mix-blend-mode': 'normal', 'fill': 'none' }
        );
      } else if (annot.type === 'underline' || annot.type === 'strikethrough' || annot.type === 'wavy') {
        const className = annot.type === 'strikethrough' ? 'arcadia-strikethrough' :
                          (annot.type === 'wavy' ? 'arcadia-wavy-underline' : 'arcadia-underline');
        this.rendition.annotations.underline(
          annot.cfiRange,
          { id: annot.id },
          () => this.onAnnotationClicked(annot),
          className,
          // Opacidad total y mezcla normal: los valores por defecto de epub.js
          // (opacidad 0.3 y multiply) lavarían el color sobre fondos oscuros
          { 'stroke': colorConfig.border, 'stroke-width': '2.5px', 'stroke-opacity': '1', 'mix-blend-mode': 'normal', 'fill': 'none' }
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
   * Desancla el overlay de TODAS las vistas vivas del rendition.
   * Necesario porque en scroll continuo epub.js recicla vistas y el
   * sectionIndex guardado al crear ya no coincide: el remove() oficial
   * no encuentra la marca y el subrayado queda fantasma hasta recargar.
   * @private
   */
  _detachFromAllViews(cfiRange) {
    try {
      const views = this.rendition && typeof this.rendition.views === 'function'
        ? this.rendition.views()
        : [];
      const list = Array.isArray(views) ? views : Array.from(views || []);
      list.forEach(v => {
        try { v && typeof v.unhighlight === 'function' && v.unhighlight(cfiRange); } catch (_) {}
        try { v && typeof v.ununderline === 'function' && v.ununderline(cfiRange); } catch (_) {}
      });
    } catch (_) {}
  }

  /**
   * Elimina directamente los elementos DOM/SVG del lector para la anotación especificada.
   * @private
   */
  _removeDomElements(annot) {
    if (!annot) return;
    try {
      const searchKeys = [annot.id, annot.cfiRange].filter(Boolean);

      const removeNodesInDoc = (doc) => {
        if (!doc) return;
        searchKeys.forEach(key => {
          try {
            const byId = doc.getElementById(key);
            if (byId) byId.remove();
          } catch (_) {}

          try {
            const els = doc.querySelectorAll(`[data-id="${CSS.escape(key)}"], [data-cfi="${CSS.escape(key)}"], [id="${CSS.escape(key)}"]`);
            els.forEach(el => el.remove());
          } catch (_) {
            try {
              const all = doc.querySelectorAll('[data-id], [data-cfi], [id]');
              all.forEach(el => {
                if (el.getAttribute('data-id') === key || el.getAttribute('data-cfi') === key || el.id === key) {
                  el.remove();
                }
              });
            } catch (_) {}
          }
        });
      };

      // Limpiar en iframe contents de epub.js
      const contents = this.rendition && typeof this.rendition.getContents === 'function'
        ? this.rendition.getContents()
        : [];
      const contentList = Array.isArray(contents) ? contents : Array.from(contents || []);
      contentList.forEach(content => {
        if (content && content.document) {
          removeNodesInDoc(content.document);
        }
      });

      // Limpiar en documento principal (#reader-content y SVG overlays)
      removeNodesInDoc(document);
    } catch (e) {
      console.warn('[AnnotationManager] Aviso limpiando nodos DOM:', e);
    }
  }

  /**
   * Elimina una anotación de IndexedDB y de la vista del lector inmediatamente.
   * @param {string} annotationId - ID de la anotación
   */
  async removeAnnotation(annotationId) {
    const annot = this.annotations.find(a => a.id === annotationId);
    if (!annot) {
      // Ni siquiera en memoria: intentar al menos borrar de DB por si acaso
      try { await dbManager.delete('annotations', annotationId); } catch (_) {}
      appState.notify('annotationRemoved', annotationId);
      return false;
    }

    // 1. Eliminar de IndexedDB y del mapa en memoria
    await dbManager.delete('annotations', annotationId);
    this.annotations = this.annotations.filter(a => a.id !== annotationId);

    // 2. Eliminar del rendition de epub.js (vía oficial + desanclado de vistas + remoción de nodos DOM)
    if (this.rendition) {
      try {
        this.rendition.annotations.remove(annot.cfiRange, 'highlight');
      } catch (e) {}
      try {
        this.rendition.annotations.remove(annot.cfiRange, 'underline');
      } catch (e) {}
      try {
        if (annot.type && annot.type !== 'highlight' && annot.type !== 'underline') {
          this.rendition.annotations.remove(annot.cfiRange, annot.type);
        }
      } catch (e) {}

      this._detachFromAllViews(annot.cfiRange);
      this._removeDomElements(annot);
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
