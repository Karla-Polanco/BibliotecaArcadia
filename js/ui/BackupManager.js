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
          appTheme: localStorage.getItem('arcadia_theme') || 'cerulean-light',
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

      const confirmed = await Modal.confirm({
        title: 'Restaurar copia de seguridad',
        message: `Se importarán:\n• ${backup.data.notes?.length || 0} notas y ${backup.data.annotations?.length || 0} subrayados\n• ${backup.data.collections?.length || 0} colecciones\n• ${backup.data.words?.length || 0} términos de vocabulario\n\n¿Deseas continuar?`,
        confirmText: 'Restaurar ahora'
      });

      if (!confirmed) return false;

      Toast.info('Restaurando datos...');

      if (Array.isArray(backup.data.annotations)) {
        for (const annot of backup.data.annotations) {
          await dbManager.put('annotations', annot);
        }
      }

      if (Array.isArray(backup.data.notes)) {
        for (const note of backup.data.notes) {
          await dbManager.put('notes', note);
        }
      }

      if (Array.isArray(backup.data.collections)) {
        for (const col of backup.data.collections) {
          await dbManager.put('collections', col);
        }
      }

      if (Array.isArray(backup.data.bookCollections)) {
        for (const link of backup.data.bookCollections) {
          await dbManager.put('book_collections', link);
        }
      }

      if (Array.isArray(backup.data.readingProgress)) {
        for (const prog of backup.data.readingProgress) {
          await dbManager.put('readingProgress', prog);
        }
      }

      if (Array.isArray(backup.data.words)) {
        for (const w of backup.data.words) {
          await dbManager.put('words', w);
        }
      }

      if (backup.data.appTheme) {
        let t = backup.data.appTheme;
        if (t === 'mystic-night' || t === 'deep-twilight') t = 'cerulean-light';
        if (t === 'wine-poetry') t = 'serene-fog';
        localStorage.setItem('arcadia_theme', t);
        document.documentElement.setAttribute('data-theme', t);
      }

      Toast.success('¡Copia de seguridad restaurada con éxito!');
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
    input.style.display = 'none';
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
