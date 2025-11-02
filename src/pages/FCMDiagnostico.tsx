import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useFCMToken } from '@/hooks/useFCMToken';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  XCircle, 
  Bell, 
  Trash2, 
  RefreshCw,
  Send,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function FCMDiagnostico() {
  const { currentUser } = useAuth();
  const { isSupported, fcmToken, loading, requestPermissionAndGetToken } = useFCMToken(currentUser?.uid);
  const [swState, setSwState] = useState<string>('Verificando...');
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [resetting, setResetting] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkServiceWorkerState();
  }, []);

  const checkServiceWorkerState = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration('/');
      setSwRegistration(registration || null);
      
      if (!registration) {
        setSwState('Não registrado');
      } else if (registration.active) {
        setSwState('Ativo');
      } else if (registration.installing) {
        setSwState('Instalando...');
      } else if (registration.waiting) {
        setSwState('Aguardando');
      } else {
        setSwState('Desconhecido');
      }
    } catch (error) {
      console.error('Erro ao verificar Service Worker:', error);
      setSwState('Erro ao verificar');
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      // Unregister all service workers
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ Service Worker removido');
      }

      // Clear all site data
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
        console.log('✅ Cache limpo');
      }

      toast.success('FCM resetado! Recarregue a página.');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Erro ao resetar FCM:', error);
      toast.error('Erro ao resetar FCM');
    } finally {
      setResetting(false);
    }
  };

  const handleTestNotification = async () => {
    if (!currentUser?.uid) {
      toast.error('Você precisa estar logado');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userIds: [currentUser.uid],
          title: '🧪 Teste de Diagnóstico FCM',
          body: 'Se você recebeu esta notificação, o FCM está funcionando corretamente!',
          data: { type: 'diagnostic_test' }
        }
      });

      if (error) throw error;

      toast.success('Notificação de teste enviada! Verifique se recebeu.');
      console.log('📤 Resposta do envio:', data);
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      toast.error('Erro ao enviar notificação de teste');
    } finally {
      setSending(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para área de transferência');
  };

  const getVapidKey = () => {
    const key = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BBqVtJQjExRq0ReZQAfYzMwPAv2Nkucmp8gZ1qoZlzAYlsUXMJ7Ut5JGhsiCREjfC7HmahgBqhADdKTBQ6iTZHs';
    return key;
  };

  const StatusBadge = ({ condition, label }: { condition: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {condition ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Bell className="h-8 w-8" />
            Diagnóstico FCM
          </h1>
          <p className="text-muted-foreground">
            Verifique o estado do Firebase Cloud Messaging
          </p>
        </div>

        {/* Status Geral */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>Compatibilidade e permissões</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <StatusBadge 
              condition={'Notification' in window} 
              label="API de Notificações disponível" 
            />
            <StatusBadge 
              condition={'serviceWorker' in navigator} 
              label="Service Workers suportados" 
            />
            <StatusBadge 
              condition={isSupported} 
              label="FCM suportado neste navegador" 
            />
            <StatusBadge 
              condition={Notification.permission === 'granted'} 
              label="Permissão de notificações concedida" 
            />
            
            {Notification.permission === 'denied' && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">Permissão bloqueada</p>
                  <p className="text-muted-foreground">
                    Você bloqueou as notificações. Para ativar, vá em configurações do navegador e permita notificações para este site.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Worker */}
        <Card>
          <CardHeader>
            <CardTitle>Service Worker</CardTitle>
            <CardDescription>Estado do worker de notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estado:</span>
              <Badge variant={swState === 'Ativo' ? 'default' : 'secondary'}>
                {swState}
              </Badge>
            </div>
            {swRegistration && (
              <div className="text-xs text-muted-foreground">
                <p>Scope: {swRegistration.scope}</p>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkServiceWorkerState}
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Estado
            </Button>
          </CardContent>
        </Card>

        {/* Configuração */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração Firebase</CardTitle>
            <CardDescription>Chaves e tokens</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">VAPID Key (primeiros 30 caracteres)</label>
              <div className="flex gap-2">
                <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                  {getVapidKey().substring(0, 30)}...
                </code>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => copyToClipboard(getVapidKey())}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <label className="text-sm font-medium">FCM Token</label>
              {fcmToken ? (
                <div className="flex gap-2">
                  <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                    {fcmToken.substring(0, 50)}...
                  </code>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(fcmToken)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum token gerado ainda</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Gerenciar e testar notificações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={requestPermissionAndGetToken}
              disabled={loading || !!fcmToken}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              {fcmToken ? 'Notificações Ativas' : 'Ativar Notificações'}
            </Button>

            <Button 
              variant="outline"
              onClick={handleTestNotification}
              disabled={!fcmToken || sending}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Enviando...' : 'Enviar Notificação de Teste'}
            </Button>

            <Button 
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
              className="w-full"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {resetting ? 'Resetando...' : 'Resetar FCM (limpar tudo)'}
            </Button>
          </CardContent>
        </Card>

        {/* Instruções */}
        <Card>
          <CardHeader>
            <CardTitle>Checklist de Configuração</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>VAPID Key configurada no .env (VITE_FIREBASE_VAPID_KEY)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Domínio autorizado no Firebase Console (Authorized domains)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>App Check desativado (ou enforcement OFF)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Firebase SDK v12.1.0 no Service Worker</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
              <span>FIREBASE_SERVICE_ACCOUNT_JSON configurado no Supabase</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
