import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Bell, Send, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const AdminBroadcastNotifications = () => {
  const { userData } = useAuth();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }

    if (!userData?.uid) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSending(true);

    try {
      console.log('📤 Enviando broadcast para todos os usuários:', { title, message });

      // Buscar todos os usuários do Firebase (não admins)
      const usersQuery = query(
        collection(db, 'usuarios'),
        where('isAdmin', '==', false)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      const userIds = usersSnapshot.docs.map(doc => doc.id);
      
      if (userIds.length === 0) {
        toast.error('Nenhum usuário encontrado para enviar notificação');
        setIsSending(false);
        return;
      }

      console.log(`📤 Enviando notificação para ${userIds.length} usuário(s)`);

      // Enviar via OneSignal
      const { data, error } = await supabase.functions.invoke('send-onesignal-notification', {
        body: {
          userIds: userIds,
          title: title,
          message: message,
          data: { type: 'broadcast', adminId: userData.uid }
        }
      });

      if (error) {
        console.error('❌ Erro ao enviar notificação:', error);
        toast.error('Erro ao enviar notificação');
        return;
      }

      console.log('✅ Notificação enviada:', data);
      
      toast.success(
        'Notificação enviada com sucesso!',
        { description: `${data.recipients || userIds.length} usuário(s) devem receber a notificação` }
      );

      // Limpar campos
      setTitle('');
      setMessage('');
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Enviar Notificação em Massa
          </CardTitle>
          <CardDescription>
            Envie notificações push para todos os clientes cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-title">Título da Notificação</Label>
            <Input
              id="notification-title"
              placeholder="Ex: Promoção especial de hoje!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/100 caracteres
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notification-message">Mensagem</Label>
            <Textarea
              id="notification-message"
              placeholder="Digite a mensagem que deseja enviar para todos os clientes..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={6}
              disabled={isSending}
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/500 caracteres
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendBroadcast}
              disabled={!title.trim() || !message.trim() || isSending}
              className="flex-1"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Enviar para Todos os Clientes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• A notificação será enviada apenas para clientes (não admins)</p>
          <p>• Apenas dispositivos com permissão de notificação receberão</p>
          <p>• As notificações aparecem instantaneamente nos dispositivos</p>
          <p>• Você pode enviar quantas notificações precisar</p>
        </CardContent>
      </Card>
    </div>
  );
};
