import { useEffect, useRef } from 'react';
import { useNotifications } from './useNotifications';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook que solicita permissão para notificações automaticamente
 * quando o usuário abre o app pela primeira vez
 */
export const useAutoRequestNotifications = () => {
  const { permission, isSupported, requestPermission } = useNotifications();
  const { currentUser } = useAuth();
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    // Só executar se:
    // 1. Notificações são suportadas
    // 2. Usuário está autenticado
    // 3. Permissão ainda não foi concedida nem negada
    // 4. Ainda não fizemos a requisição nesta sessão
    if (
      isSupported && 
      currentUser && 
      permission === 'default' && 
      !hasRequestedRef.current
    ) {
      // Verificar localStorage para não perguntar repetidamente
      const hasAskedBefore = localStorage.getItem('notifications_asked');
      
      if (!hasAskedBefore) {
        // Aguardar 2 segundos após o app carregar para não ser muito intrusivo
        const timeoutId = setTimeout(async () => {
          console.log('🔔 Solicitando permissão para notificações automaticamente...');
          hasRequestedRef.current = true;
          
          try {
            const result = await requestPermission();
            
            // Salvar que já perguntamos, independente da resposta
            localStorage.setItem('notifications_asked', 'true');
            
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
  }, [isSupported, currentUser, permission, requestPermission]);
};
