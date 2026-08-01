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
    host: '0.0.0.0',
  },
  plugins: [react()],
});
