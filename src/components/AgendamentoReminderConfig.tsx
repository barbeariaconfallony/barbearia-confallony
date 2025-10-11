import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/hooks/use-toast';

interface ReminderSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  antecedencia: string; // em minutos
}

interface AgendamentoReminderConfigProps {
  onSave?: (settings: ReminderSettings) => void;
}

export const AgendamentoReminderConfig: React.FC<AgendamentoReminderConfigProps> = ({ onSave }) => {
  const { permission, isSupported, isMobileNative, requestPermission } = useNotifications();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<ReminderSettings>({
    pushEnabled: permission === 'granted',
    emailEnabled: true,
    smsEnabled: false,
    antecedencia: '60' // 1 hora antes
  });

  const handlePushToggle = async (checked: boolean) => {
    if (checked && permission !== 'granted') {
      const result = await requestPermission();
      if (result === 'granted') {
        setSettings(prev => ({ ...prev, pushEnabled: true }));
        toast({
          title: "Notificações ativadas!",
          description: isMobileNative 
            ? "Você receberá notificações push no seu dispositivo móvel." 
            : "Você receberá notificações no seu navegador.",
        });
      } else {
        toast({
          title: "Permissão negada",
          description: isMobileNative
            ? "Ative as notificações nas configurações do seu dispositivo."
            : "Você precisa permitir notificações no seu navegador.",
          variant: "destructive"
        });
      }
    } else {
      setSettings(prev => ({ ...prev, pushEnabled: checked }));
    }
  };

  const handleSave = () => {
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
    
    toast({
      title: "Preferências salvas!",
      description: "Suas configurações de lembretes foram atualizadas.",
    });

    onSave?.(settings);
  };

  React.useEffect(() => {
    const saved = localStorage.getItem('reminderSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (e) {
        console.error('Erro ao carregar configurações:', e);
      }
    }
  }, []);

  return (
    <Card className="bg-card/50 backdrop-blur border-primary/20">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Lembretes de Agendamento</h3>
        </div>

        {/* Aviso sobre dispositivo móvel */}
        {isMobileNative && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-primary font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Notificações otimizadas para dispositivo móvel
            </p>
          </div>
        )}

        {!isSupported && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-destructive font-medium">
              Notificações não suportadas neste dispositivo
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Notificações Push */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="push" className="text-sm">
                Notificações Push
              </Label>
            </div>
            <Switch
              id="push"
              checked={settings.pushEnabled}
              onCheckedChange={handlePushToggle}
            />
          </div>

          {/* Notificações por Email */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="email" className="text-sm">
                Lembretes por Email
              </Label>
            </div>
            <Switch
              id="email"
              checked={settings.emailEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, emailEnabled: checked }))
              }
            />
          </div>

          {/* Notificações por SMS */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="sms" className="text-sm">
                Lembretes por SMS
              </Label>
            </div>
            <Switch
              id="sms"
              checked={settings.smsEnabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, smsEnabled: checked }))
              }
            />
          </div>

          {/* Antecedência do Lembrete */}
          <div className="space-y-2">
            <Label htmlFor="antecedencia" className="text-sm">
              Enviar lembrete com antecedência de:
            </Label>
            <Select
              value={settings.antecedencia}
              onValueChange={(value) => 
                setSettings(prev => ({ ...prev, antecedencia: value }))
              }
            >
              <SelectTrigger id="antecedencia">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutos</SelectItem>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="1440">1 dia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSave} className="w-full" size="sm">
            Salvar Preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
