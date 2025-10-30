import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Banknote,
  DollarSign,
  Check,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc, getDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PixPayment } from './PixPayment';
import type { BookingData } from './ServiceBooking';

interface PagamentoRestanteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoParcialId: string;
  agendamentoId: string;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  usuarioId: string;
  clienteData: {
    nome: string;
    email: string;
    cpf: string;
  };
  onPagamentoConcluido: () => void;
}

type PaymentStep = 'selection' | 'pix' | 'cash' | 'cash-confirmation';

export const PagamentoRestanteModal: React.FC<PagamentoRestanteModalProps> = ({
  open,
  onOpenChange,
  pagamentoParcialId,
  agendamentoId,
  valorTotal,
  valorPago,
  valorRestante,
  usuarioId,
  clienteData,
  onPagamentoConcluido
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<PaymentStep>('selection');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setStep('selection');
    onOpenChange(false);
  };

  const finalizarPagamento = async (formaPagamento: string, paymentId?: string) => {
    setLoading(true);
    try {
      // Buscar dados do agendamento
      const agendamentoRef = doc(db, 'fila', agendamentoId);
      const agendamentoDoc = await getDoc(agendamentoRef);
      
      if (!agendamentoDoc.exists()) {
        throw new Error('Agendamento não encontrado');
      }

      const now = new Date();

      // ✅ Atualizar na fila marcando pagamento como pago, mas mantendo em atendimento
      await updateDoc(agendamentoRef, {
        pagamento_parcial: 'pago',
        status_restante: 'concluído',
        forma_pagamento_restante: formaPagamento,
        data_pagamento_restante: now,
        payment_id_restante: paymentId || null
      });

      console.log('✅ Pagamento parcial concluído. Agendamento mantido em atendimento.');

      toast({
        title: "Pagamento recebido! ✅",
        description: "O pagamento foi confirmado. Finalize o atendimento quando estiver pronto."
      });

      onPagamentoConcluido();
      handleClose();
    } catch (error) {
      console.error('Erro ao finalizar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePixComplete = async () => {
    // PixPayment já finaliza o pagamento, só precisamos fechar
    handleClose();
    onPagamentoConcluido();
  };

  const handleCashConfirmation = () => {
    setStep('cash-confirmation');
  };

  const handleCashPayment = () => {
    finalizarPagamento('Dinheiro Físico');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Pagamento</DialogTitle>
        </DialogHeader>

        {/* Resumo do Pagamento */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-medium">R$ {valorTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Valor Pago (1/3):</span>
              <span className="font-medium">R$ {valorPago.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Valor Restante (2/3):</span>
              <span>R$ {valorRestante.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Seleção de Método de Pagamento */}
        {step === 'selection' && (
          <div className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">
              Selecione a forma de pagamento para o valor restante:
            </p>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setStep('pix')}
            >
              <DollarSign className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">PIX</div>
                <div className="text-xs text-muted-foreground">
                  Pagamento instantâneo via QR Code
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={handleCashConfirmation}
            >
              <Banknote className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Dinheiro Físico</div>
                <div className="text-xs text-muted-foreground">
                  Pague presencialmente
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* PIX Payment */}
        {step === 'pix' && (
          <div className="-mx-6 -mb-6">
            <PixPayment
              bookingData={{
                service: `Pagamento Restante - ${clienteData.nome}`,
                serviceId: agendamentoId,
                date: new Date().toISOString(),
                time: new Date().toTimeString(),
                amount: valorRestante,
                sala_atendimento: '',
                selectedService: {
                  nome: `Pagamento Restante`,
                  preco: valorRestante,
                  duracao: 0,
                  usuario_id: usuarioId
                },
                selectedTime: new Date().toTimeString(),
                pagamento_parcial: false
              }}
              onBack={() => setStep('selection')}
              onPaymentComplete={handlePixComplete}
              redirectTo="profile"
            />
          </div>
        )}

        {/* Cash Confirmation Modal */}
        {step === 'cash-confirmation' && (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setStep('selection')}>
              ← Voltar
            </Button>
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium text-amber-900 dark:text-amber-100">
                      Confirmar recebimento do dinheiro?
                    </p>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      Você está prestes a confirmar que recebeu o valor de{' '}
                      <span className="font-bold">R$ {valorRestante.toFixed(2)}</span>{' '}
                      em dinheiro físico do cliente <span className="font-bold">{clienteData.nome}</span>.
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                      ⚠️ Esta ação não pode ser desfeita. Confirme apenas se o dinheiro foi realmente recebido.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button 
                variant="outline"
                className="flex-1" 
                onClick={() => setStep('selection')}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleCashPayment}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Confirmar Recebimento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
