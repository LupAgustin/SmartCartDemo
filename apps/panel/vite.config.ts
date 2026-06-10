import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Panel B2B de SmartCart. En dev, las llamadas a /api se proxean al backend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (ruta) => ruta.replace(/^\/api/, ''),
      },
    },
  },
});
