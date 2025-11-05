import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CreditCard, Banknote, Copy, CheckCircle, Clock, XCircle, User, Mail, Percent, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CreatePixPaymentRequest, MercadoPagoPaymentResponse, PaymentStatusResponse } from '@/types/mercadopago';
import { ClientSelectionModal } from '@/components/ClientSelectionModal';
import { ClientDropdownSelector } from '@/components/ClientDropdownSelector';
import { PagamentoMistoModal } from '@/components/comandas/PagamentoMistoModal';
import { updateDoc, doc, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { supabase } from '@/integrations/supabase/client';
interface CartItem {
  id: string;
  nome: string;
  preco: number;
  imageUrl?: string;
  descricao: string;
  estoque: number;
  categoria: string;
  tipo_venda?: string;
  ativo: boolean;
  quantity: number;
}
interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onCheckoutCompleto: (formaPagamento?: string) => void;
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
const GeneratedQRCode: React.FC<{
  qrText: string;
}> = ({
  qrText
}) => {
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
    return <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <img src={qrCodeDataUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />;
};
export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  open,
  onOpenChange,
  cartItems,
  onCheckoutCompleto
}) => {
  const [step, setStep] = useState<'cart' | 'pix-form' | 'pix-payment' | 'cash-confirm'>('cart');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | 'cancelled'>('pending');
  const [clientSelectionOpen, setClientSelectionOpen] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<ClienteData | null>(null);
  const [selectedPixClientData, setSelectedPixClientData] = useState<ClienteData | null>(null);
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [pagamentoMistoOpen, setPagamentoMistoOpen] = useState(false);
  const [tipoPagamentoSelecionado, setTipoPagamentoSelecionado] = useState<'dinheiro' | 'misto' | null>(null);
  const [userData, setUserData] = useState<UserData>({
    firstName: '',
    lastName: '',
    email: '',
    cpf: ''
  });
  const {
    toast
  } = useToast();
  const resetModal = () => {
    setStep('cart');
    setPaymentData(null);
    setPaymentStatus('pending');
    setSelectedClientData(null);
    setSelectedPixClientData(null);
    setDiscountPercent('');
    setPagamentoMistoOpen(false);
    setTipoPagamentoSelecionado(null);
    setUserData({
      firstName: '',
      lastName: '',
      email: '',
      cpf: ''
    });
  };
  const handleClose = () => {
    resetModal();
    onOpenChange(false);
  };

  // Cálculos do carrinho
  const subtotal = cartItems.reduce((total, item) => total + item.preco * item.quantity, 0);
  const discountAmount = (parseFloat(discountPercent) || 0) / 100 * subtotal;
  const total = subtotal - discountAmount;

  // Validação dos dados do usuário
  const validateUserData = (): boolean => {
    const {
      firstName,
      lastName,
      email,
      cpf
    } = userData;
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
      return cleanValue.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleanValue.slice(0, 14);
  };

  // Validar estoque antes da compra
  const validateStock = (): boolean => {
    for (const item of cartItems) {
      if (item.quantity > item.estoque) {
        toast({
          title: "Estoque insuficiente",
          description: `${item.nome} não possui estoque suficiente. Disponível: ${item.estoque}`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  // Salvar dados da venda na coleção compras_finalizadas
  const saveVendaData = async (formaPagamento: string, paymentId?: string) => {
    try {
      const vendaData = {
        data: new Date(),
        produtos: cartItems.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: item.preco,
          quantidade: item.quantity,
          categoria: item.categoria,
          subtotal: item.preco * item.quantity
        })),
        cliente: selectedPixClientData ? {
          nome: selectedPixClientData.nome,
          email: selectedPixClientData.email,
          telefone: selectedPixClientData.telefone,
          cpf: selectedPixClientData.cpf
        } : selectedClientData ? {
          nome: selectedClientData.nome,
          email: selectedClientData.email,
          telefone: selectedClientData.telefone,
          cpf: selectedClientData.cpf
        } : {
          nome: `${userData.firstName} ${userData.lastName}`.trim(),
          email: userData.email,
          cpf: userData.cpf
        },
        subtotal: subtotal,
        desconto: discountAmount,
        total: total,
        formaPagamento: formaPagamento,
        status: 'finalizada',
        payment_id: paymentId || null,
        timestamp: new Date().getTime()
      };
      await addDoc(collection(db, 'compras_finalizadas'), vendaData);
      console.log('Dados da venda salvos na coleção compras_finalizadas');
    } catch (error) {
      console.error('Erro ao salvar dados da venda:', error);
      throw new Error('Erro ao salvar dados da venda');
    }
  };

  // Atualizar estoque no Firebase
  const updateStock = async () => {
    try {
      const updatePromises = cartItems.map(async item => {
        const newStock = item.estoque - item.quantity;
        const productRef = doc(db, 'produtos', item.id);
        return updateDoc(productRef, {
          estoque: newStock
        });
      });
      await Promise.all(updatePromises);
      console.log('Estoque atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      throw new Error('Erro ao atualizar estoque dos produtos');
    }
  };

  // Criar pagamento PIX
  const createPixPayment = async () => {
    if (!validateUserData() || !validateStock()) return;
    setLoading(true);
    try {
      const itemsDescription = cartItems.map(item => `${item.nome} (${item.quantity}x)`).join(', ');
      const amount = Math.round(Number(total) * 100) / 100;
      if (isNaN(amount) || amount < 0.01) {
        toast({
          variant: 'destructive',
          title: 'Valor muito baixo para PIX',
          description: 'O valor mínimo para pagamento PIX é R$ 0,01.'
        });
        setLoading(false);
        return;
      }
      const paymentRequest: CreatePixPaymentRequest = {
        transaction_amount: amount,
        description: `Compra de produtos: ${itemsDescription}`,
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
      console.log('Enviando requisição para criar pagamento PIX:', paymentRequest);
      const {
        data: result,
        error
      } = await supabase.functions.invoke('create-pix-payment', {
        body: paymentRequest
      });
      if (error) {
        console.error('Erro ao invocar função:', error);
        throw new Error(`Erro ao criar pagamento: ${error.message}`);
      }
      if (!result) {
        throw new Error('Resposta vazia da função');
      }
      console.log('Pagamento PIX criado:', result);
      const mercadoPagoResult = result as MercadoPagoPaymentResponse;
      const newPaymentData: PaymentData = {
        id: mercadoPagoResult.id.toString(),
        qr_code: mercadoPagoResult.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: mercadoPagoResult.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: mercadoPagoResult.point_of_interaction?.transaction_data?.ticket_url || '',
        status: mercadoPagoResult.status as 'pending' | 'approved' | 'rejected' | 'cancelled'
      };
      setPaymentData(newPaymentData);
      setPaymentStatus(mercadoPagoResult.status as 'pending' | 'approved' | 'rejected' | 'cancelled');
      setStep('pix-payment');
      toast({
        title: "QR Code gerado!",
        description: "Escaneie o código ou copie o código Pix para realizar o pagamento."
      });

      // Inicia o polling para verificar status
      startPaymentStatusPolling(mercadoPagoResult.id.toString());
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

  // Polling para verificar status do pagamento (igual ao PixPayment)
  const startPaymentStatusPolling = (paymentId: string) => {
    console.log(`Iniciando verificação de status para pagamento: ${paymentId}`);
    const interval = setInterval(async () => {
      try {
        const {
          data: statusData,
          error
        } = await supabase.functions.invoke('check-payment-status', {
          body: {
            paymentId
          }
        });
        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }
        console.log('Status check response:', statusData);
        if (statusData && statusData.status) {
          if (statusData.status !== paymentStatus) {
            setPaymentStatus(statusData.status);
            if (statusData.status === 'approved') {
              clearInterval(interval);

              // Atualizar estoque e salvar venda automaticamente
              try {
                await Promise.all([updateStock(), saveVendaData("PIX", paymentId)]);
                toast({
                  title: "Pagamento aprovado! ✅",
                  description: "Sua compra foi finalizada com sucesso e salva em compras_finalizadas."
                });
                setTimeout(() => {
                  onCheckoutCompleto("PIX");
                  handleClose();
                }, 2000);
              } catch (error) {
                console.error('Erro ao processar venda aprovada:', error);
                toast({
                  title: "Pagamento aprovado, mas...",
                  description: "Houve um erro ao processar a venda. Verifique manualmente.",
                  variant: "destructive"
                });
              }
            } else if (statusData.status === 'rejected' || statusData.status === 'cancelled') {
              clearInterval(interval);
              toast({
                title: "Pagamento não processado",
                description: "O pagamento PIX foi rejeitado ou cancelado. Tente novamente.",
                variant: "destructive"
              });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status do pagamento:', error);
      }
    }, 5000); // Polling a cada 5 segundos

    // Limpar o interval após 10 minutos (600 segundos)
    setTimeout(() => {
      clearInterval(interval);
      console.log('Polling de status encerrado após 10 minutos');
    }, 600000);
  };

  // Abrir modal de seleção de cliente para dinheiro físico
  const handleCashPayment = () => {
    if (!validateStock()) return;
    setTipoPagamentoSelecionado('dinheiro');
    setClientSelectionOpen(true);
  };

  // Callback quando cliente é selecionado (Dinheiro)
  const handleClientSelected = (clienteData: ClienteData) => {
    setSelectedClientData(clienteData);
    setClientSelectionOpen(false);
    setStep('cash-confirm');
  };

  // Callback quando cliente é selecionado (PIX)
  const handlePixClientSelected = (clienteData: ClienteData) => {
    setSelectedPixClientData(clienteData);
    // Preencher os campos do formulário com os dados do cliente
    const nomeCompleto = clienteData.nome.split(' ');
    const firstName = nomeCompleto[0] || '';
    const lastName = nomeCompleto.slice(1).join(' ') || '';
    setUserData({
      firstName: firstName,
      lastName: lastName,
      email: clienteData.email,
      cpf: clienteData.cpf !== 'não inserido' ? clienteData.cpf : ''
    });
  };

  // Limpar seleção de cliente PIX
  const clearPixClientSelection = () => {
    setSelectedPixClientData(null);
    setUserData({
      firstName: '',
      lastName: '',
      email: '',
      cpf: ''
    });
  };

  // Finalizar com dinheiro físico
  const finalizarComDinheiro = async () => {
    if (!selectedClientData) return;
    try {
      await Promise.all([updateStock(), saveVendaData("Dinheiro Físico", undefined)]);
      toast({
        title: "Pagamento confirmado!",
        description: "Compra finalizada com pagamento em dinheiro físico e salva em compras_finalizadas."
      });
      onCheckoutCompleto("Dinheiro Físico");
      handleClose();
    } catch (error) {
      toast({
        title: "Erro ao finalizar compra",
        description: "Houve um erro ao processar a venda.",
        variant: "destructive"
      });
    }
  };

  // Abrir modal de pagamento misto
  const handlePagamentoMisto = () => {
    if (!validateStock()) return;
    setTipoPagamentoSelecionado('misto');
    setClientSelectionOpen(true);
  };

  // Confirmar pagamento misto
  const handleConfirmarPagamentoMisto = async (valorDinheiro: number, valorPix: number) => {
    if (!selectedClientData) return;
    
    try {
      await Promise.all([updateStock(), saveVendaData("Pagamento Misto", undefined)]);
      toast({
        title: "Pagamento misto confirmado!",
        description: `Dinheiro: R$ ${valorDinheiro.toFixed(2)} | PIX: R$ ${valorPix.toFixed(2)}`
      });
      onCheckoutCompleto("Pagamento Misto");
      handleClose();
    } catch (error) {
      toast({
        title: "Erro ao finalizar compra",
        description: "Houve um erro ao processar a venda.",
        variant: "destructive"
      });
    }
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
  if (!cartItems.length) return null;
  return <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Finalizar Compra</DialogTitle>
          </DialogHeader>

          {/* Resumo do carrinho */}
          {step === 'cart' && <div className="space-y-4">
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <h3 className="font-medium text-sm">Itens da Compra</h3>
                    {cartItems.map(item => <div key={item.id} className="flex justify-between text-sm">
                        <span>{item.nome} ({item.quantity}x)</span>
                        <span>R$ {(item.preco * item.quantity).toFixed(2)}</span>
                      </div>)}
                    
                    <Separator />
                    
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    
                    {discountAmount > 0 && <div className="flex justify-between text-sm text-green-600">
                        <span>Desconto ({discountPercent}%):</span>
                        <span>- R$ {discountAmount.toFixed(2)}</span>
                      </div>}
                    
                    <Separator />
                    
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span className="text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Campo de desconto */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Desconto (%)
                </Label>
                <Input type="number" placeholder="0" min="0" max="100" step="0.01" value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Escolha a forma de pagamento:</h3>
                
                <Button variant="outline" size="lg" className="w-full h-auto p-4 justify-start" onClick={() => setStep('pix-form')}>
                  <CreditCard className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">PIX</div>
                    <div className="text-sm text-muted-foreground">
                      Pagamento via MercadoPago
                    </div>
                  </div>
                </Button>

                

                <Button variant="outline" size="lg" className="w-full h-auto p-4 justify-start" onClick={handleCashPayment}>
                  <Banknote className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Dinheiro Físico</div>
                    <div className="text-sm text-muted-foreground">
                      Pagamento em espécie
                    </div>
                  </div>
                </Button>

                <Button variant="outline" size="lg" className="w-full h-auto p-4 justify-start" onClick={handlePagamentoMisto}>
                  <DollarSign className="h-6 w-6 mr-3" />
                  <div className="text-left">
                    <div className="font-medium">Pagamento Misto</div>
                    <div className="text-sm text-muted-foreground">
                      Dinheiro + PIX
                    </div>
                  </div>
                </Button>
              </div>
            </div>}

          {/* Formulário PIX */}
          {step === 'pix-form' && <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5" />
                <h3 className="font-medium">Dados do Pagador</h3>
              </div>

              {/* Dropdown de seleção de cliente */}
              <ClientDropdownSelector onClientSelected={handlePixClientSelected} label="Selecionar cliente cadastrado (opcional):" placeholder="Escolha um cliente ou preencha manualmente" />

              {selectedPixClientData && <Button variant="outline" size="sm" onClick={clearPixClientSelection} className="w-full">
                  Limpar seleção e preencher manualmente
                </Button>}

              <Separator />

              <div className="space-y-3">
                <div>
                  <Label htmlFor="firstName">Nome</Label>
                  <Input id="firstName" value={userData.firstName} onChange={e => setUserData(prev => ({
                ...prev,
                firstName: e.target.value
              }))} placeholder="Nome" disabled={!!selectedPixClientData} />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input id="lastName" value={userData.lastName} onChange={e => setUserData(prev => ({
                ...prev,
                lastName: e.target.value
              }))} placeholder="Sobrenome" disabled={!!selectedPixClientData} />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={userData.email} onChange={e => setUserData(prev => ({
                ...prev,
                email: e.target.value
              }))} placeholder="email@exemplo.com" disabled={!!selectedPixClientData} />
                </div>
                
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input id="cpf" value={userData.cpf} onChange={e => setUserData(prev => ({
                ...prev,
                cpf: formatCPF(e.target.value)
              }))} placeholder="000.000.000-00" maxLength={14} disabled={!!selectedPixClientData} />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('cart')} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={createPixPayment} disabled={loading} className="flex-1">
                  {loading ? 'Gerando...' : 'Gerar PIX'}
                </Button>
              </div>
            </div>}

          {/* Tela de pagamento PIX */}
          {step === 'pix-payment' && paymentData && <div className="space-y-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {paymentStatus === 'pending' && <Clock className="h-5 w-5 text-yellow-500" />}
                {paymentStatus === 'approved' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {(paymentStatus === 'rejected' || paymentStatus === 'cancelled') && <XCircle className="h-5 w-5 text-red-500" />}
                
                <Badge variant={paymentStatus === 'approved' ? 'default' : paymentStatus === 'pending' ? 'secondary' : 'destructive'}>
                  {paymentStatus === 'pending' && 'Aguardando Pagamento'}
                  {paymentStatus === 'approved' && 'Pagamento Aprovado'}
                  {paymentStatus === 'rejected' && 'Pagamento Rejeitado'}
                  {paymentStatus === 'cancelled' && 'Pagamento Cancelado'}
                </Badge>
              </div>

              {paymentStatus === 'pending' && <>
                  <div className="flex justify-center">
                    <GeneratedQRCode qrText={paymentData.qr_code} />
                  </div>
                  
                  <Button variant="outline" size="sm" onClick={copyPixCode} className="w-full">
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar código PIX
                  </Button>
                  
                  <p className="text-sm text-muted-foreground">
                    Aguardando confirmação do pagamento...
                  </p>
                </>}

              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            </div>}

          {/* Confirmação pagamento em dinheiro */}
          {step === 'cash-confirm' && selectedClientData && <div className="space-y-4">
              <h3 className="font-medium">Confirmar pagamento em dinheiro</h3>
              
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cliente:</span>
                      <span className="font-medium">{selectedClientData.nome}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span className="font-bold text-primary">R$ {total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('cart')} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={finalizarComDinheiro} className="flex-1">
                  Confirmar Pagamento
                </Button>
              </div>
            </div>}
        </DialogContent>
      </Dialog>

      <ClientSelectionModal 
        isOpen={clientSelectionOpen} 
        onClose={() => {
          setClientSelectionOpen(false);
          setTipoPagamentoSelecionado(null);
        }} 
        onClientSelected={(clienteData) => {
          setSelectedClientData(clienteData);
          setClientSelectionOpen(false);
          
          if (tipoPagamentoSelecionado === 'misto') {
            setPagamentoMistoOpen(true);
          } else {
            setStep('cash-confirm');
          }
          setTipoPagamentoSelecionado(null);
        }} 
      />

      <PagamentoMistoModal
        open={pagamentoMistoOpen}
        onOpenChange={setPagamentoMistoOpen}
        valorTotal={total}
        onConfirmar={handleConfirmarPagamentoMisto}
      />
    </>;
};