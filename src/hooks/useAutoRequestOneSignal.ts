import { useEffect, useRef } from 'react';
import { useOneSignalNative } from './useOneSignalNative';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que solicita permissão para notificações OneSignal automaticamente
 * quando o usuário abre o app pela primeira vez
 */
export const useAutoRequestOneSignal = () => {
  const { currentUser } = useAuth();
  const { permission, isSupported, isInitialized, requestPermission } = useOneSignalNative(currentUser?.uid);
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Só executar se:
    // 1. OneSignal está inicializado
    // 2. Notificações são suportadas
    // 3. Usuário está autenticado
    // 4. Permissão ainda não foi concedida nem negada
    // 5. Ainda não fizemos a requisição nesta sessão
    if (
      isInitialized &&
      isSupported && 
      currentUser && 
      permission === 'default' && 
      !hasRequestedRef.current
    ) {
      // Verificar localStorage para não perguntar repetidamente
      const hasAskedBefore = localStorage.getItem('onesignal_asked');
      
      if (!hasAskedBefore) {
        // Aguardar 2 segundos após o app carregar para não ser muito intrusivo
        const timeoutId = setTimeout(async () => {
          console.log('🔔 Solicitando permissão para notificações OneSignal automaticamente...');
          hasRequestedRef.current = true;
          
          try {
            const result = await requestPermission();
            
            // Salvar que já perguntamos, independente da resposta
            localStorage.setItem('onesignal_asked', 'true');
            
            if (result === 'granted') {
              console.log('✅ Permissão para notificações concedida!');
            } else {
              console.log('❌ Permissão para notificações negada');
            }
          } catch (error) {
            console.error('Erro ao solicitar permissão:', error);
          }
        }, 2000); // 2 segundos de delay

        return () => clearTimeout(timeoutId);
      }
    }
  }, [isInitialized, isSupported, currentUser, permission, requestPermission]);
};
