// Worker Helper - Manages communication with Web Worker
import type { QRCodeResult } from '../types';

export class WorkerHelper {
  private worker: Worker | null = null;
  private workerBlobUrl: string | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  }>();

  async init(workerUrl: string, wasmUrl: string, wasmJsUrl: string): Promise<void> {
    if (this.worker) {
      return;
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Fetch worker code and create Blob URL to bypass CORS restrictions
        let workerBlobUrl: string;
        let isBlobUrl = false;
        try {
          const response = await fetch(workerUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch worker: ${response.status}`);
          }
          const workerCode = await response.text();
          const blob = new Blob([workerCode], { type: 'application/javascript' });
          workerBlobUrl = URL.createObjectURL(blob);
          isBlobUrl = true;
          this.workerBlobUrl = workerBlobUrl;
        } catch (fetchError) {
          // If fetch fails (maybe it's a local URL), try direct worker creation
          console.warn('[WorkerHelper] Failed to fetch worker, trying direct creation:', fetchError);
          workerBlobUrl = workerUrl;
        }

        this.worker = new Worker(workerBlobUrl);

        this.worker.onmessage = (e) => {
          const { type, id, success, results, error } = e.data;

          const pending = this.pendingMessages.get(id);
          if (!pending) return;

          this.pendingMessages.delete(id);

          if (type === 'init-response') {
            if (success) {
              pending.resolve(undefined);
            } else {
              pending.reject(new Error(error || 'Init failed'));
            }
          } else if (type === 'decode-response') {
            pending.resolve(results);
          } else if (type.endsWith('-error')) {
            pending.reject(new Error(error));
          }
        };

        this.worker.onerror = (error) => {
          console.error('[WorkerHelper] Worker error:', error);
          reject(new Error('Worker error: ' + error.message));
        };

        // Initialize WASM in worker
        const id = this.messageId++;
        this.pendingMessages.set(id, { resolve, reject });

        this.worker.postMessage({
          type: 'init',
          id,
          payload: { wasmUrl, wasmJsUrl }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          if (this.pendingMessages.has(id)) {
            this.pendingMessages.delete(id);
            reject(new Error('Worker initialization timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  async decode(imageData: ImageData, options: any): Promise<QRCodeResult[]> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      this.pendingMessages.set(id, { resolve, reject });

      // Transfer ImageData buffer for zero-copy performance
      this.worker!.postMessage({
        type: 'decode',
        id,
        payload: { imageData, ...options }
      }, [imageData.data.buffer]);

      // Timeout after 5 seconds
      setTimeout(() => {
        if (this.pendingMessages.has(id)) {
          this.pendingMessages.delete(id);
          reject(new Error('Decode timeout'));
        }
      }, 5000);
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.postMessage({ type: 'terminate' });
      this.worker.terminate();
      this.worker = null;
    }
    // Cleanup blob URL to prevent memory leak
    if (this.workerBlobUrl) {
      URL.revokeObjectURL(this.workerBlobUrl);
      this.workerBlobUrl = null;
    }
    this.pendingMessages.clear();
  }
}
