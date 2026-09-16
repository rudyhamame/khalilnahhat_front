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
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://127.0.0.1:4310',
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
});
