import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Keep deploy assets in a namespaced directory. Besides making the output
    // clearer, this safely invalidates the old /assets/* responses that were
    // cached incompletely by Cloudflare before the server sent Content-Length.
    assetsDir: 'static',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          motion: ['framer-motion'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
