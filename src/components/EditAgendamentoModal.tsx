import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, User, CalendarIcon, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditAgendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: {
    id: string;
    servico_nome: string;
    data: Date;
    tempo_inicio?: Date;
    tempo_fim?: Date;
    barbeiro?: string;
    editado?: boolean;
  };
  onUpdate: () => void;
}

interface Servico {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  ativo: boolean;
}

interface Funcionario {
  id: string;
  nome: string;
  ativo: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface ConfigAgendamento {
  dias_semana: number[];
  horarios_disponiveis: string[];
}

export const EditAgendamentoModal: React.FC<EditAgendamentoModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  onUpdate
}) => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<any[]>([]);
  const [configAgendamento, setConfigAgendamento] = useState<ConfigAgendamento>({
    dias_semana: [1, 2, 3, 4, 5, 6],
    horarios_disponiveis: []
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDayFullyBooked, setSelectedDayFullyBooked] = useState(false);
  const { toast } = useToast();

  // Carrega dados das coleções
  const loadData = async () => {
    setLoadingData(true);
    try {
      // Carrega configuração de agendamento
      const configSnapshot = await getDocs(collection(db, 'config_agendamento'));
      if (!configSnapshot.empty) {
        const config = configSnapshot.docs[0].data();
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

      // Carrega agendamentos existentes
      const appointmentsSnapshot = await getDocs(collection(db, 'fila'));
      const appointments: any[] = [];
      appointmentsSnapshot.forEach((doc) => {
        const data = doc.data();
        appointments.push({
          id: doc.id,
          data: data.data.toDate(),
          tempo_inicio: data.tempo_inicio?.toDate() || data.data.toDate(),
          tempo_fim: data.tempo_fim?.toDate(),
          status: data.status
        });
      });
      setExistingAppointments(appointments);

      // Carrega serviços
      const servicosQuery = query(
        collection(db, 'servicos'),
        where('ativo', '==', true)
      );
      const servicosSnapshot = await getDocs(servicosQuery);
      const servicosData: Servico[] = [];
      servicosSnapshot.forEach((doc) => {
        const data = doc.data();
        servicosData.push({
          id: doc.id,
          nome: data.nome,
          preco: data.preco || 0,
          duracao: data.duracao || 30,
          ativo: data.ativo || false
        });
      });
      setServicos(servicosData);

      // Carrega funcionários
      const funcionariosQuery = query(
        collection(db, 'funcionarios'),
        where('ativo', '==', true)
      );
      const funcionariosSnapshot = await getDocs(funcionariosQuery);
      const funcionariosData: Funcionario[] = [];
      funcionariosSnapshot.forEach((doc) => {
        const data = doc.data();
        funcionariosData.push({
          id: doc.id,
          nome: data.nome,
          ativo: data.ativo || false
        });
      });
      setFuncionarios(funcionariosData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados.",
        variant: "destructive"
      });
    }
    setLoadingData(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (agendamento && isOpen && !loadingData && servicos.length > 0) {
      // Encontra o serviço correspondente
      const servico = servicos.find(s => s.nome === agendamento.servico_nome);
      setSelectedService(servico?.id || '');
      
      // Define a data
      setSelectedDate(agendamento.data);
      
      // Define o horário
      if (agendamento.tempo_inicio) {
        const timeStr = agendamento.tempo_inicio.toTimeString().slice(0, 5);
        setSelectedTime(timeStr);
      }
      
      // Define o funcionário
      const funcionario = funcionarios.find(f => f.nome === agendamento.barbeiro);
      setSelectedFuncionario(funcionario?.id || '');
    }
  }, [agendamento, isOpen, loadingData, servicos, funcionarios]);

  const generateTimeSlots = () => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    const slots: TimeSlot[] = [];
    const horariosConfig = configAgendamento.horarios_disponiveis;
    
    if (horariosConfig.length === 0) {
      setTimeSlots([]);
      return;
    }
    
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, selectedDate) && 
      app.id !== agendamento.id && // Ignora o próprio agendamento
      (app.status === 'aguardando_confirmacao' || app.status === 'confirmado')
    );

    horariosConfig.forEach(time => {
      const bookedTimes = dateAppointments.map(app => format(app.tempo_inicio, 'HH:mm'));
      const available = !bookedTimes.includes(time);
      slots.push({ time, available });
    });
    
    setTimeSlots(slots);
  };

  useEffect(() => {
    if (selectedDate && configAgendamento.horarios_disponiveis.length > 0) {
      generateTimeSlots();
    }
  }, [selectedDate, existingAppointments, configAgendamento]);

  // Verifica se um dia deve ser desabilitado no calendário
  const isDayDisabled = (date: Date) => {
    // Não permitir datas passadas
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Verificar se o dia da semana está configurado
    const dayOfWeek = date.getDay();
    if (!configAgendamento.dias_semana.includes(dayOfWeek)) return true;

    return false;
  };

  // Verifica se um dia está totalmente agendado
  const isDayFullyBooked = (date: Date) => {
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, date) &&
      app.id !== agendamento.id &&
      (app.status === 'aguardando_confirmacao' || app.status === 'confirmado')
    );

    if (configAgendamento.horarios_disponiveis.length === 0) return false;

    const bookedTimes = dateAppointments.map(app => format(app.tempo_inicio, 'HH:mm'));
    return configAgendamento.horarios_disponiveis.every(time => 
      bookedTimes.includes(time)
    );
  };

  // Verifica se um dia tem agendamentos
  const isDayPartiallyBooked = (date: Date) => {
    const dateAppointments = existingAppointments.filter(app => 
      isSameDay(app.data, date) &&
      app.id !== agendamento.id &&
      (app.status === 'aguardando_confirmacao' || app.status === 'confirmado')
    );

    return dateAppointments.length > 0 && !isDayFullyBooked(date);
  };


  const handleSave = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !selectedFuncionario) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    // Verificar se o horário está disponível
    const selectedSlot = timeSlots.find(slot => slot.time === selectedTime);
    if (!selectedSlot?.available) {
      toast({
        title: "Horário indisponível",
        description: "Este horário já está ocupado. Selecione outro horário.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const selectedServiceData = servicos.find(s => s.id === selectedService);
      const selectedFuncionarioData = funcionarios.find(f => f.id === selectedFuncionario);
      
      if (!selectedServiceData || !selectedFuncionarioData) {
        toast({
          title: "Erro",
          description: "Dados de serviço ou funcionário não encontrados.",
          variant: "destructive"
        });
        return;
      }

      const [hours, minutes] = selectedTime.split(':');
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + selectedServiceData.duracao);

      await updateDoc(doc(db, 'fila', agendamento.id), {
        servico_nome: selectedServiceData.nome,
        servico_tipo: 'Corte',
        preco: selectedServiceData.preco,
        tempo_estimado: selectedServiceData.duracao,
        data: appointmentDate,
        tempo_inicio: appointmentDate,
        tempo_fim: endTime,
        barbeiro: selectedFuncionarioData.nome,
        status: 'aguardando_confirmacao',
        presente: false,
        editado: true // Marca que o agendamento foi editado
      });

      toast({
        title: "Agendamento atualizado!",
        description: "Suas alterações foram salvas com sucesso."
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o agendamento.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  if (agendamento?.editado) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edição não permitida</DialogTitle>
            <DialogDescription>
              Este agendamento já foi editado uma vez e não pode ser alterado novamente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Agendamento</DialogTitle>
          <DialogDescription>
            Altere as informações do seu agendamento (permitida apenas uma edição)
          </DialogDescription>
        </DialogHeader>

        {loadingData ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Carregando dados...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço</label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map((servico) => (
                    <SelectItem key={servico.id} value={servico.id}>
                      <div className="flex justify-between items-center w-full">
                        <span>{servico.nome}</span>
                        <span className="font-semibold text-primary ml-4">
                          R$ {servico.preco.toFixed(2)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Button
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
                className={cn(
                  "w-full justify-between text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                </div>
                {showCalendar ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>

              {showCalendar && (
                <Card className="p-4 border-2">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        if (isDayFullyBooked(date)) {
                          setSelectedDayFullyBooked(true);
                          toast({
                            title: "Dia indisponível",
                            description: "Todos os horários deste dia já estão ocupados.",
                            variant: "destructive"
                          });
                        } else {
                          setSelectedDate(date);
                          setSelectedTime('');
                          setSelectedDayFullyBooked(false);
                          setShowCalendar(false);
                        }
                      }
                    }}
                    disabled={isDayDisabled}
                    modifiers={{
                      fullyBooked: (date) => isDayFullyBooked(date),
                      partiallyBooked: (date) => isDayPartiallyBooked(date)
                    }}
                    modifiersClassNames={{
                      fullyBooked: "bg-red-500/20 text-red-900 dark:text-red-300 line-through",
                      partiallyBooked: "bg-orange-500/20 text-orange-900 dark:text-orange-300"
                    }}
                    className="pointer-events-auto w-full"
                  />
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500/20 border border-red-500 rounded"></div>
                      <span>Dia totalmente agendado</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-orange-500/20 border border-orange-500 rounded"></div>
                      <span>Dia com agendamentos</span>
                    </div>
                  </div>
                </Card>
              )}

              {selectedDayFullyBooked && selectedDate && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Todos os horários de {format(selectedDate, "dd/MM/yyyy")} estão ocupados. Selecione outra data.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horário</label>
              <Select value={selectedTime} onValueChange={setSelectedTime} disabled={!selectedDate || selectedDayFullyBooked}>
                <SelectTrigger>
                  <SelectValue placeholder={selectedDate ? "Selecione um horário" : "Selecione uma data primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      Nenhum horário disponível para esta data
                    </div>
                  ) : (
                    timeSlots.map((slot) => (
                      <SelectItem 
                        key={slot.time} 
                        value={slot.time}
                        disabled={!slot.available}
                        className={!slot.available ? "text-red-500" : ""}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className={cn("w-4 h-4", !slot.available && "text-red-500")} />
                          <span className={!slot.available ? "line-through" : ""}>{slot.time}</span>
                          {!slot.available && (
                            <span className="text-xs font-semibold text-red-600">(Agendado)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um profissional" />
                </SelectTrigger>
                <SelectContent>
                  {funcionarios.map((funcionario) => (
                    <SelectItem key={funcionario.id} value={funcionario.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {funcionario.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={loading || !selectedService || !selectedDate || !selectedTime || !selectedFuncionario}
                className="flex-1"
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};