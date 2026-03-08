import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './i18n/i18n.js';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hide global loader after a brief moment to ensure fonts and styles are applied
setTimeout(() => {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.add('hide');
    setTimeout(() => loader.remove(), 600);
  }
}, 500);
