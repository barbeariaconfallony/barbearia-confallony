import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registrar Service Worker para notificações push
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { type: 'module' })
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration);
        
        // Solicitar permissão para notificações
        if ('Notification' in window && Notification.permission === 'default') {
          console.log('Solicitando permissão para notificações...');
        }
      })
      .catch((error) => {
        console.error('Erro ao registrar Service Worker:', error);
      });
  });
}
