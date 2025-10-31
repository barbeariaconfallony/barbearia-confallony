import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import { useOneSignalNative } from '@/hooks/useOneSignalNative';
import { useAuth } from '@/contexts/AuthContext';

export const NotificationPermissionButton: React.FC = () => {
  const { currentUser } = useAuth();
  const { permission, isSupported, isInitialized, domainError, requestPermission, isNative } = useOneSignalNative(currentUser?.uid);

  if (!isSupported) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        Notificações não suportadas
      </Button>
    );
  }

  if (!isInitialized) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <Bell className="h-4 w-4 animate-pulse" />
        Inicializando...
      </Button>
    );
  }

  if (domainError && !isNative) {
    return (
      <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
        <BellOff className="h-4 w-4" />
        Configure o domínio no OneSignal
      </Button>
    );
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