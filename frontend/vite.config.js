/**
 * vite.config.js
 * Responsabilidad : Configuración de Vite — plugins, alias, code splitting y proxy de desarrollo.
 * Depende de      : @vitejs/plugin-react
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    target: 'esnext',
    sourcemap: false,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 800,

    rollupOptions: {
      output: {
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',
        entryFileNames:  'assets/[name]-[hash].js',

        manualChunks(id) {
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) return 'vendor-router';
          if (id.includes('node_modules/sonner'))        return 'vendor-sonner';
          if (id.includes('node_modules/xlsx'))             return 'vendor-export';
          if (id.includes('node_modules/axios'))         return 'vendor-http';
        },
      },
    },
  },
});
