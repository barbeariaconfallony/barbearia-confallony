// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Configuração do Firebase (mesma do projeto)
firebase.initializeApp({
  apiKey: "AIzaSyBIVVXaxM-yPYRELT_ZWgRuT0Kcd5dbp6c",
  authDomain: "barbearia-confallony.firebaseapp.com",
  projectId: "barbearia-confallony",
  storageBucket: "barbearia-confallony.firebasestorage.app",
  messagingSenderId: "206443720437",
  appId: "1:206443720437:web:4d1fcaacbf1958a7711fbc",
  measurementId: "G-K24DQ1FXZ8"
});

const messaging = firebase.messaging();

// Handler para notificações em background (quando app está fechado)
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Notificação recebida em background:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Barbearia Confallony';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Nova notificação',
    icon: '/confallony-logo-icon.png',
    badge: '/favicon.png',
    image: payload.notification?.image || payload.data?.image,
    data: payload.data || {},
    tag: payload.data?.tag || 'default',
    requireInteraction: payload.data?.requireInteraction === 'true',
    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para clique na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notificação clicada:', event);
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Abrir ou focar na janela da aplicação
  const urlToOpen = event.notification.data?.redirectTo 
    ? new URL(event.notification.data.redirectTo, self.location.origin).href
    : new URL('/profile', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não houver janela aberta, abrir uma nova
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
