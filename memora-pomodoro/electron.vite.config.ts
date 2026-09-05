import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { sceneDefines } from '../build/sceneDefines.js';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const sceneKey = loadEnv(mode, __dirname, 'MEMORA_').MEMORA_SCENE_KEY || process.env.MEMORA_SCENE_KEY;
  const artworkDefines = sceneDefines(sceneKey, process.env.MEMORA_PUBLIC_BUILD === 'true');
  return {
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts'),
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist/preload',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    define: {
      ...artworkDefines,
    },
    root: resolve(__dirname, 'src/renderer'),
    server: {
      port: 3333,
      // Bind IPv4 explicitly: with 'localhost' Vite may listen on IPv6 (::1)
      // while Electron resolves localhost to 127.0.0.1 → ERR_CONNECTION_REFUSED
      // and a blank dev window. Pinning both ends to 127.0.0.1 avoids the mismatch.
      host: '127.0.0.1',
    },
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          overlay: resolve(__dirname, 'src/renderer/overlay.html'),
        },
      },
    },
    resolve: {
      alias: {
        '@renderer': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },
  };
});
