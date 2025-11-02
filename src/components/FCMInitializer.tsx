import { useEffect, useRef } from 'react';
import { useFCMToken } from '@/hooks/useFCMToken';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Componente que inicializa automaticamente as notificações FCM quando o usuário faz login
 * Deve ser adicionado no App.tsx ou AuthContext
 */
export const FCMInitializer = () => {
  const { currentUser } = useAuth();
  const { isSupported, fcmToken, requestPermissionAndGetToken } = useFCMToken(currentUser?.uid);
  const initRef = useRef(false);
  useEffect(() => {
    // Apenas tenta obter token se:
    // 1. FCM é suportado
    // 2. Usuário está logado
    // 3. Ainda não tem token
    // 4. Permissão já foi concedida anteriormente
    const initializeFCM = async () => {
      if (
        isSupported && 
        currentUser?.uid && 
        !fcmToken && 
        'Notification' in window &&
        Notification.permission === 'granted' &&
        !initRef.current
      ) {
        initRef.current = true;
        console.log('🔔 Inicializando FCM automaticamente para usuário logado...');
        await requestPermissionAndGetToken();
      }
    };

    initializeFCM();
  }, [currentUser?.uid, isSupported, fcmToken, requestPermissionAndGetToken]);

  // Este componente não renderiza nada
  return null;
};
