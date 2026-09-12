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
   * Comprueba si la aplicación se está ejecutando instalada como PWA.
   * Solo cuenta como instalada si hay señal inequívoca (modo standalone,
   * API de iOS o marca guardada tras instalar). A propósito NO se usa el
   * referrer android-app:// porque los navegadores dentro de otras apps
   * (WhatsApp, Instagram…) también lo envían y ocultarían la descarga.
   * @returns {boolean}
   */
  static isAppInstalled() {
    try {
      if (window.matchMedia) {
        try {
          if (window.matchMedia('(display-mode: standalone)').matches) return true;
        } catch (_) {}
      }
      if (window.navigator && window.navigator.standalone === true) return true;
      try {
        if (localStorage.getItem('arcadia_pwa_installed') === 'true') return true;
      } catch (_) {}
      return false;
    } catch (_) {
      return false;
    }
  }

  /**
   * Muestra los botones "Descargar app" (sidebar y barra móvil) salvo
   * que la app ya esté instalada.
   */
  static syncInstallButtonVisibility() {
    const installed = this.isAppInstalled();
    ['btn-pwa-install', 'btn-pwa-install-mobile'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      if (installed) {
        btn.style.setProperty('display', 'none', 'important');
      } else {
        btn.style.removeProperty('display');
      }
    });
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

    // Permitir abrir siempre el modal informativo / de instalación
    // desde la barra lateral y desde la navegación móvil
    ['btn-pwa-install', 'btn-pwa-install-mobile'].forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;
      this.syncInstallButtonVisibility();
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.promptInstall();
      });
    });
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
