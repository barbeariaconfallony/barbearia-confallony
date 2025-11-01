import { getMessaging, getToken } from 'firebase/messaging';
import { toast } from 'sonner';

export interface PaymentNotificationData {
  service: string;
  date: string;
  time: string;
  appointmentId?: string;
}

/**
 * Envia notificação push local personalizada após pagamento bem-sucedido
 */
export const sendPaymentSuccessNotification = async (data: PaymentNotificationData) => {
  try {
    console.log('📤 Enviando notificação de pagamento');

    // Verificar se as notificações estão disponíveis
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.log('⚠️ Permissão de notificações não concedida');
      return null;
    }

    // Criar notificação local
    const notification = new Notification('✅ Pagamento Confirmado!', {
      body: `Seu agendamento de ${data.service} para ${data.date} às ${data.time} foi confirmado com sucesso!`,
      icon: '/confallony-logo-gold.png',
      badge: '/favicon.png',
      tag: 'payment_success',
      requireInteraction: false,
      data: {
        type: 'payment_success',
        appointmentId: data.appointmentId,
        redirectTo: '/profile'
      }
    });

    notification.onclick = () => {
      window.focus();
      window.location.href = '/profile';
      notification.close();
    };

    console.log('✅ Notificação exibida com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar notificação de pagamento:', error);
    return null;
  }
};
