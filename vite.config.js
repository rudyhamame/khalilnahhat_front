import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: ['index.html', 'services/index.html'],
    },
  },
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5176,
    strictPort: true,
    proxy: {
      '/api/player/stems': {
        target: process.env.VITE_STEM_PROXY_TARGET || 'http://127.0.0.1:4310',
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'https://khalil-api.mctoshs.ca',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest, request) => {
            // /api is same-origin for the browser; this hop is server-to-server.
            // Preserve cross-origin headers so unrelated websites stay rejected.
            const origin = request.headers.origin;
            if (origin === `http://${request.headers.host}` || origin === `https://${request.headers.host}`) {
              proxyRequest.removeHeader('origin');
            }
          });
        },
      },
    },
  },
  preview: { host: '0.0.0.0' },
  plugins: [react()],
});
