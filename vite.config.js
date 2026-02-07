import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['**/*.png', '**/*.svg'],
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html'
      },
      manifest: {
        name: 'PayFlow - Gerenciador Financeiro',
        short_name: 'PayFlow',
        description: 'Gerenciador de fluxo financeiro pessoal',
        theme_color: '#059669',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/PayFlow/',
        scope: '/PayFlow/',
        id: '/PayFlow/',
        orientation: 'portrait-primary',
        icons: [
          {
            src: '/PayFlow/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/PayFlow/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/PayFlow/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: '/PayFlow/screenshot-mobile.png',
            sizes: '1024x1024',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Dashboard Mobile'
          },
          {
            src: '/PayFlow/screenshot-desktop.png',
            sizes: '1024x1024',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Dashboard Desktop'
          }
        ],
        categories: ['finance', 'productivity', 'utilities']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        navigateFallback: '/PayFlow/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  base: '/PayFlow/'
})
