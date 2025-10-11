import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed as PushActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications, ActionPerformed as LocalActionPerformed } from '@capacitor/local-notifications';

/**
 * Inicializa os listeners de notificações push para dispositivos móveis nativos
 */
export const initializePushNotifications = () => {
  // Só executar em plataformas nativas
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications: rodando em ambiente web, usando API do navegador');
    return;
  }

  console.log('Inicializando push notifications para mobile nativo...');

  // Listener para quando o registro for bem-sucedido
  PushNotifications.addListener('registration', (token: Token) => {
    console.log('Push registration success, token: ' + token.value);
    // Aqui você pode enviar o token para seu backend
    localStorage.setItem('push_token', token.value);
  });

  // Listener para erros de registro
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Listener para quando uma notificação é recebida
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      console.log('Push notification received: ', notification);
      
      // Mostrar notificação local quando o app estiver em foreground
      LocalNotifications.schedule({
        notifications: [
          {
            title: notification.title || 'Nova notificação',
            body: notification.body || '',
            id: Date.now(),
            schedule: { at: new Date(Date.now() + 100) },
            sound: undefined,
            attachments: undefined,
            actionTypeId: '',
            extra: notification.data
          }
        ]
      });
    }
  );

  // Listener para quando o usuário toca na notificação
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (notification: PushActionPerformed) => {
      console.log('Push notification action performed', notification);
      
      // Aqui você pode navegar para uma tela específica baseado na notificação
      const data = notification.notification.data;
      console.log('Notification data:', data);
    }
  );

  // Listener para notificações locais
  LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (notification: LocalActionPerformed) => {
      console.log('Local notification action performed', notification);
    }
  );
};

/**
 * Agenda uma notificação local para lembrete de agendamento
 */
export const scheduleAppointmentReminder = async (
  title: string,
  body: string,
  scheduledTime: Date
) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Notificações locais disponíveis apenas em dispositivos móveis nativos');
    return;
  }

  try {
    // Verificar permissões
    const permissions = await LocalNotifications.checkPermissions();
    
    if (permissions.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      if (request.display !== 'granted') {
        console.error('Permissão para notificações locais negada');
        return;
      }
    }

    // Agendar a notificação
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Date.now(),
          schedule: { at: scheduledTime },
          sound: undefined,
          attachments: undefined,
          actionTypeId: '',
          extra: {
            type: 'appointment_reminder'
          }
        }
      ]
    });

    console.log('Lembrete agendado para:', scheduledTime);
  } catch (error) {
    console.error('Erro ao agendar lembrete:', error);
  }
};
