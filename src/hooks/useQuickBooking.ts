import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface UltimoAgendamento {
  servico_id: string;
  servico_nome: string;
  preco: number;
  duracao: number;
  funcionario_id?: string;
  funcionario_nome?: string;
  sala_atendimento?: string;
  data: Date;
}

interface SugestaoHorario {
  dia: string;
  horario: string;
  frequencia: number;
}

export const useQuickBooking = (userEmail: string | undefined) => {
  const [ultimoAgendamento, setUltimoAgendamento] = useState<UltimoAgendamento | null>(null);
  const [sugestoesHorarios, setSugestoesHorarios] = useState<SugestaoHorario[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Carregar último agendamento finalizado
  const loadUltimoAgendamento = useCallback(async () => {
    if (!userEmail) return;

    setLoading(true);
    try {
      const q = query(
        collection(db, 'agendamentos_finalizados'),
        where('usuario_email', '==', userEmail),
        orderBy('data_atendimento', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        
        setUltimoAgendamento({
          servico_id: data.servico_id || '',
          servico_nome: data.servico_nome || data.servico || '',
          preco: data.preco || 0,
          duracao: data.duracao || 30,
          funcionario_id: data.funcionario_id,
          funcionario_nome: data.funcionario_nome || data.barbeiro,
          sala_atendimento: data.sala_atendimento,
          data: data.data_atendimento?.toDate() || new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao carregar último agendamento:', error);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  // Analisar histórico e sugerir horários
  const loadSugestoesHorarios = useCallback(async () => {
    if (!userEmail) return;

    try {
      const q = query(
        collection(db, 'agendamentos_finalizados'),
        where('usuario_email', '==', userEmail),
        orderBy('data_atendimento', 'desc'),
        limit(20)
      );

      const snapshot = await getDocs(q);
      const agendamentos = snapshot.docs.map(doc => ({
        data: doc.data().data_atendimento?.toDate()
      }));

      // Analisar padrões de dia da semana e horário
      const padroes: { [key: string]: number } = {};
      
      agendamentos.forEach(({ data }) => {
        if (data) {
          const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'long' });
          const hora = data.getHours();
          const minutos = data.getMinutes();
          const horario = `${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
          const chave = `${diaSemana}|${horario}`;
          
          padroes[chave] = (padroes[chave] || 0) + 1;
        }
      });

      // Ordenar por frequência e pegar top 3
      const sugestoes = Object.entries(padroes)
        .map(([chave, frequencia]) => {
          const [dia, horario] = chave.split('|');
          return { dia, horario, frequencia };
        })
        .sort((a, b) => b.frequencia - a.frequencia)
        .slice(0, 3);

      setSugestoesHorarios(sugestoes);
    } catch (error) {
      console.error('Erro ao carregar sugestões de horários:', error);
    }
  }, [userEmail]);

  useEffect(() => {
    loadUltimoAgendamento();
    loadSugestoesHorarios();
  }, [loadUltimoAgendamento, loadSugestoesHorarios]);

  const repetirUltimoServico = useCallback(() => {
    if (!ultimoAgendamento) {
      toast({
        title: "Nenhum serviço anterior",
        description: "Você ainda não realizou nenhum serviço conosco.",
        variant: "destructive"
      });
      return null;
    }

    return ultimoAgendamento;
  }, [ultimoAgendamento, toast]);

  return {
    ultimoAgendamento,
    sugestoesHorarios,
    loading,
    repetirUltimoServico,
    refetch: () => {
      loadUltimoAgendamento();
      loadSugestoesHorarios();
    }
  };
};
