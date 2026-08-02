import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const normalizeBaseUrl = (value) => {
  const trimmed = value?.trim()
  return trimmed ? `${trimmed.replace(/\/+$/, '')}/` : '/'
}

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  const base = command === 'build'
    ? normalizeBaseUrl(process.env.VITE_ASSET_BASE)
    : '/'

  return {
    base,
    plugins: [react()],
    build: {
      // Stable groups let browsers cache the framework separately from pages.
      // VITE_ASSET_BASE may point production assets at the GitHub Pages CDN.
      assetsDir: 'static',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            i18n: ['i18next', 'react-i18next'],
            ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
            three: ['three'],
            gsap: ['gsap'],
            motion: ['framer-motion'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  }
})
