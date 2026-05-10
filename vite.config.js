import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
          motion: ['framer-motion'],
          'd3-force': ['d3-force'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
