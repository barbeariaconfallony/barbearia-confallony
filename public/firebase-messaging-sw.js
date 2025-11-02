// Firebase Messaging Service Worker (v12.1.0 - aligned with main app)
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js');

// Detectar ambiente automaticamente
const currentDomain = self.location.hostname;
console.log('🌐 [FCM SW] Service Worker carregado no domínio:', currentDomain);
console.log('🌐 [FCM SW] URL completa:', self.location.href);

// Configuração do Firebase (mesma do projeto)
const firebaseConfig = {
  apiKey: "AIzaSyBIVVXaxM-yPYRELT_ZWgRuT0Kcd5dbp6c",
  authDomain: "barbearia-confallony.firebaseapp.com",
  projectId: "barbearia-confallony",
  storageBucket: "barbearia-confallony.firebasestorage.app",
  messagingSenderId: "206443720437",
  appId: "1:206443720437:web:4d1fcaacbf1958a7711fbc",
  measurementId: "G-K24DQ1FXZ8"
};

console.log('🔧 [FCM SW] Inicializando Firebase com config:', firebaseConfig);

try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ [FCM SW] Firebase inicializado com sucesso');
} catch (error) {
  console.error('❌ [FCM SW] Erro ao inicializar Firebase:', error);
}

const messaging = firebase.messaging();

// Handler para notificações em background (quando app está fechado/minimizado)
messaging.onBackgroundMessage((payload) => {
  console.log('📩 [FCM Background] Notificação recebida:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'Barbearia Confallony';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Nova notificação',
    icon: '/confallony-logo-icon.png',
    badge: '/favicon.png',
    image: payload.notification?.image || payload.data?.image,
    data: payload.data || {},
    tag: payload.data?.tag || 'default',
    requireInteraction: payload.data?.requireInteraction === 'true',
    
    // Configurações específicas para Android e Desktop
    vibrate: [200, 100, 200], // Padrão de vibração
    silent: false, // Garantir que o som seja reproduzido
    renotify: true, // Notificar novamente se já existe uma com a mesma tag
    timestamp: Date.now(),
    
    // Ações disponíveis na notificação
    actions: [
      {
        action: 'view',
        title: '👀 Ver',
        icon: '/confallony-logo-icon.png'
      },
      {
        action: 'close',
        title: '✖️ Fechar',
        icon: '/favicon.png'
      }
    ]
  };

  console.log('🔔 [FCM Background] Exibindo notificação:', notificationTitle);
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handler para clique na notificação (navegador web e Android)
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ [FCM] Notificação clicada:', event.action, event.notification.tag);
  
  // Fechar a notificação
  event.notification.close();

  // Se o usuário clicou em "Fechar", não fazer nada
  if (event.action === 'close') {
    console.log('✖️ [FCM] Usuário fechou a notificação');
    return;
  }

  // Determinar URL de destino
  const urlToOpen = event.notification.data?.redirectTo 
    ? new URL(event.notification.data.redirectTo, self.location.origin).href
    : new URL('/profile-mobile', self.location.origin).href;

  console.log('🌐 [FCM] Abrindo URL:', urlToOpen);

  // Abrir ou focar na janela da aplicação
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Verificar se já existe uma janela aberta
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            console.log('✅ [FCM] Focando janela existente');
            return client.focus().then(client => {
              // Enviar mensagem para o cliente com a ação
              return client.postMessage({
                type: 'NOTIFICATION_CLICKED',
                data: event.notification.data,
                action: event.action
              });
            });
          }
        }
        
        // Se não houver janela aberta, abrir uma nova
        if (clients.openWindow) {
          console.log('🆕 [FCM] Abrindo nova janela');
          return clients.openWindow(urlToOpen);
        }
      })
      .catch(error => {
        console.error('❌ [FCM] Erro ao abrir janela:', error);
      })
  );
});

// Handler para fechamento da notificação
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 [FCM] Notificação fechada:', event.notification.tag);
});
