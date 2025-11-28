/**
 * Service Worker Manager
 * Handles registration and communication with service worker
 */

export interface ServiceWorkerConfig {
  enabled?: boolean;
  scope?: string;
  updateInterval?: number;
}

export class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateTimer: any = null;

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      enabled: true,
      scope: '/',
      updateInterval: 60 * 60 * 1000, // 1 hour
      ...config
    };
  }

  /**
   * Check if Service Worker is supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Register service worker
   */
  async register(scriptUrl: string): Promise<ServiceWorkerRegistration | null> {
    if (!this.config.enabled) {
      console.log('[SW Manager] Service Worker disabled by config');
      return null;
    }

    if (!this.isSupported()) {
      console.log('[SW Manager] Service Worker not supported');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register(scriptUrl, {
        scope: this.config.scope
      });

      console.log('[SW Manager] Service Worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        console.log('[SW Manager] New Service Worker found');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW Manager] New Service Worker installed, update available');
            // Notify user about update if needed
          }
        });
      });

      // Set up periodic update checks
      if (this.config.updateInterval && this.config.updateInterval > 0) {
        this.startUpdateChecks();
      }

      return this.registration;
    } catch (error) {
      console.error('[SW Manager] Registration failed:', error);
      return null;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      this.stopUpdateChecks();
      const success = await this.registration.unregister();
      if (success) {
        console.log('[SW Manager] Service Worker unregistered');
        this.registration = null;
      }
      return success;
    } catch (error) {
      console.error('[SW Manager] Unregistration failed:', error);
      return false;
    }
  }

  /**
   * Start periodic update checks
   */
  private startUpdateChecks(): void {
    if (this.updateTimer) {
      return;
    }

    this.updateTimer = setInterval(() => {
      this.checkForUpdates();
    }, this.config.updateInterval);
  }

  /**
   * Stop periodic update checks
   */
  private stopUpdateChecks(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Manually check for updates
   */
  async checkForUpdates(): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      await this.registration.update();
      console.log('[SW Manager] Update check completed');
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error);
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(type: string, data?: any): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(
        { type, data },
        [messageChannel.port2]
      );
    });
  }

  /**
   * Cache WASM files via service worker
   */
  async cacheWasmFiles(wasmUrl: string, wasmJsUrl: string): Promise<boolean> {
    try {
      const result = await this.sendMessage('CACHE_WASM', { wasmUrl, wasmJsUrl });
      return result.success || false;
    } catch (error) {
      console.error('[SW Manager] Failed to cache WASM files:', error);
      return false;
    }
  }

  /**
   * Clear cache via service worker
   */
  async clearCache(): Promise<boolean> {
    try {
      const result = await this.sendMessage('CLEAR_CACHE');
      return result.success || false;
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Get cache information
   */
  async getCacheInfo(): Promise<any> {
    try {
      const result = await this.sendMessage('GET_CACHE_INFO');
      return result.info || null;
    } catch (error) {
      console.error('[SW Manager] Failed to get cache info:', error);
      return null;
    }
  }

  /**
   * Get registration status
   */
  getStatus(): {
    supported: boolean;
    registered: boolean;
    active: boolean;
  } {
    return {
      supported: this.isSupported(),
      registered: this.registration !== null,
      active: this.registration?.active !== undefined
    };
  }
}

// Singleton instance
let defaultSWManager: ServiceWorkerManager | null = null;

/**
 * Get or create default service worker manager
 */
export function getServiceWorkerManager(config?: ServiceWorkerConfig): ServiceWorkerManager {
  if (!defaultSWManager) {
    defaultSWManager = new ServiceWorkerManager(config);
  }
  return defaultSWManager;
}

/**
 * Reset service worker manager
 */
export function resetServiceWorkerManager(): void {
  defaultSWManager = null;
}
