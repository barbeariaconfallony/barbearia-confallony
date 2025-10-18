import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Banknote,
  DollarSign,
  Check,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CardPaymentForm } from './CardPaymentForm';
import { PixPayment } from './PixPayment';

interface PagamentoRestanteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pagamentoParcialId: string;
  agendamentoId: string;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  clienteData: {
    nome: string;
    email: string;
    cpf: string;
  };
  onPagamentoConcluido: () => void;
}

type PaymentStep = 'selection' | 'pix' | 'card' | 'cash';

export const PagamentoRestanteModal: React.FC<PagamentoRestanteModalProps> = ({
  open,
  onOpenChange,
  pagamentoParcialId,
  agendamentoId,
  valorTotal,
  valorPago,
  valorRestante,
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
      // Atualizar pagamento_parcial
      await updateDoc(doc(db, 'pagamentos_parciais', pagamentoParcialId), {
        status_restante: 'pago',
        forma_pagamento_restante: formaPagamento,
        data_pagamento_restante: new Date(),
        payment_id_restante: paymentId || null
      });

      // Atualizar agendamento
      await updateDoc(doc(db, 'fila', agendamentoId), {
        pagamento_completo: true
      });

      toast({
        title: "Pagamento finalizado! ✅",
        description: "O pagamento restante foi processado com sucesso."
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

  const handlePixSuccess = (paymentId: string) => {
    finalizarPagamento('PIX', paymentId);
  };

  const handleCardSuccess = (paymentId: string) => {
    finalizarPagamento('Cartão de Crédito', paymentId);
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
              onClick={() => setStep('card')}
            >
              <CreditCard className="mr-3 h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Cartão de Crédito</div>
                <div className="text-xs text-muted-foreground">
                  Parcele em até 12x
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-auto py-4"
              onClick={() => setStep('cash')}
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
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setStep('selection')}>
              ← Voltar
            </Button>
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Implementação de PIX para pagamento restante em desenvolvimento.
                Por favor, escolha outra forma de pagamento.
              </p>
              <Button onClick={() => setStep('selection')}>
                Escolher outro método
              </Button>
            </div>
          </div>
        )}

        {/* Card Payment */}
        {step === 'card' && (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setStep('selection')}>
              ← Voltar
            </Button>
            <CardPaymentForm
              amount={valorRestante}
              description={`Pagamento restante - Agendamento`}
              onSuccess={handleCardSuccess}
              onError={(error) => {
                toast({
                  title: "Erro no pagamento",
                  description: error,
                  variant: "destructive"
                });
              }}
              cardType="credit_card"
              clientData={clienteData}
            />
          </div>
        )}

        {/* Cash Confirmation */}
        {step === 'cash' && (
          <div className="space-y-4">
            <Button variant="ghost" onClick={() => setStep('selection')}>
              ← Voltar
            </Button>
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium">Confirmar pagamento em dinheiro?</p>
                    <p className="text-sm text-muted-foreground">
                      O barbeiro deve confirmar o recebimento do valor restante de{' '}
                      <span className="font-bold">R$ {valorRestante.toFixed(2)}</span> em dinheiro físico.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              className="w-full" 
              onClick={handleCashPayment}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                'Confirmar Pagamento em Dinheiro'
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
