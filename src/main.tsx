import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence extension-related errors (e.g. MetaMask/Ethereum conflicts) that are unrelated to the app
window.addEventListener('error', (event) => {
  if (event.message.includes('ethereum') || event.message.includes('MetaMask') || event.message.includes('property: ethereum')) {
    event.stopImmediatePropagation();
    // Silently ignore
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
