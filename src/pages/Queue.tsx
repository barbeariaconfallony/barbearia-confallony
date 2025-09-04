import { useState, useEffect, useRef } from "react";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, deleteDoc, getDoc, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QueueItemActionsModal } from "@/components/QueueItemActionsModal";
import { UltimosAgendamentos } from "@/components/UltimosAgendamentos";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, CheckCircle, AlertCircle, User, Scissors, ChevronRight, Calendar, TrendingUp, Star, Check, Timer, UserCheck, Play, Pause, CreditCard, Banknote, Palette, Sparkles, Zap, Heart } from "lucide-react";
import { format, differenceInSeconds, addMinutes, isAfter, parse, isToday, isSameDay, startOfDay, endOfDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  duracao?: number; // duração específica do agendamento
  data: Date;
  presente: boolean;
  timestamp: number;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  forma_pagamento?: string;
  funcionario_nome?: string;
}
interface TabInfo {
  id: string;
  name: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  count: number;
  currentService?: QueueItem;
  nextService?: QueueItem;
  waitingCount: number;
}
const Queue = () => {
  const {
    currentUser,
    userData
  } = useAuth();
  const {
    toast
  } = useToast();
  const [queueData, setQueueData] = useState<QueueItem[]>([]);
  const [currentlyServing, setCurrentlyServing] = useState<QueueItem | null>(null);
  const [completedToday, setCompletedToday] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | React.ReactNode | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [currentServiceCountdown, setCurrentServiceCountdown] = useState<{
    [key: string]: number | null;
  }>({});
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueItem | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('geral');
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [userDetails, setUserDetails] = useState<{
    data_nascimento?: Date;
    data_cadastro?: Date;
    pontos_fidelidade?: number;
    telefone?: string;
    email?: string;
    historico_agendamentos?: Array<{
      servico_nome: string;
      observacoes: string;
      data: Date;
    }>;
  } | null>(null);
  const [nextUserDetails, setNextUserDetails] = useState<{
    data_nascimento?: Date;
    data_cadastro?: Date;
    pontos_fidelidade?: number;
    telefone?: string;
    email?: string;
    historico_agendamentos?: Array<{
      servico_nome: string;
      observacoes: string;
      data: Date;
    }>;
  } | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const automationRef = useRef<NodeJS.Timeout | null>(null);
  const [blinkingOpacity, setBlinkingOpacity] = useState(1);
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(format(now, 'HH:mm:ss', {
        locale: ptBR
      }));
      setCurrentDate(format(now, "EEEE, dd 'de' MMMM 'de' yyyy", {
        locale: ptBR
      }));
    };
    updateDateTime();
    timeRef.current = setInterval(updateDateTime, 1000);
    return () => {
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
    };
  }, []);

  // Efeito para a animação de piscar
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkingOpacity(prev => prev === 1 ? 0.5 : 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const formatTimeDuration = (totalSeconds: number): string => {
    if (totalSeconds <= 0) return '00:00';
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const days = Math.floor(totalSeconds / 86400) % 7;
    const weeks = Math.floor(totalSeconds / 604800) % 4;
    const months = Math.floor(totalSeconds / 2419200);
    if (months > 0) {
      return `${months}m ${weeks}s ${days}d`;
    } else if (weeks > 0) {
      return `${weeks}s ${days}d ${hours}h`;
    } else if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  };
  const startScheduledAppointment = async (appointment: QueueItem) => {
    const now = new Date();
    // Usar duração específica do agendamento ou fallback para tempo_estimado
    const duracaoMinutos = appointment.duracao || appointment.tempo_estimado || 30;
    const tempoFim = addMinutes(now, duracaoMinutos);
    try {
      await updateDoc(doc(db, "fila", appointment.id), {
        status: 'em_atendimento',
        tempo_inicio: now,
        tempo_fim: tempoFim
      });
      toast({
        title: "Atendimento iniciado!",
        description: `${appointment.usuario_nome} - ${appointment.servico_nome}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Erro ao iniciar atendimento:", error);
      toast({
        title: "Erro ao iniciar atendimento",
        description: `${appointment.usuario_nome} - ${appointment.servico_nome}`,
        variant: "destructive"
      });
    }
  };
  const finishCurrentAppointment = async () => {
    if (!currentlyServing) return;
    const now = new Date();
    try {
      // Atualiza o status na fila antes de finalizar
      await updateDoc(doc(db, "fila", currentlyServing.id), {
        status: 'concluido',
        tempo_fim: now
      });
      const completedAppointment = {
        ...currentlyServing,
        status: 'concluido' as const,
        tempo_fim: now,
        data_conclusao: now,
        avaliacao: null,
        observacoes: '',
        valor_pago: currentlyServing.preco || 0,
        desconto_aplicado: 0,
        funcionario_nome: currentlyServing.funcionario_nome || userData?.nome || 'Funcionário',
        servico_nome: currentlyServing.servico_nome,
        usuario_email: currentlyServing.usuario_email || ''
      };

      // Envia para agendamentos_finalizados
      await addDoc(collection(db, 'agendamentos_finalizados'), completedAppointment);

      // Remove da fila após finalização
      await deleteDoc(doc(db, "fila", currentlyServing.id));
      toast({
        title: "Atendimento concluído!",
        description: `${currentlyServing.usuario_nome} - ${currentlyServing.servico_nome}`,
        variant: "default"
      });
    } catch (error) {
      console.error("Erro ao concluir atendimento:", error);
      toast({
        title: "Erro ao concluir atendimento",
        description: `${currentlyServing.usuario_nome} - ${currentlyServing.servico_nome}`,
        variant: "destructive"
      });
    }
  };
  const updateCurrentServiceCountdown = () => {
    const newCountdown: {
      [key: string]: number | null;
    } = {};

    // Encontrar todos os atendimentos em andamento por sala
    const servingBySala: {
      [key: string]: QueueItem;
    } = {};
    queueData.filter(item => item.status === 'em_atendimento').forEach(item => {
      const sala = item.sala_atendimento || 'Geral';
      servingBySala[sala] = item;
    });

    // Calcular countdown para cada sala
    Object.keys(servingBySala).forEach(sala => {
      const serving = servingBySala[sala];
      if (!serving || !serving.tempo_fim) {
        newCountdown[sala] = null;
        return;
      }
      const now = new Date();
      const remainingSeconds = Math.max(0, Math.floor((serving.tempo_fim.getTime() - now.getTime()) / 1000));
      newCountdown[sala] = remainingSeconds;
    });
    setCurrentServiceCountdown(newCountdown);
  };
  const checkAutomation = () => {
    const now = new Date();
    if (currentlyServing && currentlyServing.tempo_fim && isAfter(now, currentlyServing.tempo_fim)) {
      finishCurrentAppointment();
      return;
    }
    const scheduledAppointments = queueData.filter(item => item.status === 'confirmado' && item.tempo_inicio).sort((a, b) => a.tempo_inicio!.getTime() - b.tempo_inicio!.getTime());
    for (const appointment of scheduledAppointments) {
      if (appointment.tempo_inicio && isAfter(now, appointment.tempo_inicio)) {
        startScheduledAppointment(appointment);
        break;
      }
    }
  };
  useEffect(() => {
    countdownRef.current = setInterval(updateCurrentServiceCountdown, 1000);
    automationRef.current = setInterval(checkAutomation, 1000);
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (automationRef.current) {
        clearInterval(automationRef.current);
      }
    };
  }, [currentlyServing, queueData]);

  // Função para buscar detalhes do usuário do Firestore
  const fetchUserDetailsGeneric = async (usuarioEmail: string) => {
    try {
      // Buscar dados do usuário na coleção "usuarios" pelo email
      const userQuery = query(collection(db, "usuarios"), where("email", "==", usuarioEmail), limit(1));
      const userSnapshot = await getDocs(userQuery);
      let userInfo = {
        data_nascimento: null,
        data_cadastro: null,
        pontos_fidelidade: 0,
        telefone: null,
        email: null
      };
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        userInfo = {
          data_nascimento: userData.data_nascimento && typeof userData.data_nascimento.toDate === 'function' ? userData.data_nascimento.toDate() : userData.data_nascimento || null,
          data_cadastro: userData.data_registro && typeof userData.data_registro.toDate === 'function' ? userData.data_registro.toDate() : userData.data_registro || null,
          pontos_fidelidade: userData.pontos_fidelidade || 0,
          telefone: userData.telefone || null,
          email: userData.email || usuarioEmail
        };
      }

      // Buscar histórico dos últimos atendimentos na coleção "agendamentos_finalizados" (últimos 5)
      let historico = [];
      try {
        // Buscar pelo email do usuário em atendimento
        const userEmail = userInfo.email || usuarioEmail;
        if (userEmail) {
          const historyQuery = query(collection(db, "agendamentos_finalizados"), where("usuario_email", "==", userEmail), orderBy("tempo_fim", "desc"), limit(5));
          const historySnapshot = await getDocs(historyQuery);
          historySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.servico_nome) {
              historico.push({
                servico_nome: data.servico_nome,
                observacoes: data.observacoes || '',
                data: data.tempo_fim && typeof data.tempo_fim.toDate === 'function' ? data.tempo_fim.toDate() : data.tempo_fim || new Date()
              });
            }
          });
        }
      } catch (historyError) {
        console.log("Erro ao buscar histórico de agendamentos finalizados:", historyError);
      }
      return {
        ...userInfo,
        historico_agendamentos: historico
      };
    } catch (error) {
      console.error("Erro ao buscar detalhes do usuário:", error);
      // Definir dados padrão mesmo com erro
      return {
        data_nascimento: null,
        data_cadastro: null,
        pontos_fidelidade: 0,
        telefone: null,
        email: null,
        historico_agendamentos: []
      };
    }
  };
  const fetchUserDetails = async (usuarioEmail: string) => {
    const details = await fetchUserDetailsGeneric(usuarioEmail);
    setUserDetails(details);
  };
  const fetchNextUserDetails = async (usuarioEmail: string) => {
    const details = await fetchUserDetailsGeneric(usuarioEmail);
    setNextUserDetails(details);
  };

  // Buscar detalhes do usuário quando há atendimento atual
  useEffect(() => {
    if (currentlyServing && currentlyServing.usuario_email) {
      fetchUserDetails(currentlyServing.usuario_email);
    } else {
      setUserDetails(null);
    }
  }, [currentlyServing]);

  // Buscar detalhes do próximo usuário quando há mudança na fila
  useEffect(() => {
    const nextService = queueData.filter(item => item.status === 'confirmado').sort((a, b) => {
      if (a.tempo_inicio && b.tempo_inicio) {
        return a.tempo_inicio.getTime() - b.tempo_inicio.getTime();
      }
      return a.posicao - b.posicao;
    })[0];
    if (nextService && nextService.usuario_email) {
      fetchNextUserDetails(nextService.usuario_email);
    } else {
      setNextUserDetails(null);
    }
  }, [queueData]);
  const getStatusText = (status: string) => {
    switch (status) {
      case 'em_atendimento':
        return 'Em Atendimento';
      case 'aguardando':
        return 'Aguardando';
      case 'concluido':
        return 'Concluído';
      default:
        return 'Agendado';
    }
  };
  const formatCountdown = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds) || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  const getProgressCircleOffset = (seconds: number | null, totalSeconds: number) => {
    if (seconds === null || seconds <= 0) return 0;
    const progress = (totalSeconds - seconds) / totalSeconds;
    return progress * 565.48;
  };
  useEffect(() => {
    if (!currentUser) return;
    const fetchQueueData = async () => {
      try {
        const q = query(collection(db, "fila"), where("status", "in", ["confirmado", "em_atendimento"]), orderBy("status"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, async querySnapshot => {
          const queueItems: QueueItem[] = [];
          let currentPosition = 0;
          let servingItem: QueueItem | null = null;
          querySnapshot.forEach(doc => {
            const data = doc.data();
            const item: QueueItem = {
              id: doc.id,
              usuario_id: data.usuario_id,
              usuario_nome: data.usuario_nome,
              usuario_email: data.usuario_email || '',
              usuario_telefone: data.usuario_telefone || '',
              servico_nome: data.servico_nome,
              servico_tipo: data.servico_tipo || "Outros",
              sala_atendimento: data.sala_atendimento || data.servico_tipo || "Outros",
              preco: data.preco || 0,
              status: data.status,
              posicao: currentPosition,
              tempo_estimado: data.tempo_estimado || 30,
              duracao: data.duracao,
              // incluir duração específica do agendamento
              data: data.data.toDate(),
              presente: data.presente || false,
              timestamp: data.timestamp || data.data.toMillis(),
              tempo_inicio: data.tempo_inicio?.toDate(),
              tempo_fim: data.tempo_fim?.toDate(),
              forma_pagamento: data.forma_pagamento || 'Presencial',
              funcionario_nome: data.funcionario_nome || userData?.nome || 'Funcionário'
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

          // Reorganizar posições para que os ausentes fiquem após os presentes
          let presentCount = 0;
          let absentCount = 0;
          const reorderedQueue = sortedQueue.map(item => {
            if (item.status === 'em_atendimento') {
              return item;
            }
            if (item.presente) {
              presentCount++;
              return {
                ...item,
                posicao: presentCount - 1
              };
            } else {
              absentCount++;
              // Se for o 3° da fila e estiver ausente, mover para 4°
              if (presentCount + absentCount === 3) {
                return {
                  ...item,
                  posicao: 3 // 4° posição (índice 3)
                };
              }
              return {
                ...item,
                posicao: presentCount + absentCount - 1
              };
            }
          });
          setQueueData(reorderedQueue);
          setCurrentlyServing(servingItem);
          setLoading(false);
          setError(null);
        }, error => {
          console.error("Error in snapshot listener:", error);
          setError(<span>
                A consulta requer um índice. Crie-o{' '}
                <a href="https://console.firebase.google.com/v1/r/project/barbearia-confallony/firestore/indexes?create_composite=ClFwcm9qZWN0cy9iYXJiZWFyaWEtY29uZmFsbG9ueS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZmlsYS9pbmRleGVzL18QARoKCgZzdGF0dXMQARoNCgl0aW1lc3RhbXAQARoMCghfX25hbWVfXxAB" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                  aqui
                </a>
              </span>);
          setLoading(false);
        });
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up queue listener:", error);
        setError("Erro ao configurar a fila. Tente recarregar a página.");
        setLoading(false);
      }
    };
    fetchQueueData();
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (automationRef.current) {
        clearInterval(automationRef.current);
      }
    };
  }, [currentUser]);
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const q = query(collection(db, "agendamentos_finalizados"), where("data_conclusao", ">=", startOfToday), where("data_conclusao", "<=", endOfToday), orderBy("data_conclusao", "desc"));
    const unsubscribe = onSnapshot(q, querySnapshot => {
      const completed: QueueItem[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        completed.push({
          id: doc.id,
          usuario_id: data.usuario_id || '',
          usuario_nome: data.usuario_nome || '',
          usuario_email: data.usuario_email || '',
          usuario_telefone: data.usuario_telefone || '',
          servico_nome: data.servico_nome || '',
          servico_tipo: data.servico_tipo || 'Outros',
          preco: data.preco || 0,
          status: 'concluido',
          posicao: data.posicao || 0,
          tempo_estimado: data.tempo_estimado || 30,
          data: data.data?.toDate() || new Date(),
          presente: data.presente || false,
          timestamp: data.timestamp || Date.now(),
          tempo_inicio: data.tempo_inicio?.toDate(),
          tempo_fim: data.tempo_fim?.toDate(),
          forma_pagamento: data.forma_pagamento_utilizada || data.forma_pagamento || 'Presencial',
          funcionario_nome: data.funcionario_nome || userData?.nome || 'Funcionário'
        });
      });
      setCompletedToday(completed);
    });
    return () => unsubscribe();
  }, [currentUser]);
  const handleQueueItemClick = (item: QueueItem) => {
    setSelectedQueueItem(item);
    setShowActionsModal(true);
  };
  const handleCloseActionsModal = () => {
    setShowActionsModal(false);
    setSelectedQueueItem(null);
  };

  // Função para obter ícone da sala
  const getSalaIcon = (sala: string): React.ComponentType<{
    className?: string;
  }> => {
    switch (sala.toLowerCase()) {
      case 'corte':
      case 'cabelo':
        return Scissors;
      case 'barba':
        return User;
      case 'sobrancelha':
      case 'design':
        return Palette;
      case 'manicure':
      case 'pedicure':
        return Sparkles;
      case 'depilacao':
      case 'depilação':
        return Zap;
      case 'massagem':
        return Heart;
      case 'outros':
      default:
        return Users;
    }
  };

  // Processar dados das abas
  useEffect(() => {
    const salaGroups: {
      [key: string]: QueueItem[];
    } = {};

    // Agrupar todos os itens por sala
    queueData.forEach(item => {
      const sala = item.sala_atendimento || 'Outros';
      if (!salaGroups[sala]) {
        salaGroups[sala] = [];
      }
      salaGroups[sala].push(item);
    });

    // Criar abas dinâmicas
    const newTabs: TabInfo[] = [{
      id: 'geral',
      name: 'Geral',
      icon: Users,
      count: queueData.length,
      currentService: queueData.find(item => item.status === 'em_atendimento') || undefined,
      nextService: queueData.filter(item => item.status === 'confirmado').sort((a, b) => {
        if (a.tempo_inicio && b.tempo_inicio) {
          return a.tempo_inicio.getTime() - b.tempo_inicio.getTime();
        }
        return a.posicao - b.posicao;
      })[0] || undefined,
      waitingCount: queueData.filter(item => item.status === 'confirmado').length
    }];

    // Adicionar abas específicas para cada sala que tem agendamentos
    Object.keys(salaGroups).forEach(sala => {
      if (salaGroups[sala].length > 0) {
        const salaItems = salaGroups[sala];
        const currentService = salaItems.find(item => item.status === 'em_atendimento');
        const waitingItems = salaItems.filter(item => item.status === 'confirmado');
        const nextService = waitingItems.sort((a, b) => {
          if (a.tempo_inicio && b.tempo_inicio) {
            return a.tempo_inicio.getTime() - b.tempo_inicio.getTime();
          }
          return a.posicao - b.posicao;
        })[0];
        newTabs.push({
          id: sala,
          name: sala,
          icon: getSalaIcon(sala),
          count: salaItems.length,
          currentService,
          nextService,
          waitingCount: waitingItems.length
        });
      }
    });
    setTabs(newTabs);

    // Definir aba ativa baseada no atendimento em andamento ou próximo atendimento se não foi definida manualmente
    if (activeTab === 'geral' && newTabs.length > 1) {
      // Priorizar atendimento em andamento
      const currentService = queueData.find(item => item.status === 'em_atendimento');
      if (currentService && currentService.sala_atendimento) {
        const targetTab = newTabs.find(tab => tab.id === currentService.sala_atendimento);
        if (targetTab) {
          setActiveTab(targetTab.id);
          return;
        }
      }

      // Se não há atendimento em andamento, usar próximo serviço
      const nextService = queueData.filter(item => item.status === 'confirmado').sort((a, b) => {
        if (a.tempo_inicio && b.tempo_inicio) {
          return a.tempo_inicio.getTime() - b.tempo_inicio.getTime();
        }
        return a.posicao - b.posicao;
      })[0];
      if (nextService && nextService.sala_atendimento) {
        const targetTab = newTabs.find(tab => tab.id === nextService.sala_atendimento);
        if (targetTab) {
          setActiveTab(targetTab.id);
        }
      }
    }
  }, [queueData]);

  // Filtrar dados da fila baseado na aba ativa
  const getFilteredQueueData = () => {
    if (activeTab === 'geral') {
      return queueData;
    }
    return queueData.filter(item => (item.sala_atendimento || 'Outros') === activeTab);
  };
  const getActiveTabInfo = () => {
    return tabs.find(tab => tab.id === activeTab) || tabs[0];
  };
  if (loading) {
    return <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="border-border">
            <CardContent className="pt-6 text-center">
              <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Carregando fila...</h2>
              <p className="text-muted-foreground">Aguarde enquanto buscamos os dados</p>
            </CardContent>
          </Card>
        </div>
      </Layout>;
  }
  if (error) {
    return <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="border-border">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Erro ao carregar a fila</h2>
              <div className="text-muted-foreground mb-4">
                {typeof error === 'string' ? error : error}
              </div>
              <Button onClick={() => window.location.reload()} className="hover:bg-primary/90">
                Recarregar Página
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>;
  }

  // Renderizar header da aba com informações específicas
  const renderTabHeader = (tab: TabInfo) => {
    const filteredData = tab.id === 'geral' ? queueData : queueData.filter(item => (item.sala_atendimento || 'Outros') === tab.id);
    const currentService = tab.currentService;
    const nextService = tab.nextService;
    const waitingCount = filteredData.filter(item => item.status === 'confirmado').length;
    const filteredCurrentServing = filteredData.find(item => item.status === 'em_atendimento') || null;
    return <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Remover o card detalhado condicional para mostrar apenas os 3 cards principais */}

          {/* Atendimento atual da sala - versão simplificada */}
          <Card className="border-border shadow-lg h-auto min-h-[24rem] sm:h-96">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <Play className="h-6 w-6 text-green-600" />
                Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 relative flex flex-col justify-start p-2 sm:p-6">
              {currentService ? <div className="text-center py-[15px] mx-[10px] my-[10px]">
                  {/* Círculo de progresso com contagem regressiva - DESTACADO */}
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 mx-auto mb-4 sm:mb-6">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                      <circle className="text-muted-foreground/20" stroke="currentColor" strokeWidth="12" fill="transparent" r="90" cx="100" cy="100" />
                      <circle className="text-green-500 transition-all duration-1000 ease-linear" stroke="currentColor" strokeWidth="12" fill="transparent" r="90" cx="100" cy="100" strokeDasharray="565.48" strokeDashoffset={currentServiceCountdown[currentService.sala_atendimento || 'Geral'] !== null ? 565.48 - getProgressCircleOffset(currentServiceCountdown[currentService.sala_atendimento || 'Geral'], (currentService.duracao || currentService.tempo_estimado || 30) * 60) : 565.48} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold font-mono text-green-600">
                        {formatCountdown(currentServiceCountdown[currentService.sala_atendimento || 'Geral'])}
                      </span>
                    </div>
                  </div>
                  
                  {/* Informações do cliente abaixo do círculo */}
                  <div className="text-center space-y-2">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="text-center">
                        <p className="font-medium text-base">{currentService.usuario_nome}</p>
                        <p className="text-sm text-muted-foreground">{currentService.servico_nome}</p>
                        <p className="text-sm font-mono text-muted-foreground">
                          {currentService.tempo_inicio ? format(currentService.tempo_inicio, 'HH:mm') : '--:--'} - {currentService.tempo_fim ? format(currentService.tempo_fim, 'HH:mm') : '--:--'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div> : <div className="text-center py-6">
                  <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-base text-muted-foreground">Nenhum atendimento</p>
                </div>}
            </CardContent>
          </Card>

          {/* Detalhes do cliente em atendimento */}
          <Card className="border-border shadow-lg h-auto min-h-[24rem] sm:h-96">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <User className="h-5 w-5 text-blue-600" />
                Detalhes do Cliente Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 h-auto max-h-80 overflow-y-auto p-2 sm:p-6">
              {currentService ? <div className="space-y-4">
                  {/* Informações básicas do cliente */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-500 text-white">
                          {currentService.usuario_nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{currentService.usuario_nome}</p>
                        <p className="text-xs text-muted-foreground">{currentService?.usuario_email || 'Email não informado'}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Telefone */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{currentService.usuario_telefone || 'Não informado'}</p>
                        </div>
                      </div>
                      
                      {/* Data de nascimento */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nascimento</p>
                          <p className="font-medium">
                            {userDetails?.data_nascimento ? format(userDetails.data_nascimento, 'dd/MM/yyyy') : 'Não informado'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Data de cadastro */}
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cadastro</p>
                          <p className="font-medium">
                            {userDetails?.data_cadastro ? format(userDetails.data_cadastro, 'dd/MM/yyyy') : 'Não informado'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Pontos de fidelidade */}
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pontos</p>
                          <p className="font-medium">{userDetails?.pontos_fidelidade || 0} pts</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Últimos Agendamentos - componente atualizado */}
                  <UltimosAgendamentos userEmail={currentlyServing?.usuario_email || ''} maxItems={3} compact={true} />

                  {/* Inputs para detalhes do atendimento */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-primary" />
                      Detalhes do Atendimento
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Observações</label>
                      <textarea placeholder="Detalhes do serviço realizado..." className="w-full h-12 px-2 py-1 text-xs border border-border rounded resize-none bg-background" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Desconto (R$)</label>
                        <input type="number" step="0.01" placeholder="0.00" className="w-full px-2 py-1 text-xs border border-border rounded bg-background" />
                      </div>
                    </div>
                  </div>
                </div> : <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum atendimento em andamento</p>
                  
                </div>}
            </CardContent>
          </Card>

          {/* Próximo agendamento com detalhes completos */}
          <Card className="border-border shadow-lg h-auto min-h-[24rem] sm:h-96 md:col-span-2 xl:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-3 text-lg">
                <Timer className="h-5 w-5 text-blue-600" />
                Detalhes do Próximo Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 h-auto max-h-80 overflow-y-auto p-2 sm:p-6">
              {nextService ? <div className="space-y-4">
                  {/* Informações básicas do próximo cliente */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-blue-500 text-white">
                          {nextService.usuario_nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-foreground">{nextService.usuario_nome}</p>
                        <p className="text-xs text-muted-foreground">{nextService?.usuario_email || 'Email não informado'}</p>
                        <p className="text-xs text-muted-foreground">{nextService.servico_nome}</p>
                        {nextService.tempo_inicio && <p className="text-xs font-medium text-foreground">
                            {isToday(nextService.tempo_inicio) ? format(nextService.tempo_inicio, 'HH:mm') : format(nextService.tempo_inicio, 'dd/MM HH:mm')}
                          </p>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {/* Telefone */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <p className="font-medium">{nextService.usuario_telefone || 'Não informado'}</p>
                        </div>
                      </div>
                      
                      {/* Data de nascimento */}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Nascimento</p>
                          <p className="font-medium">
                            {nextUserDetails?.data_nascimento ? format(nextUserDetails.data_nascimento, 'dd/MM/yyyy') : 'Não informado'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Data de cadastro */}
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-purple-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cadastro</p>
                          <p className="font-medium">
                            {nextUserDetails?.data_cadastro ? format(nextUserDetails.data_cadastro, 'dd/MM/yyyy') : 'Não informado'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Pontos de fidelidade */}
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="text-xs text-muted-foreground">Pontos</p>
                          <p className="font-medium">{nextUserDetails?.pontos_fidelidade || 0} pts</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Últimos Agendamentos - componente atualizado */}
                  <UltimosAgendamentos userEmail={nextService?.usuario_email || ''} maxItems={3} compact={true} />

                  {/* Inputs para detalhes do próximo atendimento */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Scissors className="h-4 w-4 text-primary" />
                      Preparação do Atendimento
                    </h4>
                    
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Observações</label>
                      <textarea placeholder="Notas para o próximo atendimento..." className="w-full h-12 px-2 py-1 text-xs border border-border rounded resize-none bg-background" />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">Desconto (R$)</label>
                        <input type="number" step="0.01" placeholder="0.00" className="w-full px-2 py-1 text-xs border border-border rounded bg-background" />
                      </div>
                    </div>
                  </div>
                </div> : <div className="text-center py-8">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Nenhum próximo agendamento</p>
                </div>}
            </CardContent>
          </Card>
        </div>
      </div>;
  };

  // Renderizar conteúdo da fila específico da aba
  const renderQueueContent = () => {
    const filteredData = getFilteredQueueData();
    const filteredWaitingQueue = filteredData.filter(item => item.status === 'confirmado');
    return <div className="space-y-4">
        {/* Estatísticas - Movidas para cima */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-2 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">
                {queueData.filter(item => item.status === 'em_atendimento').length}
              </h3>
              <p className="text-xs text-muted-foreground">Em Atendimento</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-2 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">
                {queueData.filter(item => item.status === 'confirmado').length}
              </h3>
              <p className="text-xs text-muted-foreground">Na Fila</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-2 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">{queueData.length}</h3>
              <p className="text-xs text-muted-foreground">Total de agendamentos</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-lg">
            <CardContent className="p-2 sm:p-4 text-center">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1">{completedToday.length}</h3>
              <p className="text-xs text-muted-foreground">Concluídos Hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Fila de Espera - Agora em largura total */}
        <Card className="border-border shadow-lg">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Fila de Espera ({filteredWaitingQueue.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {filteredWaitingQueue.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p>Nenhuma pessoa na fila</p>
                </div> : filteredWaitingQueue.sort((a, b) => {
              if (a.presente === b.presente) {
                return a.posicao - b.posicao;
              }
              return a.presente ? -1 : 1;
            }).map((item, index) => {
              const isNext = index === 0;
              const isPresent = item.presente;
              const isFirst = index === 0;
              let cardStyle = '';
              if (isFirst) {
                cardStyle = 'bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
              } else if (isPresent) {
                cardStyle = 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
              } else {
                cardStyle = `bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800`;
              }
              return <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:opacity-80 ${cardStyle}`} style={!isPresent && !isFirst ? {
                opacity: blinkingOpacity
              } : {}} onClick={() => handleQueueItemClick(item)}>
                        <div className="flex items-center gap-3">
                          <Badge variant={isFirst ? "default" : isPresent ? "outline" : "destructive"} className="min-w-[2.5rem] justify-center text-xs">
                            #{(index + 1).toString().padStart(2, '0')}
                          </Badge>
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={`text-xs ${isFirst ? 'bg-blue-500 text-white' : isPresent ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                              {item.usuario_nome.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground text-sm">{item.usuario_nome}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{item.servico_nome} • {item.tempo_estimado} min</span>
                              <div className="flex items-center gap-1">
                                {item.forma_pagamento === 'PIX' ? <>
                                    <CreditCard className="h-3 w-3 text-blue-600" />
                                    <span>PIX</span>
                                  </> : item.forma_pagamento === 'Dinheiro Físico' ? <>
                                    <Banknote className="h-3 w-3 text-green-600" />
                                    <span>Dinheiro</span>
                                  </> : <span>{item.forma_pagamento}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={isFirst ? "default" : isPresent ? "secondary" : "destructive"} className="text-xs">
                            {isFirst ? 'Próximo' : isPresent ? 'Presente' : 'Ausente'}
                          </Badge>
                          {item.tempo_inicio && <p className="text-xs text-muted-foreground mt-1">
                              {isToday(item.tempo_inicio) ? format(item.tempo_inicio, 'HH:mm') : format(item.tempo_inicio, 'dd/MM HH:mm')}
                            </p>}
                        </div>
                      </div>;
            })}
            </div>
          </CardContent>
        </Card>
      </div>;
  };
  return <Layout>
        <div className="min-h-screen py-4 sm:py-8 px-2 sm:px-4 w-[100%] h-[100%] mx-auto">
          <div className="w-full mx-auto space-y-4 sm:space-y-6 max-w-[1800px]">
  
            {/* Header com Relógio */}
            <Card className="border-border shadow-lg w-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                  <div className="flex flex-col items-center mx-auto">
                    <div className="text-4xl sm:text-6xl md:text-8xl font-bold text-green-500 mb-1 font-mono tracking-wider">
                      {currentTime}
                    </div>
                    <p className="text-xs md:text-sm text-muted-foreground uppercase tracking-wide">{currentDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sistema de Abas Dinâmicas */}
            {tabs.length > 0 && <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Lista de abas com contadores */}
                <TabsList className={`grid w-full gap-1 h-auto p-1`} style={{
            gridTemplateColumns: `repeat(${Math.min(tabs.length, 6)}, 1fr)`
          }}>
                  {tabs.map(tab => {
              const IconComponent = tab.icon;
              return <TabsTrigger key={tab.id} value={tab.id} className="relative flex flex-col items-center gap-1 py-2 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span className="text-xs font-medium truncate">{tab.name}</span>
                        </div>
                        {tab.count > 0 && <Badge variant={tab.id === activeTab ? "secondary" : "outline"} className="text-xs min-w-[1.5rem] h-5 absolute -top-1 -right-1">
                            {tab.count}
                          </Badge>}
                      </TabsTrigger>;
            })}
                </TabsList>

                {/* Conteúdo das abas */}
                {tabs.map(tab => <TabsContent key={tab.id} value={tab.id} className="space-y-4 mt-6">
                    {/* Header informativo da aba */}
                    {renderTabHeader(tab)}
                    
                    {/* Conteúdo principal da fila */}
                    {renderQueueContent()}
                  </TabsContent>)}
              </Tabs>}

          </div>
        </div>

        {/* Modal de ações do item da fila */}
        <QueueItemActionsModal isOpen={showActionsModal} onClose={handleCloseActionsModal} item={selectedQueueItem} />
      </Layout>;
};
export default Queue;