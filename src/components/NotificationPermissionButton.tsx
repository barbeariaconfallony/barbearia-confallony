import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationPermissionButton: React.FC = () => {
  const { currentUser } = useAuth();
  const { permission, isSupported, requestPermission, fcmToken } = useNotifications(currentUser?.uid);

  if (!isSupported) {
    return null;
  }

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const getButtonText = () => {
    switch (permission) {
      case 'granted':
        return 'Notificações Ativadas';
      case 'denied':
        return 'Notificações Bloqueadas';
      default:
        return 'Ativar Notificações';
    }
  };

  const getButtonVariant = () => {
    switch (permission) {
      case 'granted':
        return 'default' as const;
      case 'denied':
        return 'destructive' as const;
      default:
        return 'outline' as const;
    }
  };

  return (
    <Button
      variant={getButtonVariant()}
      size="sm"
      onClick={handleRequestPermission}
      disabled={permission === 'granted'}
      className="flex items-center gap-2"
    >
      {permission === 'granted' ? (
        <Bell className="h-4 w-4" />
      ) : (
        <BellOff className="h-4 w-4" />
      )}
      {getButtonText()}
    </Button>
  );
};