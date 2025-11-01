import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
    plugins?: {
      OneSignal?: any;
    };
  }
}

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useOneSignalNative = (userId?: string) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  // Guard global para evitar múltiplas inicializações - usando window para ser realmente global
  const [domainError, setDomainError] = useState(false);

  // Inicializar OneSignal
  useEffect(() => {
    const initOneSignal = async () => {
      // Prevenir múltiplas inicializações usando window para ser verdadeiramente global
      if ((window as any).__oneSignalInitializing || (window as any).__oneSignalInitialized) {
        console.log('⚠️ OneSignal já está sendo inicializado ou já foi inicializado, pulando...');
        
        // Se já foi inicializado, apenas atualizar o estado local
        if ((window as any).__oneSignalInitialized) {
          setIsInitialized(true);
          
          // Tentar obter estado atual se for web
          if (!isNative && window.OneSignal) {
            try {
              const currentPermission = await window.OneSignal.Notifications.permission;
              setPermission(currentPermission ? 'granted' : 'default');
              
              const currentPlayerId = await window.OneSignal.User.PushSubscription.id;
              if (currentPlayerId) {
                setPlayerId(currentPlayerId);
              }
            } catch (e) {
              console.warn('⚠️ Erro ao obter estado do OneSignal:', e);
            }
          }
        }
        return;
      }
      
      (window as any).__oneSignalInitializing = true;
      
      try {
        setIsSupported(true);

        if (isNative) {
          // Inicialização para app nativo (Capacitor)
          console.log('🔔 Inicializando OneSignal nativo...');
          
          if (window.plugins?.OneSignal) {
            // Inicializar com o App ID
            window.plugins.OneSignal.setAppId("4121bac8-40b0-4967-b5dd-e2eab4d39832");
            
            // Configurar external user ID se tiver userId
            if (userId) {
              window.plugins.OneSignal.setExternalUserId(userId);
              console.log('✅ OneSignal Native: Usuário logado com ID:', userId);
            }

            // Verificar status de permissão
            window.plugins.OneSignal.getDeviceState((state: any) => {
              console.log('📱 OneSignal Device State:', state);
              setPlayerId(state.userId);
              setPermission(state.hasNotificationPermission ? 'granted' : 'default');
              setIsInitialized(true);
            });

            // Listener para mudanças de permissão
            window.plugins.OneSignal.addPermissionObserver((state: any) => {
              console.log('🔔 Permissão mudou:', state);
              setPermission(state.to ? 'granted' : 'denied');
            });

            // Listener para mudanças no subscription
            window.plugins.OneSignal.addSubscriptionObserver((state: any) => {
              console.log('📱 Subscription mudou:', state);
              if (state.to?.userId) {
                setPlayerId(state.to.userId);
              }
            });

            console.log('✅ OneSignal nativo inicializado com sucesso');
            (window as any).__oneSignalInitialized = true;
            (window as any).__oneSignalInitializing = false;
          } else {
            console.warn('⚠️ Plugin OneSignal não encontrado');
            setIsInitialized(false);
            (window as any).__oneSignalInitializing = false;
          }
        } else {
          // Inicialização para web (SDK JavaScript)
          console.log('🌐 Inicializando OneSignal web...');
          
          if (typeof window === 'undefined') return;

          // Verificar se já foi inicializado
          if (window.OneSignal && typeof window.OneSignal.init !== 'function') {
            console.log('⚠️ OneSignal web já inicializado anteriormente');
            setIsInitialized(true);
            
            // Tentar obter estado atual
            try {
              const currentPermission = await window.OneSignal.Notifications.permission;
              setPermission(currentPermission ? 'granted' : 'default');
              
              const currentPlayerId = await window.OneSignal.User.PushSubscription.id;
              if (currentPlayerId) {
                setPlayerId(currentPlayerId);
              }
            } catch (e) {
              console.warn('⚠️ Erro ao obter estado do OneSignal:', e);
            }
            return;
          }

          window.OneSignalDeferred = window.OneSignalDeferred || [];
          window.OneSignalDeferred.push(async (OneSignal: any) => {
            try {
              await OneSignal.init({
                appId: "4121bac8-40b0-4967-b5dd-e2eab4d39832",
                safari_web_id: "web.onesignal.auto.511f3fe8-4f38-4cfd-9441-4579acc1dc24",
                allowLocalhostAsSecureOrigin: true,
                serviceWorkerPath: '/OneSignalSDK.sw.js',
                serviceWorkerParam: { scope: '/' },
                notifyButton: {
                  enable: true,
                },
              });

              setIsInitialized(true);
              setDomainError(false);

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
                console.log('✅ OneSignal Web: Usuário logado com ID:', userId);
              }

              console.log('✅ OneSignal web inicializado com sucesso');
              (window as any).__oneSignalInitialized = true;
              (window as any).__oneSignalInitializing = false;
            } catch (error: any) {
              console.error('❌ Erro ao inicializar OneSignal web:', error);
              const errorMsg = error?.message || '';
              (window as any).__oneSignalInitializing = false;

              // Caso 1: Domínio não autorizado no OneSignal (Web)
              if (errorMsg.includes('Can only be used on')) {
                console.warn('⚠️ Domínio atual não está autorizado no OneSignal.');
                setDomainError(true);
                setIsInitialized(true);
                (window as any).__oneSignalInitialized = true;
                return;
              }

              // Caso 2: SDK já inicializado (não é erro de domínio)
              if (errorMsg.includes('SDK already initialized')) {
                console.warn('ℹ️ OneSignal SDK já foi inicializado anteriormente.');
                setDomainError(false);
                setIsInitialized(true);
                (window as any).__oneSignalInitialized = true;
                try {
                  const currentPermission = await window.OneSignal.Notifications.permission;
                  setPermission(currentPermission ? 'granted' : 'default');
                  const currentPlayerId = await window.OneSignal.User.PushSubscription.id;
                  if (currentPlayerId) {
                    setPlayerId(currentPlayerId);
                  }
                } catch (stateErr) {
                  console.warn('⚠️ Não foi possível obter estado do OneSignal após SDK já inicializado:', stateErr);
                }
                return;
              }

              // Outros erros
              setIsInitialized(false);
              (window as any).__oneSignalInitialized = false;
            }
          });
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar OneSignal:', error);
        setIsInitialized(false);
        (window as any).__oneSignalInitializing = false;
      }
    };

    initOneSignal();
  }, [userId, isNative]);

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste dispositivo');
      return 'denied';
    }

    try {
      if (isNative) {
        // Solicitar permissão no app nativo
        if (window.plugins?.OneSignal) {
          console.log('📱 Solicitando permissão nativa...');
          
          // O OneSignal nativo solicita permissão automaticamente
          // Vamos apenas verificar o estado
          window.plugins.OneSignal.promptForPushNotificationsWithUserResponse((accepted: boolean) => {
            console.log('Resposta do usuário:', accepted);
            if (accepted) {
              setPermission('granted');
              toast.success('Notificações ativadas com sucesso!');
            } else {
              setPermission('denied');
              toast.error('Permissão para notificações negada');
            }
          });

          // Aguardar um pouco para obter o novo estado
          setTimeout(() => {
            window.plugins.OneSignal.getDeviceState((state: any) => {
              if (state.userId) {
                setPlayerId(state.userId);
              }
            });
          }, 1000);

          return 'granted';
        } else {
          toast.error('Plugin OneSignal não disponível');
          return 'denied';
        }
      } else {
        // Solicitar permissão na web
        if (!isInitialized || !window.OneSignal) {
          toast.error('OneSignal não está pronto ainda');
          return 'denied';
        }

        const granted = await window.OneSignal.Notifications.requestPermission();
        
        if (granted) {
          setPermission('granted');
          toast.success('Notificações ativadas com sucesso!');
          
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
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return 'denied';
    }
  }, [isInitialized, isSupported, isNative]);

  // Mostrar notificação local (via toast)
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
    try {
      if (isNative && window.plugins?.OneSignal) {
        window.plugins.OneSignal.removeExternalUserId();
        console.log('✅ OneSignal Native: Usuário deslogado');
      } else if (!isNative && isInitialized && window.OneSignal) {
        await window.OneSignal.logout();
        console.log('✅ OneSignal Web: Usuário deslogado');
      }
      setPlayerId(null);
    } catch (error) {
      console.error('Erro ao deslogar do OneSignal:', error);
    }
  }, [isInitialized, isNative]);

  // Enviar tags
  const sendTags = useCallback(async (tags: Record<string, string>) => {
    try {
      if (isNative && window.plugins?.OneSignal) {
        window.plugins.OneSignal.sendTags(tags);
        console.log('✅ OneSignal Native: Tags enviadas:', tags);
      } else if (!isNative && isInitialized && window.OneSignal) {
        await window.OneSignal.User.addTags(tags);
        console.log('✅ OneSignal Web: Tags enviadas:', tags);
      }
    } catch (error) {
      console.error('Erro ao enviar tags:', error);
    }
  }, [isInitialized, isNative]);

  return {
    isInitialized,
    isSupported,
    permission,
    playerId,
    isNative,
    domainError,
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
