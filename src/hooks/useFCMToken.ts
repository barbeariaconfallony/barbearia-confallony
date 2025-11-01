import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

// VAPID Key do Firebase Console (Cloud Messaging -> Web Push certificates)
const VAPID_KEY = 'BBqVtJQjExRq0ReZQAfYzMwPAv2Nkucmp8gZ1qoZlzAYlsUXMJ7Ut5JGhsiCREjfC7HmahgBqhADdKTBQ6iTZHs';

export const useFCMToken = (userId?: string) => {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // FCM Web só funciona em navegadores, não em apps nativos
    const isWeb = !Capacitor.isNativePlatform();
    setIsSupported(isWeb && 'Notification' in window && 'serviceWorker' in navigator);
  }, []);

  const saveFCMToken = async (token: string, userId: string) => {
    try {
      const tokenRef = doc(collection(db, 'device_tokens'), `${userId}_${token.substring(0, 10)}`);
      await setDoc(tokenRef, {
        userId,
        token,
        platform: 'web',
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      
      console.log('✅ Token FCM salvo com sucesso:', token.substring(0, 20) + '...');
    } catch (error) {
      console.error('❌ Erro ao salvar token FCM:', error);
      throw error;
    }
  };

  const requestPermissionAndGetToken = async () => {
    if (!isSupported || !userId) {
      console.log('❌ FCM não suportado ou userId não fornecido');
      return null;
    }

    setLoading(true);

    try {
      // Solicitar permissão de notificações
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('⚠️ Permissão de notificações negada');
        toast.error('Permissão para notificações negada');
        setLoading(false);
        return null;
      }

      // Registrar Service Worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
        type: 'classic'
      });

      console.log('✅ Service Worker registrado:', registration);

      // Aguardar Service Worker estar ativo
      await navigator.serviceWorker.ready;

      // Obter token FCM
      const messaging = getMessaging();
      const token = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });

      if (token) {
        console.log('✅ Token FCM obtido:', token.substring(0, 20) + '...');
        setFcmToken(token);
        
        // Salvar token no Firestore
        await saveFCMToken(token, userId);
        
        // Configurar listener para mensagens em foreground
        onMessage(messaging, (payload) => {
          console.log('📩 Mensagem recebida em foreground:', payload);
          
          toast(payload.notification?.title || 'Nova notificação', {
            description: payload.notification?.body,
          });
        });

        toast.success('Notificações ativadas com sucesso!');
        return token;
      } else {
        console.log('❌ Nenhum token de registro disponível');
        return null;
      }
    } catch (error) {
      console.error('❌ Erro ao obter token FCM:', error);
      toast.error('Erro ao ativar notificações');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    fcmToken,
    isSupported,
    loading,
    requestPermissionAndGetToken,
    saveFCMToken,
  };
};
