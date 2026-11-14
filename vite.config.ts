import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('tesseract.js')) return 'vendor-ocr';
            if (id.includes('@zxing')) return 'vendor-scanner';
          }
        },
      },
    },
  },
  server: {
    host: true, // Expose to local network (0.0.0.0) so mobile devices can connect
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.SERVER_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

