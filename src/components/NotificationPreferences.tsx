import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Bell, BellOff, Volume2, VolumeX, Smartphone } from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { useNotifications } from '@/hooks/useNotifications';
import { NOTIFICATION_TYPE_LABELS, NotificationType } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export const NotificationPreferences = () => {
  const { preferences, updatePreferences } = useSmartNotifications();
  const { permission, requestPermission, isSupported, isMobileNative } = useNotifications();
  const { toast } = useToast();

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleToggleType = async (type: NotificationType, enabled: boolean) => {
    await updatePreferences({
      enabledTypes: {
        ...preferences.enabledTypes,
        [type]: enabled,
      },
    });

    toast({
      title: enabled ? 'Notificação ativada' : 'Notificação desativada',
      description: NOTIFICATION_TYPE_LABELS[type],
    });
  };

  const handleUpdateDoNotDisturb = async (field: 'start' | 'end', value: string) => {
    await updatePreferences({
      [field === 'start' ? 'doNotDisturbStart' : 'doNotDisturbEnd']: value,
    });
  };

  const handleToggleSound = async () => {
    const newValue = !preferences.soundEnabled;
    await updatePreferences({ soundEnabled: newValue });
    toast({
      title: newValue ? 'Som ativado' : 'Som desativado',
      description: newValue ? 'Notificações terão som' : 'Notificações serão silenciosas',
    });
  };

  const handleToggleVibration = async () => {
    const newValue = !preferences.vibrationEnabled;
    await updatePreferences({ vibrationEnabled: newValue });
    toast({
      title: newValue ? 'Vibração ativada' : 'Vibração desativada',
    });
  };

  return (
    <div className="space-y-4">
      {/* Status de Permissão */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Permissão de Notificações</CardTitle>
            </div>
            <Badge 
              variant={permission === 'granted' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {permission === 'granted' ? 'Ativa' : 'Inativa'}
            </Badge>
          </div>
          <CardDescription>
            {permission === 'granted' 
              ? 'Você receberá notificações push no dispositivo'
              : 'Permissão necessária para receber alertas'}
          </CardDescription>
        </CardHeader>

        {permission !== 'granted' && (
          <CardContent>
            <Button onClick={requestPermission} className="w-full">
              <Bell className="mr-2 h-4 w-4" />
              Solicitar Permissão
            </Button>
            {!isSupported && (
              <p className="text-xs text-destructive mt-2 text-center">
                Notificações não suportadas neste navegador
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Tipos de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Notificação</CardTitle>
          <CardDescription>
            Escolha quais notificações deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agendamentos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              📅 Agendamentos
            </h3>
            {(['appointment_reminder', 'appointment_checkin', 'appointment_late'] as NotificationType[]).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <Label htmlFor={type} className="text-sm cursor-pointer flex-1">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </Label>
                <Switch
                  id={type}
                  checked={preferences.enabledTypes[type]}
                  onCheckedChange={(checked) => handleToggleType(type, checked)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Fidelidade */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              🏆 Programa de Fidelidade
            </h3>
            {(['loyalty_progress', 'loyalty_levelup', 'loyalty_expiring'] as NotificationType[]).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <Label htmlFor={type} className="text-sm cursor-pointer flex-1">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </Label>
                <Switch
                  id={type}
                  checked={preferences.enabledTypes[type]}
                  onCheckedChange={(checked) => handleToggleType(type, checked)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Pagamentos */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              💰 Pagamentos
            </h3>
            {(['payment_pending', 'payment_proof'] as NotificationType[]).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <Label htmlFor={type} className="text-sm cursor-pointer flex-1">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </Label>
                <Switch
                  id={type}
                  checked={preferences.enabledTypes[type]}
                  onCheckedChange={(checked) => handleToggleType(type, checked)}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Engajamento */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              ⭐ Engajamento
            </h3>
            {(['review_request', 'inactivity', 'suggestion'] as NotificationType[]).map((type) => (
              <div key={type} className="flex items-center justify-between">
                <Label htmlFor={type} className="text-sm cursor-pointer flex-1">
                  {NOTIFICATION_TYPE_LABELS[type]}
                </Label>
                <Switch
                  id={type}
                  checked={preferences.enabledTypes[type]}
                  onCheckedChange={(checked) => handleToggleType(type, checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Modo Não Perturbe */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Não Perturbe
          </CardTitle>
          <CardDescription>
            Defina um horário para não receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dnd-start" className="text-sm">
                Início
              </Label>
              <Input
                id="dnd-start"
                type="time"
                value={preferences.doNotDisturbStart || '22:00'}
                onChange={(e) => handleUpdateDoNotDisturb('start', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dnd-end" className="text-sm">
                Fim
              </Label>
              <Input
                id="dnd-end"
                type="time"
                value={preferences.doNotDisturbEnd || '08:00'}
                onChange={(e) => handleUpdateDoNotDisturb('end', e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Durante este período, você não receberá notificações push
          </p>
        </CardContent>
      </Card>

      {/* Configurações de Som e Vibração (Mobile) */}
      {isMobileNative && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Configurações Mobile
            </CardTitle>
            <CardDescription>
              Personalize alertas para dispositivos móveis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {preferences.soundEnabled ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
                <Label htmlFor="sound" className="cursor-pointer">
                  Som de Notificação
                </Label>
              </div>
              <Switch
                id="sound"
                checked={preferences.soundEnabled}
                onCheckedChange={handleToggleSound}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <Label htmlFor="vibration" className="cursor-pointer">
                  Vibração
                </Label>
              </div>
              <Switch
                id="vibration"
                checked={preferences.vibrationEnabled}
                onCheckedChange={handleToggleVibration}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
