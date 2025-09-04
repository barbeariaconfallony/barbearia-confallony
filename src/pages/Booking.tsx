import { useState, useEffect } from "react";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Scissors, Clock, CreditCard, Calendar as CalendarIcon, User, ShoppingCart } from "lucide-react";
import { format, addDays, isToday, isTomorrow, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
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
  status: 'aguardando' | 'em_atendimento' | 'concluido' | 'confirmado' | 'pago' | 'aguardando_pagamento';
  data_criacao: Date;
  duracao: number;
  presente: boolean;
  timestamp: number;
  payment_status?: 'pending' | 'approved' | 'rejected';
  pix_copiacola?: string;
  pix_valor?: number;
  pix_chave?: string;
}

const Booking = () => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([]);
  const [userAppointments, setUserAppointments] = useState<Appointment[]>([]);

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
        const tempoFim = data.tempo_fim?.toDate() || 
          new Date(tempoInicio.getTime() + (data.duracao || 30) * 60 * 1000);
        
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
          timestamp: data.timestamp || data.data_criacao.toMillis(),
          payment_status: data.payment_status,
          pix_copiacola: data.pix_copiacola
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
        const tempoFim = data.tempo_fim?.toDate() || 
          new Date(tempoInicio.getTime() + (data.duracao || 30) * 60 * 1000);
        
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
          timestamp: data.timestamp || data.data_criacao.toMillis(),
          payment_status: data.payment_status,
          pix_copiacola: data.pix_copiacola
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
  }, [selectedDate, existingAppointments]);

  const generateTimeSlots = () => {
    if (!selectedDate) return;

    const hasAppointmentOnSelectedDate = userAppointments.some(app => 
      isSameDay(app.data, selectedDate)
    );

    if (hasAppointmentOnSelectedDate) {
      toast({
        title: "Atenção",
        description: "Você já tem um agendamento marcado para este dia. Escolha outra data.",
        variant: "destructive"
      });
      setSelectedDate(undefined);
      return;
    }

    const slots: TimeSlot[] = [];
    const startHour = 8;
    const endHour = 19;
    
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, selectedDate)
    );
    const bookedTimes = dateAppointments.map(app => {
      return format(app.tempo_inicio, 'HH:mm');
    }).filter(Boolean);

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === endHour && minute > 30) continue;
        
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const available = !bookedTimes.includes(time);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copiado!",
        description: "Chave PIX copiada para a área de transferência."
      });
    });
  };

  const generatePixPayload = (valor: number, chave: string, descricao: string) => {
    // Formato simplificado do payload PIX - não mais necessário
    return "";
  };

  const handleConfirmBooking = async () => {
    if (!currentUser) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para agendar.",
        variant: "destructive"
      });
      return;
    }
  
    if (!selectedService || !selectedEmployee || !selectedDate || !selectedTime) {
      toast({
        title: "Erro",
        description: "Preencha todos os dados do agendamento.",
        variant: "destructive"
      });
      return;
    }
  
    const hasAppointmentOnSelectedDate = userAppointments.some(app => 
      isSameDay(app.data, selectedDate)
    );
  
    if (hasAppointmentOnSelectedDate) {
      toast({
        title: "Erro",
        description: "Você já tem um agendamento marcado para este dia.",
        variant: "destructive"
      });
      return;
    }
  
    setIsLoading(true);
    try {
      const appointmentDate = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      
      const userNome = userData?.nome || currentUser.displayName || 'Usuário';
      const userEmail = userData?.email || currentUser.email || '';
      const userTelefone = userData?.telefone || '11999999999';
  
      // Se for pagamento presencial, criar agendamento diretamente
      if (paymentMethod === "presencial") {
        const tempoInicio = new Date(appointmentDate);
        tempoInicio.setHours(hours, minutes, 0, 0);
        
        const tempoFim = new Date(appointmentDate);
        tempoFim.setHours(hours, minutes + selectedService.duracao, 0, 0);

        const appointmentData = {
          usuario_id: currentUser.uid,
          usuario_nome: userNome,
          usuario_email: userEmail,
          usuario_telefone: userTelefone,
          servico_id: selectedService.id,
          servico_nome: selectedService.nome,
          funcionario_id: selectedEmployee.id,
          funcionario_nome: selectedEmployee.nome,
          preco: selectedService.preco,
          data: appointmentDate,
          tempo_inicio: tempoInicio,
          tempo_fim: tempoFim,
          forma_pagamento: "Presencial",
          status: 'aguardando',
          data_criacao: new Date(),
          duracao: selectedService.duracao,
          presente: true,
          timestamp: new Date().getTime()
        };
        
        const docRef = await addDoc(collection(db, 'fila'), appointmentData);
        console.log('Agendamento criado no Firebase:', docRef.id);
        
        toast({
          title: "Agendamento criado!",
          description: `Agendamento confirmado para ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às ${selectedTime}.`
        });
  
        // Reset form
        setStep(1);
        setSelectedService(null);
        setSelectedEmployee(null);
        setSelectedDate(new Date());
        setSelectedTime("");
        setPaymentMethod("pix");
        
        // Refresh data
        await fetchExistingAppointments();
        await fetchUserAppointments();
      } else {
        // Pagamento via PIX - redirecionar para página de pagamento
        const bookingData = {
          service: selectedService,
          employee: selectedEmployee,
          date: appointmentDate,
          time: selectedTime,
          user: {
            id: currentUser.uid,
            nome: userNome,
            email: userEmail,
            telefone: userTelefone
          }
        };
        
        // Salvar dados temporariamente no localStorage
        localStorage.setItem('bookingData', JSON.stringify(bookingData));
        
        // Redirecionar para página de pagamento PIX
        navigate('/pagamento/pix');
      }
  
    } catch (error: any) {
      console.error("Error creating booking:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar agendamento. Tente novamente.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const isDateDisabled = (date: Date) => {
    return (
      date < new Date() || 
      date > addDays(new Date(), 30) ||
      date.getDay() === 0 ||
      userAppointments.some(app => isSameDay(app.data, date))
    );
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background py-8 px-4 w-[100%] h-[100%] mx-auto">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Agendar com Pagamento</h1>
            <p className="text-muted-foreground">Escolha seu serviço e pague via PIX</p>
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
            <Card className="barbershop-card">
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
            <Card className="barbershop-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Escolha Data e Horário
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Serviço selecionado:</h3>
                  <p className="text-sm text-muted-foreground">{selectedService.nome} - R$ {selectedService.preco} ({selectedService.duracao}min)</p>
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
                  <Button onClick={handleEmployeeSelect} className="btn-hero">
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && selectedService && selectedDate && selectedTime && (
            <Card className="barbershop-card">
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
                  <p className="text-sm">Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p className="text-sm">Horário: {selectedTime} - {
                    (() => {
                      const [hours, minutes] = selectedTime.split(':').map(Number);
                      const endTime = new Date();
                      endTime.setHours(hours, minutes + (selectedService?.duracao || 30), 0, 0);
                      return format(endTime, 'HH:mm');
                    })()
                  }</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Selecione seu cabeleireiro:</h3>
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
                    className="btn-hero"
                  >
                    Continuar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && selectedService && selectedEmployee && selectedDate && (
            <Card className="barbershop-card">
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
                  <p className="text-sm">Cabeleireiro: {selectedEmployee.nome}</p>
                  <p className="text-sm">Data: {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</p>
                  <p className="text-sm">Horário: {selectedTime} - {
                    (() => {
                      const [hours, minutes] = selectedTime.split(':').map(Number);
                      const endTime = new Date();
                      endTime.setHours(hours, minutes + (selectedService?.duracao || 30), 0, 0);
                      return format(endTime, 'HH:mm');
                    })()
                  }</p>
                  <p className="text-sm">Nome: {userData?.nome || currentUser?.displayName || 'Não informado'}</p>
                  <p className="text-sm">Email: {userData?.email || currentUser?.email || 'Não informado'}</p>
                  <p className="text-sm">Telefone: {userData?.telefone || 'Não informado'}</p>
                  <p className="text-lg font-bold text-primary">Total: R$ {selectedService.preco}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Forma de pagamento:</h3>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="space-y-3">
                      <Label htmlFor="pix" className="cursor-pointer">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 bg-green-50 border-green-200">
                          <RadioGroupItem value="pix" id="pix" />
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <div>
                            <span className="font-medium">PIX</span>
                            <p className="text-xs text-muted-foreground">
                              Pague instantaneamente com PIX
                            </p>
                          </div>
                        </div>
                      </Label>
                      <Label htmlFor="presencial" className="cursor-pointer">
                        <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                          <RadioGroupItem value="presencial" id="presencial" />
                          <User className="h-5 w-5" />
                          <div>
                            <span className="font-medium">Pagamento Presencial</span>
                            <p className="text-xs text-muted-foreground">
                              Pague no estabelecimento no dia do serviço
                            </p>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === "pix" && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Como funciona o PIX:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Você será redirecionado para uma página de pagamento PIX</li>
                      <li>• Escaneie o QR Code ou copie o código PIX</li>
                      <li>• Após o pagamento, seu agendamento será confirmado automaticamente</li>
                      <li>• Você receberá uma confirmação por email</li>
                    </ul>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleConfirmBooking} 
                    disabled={isLoading} 
                    className="btn-hero flex-1"
                  >
                    {isLoading ? "Processando..." : (paymentMethod === "pix" ? "Pagar com PIX" : "Confirmar Agendamento")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Booking;