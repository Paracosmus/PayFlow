import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-144x144.png', 'icon-192x192.png', 'icon-512x512.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: {
        id: '/PayFlow/',
        name: 'PayFlow',
        short_name: 'PayFlow',
        description: 'Gerenciador de fluxo financeiro pessoal',
        lang: 'pt-BR',
        theme_color: '#059669',
        background_color: '#059669',
        display: 'standalone',
        start_url: '/PayFlow/',
        scope: '/PayFlow/',
        icons: [
          {
            src: '/PayFlow/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
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
        orientation: 'portrait',
        categories: ['finance', 'productivity', 'utilities'],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  base: '/PayFlow/'
})
