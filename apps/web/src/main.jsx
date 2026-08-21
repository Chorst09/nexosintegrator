
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/dashboardEffects.css';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';

// Suprime erros de extensões de navegador que usam chrome.runtime.onMessage
// com resposta assíncrona (return true) mas perdem o canal quando a página
// navega. Esses erros não afetam a funcionalidade da aplicação.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  if (
    msg.includes('listener indicated an asynchronous response') ||
    msg.includes('message channel closed') ||
    msg.includes('Extension context invalidated') ||
    msg.includes('The message port closed')
  ) {
    event.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
