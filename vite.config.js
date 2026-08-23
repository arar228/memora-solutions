import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resilientBootPlugin } from './build/resilientBootPlugin.js'

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
    plugins: [react(), resilientBootPlugin()],
    build: {
      // Stable groups let browsers cache the framework separately from pages.
      // The HTML bootloader selects the fastest healthy asset origin at runtime.
      assetsDir: 'static',
      modulePreload: false,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            i18n: ['i18next', 'react-i18next'],
            ui: ['lucide-react', 'class-variance-authority', 'clsx', 'tailwind-merge'],
            motion: ['framer-motion'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
    },
  }
})
