import { supabase } from '@/lib/supabase';

interface FCMNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

/**
 * Envia push notification via FCM (Firebase Cloud Messaging)
 * Funciona tanto no navegador web quanto no Android
 */
export const sendFCMPushNotification = async (payload: FCMNotificationPayload) => {
  try {
    console.log('📤 Enviando push notification FCM:', payload.title);
    
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userId: payload.userId,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        imageUrl: payload.imageUrl,
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar FCM push:', error);
      return { success: false, error };
    }

    console.log('✅ Push notification FCM enviado com sucesso:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Erro ao chamar edge function:', error);
    return { success: false, error };
  }
};

/**
 * Envia push notification para múltiplos usuários
 */
export const sendFCMPushNotificationBatch = async (
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>,
  imageUrl?: string
) => {
  try {
    console.log(`📤 Enviando push notification para ${userIds.length} usuários`);
    
    const { data: responseData, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        userIds,
        title,
        body,
        data,
        imageUrl,
      }
    });

    if (error) {
      console.error('❌ Erro ao enviar FCM push em lote:', error);
      return { success: false, error };
    }

    console.log('✅ Push notifications FCM enviados em lote:', responseData);
    return { success: true, data: responseData };
  } catch (error) {
    console.error('❌ Erro ao chamar edge function em lote:', error);
    return { success: false, error };
  }
};
