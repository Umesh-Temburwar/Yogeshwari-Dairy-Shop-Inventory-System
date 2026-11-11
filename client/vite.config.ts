import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2500,
  },
  server: {
    host: true,
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.SERVER_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});

