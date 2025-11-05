import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Send, AlertCircle, CheckCircle } from 'lucide-react';

export const NotificationForm = () => {
  const { toast } = useToast();
  
  // Estados
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [title, setTitle] = useState('Barbearia Confallony');
  const [message, setMessage] = useState('Você tem um novo cliente na fila!');
  const [siteName, setSiteName] = useState('Confallony');
  const [imageUrl, setImageUrl] = useState('/favicon.png');
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(1);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  
  // Verificar suporte e permissão
  useEffect(() => {
    if ('serviceWorker' in navigator && 'Notification' in window) {
      setPermission(Notification.permission);
      
      navigator.serviceWorker.ready.then(() => {
        setIsServiceWorkerReady(true);
      });
    }
  }, []);
  
  // Sincronizar config com Service Worker
  useEffect(() => {
    if (!isServiceWorkerReady) return;
    
    const config = {
      title,
      message,
      siteName,
      imageUrl,
      autoSendEnabled,
      intervalMs: intervalMinutes * 60000
    };
    
    navigator.serviceWorker.controller?.postMessage({
      type: 'UPDATE_CONFIG',
      config
    });
  }, [title, message, siteName, imageUrl, autoSendEnabled, intervalMinutes, isServiceWorkerReady]);
  
  // Solicitar permissão
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações.'
      });
      return;
    }
    
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      toast({
        title: 'Permissão concedida!',
        description: 'Você receberá notificações de fila.',
        variant: 'default'
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Permissão negada',
        description: 'Ative nas configurações do navegador.'
      });
    }
  };
  
  // Enviar notificação manual
  const sendNotificationNow = async () => {
    if (permission !== 'granted') {
      toast({
        variant: 'destructive',
        title: 'Permissão necessária',
        description: 'Clique em "Solicitar Permissão" primeiro.'
      });
      return;
    }
    
    if (isServiceWorkerReady) {
      // Enviar via Service Worker (funciona em background)
      navigator.serviceWorker.controller?.postMessage({
        type: 'SEND_NOW'
      });
    } else {
      // Fallback direto (não funciona em background)
      new Notification(title, {
        body: message,
        icon: imageUrl,
        badge: '/favicon.png',
        tag: 'queue-notification'
      });
    }
    
    toast({
      title: 'Notificação enviada!',
      description: 'Verifique seu centro de notificações.'
    });
  };
  
  // Toggle auto-envio
  const toggleAutoSend = (enabled: boolean) => {
    setAutoSendEnabled(enabled);
    
    if (enabled) {
      navigator.serviceWorker.controller?.postMessage({
        type: 'START_AUTO'
      });
      
      toast({
        title: 'Envio automático ativado',
        description: `Notificações a cada ${intervalMinutes} min.`
      });
    } else {
      navigator.serviceWorker.controller?.postMessage({
        type: 'STOP_AUTO'
      });
      
      toast({
        title: 'Envio automático desativado',
        description: 'Notificações pausadas.'
      });
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações da Fila
        </CardTitle>
        <CardDescription>
          Configure alertas personalizados para novos clientes
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Status da permissão */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className="font-medium">Status das Notificações</p>
              <p className="text-sm text-muted-foreground">
                {permission === 'granted' && 'Ativas e funcionando'}
                {permission === 'denied' && 'Bloqueadas pelo navegador'}
                {permission === 'default' && 'Aguardando permissão'}
              </p>
            </div>
          </div>
          
          {permission !== 'granted' && (
            <Button onClick={requestPermission} variant="default">
              Solicitar Permissão
            </Button>
          )}
          
          {permission === 'granted' && (
            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
              Ativo
            </Badge>
          )}
        </div>
        
        {/* Formulário de personalização */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título da Notificação</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Novo Cliente na Fila"
              maxLength={50}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: João Silva está aguardando atendimento"
              maxLength={200}
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="siteName">Nome do Site</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Confallony"
              maxLength={30}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="imageUrl">URL da Imagem</Label>
            <Input
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="/favicon.png"
            />
          </div>
        </div>
        
        {/* Botão de envio manual */}
        <Button
          onClick={sendNotificationNow}
          disabled={permission !== 'granted'}
          className="w-full"
          size="lg"
        >
          <Send className="mr-2 h-4 w-4" />
          Enviar Notificação Agora
        </Button>
        
        {/* Toggle auto-envio */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-send" className="cursor-pointer">
                Envio Automático
              </Label>
              {autoSendEnabled && (
                <Badge variant="default" className="animate-pulse">
                  Ativo
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Notificações a cada {intervalMinutes} minuto(s)
            </p>
          </div>
          
          <Switch
            id="auto-send"
            checked={autoSendEnabled}
            onCheckedChange={toggleAutoSend}
            disabled={permission !== 'granted'}
          />
        </div>
        
        {autoSendEnabled && (
          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo (minutos)</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={60}
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(Number(e.target.value))}
            />
          </div>
        )}
        
        {/* Info adicional */}
        {permission === 'granted' && (
          <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <p className="font-medium mb-1">✅ Notificações em Background</p>
            <p>As notificações continuarão funcionando mesmo quando a aba estiver fechada (Android) ou minimizada (Desktop).</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
