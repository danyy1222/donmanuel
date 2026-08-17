import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import paquete from './package.json' with { type: 'json' }

export default defineConfig({
  // La app necesita saber su propia versión para compararla con la publicada.
  // Se toma de package.json para no tener el número escrito en dos lados.
  define: {
    __VERSION_APP__: JSON.stringify(paquete.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icono.svg'],
      manifest: {
        name: 'Tienda Don Manuel',
        short_name: 'Don Manuel',
        description: 'Punto de venta para verdulería y abarrotes',
        theme_color: '#7e22ce',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
