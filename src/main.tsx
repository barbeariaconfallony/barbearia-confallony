import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializePushNotifications } from './utils/notifications-setup'

// Inicializar notificações push para dispositivos móveis
initializePushNotifications();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
