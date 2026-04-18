/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: '한글 Go',
        short_name: '한글 Go',
        description: 'Learn Hangul the fun way',
        theme_color: '#8b5cf6',
        background_color: '#fef3c7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'src/main.tsx',
        'src/App.tsx',
        '**/*.css',
        'dist/**',
        'src/test/**',
        '**/*.d.ts',
        'vite.config.ts',
        'postcss.config.js',
        'tailwind.config.js',
      ],
    },
  },
});
