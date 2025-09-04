import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

export const EditAgendamentoModal: React.FC<EditAgendamentoModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  onUpdate
}) => {
  const [selectedService, setSelectedService] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedFuncionario, setSelectedFuncionario] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [conflictedSlots, setConflictedSlots] = useState<string[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const { toast } = useToast();

  // Carrega dados das coleções
  const loadData = async () => {
    setLoadingData(true);
    try {
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
        description: "Não foi possível carregar os dados. Usando dados padrão.",
        variant: "destructive"
      });
      // Fallback para dados padrão
      setServicos([
        { id: '1', nome: 'Corte Clássico', preco: 30, duracao: 30, ativo: true },
        { id: '2', nome: 'Corte Moderno', preco: 35, duracao: 40, ativo: true },
        { id: '3', nome: 'Barba', preco: 20, duracao: 20, ativo: true },
        { id: '4', nome: 'Corte + Barba', preco: 45, duracao: 50, ativo: true }
      ]);
      setFuncionarios([
        { id: '1', nome: 'João Silva', ativo: true },
        { id: '2', nome: 'Pedro Santos', ativo: true },
        { id: '3', nome: 'Carlos Oliveira', ativo: true },
        { id: '4', nome: 'Rafael Costa', ativo: true }
      ]);
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
      const dateStr = agendamento.data.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      
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

  const checkTimeConflicts = async (date: string) => {
    if (!date) return;
    
    try {
      const startDate = new Date(date + 'T00:00:00');
      const endDate = new Date(date + 'T23:59:59');
      
      const q = query(
        collection(db, 'fila'),
        where('data', '>=', startDate),
        where('data', '<=', endDate),
        where('status', 'in', ['aguardando_confirmacao', 'confirmado'])
      );
      
      const querySnapshot = await getDocs(q);
      const conflicts: string[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Ignora o próprio agendamento que está sendo editado
        if (doc.id === agendamento.id) return;
        
        if (data.tempo_inicio) {
          const timeStr = data.tempo_inicio.toDate().toTimeString().slice(0, 5);
          conflicts.push(timeStr);
        }
      });
      
      setConflictedSlots(conflicts);
    } catch (error) {
      console.error('Erro ao verificar conflitos:', error);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      checkTimeConflicts(selectedDate);
    }
  }, [selectedDate]);

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
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

    if (conflictedSlots.includes(selectedTime)) {
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
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getTomorrowDate()}
                className="w-full px-3 py-2 border border-border rounded-md bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horário</label>
              <Select value={selectedTime} onValueChange={setSelectedTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlots.map((time) => {
                    const isConflicted = conflictedSlots.includes(time);
                    return (
                      <SelectItem 
                        key={time} 
                        value={time}
                        disabled={isConflicted}
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {time}
                          {isConflicted && (
                            <span className="text-xs text-red-500">(Ocupado)</span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
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