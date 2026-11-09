import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
let publicContactEmail='';

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      input: ['index.html','live-portrait.html','google-signin.html'],
    },
  },
  server: {
    allowedHosts: true,
    host: '0.0.0.0',
    port: 5176,
    strictPort: true,
    proxy: {
      '/api/ai-booking': {
        ws: true,
        target: process.env.VITE_AI_BOOKING_PROXY_TARGET || process.env.VITE_BACKEND_PROXY_TARGET || 'https://api.djkhalilnahhat.ca',
        changeOrigin: true,
        configure(proxy) {
          proxy.on('proxyReq', (proxyRequest, request) => {
            if (request.headers.origin === `http://${request.headers.host}` || request.headers.origin === `https://${request.headers.host}`) proxyRequest.removeHeader('origin');
          });
        },
      },
      '/api/player/stems': {
        target: process.env.VITE_STEM_PROXY_TARGET || process.env.VITE_BACKEND_PROXY_TARGET || 'https://api.djkhalilnahhat.ca',
        changeOrigin: true,
      },
      '/api': {
        ws: true,
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'https://api.djkhalilnahhat.ca',
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
  // Prepare background dependencies at startup so opening an encoder or model does not trigger a mid-session reload.
  optimizeDeps: { include: ['@mediapipe/tasks-vision', 'onnxruntime-web', '@breezystack/lamejs'] },
  plugins: [react(), {
    name:'business-contact-metadata',
    configResolved(config){publicContactEmail=config.env.VITE_PUBLIC_CONTACT_EMAIL?.trim()||'';},
    transformIndexHtml(html){return publicContactEmail?html.replace('"email": "bookings@djkhalilnahhat.ca"',`"email": ${JSON.stringify(publicContactEmail)}`):html;},
  }],
});
