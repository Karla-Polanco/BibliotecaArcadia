/**
 * ============================================================================
 * PWA MANAGER - REGISTRO DE SERVICE WORKER, MODO OFFLINE E INSTALACIÓN
 * ============================================================================
 * Maneja el registro y ciclo de vida del Service Worker, la detección
 * reactiva del estado de red (online/offline) y el prompt de instalación PWA.
 */

import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';

export class PWAManager {
  static deferredPrompt = null;

  static init() {
    this.registerServiceWorker();
    this.initNetworkListeners();
    this.initInstallPrompt();
  }

  /**
   * Registra el Service Worker y detecta actualizaciones de la aplicación.
   */
  static registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker no soportado en este navegador.');
      return;
    }

    // Registrar tras la carga completa para no retrasar el inicio de la app
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('./sw.js');
        console.log('[PWA] Service Worker registrado con ámbito:', registration.scope);

        // Detectar si hay una nueva versión esperando ser activada
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              Toast.info('Nueva versión de Arcadia lista. Recarga para disfrutar de las mejoras.');
            }
          };
        };
      } catch (err) {
        console.warn('[PWA] Error al registrar Service Worker:', err);
      }
    });
  }

  /**
   * Monitoriza cambios en el estado de conexión a internet.
   */
  static initNetworkListeners() {
    window.addEventListener('online', () => {
      Toast.success('Conexión a internet restablecida.');
    });

    window.addEventListener('offline', () => {
      Toast.info('Modo sin conexión: tus libros, notas y vocabulario están 100% disponibles.');
    });
  }

  /**
   * Captura el evento beforeinstallprompt para permitir instalación manual.
   */
  static initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevenir el banner automático del navegador
      e.preventDefault();
      this.deferredPrompt = e;
      console.log('[PWA] Evento beforeinstallprompt capturado.');
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      Toast.success('¡Biblioteca Arcadia instalada con éxito en tu dispositivo!');
    });

    // Permitir abrir siempre el modal informativo / de instalación desde la barra lateral
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.promptInstall();
      });
    }
  }

  /**
   * Abre la ventana modal estética para instalar la aplicación o recibir instrucciones.
   */
  static async promptInstall() {
    Modal.showInstallModal(this.deferredPrompt, (outcome) => {
      if (outcome === 'accepted') {
        this.deferredPrompt = null;
      }
    });
  }
}
