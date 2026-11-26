import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Всяка страница на сайта е отделен вход за Vite
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        venue: resolve(import.meta.dirname, 'venue.html'),
        privacy: resolve(import.meta.dirname, 'privacy.html'),
      },
    },
  },
});
