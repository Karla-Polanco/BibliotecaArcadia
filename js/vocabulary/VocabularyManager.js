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
   * Pre-siembra inicial de palabras de muestra si el store está vacío.
   */
  static async initPresets(sampleBookId = 'sample-book') {
    try {
      const existing = await dbManager.getAll('words');
      if (existing && existing.length > 0) return existing;

      const initialWords = [
        {
          id: 'word-1',
          word: 'Arcadia',
          contextSentence: 'La Biblioteca Arcadia abre sus puertas a mundos inexplorados.',
          definition: 'Región idílica asociada con la paz, la belleza y la plenitud literaria.',
          phonetic: '/arˈka.ðja/',
          bookId: sampleBookId,
          language: 'es',
          mastered: true,
          dateAdded: Date.now() - 3600000 * 24
        },
        {
          id: 'word-2',
          word: 'Inefable',
          contextSentence: 'Un sentimiento inefable se apoderó de él al contemplar el horizonte.',
          definition: 'Que no puede ser expresado en palabras ordinarias.',
          phonetic: '/i.neˈfa.βle/',
          bookId: sampleBookId,
          language: 'es',
          mastered: false,
          dateAdded: Date.now() - 3600000 * 12
        },
        {
          id: 'word-3',
          word: 'Ataraxia',
          contextSentence: 'Buscaba la ataraxia a través de la lectura sosegada.',
          definition: 'Tranquilidad imperturbable y serenidad del espíritu.',
          phonetic: '/a.taˈɾak.sja/',
          bookId: sampleBookId,
          language: 'es',
          mastered: false,
          dateAdded: Date.now() - 3600000 * 2
        }
      ];

      for (const w of initialWords) {
        await dbManager.put('words', w);
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

    // 2. Si hay conexión, intentar API de diccionario
    try {
      if (navigator.onLine) {
        const resp = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/${lang === 'es' ? 'es' : 'en'}/${encodeURIComponent(cleanWord)}`, {
          signal: AbortSignal.timeout(3000)
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

    // 3. Fallback inteligente: estimación morfológica
    return {
      word: cleanWord,
      definition: `Término léxico del texto. Puedes editar esta definición libremente.`,
      phonetic: this._generateApproximatedPhonetic(cleanWord),
      source: 'estimated'
    };
  }

  /**
   * Guarda una palabra en el cuaderno de vocabulario.
   */
  static async addWord({ word, contextSentence = '', definition = '', phonetic = '', bookId = '', language = 'es' }) {
    const cleanWord = (word || '').trim().replace(/[.,;:!?()"«»]/g, '');
    if (!cleanWord) throw new Error('Palabra no válida.');

    const wordEntity = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `w-${Date.now()}`,
      word: cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase(),
      contextSentence: (contextSentence || '').trim(),
      definition: (definition || '').trim() || 'Definición pendiente de personalizar.',
      phonetic: phonetic || this._generateApproximatedPhonetic(cleanWord),
      bookId: bookId || 'default',
      language: language || 'es',
      mastered: false,
      dateAdded: Date.now()
    };

    await dbManager.put('words', wordEntity);
    appState.notify('wordAdded', wordEntity);
    return wordEntity;
  }

  /**
   * Obtiene todas las palabras guardadas.
   */
  static async getAllWords() {
    try {
      const items = await dbManager.getAll('words');
      return (items || []).sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
    } catch (e) {
      return [];
    }
  }

  /**
   * Alterna el estado de maestría/dominada de una palabra.
   */
  static async toggleMastered(wordId) {
    const item = await dbManager.get('words', wordId);
    if (!item) return;

    item.mastered = !item.mastered;
    await dbManager.put('words', item);
    appState.notify('wordUpdated', item);
    return item.mastered;
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
