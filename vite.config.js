import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      injectRegister: 'auto',
      registerType: 'autoUpdate',
      includeAssets: ['icon-144x144.png', 'icon-192x192.png', 'icon-512x512.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
      devOptions: {
        enabled: true,
        type: 'module'
      },
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  base: '/PayFlow/'
})
