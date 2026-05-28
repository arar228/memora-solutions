import React from 'react';
import ReactDOM from 'react-dom/client';
import CompactOverlay from './components/CompactOverlay';
// Load fonts for overlay
import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CompactOverlay />
  </React.StrictMode>
);
