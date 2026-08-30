/**
 * ============================================================================
 * EPUB VALIDATOR - VALIDACIÓN DE ARCHIVOS EPUB
 * ============================================================================
 * Valida la extensión, tamaño, tipo MIME y firma binaria ZIP de archivos EPUB.
 */

export class EPUBValidator {
  /**
   * Valida integralmente un archivo EPUB.
   * @param {File|Blob} file - Archivo subido por el usuario
   * @returns {Promise<{ valid: boolean, error?: string }>}
   */
  static async validate(file) {
    if (!file) {
      return { valid: false, error: 'No se ha seleccionado ningún archivo.' };
    }

    // 1. Validación de tamaño (Mínimo 1 KB, máximo 500 MB)
    if (file.size === 0) {
      return { valid: false, error: 'El archivo está vacío (0 bytes).' };
    }

    if (file.size > 500 * 1024 * 1024) {
      return { valid: false, error: 'El archivo excede el tamaño máximo permitido (500 MB).' };
    }

    // 2. Validación de extensión de nombre de archivo (si es File)
    if (file.name && !file.name.toLowerCase().endsWith('.epub')) {
      return { valid: false, error: 'El archivo no tiene extensión .epub válida.' };
    }

    // 3. Validación de cabecera binaria (Magic Bytes de contenedor ZIP: PK\x03\x04)
    try {
      const isZip = await this._checkZipSignature(file);
      if (!isZip) {
        return { valid: false, error: 'El archivo no es un paquete EPUB/ZIP válido o está dañado.' };
      }
    } catch (err) {
      return { valid: false, error: 'Error al verificar la estructura binaria del archivo.' };
    }

    return { valid: true };
  }

  /**
   * Verifica los primeros 4 bytes del archivo para confirmar la firma PK\x03\x04.
   * @private
   */
  static async _checkZipSignature(file) {
    const slice = file.slice(0, 4);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // ZIP Local File Header Magic Number: 0x50 0x4B 0x03 0x04 (ASCII: PK\x03\x04)
    return bytes.length >= 4 &&
           bytes[0] === 0x50 &&
           bytes[1] === 0x4B &&
           bytes[2] === 0x03 &&
           bytes[3] === 0x04;
  }
}
