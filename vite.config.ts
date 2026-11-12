import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Grimoire 5e — Fiche de Personnage',
        short_name: 'Grimoire 5e',
        description:
          'Fiche de personnage Donjons & Dragons 5e (2014 & Moderne/Post-Apo) Local-First pour Tablette et PC',
        theme_color: '#f6f3ec',
        background_color: '#f6f3ec',
        display: 'standalone',
        orientation: 'any',
        lang: 'fr',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
});
