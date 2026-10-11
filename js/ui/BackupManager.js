/**
 * ============================================================================
 * BACKUP MANAGER - COPIA DE SEGURIDAD Y RESTAURACIÓN INTEGRAL
 * ============================================================================
 * Permite a los lectores exportar toda su biblioteca personal (metadatos,
 * notas, citas, vocabulario, colecciones y progreso de lectura) a un archivo
 * JSON seguro y restaurarlo en cualquier momento o dispositivo.
 */

import { dbManager } from '../db.js';
import { Toast } from './Toast.js';
import { Modal } from './Modal.js';
import { normalizeThemeName } from '../utils.js';

export class BackupManager {
  /**
   * Exporta las notas, anotaciones, colecciones, vocabulario y progreso de lectura
   * a un archivo JSON descargable.
   */
  static async exportBackup() {
    try {
      Toast.info('Preparando copia de seguridad...');

      const [
        books,
        progress,
        readerSettings,
        annotations,
        notes,
        collections,
        bookCollections,
        words
      ] = await Promise.all([
        dbManager.getAll('books'),
        dbManager.getAll('readingProgress'),
        dbManager.getAll('readerSettings'),
        dbManager.getAll('annotations'),
        dbManager.getAll('notes'),
        dbManager.getAll('collections'),
        dbManager.getAll('book_collections'),
        dbManager.getAll('words')
      ]);

      const lightweightBooks = books.map(b => {
        const { fileBlob, ...meta } = b;
        return meta;
      });

      const backupData = {
        version: 'arcadia-backup-v1',
        exportedAt: new Date().toISOString(),
        appName: 'Biblioteca Arcadia',
        data: {
          books: lightweightBooks,
          readingProgress: progress,
          readerSettings: readerSettings,
          annotations: annotations,
          notes: notes,
          collections: collections,
          bookCollections: bookCollections,
          words: words,
          appTheme: localStorage.getItem('arcadia_theme') || 'classic-light',
          readerPrefs: localStorage.getItem('arcadia_reader_prefs') || null
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `arcadia-copia-seguridad-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        a.remove();
        URL.revokeObjectURL(url);
      }, 500);

      Toast.success('Copia de seguridad descargada.');
      return true;
    } catch (err) {
      console.error('[BackupManager] Error exportando:', err);
      Toast.error('No se pudo generar la copia de seguridad.');
      return false;
    }
  }

  /**
   * Importa y restaura una copia de seguridad desde un archivo JSON.
   */
  static async importBackup(file) {
    if (!file) return false;

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.version || !backup.data) {
        throw new Error('El archivo no tiene el formato de copia de seguridad de Arcadia.');
      }

      // Los EPUB binarios no viajan en el JSON: solo se restaura lo que
      // pertenezca a libros presentes en este dispositivo. Lo huérfano se omite.
      let existingIds = new Set();
      try {
        const existingBooks = await dbManager.getAll('books').catch(() => []);
        existingIds = new Set((existingBooks || []).map(b => b && b.id).filter(Boolean));
      } catch (_) {}

      const isLegacyWord = (w) => !w || !w.bookId || w.bookId === 'default' || w.bookId === 'general';
      const annots = (backup.data.annotations || []).filter(a => a && existingIds.has(a.bookId));
      const notes = (backup.data.notes || []).filter(n => n && existingIds.has(n.bookId));
      const progress = (backup.data.readingProgress || []).filter(p => p && existingIds.has(p.bookId));
      const words = (backup.data.words || []).filter(w => isLegacyWord(w) || existingIds.has(w.bookId));
      const skipped = (backup.data.annotations?.length || 0) - annots.length
        + (backup.data.notes?.length || 0) - notes.length
        + (backup.data.readingProgress?.length || 0) - progress.length
        + (backup.data.words?.length || 0) - words.length;

      const confirmed = await Modal.confirm({
        title: 'Restaurar copia de seguridad',
        message: `Se importarán:\n• ${notes.length} notas y ${annots.length} subrayados\n• ${backup.data.collections?.length || 0} colecciones\n• ${words.length} términos de vocabulario\n• ${progress.length} progresos de lectura\n\nLos archivos EPUB no están incluidos: reimporta primero tus .epub en este dispositivo.${skipped > 0 ? `\nSe omitirán ${skipped} registros de libros ausentes.` : ''}\n\n¿Deseas continuar?`,
        confirmText: 'Restaurar ahora'
      });

      if (!confirmed) return false;

      Toast.info('Restaurando datos...');

      for (const annot of annots) {
        await dbManager.put('annotations', annot);
      }

      for (const note of notes) {
        await dbManager.put('notes', note);
      }

      if (Array.isArray(backup.data.collections)) {
        for (const col of backup.data.collections) {
          await dbManager.put('collections', col);
        }
      }

      if (Array.isArray(backup.data.bookCollections)) {
        let knownColIds = new Set();
        try {
          const cols = await dbManager.getAll('collections').catch(() => []);
          knownColIds = new Set((cols || []).map(c => c && c.id).filter(Boolean));
        } catch (_) {}
        for (const link of backup.data.bookCollections) {
          if (link && existingIds.has(link.bookId) && knownColIds.has(link.collectionId)) {
            await dbManager.put('book_collections', link);
          }
        }
      }

      for (const prog of progress) {
        await dbManager.put('readingProgress', prog);
      }

      for (const w of words) {
        await dbManager.put('words', w);
      }

      if (backup.data.appTheme) {
        const t = normalizeThemeName(backup.data.appTheme);

        localStorage.setItem('arcadia_theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }

      if (backup.data.readerPrefs) {
        localStorage.setItem('arcadia_reader_prefs', typeof backup.data.readerPrefs === 'string' ? backup.data.readerPrefs : JSON.stringify(backup.data.readerPrefs));
      }

      Toast.success(skipped > 0
        ? `Copia restaurada. ${skipped} registros omitidos (libros ausentes).`
        : '¡Copia de seguridad restaurada con éxito!');
      setTimeout(() => {
        window.location.reload();
      }, 800);

      return true;
    } catch (err) {
      console.error('[BackupManager] Error importando:', err);
      Toast.error('Archivo de copia inválido o corrupto.');
      return false;
    }
  }

  static triggerFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.hidden = true;
    document.body.appendChild(input);

    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        await BackupManager.importBackup(file);
      }
      input.remove();
    });

    input.click();
  }
}
