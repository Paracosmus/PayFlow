import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.webp', 'icon-512x512.webp'],
      manifest: {
        name: 'PayFlow',
        short_name: 'PayFlow',
        description: 'Gerenciador de fluxo financeiro pessoal',
        theme_color: '#1a1a2e',
        background_color: '#1a1a2e',
        display: 'standalone',
        start_url: '/PayFlow/',
        scope: '/PayFlow/',
        icons: [
          {
            src: 'icon-192x192.webp',
            sizes: '192x192',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.webp',
            sizes: '512x512',
            type: 'image/webp',
            purpose: 'any'
          },
          {
            src: 'icon-512x512.webp',
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
