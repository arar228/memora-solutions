import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';

// Web-сборка того же renderer'а: результат кладётся прямо в public/ сайта,
// страница /pomodoro встраивает его во фрейм. Одна кодовая база на десктоп и
// web — правка в renderer видна в обеих версиях после пересборки.
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'));

export default defineConfig({
  root: resolve(__dirname, 'src/web'),
  base: './',
  plugins: [
    react(),
    {
      // Страница /pomodoro читает этот файл и показывает номер и дату версии —
      // одна сборка обновляет и web-копию, и надпись о версии.
      name: 'emit-pomodoro-version',
      closeBundle() {
        writeFileSync(
          resolve(__dirname, '../public/pomodoro-version.json'),
          JSON.stringify({
            version: pkg.version,
            date: new Date().toISOString().slice(0, 10),
          }, null, 2) + '\n',
          'utf8',
        );
      },
    },
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __IS_WEB__: 'true',
  },
  build: {
    outDir: resolve(__dirname, '../public/app/pomodoro'),
    emptyOutDir: true,
    target: 'es2020',
  },
});
