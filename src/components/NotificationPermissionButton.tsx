import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useFCMToken } from '@/hooks/useFCMToken';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationPermissionButton: React.FC = () => {
  const { currentUser } = useAuth();
  const { isSupported, loading, fcmToken, requestPermissionAndGetToken } = useFCMToken(currentUser?.uid);

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        Notificações não suportadas
      </Button>
    );
  }

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <Bell className="h-4 w-4 animate-pulse" />
        Inicializando...
      </Button>
    );
  }

  const handleRequestPermission = async () => {
    await requestPermissionAndGetToken();
  };

  const getButtonText = () => {
    if (fcmToken) return 'Notificações Ativadas';
    if (Notification.permission === 'denied') return 'Notificações Bloqueadas';
    return 'Ativar Notificações';
  };

  const getButtonVariant = () => {
    if (fcmToken) return 'default' as const;
    if (Notification.permission === 'denied') return 'destructive' as const;
    return 'outline' as const;
  };

  return (
    <Button
      variant={getButtonVariant()}
      size="sm"
      onClick={handleRequestPermission}
      disabled={!!fcmToken || loading}
      className="flex items-center gap-2"
    >
      {fcmToken ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {getButtonText()}
    </Button>
  );
};