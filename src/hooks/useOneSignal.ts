import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useOneSignal = (userId?: string) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // Inicializar OneSignal
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsSupported(true);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: "4121bac8-40b0-4967-b5dd-e2eab4d39832",
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false, // Desabilitar botão padrão
          },
        });

        setIsInitialized(true);

        // Verificar permissão atual
        const currentPermission = await OneSignal.Notifications.permission;
        setPermission(currentPermission ? 'granted' : 'default');

        // Obter Player ID se disponível
        const currentPlayerId = await OneSignal.User.PushSubscription.id;
        if (currentPlayerId) {
          setPlayerId(currentPlayerId);
        }

        // Listener para mudanças na permissão
        OneSignal.Notifications.addEventListener('permissionChange', (isGranted: boolean) => {
          setPermission(isGranted ? 'granted' : 'denied');
        });

        // Listener para mudanças no subscription
        OneSignal.User.PushSubscription.addEventListener('change', (subscription: any) => {
          if (subscription.current.id) {
            setPlayerId(subscription.current.id);
          }
        });

        // Se tiver userId, associar ao external_id
        if (userId) {
          await OneSignal.login(userId);
          console.log('✅ OneSignal: Usuário logado com ID:', userId);
        }

        console.log('✅ OneSignal inicializado com sucesso');
      } catch (error) {
        console.error('❌ Erro ao inicializar OneSignal:', error);
      }
    });
  }, [userId]);

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isInitialized || !window.OneSignal) {
      toast.error('OneSignal não está pronto ainda');
      return 'denied';
    }

    try {
      const granted = await window.OneSignal.Notifications.requestPermission();
      
      if (granted) {
        setPermission('granted');
        toast.success('Notificações ativadas com sucesso!');
        
        // Obter o novo Player ID
        const newPlayerId = await window.OneSignal.User.PushSubscription.id;
        if (newPlayerId) {
          setPlayerId(newPlayerId);
        }
        
        return 'granted';
      } else {
        setPermission('denied');
        toast.error('Permissão para notificações negada');
        return 'denied';
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return 'denied';
    }
  }, [isInitialized]);

  // Mostrar notificação (via toast, pois OneSignal gerencia as push)
  const showNotification = useCallback((options: NotificationOptions) => {
    toast(options.title, {
      description: options.body,
    });
  }, []);

  const showSuccess = useCallback((title: string, body?: string) => {
    toast.success(title, { description: body });
  }, []);

  const showError = useCallback((title: string, body?: string) => {
    toast.error(title, { description: body });
  }, []);

  const showWarning = useCallback((title: string, body?: string) => {
    toast.warning(title, { description: body });
  }, []);

  const showInfo = useCallback((title: string, body?: string) => {
    toast.info(title, { description: body });
  }, []);

  // Logout do usuário
  const logout = useCallback(async () => {
    if (!isInitialized || !window.OneSignal) return;
    
    try {
      await window.OneSignal.logout();
      setPlayerId(null);
      console.log('✅ OneSignal: Usuário deslogado');
    } catch (error) {
      console.error('Erro ao deslogar do OneSignal:', error);
    }
  }, [isInitialized]);

  // Enviar tags
  const sendTags = useCallback(async (tags: Record<string, string>) => {
    if (!isInitialized || !window.OneSignal) return;
    
    try {
      await window.OneSignal.User.addTags(tags);
      console.log('✅ OneSignal: Tags enviadas:', tags);
    } catch (error) {
      console.error('Erro ao enviar tags:', error);
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isSupported,
    permission,
    playerId,
    requestPermission,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    logout,
    sendTags,
  };
};
