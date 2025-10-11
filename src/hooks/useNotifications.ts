import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

export const useNotifications = () => {
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
      
      // Verificar permissões no mobile
      PushNotifications.checkPermissions().then(result => {
        if (result.receive === 'granted') {
          setPermission('granted');
        } else if (result.receive === 'denied') {
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
        // Solicitar permissões para notificações push nativas
        const pushResult = await PushNotifications.requestPermissions();
        
        // Solicitar permissões para notificações locais
        const localResult = await LocalNotifications.requestPermissions();
        
        if (pushResult.receive === 'granted' && localResult.display === 'granted') {
          // Registrar para receber notificações push
          await PushNotifications.register();
          
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
    // Sempre mostrar toast na tela
    toast(options.title, {
      description: options.body,
    });

    // Se tiver permissão, mostrar também notificação
    if (permission === 'granted' && isSupported) {
      try {
        if (isMobileNative) {
          // Para dispositivos móveis nativos, usar LocalNotifications
          await LocalNotifications.schedule({
            notifications: [
              {
                title: options.title,
                body: options.body || '',
                id: Date.now(),
                schedule: { at: new Date(Date.now() + 100) }, // Mostrar imediatamente
                sound: undefined,
                attachments: undefined,
                actionTypeId: '',
                extra: { tag: options.tag }
              }
            ]
          });
        } else {
          // Para web, usar API do navegador
          const notification = new Notification(options.title, {
            body: options.body,
            icon: options.icon || '/favicon.ico',
            tag: options.tag,
            requireInteraction: options.requireInteraction || false,
          });

          // Auto-fechar após 5 segundos se não for interativa
          if (!options.requireInteraction) {
            setTimeout(() => {
              notification.close();
            }, 5000);
          }

          return notification;
        }
      } catch (error) {
        console.error('Erro ao mostrar notificação:', error);
      }
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