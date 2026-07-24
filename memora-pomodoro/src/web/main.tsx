// Web-точка входа: подставляем браузерную реализацию window.api и монтируем
// тот же самый App, что и в десктопе.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { webApi } from './api-web';
import App from '../renderer/App';
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import '../renderer/styles/theme.css';

declare global {
  interface Window { __MEMORA_WEB__?: boolean }
}

window.__MEMORA_WEB__ = true;
(window as unknown as { api: typeof webApi }).api = webApi;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
