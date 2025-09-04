import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ReagendamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendamento: {
    id: string;
    servico_nome: string;
    data: Date;
    tempo_inicio?: Date;
    tempo_fim?: Date;
    barbeiro?: string;
    preco: number;
    tempo_estimado: number;
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


export const ReagendamentoModal: React.FC<ReagendamentoModalProps> = ({
  isOpen,
  onClose,
  agendamento,
  onUpdate
}) => {
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
    if (agendamento && isOpen && !loadingData && funcionarios.length > 0) {
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
  }, [agendamento, isOpen, loadingData, funcionarios]);

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
        // Ignora o próprio agendamento que está sendo reagendado
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
    if (!selectedDate || !selectedTime || !selectedFuncionario) {
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
      const selectedFuncionarioData = funcionarios.find(f => f.id === selectedFuncionario);
      
      if (!selectedFuncionarioData) {
        toast({
          title: "Erro",
          description: "Dados do funcionário não encontrados.",
          variant: "destructive"
        });
        return;
      }

      const [hours, minutes] = selectedTime.split(':');
      const appointmentDate = new Date(selectedDate);
      appointmentDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const endTime = new Date(appointmentDate);
      endTime.setMinutes(endTime.getMinutes() + agendamento.tempo_estimado);

      // Reagenda o agendamento e marca que foi reagendado
      await updateDoc(doc(db, 'fila', agendamento.id), {
        data: appointmentDate,
        tempo_inicio: appointmentDate,
        tempo_fim: endTime,
        barbeiro: selectedFuncionarioData.nome,
        status: 'aguardando_confirmacao',
        presente: false,
        reagendado: true // Nova flag para indicar que foi reagendado
      });

      toast({
        title: "Agendamento reagendado!",
        description: "Seu agendamento foi reagendado com sucesso sem cobrança adicional."
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erro ao reagendar agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível reagendar o agendamento.",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Reagendar Agendamento
          </DialogTitle>
          <DialogDescription>
            <div className="space-y-2">
              <p>Selecione uma nova data e horário para seu agendamento.</p>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Serviço:</strong> {agendamento.servico_nome} - R$ {agendamento.preco.toFixed(2)}
                  <br />
                  <strong>Sem cobrança adicional!</strong>
                </p>
              </div>
            </div>
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
                disabled={loading || !selectedDate || !selectedTime || !selectedFuncionario}
                className="flex-1"
              >
                {loading ? "Reagendando..." : "Confirmar Reagendamento"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};