import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { resilientBootPlugin } from './build/resilientBootPlugin.js'

const pomodoroRelease = JSON.parse(
  readFileSync(new URL('./public/pomodoro-version.json', import.meta.url), 'utf8'),
)

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
    define: {
      'import.meta.env.POMODORO_RELEASE': JSON.stringify(pomodoroRelease),
    },
    plugins: [react(), resilientBootPlugin()],
    build: {
      // Stable groups let browsers cache the framework separately from pages.
      // The HTML bootloader uses bounded CDN attempts and same-origin recovery.
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
