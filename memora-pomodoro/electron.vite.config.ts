import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { randomBytes } from 'node:crypto';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  const sceneKey = loadEnv(mode, __dirname, 'MEMORA_').MEMORA_SCENE_KEY || process.env.MEMORA_SCENE_KEY;
  if (!sceneKey) throw new Error('MEMORA_SCENE_KEY is required (use .env.local or a protected build secret).');
  const sceneKeyBytes = Buffer.from(sceneKey, 'base64');
  if (sceneKeyBytes.length !== 32) throw new Error('MEMORA_SCENE_KEY must decode to 32 bytes.');
  const sceneKeyMask = randomBytes(32);
  const sceneKeyMasked = Buffer.from(sceneKeyBytes.map((byte, index) => byte ^ sceneKeyMask[index]));
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
      __MEMORA_SCENE_KEY_A__: JSON.stringify(sceneKeyMask.toString('base64')),
      __MEMORA_SCENE_KEY_B__: JSON.stringify(sceneKeyMasked.toString('base64')),
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
