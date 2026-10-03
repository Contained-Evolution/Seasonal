import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const publishedAssets = ['icon.svg', 'contained-evolution-logo.png', 'downloads/ghost-moon-medium-letter.pdf', 'downloads/ghost-moon-medium-preview.png'];

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'publish-current-seasonal-assets',
      apply: 'build',
      generateBundle() {
        for (const fileName of publishedAssets) this.emitFile({ type: 'asset', fileName, source: readFileSync(new URL(`./public/${fileName}`, import.meta.url)) });
      }
    },
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Seasonal by Contained Evolution',
        short_name: 'Seasonal',
        description: 'Private, accountless seasonal stencil and craft tools.',
        theme_color: '#100704',
        background_color: '#100704',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: { cleanupOutdatedCaches: true, globPatterns: ['**/*.{js,css,html,svg,json}'] }
    })
  ],
  build: { copyPublicDir: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
