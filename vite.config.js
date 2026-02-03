import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-144x144.webp', 'icon-192x192.webp', 'icon-512x512.webp'],
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
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/PayFlow/',
        scope: '/PayFlow/',
        icons: [
          {
            src: '/PayFlow/icon-144x144.webp',
            sizes: '144x144',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: '/PayFlow/icon-192x192.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: '/PayFlow/icon-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: '/PayFlow/icon-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}']
      }
    })
  ],
  base: '/PayFlow/'
})
