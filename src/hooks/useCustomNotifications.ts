import { useFCMToken } from './useFCMToken';
import { toast } from 'sonner';
import { getMessaging, getToken } from 'firebase/messaging';

const VAPID_KEY = 'BBqVtJQjExRq0ReZQAfYzMwPAv2Nkucmp8gZ1qoZlzAYlsUXMJ7Ut5JGhsiCREjfC7HmahgBqhADdKTBQ6iTZHs';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useCustomNotifications = (userId?: string) => {
  const { isSupported, fcmToken, requestPermissionAndGetToken } = useFCMToken(userId);

  const sendPushNotification = async (payload: NotificationPayload) => {
    if (!isSupported || !fcmToken) {
      console.log('⚠️ Notificações não suportadas ou token não disponível');
      return;
    }

    try {
      // Exibir notificação local imediatamente
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/confallony-logo-icon.png',
          badge: '/favicon.png',
          tag: payload.tag || 'default',
          requireInteraction: payload.requireInteraction || false,
        });

        // Auto-fechar após 5 segundos se não for interativa
        if (!payload.requireInteraction) {
          setTimeout(() => notification.close(), 5000);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao enviar notificação:', error);
    }
  };

  const notifyLoginSuccess = async (userName: string) => {
    const message = `Que bom te ver novamente! 😊`;
    
    toast.success(`Bem-vindo(a), ${userName}! 🎉`, {
      description: message,
    });

    await sendPushNotification({
      title: `Bem-vindo(a), ${userName}! 🎉`,
      body: message,
      tag: 'login-success',
    });
  };

  const notifyLogoutSuccess = async (userName: string) => {
    const message = 'Esperamos você em breve!';
    
    toast.info(`Até breve, ${userName}! 👋`, {
      description: message,
    });

    await sendPushNotification({
      title: `Até breve, ${userName}! 👋`,
      body: message,
      tag: 'logout-success',
    });
  };

  const notifyQueueWaitTime = async (minutesLeft: number, position: number) => {
    const message = `Tempo estimado: ${minutesLeft} minutos (posição ${position})`;
    
    toast.info('Estamos te aguardando! ⏰', {
      description: message,
    });

    await sendPushNotification({
      title: 'Estamos te aguardando! ⏰',
      body: message,
      tag: 'queue-wait',
      requireInteraction: true,
    });
  };

  const notifyQueueReminder = async (minutesLeft: number) => {
    const message = `Tempo restante: ~${minutesLeft} minutos`;
    
    toast.info('Seu atendimento se aproxima! 🔔', {
      description: message,
    });

    await sendPushNotification({
      title: 'Seu atendimento se aproxima! 🔔',
      body: message,
      tag: 'queue-reminder',
      requireInteraction: true,
    });
  };

  const notifyInactivity = async () => {
    const message = 'Até logo! Volte sempre! 😊';
    
    await sendPushNotification({
      title: 'Esperamos você em breve! 💈',
      body: message,
      tag: 'inactivity',
    });
  };

  return {
    notifyLoginSuccess,
    notifyLogoutSuccess,
    notifyQueueWaitTime,
    notifyQueueReminder,
    notifyInactivity,
    isSupported,
    hasPermission: !!fcmToken,
    requestPermission: requestPermissionAndGetToken,
  };
};
