import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, QrCode, CheckCircle, Clock, XCircle, ArrowLeft, User, Mail, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { format, parse } from 'date-fns';
import type { BookingData } from './ServiceBooking';
import type { CreatePixPaymentRequest, MercadoPagoPaymentResponse, PaymentStatusResponse } from '@/types/mercadopago';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { collection, addDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ClientDropdownSelector } from './ClientDropdownSelector';
interface PixPaymentProps {
  bookingData: BookingData & {
    selectedService?: any;
    selectedEmployee?: any;
    selectedDate?: Date;
    selectedTime?: string;
    pagamento_parcial?: boolean;
    valor_parcial_restante?: number;
    valor_total?: number;
    valor_pago?: number;
  };
  onBack: () => void;
  onPaymentComplete?: () => Promise<void>;
  redirectTo?: 'profile' | 'profile-mobile';
  isFromMobile?: boolean;
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
const GeneratedQRCode: React.FC<{
  qrText: string;
}> = ({
  qrText
}) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Usar URL direta para imagem QR Code sem fetch problemático
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
    return <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  return <img src={qrCodeDataUrl} alt="QR Code Pix" className="w-48 h-48 object-contain" />;
};
export const PixPayment: React.FC<PixPaymentProps> = ({
  bookingData,
  onBack,
  onPaymentComplete,
  redirectTo = 'profile',
  isFromMobile = false
}) => {
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
  const [currentPaymentId, setCurrentPaymentId] = useState<string | null>(null);
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const {
    currentUser,
    userData: authUserData
  } = useAuth(); // Obter usuário atual e seus dados

  // Carregar dados salvos do localStorage ou do usuário autenticado
  useEffect(() => {
    console.log('PixPayment - bookingData:', bookingData);
    console.log('PixPayment - selectedService:', bookingData.selectedService);
    
    // Se for pagamento restante, buscar dados do cliente da coleção usuarios
    const isPaymentRestante = bookingData.service?.includes('Pagamento Restante');
    console.log('PixPayment - isPaymentRestante:', isPaymentRestante);
    
    if (isPaymentRestante && bookingData.selectedService?.usuario_id) {
      console.log('PixPayment - Buscando dados do usuário:', bookingData.selectedService.usuario_id);
      
      const fetchUserData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'usuarios', bookingData.selectedService.usuario_id));
          console.log('PixPayment - userDoc exists:', userDoc.exists());
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('PixPayment - userData:', userData);
            
            const [firstName, ...lastNameParts] = (userData.nome || '').split(' ');
            const lastName = lastNameParts.join(' ');
            
            const newUserData = {
              firstName: firstName || '',
              lastName: lastName || '',
              email: userData.email || '',
              cpf: userData.cpf || ''
            };
            
            console.log('PixPayment - Setting userData:', newUserData);
            setUserData(newUserData);
            setShowUserForm(false);
          } else {
            console.error('Usuário não encontrado na coleção usuarios');
            toast({
              title: "Erro",
              description: "Dados do cliente não encontrados.",
              variant: "destructive"
            });
          }
        } catch (error) {
          console.error('Erro ao buscar dados do usuário:', error);
          toast({
            title: "Erro",
            description: "Erro ao carregar dados do cliente.",
            variant: "destructive"
          });
        }
      };
      fetchUserData();
      return;
    }

    // Se for do mobile, usar dados do usuário autenticado
    if (isFromMobile && authUserData) {
      const [firstName, ...lastNameParts] = authUserData.nome.split(' ');
      const lastName = lastNameParts.join(' ');
      
      setUserData({
        firstName: firstName || '',
        lastName: lastName || '',
        email: authUserData.email || '',
        cpf: authUserData.cpf || ''
      });
      setShowUserForm(false);
      return;
    }

    // Caso contrário, carregar do localStorage (para booking-local)
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

    // Carregar paymentId salvo se existir
    const savedPaymentId = localStorage.getItem('currentPaymentId');
    if (savedPaymentId) {
      setCurrentPaymentId(savedPaymentId);
    }
  }, [isFromMobile, authUserData, bookingData]);

  // Salvar dados do usuário no localStorage
  const saveUserDataToStorage = (data: UserData) => {
    localStorage.setItem('pixUserData', JSON.stringify(data));
  };
  const handleInputChange = (field: keyof UserData, value: string) => {
    setUserData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const formatCPF = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length <= 11) {
      return cleanValue.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return cleanValue.slice(0, 14);
  };
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

  // Função para salvar pagamento no Supabase
  const savePaymentToSupabase = async (paymentData: any): Promise<boolean> => {
    // Verificar se Supabase está configurado antes de tentar salvar
    if (!isSupabaseConfigured()) {
      console.log('Supabase não configurado - salvando dados localmente');
      // Salvar no localStorage como fallback
      try {
        const payments = JSON.parse(localStorage.getItem('payments') || '[]');
        payments.push({
          ...paymentData,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('payments', JSON.stringify(payments));
        return true;
      } catch (error) {
        console.error('Erro ao salvar no localStorage:', error);
        return false;
      }
    }

    try {
      const {
        data,
        error
      } = await supabase.from('payments').insert([{
        status: paymentData.status,
        transaction_amount: paymentData.transaction_amount,
        description: paymentData.description,
        payer_email: paymentData.payer_email,
        payer_name: paymentData.payer_name,
        payer_cpf: paymentData.payer_cpf,
        payment_method: 'pix',
        external_reference: paymentData.external_reference,
        qr_code: paymentData.qr_code,
        qr_code_base64: paymentData.qr_code_base64,
        ticket_url: paymentData.ticket_url,
        raw_response: paymentData.raw_response
      }]).select();
      if (error) {
        console.error('Erro ao salvar pagamento no Supabase:', error);
        return false;
      }
      console.log('Pagamento salvo no Supabase:', data);
      return true;
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      return false;
    }
  };

  // Função para atualizar status do pagamento no Supabase
  const updatePaymentStatusInSupabase = async (paymentId: string, status: string): Promise<boolean> => {
    // Verificar se Supabase está configurado antes de tentar atualizar
    if (!isSupabaseConfigured()) {
      console.log('Supabase não configurado - atualizando dados localmente');
      // Atualizar no localStorage como fallback
      try {
        const payments = JSON.parse(localStorage.getItem('payments') || '[]');
        const updatedPayments = payments.map((payment: any) => 
          payment.external_reference === paymentId 
            ? { 
                ...payment, 
                status: status,
                updated_at: new Date().toISOString(),
                approved_at: status === 'approved' ? new Date().toISOString() : payment.approved_at
              }
            : payment
        );
        localStorage.setItem('payments', JSON.stringify(updatedPayments));
        return true;
      } catch (error) {
        console.error('Erro ao atualizar no localStorage:', error);
        return false;
      }
    }

    try {
      const {
        error
      } = await supabase.from('payments').update({
        status: status,
        updated_at: new Date().toISOString(),
        approved_at: status === 'approved' ? new Date().toISOString() : null
      }).eq('external_reference', paymentId);
      if (error) {
        console.error('Erro ao atualizar status no Supabase:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      return false;
    }
  };

  // Função para salvar agendamento no Firestore quando pagamento aprovado
  const saveAppointmentToFirestore = async (paymentId: string) => {
    try {
      // Verificar se é um pagamento restante (agendamento já existe)
      const isPaymentRestante = bookingData.service?.includes('Pagamento Restante');
      
      if (isPaymentRestante && bookingData.serviceId) {
        // É pagamento restante - finalizar o agendamento existente
        console.log('Pagamento restante detectado, finalizando agendamento:', bookingData.serviceId);
        
        const agendamentoRef = doc(db, 'fila', bookingData.serviceId);
        const agendamentoDoc = await getDoc(agendamentoRef);
        
        if (!agendamentoDoc.exists()) {
          throw new Error('Agendamento não encontrado');
        }

        const agendamentoData = agendamentoDoc.data();
        const now = new Date();

        // Criar documento em agendamentos_finalizados
        const completedAppointment = {
          ...agendamentoData,
          status: 'concluido',
          tempo_fim: agendamentoData.tempo_fim || now,
          data_conclusao: now,
          pagamento_parcial: 'pago',
          forma_pagamento_restante: 'PIX',
          payment_id_restante: paymentId,
          valor_total: agendamentoData.valor_total || agendamentoData.preco || 0,
          valor_pago_inicial: (agendamentoData.valor_total || agendamentoData.preco || 0) / 3,
          valor_pago_restante: bookingData.amount,
        };

        await addDoc(collection(db, 'agendamentos_finalizados'), completedAppointment);

        // Remover da fila
        await deleteDoc(agendamentoRef);

        toast({
          title: "Pagamento concluído!",
          description: "O atendimento foi finalizado com sucesso."
        });
        
        return true;
      }

      // Fluxo normal de novo agendamento
      let appointmentDate: Date;

      // Se temos dados específicos do agendamento, usar eles
      if (bookingData.selectedDate && bookingData.selectedTime) {
        const [hours, minutes] = bookingData.selectedTime.split(':').map(Number);
        // Criar a data diretamente com os valores corretos
        appointmentDate = new Date(
          bookingData.selectedDate.getFullYear(),
          bookingData.selectedDate.getMonth(),
          bookingData.selectedDate.getDate(),
          hours,
          minutes,
          0,
          0
        );
      } else {
        appointmentDate = new Date();
      }
      const userName = `${userData.firstName} ${userData.lastName}`;
      const userPhone = authUserData?.telefone || '';
      const tempoInicio = new Date(appointmentDate);
      const tempoFim = new Date(appointmentDate);
      const duracao = bookingData.selectedService?.duracao || 30;
      tempoFim.setMinutes(tempoFim.getMinutes() + duracao);
      const isPartial = !!(bookingData.pagamento_parcial ?? (bookingData.selectedService?.preco && bookingData.amount < bookingData.selectedService.preco));
      const valorTotal = Number(bookingData.valor_total ?? bookingData.selectedService?.preco ?? bookingData.amount);
      const valorPago = Number(bookingData.valor_pago ?? bookingData.amount);
      const valorRestante = isPartial ? Math.max(0, valorTotal - valorPago) : 0;

      const newAppointment = {
        usuario_id: currentUser?.uid || 'pix_customer',
        usuario_nome: userName,
        usuario_email: userData.email,
        usuario_telefone: userPhone,
        servico_id: bookingData.selectedService?.id || bookingData.serviceId || 'pix_service',
        servico_nome: bookingData.service,
        sala_atendimento: bookingData.sala_atendimento || bookingData.selectedService?.sala_atendimento || '',
        funcionario_id: bookingData.selectedEmployee?.id || '',
        funcionario_nome: bookingData.selectedEmployee?.nome || '',
        preco: valorTotal,
        data: appointmentDate,
        tempo_inicio: tempoInicio,
        tempo_fim: tempoFim,
        forma_pagamento: 'PIX',
        status: 'confirmado',
        data_criacao: new Date(),
        duracao: duracao,
        presente: true,
        timestamp: new Date().getTime(),
        payment_id: paymentId,
        payer_cpf: userData.cpf.replace(/\D/g, ''),
        pagamento_parcial: isPartial,
        valor_parcial_restante: valorRestante,
        valor_restante: valorRestante,
        valor_total: valorTotal,
        valor_pago: valorPago,
        status_restante: isPartial ? 'pendente' : 'quitado',
      };
      const docRef = await addDoc(collection(db, 'fila'), newAppointment);
      console.log('Agendamento salvo no Firestore:', newAppointment);
      
      toast({
        title: "Agendamento confirmado!",
        description: "Seu agendamento foi salvo com sucesso na fila de atendimento."
      });
      return true;
    } catch (error) {
      console.error("Erro ao salvar agendamento no Firestore:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar agendamento. Entre em contato conosco.",
        variant: "destructive"
      });
      return false;
    }
  };
  const handleUserDataSubmit = () => {
    if (validateUserData()) {
      saveUserDataToStorage(userData);
      setShowUserForm(false);
      toast({
        title: "Dados salvos!",
        description: "Seus dados foram salvos com sucesso."
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
      console.log('Enviando requisição para criar pagamento PIX');
      console.log('Payload:', JSON.stringify(paymentRequest, null, 2));
      
      // Usar supabase.functions.invoke ao invés de fetch direto
      const { data, error: invokeError } = await supabase.functions.invoke('create-pix-payment', {
        body: paymentRequest
      });

      console.log('Resposta da função:', { data, error: invokeError });

      if (invokeError) {
        console.error('Erro ao invocar função:', invokeError);
        throw new Error(`Erro na API: ${invokeError.message || JSON.stringify(invokeError)}`);
      }

      if (!data) {
        throw new Error('Resposta vazia da API');
      }

      // Se data contém um erro (algumas vezes o erro vem no data)
      if (data.error) {
        console.error('Erro retornado pela função:', data.error);
        throw new Error(`Erro da API: ${data.error}${data.details ? ' - ' + data.details : ''}`);
      }

      const result: MercadoPagoPaymentResponse = data;
      console.log('Resposta recebida da API:', result);
      console.log('Resposta completa da API:', result);
      const newPaymentData: PaymentData = {
        id: result.id.toString(),
        qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        status: result.status as 'pending' | 'approved' | 'rejected' | 'cancelled'
      };
      setPaymentData(newPaymentData);
      setPaymentStatus(result.status as 'pending' | 'approved' | 'rejected' | 'cancelled');
      setCurrentPaymentId(result.id.toString());

      // Salvar paymentId no localStorage
      localStorage.setItem('currentPaymentId', result.id.toString());

      // Salvar pagamento no Supabase
      const supabasePaymentData = {
        status: result.status,
        transaction_amount: bookingData.amount,
        description: `Agendamento: ${bookingData.service} - ${bookingData.date} ${bookingData.time}`,
        payer_email: userData.email,
        payer_name: `${userData.firstName} ${userData.lastName}`,
        payer_cpf: userData.cpf.replace(/\D/g, ''),
        external_reference: result.id.toString(),
        qr_code: result.point_of_interaction?.transaction_data?.qr_code || '',
        qr_code_base64: result.point_of_interaction?.transaction_data?.qr_code_base64 || '',
        ticket_url: result.point_of_interaction?.transaction_data?.ticket_url || '',
        raw_response: result
      };
      const saved = await savePaymentToSupabase(supabasePaymentData);
      if (!saved) {
        console.warn('Pagamento não foi salvo no Supabase, mas continuando o processo...');
      }
      toast({
        title: "QR Code gerado com sucesso!",
        description: "Escaneie o código ou copie o código Pix para realizar o pagamento."
      });

      // Inicia o polling para verificar o status do pagamento
      startPaymentStatusPolling(result.id.toString());
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      let errorMessage = 'Erro desconhecido';
      let errorDescription = 'Verifique se o backend está configurado corretamente.';
      if (error instanceof Error) {
        errorMessage = error.message;
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
        // Usar supabase client com URL correta
        const { data: statusData, error } = await supabase.functions.invoke('check-payment-status', {
          body: { paymentId }
        });
        
        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        console.log('Status check response:', statusData);
        
        if (statusData && statusData.status) {
          if (statusData.status !== paymentStatus) {
            setPaymentStatus(statusData.status);

            // Atualizar status no Supabase
            await updatePaymentStatusInSupabase(paymentId, statusData.status);
            
            if (statusData.status === 'approved') {
              clearInterval(interval);

              // Salvar agendamento no Firestore
              const saved = await saveAppointmentToFirestore(paymentId);
              if (saved) {
                toast({
                  title: "Pagamento concluído! ✅",
                  description: "Seu agendamento foi confirmado e salvo na fila de atendimento."
                });

                // Redirecionar baseado na origem após 2 segundos
                setTimeout(() => {
                  console.log(`Redirecionando para: /${redirectTo}`);
                  navigate(`/${redirectTo}`);
                }, 2000);

                // Chama a função adicional se fornecida
                if (onPaymentComplete) {
                  await onPaymentComplete();
                }
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
        console.error('Erro ao verificar status do pagamento:', error);
      }
    }, 5000);

    // Para o polling após 10 minutos (600 segundos)
    setTimeout(() => {
      clearInterval(interval);
      console.log('Polling de status encerrado após 10 minutos');
    }, 600000);
  };
  const copyPixCode = async () => {
    if (paymentData?.qr_code) {
      try {
        await navigator.clipboard.writeText(paymentData.qr_code);
        toast({
          title: "Código copiado!",
          description: "Cole no seu app do banco para fazer o pagamento."
        });
      } catch (error) {
        // Fallback para navegadores que não suportam clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = paymentData.qr_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Código copiado!",
          description: "Cole no seu app do banco para fazer o pagamento."
        });
      }
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
        return;
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
    return <Card className="w-full max-w-2xl mx-auto shadow-card">
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
          {/* Mostrar seleção de cliente apenas no booking-local e se não for pagamento restante */}
          {!isFromMobile && !bookingData.service?.includes('Pagamento Restante') && (
            <>
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
            </>
          )}

          {/* Formulário de dados pessoais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <Input id="firstName" value={userData.firstName} onChange={e => handleInputChange('firstName', e.target.value)} placeholder="Seu primeiro nome" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input id="lastName" value={userData.lastName} onChange={e => handleInputChange('lastName', e.target.value)} placeholder="Seu sobrenome" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email *
            </Label>
            <Input id="email" type="email" value={userData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="seu@email.com" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              CPF *
            </Label>
            <Input id="cpf" value={userData.cpf} onChange={e => handleInputChange('cpf', formatCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} required />
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
      </Card>;
  }
  if (!paymentData && loading) {
    return <Card className="w-full max-w-2xl mx-auto shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Gerando QR Code Pix...</p>
        </CardContent>
      </Card>;
  }
  if (paymentStatus === 'approved') {
    return <Card className="w-full max-w-2xl mx-auto shadow-lg border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="mb-6 relative">
            <div className="absolute inset-0 animate-ping">
              <CheckCircle className="w-20 h-20 text-primary/30" />
            </div>
            <CheckCircle className="w-20 h-20 text-primary relative" />
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-3">
            Pagamento Aprovado!
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Seu agendamento foi confirmado com sucesso
          </p>
          
          <div className="w-full max-w-md space-y-4">
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
              <h3 className="font-semibold text-lg mb-4 text-foreground">Detalhes do Agendamento</h3>
              <div className="space-y-3 text-left">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Serviço</span>
                  <span className="font-medium">{bookingData.service}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Data</span>
                  <span className="font-medium">{bookingData.date}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Horário</span>
                  <span className="font-medium">{bookingData.time}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Cliente</span>
                  <span className="font-medium">{userData.firstName} {userData.lastName}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Valor Pago</span>
                  <span className="font-bold text-primary text-lg">
                    R$ {bookingData.amount.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="w-full max-w-2xl mx-auto shadow-card bg-gradient-card">
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
            <p><strong>Data:</strong> {(() => {
              try {
                const date = new Date(bookingData.date);
                return format(date, 'dd/MM/yyyy');
              } catch {
                return bookingData.date;
              }
            })()}</p>
            <p><strong>Horário:</strong> {(() => {
              try {
                // Se já estiver no formato HH:mm, usar diretamente
                if (bookingData.time && /^\d{2}:\d{2}/.test(bookingData.time)) {
                  return bookingData.time.slice(0, 5);
                }
                // Caso contrário, tentar parsear
                const time = new Date(bookingData.time);
                return format(time, 'HH:mm');
              } catch {
                return bookingData.time;
              }
            })()}</p>
            <p><strong>Cliente:</strong> {userData.firstName} {userData.lastName}</p>
            <p><strong>CPF:</strong> {userData.cpf}</p>
            <p className="text-lg font-bold text-primary">
              <strong>Valor:</strong> R$ {bookingData.amount.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </div>

        {/* QR Code e Pagamento */}
        {paymentData && <div className="space-y-4">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg border">
              {paymentData.qr_code_base64 ? <img src={`data:image/png;base64,${paymentData.qr_code_base64}`} alt="QR Code Pix" className="w-48 h-48 object-contain" /> : paymentData.qr_code ? <GeneratedQRCode qrText={paymentData.qr_code} /> : paymentData.ticket_url ? <div className="text-center">
                  <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-4" />
                  <Button onClick={openTicketUrl} variant="outline" size="sm">
                    Abrir Pagamento
                  </Button>
                </div> : <div className="text-center">
                  <QrCode className="w-32 h-32 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Dados de pagamento não disponíveis
                  </p>
                </div>}
              
              <p className="text-sm text-muted-foreground text-center mt-4">
                Escaneie este QR Code com seu app do banco
              </p>
            </div>

            {/* Código Pix */}
            {paymentData.qr_code && <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Ou copie o código Pix:</label>
                <div className="flex gap-2">
                  <input type="text" value={paymentData.qr_code} readOnly className="flex-1 px-3 py-2 text-xs border border-border rounded-md bg-muted text-muted-foreground font-mono" />
                  <Button onClick={copyPixCode} variant="outline" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>}

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

            {paymentStatus === 'pending' && <div className="text-center">
                <div className="animate-pulse flex items-center justify-center gap-2 text-warning">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Aguardando pagamento...</span>
                </div>
              </div>}
          </div>}
      </CardContent>
    </Card>;
};