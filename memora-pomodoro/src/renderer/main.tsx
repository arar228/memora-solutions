import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// Outfit font from @fontsource (Vite bundles woff2 automatically)
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
