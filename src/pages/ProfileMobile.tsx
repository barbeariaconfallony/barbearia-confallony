import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, History, Settings, Award, Wallet, Phone, Mail, LogOut, CheckCircle, ShoppingCart, Palette, CreditCard, Banknote, Clock, Plus, MapPin, Timer, Check, AlertTriangle, X, QrCode, Download, TrendingUp, Filter, DollarSign, BarChart3, Star, Crown, Zap, Bell, Receipt } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditAgendamentoModal } from "@/components/EditAgendamentoModal";
import { ReagendamentoModal } from "@/components/ReagendamentoModal";
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, isFuture, isToday, differenceInSeconds, isBefore, addMinutes, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import maleProfileAvatar from "@/assets/male-profile-avatar.jpg";
import logoMain from '@/assets/confallony-logo-main.png';
import { ThemeSelector } from "@/components/ThemeSelector";
import { generateReceipt, downloadReceipt } from "@/utils/receipt-generator";
import { QuickBookingCard } from "@/components/QuickBookingCard";
import { AgendamentoReminderConfig } from "@/components/AgendamentoReminderConfig";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { NotificationPermissionButton } from "@/components/NotificationPermissionButton";
import { UltimosAgendamentos } from "@/components/UltimosAgendamentos";
import { AvaliacaoModal } from "@/components/AvaliacaoModal";
interface QueueItem {
  id: string;
  servico_nome: string;
  preco: number;
  status: string;
  data: Date;
  presente: boolean;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  duracao?: number;
  cancelamentos?: number;
  barbeiro?: string;
  reagendado?: boolean;
  editado?: boolean;
  tempo_estimado?: number;
  funcionario_nome?: string;
  sala_atendimento?: string;
  forma_pagamento?: string;
}
interface AtendimentoConcluido {
  id: string;
  servico: string;
  servico_nome: string;
  data_atendimento: Date;
  data_conclusao: Date;
  barbeiro: string;
  funcionario_nome: string;
  preco: number;
  forma_pagamento_utilizada: string;
}
interface Comanda {
  id: string;
  numero: string;
  cliente_nome: string;
  cliente_email: string;
  data_criacao: Date;
  itens: any[];
  total: number;
  status: string;
  tipo_pagamento?: string;
  data_finalizacao?: Date;
  data_pagamento?: Date;
}
const CountdownTimer = ({
  targetDate
}: {
  targetDate: Date;
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(difference / (1000 * 60 * 60) % 24);
        const minutes = Math.floor(difference / 1000 / 60 % 60);
        const seconds = Math.floor(difference / 1000 % 60);
        setTimeLeft({
          days,
          hours,
          minutes,
          seconds
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0
        });
      }
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);
  const isPast = new Date() > targetDate;
  if (isPast) {
    return <p className="text-xs text-destructive font-medium mt-1">
        Horário já passou
      </p>;
  }
  return <div className="mt-2 space-y-1">
      <p className="text-xs text-primary font-medium flex items-center gap-1">
        <Timer className="h-3 w-3" />
        Faltam {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')} para o início do atendimento.
      </p>
      <p className="text-xs text-muted-foreground">
        Estaremos te aguardando!
      </p>
    </div>;
};
const ProfileMobile = () => {
  const {
    currentUser,
    userData,
    logout
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("perfil");
  const [historicoSubTab, setHistoricoSubTab] = useState<"agendamentos_pendentes" | "agendamentos_finalizados" | "comandas_abertas" | "comandas_finalizadas">("agendamentos_pendentes");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"mensal" | "anual">("mensal");
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);
  const [agendamentos, setAgendamentos] = useState<QueueItem[]>([]);
  const [agendamentosFinalizados, setAgendamentosFinalizados] = useState<AtendimentoConcluido[]>([]);
  const [atendimentosConcluidos, setAtendimentosConcluidos] = useState<AtendimentoConcluido[]>([]);
  const [comandasAbertas, setComandasAbertas] = useState<Comanda[]>([]);
  const [comandasFinalizadas, setComandasFinalizadas] = useState<Comanda[]>([]);
  const [proximoAgendamento, setProximoAgendamento] = useState<QueueItem | null>(null);
  const [agendamentosProximosIniciar, setAgendamentosProximosIniciar] = useState<QueueItem[]>([]);
  const [countdowns, setCountdowns] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reagendamentoModalOpen, setReagendamentoModalOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<QueueItem | null>(null);
  const [avaliacaoModalOpen, setAvaliacaoModalOpen] = useState(false);
  const [agendamentoParaAvaliar, setAgendamentoParaAvaliar] = useState<QueueItem | null>(null);

  // Redireciona admin para /profile
  if (userData?.isAdmin) {
    return <Navigate to="/profile" replace />;
  }
  useEffect(() => {
    const loadData = async () => {
      if (!userData?.email) return;
      try {
        // Carrega agendamentos pendentes
        const qAgendamentos = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['aguardando_confirmacao', 'confirmado']));
        const agendamentosSnapshot = await getDocs(qAgendamentos);
        const items: QueueItem[] = [];
        agendamentosSnapshot.forEach(doc => {
          const data = doc.data();
          items.push({
            id: doc.id,
            servico_nome: data.servico_nome,
            preco: data.preco || 0,
            status: data.status,
            data: data.data?.toDate() || new Date(),
            presente: data.presente || false,
            funcionario_nome: data.funcionario_nome || '',
            sala_atendimento: data.sala_atendimento || '',
            forma_pagamento: data.forma_pagamento || ''
          });
        });
        const sortedAgendamentos = items.sort((a, b) => a.data.getTime() - b.data.getTime());
        setAgendamentos(sortedAgendamentos);

        // Encontra o próximo agendamento futuro
        const futuroAgendamentos = sortedAgendamentos.filter(a => isFuture(a.data) || isToday(a.data));
        if (futuroAgendamentos.length > 0) {
          setProximoAgendamento(futuroAgendamentos[0]);
        } else {
          setProximoAgendamento(null);
        }

        // Carrega agendamentos finalizados do usuário
        const qAgendamentosFinalizados = query(collection(db, 'agendamentos_finalizados'), where('usuario_email', '==', userData.email));
        const agendamentosFinalizadosSnapshot = await getDocs(qAgendamentosFinalizados);
        const agendamentosFinalizadosItems: AtendimentoConcluido[] = [];
        agendamentosFinalizadosSnapshot.forEach(doc => {
          const data = doc.data();
          agendamentosFinalizadosItems.push({
            id: doc.id,
            servico: data.servico || data.servico_nome || 'Serviço não informado',
            servico_nome: data.servico_nome || data.servico || 'Serviço não informado',
            data_atendimento: data.data_atendimento?.toDate() || data.data_conclusao?.toDate() || new Date(),
            data_conclusao: data.data_conclusao?.toDate() || data.data_atendimento?.toDate() || new Date(),
            barbeiro: data.barbeiro || data.funcionario_nome || 'Funcionário não informado',
            funcionario_nome: data.funcionario_nome || data.barbeiro || 'Funcionário não informado',
            preco: data.preco || 0,
            forma_pagamento_utilizada: data.forma_pagamento_utilizada || data.forma_pagamento || 'Não informado'
          });
        });
        setAgendamentosFinalizados(agendamentosFinalizadosItems.sort((a, b) => b.data_atendimento.getTime() - a.data_atendimento.getTime()));

        // Carrega histórico de atendimentos concluídos
        const qHistorico = query(collection(db, 'agendamentos_finalizados'), where('usuario_email', '==', userData.email));
        const historicoSnapshot = await getDocs(qHistorico);
        const atendimentos: AtendimentoConcluido[] = [];
        historicoSnapshot.forEach(doc => {
          const data = doc.data();
          atendimentos.push({
            id: doc.id,
            servico: data.servico || data.servico_nome || 'Serviço não informado',
            servico_nome: data.servico_nome || data.servico || 'Serviço não informado',
            data_atendimento: data.data_atendimento?.toDate() || data.data_conclusao?.toDate() || new Date(),
            data_conclusao: data.data_conclusao?.toDate() || data.data_atendimento?.toDate() || new Date(),
            barbeiro: data.barbeiro || data.funcionario_nome || 'Funcionário não informado',
            funcionario_nome: data.funcionario_nome || data.barbeiro || 'Funcionário não informado',
            preco: data.preco || 0,
            forma_pagamento_utilizada: data.forma_pagamento_utilizada || data.forma_pagamento || 'Não informado'
          });
        });
        setAtendimentosConcluidos(atendimentos.sort((a, b) => b.data_atendimento.getTime() - a.data_atendimento.getTime()));

        // Carrega comandas abertas do usuário
        const qComandasAbertas = query(collection(db, 'comandas'), where('cliente_email', '==', userData.email));
        const comandasAbertasSnapshot = await getDocs(qComandasAbertas);
        const comandasAbertasItems: Comanda[] = [];
        comandasAbertasSnapshot.forEach(doc => {
          const data = doc.data();
          comandasAbertasItems.push({
            id: doc.id,
            numero: data.numero,
            cliente_nome: data.cliente_nome,
            cliente_email: data.cliente_email,
            data_criacao: data.data_criacao?.toDate() || new Date(),
            itens: data.itens || [],
            total: data.total || 0,
            status: 'Aberta'
          });
        });
        setComandasAbertas(comandasAbertasItems.sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime()));

        // Carrega comandas finalizadas do usuário
        const qComandasFinalizadas = query(collection(db, 'comandas_finalizadas'), where('cliente_email', '==', userData.email));
        const comandasFinalizadasSnapshot = await getDocs(qComandasFinalizadas);
        const comandasFinalizadasItems: Comanda[] = [];
        comandasFinalizadasSnapshot.forEach(doc => {
          const data = doc.data();
          comandasFinalizadasItems.push({
            id: doc.id,
            numero: data.numero,
            cliente_nome: data.cliente_nome,
            cliente_email: data.cliente_email,
            data_criacao: data.data_criacao?.toDate() || new Date(),
            data_finalizacao: data.data_finalizacao?.toDate(),
            data_pagamento: data.data_pagamento?.toDate(),
            itens: data.itens || [],
            total: data.total || 0,
            status: 'Finalizada',
            tipo_pagamento: data.tipo_pagamento
          });
        });
        setComandasFinalizadas(comandasFinalizadasItems.sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime()));
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [userData?.email]);
  const handleConfirmAppointment = async (appointmentId: string, presente: boolean) => {
    try {
      await updateDoc(doc(db, "fila", appointmentId), {
        status: presente ? 'confirmado' : 'aguardando_confirmacao',
        presente: presente
      });

      // Atualiza a lista local
      setAgendamentos(prev => prev.map(agendamento => agendamento.id === appointmentId ? {
        ...agendamento,
        presente,
        status: presente ? 'confirmado' : 'aguardando_confirmacao'
      } : agendamento));
      toast({
        title: presente ? "Presença confirmada!" : "Presença cancelada",
        description: presente ? "Sua presença foi registrada com sucesso." : "Você cancelou sua presença neste horário.",
        variant: presente ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua presença.",
        variant: "destructive"
      });
    }
  };

  // Cancela agendamento incrementando contador de cancelamentos
  const handleCancelarAgendamento = async (id: string) => {
    try {
      const agendamento = agendamentos.find(a => a.id === id);
      if (!agendamento) return;
      await updateDoc(doc(db, 'fila', id), {
        status: 'aguardando_confirmacao',
        presente: false,
        cancelamentos: ((agendamento as any).cancelamentos || 0) + 1
      });

      // Atualiza a lista local
      setAgendamentos(prev => prev.map(a => a.id === id ? {
        ...a,
        status: 'aguardando_confirmacao' as const,
        presente: false,
        cancelamentos: ((a as any).cancelamentos || 0) + 1
      } : a));
      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado e está aguardando confirmação.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('Erro ao cancelar agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o agendamento.",
        variant: "destructive"
      });
    }
  };

  // Abre modal para editar agendamento
  const handleEditarAgendamento = (agendamento: QueueItem) => {
    setSelectedAgendamento(agendamento);
    setEditModalOpen(true);
  };

  // Abre modal para reagendar agendamento
  const handleReagendarAgendamento = (agendamento: QueueItem) => {
    setSelectedAgendamento(agendamento);
    setReagendamentoModalOpen(true);
  };

  // Listener em tempo real para agendamentos próximos de iniciar
  useEffect(() => {
    if (!userData?.email) return;
    const now = new Date();
    const q = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['confirmado', 'em_atendimento']));
    const unsubscribe = onSnapshot(q, snapshot => {
      const items: QueueItem[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const item: QueueItem = {
          id: doc.id,
          servico_nome: data.servico_nome,
          preco: data.preco || 0,
          status: data.status,
          data: data.data?.toDate() || new Date(),
          presente: data.presente || false,
          tempo_inicio: data.tempo_inicio?.toDate(),
          tempo_fim: data.tempo_fim?.toDate(),
          duracao: data.duracao || data.tempo_estimado || 30
        };

        // Filtrar apenas agendamentos de hoje ou em andamento
        if (isToday(item.data) || item.status === 'em_atendimento') {
          items.push(item);
        }
      });
      setAgendamentosProximosIniciar(items.sort((a, b) => {
        // Em atendimento primeiro
        if (a.status === 'em_atendimento' && b.status !== 'em_atendimento') return -1;
        if (b.status === 'em_atendimento' && a.status !== 'em_atendimento') return 1;

        // Depois por horário
        return a.data.getTime() - b.data.getTime();
      }));
    });
    return () => unsubscribe();
  }, [userData?.email]);

  // Atualizar contagens regressivas e verificar finalizações
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns: {
        [key: string]: number;
      } = {};
      const now = new Date();
      
      agendamentosProximosIniciar.forEach(item => {
        if (item.status === 'em_atendimento' && item.tempo_fim) {
          // Tempo restante até fim do atendimento
          const remaining = Math.max(0, differenceInSeconds(item.tempo_fim, now));
          newCountdowns[item.id] = remaining;
          
          // Se acabou de finalizar (remaining chegou a 0 e antes era > 0)
          if (remaining === 0 && countdowns[item.id] && countdowns[item.id]! > 0) {
            // Abrir modal de avaliação
            setAgendamentoParaAvaliar(item);
            setAvaliacaoModalOpen(true);
          }
        } else if (item.status === 'confirmado' && item.data) {
          // Tempo até iniciar o atendimento
          const remaining = Math.max(0, differenceInSeconds(item.data, now));
          newCountdowns[item.id] = remaining;
        }
      });
      setCountdowns(newCountdowns);
    }, 1000);
    return () => clearInterval(interval);
  }, [agendamentosProximosIniciar, countdowns]);
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hours = Math.floor(mins / 60);
    const displayMins = mins % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSaveReceipt = async (agendamento: QueueItem) => {
    try {
      const blob = await generateReceipt({
        id: agendamento.id,
        servico_nome: agendamento.servico_nome,
        preco: agendamento.preco,
        data: agendamento.data,
        funcionario_nome: agendamento.funcionario_nome,
        sala_atendimento: agendamento.sala_atendimento,
        forma_pagamento: agendamento.forma_pagamento,
        status: agendamento.status
      });
      
      if (!blob) {
        throw new Error('Falha ao gerar comprovante');
      }
      
      downloadReceipt(blob, `comprovante-${agendamento.id}.png`);
      
      toast({
        title: "Comprovante salvo!",
        description: "O comprovante foi baixado com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar comprovante:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o comprovante.",
        variant: "destructive"
      });
    }
  };
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout.",
        variant: "destructive"
      });
    }
  };
  const renderContent = () => {
    switch (activeTab) {
      case "perfil":
        // Cálculos de estatísticas
        const currentDate = new Date();
        const mesAtualInicio = startOfMonth(currentDate);
        const mesAtualFim = endOfMonth(currentDate);
        
        const servicosMesAtual = agendamentosFinalizados.filter(a => 
          isWithinInterval(a.data_atendimento, { start: mesAtualInicio, end: mesAtualFim })
        ).length;

        // Total gasto REAL - Soma de agendamentos e comandas finalizadas
        const totalGastoAgendamentos = agendamentosFinalizados.reduce((acc, a) => acc + (a.preco || 0), 0);
        const totalGastoComandas = comandasFinalizadas.reduce((acc, c) => acc + (c.total || 0), 0);
        const totalGastoGeral = totalGastoAgendamentos + totalGastoComandas;

        console.log('Total gasto - Agendamentos:', totalGastoAgendamentos, 'Comandas:', totalGastoComandas, 'Total:', totalGastoGeral); // Debug

        // Total gasto do mês atual (agendamentos + comandas)
        const totalGastoAgendamentosMesAtual = agendamentosFinalizados
          .filter(a => isWithinInterval(a.data_atendimento, { start: mesAtualInicio, end: mesAtualFim }))
          .reduce((acc, a) => acc + (a.preco || 0), 0);
        
        const totalGastoComandasMesAtual = comandasFinalizadas
          .filter(c => {
            const dataComanda = c.data_finalizacao || c.data_criacao;
            return isWithinInterval(dataComanda, { start: mesAtualInicio, end: mesAtualFim });
          })
          .reduce((acc, c) => acc + (c.total || 0), 0);
        
        const totalGastoMesAtual = totalGastoAgendamentosMesAtual + totalGastoComandasMesAtual;

        console.log('Total gasto mês atual - Agendamentos:', totalGastoAgendamentosMesAtual, 'Comandas:', totalGastoComandasMesAtual, 'Total:', totalGastoMesAtual); // Debug

        // Dados do gráfico de frequência (últimos 6 meses)
        const sixMonthsAgo = subMonths(currentDate, 5);
        const monthsInterval = eachMonthOfInterval({ start: sixMonthsAgo, end: currentDate });
        
        const frequenciaData = monthsInterval.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const count = agendamentosFinalizados.filter(a => 
            isWithinInterval(a.data_atendimento, { start: monthStart, end: monthEnd })
          ).length;
          
          return {
            mes: format(month, 'MMM', { locale: ptBR }),
            visitas: count
          };
        });

        // Calcular máximo de visitas para o eixo Y
        const maxVisitas = Math.max(...frequenciaData.map(d => d.visitas), 5);

        // Sistema de níveis/tiers - Pontos REAIS do Firestore
        const pontosTotal = userData?.pontos_fidelidade || 0;

        const niveis = [
          { nome: 'Bronze', minPontos: 0, maxPontos: 49, cor: 'text-amber-700', bgCor: 'bg-amber-100/20', icon: Star },
          { nome: 'Prata', minPontos: 50, maxPontos: 149, cor: 'text-gray-400', bgCor: 'bg-gray-100/20', icon: Award },
          { nome: 'Ouro', minPontos: 150, maxPontos: 299, cor: 'text-yellow-500', bgCor: 'bg-yellow-100/20', icon: Crown },
          { nome: 'Platina', minPontos: 300, maxPontos: Infinity, cor: 'text-purple-500', bgCor: 'bg-purple-100/20', icon: Zap }
        ];

        console.log('Pontos do Firestore:', pontosTotal); // Debug

        const nivelAtual = niveis.find(n => pontosTotal >= n.minPontos && pontosTotal <= n.maxPontos) || niveis[0];
        const proximoNivel = niveis.find(n => n.minPontos > pontosTotal);
        const progressoNivel = proximoNivel 
          ? ((pontosTotal - nivelAtual.minPontos) / (proximoNivel.minPontos - nivelAtual.minPontos)) * 100
          : 100;

        return <div className="space-y-4 p-4">
            <div className="flex items-center justify-center mb-6">
              <Avatar className="h-24 w-24 border-4 border-primary/20">
                <AvatarImage src={userData?.avatar_url || maleProfileAvatar} />
                <AvatarFallback>{userData?.nome?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </div>
            
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">{userData?.nome}</h2>
              <p className="text-sm text-muted-foreground">{userData?.email}</p>
            </div>

            {/* Botão Agendar */}
            <Button onClick={() => navigate('/booking-mobile')} className="w-full mb-4" size="lg">
              <Calendar className="h-5 w-5 mr-2" />
              Agendar Serviço
            </Button>

            {/* Sistema de Níveis/Fidelidade */}
            <Card className={`${nivelAtual.bgCor} border-primary/30`}>
              <CardContent className="pt-3 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <nivelAtual.icon className={`h-5 w-5 ${nivelAtual.cor}`} />
                    <div>
                      <p className="text-xs text-muted-foreground">Nível Atual</p>
                      <p className={`text-lg font-bold ${nivelAtual.cor}`}>{nivelAtual.nome}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {pontosTotal} pontos
                  </Badge>
                </div>

                {proximoNivel && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso para {proximoNivel.nome}</span>
                      <span>{Math.round(progressoNivel)}%</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressoNivel}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Faltam {proximoNivel.minPontos - pontosTotal} pontos
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="pt-3 pb-3 text-center">
                  <DollarSign className="h-7 w-7 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">
                    R$ {totalGastoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Gasto este Mês</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/30">
                <CardContent className="pt-3 pb-3 text-center">
                  <CheckCircle className="h-7 w-7 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">
                    {servicosMesAtual}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Serviços este Mês</p>
                </CardContent>
              </Card>
            </div>

            {/* Próxima Visita */}
            {proximoAgendamento && (
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/30">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-blue-600" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Próxima Visita</p>
                      <p className="font-semibold text-foreground">{proximoAgendamento.servico_nome}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(proximoAgendamento.data, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="default" className="text-xs">
                      R$ {proximoAgendamento.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de Frequência */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Frequência de Visitas</h4>
                </div>
                
                <ResponsiveContainer width="100%" height={200} debounce={200}>
                  <BarChart data={frequenciaData} margin={{ top: 4, right: 8, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis 
                      dataKey="mes" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      interval={0}
                      allowDuplicatedCategory={false}
                      tickMargin={8}
                    />
                    <YAxis 
                      domain={[0, 'auto']}
                      allowDecimals={false}
                      tickCount={6}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Bar dataKey="visitas" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>

                <div className="flex justify-between items-center pt-3 border-t border-primary/10">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-primary">
                      {agendamentosFinalizados.length}
                    </p>
                    <p className="text-xs text-muted-foreground">Total de Visitas</p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-primary">
                      R$ {totalGastoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Gasto este Mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agendamento Rápido e Sugestões */}
            <QuickBookingCard userEmail={userData?.email} />

            {/* Agendamentos Pendentes */}
            {agendamentos.length > 0 && <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Agendamentos Pendentes
                </h3>
                {agendamentos.map(agendamento => <Card key={agendamento.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-4 pb-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{agendamento.servico_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(agendamento.data, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR
                      })}
                          </p>
                          <CountdownTimer targetDate={agendamento.data} />
                          
                          {/* Informações do Profissional e Sala */}
                          <div className="mt-2 space-y-1">
                            {agendamento.funcionario_nome && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>Profissional: {agendamento.funcionario_nome}</span>
                              </div>
                            )}
                            {agendamento.sala_atendimento && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>Sala: {agendamento.sala_atendimento}</span>
                              </div>
                            )}
                            {agendamento.forma_pagamento && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {agendamento.forma_pagamento.toLowerCase().includes('pix') ? (
                                  <QrCode className="h-3 w-3 text-primary" />
                                ) : (
                                  <Wallet className="h-3 w-3 text-green-600" />
                                )}
                                <span>Pagamento: {agendamento.forma_pagamento}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge variant={agendamento.status === 'confirmado' ? 'default' : 'secondary'}>
                          {agendamento.status === 'confirmado' ? <><CheckCircle className="h-3 w-3 mr-1" />Confirmado</> : <><Clock className="h-3 w-3 mr-1" />Aguardando</>}
                        </Badge>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-3 border-t border-primary/20">
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">
                            R$ {agendamento.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          <div className={`text-xs ${agendamento.status === 'confirmado' ? 'text-green-600' : 'text-amber-600'}`}>
                            {agendamento.status === 'confirmado' ? <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Presença confirmada
                              </div> : <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Aguardando confirmação
                              </div>}
                          </div>
                        </div>

                        {/* Botões de Ação */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs border-primary/30 hover:bg-primary/10"
                            onClick={() => handleSaveReceipt(agendamento)}
                          >
                            <Download className="h-3 w-3 mr-2" />
                            Comprovante
                          </Button>

                          <AddToCalendarButton 
                            agendamento={{
                              id: agendamento.id,
                              servico_nome: agendamento.servico_nome,
                              data: agendamento.data,
                              duracao: 30,
                              funcionario_nome: agendamento.funcionario_nome,
                              sala_atendimento: agendamento.sala_atendimento
                            }}
                            variant="outline"
                            size="sm"
                            className="text-xs border-primary/30 hover:bg-primary/10"
                          />
                        </div>

                        {agendamento.status === 'aguardando_confirmacao' ? <div className="flex items-center space-x-2">
                            <Checkbox id={`presente-${agendamento.id}`} checked={agendamento.presente} onCheckedChange={checked => handleConfirmAppointment(agendamento.id, Boolean(checked))} />
                            <label htmlFor={`presente-${agendamento.id}`} className="text-xs">
                              Confirmar presença
                            </label>
                          </div> : <div className="flex flex-col gap-2">
                            {(agendamento.cancelamentos || 0) === 0 ? <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm" className="w-full text-xs">
                                    Cancelar Agendamento
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-sm">
                                  <AlertDialogHeader className="text-left">
                                    <AlertDialogTitle className="flex items-center gap-2 text-sm">
                                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                                      Cancelar Agendamento
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-xs">
                                      Você tem certeza que deseja cancelar este agendamento? 
                                      Você pode editar as informações antes de cancelar.
                                      <br />
                                      <strong>Atenção:</strong> Você só pode cancelar 1 vez por agendamento.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col gap-2">
                                    {!agendamento.editado && <Button variant="outline" onClick={() => handleEditarAgendamento(agendamento)} className="w-full text-xs">
                                        Editar Agendamento
                                      </Button>}
                                    <AlertDialogCancel className="w-full text-xs">
                                      Manter Agendamento
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancelarAgendamento(agendamento.id)} className="w-full text-xs bg-destructive">
                                      Confirmar Cancelamento
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog> : agendamento.cancelamentos === 1 && !agendamento.reagendado ? <Button variant="outline" size="sm" className="w-full text-xs border-blue-500 text-blue-600" onClick={() => handleReagendarAgendamento(agendamento)}>
                                <Calendar className="h-3 w-3 mr-2" />
                                Reagendar sem Cobrança
                              </Button> : <Badge variant="destructive" className="flex items-center gap-1 text-xs justify-center">
                                <AlertTriangle className="h-3 w-3" />
                                {agendamento.reagendado ? 'Reagendado - Não é possível cancelar novamente' : 'Limite de cancelamento excedido'}
                              </Badge>}
                          </div>}
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}

            {/* Agendamentos Próximos de Iniciar */}
            {agendamentosProximosIniciar.length > 0 && <div className="space-y-3 mb-6">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Timer className="h-4 w-4 text-primary" />
                  Agendamentos de Hoje
                </h3>
                {agendamentosProximosIniciar.map(item => {
                  const countdown = countdowns[item.id] || 0;
                  const isFinished = item.status === 'em_atendimento' && countdown === 0;
                  
                  // Se finalizado, não mostra o card (oculta automaticamente)
                  if (isFinished && !avaliacaoModalOpen) {
                    return null;
                  }
                  
                  return (
                    <Card key={item.id} className={`backdrop-blur border-primary/20 ${item.status === 'em_atendimento' ? 'bg-primary/20 border-primary' : 'bg-card/50'}`}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{item.servico_nome}</p>
                            {item.status === 'em_atendimento' && item.tempo_inicio && item.tempo_fim ? (
                              <p className="text-xs text-muted-foreground">
                                {format(item.tempo_inicio, "HH:mm", { locale: ptBR })} - {format(item.tempo_fim, "HH:mm", { locale: ptBR })}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {format(item.data, "HH:mm", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                          <Badge variant={item.status === 'em_atendimento' ? 'default' : 'secondary'} className={item.status === 'em_atendimento' ? 'animate-pulse' : ''}>
                            {item.status === 'em_atendimento' ? 'Em Atendimento' : 'Agendado'}
                          </Badge>
                        </div>
                        
                        {/* Contagem Regressiva */}
                        <div className="bg-background/50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className={`h-4 w-4 ${item.status === 'em_atendimento' ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-xs font-medium text-muted-foreground">
                              {item.status === 'em_atendimento' ? 'Tempo restante' : 'Inicia em'}
                            </span>
                          </div>
                          <span className={`text-lg font-bold ${item.status === 'em_atendimento' ? 'text-primary' : 'text-foreground'}`}>
                            {formatCountdown(countdown)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-primary/10">
                          <Badge variant="outline" className="text-xs">
                            {item.presente ? 'Presente' : 'Aguardando'}
                          </Badge>
                          <p className="text-sm font-bold text-primary">
                            R$ {item.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>}

          </div>;
      case "historico":
        return <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold text-foreground">Histórico</h3>
            
            {/* Sub-tabs */}
            <div className="flex gap-3 bg-card/50 backdrop-blur rounded-lg p-3 border border-primary/20">
              {/* Grupo Agendamentos */}
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground text-center mb-2">Agendamentos</p>
                <button onClick={() => setHistoricoSubTab("agendamentos_pendentes")} className={`w-full py-2 px-3 rounded-md transition-colors ${historicoSubTab === "agendamentos_pendentes" ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-xs">Pendentes</span>
                    <Badge variant={historicoSubTab === "agendamentos_pendentes" ? "secondary" : "outline"} className="text-xs">
                      {agendamentos.length}
                    </Badge>
                  </div>
                </button>
                
                <button onClick={() => setHistoricoSubTab("agendamentos_finalizados")} className={`w-full py-2 px-3 rounded-md transition-colors ${historicoSubTab === "agendamentos_finalizados" ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-xs">Finalizados</span>
                    <Badge variant={historicoSubTab === "agendamentos_finalizados" ? "secondary" : "outline"} className="text-xs">
                      {agendamentosFinalizados.length}
                    </Badge>
                  </div>
                </button>
              </div>

              {/* Grupo Comandas */}
              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground text-center mb-2">Comandas</p>
                <button onClick={() => setHistoricoSubTab("comandas_abertas")} className={`w-full py-2 px-3 rounded-md transition-colors ${historicoSubTab === "comandas_abertas" ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-xs">Abertas</span>
                    <Badge variant={historicoSubTab === "comandas_abertas" ? "secondary" : "outline"} className="text-xs">
                      {comandasAbertas.length}
                    </Badge>
                  </div>
                </button>
                
                <button onClick={() => setHistoricoSubTab("comandas_finalizadas")} className={`w-full py-2 px-3 rounded-md transition-colors ${historicoSubTab === "comandas_finalizadas" ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-xs">Finalizadas</span>
                    <Badge variant={historicoSubTab === "comandas_finalizadas" ? "secondary" : "outline"} className="text-xs">
                      {comandasFinalizadas.length}
                    </Badge>
                  </div>
                </button>
              </div>
            </div>

            {/* Content based on sub-tab */}
            {loading ? <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div> : historicoSubTab === "agendamentos_pendentes" ? agendamentos.length === 0 ? <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum agendamento pendente</p>
                  </CardContent>
                </Card> : agendamentos.map(agendamento => <Card key={agendamento.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-foreground">{agendamento.servico_nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(agendamento.data, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <Badge variant={agendamento.status === 'confirmado' || agendamento.presente ? "default" : "secondary"}>
                          {agendamento.status === 'confirmado' || agendamento.presente ? "Confirmado" : "Aguardando"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-primary">
                          R$ {agendamento.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        {agendamento.status === 'aguardando_confirmacao' && <Button size="sm" variant="default" onClick={() => handleConfirmAppointment(agendamento.id, true)}>
                            <Check className="h-4 w-4 mr-1" />
                            Confirmar Agendamento
                          </Button>}
                      </div>
                    </CardContent>
                  </Card>) : historicoSubTab === "agendamentos_finalizados" ? <UltimosAgendamentos 
                userEmail={userData?.email || ''} 
                maxItems={50}
                compact={false}
              /> : historicoSubTab === "comandas_abertas" ? comandasAbertas.length === 0 ? <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma comanda aberta</p>
                  </CardContent>
                </Card> : comandasAbertas.map(comanda => <Card key={comanda.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">
                              Comanda #{comanda.numero}
                            </h4>
                            <Badge variant="secondary" className="text-xs">
                              {comanda.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Criada: {format(comanda.data_criacao, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comanda.itens?.length || 0} {comanda.itens?.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            R$ {comanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                      
                      {comanda.itens && comanda.itens.length > 0 && <div className="mt-3 pt-3 border-t border-primary/10">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Itens:</p>
                          <div className="space-y-2">
                            {comanda.itens.map((item: any, index: number) => <div key={index} className="bg-muted/30 rounded-md p-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{item.produto_nome}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-muted-foreground">
                                        Qtd: {item.quantidade}
                                      </span>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        Unit: R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-primary">
                                      R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </div>}
                    </CardContent>
                  </Card>) : comandasFinalizadas.length === 0 ? <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhuma comanda finalizada</p>
                  </CardContent>
                </Card> : comandasFinalizadas.map(comanda => <Card key={comanda.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground">
                              Comanda #{comanda.numero}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {comanda.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {comanda.data_finalizacao && `Finalizada: ${format(comanda.data_finalizacao, "dd/MM/yyyy", { locale: ptBR })}`}
                          </p>
                          {comanda.data_pagamento && <p className="text-xs text-muted-foreground">
                              Pago: {format(comanda.data_pagamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {comanda.itens?.length || 0} {comanda.itens?.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            R$ {comanda.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {comanda.tipo_pagamento && <div className="flex items-center justify-end gap-1 mt-1">
                              {comanda.tipo_pagamento === 'PIX' ? <CreditCard className="h-3 w-3 text-blue-600" /> : <Banknote className="h-3 w-3 text-green-600" />}
                              <Badge variant="outline" className="text-xs">
                                {comanda.tipo_pagamento}
                              </Badge>
                            </div>}
                        </div>
                      </div>
                      
                      {comanda.itens && comanda.itens.length > 0 && <div className="mt-3 pt-3 border-t border-primary/10">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Itens:</p>
                          <div className="space-y-2">
                            {comanda.itens.map((item: any, index: number) => <div key={index} className="bg-muted/30 rounded-md p-2">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{item.produto_nome}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-muted-foreground">
                                        Qtd: {item.quantidade}
                                      </span>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <span className="text-xs text-muted-foreground">
                                        Unit: R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-primary">
                                      R$ {(item.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                </div>
                              </div>)}
                          </div>
                        </div>}
                    </CardContent>
                  </Card>)}
          </div>;
      case "financeiro":
        interface Pagamento {
          id: string;
          tipo: 'servico' | 'comanda';
          descricao: string;
          valor: number;
          data: Date;
          metodo: string;
          status: 'pago' | 'pendente';
        }

        const todosPagamentos: Pagamento[] = [
          ...agendamentosFinalizados.map(a => ({
            id: a.id,
            tipo: 'servico' as const,
            descricao: a.servico_nome,
            valor: a.preco,
            data: a.data_atendimento,
            metodo: a.forma_pagamento_utilizada,
            status: 'pago' as const
          })),
          ...comandasFinalizadas.map(c => ({
            id: c.id,
            tipo: 'comanda' as const,
            descricao: `Comanda #${c.numero}`,
            valor: c.total,
            data: c.data_pagamento || c.data_finalizacao || c.data_criacao,
            metodo: c.tipo_pagamento || 'Não informado',
            status: 'pago' as const
          })),
          ...comandasAbertas.map(c => ({
            id: c.id,
            tipo: 'comanda' as const,
            descricao: `Comanda #${c.numero}`,
            valor: c.total,
            data: c.data_criacao,
            metodo: 'Pendente',
            status: 'pendente' as const
          }))
        ].sort((a, b) => b.data.getTime() - a.data.getTime());

        const pagamentosFiltrados = todosPagamentos.filter(p => {
          // Filtro por método
          if (filtroMetodo !== 'todos' && p.metodo !== filtroMetodo) return false;
          
          // Filtro por data
          if (filtroDataInicio && filtroDataFim) {
            return isWithinInterval(p.data, { start: filtroDataInicio, end: filtroDataFim });
          }
          
          return true;
        });

        const financeiroDate = new Date();
        const periodoInicio = filtroPeriodo === 'mensal' ? startOfMonth(financeiroDate) : startOfYear(financeiroDate);
        const periodoFim = filtroPeriodo === 'mensal' ? endOfMonth(financeiroDate) : endOfYear(financeiroDate);

        const totalPeriodo = todosPagamentos
          .filter(p => p.status === 'pago' && isWithinInterval(p.data, { start: periodoInicio, end: periodoFim }))
          .reduce((acc, p) => acc + p.valor, 0);

        const pagamentosPendentes = todosPagamentos.filter(p => p.status === 'pendente');
        const totalPendente = pagamentosPendentes.reduce((acc, p) => acc + p.valor, 0);

        const metodosPagamento = Array.from(new Set(
          agendamentosFinalizados
            .map(a => a.forma_pagamento_utilizada)
            .filter(m => m && m !== 'Não informado')
        ));

        return (
          <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold text-foreground">Área Financeira</h3>

            {/* Card de Resumo Financeiro */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Total Gasto</span>
                  </div>
                  <Select value={filtroPeriodo} onValueChange={(value: "mensal" | "anual") => setFiltroPeriodo(value)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    R$ {totalPeriodo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filtroPeriodo === 'mensal' 
                      ? format(financeiroDate, "MMMM 'de' yyyy", { locale: ptBR })
                      : format(financeiroDate, "yyyy", { locale: ptBR })
                    }
                  </p>
                </div>

                {pagamentosPendentes.length > 0 && (
                  <div className="pt-3 border-t border-primary/20">
                    <div className="flex items-center justify-between text-amber-600">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Pendentes</span>
                      </div>
                      <span className="font-bold">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Métodos de Pagamento Salvos */}
            {metodosPagamento.length > 0 && (
              <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Métodos Utilizados
                  </h4>
                  <div className="space-y-2">
                    {metodosPagamento.map((metodo, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          {metodo.toLowerCase().includes('pix') ? (
                            <QrCode className="h-4 w-4 text-primary" />
                          ) : metodo.toLowerCase().includes('cartão') ? (
                            <CreditCard className="h-4 w-4 text-blue-600" />
                          ) : (
                            <Banknote className="h-4 w-4 text-green-600" />
                          )}
                          <span className="text-sm font-medium">{metodo}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {todosPagamentos.filter(p => p.metodo === metodo && p.status === 'pago').length} vezes
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Filtros de Histórico */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Filter className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Filtrar Histórico</span>
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Método de Pagamento</label>
                  <Select value={filtroMetodo} onValueChange={setFiltroMetodo}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Todos os métodos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os métodos</SelectItem>
                      {metodosPagamento.map((metodo, index) => (
                        <SelectItem key={index} value={metodo}>{metodo}</SelectItem>
                      ))}
                      <SelectItem value="Pendente">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pagamentos Pendentes em Destaque */}
            {pagamentosPendentes.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Pagamentos Pendentes
                </h4>
                {pagamentosPendentes.map(pagamento => (
                  <Card key={pagamento.id} className="bg-amber-50/10 border-amber-600/30">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs bg-amber-600/20 text-amber-600 border-amber-600/30">
                              Pendente
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pagamento.tipo === 'servico' ? 'Serviço' : 'Comanda'}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm text-foreground">{pagamento.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-600">
                            R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Histórico de Pagamentos */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  Histórico Completo
                </h4>
                <Badge variant="outline" className="text-xs">
                  {pagamentosFiltrados.filter(p => p.status === 'pago').length} pagamentos
                </Badge>
              </div>

              {pagamentosFiltrados.length === 0 ? (
                <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                  </CardContent>
                </Card>
              ) : (
                pagamentosFiltrados.map(pagamento => (
                  <Card key={pagamento.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant={pagamento.status === 'pago' ? 'default' : 'secondary'}
                              className={pagamento.status === 'pendente' ? 'bg-amber-600/20 text-amber-600 border-amber-600/30' : ''}
                            >
                              {pagamento.status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pagamento.tipo === 'servico' ? 'Serviço' : 'Comanda'}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm text-foreground">{pagamento.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className="text-lg font-bold text-primary">
                              R$ {pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {pagamento.metodo.toLowerCase().includes('pix') ? (
                                <QrCode className="h-3 w-3 text-primary" />
                              ) : pagamento.metodo.toLowerCase().includes('cartão') ? (
                                <CreditCard className="h-3 w-3 text-blue-600" />
                              ) : pagamento.status === 'pendente' ? (
                                <Clock className="h-3 w-3 text-amber-600" />
                              ) : (
                                <Banknote className="h-3 w-3 text-green-600" />
                              )}
                              <span className="text-xs text-muted-foreground">{pagamento.metodo}</span>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={async () => {
                              try {
                                const html2canvas = (await import('html2canvas')).default;
                                
                                // Cores fixas: fundo preto e textos brancos
                                const bgColor = '#000000';
                                const textColor = '#ffffff';
                                const overlayLight = 'rgba(255, 255, 255, 0.1)';
                                const overlayMedium = 'rgba(255, 255, 255, 0.15)';
                                const borderColor = 'rgba(255, 255, 255, 0.2)';
                                
                                // Criar comprovante visual
                                const comprovanteDiv = document.createElement('div');
                                comprovanteDiv.style.cssText = `
                                  position: fixed;
                                  left: -9999px;
                                  width: 400px;
                                  padding: 32px;
                                  background: ${bgColor};
                                  color: ${textColor};
                                  font-family: system-ui, -apple-system, sans-serif;
                                `;
                                
                                comprovanteDiv.innerHTML = `
                                  <div style="text-align: center; margin-bottom: 24px;">
                                    <img src="${logoMain}" alt="Confallony Logo" style="width: 320px; height: auto; margin: 0 auto 16px; display: block;" />
                                    <p style="font-size: 14px; margin: 0; opacity: 0.9; color: ${textColor};">Comprovante de Pagamento</p>
                                  </div>
                                  
                                  <div style="background: ${overlayLight}; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${textColor};">✓ Status</div>
                                    <div style="font-size: 16px; font-weight: 600; color: ${textColor};">${pagamento.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}</div>
                                  </div>
                                  
                                  <div style="margin-bottom: 16px;">
                                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${textColor};">📋 Descrição</div>
                                    <div style="font-size: 14px; font-weight: 500; color: ${textColor};">${pagamento.descricao}</div>
                                  </div>
                                  
                                  <div style="margin-bottom: 16px;">
                                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${textColor};">📅 Data e Hora</div>
                                    <div style="font-size: 14px; color: ${textColor};">${format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</div>
                                  </div>
                                  
                                  <div style="margin-bottom: 16px;">
                                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${textColor};">💳 Método de Pagamento</div>
                                    <div style="font-size: 14px; color: ${textColor};">${pagamento.metodo}</div>
                                  </div>
                                  
                                  <div style="margin-bottom: 16px;">
                                    <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px; color: ${textColor};">🏷️ Tipo</div>
                                    <div style="font-size: 14px; color: ${textColor};">${pagamento.tipo === 'servico' ? 'Serviço' : 'Comanda'}</div>
                                  </div>
                                  
                                  <div style="background: ${overlayMedium}; padding: 20px; border-radius: 8px; text-align: center; margin-top: 24px;">
                                    <div style="font-size: 14px; opacity: 0.8; margin-bottom: 8px; color: ${textColor};">💰 Valor Total</div>
                                    <div style="font-size: 32px; font-weight: bold; color: ${textColor};">R$ ${pagamento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                  </div>
                                  
                                  <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid ${borderColor};">
                                    <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: ${textColor};">Obrigado pela preferência!</p>
                                    <p style="font-size: 11px; opacity: 0.7; margin: 0; color: ${textColor};">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                  </div>
                                `;
                                
                                document.body.appendChild(comprovanteDiv);
                                
                                // Capturar como imagem
                                const canvas = await html2canvas(comprovanteDiv, {
                                  backgroundColor: null,
                                  scale: 2
                                });
                                
                                document.body.removeChild(comprovanteDiv);
                                
                                // Baixar PNG
                                canvas.toBlob((blob) => {
                                  if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    
                                    // Nome do arquivo baseado no tipo
                                    const dataFormatada = format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
                                    const nomeArquivo = pagamento.tipo === 'servico' 
                                      ? `${pagamento.descricao}-${dataFormatada}.png`
                                      : `comanda-${dataFormatada}.png`;
                                    
                                    link.download = nomeArquivo;
                                    link.href = url;
                                    link.click();
                                    URL.revokeObjectURL(url);
                                    toast({
                                      title: "Comprovante salvo!",
                                      description: "O comprovante foi baixado como PNG."
                                    });
                                  }
                                });
                              } catch (error) {
                                console.error('Erro ao gerar comprovante:', error);
                                toast({
                                  title: "Erro",
                                  description: "Não foi possível gerar o comprovante.",
                                  variant: "destructive"
                                });
                              }
                            }}
                            className="h-8 gap-1"
                          >
                            <Receipt className="h-3 w-3" />
                            <span className="text-xs">Salvar comprovante</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
      case "configuracoes":
        return <div className="space-y-4 p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">Configurações</h3>
            
            {/* Configurações de Aparência */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                  <div className="flex items-center gap-3">
                    <Palette className="h-5 w-5 text-primary" />
                    <span className="font-medium">Alterar Tema</span>
                  </div>
                  <ThemeSelector />
                </div>
              </CardContent>
            </Card>

            {/* Configurações de Lembretes de Agendamento */}
            <AgendamentoReminderConfig />

            {/* Botão de Logout */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 pb-6">
                <Button variant="destructive" className="w-full justify-start gap-3" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                  Sair da Conta
                </Button>
              </CardContent>
            </Card>
          </div>;
      default:
        return null;
    }
  };
  if (!currentUser || !userData) {
    return <Navigate to="/login" replace />;
  }
  return <>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-20">
        {/* Header */}
        <div className="bg-primary/10 backdrop-blur-sm border-b border-primary/20 px-4 py-4 sticky top-0 z-10">
          <h1 className="text-xl font-bold text-foreground">Meu Perfil</h1>
        </div>

        {/* Content */}
        <div className="max-w-lg mx-auto">
          {renderContent()}
        </div>


        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-primary/20 px-2 py-3 z-50">
          <div className="max-w-lg mx-auto flex justify-around items-center">
            <button onClick={() => setActiveTab("perfil")} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${activeTab === "perfil" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
              <User className="h-5 w-5" />
              <span className="text-[10px] font-medium">Perfil</span>
            </button>

            <button onClick={() => setActiveTab("historico")} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${activeTab === "historico" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
              <History className="h-5 w-5" />
              <span className="text-[10px] font-medium">Histórico</span>
            </button>

            <button onClick={() => setActiveTab("financeiro")} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${activeTab === "financeiro" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
              <Wallet className="h-5 w-5" />
              <span className="text-[10px] font-medium">Financeiro</span>
            </button>

            <button onClick={() => setActiveTab("configuracoes")} className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors ${activeTab === "configuracoes" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}>
              <Settings className="h-5 w-5" />
              <span className="text-[10px] font-medium">Configurações</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {agendamentoParaAvaliar && (
        <AvaliacaoModal
          open={avaliacaoModalOpen}
          onOpenChange={(open) => {
            setAvaliacaoModalOpen(open);
            if (!open) {
              setAgendamentoParaAvaliar(null);
            }
          }}
          agendamentoId={agendamentoParaAvaliar.id}
          usuarioId={currentUser?.uid || ''}
          usuarioNome={userData?.nome || ''}
          servicoNome={agendamentoParaAvaliar.servico_nome}
        />
      )}
      
      {selectedAgendamento && <>
          <EditAgendamentoModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} agendamento={selectedAgendamento} onUpdate={() => {
        setEditModalOpen(false);
        // Recarrega agendamentos após edição
        const loadData = async () => {
          if (userData?.email) {
            const q = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['aguardando_confirmacao', 'confirmado']));
            const agendamentosSnapshot = await getDocs(q);
            const items: QueueItem[] = [];
            agendamentosSnapshot.forEach(doc => {
              const data = doc.data();
              items.push({
                id: doc.id,
                servico_nome: data.servico_nome,
                preco: data.preco || 0,
                status: data.status,
                data: data.data?.toDate() || new Date(),
                presente: data.presente || false,
                cancelamentos: data.cancelamentos || 0,
                barbeiro: data.barbeiro,
                reagendado: data.reagendado || false,
                editado: data.editado || false,
                tempo_estimado: data.tempo_estimado || 30
              });
            });
            setAgendamentos(items.sort((a, b) => a.data.getTime() - b.data.getTime()));
          }
        };
        loadData();
      }} />
          
          <ReagendamentoModal isOpen={reagendamentoModalOpen} onClose={() => setReagendamentoModalOpen(false)} agendamento={{
        ...selectedAgendamento,
        tempo_estimado: selectedAgendamento.tempo_estimado || 30
      }} onUpdate={() => {
        setReagendamentoModalOpen(false);
        // Recarrega agendamentos após reagendamento
        const loadData = async () => {
          if (userData?.email) {
            const q = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['aguardando_confirmacao', 'confirmado']));
            const agendamentosSnapshot = await getDocs(q);
            const items: QueueItem[] = [];
            agendamentosSnapshot.forEach(doc => {
              const data = doc.data();
              items.push({
                id: doc.id,
                servico_nome: data.servico_nome,
                preco: data.preco || 0,
                status: data.status,
                data: data.data?.toDate() || new Date(),
                presente: data.presente || false,
                cancelamentos: data.cancelamentos || 0,
                barbeiro: data.barbeiro,
                reagendado: data.reagendado || false,
                editado: data.editado || false,
                tempo_estimado: data.tempo_estimado || 30
              });
            });
            setAgendamentos(items.sort((a, b) => a.data.getTime() - b.data.getTime()));
          }
        };
        loadData();
      }} />
        </>}
    </>;
};
export default ProfileMobile;