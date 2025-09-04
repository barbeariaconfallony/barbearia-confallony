import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, X, MessageCircle, Phone, AlertTriangle, User } from 'lucide-react';
import { updateDoc, doc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface QueueItem {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email?: string;
  usuario_telefone?: string;
  servico_nome: string;
  servico_tipo: string;
  preco?: number;
  status: 'aguardando' | 'em_atendimento' | 'concluido' | 'confirmado';
  posicao: number;
  tempo_estimado: number;
  data: Date;
  presente: boolean;
  timestamp: number;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  forma_pagamento?: string;
  funcionario_nome?: string;
}

interface QueueItemActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: QueueItem | null;
}

export const QueueItemActionsModal: React.FC<QueueItemActionsModalProps> = ({
  isOpen,
  onClose,
  item
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!item) return null;

  const handleConfirmPresence = async () => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, 'fila', item.id), {
        presente: true,
        status: 'confirmado'
      });
      
      toast({
        title: 'Presença confirmada!',
        description: `${item.usuario_nome} foi marcado como presente.`
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível confirmar a presença.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelPresence = async () => {
    setIsLoading(true);
    try {
      // Dados do agendamento cancelado
      const canceledAppointment = {
        // Dados originais do agendamento
        usuario_id: item.usuario_id,
        usuario_nome: item.usuario_nome,
        usuario_email: item.usuario_email || '',
        usuario_telefone: item.usuario_telefone || '',
        servico_nome: item.servico_nome,
        servico_tipo: item.servico_tipo,
        preco: item.preco || 0,
        tempo_estimado: item.tempo_estimado,
        data_agendamento: item.data,
        tempo_inicio: item.tempo_inicio,
        presente: item.presente,
        posicao: item.posicao,
        forma_pagamento: item.forma_pagamento || 'Presencial',
        funcionario_nome: item.funcionario_nome || 'Funcionário',
        
        // Dados do cancelamento
        data_cancelamento: new Date(),
        motivo_cancelamento: 'Cancelado pela administração',
        status_original: item.status,
        timestamp_original: item.timestamp
      };

      // Primeiro salva na coleção de agendamentos cancelados
      await addDoc(collection(db, 'agendamentos_cancelados'), canceledAppointment);

      // Depois remove da fila
      await deleteDoc(doc(db, 'fila', item.id));
      
      toast({
        title: 'Agendamento cancelado',
        description: `O agendamento de ${item.usuario_nome} foi cancelado e registrado.`
      });
      
      setShowCancelConfirm(false);
      onClose();
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o agendamento.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    const telefone = item.usuario_telefone;
    if (!telefone) {
      toast({
        title: 'Telefone não encontrado',
        description: 'Este cliente não possui telefone cadastrado.',
        variant: 'destructive'
      });
      return;
    }

    // Remover formatação do telefone e adicionar código do país se necessário
    const cleanPhone = telefone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    const message = encodeURIComponent(
      `Olá ${item.usuario_nome}! 

Seu agendamento na Barbearia Confallony está confirmado:
📅 Data: ${format(item.data, "dd/MM/yyyy", { locale: ptBR })}
⏰ Horário: ${item.tempo_inicio ? format(item.tempo_inicio, "HH:mm", { locale: ptBR }) : 'A definir'}
✂️ Serviço: ${item.servico_nome}
💰 Valor: R$ ${item.preco || 0}

Estamos te esperando! 😊`
    );

    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    toast({
      title: 'WhatsApp aberto',
      description: 'Mensagem preparada para envio via WhatsApp.'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'em_atendimento':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'aguardando':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmado':
        return 'Confirmado';
      case 'em_atendimento':
        return 'Em Atendimento';
      case 'aguardando':
        return 'Aguardando';
      default:
        return status;
    }
  };

  return (
    <>
      <Dialog open={isOpen && !showCancelConfirm} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ações do Agendamento
            </DialogTitle>
          </DialogHeader>

          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{item.usuario_nome}</h3>
                  <Badge className={getStatusColor(item.status)}>
                    {getStatusText(item.status)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Serviço:</span> {item.servico_nome}
                  </div>
                  <div>
                    <span className="font-medium">Data:</span> {format(item.data, "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                  {item.tempo_inicio && (
                    <div>
                      <span className="font-medium">Horário:</span> {format(item.tempo_inicio, "HH:mm", { locale: ptBR })}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Valor:</span> R$ {item.preco || 0}
                  </div>
                  {item.usuario_telefone && (
                    <div>
                      <span className="font-medium">Telefone:</span> {item.usuario_telefone}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Presente:</span>{' '}
                    <Badge variant={item.presente ? "default" : "secondary"}>
                      {item.presente ? 'Sim' : 'Não'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {!item.presente && (
              <Button
                onClick={handleConfirmPresence}
                disabled={isLoading}
                className="w-full flex items-center gap-2"
                variant="default"
              >
                <CheckCircle className="h-4 w-4" />
                Confirmar Presença
              </Button>
            )}

            <Button
              onClick={() => setShowCancelConfirm(true)}
              disabled={isLoading}
              variant="destructive"
              className="w-full flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancelar Agendamento
            </Button>

            <Button
              onClick={handleSendWhatsApp}
              variant="outline"
              className="w-full flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Enviar WhatsApp
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Cancelamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar o agendamento de <strong>{item.usuario_nome}</strong>?
              <br />
              <br />
              <strong>Serviço:</strong> {item.servico_nome}
              <br />
              <strong>Data:</strong> {format(item.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              <br />
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>
              Manter Agendamento
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPresence}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Cancelando...' : 'Sim, Cancelar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};