import { useState, useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, collection } from 'firebase/firestore';
import { db, messaging } from '@/lib/firebase';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

// VAPID Key do Firebase Console (Cloud Messaging -> Web Push certificates)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BBqVtJQjExRq0ReZQAfYzMwPAv2Nkucmp8gZ1qoZlzAYlsUXMJ7Ut5JGhsiCREjfC7HmahgBqhADdKTBQ6iTZHs';

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

    console.log('🚀 [FCM] Iniciando processo de obtenção de token...');
    console.log('🌐 [FCM] Domínio atual:', window.location.hostname);
    console.log('👤 [FCM] User ID:', userId);

    setLoading(true);
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 10000;

    try {
      // Garantir permissão de notificações
      let permission: NotificationPermission = Notification.permission;
      console.log('🔔 [FCM] Permissão atual:', permission);
      
      if (permission !== 'granted') {
        console.log('📝 [FCM] Solicitando permissão de notificações...');
        permission = await Notification.requestPermission();
        console.log('📝 [FCM] Permissão após solicitação:', permission);
      }
      
      if (permission !== 'granted') {
        console.log('⚠️ Permissão de notificações negada');
        toast.error('Permissão para notificações negada');
        setLoading(false);
        return null;
      }

      // Registrar Service Worker
      let registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        console.log('📝 Registrando novo Service Worker...');
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
          type: 'classic'
        });
      }
      console.log('✅ Service Worker registrado');
      await navigator.serviceWorker.ready;

      if (!messaging) {
        console.log('❌ Firebase Messaging não inicializado');
        toast.error('Firebase Messaging não disponível');
        setLoading(false);
        return null;
      }

      // Tentar obter token com retry e fallback
      let token: string | null = null;
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`🔄 Tentativa ${attempt}/${MAX_RETRIES} de obter token FCM...`);
          
          // Timeout para cada tentativa
          const tokenPromise = getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration
          });

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout ao obter token')), TIMEOUT_MS)
          );

          token = await Promise.race([tokenPromise, timeoutPromise]) as string;
          
          if (token) {
            console.log(`✅ Token FCM obtido na tentativa ${attempt}:`, token.substring(0, 20) + '...');
            break;
          }
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Tentativa ${attempt} falhou:`, error.name, error.message);

          // Se for AbortError ou push service error, tentar fallback sem SW registration
          if ((error?.message?.includes('push service error') || error?.name === 'AbortError') && attempt === MAX_RETRIES - 1) {
            console.log('🔄 Tentando fallback sem serviceWorkerRegistration...');
            try {
              token = await getToken(messaging, { vapidKey: VAPID_KEY });
              if (token) {
                console.log('✅ Token obtido via fallback:', token.substring(0, 20) + '...');
                break;
              }
            } catch (fallbackError) {
              console.error('❌ Fallback também falhou:', fallbackError);
              lastError = fallbackError;
            }
          }

          // Backoff exponencial (1s, 2s, 4s)
          if (attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      if (token) {
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
        console.error('❌ Todas as tentativas falharam. Último erro:', lastError);
        console.error('📋 [FCM] Detalhes do erro:', {
          name: lastError?.name,
          message: lastError?.message,
          stack: lastError?.stack,
          domain: window.location.hostname,
          vapidKey: VAPID_KEY
        });
        
        if (lastError?.message?.includes('push service error') || lastError?.name === 'AbortError') {
          console.error('⚠️ [FCM] ERRO DE DOMÍNIO NÃO AUTORIZADO!');
          console.error('📝 [FCM] Soluções:');
          console.error('   1. Adicione o domínio no Firebase Console:');
          console.error(`      ${window.location.hostname}`);
          console.error('   2. Acesse: https://console.firebase.google.com/project/barbearia-confallony/authentication/settings');
          console.error('   3. Em "Authorized domains", adicione seu domínio');
          console.error('   4. Verifique também o arquivo FIREBASE_DOMAINS_SETUP.md na raiz do projeto');
          
          toast.error('❌ Domínio não autorizado no Firebase', {
            description: 'Veja o console para instruções de como resolver',
            duration: 10000
          });
        } else if (lastError?.message?.includes('Timeout')) {
          toast.error('Timeout ao conectar com Firebase. Tente novamente.');
        } else {
          toast.error('Erro ao ativar notificações. Veja o console para detalhes.');
        }
        return null;
      }
    } catch (error: any) {
      console.error('❌ Erro geral ao obter token FCM:', error);
      toast.error('Erro inesperado ao ativar notificações');
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
