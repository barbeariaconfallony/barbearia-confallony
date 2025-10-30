import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';
import { useToast } from '@/hooks/use-toast';
import { isAfter, addMinutes } from 'date-fns';

interface QueueItem {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email?: string;
  usuario_telefone?: string;
  servico_nome: string;
  servico_tipo: string;
  sala_atendimento?: string;
  preco?: number;
  status: 'aguardando' | 'em_atendimento' | 'concluido' | 'confirmado';
  posicao: number;
  tempo_estimado: number;
  duracao?: number;
  data: Date;
  presente: boolean;
  timestamp: number;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  forma_pagamento?: string;
  funcionario_nome?: string;
}

interface QueueAutomationContextType {
  queueData: QueueItem[];
  currentlyServing: QueueItem | null;
  currentServiceCountdown: { [key: string]: number | null };
  loading: boolean;
  error: string | React.ReactNode | null;
  startScheduledAppointment: (appointment: QueueItem) => Promise<void>;
  finishCurrentAppointment: (alturasCorte: any, atendimentoDesconto: number) => Promise<void>;
}

const QueueAutomationContext = createContext<QueueAutomationContextType | undefined>(undefined);

export const useQueueAutomation = () => {
  const context = useContext(QueueAutomationContext);
  if (!context) {
    throw new Error('useQueueAutomation deve ser usado dentro de QueueAutomationProvider');
  }
  return context;
};

