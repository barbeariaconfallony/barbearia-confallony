import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Clock, CreditCard, Calendar as CalendarIcon, User, ShoppingCart, ArrowLeft, Smartphone } from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PixPayment } from '@/components/PixPayment';
import { ClientSelectionModal } from '@/components/ClientSelectionModal';
import { type BookingData } from '@/components/ServiceBooking';
import { CardPaymentForm } from '@/components/CardPaymentForm';
import { Checkbox } from '@/components/ui/checkbox';

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
  sala_atendimento: string;
}

interface Employee {
  id: string;
  nome: string;
  especialidades: string[];
  ativo: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Appointment {
  id?: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_telefone: string;
  servico_id: string;
  servico_nome: string;
  funcionario_id?: string;
  funcionario_nome?: string;
  preco: number;
  data: Date;
  tempo_inicio: Date;
  tempo_fim: Date;
  forma_pagamento: string;
  status: 'aguardando' | 'em_atendimento' | 'concluido' | 'confirmado' | 'aguardando_confirmacao';
  data_criacao: Date;
  duracao: number;
  presente: boolean;
  timestamp: number;
  pagamento_parcial?: boolean;
  valor_restante?: number;
  valor_total?: number;
  valor_pago?: number;
}

interface ClienteData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

const BookingMobile = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [pixBookingData, setPixBookingData] = useState<BookingData | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<ClienteData | null>(null);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [pagarApenasUmTerco, setPagarApenasUmTerco] = useState(false);
  const [configAgendamento, setConfigAgendamento] = useState<{
    dias_semana: number[];
    horarios_disponiveis: string[];
  }>({
    dias_semana: [1, 2, 3, 4, 5, 6], // Seg a Sáb por padrão
    horarios_disponiveis: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch services
        const servicesSnapshot = await getDocs(collection(db, 'servicos'));
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Service));
        setServices(servicesData);

