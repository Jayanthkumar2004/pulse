import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase': ['@supabase/supabase-js'],
          'motion': ['framer-motion'],
          'query': ['@tanstack/react-query'],
          'forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'utils': ['date-fns', 'date-fns-tz', 'react-hot-toast', 'lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
