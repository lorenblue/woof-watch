import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
  plugins: [
    tailwindcss(),
    sveltekit(),
    SvelteKitPWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Woof Watch',
        short_name: 'Woof',
        display: 'standalone',
        start_url: '/',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        icons: [
          {
            src: 'images/pwa-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'images/pwa-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
    })
  ]
});