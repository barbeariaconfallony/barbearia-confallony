import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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

  useEffect(() => {
    // Verificar se o navegador suporta notificações
    setIsSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      toast.error('Notificações não são suportadas neste navegador');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Permissão para notificações concedida!');
      } else {
        toast.error('Permissão para notificações negada');
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast.error('Erro ao solicitar permissão para notificações');
      return 'denied';
    }
  };

  const showNotification = (options: NotificationOptions) => {
    // Sempre mostrar toast na tela
    toast(options.title, {
      description: options.body,
    });

    // Se tiver permissão, mostrar também notificação do navegador
    if (permission === 'granted' && isSupported) {
      try {
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
    requestPermission,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};