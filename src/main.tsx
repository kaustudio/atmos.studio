import React from 'react';
import { createRoot } from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import './styles/global.css';
// The app core is authored in JSX (a direct port of the design comp's logic).
import PaletteApp from './app/PaletteApp.jsx';

// No StrictMode: the app drives imperative GSAP/WebGL lifecycles from componentDidMount and a
// double-invoked mount would double-build the orbit/universe engines.
createRoot(document.getElementById('root')!).render(
  <>
    <PaletteApp />
    <Analytics />
  </>
);