export const QueueAutomationProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [currentlyServing, setCurrentlyServing] = useState<QueueItem | null>(null);
  const [currentServiceCountdown, setCurrentServiceCountdown] = useState<{ [key: string]: number | null }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const automationRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Função para iniciar atendimento agendado
  const startScheduledAppointment = async (appointment: QueueItem) => {
    const now = new Date();
    const duracaoMinutos = appointment.duracao || appointment.tempo_estimado || 30;
    const tempoFim = addMinutes(now, duracaoMinutos);

    try {
      await updateDoc(doc(db, 'fila', appointment.id), {
        status: 'em_atendimento',
        tempo_inicio: now,
        tempo_fim: tempoFim,
      });

      toast({
        title: 'Atendimento iniciado!',
        description: `${appointment.usuario_nome} - ${appointment.servico_nome}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao iniciar atendimento:', error);
      toast({
        title: 'Erro ao iniciar atendimento',
        description: `${appointment.usuario_nome} - ${appointment.servico_nome}`,
        variant: 'destructive',
      });
    }
  };

  // Função para finalizar atendimento atual
  const finishCurrentAppointment = async (alturasCorte: any, atendimentoDesconto: number) => {
    if (!currentlyServing) return;

    console.log('✅ QueueContext: Finalizando atendimento', {
      cliente: currentlyServing.usuario_nome,
      alturas_corte: alturasCorte,
      desconto: atendimentoDesconto,
    });

    const now = new Date();
    
    try {
      // Buscar dados atuais do agendamento
      const filaDoc = await getDoc(doc(db, 'fila', currentlyServing.id));
      const filaData = filaDoc.exists() ? filaDoc.data() : {};
      
      // Verificar se tem pagamento parcial
      const temPagamentoParcial = filaData.pagamento_parcial === true;
      const pagamentoParcialPago = filaData.pagamento_parcial === 'pago';

      // Se tiver pagamento parcial pendente (true mas não "pago"), NÃO finalizar
      if (temPagamentoParcial && !pagamentoParcialPago) {
        console.log('⚠️ QueueContext: Agendamento com pagamento parcial pendente, mantendo na fila');
        
        await updateDoc(doc(db, 'fila', currentlyServing.id), {
          status: 'em_atendimento', // Mantém em atendimento
          tempo_fim: now,
          alturas_corte: alturasCorte,
          desconto_aplicado: atendimentoDesconto,
          pagamento_parcial: 'aguardando pagamento parcial',
        });

        toast({
          title: 'Aguardando pagamento ⏳',
          description: 'Por favor, finalize o pagamento parcial antes de concluir o atendimento.',
          variant: 'default',
        });
        return;
      }

      // Atualiza o status na fila antes de finalizar
      await updateDoc(doc(db, 'fila', currentlyServing.id), {
        status: 'concluido',
        tempo_fim: now,
      });


      const completedAppointment = {
        ...currentlyServing,
        status: 'concluido' as const,
        tempo_fim: now,
        data_conclusao: now,
        avaliacao: null,
        alturas_corte: alturasCorte,
        observacoes: alturasCorte.observacao_extra || '',
        desconto_aplicado: atendimentoDesconto,
        valor_pago: (currentlyServing.preco || 0) - atendimentoDesconto,
        funcionario_nome: currentlyServing.funcionario_nome || userData?.nome || 'Funcionário',
        servico_nome: currentlyServing.servico_nome,
        usuario_email: currentlyServing.usuario_email || '',
        // Incluir dados de pagamento parcial se existir
        ...(pagamentoParcialPago && {
          pagamento_parcial: 'pago',
          forma_pagamento_restante: filaData.forma_pagamento_restante,
          payment_id_restante: filaData.payment_id_restante,
          data_pagamento_restante: filaData.data_pagamento_restante,
          status_restante: filaData.status_restante,
        }),
      };

      console.log('💾 QueueContext: Salvando no Firestore:', completedAppointment);

      // Envia para agendamentos_finalizados
      await addDoc(collection(db, 'agendamentos_finalizados'), completedAppointment);

      // Incrementar pontos de fidelidade
      if (
        currentlyServing.usuario_id &&
        currentlyServing.usuario_id !== 'anonimo' &&
        currentlyServing.usuario_id !== 'pix_customer'
      ) {
        try {
          const userRef = doc(db, 'usuarios', currentlyServing.usuario_id);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const currentPoints = userDoc.data()?.pontos_fidelidade || 0;
            await updateDoc(userRef, {
              pontos_fidelidade: currentPoints + 1,
            });
            console.log(
              `Pontos de fidelidade atualizados: ${currentPoints} -> ${currentPoints + 1} para usuário ${currentlyServing.usuario_nome}`
            );
          }
        } catch (error) {
          console.error('Erro ao atualizar pontos de fidelidade:', error);
        }
      }

      // Remove da fila após finalização
      await deleteDoc(doc(db, 'fila', currentlyServing.id));

      toast({
        title: 'Atendimento concluído!',
        description: `${currentlyServing.usuario_nome} - ${currentlyServing.servico_nome}`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Erro ao concluir atendimento:', error);
      toast({
        title: 'Erro ao concluir atendimento',
        description: `${currentlyServing.usuario_nome} - ${currentlyServing.servico_nome}`,
        variant: 'destructive',
      });
    }
  };

  // Atualizar countdown dos serviços em andamento
  const updateCurrentServiceCountdown = () => {
    const newCountdown: { [key: string]: number | null } = {};

    // Encontrar todos os atendimentos em andamento por sala
    const servingBySala: { [key: string]: QueueItem } = {};
    queueData
      .filter((item) => item.status === 'em_atendimento')
      .forEach((item) => {
        const sala = item.sala_atendimento || 'Geral';
        servingBySala[sala] = item;
      });

    // Calcular countdown para cada sala
    Object.keys(servingBySala).forEach((sala) => {
      const serving = servingBySala[sala];
      if (!serving || !serving.tempo_fim) {
        newCountdown[sala] = null;
        return;
      }
      const now = new Date();
      const remainingSeconds = Math.max(
        0,
        Math.floor((serving.tempo_fim.getTime() - now.getTime()) / 1000)
      );
      newCountdown[sala] = remainingSeconds;
    });

    setCurrentServiceCountdown(newCountdown);
  };

  // Verificar se precisa finalizar automaticamente ou iniciar agendamentos
  const checkAutomation = async () => {
    const now = new Date();

    // Verificar se precisa finalizar automaticamente
    if (currentlyServing && currentlyServing.tempo_fim && isAfter(now, currentlyServing.tempo_fim)) {
      try {
        // Buscar os dados atuais da fila antes de finalizar
        const filaDoc = await getDoc(doc(db, 'fila', currentlyServing.id));
        if (filaDoc.exists()) {
          const filaData = filaDoc.data();
          const alturasCorte = filaData.alturas_corte || {};
          const desconto = filaData.desconto_aplicado || 0;
          
          console.log('🤖 QueueContext: Finalizando automaticamente com dados salvos:', {
            alturas_corte: alturasCorte,
            desconto
          });
          
          await finishCurrentAppointment(alturasCorte, desconto);
        } else {
          // Finalização automática com valores padrão se não encontrar o documento
          await finishCurrentAppointment({}, 0);
        }
      } catch (error) {
        console.error('Erro ao buscar dados para finalização automática:', error);
        await finishCurrentAppointment({}, 0);
      }
      return;
    }

    // Verificar se precisa iniciar agendamentos programados
    const scheduledAppointments = queueData
      .filter((item) => item.status === 'confirmado' && item.tempo_inicio)
      .sort((a, b) => a.tempo_inicio!.getTime() - b.tempo_inicio!.getTime());

    for (const appointment of scheduledAppointments) {
      if (appointment.tempo_inicio && isAfter(now, appointment.tempo_inicio)) {
        startScheduledAppointment(appointment);
        break;
      }
    }
  };

  // Listener em tempo real da fila
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchQueueData = async () => {
      try {
        const q = query(
          collection(db, 'fila'),
          where('status', 'in', ['confirmado', 'em_atendimento']),
          orderBy('status'),
          orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(
          q,
          async (querySnapshot) => {
            const queueItems: QueueItem[] = [];
            let currentPosition = 0;
            let servingItem: QueueItem | null = null;

            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const item: QueueItem = {
                id: doc.id,
                usuario_id: data.usuario_id,
                usuario_nome: data.usuario_nome,
                usuario_email: data.usuario_email || '',
                usuario_telefone: data.usuario_telefone || '',
                servico_nome: data.servico_nome,
                servico_tipo: data.servico_tipo || 'Outros',
                sala_atendimento: data.sala_atendimento || data.servico_tipo || 'Outros',
                preco: data.preco || 0,
                status: data.status,
                posicao: currentPosition,
                tempo_estimado: data.tempo_estimado || 30,
                duracao: data.duracao,
                data: data.data.toDate(),
                presente: data.presente || false,
                timestamp: data.timestamp || data.data.toMillis(),
                tempo_inicio: data.tempo_inicio?.toDate(),
                tempo_fim: data.tempo_fim?.toDate(),
                forma_pagamento: data.forma_pagamento || 'Presencial',
                funcionario_nome: data.funcionario_nome || userData?.nome || 'Funcionário',
              };

              if (item.status === 'em_atendimento') {
                servingItem = item;
              } else {
                currentPosition++;
              }

              queueItems.push(item);
            });

            // Ordenar a fila: presentes primeiro, depois ausentes
            const sortedQueue = [...queueItems].sort((a, b) => {
              if (a.presente === b.presente) {
                return a.posicao - b.posicao;
              }
              return a.presente ? -1 : 1;
            });

            // Reorganizar posições
            let presentCount = 0;
            let absentCount = 0;
            const reorderedQueue = sortedQueue.map((item) => {
              if (item.status === 'em_atendimento') {
                return item;
              }
              if (item.presente) {
                presentCount++;
                return {
                  ...item,
                  posicao: presentCount - 1,
                };
              } else {
                absentCount++;
                if (presentCount + absentCount === 3) {
                  return {
                    ...item,
                    posicao: 3,
                  };
                }
                return {
                  ...item,
                  posicao: presentCount + absentCount - 1,
                };
              }
            });

            setQueueData(reorderedQueue);
            setCurrentlyServing(servingItem);
            setLoading(false);
            setError(null);
          },
          (error) => {
            console.error('Error in snapshot listener:', error);
            setError(
              <span>
                A consulta requer um índice. Crie-o{' '}
                <a
                  href="https://console.firebase.google.com/v1/r/project/barbearia-confallony/firestore/indexes?create_composite=ClFwcm9qZWN0cy9iYXJiZWFyaWEtY29uZmFsbG9ueS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZmlsYS9pbmRleGVzL18QARoKCgZzdGF0dXMQARoNCgl0aW1lc3RhbXAQARoMCghfX25hbWVfXxAB"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                >
                  aqui
                </a>
              </span>
            );
            setLoading(false);
          }
        );

        unsubscribeRef.current = unsubscribe;
      } catch (error) {
        console.error('Error setting up queue listener:', error);
        setError('Erro ao configurar a fila. Tente recarregar a página.');
        setLoading(false);
      }
    };

    fetchQueueData();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [currentUser, userData?.nome]);

  // Iniciar timers de countdown e automação
  useEffect(() => {
    countdownRef.current = setInterval(updateCurrentServiceCountdown, 1000);
    automationRef.current = setInterval(checkAutomation, 1000);

    console.log('🤖 QueueContext: Timers de automação iniciados');

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        console.log('🛑 QueueContext: Timer de countdown parado');
      }
      if (automationRef.current) {
        clearInterval(automationRef.current);
        console.log('🛑 QueueContext: Timer de automação parado');
      }
    };
  }, [currentlyServing, queueData]);

  const value = {
    queueData,
    currentlyServing,
    currentServiceCountdown,
    loading,
    error,
    startScheduledAppointment,
    finishCurrentAppointment,
  };

  return <QueueAutomationContext.Provider value={value}>{children}</QueueAutomationContext.Provider>;
};
