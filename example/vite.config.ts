import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    allowedHosts: true,
    hmr: {
      overlay: true,
      protocol: 'ws',
      host: 'localhost',
      port: 3000,
    },
    fs: {
      allow: ['..'],
    },
  },
  optimizeDeps: {
    exclude: ['veloqr'],
  },
  assetsInclude: ['**/*.wasm'],
});
