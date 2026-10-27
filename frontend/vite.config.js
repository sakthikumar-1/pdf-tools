import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('@fortawesome')) {
              return 'vendor-fontawesome';
            }
            if (id.includes('pdfjs-dist')) {
              return 'vendor-pdfjs';
            }
            if (id.includes('pdf-lib')) {
              return 'vendor-pdflib';
            }
            if (id.includes('xlsx') || id.includes('jszip')) {
              return 'vendor-office';
            }
            if (id.includes('@neslinesli93/qpdf-wasm')) {
              return 'vendor-qpdf';
            }
          }
        },
      },
    },
  },
});
