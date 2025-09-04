import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, QrCode, CheckCircle, Clock, XCircle, ArrowLeft, User, Mail, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BookingData } from '@/components/ServiceBooking';
import { API_CONFIG, getHeaders } from '@/config/api';
import type { CreatePixPaymentRequest, MercadoPagoPaymentResponse, PaymentStatusResponse } from '@/types/mercadopago';
import { ClientDropdownSelector } from '@/components/ClientDropdownSelector';

interface PixPaymentProps {
  bookingData: BookingData;
  onBack?: () => void;
  onPaymentComplete?: () => Promise<void>;
}

interface PaymentData {
  id: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
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

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Usar URL direta para imagem QR Code
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
      <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <img 
      src={qrCodeDataUrl} 
      alt="QR Code Pix" 
      className="w-48 h-48 object-contain"
    />
  );
};

export const PixPayment: React.FC<PixPaymentProps> = ({ bookingData, onBack, onPaymentComplete }) => {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    cpf: ''
  });
  const [showUserForm, setShowUserForm] = useState(true);
  const { toast } = useToast();

  // Carregar dados salvos do localStorage
  useEffect(() => {
    const savedUserData = localStorage.getItem('pixUserData');
    if (savedUserData) {
      try {
        const parsedData = JSON.parse(savedUserData);
        setUserData(parsedData);
        setShowUserForm(false);
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    }
  }, []);

  // Salvar dados do usuário no localStorage
  const saveUserDataToStorage = (data: UserData) => {
    localStorage.setItem('pixUserData', JSON.stringify(data));
  };

  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

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

  const handleUserDataSubmit = () => {
    if (validateUserData()) {
      saveUserDataToStorage(userData);
      setShowUserForm(false);
      toast({
        title: "Dados salvos!",
        description: "Seus dados foram salvos com sucesso.",
      });
    }
  };

  const editUserData = () => {
    setShowUserForm(true);
  };

  const createPixPayment = async () => {
    setLoading(true);
    try {
      // Validar dados antes de tentar criar o pagamento
      if (!validateUserData()) {
        setLoading(false);
        return;
      }

      // Dados do pagamento conforme documentação do Mercado Pago
      const paymentRequest: CreatePixPaymentRequest = {
        transaction_amount: bookingData.amount,
        description: `Agendamento: ${bookingData.service} - ${bookingData.date} ${bookingData.time}`,
        payment_method_id: 'pix',
        payer: {
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          identification: {
            type: 'CPF',
            number: userData.cpf.replace(/\D/g, '') // Remove formatação do CPF
          }
        }
      };

      console.log('Enviando requisição para:', `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_PIX_PAYMENT}`);
      console.log('Dados da requisição:', {
        ...paymentRequest,
        payer: {
          ...paymentRequest.payer,
          identification: {
            ...paymentRequest.payer.identification,
            number: '***' + paymentRequest.payer.identification.number.slice(-3) // Mask CPF for logs
          }
        }
      });
      
      const response = await window.fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CREATE_PIX_PAYMENT}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(paymentRequest),
      });

      console.log('Resposta recebida:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro detalhado da API:', errorText);
        throw new Error(`Erro na API: ${response.status} - ${response.statusText}\n${errorText}`);
      }

      const result: MercadoPagoPaymentResponse = await response.json();
      
      // DEBUG: Verificar resposta completa
      console.log('Resposta completa da API:', result);
      console.log('Dados do QR Code:', {
        has_qr_code: !!result.point_of_interaction?.transaction_data?.qr_code,
        has_qr_code_base64: !!result.point_of_interaction?.transaction_data?.qr_code_base64,
        has_ticket_url: !!result.point_of_interaction?.transaction_data?.ticket_url,
        point_of_interaction: result.point_of_interaction
      });

      const newPaymentData: PaymentData = {
        id: result.id.toString(),
        qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        status: result.status
      };
      
      setPaymentData(newPaymentData);
      setPaymentStatus(result.status);
      
      toast({
        title: "QR Code gerado com sucesso!",
        description: "Escaneie o código ou copie o código Pix para realizar o pagamento.",
      });

      // Inicia o polling para verificar o status do pagamento
      startPaymentStatusPolling(result.id.toString());
      
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      let errorMessage = 'Erro desconhecido';
      let errorDescription = 'Verifique se o backend está configurado corretamente.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Mensagens específicas para diferentes tipos de erro
        if (error.message.includes('Failed to fetch')) {
          errorDescription = 'Não foi possível conectar ao servidor. Verifique sua conexão.';
        } else if (error.message.includes('500')) {
          errorDescription = 'Erro no servidor. Verifique se as credenciais do Mercado Pago estão configuradas.';
        } else if (error.message.includes('400')) {
          errorDescription = 'Dados inválidos enviados para o pagamento. Verifique seus dados pessoais.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorDescription = 'Problema de autenticação. Verifique as configurações.';
        }
      }
      
      toast({
        title: "Erro ao gerar pagamento",
        description: `${errorMessage}\n\n${errorDescription}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startPaymentStatusPolling = (paymentId: string) => {
    console.log(`Iniciando verificação de status para pagamento: ${paymentId}`);
    
    // Polling a cada 5 segundos para verificar status
    const interval = setInterval(async () => {
      try {
        const response = await window.fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_PAYMENT_STATUS}/${paymentId}`, {
          method: 'GET',
          headers: getHeaders(),
        });

        if (response.ok) {
          const statusData: PaymentStatusResponse = await response.json();
          
          if (statusData.status !== paymentStatus) {
            setPaymentStatus(statusData.status);
            
            if (statusData.status === 'approved') {
              clearInterval(interval);
              toast({
                title: "Pagamento aprovado! ✅",
                description: "Seu agendamento foi confirmado com sucesso.",
              });
              // Chama a função para salvar na coleção fila
              if (onPaymentComplete) {
                onPaymentComplete();
              }
            } else if (statusData.status === 'rejected' || statusData.status === 'cancelled') {
              clearInterval(interval);
              toast({
                title: "Pagamento não processado",
                description: "Tente novamente ou entre em contato conosco.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
      }
    }, 5000);

    // Para o polling após 10 minutos (600 segundos)
    setTimeout(() => {
      clearInterval(interval);
      console.log('Polling de status encerrado após 10 minutos');
    }, 600000);
  };

  const copyPixCode = () => {
    if (paymentData?.qr_code) {
      navigator.clipboard.writeText(paymentData.qr_code);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app do banco para fazer o pagamento.",
      });
    }
  };

  const openTicketUrl = () => {
    if (paymentData?.ticket_url) {
      window.open(paymentData.ticket_url, '_blank');
    }
  };

  const getStatusBadge = () => {
    switch (paymentStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" />Aguardando pagamento</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20"><CheckCircle className="w-3 h-3 mr-1" />Pagamento aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Pagamento rejeitado</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-muted"><XCircle className="w-3 h-3 mr-1" />Pagamento cancelado</Badge>;
      default:
        return null;
    }
  };

  useEffect(() => {
    if (!showUserForm && userData.firstName && userData.lastName && userData.email && userData.cpf) {
      createPixPayment();
    }
  }, [showUserForm]);

  if (showUserForm) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-card">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Seus Dados para Pagamento
          </CardTitle>
          <CardDescription>
            Selecione um cliente cadastrado ou preencha seus dados pessoais para gerar o pagamento PIX
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Adicionar import do ClientDropdownSelector */}
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-4">Selecionar Cliente Cadastrado (Recomendado)</h4>
              <ClientDropdownSelector
                onClientSelected={(clienteData) => {
                  setUserData({
                    firstName: clienteData.nome.split(' ')[0] || '',
                    lastName: clienteData.nome.split(' ').slice(1).join(' ') || '',
                    email: clienteData.email,
                    cpf: clienteData.cpf
                  });
                }}
                label="Cliente:"
                placeholder="Escolha um cliente cadastrado"
              />
            </div>
            
            <div className="text-center text-muted-foreground">
              <span>ou preencha manualmente abaixo</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={userData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Seu primeiro nome"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input
                id="lastName"
                value={userData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Seu sobrenome"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={userData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              CPF *
            </Label>
            <Input
              id="cpf"
              value={userData.cpf}
              onChange={(e) => handleInputChange('cpf', formatCPF(e.target.value))}
              placeholder="000.000.000-00"
              maxLength={14}
              required
            />
            <p className="text-xs text-muted-foreground">
              * Campos obrigatórios para processamento do PIX
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onBack} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={handleUserDataSubmit} className="flex-1">
              Salvar e Gerar PIX
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentData && loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Gerando QR Code Pix...</p>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'approved') {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-card bg-gradient-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-16 h-16 text-primary mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Pagamento Aprovado!</h2>
          <p className="text-muted-foreground mb-6">Seu agendamento foi confirmado com sucesso.</p>
          
          <div className="bg-accent/50 rounded-lg p-4 w-full max-w-md mb-6">
            <h3 className="font-semibold text-foreground mb-2">Detalhes do Agendamento</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Serviço:</strong> {bookingData.service}</p>
              <p><strong>Data:</strong> {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              <p><strong>Horário:</strong> {bookingData.time}</p>
              <p><strong>Cliente:</strong> {userData.firstName} {userData.lastName}</p>
              <p><strong>CPF:</strong> {userData.cpf}</p>
              <p className="text-primary font-bold">
                <strong>Valor pago:</strong> R$ {bookingData.amount.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-card bg-gradient-card">
      <CardHeader className="text-center">
        <div className="flex items-center justify-between">
          <Button onClick={onBack} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          {getStatusBadge()}
          <Button onClick={editUserData} variant="ghost" size="sm">
            <User className="w-4 h-4" />
            Editar Dados
          </Button>
        </div>
        <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
          <QrCode className="w-6 h-6 text-primary" />
          Pagamento Pix
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Escaneie o QR Code ou copie o código para realizar o pagamento
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumo do pedido */}
        <div className="bg-accent/50 rounded-lg p-4">
          <h3 className="font-semibold text-foreground mb-2">Resumo do Pedido</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Serviço:</strong> {bookingData.service}</p>
            <p><strong>Data:</strong> {new Date(bookingData.date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
            <p><strong>Horário:</strong> {bookingData.time}</p>
            <p><strong>Cliente:</strong> {userData.firstName} {userData.lastName}</p>
            <p><strong>CPF:</strong> {userData.cpf}</p>
            <p className="text-lg font-bold text-primary">
              <strong>Valor:</strong> R$ {bookingData.amount.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        {/* QR Code e Pagamento */}
        {paymentData && (
          <div className="space-y-4">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg border">
              {paymentData.qr_code_base64 ? (
                <img 
                  src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
                  alt="QR Code Pix" 
                  className="w-48 h-48 object-contain"
                />
              ) : paymentData.qr_code ? (
                <GeneratedQRCode qrText={paymentData.qr_code} />
              ) : paymentData.ticket_url ? (
                <div className="text-center">
                  <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-4" />
                  <Button onClick={openTicketUrl} variant="outline" size="sm">
                    Abrir Pagamento
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Dados de pagamento não disponíveis
                  </p>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground text-center mt-4">
                Escaneie este QR Code com seu app do banco
              </p>
            </div>

            {/* Código Pix */}
            {paymentData.qr_code && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ou copie o código Pix:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={paymentData.qr_code}
                    readOnly
                    className="flex-1 px-3 py-2 text-xs border border-border rounded-md bg-muted text-muted-foreground font-mono"
                  />
                  <Button onClick={copyPixCode} variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="bg-accent/50 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">Como pagar:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco</li>
                <li>Escaneie o QR Code ou cole o código Pix</li>
                <li>Confirme o pagamento</li>
                <li>Aguarde a confirmação automática</li>
              </ol>
            </div>

            {paymentStatus === 'pending' && (
              <div className="text-center">
                <div className="animate-pulse flex items-center justify-center gap-2 text-warning">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Aguardando pagamento...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};