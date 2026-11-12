import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './theme/base.css';
import { App } from './ui/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Élément racine #root introuvable dans index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
