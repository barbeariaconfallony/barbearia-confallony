import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from 'qrcode.react';
// Payment functionality removed - now display only
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingData {
  service: {
    id: string;
    nome: string;
    preco: number;
    duracao: number;
    descricao: string;
    sala_atendimento?: string;
  };
  employee: {
    id: string;
    nome: string;
    especialidades: string[];
    ativo: boolean;
  };
  date: Date;
  time: string;
  user: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
  };
}

const PixPagamento = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [pixQrCode, setPixQrCode] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  
  // Form data
  const [personalData, setPersonalData] = useState({
    cpf: ''
  });

  useEffect(() => {
    // Recuperar dados do agendamento do localStorage
    const savedBookingData = localStorage.getItem('bookingData');
    if (savedBookingData) {
      const data = JSON.parse(savedBookingData);
      // Converter string de data de volta para Date
      data.date = new Date(data.date);
      setBookingData(data);
    } else {
      // Se não há dados, redirecionar para página de agendamento
      toast({
        title: "Erro",
        description: "Dados do agendamento não encontrados. Redirecionando...",
        variant: "destructive"
      });
      navigate('/booking');
    }
  }, [navigate, toast]);

  const handleCPFFormat = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Código copiado!",
      description: "O código PIX foi copiado para sua área de transferência.",
    });
  };

  const handleProcessPayment = async () => {
    if (!bookingData || !personalData.cpf) {
      toast({
        title: "Erro",
        description: "Preencha o CPF para continuar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      // Mock PIX payment for display purposes only
      const paymentResponse = {
        id: `mock-${Date.now()}`,
        status: 'pending',
        point_of_interaction: {
          transaction_data: {
            qr_code: `00020126580014br.gov.bcb.pix0136mock-pix-${Date.now()}5204000053039865406${bookingData.service.preco.toFixed(2)}5802BR5913Barbearia6008Sao Paulo62070503***6304`,
            qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAAA1BMVEX///+nxBvIAAAASElEQVR4nO3BgQAAAADDoPlTX+AIVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADwDcaiAAFXD1ujAAAAAElFTkSuQmCC'
          }
        }
      };
      
      setPaymentId(paymentResponse.id);
      setPixQrCode(paymentResponse.point_of_interaction.transaction_data.qr_code);
      setPixCode(paymentResponse.point_of_interaction.transaction_data.qr_code);
      setPaymentStatus('success');
      
      toast({
        title: "PIX gerado com sucesso!",
        description: "QR Code PIX gerado. Efetue o pagamento para confirmar seu agendamento.",
      });

      // Iniciar verificação do status do pagamento
      startPaymentStatusCheck(paymentResponse.id);

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      
      toast({
        title: "Erro no pagamento",
        description: error.message || "Erro ao processar pagamento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    const checkInterval = setInterval(async () => {
      try {
        // Aqui você verificaria o status do pagamento
        // Por enquanto vamos simular
        console.log('Verificando status do pagamento:', paymentId);
        
        // Em um sistema real, você faria:
        // const status = await checkPaymentStatus(paymentId);
        // if (status === 'approved') {
        //   handlePaymentConfirmed(paymentId);
        //   clearInterval(checkInterval);
        // }
        
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Parar verificação após 10 minutos
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 600000);
  };

  const handlePaymentConfirmed = async (paymentId: string) => {
    if (!bookingData) return;

    try {
      // 1. Salvar pagamento na coleção "pagamentos_servicos"
      const paymentData = {
        payment_id: paymentId,
        usuario_id: bookingData.user.id,
        usuario_nome: bookingData.user.nome,
        usuario_email: bookingData.user.email,
        servico_id: bookingData.service.id,
        servico_nome: bookingData.service.nome,
        valor: bookingData.service.preco,
        status: 'aprovado',
        data_pagamento: new Date(),
        metodo_pagamento: 'PIX',
        external_reference: `booking_${Date.now()}_${bookingData.user.id}`
      };

      await addDoc(collection(db, 'pagamentos_servicos'), paymentData);

      // 2. Criar agendamento na coleção "fila"
      const appointmentDate = new Date(bookingData.date);
      const [hours, minutes] = bookingData.time.split(':').map(Number);
      
      const tempoInicio = new Date(appointmentDate);
      tempoInicio.setHours(hours, minutes, 0, 0);
      
      const tempoFim = new Date(appointmentDate);
      tempoFim.setHours(hours, minutes + bookingData.service.duracao, 0, 0);

      const appointmentData = {
        usuario_id: bookingData.user.id,
        usuario_nome: bookingData.user.nome,
        usuario_email: bookingData.user.email,
        usuario_telefone: bookingData.user.telefone,
        servico_id: bookingData.service.id,
        servico_nome: bookingData.service.nome,
        sala_atendimento: bookingData.service.sala_atendimento || '',
        funcionario_id: bookingData.employee.id,
        funcionario_nome: bookingData.employee.nome,
        preco: bookingData.service.preco,
        data: appointmentDate,
        tempo_inicio: tempoInicio,
        tempo_fim: tempoFim,
        forma_pagamento: "PIX",
        status: 'pago',
        data_criacao: new Date(),
        duracao: bookingData.service.duracao,
        presente: true,
        timestamp: new Date().getTime(),
        payment_id: paymentId,
        payment_status: 'approved'
      };

      await addDoc(collection(db, 'fila'), appointmentData);

      // Limpar localStorage
      localStorage.removeItem('bookingData');

      // Redirecionar para página de sucesso
      const successParams = new URLSearchParams({
        service: bookingData.service.nome,
        date: format(appointmentDate, "dd/MM/yyyy", { locale: ptBR }),
        time: bookingData.time
      });

      navigate(`/agendamento/sucesso?${successParams.toString()}`);

    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      toast({
        title: "Erro",
        description: "Pagamento confirmado, mas erro ao criar agendamento. Entre em contato conosco.",
        variant: "destructive"
      });
    }
  };

  const isFormValid = () => {
    return personalData.cpf.replace(/\D/g, '').length === 11;
  };

  if (!bookingData) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-surface flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-card">
            <CardContent className="p-6 text-center">
              <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-spin" />
              <p>Carregando dados do agendamento...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-surface p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/booking')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Agendamento
            </Button>
            <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              Pagamento PIX
            </h1>
            <p className="text-muted-foreground">Finalize seu agendamento com pagamento via PIX</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Resumo do Agendamento */}
            <div className="lg:col-span-2">
              <Card className="shadow-card mb-6">
                <CardHeader>
                  <CardTitle>Resumo do Agendamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Serviço</Label>
                      <p className="font-semibold">{bookingData.service.nome}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cabeleireiro</Label>
                      <p className="font-semibold">{bookingData.employee.nome}</p>
                    </div>
                    {bookingData.service.sala_atendimento && (
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Sala</Label>
                        <p className="font-semibold">{bookingData.service.sala_atendimento}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Data</Label>
                      <p className="font-semibold">{format(bookingData.date, "dd/MM/yyyy", { locale: ptBR })}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Horário</Label>
                      <p className="font-semibold">{bookingData.time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Duração</Label>
                      <p className="font-semibold">{bookingData.service.duracao} minutos</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Valor</Label>
                      <p className="text-xl font-bold text-primary">R$ {bookingData.service.preco.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dados para Pagamento */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-primary" />
                    Dados para Pagamento PIX
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="cpf">CPF do Pagador</Label>
                    <Input
                      id="cpf"
                      value={personalData.cpf}
                      onChange={(e) => setPersonalData(prev => ({ ...prev, cpf: handleCPFFormat(e.target.value) }))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Informe o CPF que será usado no pagamento PIX
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processamento do Pagamento */}
            <div className="space-y-6">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Processamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button 
                      className="w-full bg-gradient-primary hover:bg-primary/90"
                      onClick={handleProcessPayment}
                      disabled={!isFormValid() || isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                          Gerando PIX...
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-4 w-4" />
                          Gerar PIX
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Status do Pagamento */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant={
                      paymentStatus === 'success' ? 'default' : 
                      paymentStatus === 'processing' ? 'secondary' : 
                      paymentStatus === 'error' ? 'destructive' : 'outline'
                    }>
                      {paymentStatus === 'success' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {paymentStatus === 'processing' && <Clock className="h-3 w-3 mr-1 animate-spin" />}
                      {paymentStatus === 'idle' ? 'Aguardando' : 
                       paymentStatus === 'processing' ? 'Processando' : 
                       paymentStatus === 'success' ? 'PIX Gerado' : 'Erro'}
                    </Badge>
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentStatus === 'success' && pixCode && (
                    <div className="space-y-4">
                      <div className="text-center p-6 border-2 border-dashed border-primary rounded-lg">
                        <QRCodeSVG value={pixCode} size={128} className="mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground mb-4">
                          Escaneie o QR Code ou copie o código PIX
                        </p>
                        <div className="bg-muted p-3 rounded text-xs font-mono break-all mb-3">
                          {pixCode}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(pixCode)}
                          className="w-full"
                        >
                          Copiar Código PIX
                        </Button>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                          Aguardando confirmação do pagamento...
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePaymentConfirmed(paymentId)}
                          className="mt-2"
                        >
                          Já paguei - Confirmar manualmente
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {paymentStatus === 'idle' && (
                    <p className="text-sm text-muted-foreground text-center">
                      Preencha o CPF e clique em "Gerar PIX"
                    </p>
                  )}

                  {paymentStatus === 'error' && (
                    <p className="text-sm text-destructive text-center">
                      Erro ao gerar PIX. Tente novamente.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PixPagamento;