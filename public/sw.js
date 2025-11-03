console.log('🔔 SW: Service Worker carregado e aguardando mensagens');

// ========== HANDLER DE MENSAGENS ==========
// Receber comandos do frontend (ex: SHOW_NOTIFICATION)
self.addEventListener('message', (event) => {
  console.log('🔔 SW: Mensagem recebida do frontend', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { payload } = event.data;
    
    console.log('🔔 SW: Preparando para exibir notificação', payload);
    
    // Exibir notificação via Service Worker (funciona em background)
    self.registration.showNotification(payload.title, {
      body: payload.body || '',
      icon: payload.icon || '/favicon.png',
      badge: '/favicon.png',
      tag: payload.tag || 'default-notification',
      requireInteraction: payload.requireInteraction || false,
      vibrate: [200, 100, 200], // Vibração no mobile
      renotify: true, // Permitir re-notificação com mesmo tag
      data: {
        url: payload.url || '/queue' // URL para abrir ao clicar
      }
    }).then(() => {
      console.log('✅ SW: Notificação exibida com sucesso', payload);
      
      // Responder ao frontend confirmando sucesso
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: true });
      }
    }).catch((error) => {
      console.error('❌ SW: Erro ao exibir notificação', error);
      
      // Responder ao frontend com erro
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ success: false, error: error.message });
      }
    });
  }
});

// ========== CLICK NA NOTIFICAÇÃO ==========
// Abrir página /queue quando usuário clicar na notificação
self.addEventListener('notificationclick', (event) => {
  console.log('SW: Notificação clicada');
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/queue';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Verificar se já existe uma aba aberta com a URL desejada
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        // Se não, abrir nova aba
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ========== INSTALL EVENT ==========
self.addEventListener('install', (event) => {
  console.log('SW: Service Worker instalado');
  self.skipWaiting();
});

// ========== ACTIVATE EVENT ==========
self.addEventListener('activate', (event) => {
  console.log('SW: Service Worker ativado');
  event.waitUntil(clients.claim());
});

console.log('SW: Service Worker carregado e pronto');
