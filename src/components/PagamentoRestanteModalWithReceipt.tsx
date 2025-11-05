import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, Loader2, Check, QrCode as QrCodeIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateDoc, doc, getDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PixPayment } from './PixPayment';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import logoMain from '@/assets/confallony-logo-new.png';

interface PagamentoRestanteModalWithReceiptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamentoId: string;
  valorTotal: number;
  valorPago: number;
  valorRestante: number;
  usuarioId: string;
  clienteNome: string;
  clienteEmail: string;
  servicoNome: string;
  onPagamentoConcluido: () => void;
}

type PaymentStep = 'pix' | 'concluido';

export const PagamentoRestanteModalWithReceipt: React.FC<PagamentoRestanteModalWithReceiptProps> = ({
  open,
  onOpenChange,
  agendamentoId,
  valorTotal,
  valorPago,
  valorRestante,
  usuarioId,
  clienteNome,
  clienteEmail,
  servicoNome,
  onPagamentoConcluido
}) => {
  const { toast } = useToast();
  const [step, setStep] = useState<PaymentStep>('pix');
  const [loading, setLoading] = useState(false);
  const [agendamentoData, setAgendamentoData] = useState<any>(null);

  const handleClose = () => {
    setStep('pix');
    setAgendamentoData(null);
    onOpenChange(false);
  };

  const handlePixComplete = async () => {
    setLoading(true);
    try {
      // Buscar dados completos do agendamento
      const agendamentoRef = doc(db, 'fila', agendamentoId);
      const agendamentoDoc = await getDoc(agendamentoRef);
      
      if (!agendamentoDoc.exists()) {
        throw new Error('Agendamento não encontrado');
      }

      const data = agendamentoDoc.data();
      setAgendamentoData({
        ...data,
        id: agendamentoDoc.id
      });

      const now = new Date();

      // Criar objeto do agendamento finalizado
      const completedAppointment = {
        ...data,
        status: 'concluido',
        tempo_fim: data.tempo_fim?.toDate() || now,
        data_conclusao: now,
        data_atendimento: data.tempo_inicio?.toDate() || data.data?.toDate() || now,
        pagamento_parcial: false,
        valor_restante: 0,
        status_restante: 'concluído',
        forma_pagamento_restante: 'PIX',
        data_pagamento_restante: now,
        avaliado: data.avaliado || false,
        avaliacao: data.avaliacao || null,
      };

      // Adicionar aos agendamentos finalizados
      await addDoc(collection(db, 'agendamentos_finalizados'), completedAppointment);

      // Remover da fila
      await deleteDoc(agendamentoRef);

      setStep('concluido');
      onPagamentoConcluido();

      toast({
        title: "Pagamento concluído! ✅",
        description: "Agendamento finalizado com sucesso."
      });
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!agendamentoData) return;

    try {
      const comprovanteDiv = document.createElement('div');
      comprovanteDiv.style.position = 'absolute';
      comprovanteDiv.style.left = '-9999px';
      comprovanteDiv.style.width = '800px';
      comprovanteDiv.style.padding = '40px';
      comprovanteDiv.style.backgroundColor = '#ffffff';
      comprovanteDiv.style.fontFamily = 'Arial, sans-serif';

      comprovanteDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
          <img src="${logoMain}" alt="Logo" style="width: 150px; margin: 0 auto 20px;" />
          <h1 style="color: #d4af37; font-size: 28px; margin: 20px 0;">Comprovante de Pagamento</h1>
          <div style="border-top: 2px solid #d4af37; margin: 20px 0;"></div>
          
          <div style="text-align: left; margin: 30px 0;">
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Cliente:</strong> ${clienteNome}</p>
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Email:</strong> ${clienteEmail}</p>
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Serviço:</strong> ${servicoNome}</p>
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Data:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            ${agendamentoData.funcionario_nome ? `<p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Profissional:</strong> ${agendamentoData.funcionario_nome}</p>` : ''}
            ${agendamentoData.sala_atendimento ? `<p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Sala:</strong> ${agendamentoData.sala_atendimento}</p>` : ''}
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Forma de Pagamento:</strong> PIX</p>
          </div>

          <div style="border-top: 2px solid #d4af37; margin: 20px 0;"></div>
          
          <div style="text-align: left; margin: 30px 0;">
            <p style="margin: 15px 0; font-size: 18px;"><strong style="color: #666;">Valor Total:</strong> R$ ${valorTotal.toFixed(2)}</p>
            <p style="margin: 15px 0; font-size: 18px; color: #10b981;"><strong>Valor Pago Anteriormente (1/3):</strong> R$ ${valorPago.toFixed(2)}</p>
            <p style="margin: 15px 0; font-size: 22px; color: #d97706;"><strong>Valor Pago Agora (2/3):</strong> R$ ${valorRestante.toFixed(2)}</p>
            <p style="margin: 20px 0 10px; font-size: 24px; color: #000;"><strong>Total Pago:</strong> R$ ${valorTotal.toFixed(2)}</p>
          </div>

          <div style="border-top: 2px solid #d4af37; margin: 30px 0;"></div>
          
          <p style="color: #666; font-size: 14px; margin-top: 40px;">Obrigado por escolher Barbearia Confallony!</p>
          <p style="color: #999; font-size: 12px; margin-top: 10px;">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      `;

      document.body.appendChild(comprovanteDiv);

      const canvas = await html2canvas(comprovanteDiv, {
        backgroundColor: '#ffffff',
        scale: 2
      });

      document.body.removeChild(comprovanteDiv);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `comprovante-pagamento-restante-${format(new Date(), "dd-MM-yyyy-HHmm")}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);

          toast({
            title: "Comprovante salvo!",
            description: "O comprovante foi baixado com sucesso"
          });
        }
      });
    } catch (error) {
      console.error("Erro ao salvar comprovante:", error);
      toast({
        title: "Erro ao salvar comprovante",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'pix' ? 'Pagar Restante do Agendamento' : 'Pagamento Concluído'}
          </DialogTitle>
        </DialogHeader>

        {/* Resumo do Pagamento */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6 space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor Total:</span>
              <span className="font-medium">R$ {valorTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Pago (1/3):</span>
              <span className="font-medium">R$ {valorPago.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold text-amber-600">
              <span>A Pagar (2/3):</span>
              <span>R$ {valorRestante.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* PIX Payment */}
        {step === 'pix' && (
          <div className="-mx-6 -mb-6">
            <PixPayment
              bookingData={{
                service: servicoNome,
                serviceId: agendamentoId,
                date: new Date().toISOString(),
                time: new Date().toTimeString(),
                amount: valorRestante,
                sala_atendimento: '',
                selectedService: {
                  nome: servicoNome,
                  preco: valorRestante,
                  duracao: 0,
                  usuario_id: usuarioId
                },
                selectedTime: new Date().toTimeString(),
                pagamento_parcial: false
              }}
              onBack={handleClose}
              onPaymentComplete={handlePixComplete}
              redirectTo="profile"
            />
          </div>
        )}

        {/* Pagamento Concluído */}
        {step === 'concluido' && (
          <div className="space-y-4 py-6">
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <Check className="h-12 w-12 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Pagamento Confirmado!
                </h3>
                <p className="text-sm text-muted-foreground">
                  O pagamento restante foi processado com sucesso.
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button 
                variant="outline"
                className="w-full"
                onClick={handleDownloadReceipt}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Comprovante (PNG)
                  </>
                )}
              </Button>

              <Button 
                className="w-full"
                onClick={handleClose}
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
