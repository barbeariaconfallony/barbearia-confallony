import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Clock, CreditCard, Smartphone, Banknote, DollarSign, Calendar as CalendarIcon, User } from "lucide-react";
import { format, addDays, isToday, isTomorrow, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PixPayment } from '@/components/PixPayment';
import { ClientSelectionModal } from '@/components/ClientSelectionModal';
import { type BookingData } from '@/components/ServiceBooking';

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
  status: 'aguardando' | 'em_atendimento' | 'concluido' | 'confirmado';
  data_criacao: Date;
  duracao: number;
  presente: boolean;
  timestamp: number;
}

interface BookingFormData {
  nome: string;
  sobrenome: string;
  email: string;
  cpf: string;
  telefone: string;
}

interface ClienteData {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

const Index = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);
  const [showPixPayment, setShowPixPayment] = useState(false);
  const [bookingFormData, setBookingFormData] = useState<BookingFormData>({
    nome: '',
    sobrenome: '',
    email: '',
    cpf: '',
    telefone: ''
  });
  const [pixBookingData, setPixBookingData] = useState<BookingData | null>(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientData, setSelectedClientData] = useState<ClienteData | null>(null);

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
        
        console.log("Funcionários carregados:", employeesData);
        setEmployees(employeesData);

        await fetchExistingAppointments();
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
        const duracaoConfig = data.duracao || 40; // Usar duração salva ou padrão de 40
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
        const duracaoConfig = data.duracao || 40; // Usar duração salva ou padrão de 40
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
  }, [selectedDate, existingAppointments, selectedService]);

  const generateTimeSlots = () => {
    if (!selectedDate) return;

    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 19;
    
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, selectedDate)
    );

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 30) continue;
        
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
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
          
          // Se já existem 2 ou mais agendamentos na mesma sala e horário, não disponível
          available = appointmentsInSameRoom.length < 2;
        } else {
          // Lógica original: se não há serviço selecionado ou sala, verificar se horário está ocupado
          const bookedTimes = dateAppointments.map(app => format(app.tempo_inicio, 'HH:mm'));
          available = !bookedTimes.includes(time);
        }
        
        slots.push({ time, available });
      }
    }
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

    // Se for PIX, preparar dados e mostrar tela de pagamento
    if (paymentMethod === "PIX") {
      const pixData: BookingData & {
        selectedService: any;
        selectedEmployee: any;
        selectedDate: Date;
        selectedTime: string;
      } = {
        service: selectedService.nome,
        serviceId: selectedService.id,
        date: format(selectedDate, "dd/MM/yyyy", { locale: ptBR }),
        time: selectedTime,
        amount: selectedService.preco,
        sala_atendimento: selectedService.sala_atendimento || '',
        selectedService,
        selectedEmployee,
        selectedDate,
        selectedTime
      };
      
      setPixBookingData(pixData);
      setShowPixPayment(true);
      return;
    }

    // Se for Dinheiro, mostrar modal de seleção de cliente
    if (paymentMethod === "Dinheiro Físico") {
      setShowClientModal(true);
      return;
    }

    // Para outros métodos de pagamento, salvar diretamente
    await saveAppointmentToFirestore();
  };

  const handleClientSelection = (clienteData: ClienteData) => {
    setSelectedClientData(clienteData);
    setShowClientModal(false);
    // Salvar agendamento com os dados do cliente selecionado
    saveAppointmentToFirestore(clienteData);
  };

  const saveAppointmentToFirestore = async (clienteData?: ClienteData) => {
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime) return;

    setIsLoading(true);
    try {
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      // Usar configuração de tempo do usuário ou padrão de 40 minutos
      const duracaoAtendimento = userData?.tempo_atendimento || 40;
      
      // Se há dados do cliente selecionado (para pagamento em dinheiro), usar esses dados
      // Caso contrário, usar dados do usuário autenticado (para outros métodos)
      const userName = clienteData?.nome || bookingFormData.nome || userData?.nome || currentUser?.displayName || 'Usuário';
      const userEmail = clienteData?.email || bookingFormData.email || userData?.email || currentUser?.email || '';
      const userPhone = clienteData?.telefone || bookingFormData.telefone || userData?.telefone || '';
      const userCpf = clienteData?.cpf || userData?.cpf || '';
      
      // Sempre usar o ID do usuário autenticado
      const usuarioId = currentUser?.uid || 'anonimo';

      const tempoInicio = new Date(appointmentDate);
      tempoInicio.setHours(hours, minutes, 0, 0);
      
      const tempoFim = new Date(appointmentDate);
      tempoFim.setHours(hours, minutes + duracaoAtendimento, 0, 0);

      const newAppointment = {
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
        preco: selectedService.preco,
        data: appointmentDate,
        tempo_inicio: tempoInicio,
        tempo_fim: tempoFim,
        forma_pagamento: paymentMethod,
        status: paymentMethod === 'PIX' ? 'aguardando_confirmacao' : 'confirmado',
        data_criacao: new Date(),
        duracao: duracaoAtendimento,
        presente: paymentMethod === 'PIX' ? false : true,
        timestamp: new Date().getTime()
      };

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
  };

  const resetForm = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedEmployee(null);
    setSelectedDate(new Date());
    setSelectedTime("");
    setPaymentMethod("");
    setSelectedClientData(null);
    setBookingFormData({
      nome: '',
      sobrenome: '',
      email: '',
      cpf: '',
      telefone: ''
    });
  };

  const isDateDisabled = (date: Date) => {
    // Se for admin, não aplicar filtro de datas já ocupadas
    if (userData?.isAdmin) {
      return (
        date < new Date() || 
        date > addDays(new Date(), 30) ||
        date.getDay() === 0
      );
    }
    
    return (
      date < new Date() || 
      date > addDays(new Date(), 30) ||
      date.getDay() === 0 ||
      userAppointments.some(app => isSameDay(app.data, date))
    );
  };

  if (showPixPayment && pixBookingData) {
    return (
      <Layout>
        <div className="min-h-screen bg-background py-8">
          <div className="container mx-auto px-4">
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
            />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 px-4 w-[100%] h-[100%] mx-auto">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Agendar Atendimento</h1>
            <p className="text-muted-foreground">Escolha seu serviço e horário preferido</p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= stepNumber ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 4 && (
                    <div className={`w-16 h-0.5 ${
                      step > stepNumber ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Escolha seu Serviço
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <Card
                      key={service.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-6">
                        <div className="text-center">
                          <Scissors className="h-8 w-8 mx-auto mb-3 text-primary" />
                          <h3 className="font-semibold mb-2">{service.nome}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{service.descricao}</p>
                          
                          {/* Badge com sala de atendimento */}
                          {service.sala_atendimento && (
                            <div className="mb-3">
                              <Badge variant="outline" className="text-xs">
                                {service.sala_atendimento}
                              </Badge>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {service.duracao}min
                            </Badge>
                            <span className="font-bold text-primary">R$ {service.preco}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-4">Selecione a data:</h3>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={isDateDisabled}
                      className="rounded-md border"
                      locale={ptBR}
                    />
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

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button onClick={handleEmployeeSelect}>
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && selectedService && selectedDate && selectedTime && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Escolha seu Profissional
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

                <div>
                  <h3 className="font-semibold mb-4">Selecione seu profissional:</h3>
                  {employees.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum funcionário encontrado.</p>
                    </div>
                  ) : (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {employees
                         .filter(emp => emp.ativo)
                         .map((employee) => (
                        <Card
                          key={employee.id}
                          className={`cursor-pointer hover:shadow-lg transition-all ${
                            selectedEmployee?.id === employee.id ? 'border-primary' : ''
                          }`}
                          onClick={() => setSelectedEmployee(employee)}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="bg-primary/10 p-2 rounded-full">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
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

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleDateTimeConfirm} 
                    disabled={!selectedEmployee}
                  >
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && selectedService && selectedEmployee && selectedDate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Forma de Pagamento
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Label htmlFor="pix" className="cursor-pointer">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value="PIX" id="pix" />
                          <Smartphone className="h-5 w-5 text-primary" />
                          <span>PIX</span>
                        </div>
                      </Label>
                      <Label htmlFor="dinheiro" className="cursor-pointer">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value="Dinheiro Físico" id="dinheiro" />
                          <Banknote className="h-5 w-5 text-primary" />
                          <span>Dinheiro</span>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleConfirmBooking} 
                    disabled={isLoading} 
                    className="flex-1"
                  >
                    {isLoading ? "Confirmando..." : paymentMethod === "PIX" ? "Pagar com PIX" : "Confirmar Agendamento"}
                  </Button>
                </div>
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
    </Layout>
  );
};

export default Index;