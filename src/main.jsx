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

// Hide the global loader after the first paint, not on a fixed timeout.
// Two rAFs guarantee the browser has painted the initial React tree.
const hideLoader = () => {
  const loader = document.getElementById('global-loader');
  if (!loader) return;
  loader.classList.add('hide');
  // Remove from DOM after the CSS fade-out completes; fall back to a timer
  // in case 'transitionend' never fires (e.g. no transition defined).
  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    loader.remove();
  };
  loader.addEventListener('transitionend', remove, { once: true });
  setTimeout(remove, 800);
};

requestAnimationFrame(() => requestAnimationFrame(hideLoader));
