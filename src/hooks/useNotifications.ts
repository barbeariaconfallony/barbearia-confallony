import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useNotifications = (userId?: string) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isMobileNative, setIsMobileNative] = useState(false);

  useEffect(() => {
    // Detectar se está rodando em ambiente nativo (iOS ou Android)
    const isNative = Capacitor.isNativePlatform();
    setIsMobileNative(isNative);
    
    if (isNative) {
      // Para plataformas nativas, sempre é suportado
      setIsSupported(true);
      
      // Verificar permissões de notificações locais
      LocalNotifications.checkPermissions().then(result => {
        if (result.display === 'granted') {
          setPermission('granted');
        } else if (result.display === 'denied') {
          setPermission('denied');
        } else {
          setPermission('default');
        }
      });
    } else {
      // Para web, verificar API de notificações do navegador
      setIsSupported('Notification' in window);
      
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste dispositivo');
      return 'denied';
    }

    try {
      if (isMobileNative) {
        // Solicitar permissões para notificações locais
        const localResult = await LocalNotifications.requestPermissions();
        
        if (localResult.display === 'granted') {
          setPermission('granted');
          toast.success('Permissão para notificações concedida!');
          return 'granted';
        } else {
          setPermission('denied');
          toast.error('Permissão para notificações negada');
          return 'denied';
        }
      } else {
        // Para web, usar API do navegador
        const result = await Notification.requestPermission();
        setPermission(result);
        
        if (result === 'granted') {
          toast.success('Permissão para notificações concedida!');
        } else {
          toast.error('Permissão para notificações negada');
        }
        
        return result;
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return 'denied';
    }
  };

  const showNotification = async (options: NotificationOptions) => {
    // 1. SEMPRE mostrar toast na tela primeiro
    toast(options.title, {
      description: options.body,
    });

    // 2. Se NÃO tiver permissão, apenas retornar (já mostrou o toast)
    if (permission !== 'granted' || !isSupported) {
      return;
    }

    // 3. SEMPRE enviar notificação push (Android ou Windows)
    try {
      if (isMobileNative) {
        // ========== ANDROID NATIVO (LocalNotifications) ==========
        await LocalNotifications.schedule({
          notifications: [
            {
              title: options.title,
              body: options.body || '',
              id: Date.now(), // ID único baseado em timestamp
              schedule: { at: new Date(Date.now() + 100) }, // Mostrar imediatamente (100ms delay)
              sound: undefined,
              attachments: undefined,
              actionTypeId: '',
              extra: { tag: options.tag }
            }
          ]
        });
      } else {
        // ========== WINDOWS/WEB (Web Notification API) ==========
        
        // Verificar se Service Worker está ativo e pronto
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          
          if (navigator.serviceWorker.controller) {
            // Usar Service Worker para notificações em background
            
            // Enviar mensagem ao Service Worker
            navigator.serviceWorker.controller.postMessage({
              type: 'SHOW_NOTIFICATION',
              payload: {
                title: options.title,
                body: options.body,
                icon: options.icon || '/favicon.png',
                tag: options.tag || `notification-${Date.now()}`,
                requireInteraction: options.requireInteraction || false,
              }
            });
          } else {
            // Service Worker não está controlando a página ainda
            
            const notification = new Notification(options.title, {
              body: options.body,
              icon: options.icon || '/favicon.png',
              tag: options.tag || `notification-${Date.now()}`,
              requireInteraction: options.requireInteraction || false,
            });

            // Auto-fechar após 5 segundos se não for interativa
            if (!options.requireInteraction) {
              setTimeout(() => {
                notification.close();
              }, 5000);
            }
          }
        } else {
          // Navegador não suporta Service Workers
          
          const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.png',
            tag: options.tag || `notification-${Date.now()}`,
            requireInteraction: options.requireInteraction || false,
          });

          // Auto-fechar após 5 segundos se não for interativa
          if (!options.requireInteraction) {
            setTimeout(() => {
              notification.close();
            }, 5000);
          }
        }
      }
    } catch (error) {
      console.error('❌ [useNotifications] Erro ao mostrar notificação push:', error);
      toast.error('Erro ao enviar notificação push');
    }
  };

  const showSuccess = (title: string, body?: string) => {
    toast.success(title, { description: body });
    
    if (permission === 'granted') {
      showNotification({
        title: `✅ ${title}`,
        body,
        tag: 'success'
      });
    }
  };

  const showError = (title: string, body?: string) => {
    toast.error(title, { description: body });
    
    if (permission === 'granted') {
      showNotification({
        title: `❌ ${title}`,
        body,
        tag: 'error',
        requireInteraction: true
      });
    }
  };

  const showWarning = (title: string, body?: string) => {
    toast.warning(title, { description: body });
    
    if (permission === 'granted') {
      showNotification({
        title: `⚠️ ${title}`,
        body,
        tag: 'warning'
      });
    }
  };

  const showInfo = (title: string, body?: string) => {
    toast.info(title, { description: body });
    
    if (permission === 'granted') {
      showNotification({
        title: `ℹ️ ${title}`,
        body,
        tag: 'info'
      });
    }
  };

  return {
    permission,
    isSupported,
    isMobileNative,
    requestPermission,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};