import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CardPaymentFormProps {
  amount: number;
  description: string;
  onSuccess: (paymentId: string) => void;
  onError: (error: string) => void;
  cardType: 'credit_card' | 'debit_card';
  clientData?: {
    nome: string;
    email: string;
    cpf: string;
  };
}

export const CardPaymentForm: React.FC<CardPaymentFormProps> = ({
  amount,
  description,
  onSuccess,
  onError,
  cardType,
  clientData
}) => {
  const { toast } = useToast();
  const { currentUser } = useAuth(); // Obter usuário Firebase
  const [loading, setLoading] = useState(false);
  const [installments, setInstallments] = useState<string>('1');
  
  // Card form data
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState(clientData?.nome || '');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cpf, setCpf] = useState(clientData?.cpf || '');
  const [email, setEmail] = useState(clientData?.email || '');

  useEffect(() => {
    if (clientData) {
      setCardholderName(clientData.nome);
      setCpf(clientData.cpf);
      setEmail(clientData.email);
    }

    // Carregar SDK do Mercado Pago
    const loadMercadoPagoSDK = async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mp-public-key');
        if (data?.MERCADOPAGO_PUBLIC_KEY && !window.MercadoPago) {
          const script = document.createElement('script');
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.async = true;
          script.onload = () => {
            window.MercadoPago = new (window as any).MercadoPago(data.MERCADOPAGO_PUBLIC_KEY);
          };
          document.body.appendChild(script);
        }
      } catch (error) {
        console.error('Erro ao carregar SDK do Mercado Pago:', error);
      }
    };

    loadMercadoPagoSDK();
  }, [clientData]);

  // Formatar número do cartão
  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // 16 dígitos + 3 espaços
  };

  // Validar formulário
  const validateForm = (): boolean => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
      toast({
        title: "Erro",
        description: "Número do cartão inválido",
        variant: "destructive"
      });
      return false;
    }

    if (!cardholderName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do titular é obrigatório",
        variant: "destructive"
      });
      return false;
    }

    if (!expiryMonth || !expiryYear) {
      toast({
        title: "Erro",
        description: "Data de validade inválida",
        variant: "destructive"
      });
      return false;
    }

    if (!securityCode || securityCode.length < 3) {
      toast({
        title: "Erro",
        description: "Código de segurança inválido",
        variant: "destructive"
      });
      return false;
    }

    if (!cpf || cpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: "Erro",
        description: "CPF inválido",
        variant: "destructive"
      });
      return false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Erro",
        description: "Email inválido",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Validar autenticação Firebase
    if (!currentUser?.uid) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado. Faça login para continuar.",
        variant: "destructive"
      });
      return;
    }

    // Validar valor mínimo para cartões (R$ 1.00)
    if (amount < 1.00) {
      toast({
        title: "Valor mínimo",
        description: "O valor mínimo para pagamento com cartão é R$ 1,00",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const [firstName, ...lastNameParts] = cardholderName.split(' ');
      const lastName = lastNameParts.join(' ') || firstName;

      // Verificar se o SDK do Mercado Pago está carregado
      if (!window.MercadoPago) {
        throw new Error('SDK do Mercado Pago não carregado. Recarregue a página.');
      }

      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      const bin = cleanCardNumber.substring(0, 6);

      console.log('Identificando método de pagamento com BIN:', bin);
      console.log('Número completo do cartão (mascarado):', cleanCardNumber.substring(0, 6) + '******' + cleanCardNumber.substring(12));

      let paymentMethodId = cardType === 'credit_card' ? 'visa' : 'visa'; // default
      let issuerId: string | undefined;

      try {
        // Tentar identificar o payment method baseado no BIN
        const paymentMethods = await window.MercadoPago.getPaymentMethods({ bin });
        
        console.log('Resposta completa getPaymentMethods:', JSON.stringify(paymentMethods, null, 2));
        
        if (paymentMethods && paymentMethods.results && paymentMethods.results.length > 0) {
          const paymentMethod = paymentMethods.results[0];
          paymentMethodId = paymentMethod.id;
          console.log('Método de pagamento identificado:', paymentMethodId);

          // Tentar obter issuer
          try {
            const issuersResponse = await window.MercadoPago.getIssuers({ 
              paymentMethodId: paymentMethodId, 
              bin 
            });
            console.log('Resposta getIssuers:', issuersResponse);
            
            if (issuersResponse && issuersResponse.length > 0) {
              issuerId = issuersResponse[0].id;
              console.log('Issuer ID identificado:', issuerId);
            }
          } catch (issuerError) {
            console.warn('Não foi possível identificar issuer, prosseguindo sem issuer_id:', issuerError);
          }
        } else {
          // Se não identificou, vamos tentar deduzir pela bandeira
          console.warn('Cartão não identificado via API, tentando detectar bandeira manualmente...');
          
          // Detectar bandeira pelo BIN
          const firstDigit = cleanCardNumber.charAt(0);
          const firstTwoDigits = cleanCardNumber.substring(0, 2);
          const firstSixDigits = cleanCardNumber.substring(0, 6);
          
          // Regras de detecção de bandeira
          if (firstDigit === '4') {
            paymentMethodId = cardType === 'credit_card' ? 'visa' : 'debvisa';
          } else if (['51', '52', '53', '54', '55'].includes(firstTwoDigits) || 
                     (parseInt(firstSixDigits) >= 222100 && parseInt(firstSixDigits) <= 272099)) {
            paymentMethodId = cardType === 'credit_card' ? 'master' : 'debmaster';
          } else if (
            firstSixDigits.startsWith('4011') ||
            firstSixDigits.startsWith('4312') ||
            firstSixDigits.startsWith('4389') ||
            firstSixDigits.startsWith('4514') ||
            firstSixDigits.startsWith('4576') ||
            firstSixDigits.startsWith('5041') ||
            firstSixDigits.startsWith('5066') ||
            firstSixDigits.startsWith('5090') ||
            firstSixDigits.startsWith('6277') ||
            firstSixDigits.startsWith('6362') ||
            firstSixDigits.startsWith('6363') ||
            firstSixDigits.startsWith('6504') ||
            firstSixDigits.startsWith('6505') ||
            firstSixDigits.startsWith('6507') ||
            firstSixDigits.startsWith('6509') ||
            firstSixDigits.startsWith('6516') ||
            firstSixDigits.startsWith('6550')
          ) {
            paymentMethodId = cardType === 'credit_card' ? 'elo' : 'debelo';
          } else if (['34', '37'].includes(firstTwoDigits)) {
            paymentMethodId = 'amex';
          }
          
          console.log('Bandeira detectada manualmente:', paymentMethodId);
        }
      } catch (error) {
        console.error('Erro ao identificar cartão, usando detecção manual:', error);
        // Fallback para Visa se der erro
        paymentMethodId = cardType === 'credit_card' ? 'visa' : 'debvisa';
      }

      // Criar card token usando SDK do Mercado Pago
      const cardData = {
        cardNumber: cleanCardNumber,
        cardholderName: cardholderName,
        cardExpirationMonth: expiryMonth,
        cardExpirationYear: `20${expiryYear}`,
        securityCode: securityCode,
        identificationType: 'CPF',
        identificationNumber: cpf.replace(/\D/g, '')
      };

      console.log('Gerando card token...');
      
      const cardToken = await window.MercadoPago.createCardToken(cardData);
      
      if (!cardToken || !cardToken.id) {
        throw new Error('Falha ao gerar token do cartão');
      }

      console.log('Card token gerado com sucesso:', cardToken.id);

      const paymentRequest: any = {
        firebase_uid: currentUser.uid, // Adicionar Firebase UID
        transaction_amount: amount,
        description,
        payment_method_id: paymentMethodId,
        installments: cardType === 'credit_card' ? parseInt(installments) : 1,
        card_token: cardToken.id,
        payer: {
          email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: 'CPF',
            number: cpf.replace(/\D/g, '')
          }
        }
      };

      // Só adicionar issuer_id se foi identificado
      if (issuerId) {
        paymentRequest.issuer_id = issuerId;
      }

      console.log('Criando pagamento com dados:', {
        ...paymentRequest,
        card_token: '[HIDDEN]',
        payer: { email: paymentRequest.payer.email }
      });

      const { data: result, error } = await supabase.functions.invoke('create-mercadopago-payment', {
        body: paymentRequest
      });

      if (error) {
        console.error('Erro ao criar pagamento:', error);
        onError(error.message || 'Erro ao processar pagamento');
        return;
      }

      console.log('Resposta completa do pagamento:', result);

      if (result && result.status === 'approved') {
        toast({
          title: "Pagamento aprovado! ✅",
          description: "Sua compra foi finalizada com sucesso."
        });
        onSuccess(result.id.toString());
      } else if (result && result.status === 'rejected') {
        // Mapear códigos de erro para mensagens amigáveis
        const errorMessages: Record<string, string> = {
          'cc_rejected_high_risk': 'Transação recusada por segurança. Use outro cartão ou forma de pagamento.',
          'cc_rejected_bad_filled_security_code': 'Código de segurança inválido.',
          'cc_rejected_bad_filled_date': 'Data de validade inválida.',
          'cc_rejected_bad_filled_other': 'Verifique os dados do cartão.',
          'cc_rejected_insufficient_amount': 'Saldo insuficiente.',
          'cc_rejected_call_for_authorize': 'Entre em contato com o banco emissor.',
          'cc_rejected_card_disabled': 'Cartão desabilitado. Entre em contato com o banco.',
          'cc_rejected_duplicated_payment': 'Pagamento duplicado.',
          'cc_rejected_max_attempts': 'Número máximo de tentativas excedido.',
          'cc_rejected_card_error': 'Não foi possível processar o pagamento com este cartão.',
        };

        const errorMsg = errorMessages[result.status_detail] || result.status_detail || 'Pagamento recusado';
        
        toast({
          title: "Pagamento recusado",
          description: errorMsg,
          variant: "destructive"
        });
        onError(errorMsg);
      } else {
        const errorMsg = 'Status de pagamento inesperado: ' + result?.status;
        toast({
          title: "Erro no pagamento",
          description: errorMsg,
          variant: "destructive"
        });
        onError(errorMsg);
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      onError(errorMsg);
      toast({
        title: "Erro ao processar pagamento",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          {cardType === 'credit_card' ? 'Pagamento com Cartão de Crédito' : 'Pagamento com Cartão de Débito'}
        </CardTitle>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
          <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>Pagamento 100% seguro através do Mercado Pago</span>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número do Cartão */}
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Número do Cartão</Label>
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              maxLength={19}
              disabled={loading}
            />
          </div>

          {/* Nome do Titular */}
          <div className="space-y-2">
            <Label htmlFor="cardholderName">Nome do Titular</Label>
            <Input
              id="cardholderName"
              placeholder="Como está no cartão"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </div>

          {/* Validade e CVV */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiryMonth">Mês</Label>
              <Select value={expiryMonth} onValueChange={setExpiryMonth} disabled={loading}>
                <SelectTrigger id="expiryMonth">
                  <SelectValue placeholder="MM" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, '0');
                    return <SelectItem key={month} value={month}>{month}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryYear">Ano</Label>
              <Select value={expiryYear} onValueChange={setExpiryYear} disabled={loading}>
                <SelectTrigger id="expiryYear">
                  <SelectValue placeholder="AA" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = (new Date().getFullYear() + i).toString().slice(-2);
                    return <SelectItem key={year} value={year}>{year}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="securityCode">CVV</Label>
              <Input
                id="securityCode"
                type="password"
                placeholder="123"
                value={securityCode}
                onChange={(e) => setSecurityCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                disabled={loading}
              />
            </div>
          </div>

          {/* CPF */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF do Titular</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => {
                const formatted = e.target.value
                  .replace(/\D/g, '')
                  .replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d)/, '$1.$2')
                  .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                  .slice(0, 14);
                setCpf(formatted);
              }}
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Parcelas - Apenas para Crédito */}
          {cardType === 'credit_card' && (
            <div className="space-y-2">
              <Label htmlFor="installments">Parcelas</Label>
              <Select value={installments} onValueChange={setInstallments} disabled={loading}>
                <SelectTrigger id="installments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const num = i + 1;
                    const installmentAmount = (amount / num).toFixed(2);
                    return (
                      <SelectItem key={num} value={num.toString()}>
                        {num}x de R$ {installmentAmount} {num === 1 ? '(à vista)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Total */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>R$ {amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              `Pagar R$ ${amount.toFixed(2)}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
