import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
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
export const AgendamentoReminderConfig: React.FC<AgendamentoReminderConfigProps> = ({
  onSave
}) => {
  const {
    currentUser
  } = useAuth();
  const {
    permission,
    isSupported,
    isMobileNative,
    requestPermission
  } = useNotifications(currentUser?.uid);
  const {
    toast
  } = useToast();
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
        setSettings(prev => ({
          ...prev,
          pushEnabled: true
        }));
        toast({
          title: "Notificações ativadas!",
          description: isMobileNative ? "Você receberá notificações push no seu dispositivo móvel." : "Você receberá notificações no seu navegador."
        });
      } else {
        toast({
          title: "Permissão negada",
          description: isMobileNative ? "Ative as notificações nas configurações do seu dispositivo." : "Você precisa permitir notificações no seu navegador.",
          variant: "destructive"
        });
      }
    } else {
      setSettings(prev => ({
        ...prev,
        pushEnabled: checked
      }));
    }
  };
  const handleSave = () => {
    localStorage.setItem('reminderSettings', JSON.stringify(settings));
    toast({
      title: "Preferências salvas!",
      description: "Suas configurações de lembretes foram atualizadas."
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
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-foreground">Lembretes de Agendamento</h4>
        </div>

        {/* Push Notifications */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-primary" />
            <div>
              <Label className="font-medium">Notificações Push</Label>
              <p className="text-xs text-muted-foreground">
                {isMobileNative ? 'Receba no seu celular' : 'Receba no navegador'}
              </p>
            </div>
          </div>
          <Switch 
            checked={settings.pushEnabled} 
            onCheckedChange={handlePushToggle}
            disabled={!isSupported}
          />
        </div>

        {/* Email */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-primary" />
            <Label className="font-medium">E-mail</Label>
          </div>
          <Switch 
            checked={settings.emailEnabled} 
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, emailEnabled: checked }))}
          />
        </div>

        {/* SMS */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-primary" />
            <Label className="font-medium">SMS</Label>
          </div>
          <Switch 
            checked={settings.smsEnabled} 
            onCheckedChange={(checked) => setSettings(prev => ({ ...prev, smsEnabled: checked }))}
          />
        </div>

        {/* Antecedência */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Receber lembrete com antecedência de:</Label>
          <Select 
            value={settings.antecedencia} 
            onValueChange={(value) => setSettings(prev => ({ ...prev, antecedencia: value }))}
          >
            <SelectTrigger className="w-full">
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

        <Button onClick={handleSave} className="w-full">
          Salvar Preferências
        </Button>
      </CardContent>
    </Card>
  );
};