        // Fetch employees
        const employeesSnapshot = await getDocs(collection(db, 'funcionarios'));
        const employeesData = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Employee));
        
        setEmployees(employeesData);

        await fetchExistingAppointments();
        await fetchConfigAgendamento();
        if (currentUser) {
          await fetchUserAppointments();
        }
      } catch (error) {
        console.error("Error loading data:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados.",
          variant: "destructive"
        });
      }
    };

    fetchData();
  }, [currentUser]);

  const fetchExistingAppointments = async () => {
    try {
      const q = query(collection(db, 'fila'));
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const tempoInicio = data.tempo_inicio?.toDate() || data.data.toDate();
        const duracaoConfig = data.duracao || 40;
        const tempoFim = data.tempo_fim?.toDate() || 
          new Date(tempoInicio.getTime() + duracaoConfig * 60 * 1000);
        
        appointments.push({
          id: doc.id,
          usuario_id: data.usuario_id,
          usuario_nome: data.usuario_nome,
          usuario_email: data.usuario_email || '',
          usuario_telefone: data.usuario_telefone || '',
          servico_id: data.servico_id,
          servico_nome: data.servico_nome,
          funcionario_id: data.funcionario_id,
          funcionario_nome: data.funcionario_nome,
          preco: data.preco,
          data: data.data.toDate(),
          tempo_inicio: tempoInicio,
          tempo_fim: tempoFim,
          forma_pagamento: data.forma_pagamento,
          status: data.status,
          data_criacao: data.data_criacao.toDate(),
          duracao: data.duracao,
          presente: data.presente || false,
          timestamp: data.timestamp || data.data_criacao.toMillis()
        });
      });
      
      setExistingAppointments(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos existentes.",
        variant: "destructive"
      });
    }
  };

  const fetchConfigAgendamento = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'config_agendamento'));
      
      if (!snapshot.empty) {
        const config = snapshot.docs[0].data();
        setConfigAgendamento({
          dias_semana: config.dias_semana || [1, 2, 3, 4, 5, 6],
          horarios_disponiveis: config.horarios_disponiveis || []
        });
      } else {
        // Configuração padrão: horários de 8h às 19h
        const horariosDefault: string[] = [];
        for (let hour = 8; hour <= 19; hour++) {
          for (let minute = 0; minute < 60; minute += 30) {
            horariosDefault.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
          }
        }
        setConfigAgendamento({
          dias_semana: [1, 2, 3, 4, 5, 6],
          horarios_disponiveis: horariosDefault
        });
      }
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const fetchUserAppointments = async () => {
    if (!currentUser) return;
    
    try {
      const q = query(
        collection(db, 'fila'),
        where('usuario_id', '==', currentUser.uid)
      );
      const querySnapshot = await getDocs(q);
      const appointments: Appointment[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const tempoInicio = data.tempo_inicio?.toDate() || data.data.toDate();
        const duracaoConfig = data.duracao || 40;
        const tempoFim = data.tempo_fim?.toDate() || 
          new Date(tempoInicio.getTime() + duracaoConfig * 60 * 1000);
        
        appointments.push({
          id: doc.id,
          usuario_id: data.usuario_id,
          usuario_nome: data.usuario_nome,
          usuario_email: data.usuario_email || '',
          usuario_telefone: data.usuario_telefone || '',
          servico_id: data.servico_id,
          servico_nome: data.servico_nome,
          funcionario_id: data.funcionario_id,
          funcionario_nome: data.funcionario_nome,
          preco: data.preco,
          data: data.data.toDate(),
          tempo_inicio: tempoInicio,
          tempo_fim: tempoFim,
          forma_pagamento: data.forma_pagamento,
          status: data.status,
          data_criacao: data.data_criacao.toDate(),
          duracao: data.duracao,
          presente: data.presente || false,
          timestamp: data.timestamp || data.data_criacao.toMillis()
        });
      });
      
      setUserAppointments(appointments);
    } catch (error) {
      console.error("Error fetching user appointments:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus agendamentos.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedDate) {
      generateTimeSlots();
    }
  }, [selectedDate, existingAppointments, selectedService, configAgendamento]);

  const generateTimeSlots = () => {
    if (!selectedDate) return;

    const slots: TimeSlot[] = [];
    
    // Usar horários da configuração
    const horariosConfig = configAgendamento.horarios_disponiveis;
    
    if (horariosConfig.length === 0) {
      setTimeSlots([]);
      return;
    }
    
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, selectedDate)
    );

    horariosConfig.forEach(time => {
        let available = true;
        
        // Se um serviço foi selecionado, verificar disponibilidade baseada na sala_atendimento
        if (selectedService && selectedService.sala_atendimento) {
          // Contar agendamentos na mesma sala e horário
          const appointmentsInSameRoom = dateAppointments.filter(app => {
            const appointmentTime = format(app.tempo_inicio, 'HH:mm');
            const appointmentService = services.find(s => s.id === app.servico_id);
            return appointmentTime === time && 
                   appointmentService && 
                   appointmentService.sala_atendimento === selectedService.sala_atendimento;
          });
          
          // Se já existe agendamento na mesma sala e horário, não disponível
          available = appointmentsInSameRoom.length === 0;
        } else {
          // Lógica original: se não há serviço selecionado ou sala, verificar se horário está ocupado
          const bookedTimes = dateAppointments.map(app => format(app.tempo_inicio, 'HH:mm'));
          available = !bookedTimes.includes(time);
        }
        
        slots.push({ time, available });
    });
    setTimeSlots(slots);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleEmployeeSelect = () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: "Erro",
        description: "Selecione data e horário primeiro.",
        variant: "destructive"
      });
      return;
    }

    // Se for admin, pular verificação de agendamento existente para o dia
    if (!userData?.isAdmin) {
      // Verificar se já existe agendamento para este dia apenas para não-admins
      const hasAppointmentOnSelectedDate = userAppointments.some(app => 
        isSameDay(app.data, selectedDate)
      );

      if (hasAppointmentOnSelectedDate) {
        toast({
          title: "Atenção",
          description: "Você já tem um agendamento marcado para este dia. Escolha outra data.",
          variant: "destructive"
        });
        return;
      }
    }

    setStep(3);
  };

  const handleDateTimeConfirm = () => {
    if (!selectedEmployee) {
      toast({
        title: "Erro",
        description: "Selecione um cabeleireiro.",
        variant: "destructive"
      });
      return;
    }
    setStep(4);
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime || !paymentMethod) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    const valorFinal = pagarApenasUmTerco ? selectedService.preco / 3 : selectedService.preco;

    // Se for PIX, preparar dados e mostrar tela de pagamento
    if (paymentMethod === "PIX") {
      const valorRestante = selectedService.preco - valorFinal;
      const pixData: BookingData & {
        selectedService: any;
        selectedEmployee: any;
        selectedDate: Date;
        selectedTime: string;
        pagamento_parcial?: boolean;
        valor_parcial_restante?: number;
        valor_total?: number;
        valor_pago?: number;
      } = {
        service: selectedService.nome,
        serviceId: selectedService.id,
        date: format(selectedDate, "dd/MM/yyyy", { locale: ptBR }),
        time: selectedTime,
        amount: valorFinal,
        sala_atendimento: selectedService.sala_atendimento || '',
        selectedService,
        selectedEmployee,
        selectedDate,
        selectedTime,
        pagamento_parcial: pagarApenasUmTerco,
        valor_parcial_restante: pagarApenasUmTerco ? valorRestante : 0,
        valor_total: selectedService.preco,
        valor_pago: valorFinal,
      };
      
      setPixBookingData(pixData);
      setShowPixPayment(true);
      return;
    }

    // Se for Cartão de Crédito ou Débito, mostrar formulário de cartão
    if (paymentMethod === "credit_card" || paymentMethod === "debit_card") {
      setShowCardPayment(true);
      return;
    }

    // Para outros métodos de pagamento (PIX), o fluxo já está configurado acima
    toast({
      title: "Erro",
      description: "Método de pagamento inválido.",
      variant: "destructive"
    });
  };

  const handleClientSelection = (clienteData: ClienteData) => {
    setSelectedClientData(clienteData);
    setShowClientModal(false);
    // Salvar agendamento com os dados do cliente selecionado
    saveAppointmentToFirestore(clienteData);
  };

  const saveAppointmentToFirestore = async (clienteData?: ClienteData, paymentId?: string) => {
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Usar configuração de tempo do usuário ou padrão de 40 minutos
      const duracaoAtendimento = userData?.tempo_atendimento || 40;
      
      // Se há dados do cliente selecionado (para pagamento em dinheiro), usar esses dados
      // Caso contrário, usar dados do usuário autenticado (para outros métodos)
      const userName = clienteData?.nome || userData?.nome || currentUser?.displayName || 'Usuário';
      const userEmail = clienteData?.email || userData?.email || currentUser?.email || '';
      const userPhone = clienteData?.telefone || userData?.telefone || '';
      const userCpf = clienteData?.cpf || userData?.cpf || '';
      
      // Sempre usar o ID do usuário autenticado
      const usuarioId = currentUser?.uid || 'anonimo';

      const tempoInicio = new Date(appointmentDate);
      tempoInicio.setHours(hours, minutes, 0, 0);
      
      const tempoFim = new Date(appointmentDate);
      tempoFim.setHours(hours, minutes + duracaoAtendimento, 0, 0);

      const valorTotal = selectedService.preco;
      const valorPago = pagarApenasUmTerco ? valorTotal / 3 : valorTotal;
      const valorRestante = pagarApenasUmTerco ? (valorTotal * 2) / 3 : 0;

      const newAppointment: any = {
        usuario_id: usuarioId,
        usuario_nome: userName,
        usuario_email: userEmail,
        usuario_telefone: userPhone,
        usuario_cpf: userCpf,
        servico_id: selectedService.id,
        servico_nome: selectedService.nome,
        sala_atendimento: selectedService.sala_atendimento,
        funcionario_id: selectedEmployee.id,
        funcionario_nome: selectedEmployee.nome,
        preco: valorTotal,
        data: appointmentDate,
        tempo_inicio: tempoInicio,
        tempo_fim: tempoFim,
        forma_pagamento: paymentMethod,
        status: (paymentMethod === 'PIX' || paymentMethod === 'credit_card' || paymentMethod === 'debit_card') ? 'aguardando_confirmacao' : 'confirmado',
        data_criacao: new Date(),
        duracao: duracaoAtendimento,
        presente: (paymentMethod === 'PIX' || paymentMethod === 'credit_card' || paymentMethod === 'debit_card') ? false : true,
        timestamp: new Date().getTime()
      };

      // Adicionar campos de pagamento parcial se aplicável
      if (pagarApenasUmTerco) {
        console.log('Pagamento parcial detectado:', {
          pagarApenasUmTerco,
          valorTotal,
          valorPago,
          valorRestante
        });
        newAppointment.pagamento_parcial = true;
        newAppointment.valor_total = valorTotal;
        newAppointment.valor_pago = valorPago;
        newAppointment.valor_parcial_restante = valorRestante;
        newAppointment.valor_restante = valorRestante;
        newAppointment.status_restante = 'pendente';
      } else {
        newAppointment.pagamento_parcial = false;
        newAppointment.valor_parcial_restante = 0;
        newAppointment.valor_restante = 0;
      }

      console.log('Agendamento a ser salvo:', newAppointment);

      // Adicionar payment_id do Mercado Pago se fornecido
      if (paymentId) {
        newAppointment.payment_id = paymentId;
      }

      // Adicionar tipo de pagamento com cartão
      if (paymentMethod === 'credit_card') {
        newAppointment.tipo_pagamento_cartao = 'credito';
      } else if (paymentMethod === 'debit_card') {
        newAppointment.tipo_pagamento_cartao = 'debito';
      }

      await addDoc(collection(db, 'fila'), newAppointment);

      toast({
        title: "Agendamento confirmado!",
        description: `Agendamento salvo com sucesso para ${userName}.`
      });

      // Reset form
      resetForm();
      
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Erro",
        description: "Erro ao confirmar agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handlePixPaymentComplete = async () => {
    // O PixPayment já salva o agendamento quando aprovado
    // Apenas resetar o estado aqui
    setShowPixPayment(false);
    setPixBookingData(null);
    resetForm();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedDate(new Date());
    setSelectedTime("");
    setPaymentMethod("PIX");
    setSelectedClientData(null);
    setPagarApenasUmTerco(false);
    setShowCardPayment(false);
  };

  const isDateDisabled = (date: Date) => {
    const dayOfWeek = date.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Desabilitar se for anterior a hoje
    if (date < today) return true;
    
    // Desabilitar se for depois de 30 dias
    if (date > addDays(today, 30)) return true;
    
    // Se for admin, não desabilitar dias com agendamentos existentes
    if (!userData?.isAdmin) {
      // Desabilitar dias que já têm agendamento do usuário
      if (userAppointments.some(app => isSameDay(app.data, date))) return true;
    }
    
    // Desabilitar se o dia da semana não estiver configurado
    if (!configAgendamento.dias_semana.includes(dayOfWeek)) return true;
    
    return false;
  };

  const handleCardPaymentSuccess = async (paymentId: string) => {
    // Salvar agendamento com payment_id do Mercado Pago
    await saveAppointmentToFirestore(undefined, paymentId);
    setShowCardPayment(false);
  };

  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive"
    });
  };

  if (showCardPayment && selectedService) {
    const valorFinal = pagarApenasUmTerco ? selectedService.preco / 3 : selectedService.preco;
    
    return (
      <div className="min-h-screen bg-background pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button 
            variant="outline" 
            onClick={() => setShowCardPayment(false)}
            className="mb-4"
          >
            ← Voltar
          </Button>
          <CardPaymentForm
            amount={valorFinal}
            description={`${selectedService.nome} - ${format(selectedDate!, "dd/MM/yyyy")} às ${selectedTime}`}
            onSuccess={handleCardPaymentSuccess}
            onError={handleCardPaymentError}
            cardType={paymentMethod as 'credit_card' | 'debit_card'}
            clientData={{
              nome: userData?.nome || currentUser?.displayName || '',
              email: userData?.email || currentUser?.email || '',
              cpf: userData?.cpf || ''
            }}
          />
        </div>
      </div>
    );
  }

  if (showPixPayment && pixBookingData) {
    return (
      <div className="min-h-screen bg-background pb-safe">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Button 
            variant="outline" 
            onClick={() => setShowPixPayment(false)}
            className="mb-4"
          >
            ← Voltar
          </Button>
          <PixPayment 
            bookingData={pixBookingData} 
            onBack={() => setShowPixPayment(false)}
            onPaymentComplete={handlePixPaymentComplete}
            redirectTo="profile-mobile"
            isFromMobile={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header com botão voltar */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Agendar Serviço</h1>
            <p className="text-sm text-muted-foreground">Passo {step} de 4</p>
          </div>
        </div>

        {/* Indicador de progresso */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step >= stepNumber ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Passo 1: Lista de Serviços */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scissors className="h-5 w-5" />
                Escolha seu Serviço
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className="cursor-pointer hover:border-primary transition-all"
                    onClick={() => handleServiceSelect(service)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Scissors className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold">{service.nome}</h3>
                          </div>
                           <p className="text-sm text-muted-foreground mb-2">{service.descricao}</p>
                          
                          {/* Badge com sala de atendimento */}
                          {service.sala_atendimento && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-xs">
                                {service.sala_atendimento}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duracao}min
                            </Badge>
                            <span className="font-bold text-primary">R$ {service.preco}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passo 2: Data e Horário */}
        {step === 2 && selectedService && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Escolha Data e Horário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-1">Serviço selecionado:</h3>
                <p className="text-sm text-muted-foreground">{selectedService.nome} - R$ {selectedService.preco} ({selectedService.duracao} min) - Sala: {selectedService.sala_atendimento || 'Não definida'}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-4">Selecione a data:</h3>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={isDateDisabled}
                      className="rounded-md border w-full pointer-events-auto"
                      locale={ptBR}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Horários disponíveis:</h3>
                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? "default" : "outline"}
                        size="sm"
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className="text-xs"
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleEmployeeSelect} 
                className="w-full"
                disabled={!selectedDate || !selectedTime}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 3: Lista de Cabeleireiros */}
        {step === 3 && selectedService && selectedDate && selectedTime && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Escolha seu Cabeleireiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Resumo do agendamento:</h3>
                <p className="text-sm">Serviço: {selectedService.nome}</p>
                <p className="text-sm">Sala: {selectedService.sala_atendimento || 'Não definida'}</p>
                <p className="text-sm">Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                <p className="text-sm">Horário: {selectedTime}</p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Selecione seu cabeleireiro:</h3>
                {employees.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum funcionário encontrado.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {employees
                      .filter(emp => emp.ativo)
                      .map((employee) => (
                        <Card
                          key={employee.id}
                          className={`cursor-pointer hover:border-primary transition-all ${
                            selectedEmployee?.id === employee.id ? 'border-primary' : ''
                          }`}
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{employee.nome}</h3>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {employee.especialidades.map((esp, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {esp}
                                  </Badge>
                                ))}
                                {employee.especialidades.length === 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Todos os serviços
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={handleDateTimeConfirm} 
                disabled={!selectedEmployee}
                className="w-full"
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Passo 4: Finalizar Agendamento (mantido igual) */}
        {step === 4 && selectedService && selectedEmployee && selectedDate && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Finalizar Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h3 className="font-semibold">Resumo do agendamento:</h3>
                <p className="text-sm">Serviço: {selectedService.nome}</p>
                <p className="text-sm">Sala: {selectedService.sala_atendimento || 'Não definida'}</p>
                <p className="text-sm">Profissional: {selectedEmployee.nome}</p>
                <p className="text-sm">Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                <p className="text-sm">Horário: {selectedTime}</p>
                
                <div className="border-t pt-2 mt-3">
                  <h4 className="font-medium text-sm mb-2">Dados do cliente:</h4>
                  <p className="text-sm">Nome: {userData?.nome || currentUser?.displayName || 'Não informado'}</p>
                  <p className="text-sm">Email: {userData?.email || currentUser?.email || 'Não informado'}</p>
                  <p className="text-sm">Telefone: {userData?.telefone || 'Não informado'}</p>
                  <p className="text-sm">CPF: {userData?.cpf || 'Não informado'}</p>
                </div>
                
                <p className="text-lg font-bold text-primary border-t pt-2">Total: R$ {selectedService.preco}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Escolha a forma de pagamento:</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    <Label htmlFor="pix" className="cursor-pointer">
                      <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                        <RadioGroupItem value="PIX" id="pix" />
                        <Smartphone className="h-5 w-5 text-primary" />
                        <span>PIX</span>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Opção de pagamento parcial */}
              <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
                <Checkbox
                  id="parcial"
                  checked={pagarApenasUmTerco}
                  onCheckedChange={(checked) => setPagarApenasUmTerco(checked as boolean)}
                />
                <Label htmlFor="parcial" className="cursor-pointer text-sm">
                  Pagar apenas 1/3 agora (R$ {(selectedService.preco / 3).toFixed(2)})
                  <span className="block text-xs text-muted-foreground mt-1">
                    Restante (R$ {((selectedService.preco * 2) / 3).toFixed(2)}) após o serviço
                  </span>
                </Label>
              </div>

              <Button 
                onClick={handleConfirmBooking} 
                disabled={isLoading} 
                className="w-full"
              >
                {isLoading 
                  ? "Confirmando..." 
                  : paymentMethod === "PIX" 
                    ? `Pagar com PIX ${pagarApenasUmTerco ? `(R$ ${(selectedService.preco / 3).toFixed(2)})` : ''}` 
                    : paymentMethod === "credit_card" 
                      ? `Pagar com Cartão de Crédito ${pagarApenasUmTerco ? `(R$ ${(selectedService.preco / 3).toFixed(2)})` : ''}` 
                      : paymentMethod === "debit_card" 
                        ? `Pagar com Cartão de Débito ${pagarApenasUmTerco ? `(R$ ${(selectedService.preco / 3).toFixed(2)})` : ''}` 
                        : "Confirmar Agendamento"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de seleção de cliente para pagamento em dinheiro */}
      <ClientSelectionModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onClientSelected={handleClientSelection}
      />
    </div>
  );
};

export default BookingMobile;
