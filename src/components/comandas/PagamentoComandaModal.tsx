import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Banknote, 
  Copy, 
  CheckCircle, 
  Clock, 
  XCircle,
  User,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Comanda } from '@/hooks/useComandas';
import { API_CONFIG, getHeaders } from '@/config/api';
import type { CreatePixPaymentRequest, MercadoPagoPaymentResponse, PaymentStatusResponse } from '@/types/mercadopago';

interface PagamentoComandaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: Comanda | null;
  onPagamentoCompleto: (comandaId: string, tipoPagamento: 'PIX' | 'Dinheiro Físico', clienteData?: { cpf: string; telefone: string }) => void;
}

interface PaymentData {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

interface ClienteData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  cpf: string;
}

// Componente para gerar QR Code a partir do texto
const GeneratedQRCode: React.FC<{ qrText: string }> = ({ qrText }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  
  React.useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;
        setQrCodeDataUrl(qrUrl);
      } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
      }
    };
    
    if (qrText) {
      generateQRCode();
    }
  }, [qrText]);

  if (!qrCodeDataUrl) {
    return (
      <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <img src={qrCodeDataUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />;
};

export const PagamentoComandaModal: React.FC<PagamentoComandaModalProps> = ({
  open,
  onOpenChange,
  comanda,
  onPagamentoCompleto
}) => {
  const [step, setStep] = useState<'selection' | 'pix-form' | 'pix-payment' | 'cash-confirm'>('selection');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [selectedClientData, setSelectedClientData] = useState<ClienteData | null>(null);
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    cpf: ''
  });
  
  const { toast } = useToast();

  // Pré-popular dados do usuário quando a comanda mudar
  React.useEffect(() => {
    if (comanda && open) {
      // Extrair nome completo em firstName e lastName
      const nomeCompleto = comanda.cliente_nome || '';
      const partesNome = nomeCompleto.split(' ');
      const firstName = partesNome[0] || '';
      const lastName = partesNome.slice(1).join(' ') || '';
      
      setUserData({
        firstName,
        lastName,
        email: comanda.cliente_email || '',
        cpf: comanda.cliente_cpf && comanda.cliente_cpf !== 'não inserido' ? comanda.cliente_cpf : ''
      });
    }
  }, [comanda, open]);

  const resetModal = () => {
    setStep('selection');
    setPaymentData(null);
    setPaymentStatus('pending');
    setSelectedClientData(null);
    setUserData({ firstName: '', lastName: '', email: '', cpf: '' });
  };

  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  // Validação dos dados do usuário
  const validateUserData = (): boolean => {
    const { firstName, lastName, email, cpf } = userData;
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !cpf.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Email inválido",
        description: "Digite um email válido.",
        variant: "destructive"
      });
      return false;
    }

    // Validar CPF
    const cleanCPF = cpf.replace(/\D/g, '');
    if (cleanCPF.length !== 11) {
      toast({
        title: "CPF inválido",
        description: "O CPF deve ter 11 dígitos.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Formatação do CPF
  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleanValue.slice(0, 14);
  };

  // Criar pagamento PIX
  const createPixPayment = async () => {
    if (!comanda || !validateUserData()) return;
    
    setLoading(true);
    try {
      const paymentRequest: CreatePixPaymentRequest = {
        transaction_amount: comanda.total,
        description: `Comanda #${comanda.numero} - ${comanda.cliente_nome}`,
        payment_method_id: 'pix',
        payer: {
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          identification: {
            type: 'CPF',
            number: userData.cpf.replace(/\D/g, '')
          }
        }
      };

      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_PIX_PAYMENT}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(paymentRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorText}`);
      }

      const result: MercadoPagoPaymentResponse = await response.json();
      
      const newPaymentData: PaymentData = {
        id: result.id.toString(),
        qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        status: result.status as 'pending' | 'approved' | 'rejected' | 'cancelled'
      };

      setPaymentData(newPaymentData);
      setPaymentStatus(result.status as 'pending' | 'approved' | 'rejected' | 'cancelled');
      setStep('pix-payment');

      toast({
        title: "QR Code gerado!",
        description: "Escaneie o código ou copie o código Pix para realizar o pagamento."
      });

      // Inicia o polling para verificar status
      startPaymentStatusPolling(result.id.toString());
    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      toast({
        title: "Erro ao gerar pagamento",
        description: "Não foi possível gerar o pagamento PIX. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Polling para verificar status do pagamento
  const startPaymentStatusPolling = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_PAYMENT_STATUS}`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ paymentId })
        });

        if (response.ok) {
          const statusData: PaymentStatusResponse = await response.json();
          
          if (statusData.status !== paymentStatus) {
            setPaymentStatus(statusData.status);
            
              if (statusData.status === 'approved') {
                clearInterval(interval);
                toast({
                  title: "Pagamento aprovado! ✅",
                  description: "A comanda foi paga via PIX com sucesso."
                });
                
                setTimeout(() => {
                  if (comanda) {
                    onPagamentoCompleto(comanda.id, 'PIX');
                  }
                  handleClose();
                }, 2000);
            } else if (statusData.status === 'rejected' || statusData.status === 'cancelled') {
              clearInterval(interval);
              toast({
                title: "Pagamento não aprovado",
                description: "O pagamento PIX foi rejeitado ou cancelado.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000);

    // Limpar o interval após 10 minutos
    setTimeout(() => clearInterval(interval), 600000);
  };

  // Ir direto para confirmação usando dados da comanda
  const handleCashPayment = () => {
    if (!comanda) return;
    
    // Popular dados do cliente da comanda
    setSelectedClientData({
      nome: comanda.cliente_nome || '',
      email: comanda.cliente_email || '',
      telefone: comanda.cliente_telefone || '',
      cpf: comanda.cliente_cpf || ''
    });
    
    setStep('cash-confirm');
  };


  // Finalizar com dinheiro físico
  const finalizarComDinheiro = () => {
    if (!comanda || !selectedClientData) return;
    
    toast({
      title: "Pagamento confirmado!",
      description: "Comanda finalizada com pagamento em dinheiro físico."
    });
    
    onPagamentoCompleto(comanda.id, 'Dinheiro Físico', {
      cpf: selectedClientData.cpf,
      telefone: selectedClientData.telefone
    });
    handleClose();
  };

  // Copiar código PIX
  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast({
        title: "Código copiado!",
        description: "O código PIX foi copiado para a área de transferência."
      });
    }
  };

  if (!comanda) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pagamento da Comanda #{comanda.numero}</DialogTitle>
        </DialogHeader>

        {/* Resumo da Comanda */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliente:</span>
                <span className="text-sm font-medium">{comanda.cliente_nome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Itens:</span>
                <span className="text-sm">{comanda.itens.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Total:</span>
                <span className="text-lg font-bold text-primary">
                  R$ {comanda.total.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seleção do método de pagamento */}
        {step === 'selection' && (
          <div className="space-y-4">
            <h3 className="font-medium">Escolha a forma de pagamento:</h3>
            
            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto p-4 justify-start"
              onClick={() => setStep('pix-form')}
            >
              <CreditCard className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-medium">PIX</div>
                <div className="text-sm text-muted-foreground">
                  Pagamento via MercadoPago
                </div>
              </div>
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="w-full h-auto p-4 justify-start"
              onClick={handleCashPayment}
            >
              <Banknote className="h-6 w-6 mr-3" />
              <div className="text-left">
                <div className="font-medium">Dinheiro Físico</div>
                <div className="text-sm text-muted-foreground">
                  Pagamento em espécie
                </div>
              </div>
            </Button>
          </div>
        )}

        {/* Formulário PIX */}
        {step === 'pix-form' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5" />
              <h3 className="font-medium">Dados do Pagador</h3>
            </div>

            {/* Card informativo com os dados */}
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Nome Completo</p>
                      <p className="text-sm text-muted-foreground">
                        {userData.firstName} {userData.lastName}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {userData.email || 'Não informado'}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">CPF</p>
                      <p className="text-sm text-muted-foreground">
                        {userData.cpf || 'Não informado'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('selection')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={createPixPayment} disabled={loading} className="flex-1">
                {loading ? 'Gerando...' : 'Gerar PIX'}
              </Button>
            </div>
          </div>
        )}

        {/* Tela de pagamento PIX */}
        {step === 'pix-payment' && paymentData && (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2">
              {paymentStatus === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
              {paymentStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
              {(paymentStatus === 'rejected' || paymentStatus === 'cancelled') && <XCircle className="h-5 w-5 text-red-500" />}
              
              <Badge variant={
                paymentStatus === 'approved' ? 'default' :
                paymentStatus === 'pending' ? 'secondary' : 'destructive'
              }>
                {paymentStatus === 'pending' && 'Aguardando Pagamento'}
                {paymentStatus === 'approved' && 'Pagamento Aprovado'}
                {paymentStatus === 'rejected' && 'Pagamento Rejeitado'}
                {paymentStatus === 'cancelled' && 'Pagamento Cancelado'}
              </Badge>
            </div>

            {paymentStatus === 'pending' && (
              <>
                <div className="flex justify-center">
                  <GeneratedQRCode qrText={paymentData.qr_code} />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyPixCode}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar código PIX
                </Button>
                
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie o código PIX para realizar o pagamento
                </p>
              </>
            )}

            <Button variant="outline" onClick={() => setStep('selection')} className="w-full">
              Voltar
            </Button>
          </div>
        )}

        {/* Confirmação dinheiro físico */}
        {step === 'cash-confirm' && selectedClientData && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center">
              <Banknote className="h-12 w-12 text-green-600" />
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Confirmar Pagamento em Dinheiro</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Confirme que o cliente <strong>{selectedClientData.nome}</strong> pagou <strong>R$ {comanda.total.toFixed(2)}</strong> em dinheiro físico
              </p>
              
              {/* Dados do cliente selecionado */}
              <Card className="bg-muted/50 text-left">
                <CardContent className="p-3">
                  <h4 className="font-medium mb-2 text-center">Dados do Cliente:</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Nome:</strong> {selectedClientData.nome}</p>
                    <p><strong>CPF:</strong> {selectedClientData.cpf}</p>
                    <p><strong>Telefone:</strong> {selectedClientData.telefone}</p>
                    <p><strong>Email:</strong> {selectedClientData.email}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('selection')} className="flex-1">
                Voltar
              </Button>
              <Button onClick={finalizarComDinheiro} className="flex-1 bg-green-600 hover:bg-green-700">
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};