/**
 * ============================================================================
 * PWA MANAGER - REGISTRO DE SERVICE WORKER, MODO OFFLINE E INSTALACIÓN
 * ============================================================================
 * Maneja el registro y ciclo de vida del Service Worker, la detección
 * reactiva del estado de red (online/offline), el prompt de instalación PWA
 * y el ocultamiento inteligente del botón de descarga si la app ya está instalada.
 */

import { Toast } from '../ui/Toast.js';
import { Modal } from '../ui/Modal.js';

export class PWAManager {
  static deferredPrompt = null;

  static init() {
    this.registerServiceWorker();
    this.initNetworkListeners();
    this.initInstallPrompt();
    this.syncInstallButtonVisibility();
  }

  /**
   * Comprueba si la aplicación se está ejecutando instalada como PWA o si ya fue instalada.
   * @returns {boolean}
   */
  static isAppInstalled() {
    const isStandalone = (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://') ||
      localStorage.getItem('arcadia_pwa_installed') === 'true'
    );
    return isStandalone;
  }

  /**
   * Oculta el botón "Descargar app" en la barra lateral si la app ya está instalada.
   */
  static syncInstallButtonVisibility() {
    const installBtn = document.getElementById('btn-pwa-install');
    if (!installBtn) return;

    if (this.isAppInstalled()) {
      installBtn.style.setProperty('display', 'none', 'important');
    } else {
      installBtn.style.display = 'flex';
    }
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
      this.syncInstallButtonVisibility();
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      try {
        localStorage.setItem('arcadia_pwa_installed', 'true');
      } catch (_) {}
      this.syncInstallButtonVisibility();
      Toast.success('¡Biblioteca Arcadia instalada con éxito en tu dispositivo!');
    });

    // Escuchar si cambia el modo de visualización a standalone
    try {
      const matchMediaStandalone = window.matchMedia('(display-mode: standalone)');
      if (matchMediaStandalone.addEventListener) {
        matchMediaStandalone.addEventListener('change', () => this.syncInstallButtonVisibility());
      }
    } catch (_) {}

    // Permitir abrir siempre el modal informativo / de instalación desde la barra lateral
    const installBtn = document.getElementById('btn-pwa-install');
    if (installBtn) {
      this.syncInstallButtonVisibility();
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
        try {
          localStorage.setItem('arcadia_pwa_installed', 'true');
        } catch (_) {}
        this.syncInstallButtonVisibility();
      }
    });
  }
}
