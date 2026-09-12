/**
 * ============================================================================
 * VOCABULARY MANAGER - GESTOR DE VOCABULARIO Y SÍNTESIS FONÉTICA
 * ============================================================================
 * Maneja el almacenamiento de términos, definiciones locales y remotas,
 * transcripción fonética y pronunciación por voz mediante Web Speech API.
 */

import { dbManager } from '../db.js';
import { appState } from '../state.js';

export class VocabularyManager {
  /** Timeout compatible con Safari antiguo (sin AbortSignal.timeout). */
  static _timeoutSignal(ms) {
    try {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
      }
    } catch (_) {}
    try {
      const ctrl = new AbortController();
      setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, ms);
      return ctrl.signal;
    } catch (_) {
      return undefined;
    }
  }

  // Diccionario local offline de términos literarios y comunes para disponibilidad garantizada
  static LOCAL_DICTIONARY = {
    'arcadia': {
      definition: 'Región imaginaria o real asociada con la paz, la serenidad, la simplicidad y la felicidad idílica de la naturaleza.',
      phonetic: '/arˈka.ðja/',
      lang: 'es'
    },
    'efímero': {
      definition: 'Aquello que tiene una duración muy breve o pasajera en el tiempo.',
      phonetic: '/eˈfi.me.ɾo/',
      lang: 'es'
    },
    'inefable': {
      definition: 'Que no se puede explicar, describir ni expresar con palabras debido a su grandeza o sutileza.',
      phonetic: '/i.neˈfa.βle/',
      lang: 'es'
    },
    'serendipia': {
      definition: 'Hallazgo afortunado, valioso o inesperado que se produce cuando se está buscando otra cosa diferente.',
      phonetic: '/se.ɾenˈdi.pja/',
      lang: 'es'
    },
    'ataraxia': {
      definition: 'Estado de serenidad interior y tranquilidad de ánimo imperturbable frente a las pasiones y deseos.',
      phonetic: '/a.taˈɾak.sja/',
      lang: 'es'
    },
    'soliloquio': {
      definition: 'Discurso o reflexión que realiza una persona consigo misma en voz alta sin esperar respuesta de interlocutor.',
      phonetic: '/so.liˈlo.kjo/',
      lang: 'es'
    },
    'melancolía': {
      definition: 'Estado anímico de tristeza dulce, sosegada y reflexiva nacida de recuerdos o anhelos lejanos.',
      phonetic: '/me.laŋ.koˈli.a/',
      lang: 'es'
    },
    'crepúsculo': {
      definition: 'Claridad que hay desde que raya el día hasta que sale el sol, y especialmente la que permanece tras el ocaso.',
      phonetic: '/kɾeˈpus.ku.lo/',
      lang: 'es'
    }
  };

  /**
   * Inicialización del cuaderno: ya NO se pre-siembran palabras de muestra.
   * Solo se conservan los términos creados por el usuario. Además elimina
   * las palabras heredadas de pre-siembra antigua (ids word-1/2/3) si existen.
   */
  static async initPresets(sampleBookId = 'sample-book') {
    try {
      const existing = await dbManager.getAll('words');
      const legacyIds = ['word-1', 'word-2', 'word-3'];
      for (const w of (existing || [])) {
        if (legacyIds.includes(w.id)) {
          await dbManager.delete('words', w.id);
        }
      }
      return await dbManager.getAll('words');
    } catch (e) {
      console.warn('Error al inicializar vocabulario:', e);
      return [];
    }
  }

  /**
   * Busca la definición de una palabra (diccionario local o API externa con fallback).
   * @param {string} word - Palabra a definir
   * @param {string} lang - Idioma preferido
   */
  static async lookupDefinition(word, lang = 'es') {
    const cleanWord = (word || '').trim().toLowerCase().replace(/[.,;:!?()"«»]/g, '');
    if (!cleanWord) throw new Error('Palabra inválida');

    // 1. Revisar diccionario local offline instantáneo
    if (this.LOCAL_DICTIONARY[cleanWord]) {
      const match = this.LOCAL_DICTIONARY[cleanWord];
      return {
        word: cleanWord,
        definition: match.definition,
        phonetic: match.phonetic,
        source: 'local'
      };
    }

    // 2. Wiktionary: definición real en el idioma pedido
    try {
      if (lang === 'en') {
        const wikiEn = await this._lookupWiktionary(cleanWord, 'en');
        if (wikiEn) {
          return {
            word: cleanWord,
            definition: wikiEn,
            phonetic: this._generateApproximatedPhonetic(cleanWord),
            source: 'wiktionary'
          };
        }
      } else {
        // Español: se parsea el wikitexto (el endpoint de definiciones
        // no existe en es.wiktionary). Nunca se devuelve inglés aquí.
        const wikiEs = await this._lookupWiktionaryES(cleanWord);
        if (wikiEs) {
          return {
            word: cleanWord,
            definition: wikiEs,
            phonetic: this._generateApproximatedPhonetic(cleanWord),
            source: 'wiktionary'
          };
        }
      }
    } catch (err) {
      // Sigue al siguiente origen
    }

    // 3. Si el idioma es inglés, intentar API de diccionario en inglés
    try {
      if (lang === 'en' && navigator.onLine) {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`, {
          signal: this._timeoutSignal(3000)
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data) && data.length > 0) {
            const entry = data[0];
            const phonetic = entry.phonetic || (entry.phonetics && entry.phonetics[0] ? entry.phonetics[0].text : '');
            let def = '';
            if (entry.meanings && entry.meanings[0] && entry.meanings[0].definitions) {
              def = entry.meanings[0].definitions[0].definition || '';
            }
            if (def) {
              return {
                word: cleanWord,
                definition: def,
                phonetic: phonetic || this._generateApproximatedPhonetic(cleanWord),
                source: 'api'
              };
            }
          }
        }
      }
    } catch (err) {
      // Fallback silencioso a estimación léxica
    }

    // 4. Fallback inteligente: estimación morfológica
    return {
      word: cleanWord,
      definition: `Término léxico del texto. Puedes editar esta definición libremente.`,
      phonetic: this._generateApproximatedPhonetic(cleanWord),
      source: 'estimated'
    };
  }

  /**
   * Busca una definición real en Wiktionary (español o inglés).
   * @returns {Promise<string|null>} - Definición en texto plano o null
   * @private
   */
  static async _lookupWiktionary(word, wikiLang) {
    const resp = await fetch(`https://${wikiLang}.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`, {
      signal: this._timeoutSignal(4000)
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const pages = Object.values(data || {});
    for (const entries of pages) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (wikiLang === 'en' && entry.language && !/english/i.test(entry.language)) continue;
        const defs = entry.definitions || [];
        for (const d of defs) {
          const text = this._stripHtml(d.definition || '');
          if (text && text.length > 3 && !/^alternative (form|spelling)/i.test(text)) {
            return text.length > 420 ? text.slice(0, 420).trim() + '…' : text;
          }
        }
      }
    }
    return null;
  }

  /**
   * Busca el significado real en el Wiktionary español parseando el wikitexto
   * (acepciones `;1:` / `#`). Solo devuelve español; si no hay, null.
   * @returns {Promise<string|null>}
   * @private
   */
  static async _lookupWiktionaryES(word) {
    const titles = [word];
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
    if (capitalized !== word) titles.push(capitalized);

    for (const title of titles) {
      let wikitext = null;
      try {
        const resp = await fetch(`https://es.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&origin=*`, {
          signal: this._timeoutSignal(5000)
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        if (data.error || !data.parse || !data.parse.wikitext) continue;
        wikitext = data.parse.wikitext['*'];
      } catch (err) {
        continue;
      }

      // Quedarse solo con la sección de español
      const esMatch = wikitext.match(/^==\s*\{\{lengua\|es\}\}\s*==/m);
      let scope = wikitext;
      if (esMatch) {
        const start = esMatch.index + esMatch[0].length;
        const rest = wikitext.slice(start);
        const nextLang = rest.match(/^==\s*(?!\{\{lengua\|es\}\})[^=\n]+\s*==/m);
        scope = nextLang ? rest.slice(0, nextLang.index) : rest;
      }

      const lines = scope.split('\n');
      for (const line of lines) {
        const m = line.match(/^;\d+\s*:?\s*(.+)$/) || line.match(/^#\s*([^:#*].*)$/);
        if (!m) continue;
        const clean = this._cleanWikitextDef(m[1]);
        if (!clean || clean.length < 20) continue;
        if (/^(Véase|Forma |Grafía |Plural de|Participio|Variante )/i.test(clean)) continue;
        return clean.length > 420 ? clean.slice(0, 420).trim() + '…' : clean;
      }
    }
    return null;
  }

  /**
   * Limpia una acepción en wikitexto a texto plano legible.
   * @private
   */
  static _cleanWikitextDef(raw) {
    let text = String(raw || '');
    for (let i = 0; i < 5; i++) {
      const next = text.replace(/\{\{[^{}]*\}\}/g, ' ');
      if (next === text) break;
      text = next;
    }
    text = text
      .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
      .replace(/\[\[([^\]]+)\]\]/g, '$1')
      .replace(/'''/g, '')
      .replace(/''/g, '');
    const ta = document.createElement('textarea');
    ta.innerHTML = text;
    return (ta.value || '').replace(/\s+([.,;:!?])/g, '$1').replace(/\s+/g, ' ').trim();
  }

  /**
   * Convierte un fragmento HTML en texto plano legible.
   * @private
   */
  static _stripHtml(html) {
    const noTags = String(html || '').replace(/<[^>]*>/g, ' ');
    const ta = document.createElement('textarea');
    ta.innerHTML = noTags;
    return (ta.value || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Guarda una palabra en el cuaderno de vocabulario.
   * Unifica el centinela de libro general en 'general' (legacy 'default' se normaliza al leer).
   */
  static async addWord({ word, contextSentence = '', definition = '', phonetic = '', bookId = '', language = 'es' }) {
    const cleanWord = (word || '').trim().replace(/[.,;:!?()"«»]/g, '');
    if (!cleanWord) throw new Error('Palabra no válida.');

    const now = Date.now();
    const normalizedBookId = (!bookId || bookId === 'default') ? 'general' : bookId;
    const wordEntity = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}`,
      word: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase(),
      contextSentence: (contextSentence || '').trim(),
      definition: (definition || '').trim() || 'Definición pendiente de personalizar.',
      phonetic: phonetic || this._generateApproximatedPhonetic(cleanWord),
      bookId: normalizedBookId,
      language: language || 'es',
      dateAdded: now,
      createdAt: now
    };

    await dbManager.put('words', wordEntity);
    appState.notify('wordAdded', wordEntity);
    return wordEntity;
  }

  /**
   * Obtiene todas las palabras guardadas (normaliza legacy 'default' → 'general').
   */
  static async getAllWords() {
    try {
      const items = await dbManager.getAll('words');
      const normalized = (items || []).map(w => (
        w.bookId === 'default' ? { ...w, bookId: 'general' } : w
      ));
      return normalized.sort((a, b) => ((b.dateAdded ?? b.createdAt ?? 0)) - ((a.dateAdded ?? a.createdAt ?? 0)));
    } catch (e) {
      return [];
    }
  }

  /**
   * Actualiza la definición o datos de una palabra.
   */
  static async updateWord(wordId, updates) {
    const item = await dbManager.get('words', wordId);
    if (!item) return;

    const updated = { ...item, ...updates };
    await dbManager.put('words', updated);
    appState.notify('wordUpdated', updated);
    return updated;
  }

  /**
   * Elimina una palabra del cuaderno.
   */
  static async removeWord(wordId) {
    await dbManager.delete('words', wordId);
    appState.notify('wordRemoved', wordId);
    return true;
  }

  /**
   * Pronuncia la palabra en voz alta usando la Web Speech API nativa.
   * @param {string} word - Texto a pronunciar
   * @param {string} lang - Código de idioma (ej. 'es-ES')
   */
  static speakWord(word, lang = 'es-ES') {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis no está soportado en este navegador.');
      return false;
    }

    try {
      window.speechSynthesis.cancel(); // Detener pronunciación anterior
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = lang;
      utterance.rate = 0.85; // Velocidad pausada y clara
      utterance.pitch = 1.0;

      // Buscar voz en español si está disponible
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith(lang.substring(0, 2)));
      if (esVoice) utterance.voice = esVoice;

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('Error al reproducir síntesis de voz:', err);
      return false;
    }
  }

  /**
   * Genera una transcripción fonética aproximada basada en sílabas.
   * @private
   */
  static _generateApproximatedPhonetic(word) {
    const w = word.toLowerCase();
    return `/${w.replace(/([aeiouáéíóú])([^aeiouáéíóú\s]+)([aeiouáéíóú])/g, '$1.$2$3')}/`;
  }
}
