import { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, Wallet, Award, History, Settings, Clock, CheckCircle, ShoppingCart, Calendar, AlertTriangle, X, Scissors, CreditCard, Banknote, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComandas, type Comanda } from "@/hooks/useComandas";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditAgendamentoModal } from "@/components/EditAgendamentoModal";
import { ReagendamentoModal } from "@/components/ReagendamentoModal";
import maleProfileAvatar from "@/assets/male-profile-avatar.jpg";

interface QueueItem {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  servico_nome: string;
  servico_tipo: string;
  preco: number;
  status: 'aguardando_confirmacao' | 'em_atendimento' | 'concluido' | 'confirmado';
  posicao: number;
  tempo_estimado: number;
  data: Date;
  presente: boolean;
  tempo_inicio?: Date;
  tempo_fim?: Date;
  data_criacao: Date;
  cancelamentos?: number;
  barbeiro?: string;
  reagendado?: boolean;
  editado?: boolean;
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

interface AgendamentoCancelado {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  servico_nome: string;
  servico_tipo: string;
  preco: number;
  tempo_estimado: number;
  data_agendamento: Date;
  data_cancelamento: Date;
  motivo_cancelamento: string;
  status_original: string;
  funcionario_nome: string;
  forma_pagamento: string;
  reembolsado?: boolean;
}

const Profile = () => {
  const { currentUser, userData, updateUserData, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { comandasFinalizadas, loading: loadingComandas } = useComandas();

  // Redireciona usuários não-admin para /profile-mobile
  if (userData && !authLoading && !userData.isAdmin) {
    return <Navigate to="/profile-mobile" replace />;
  }
  const [isLoading, setIsLoading] = useState(false);
  const [servicosPendentes, setServicosPendentes] = useState<QueueItem[]>([]);
  const [atendimentosConcluidos, setAtendimentosConcluidos] = useState<AtendimentoConcluido[]>([]);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState<AgendamentoCancelado[]>([]);
  const [loadingServicos, setLoadingServicos] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [reagendamentoModalOpen, setReagendamentoModalOpen] = useState(false);
  const [reembolsoModalOpen, setReembolsoModalOpen] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<QueueItem | null>(null);
  const [selectedCancelado, setSelectedCancelado] = useState<AgendamentoCancelado | null>(null);
  const [atendimentosPage, setAtendimentosPage] = useState(1);
  const [comandasPage, setComandasPage] = useState(1);
  const [formData, setFormData] = useState({
    nome: userData?.nome || "",
    telefone: userData?.telefone || "",
    email: userData?.email || "",
    newPassword: "",
    confirmPassword: "",
    tempoAtendimento: userData?.tempo_atendimento || 40
  });

  // Formata a data para exibição
  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR }) + ' UTC-3';
  };

  // Paginação para atendimentos
  const itemsPerPage = 10;
  const totalAtendimentosPages = Math.ceil(atendimentosConcluidos.length / itemsPerPage);
  const paginatedAtendimentos = atendimentosConcluidos.slice(
    (atendimentosPage - 1) * itemsPerPage,
    atendimentosPage * itemsPerPage
  );

  // Paginação para comandas
  const totalComandasPages = Math.ceil(comandasFinalizadas.length / itemsPerPage);
  const paginatedComandas = comandasFinalizadas.slice(
    (comandasPage - 1) * itemsPerPage,
    comandasPage * itemsPerPage
  );

  // Carrega serviços pendentes do usuário
  const loadServicosPendentes = async () => {
    if (!userData?.email) return;
    
    try {
      const q = query(
        collection(db, 'fila'),
        where('usuario_email', '==', userData.email),
        where('status', 'in', ['aguardando_confirmacao', 'confirmado'])
      );
      
      const querySnapshot = await getDocs(q);
      const servicos: QueueItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        servicos.push({
          id: doc.id,
          usuario_id: data.usuario_id,
          usuario_nome: data.usuario_nome,
          usuario_email: data.usuario_email,
          servico_nome: data.servico_nome,
          servico_tipo: data.servico_tipo || "Outros",
          preco: data.preco || 0,
          status: data.status,
          posicao: data.posicao || 0,
          tempo_estimado: data.tempo_estimado || 30,
          data: data.data?.toDate() || new Date(),
          presente: data.presente || false,
          tempo_inicio: data.tempo_inicio?.toDate(),
          tempo_fim: data.tempo_fim?.toDate(),
          data_criacao: data.data_criacao?.toDate() || new Date(),
          cancelamentos: data.cancelamentos || 0,
          barbeiro: data.barbeiro,
          reagendado: data.reagendado || false,
          editado: data.editado || false
        });
      });
      
      // Ordena por data de criação (mais recente primeiro)
      setServicosPendentes(servicos.sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime()));
    } catch (error) {
      console.error('Erro ao carregar serviços pendentes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos.",
        variant: "destructive"
      });
    }
  };

  // Atualiza o status de presença no Firestore
  const handleConfirmarPresenca = async (id: string, presente: boolean) => {
    try {
      const servicoRef = doc(db, 'fila', id);
      await updateDoc(servicoRef, {
        presente: presente,
        status: presente ? 'confirmado' : 'aguardando_confirmacao'
      });

      // Atualiza a lista local
      setServicosPendentes(prev => 
        prev.map(servico => 
          servico.id === id ? {...servico, presente, status: presente ? 'confirmado' : 'aguardando_confirmacao'} : servico
        )
      );

      toast({
        title: presente ? "Presença confirmada!" : "Presença cancelada",
        description: presente 
          ? "Sua presença foi registrada com sucesso." 
          : "Você cancelou sua presença neste horário.",
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
      const servico = servicosPendentes.find(s => s.id === id);
      if (!servico) return;

      const servicoRef = doc(db, 'fila', id);
      await updateDoc(servicoRef, {
        status: 'aguardando_confirmacao',
        presente: false,
        cancelamentos: (servico.cancelamentos || 0) + 1
      });

      // Atualiza a lista local
      setServicosPendentes(prev => 
        prev.map(s => 
          s.id === id ? {
            ...s, 
            status: 'aguardando_confirmacao', 
            presente: false,
            cancelamentos: (s.cancelamentos || 0) + 1
          } : s
        )
      );

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

  // Abre modal de confirmação de reembolso
  const handleOpenReembolsoModal = (cancelado: AgendamentoCancelado) => {
    setSelectedCancelado(cancelado);
    setReembolsoModalOpen(true);
  };

  // Processa reembolso do agendamento cancelado
  const handleConfirmarReembolso = async () => {
    if (!selectedCancelado) return;
    
    try {
      const canceladoRef = doc(db, 'agendamentos_cancelados', selectedCancelado.id);
      await updateDoc(canceladoRef, {
        reembolsado: true
      });

      // Atualiza a lista local
      setAgendamentosCancelados(prev => 
        prev.map(cancelado => 
          cancelado.id === selectedCancelado.id 
            ? { ...cancelado, reembolsado: true } 
            : cancelado
        )
      );

      toast({
        title: "Reembolso processado!",
        description: `Reembolso de R$ ${selectedCancelado.preco.toFixed(2)} foi processado com sucesso.`
      });

      setReembolsoModalOpen(false);
      setSelectedCancelado(null);
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o reembolso.",
        variant: "destructive"
      });
    }
  };

  // Carrega histórico de atendimentos concluídos (TODOS os agendamentos)
  const loadAtendimentosConcluidos = async () => {    
    try {
      const q = query(
        collection(db, 'agendamentos_finalizados')
      );
      
      const querySnapshot = await getDocs(q);
      const atendimentos: AtendimentoConcluido[] = [];
      
      querySnapshot.forEach((doc) => {
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
      
      // Ordena por data de atendimento (mais recente primeiro)
      setAtendimentosConcluidos(atendimentos.sort((a, b) => b.data_atendimento.getTime() - a.data_atendimento.getTime()));
    } catch (error) {
      console.error('Erro ao carregar atendimentos concluídos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive"
      });
    }
  };

  // Carrega histórico de agendamentos cancelados
  const loadAgendamentosCancelados = async () => {
    try {
      const q = query(
        collection(db, 'agendamentos_cancelados')
      );
      
      const querySnapshot = await getDocs(q);
      const cancelados: AgendamentoCancelado[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        cancelados.push({
          id: doc.id,
          usuario_id: data.usuario_id || '',
          usuario_nome: data.usuario_nome || 'Usuário não informado',
          usuario_email: data.usuario_email || '',
          servico_nome: data.servico_nome || 'Serviço não informado',
          servico_tipo: data.servico_tipo || 'Outros',
          preco: data.preco || 0,
          tempo_estimado: data.tempo_estimado || 30,
          data_agendamento: data.data_agendamento?.toDate() || new Date(),
          data_cancelamento: data.data_cancelamento?.toDate() || new Date(),
          motivo_cancelamento: data.motivo_cancelamento || 'Motivo não informado',
          status_original: data.status_original || 'N/A',
          funcionario_nome: data.funcionario_nome || 'Funcionário não informado',
          forma_pagamento: data.forma_pagamento || 'Presencial',
          reembolsado: data.reembolsado || false
        });
      });
      
      // Ordena por data de cancelamento (mais recente primeiro)
      setAgendamentosCancelados(cancelados.sort((a, b) => b.data_cancelamento.getTime() - a.data_cancelamento.getTime()));
    } catch (error) {
      console.error('Erro ao carregar agendamentos cancelados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os agendamentos cancelados.",
        variant: "destructive"
      });
    }
  };

  // Carrega dados quando userData está disponível
  useEffect(() => {
    if (userData?.email) {
      const loadData = async () => {
        setLoadingServicos(true);
        await Promise.all([
          loadServicosPendentes(),
          loadAtendimentosConcluidos(),
          loadAgendamentosCancelados()
        ]);
        setLoadingServicos(false);
        // Reset pagination when data loads
        setAtendimentosPage(1);
        setComandasPage(1);
      };
      loadData();
    }
  }, [userData?.email]);

  // Atualiza formData quando userData muda
  useEffect(() => {
    if (userData) {
      setFormData({
        nome: userData.nome || "",
        telefone: userData.telefone || "",
        email: userData.email || "",
        newPassword: "",
        confirmPassword: "",
        tempoAtendimento: userData.tempo_atendimento || 40
      });
    }
  }, [userData]);

  const handleUpdateProfile = async () => {
    if (!currentUser || !userData) return;
    
    setIsLoading(true);
    try {
      await updateUserData({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        tempo_atendimento: formData.tempoAtendimento
      });

      if (formData.email !== userData.email) {
        await updateEmail(currentUser, formData.email);
      }

      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o perfil.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (!currentUser) return;
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive"
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(currentUser, formData.newPassword);
      setFormData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso."
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar senha. Faça login novamente e tente.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  if (authLoading || !userData) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Carregando perfil...</h2>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-muted/30 mobile-padding py-4 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="barbershop-card mobile-card overflow-hidden">
            <CardContent className="mobile-card pt-6 sm:pt-8 pb-6 sm:pb-8">
              <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                    <img 
                      src={maleProfileAvatar} 
                      alt="Profile Avatar"
                      className="w-full h-full rounded-full object-cover border-4 border-primary/20 shadow-lg"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full border-4 border-background flex items-center justify-center">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                </div>

                {/* User Info Section */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{userData.nome}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground break-all sm:break-normal mb-1">{userData.email}</p>
                    {userData.telefone && (
                      <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                        <Phone className="h-4 w-4" />
                        {userData.telefone}
                      </p>
                    )}
                  </div>

                  {/* Badges Section */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-start gap-3">
                    <Badge variant="secondary" className="flex items-center gap-2 text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20">
                      <Award className="h-4 w-4" />
                      <span className="font-semibold">{userData.pontos_fidelidade || 0}</span>
                      <span className="hidden xs:inline">pontos de fidelidade</span>
                      <span className="xs:hidden">pts</span>
                    </Badge>
                    
                    {userData?.isAdmin && (
                      <Badge variant="outline" className="flex items-center gap-2 text-sm px-4 py-2">
                        <User className="h-4 w-4" />
                        ADMINISTRADOR
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Tabs */}
          <Tabs defaultValue="services" className="space-y-3 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-0.5 sm:gap-1 h-auto p-1">
              <TabsTrigger value="services" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">
                <span>Serviços</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">
                <span>Histórico</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4">
                <span>Configurações</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="services" className="space-y-4 sm:space-y-6">
              <Card className="barbershop-card">
                <CardHeader className="mobile-card pb-3 sm:pb-6">
                  <CardTitle className="mobile-heading">Serviços</CardTitle>
                </CardHeader>
                <CardContent className="mobile-card">
                  <Tabs defaultValue="pendentes" className="space-y-3 sm:space-y-4">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 gap-0.5 sm:gap-1 h-auto p-1">
                      <TabsTrigger value="pendentes" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-2">
                        <span className="hidden md:inline">Agendamentos Pendentes</span>
                        <span className="md:hidden">Pendentes</span>
                      </TabsTrigger>
                      <TabsTrigger value="concluidos" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-2">
                        <span className="hidden md:inline">Agendamentos Concluídos</span>
                        <span className="md:hidden">Concluídos</span>
                      </TabsTrigger>
                      <TabsTrigger value="cancelados" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-2">
                        <span className="hidden md:inline">Agendamentos Cancelados</span>
                        <span className="md:hidden">Cancelados</span>
                      </TabsTrigger>
                      <TabsTrigger value="comandas" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-2">
                        <span className="hidden md:inline">Comandas Finalizadas</span>
                        <span className="md:hidden">Comandas</span>
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="pendentes" className="space-y-3 sm:space-y-4">
                      {loadingServicos ? (
                        <div className="text-center py-6 sm:py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                          <p className="mobile-text text-muted-foreground">Carregando agendamentos...</p>
                        </div>
                      ) : servicosPendentes.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {servicosPendentes.map((servico) => (
                            <div key={servico.id} className="border rounded-lg mobile-card space-y-3 sm:space-y-2">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-sm sm:text-base truncate">{servico.servico_nome}</h3>
                                  <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                    <p className="break-words">
                                      Criado: {format(servico.data_criacao, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                    <p className="break-words">
                                      Agendado: {format(servico.data, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                    </p>
                                    {servico.tempo_inicio && servico.tempo_fim && (
                                      <p>
                                        Horário: {format(servico.tempo_inicio, 'HH:mm')} - {format(servico.tempo_fim, 'HH:mm')}
                                      </p>
                                    )}
                                    {servico.barbeiro && (
                                      <p className="truncate">
                                        Profissional: {servico.barbeiro}
                                      </p>
                                    )}
                                    <p>
                                      Duração: {servico.tempo_estimado} min
                                    </p>
                                  </div>
                                </div>
                                <Badge 
                                  variant={servico.status === 'confirmado' ? 'default' : 'outline'} 
                                  className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0 mt-2 sm:mt-0"
                                >
                                  {servico.status === 'confirmado' ? (
                                    <CheckCircle className="h-3 w-3" />
                                  ) : (
                                    <Clock className="h-3 w-3" />
                                  )}
                                  <span className="hidden sm:inline">
                                    {servico.status === 'confirmado' ? 'Confirmado' : 'Aguardando Confirmação'}
                                  </span>
                                  <span className="sm:hidden">
                                    {servico.status === 'confirmado' ? 'OK' : 'Aguard.'}
                                  </span>
                                </Badge>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 space-y-3 sm:space-y-0 border-t">
                                <div className={`flex items-center gap-2 text-xs sm:text-sm ${
                                  servico.status === 'confirmado' ? 'text-green-600' : 'text-amber-600'
                                }`}>
                                  {servico.status === 'confirmado' ? (
                                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  ) : (
                                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                  )}
                                  <span className="hidden sm:inline">
                                    {servico.status === 'confirmado' 
                                      ? 'Presença confirmada' 
                                      : 'Aguardando confirmação de presença'}
                                  </span>
                                  <span className="sm:hidden">
                                    {servico.status === 'confirmado' ? 'Confirmado' : 'Aguardando'}
                                  </span>
                                </div>
                                {servico.status === 'aguardando_confirmacao' ? (
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`presente-${servico.id}`}
                                      checked={servico.presente}
                                      onCheckedChange={(checked) => 
                                        handleConfirmarPresenca(servico.id, Boolean(checked))
                                      }
                                    />
                                    <Label htmlFor={`presente-${servico.id}`} className="text-xs sm:text-sm">
                                      <span className="hidden sm:inline">Confirmar presença</span>
                                      <span className="sm:hidden">Confirmar</span>
                                    </Label>
                                  </div>
                                ) : (
                                  <div className="flex flex-col sm:flex-row gap-2">
                                     {(servico.cancelamentos || 0) === 0 ? (
                                       <AlertDialog>
                                         <AlertDialogTrigger asChild>
                                           <Button variant="destructive" size="sm" className="mobile-button text-xs sm:text-sm">
                                             <span className="hidden sm:inline">Cancelar Agendamento</span>
                                             <span className="sm:hidden">Cancelar</span>
                                           </Button>
                                         </AlertDialogTrigger>
                                         <AlertDialogContent className="mobile-padding max-w-sm sm:max-w-lg">
                                           <AlertDialogHeader className="text-left">
                                             <AlertDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
                                               <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500 flex-shrink-0" />
                                               <span>Cancelar Agendamento</span>
                                             </AlertDialogTitle>
                                             <AlertDialogDescription className="text-xs sm:text-sm">
                                               Você tem certeza que deseja cancelar este agendamento? 
                                               Você pode editar as informações antes de cancelar.
                                               <br />
                                               <strong>Atenção:</strong> Você só pode cancelar 1 vez por agendamento.
                                             </AlertDialogDescription>
                                           </AlertDialogHeader>
                                           <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                                             {!servico.editado && (
                                               <Button
                                                 variant="outline"
                                                 onClick={() => handleEditarAgendamento(servico)}
                                                 className="mobile-button text-xs sm:text-sm"
                                               >
                                                 <span className="hidden sm:inline">Editar Agendamento</span>
                                                 <span className="sm:hidden">Editar</span>
                                               </Button>
                                             )}
                                             <AlertDialogCancel className="mobile-button text-xs sm:text-sm">
                                               <span className="hidden sm:inline">Manter Agendamento</span>
                                               <span className="sm:hidden">Manter</span>
                                             </AlertDialogCancel>
                                             <AlertDialogAction
                                               onClick={() => handleCancelarAgendamento(servico.id)}
                                               className="mobile-button text-xs sm:text-sm bg-destructive"
                                             >
                                               <span className="hidden sm:inline">Confirmar Cancelamento</span>
                                               <span className="sm:hidden">Confirmar</span>
                                             </AlertDialogAction>
                                           </AlertDialogFooter>
                                         </AlertDialogContent>
                                       </AlertDialog>
                                     ) : (servico.cancelamentos === 1 && !servico.reagendado) ? (
                                       <Button 
                                         variant="outline" 
                                         size="sm" 
                                         className="mobile-button text-xs sm:text-sm border-blue-500 text-blue-600"
                                         onClick={() => handleReagendarAgendamento(servico)}
                                       >
                                         <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                                         <span className="hidden sm:inline">Reagendar sem Cobrança</span>
                                         <span className="sm:hidden">Reagendar</span>
                                       </Button>
                                     ) : (
                                       <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                                         <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                         <span className="hidden sm:inline">
                                           {servico.reagendado ? 'Reagendado - Não é possível cancelar ou reagendar novamente' : 'Quantidade de cancelamento excedida em 1'}
                                         </span>
                                         <span className="sm:hidden">
                                           {servico.reagendado ? 'Reagendado' : 'Limite excedido'}
                                         </span>
                                       </Badge>
                                     )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <Clock className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                          <p className="mobile-text text-muted-foreground">Nenhum agendamento pendente encontrado.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="concluidos" className="space-y-3 sm:space-y-4">
                      {loadingServicos ? (
                        <div className="text-center py-6 sm:py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                          <p className="mobile-text text-muted-foreground">Carregando histórico...</p>
                        </div>
                      ) : atendimentosConcluidos.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {atendimentosConcluidos.map((atendimento) => (
                             <div key={atendimento.id} className="border rounded-lg mobile-card space-y-2">
                               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                 <div className="flex-1 min-w-0">
                                   <h3 className="font-semibold text-sm sm:text-base truncate">{atendimento.servico_nome}</h3>
                                   <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                     <p className="truncate">
                                       <strong>Profissional:</strong> {atendimento.funcionario_nome}
                                     </p>
                                     <p>
                                       <strong>Data conclusão:</strong> {format(atendimento.data_conclusao, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                     </p>
                                     <p>
                                       <strong>Pagamento:</strong> {atendimento.forma_pagamento_utilizada}
                                     </p>
                                   </div>
                                 </div>
                                 <Badge variant="default" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0 mt-2 sm:mt-0">
                                   <CheckCircle className="h-3 w-3" />
                                   <span className="hidden sm:inline">Concluído - R$ {atendimento.preco.toFixed(2)}</span>
                                   <span className="sm:hidden">R$ {atendimento.preco.toFixed(2)}</span>
                                 </Badge>
                               </div>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                          <p className="mobile-text text-muted-foreground">Nenhum atendimento concluído encontrado.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="cancelados" className="space-y-3 sm:space-y-4">
                      {loadingServicos ? (
                        <div className="text-center py-6 sm:py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                          <p className="mobile-text text-muted-foreground">Carregando agendamentos cancelados...</p>
                        </div>
                      ) : agendamentosCancelados.length > 0 ? (
                        <div className="space-y-3 sm:space-y-4">
                          {agendamentosCancelados.map((cancelado) => (
                             <div key={cancelado.id} className="border rounded-lg mobile-card space-y-2">
                               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                 <div className="flex-1 min-w-0">
                                   <h3 className="font-semibold text-sm sm:text-base truncate">{cancelado.servico_nome}</h3>
                                   <div className="space-y-1 text-xs sm:text-sm text-muted-foreground">
                                     <p>
                                       <strong>Cliente:</strong> {cancelado.usuario_nome}
                                     </p>
                                     <p>
                                       <strong>Data agendamento:</strong> {format(cancelado.data_agendamento, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                     </p>
                                     <p>
                                       <strong>Data cancelamento:</strong> {format(cancelado.data_cancelamento, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                     </p>
                                     <p>
                                       <strong>Motivo:</strong> {cancelado.motivo_cancelamento}
                                     </p>
                                     <p>
                                       <strong>Profissional:</strong> {cancelado.funcionario_nome}
                                     </p>
                                   </div>
                                 </div>
                                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                   <Badge variant="destructive" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
                                     <X className="h-3 w-3" />
                                     <span className="hidden sm:inline">Cancelado - R$ {cancelado.preco.toFixed(2)}</span>
                                     <span className="sm:hidden">R$ {cancelado.preco.toFixed(2)}</span>
                                   </Badge>
                                   
                                   {cancelado.reembolsado ? (
                                     <Badge variant="default" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0 bg-green-600">
                                       <CheckCircle className="h-3 w-3" />
                                       <span>Reembolsado</span>
                                     </Badge>
                                   ) : (
                                     <Button
                                       size="sm"
                                       variant="outline"
                                       onClick={() => handleOpenReembolsoModal(cancelado)}
                                       className="flex items-center gap-1 text-xs sm:text-sm border-red-200 text-red-600"
                                     >
                                       <RefreshCw className="h-3 w-3" />
                                       <span>Reembolsar</span>
                                     </Button>
                                   )}
                                 </div>
                               </div>
                             </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <X className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                          <p className="mobile-text text-muted-foreground">Nenhum agendamento cancelado encontrado.</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="comandas" className="space-y-3 sm:space-y-4">
                      {loadingComandas ? (
                        <div className="text-center py-6 sm:py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto mb-3 sm:mb-4"></div>
                          <p className="mobile-text text-muted-foreground">Carregando comandas...</p>
                        </div>
                      ) : comandasFinalizadas.filter(c => c.cliente_nome === userData?.nome || c.cliente_id === userData?.uid).length > 0 ? (
                         <div className="space-y-3 sm:space-y-4">
                           {comandasFinalizadas
                             .filter(c => c.cliente_nome === userData?.nome || c.cliente_id === userData?.uid)
                             .map((comanda) => (
                             <div key={comanda.id} className="border rounded-lg mobile-card space-y-3">
                               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                 <div className="flex-1 min-w-0">
                                   <h3 className="font-semibold text-sm sm:text-base">Comanda #{comanda.numero}</h3>
                                   <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                                     <p><strong>Cliente:</strong> {comanda.cliente_nome}</p>
                                     {comanda.cliente_cpf && comanda.cliente_cpf !== 'não inserido' && (
                                       <p><strong>CPF:</strong> {comanda.cliente_cpf}</p>
                                     )}
                                     {comanda.cliente_telefone && comanda.cliente_telefone !== 'não inserido' && (
                                       <p><strong>Telefone:</strong> {comanda.cliente_telefone}</p>
                                     )}
                                     <p>
                                       {comanda.data_finalizacao 
                                         ? format(comanda.data_finalizacao, "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                                         : format(comanda.data_criacao, "dd/MM/yy 'às' HH:mm", { locale: ptBR })
                                       }
                                     </p>
                                   </div>
                                 </div>
                                 <Badge variant="default" className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0 mt-2 sm:mt-0">
                                   <CheckCircle className="h-3 w-3" />
                                   <span className="hidden sm:inline">Finalizada - R$ {comanda.total.toFixed(2)}</span>
                                   <span className="sm:hidden">R$ {comanda.total.toFixed(2)}</span>
                                 </Badge>
                               </div>
                               <div className="space-y-2">
                                 <h4 className="text-xs sm:text-sm font-medium">Itens:</h4>
                                 <div className="space-y-1 sm:space-y-2">
                                   {comanda.itens.map((item, index) => (
                                     <div key={index} className="flex justify-between text-xs sm:text-sm bg-muted/50 p-2 rounded">
                                       <span className="truncate pr-2">{item.quantidade}x {item.produto_nome}</span>
                                       <span className="flex-shrink-0">R$ {item.total.toFixed(2)}</span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             </div>
                           ))}
                         </div>
                      ) : (
                        <div className="text-center py-6 sm:py-8">
                          <ShoppingCart className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
                          <p className="mobile-text text-muted-foreground">Nenhuma comanda finalizada encontrada.</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4 sm:space-y-6">
              <Card className="barbershop-card">
                <CardHeader className="mobile-card pb-3 sm:pb-6">
                  <CardTitle className="mobile-heading">Histórico Completo de Atividades</CardTitle>
                </CardHeader>
                <CardContent className="mobile-card">
                  <div className="space-y-4 sm:space-y-6">
                    {/* Histórico de Atendimentos */}
                    <div>
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold">Atendimentos Realizados</h3>
                        {atendimentosConcluidos.length > itemsPerPage && (
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {atendimentosConcluidos.length} total
                          </span>
                        )}
                      </div>
                      {loadingServicos ? (
                        <div className="text-center py-3 sm:py-4">
                          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Carregando...</p>
                        </div>
                      ) : atendimentosConcluidos.length > 0 ? (
                        <>
                          <div className="space-y-2 sm:space-y-3">
                            {paginatedAtendimentos.map((atendimento) => (
                              <div key={atendimento.id} className="border rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-1 sm:space-y-0">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium block truncate">{atendimento.servico}</span>
                                    <span className="text-muted-foreground block truncate">• {atendimento.barbeiro}</span>
                                  </div>
                                  <div className="text-left sm:text-right flex-shrink-0">
                                    <div className="font-medium">R$ {atendimento.preco.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {format(atendimento.data_atendimento, "dd/MM/yy", { locale: ptBR })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Paginação dos Atendimentos */}
                          {totalAtendimentosPages > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAtendimentosPage(prev => Math.max(prev - 1, 1))}
                                disabled={atendimentosPage === 1}
                                className="text-xs"
                              >
                                Anterior
                              </Button>
                              <span className="text-xs text-muted-foreground px-2">
                                {atendimentosPage} de {totalAtendimentosPages}
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAtendimentosPage(prev => Math.min(prev + 1, totalAtendimentosPages))}
                                disabled={atendimentosPage === totalAtendimentosPages}
                                className="text-xs"
                              >
                                Próximo
                              </Button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="mobile-text text-muted-foreground">Nenhum atendimento encontrado.</p>
                      )}
                    </div>

                    {/* Histórico de Comandas */}
                    <div>
                      <div className="flex justify-between items-center mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-semibold">Comandas Finalizadas</h3>
                        {comandasFinalizadas.length > itemsPerPage && (
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {comandasFinalizadas.length} total
                          </span>
                        )}
                      </div>
                      {loadingComandas ? (
                        <div className="text-center py-3 sm:py-4">
                          <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-primary mx-auto mb-2"></div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Carregando...</p>
                        </div>
                      ) : comandasFinalizadas.length > 0 ? (
                         <>
                           <div className="space-y-2 sm:space-y-3">
                              {paginatedComandas.map((comanda) => (
                               <div key={comanda.id} className="border rounded-lg p-2 sm:p-3 text-xs sm:text-sm">
                                 <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-2 sm:space-y-0">
                                   <div className="flex-1 min-w-0">
                                     <span className="font-medium block">Comanda #{comanda.numero}</span>
                                     <span className="text-muted-foreground block">Cliente: {comanda.cliente_nome}</span>
                                     {comanda.cliente_cpf && comanda.cliente_cpf !== 'não inserido' && (
                                       <span className="text-muted-foreground block">CPF: {comanda.cliente_cpf}</span>
                                     )}
                                     {comanda.cliente_telefone && comanda.cliente_telefone !== 'não inserido' && (
                                       <span className="text-muted-foreground block">Telefone: {comanda.cliente_telefone}</span>
                                     )}
                                     <span className="text-muted-foreground block">• {comanda.itens.length} itens</span>
                                     
                                     {/* Tipo de pagamento e data */}
                                     {comanda.tipo_pagamento && (
                                       <div className="flex items-center gap-1 mt-1">
                                         {comanda.tipo_pagamento === 'PIX' ? (
                                           <CreditCard className="h-3 w-3 text-blue-600" />
                                         ) : (
                                           <Banknote className="h-3 w-3 text-green-600" />
                                         )}
                                         <span className="text-muted-foreground text-xs">
                                           {comanda.tipo_pagamento}
                                         </span>
                                       </div>
                                     )}
                                   </div>
                                   <div className="text-left sm:text-right flex-shrink-0">
                                     <div className="font-medium">R$ {comanda.total.toFixed(2)}</div>
                                     <div className="text-xs text-muted-foreground">
                                       {comanda.data_finalizacao 
                                         ? format(comanda.data_finalizacao, "dd/MM/yy", { locale: ptBR })
                                         : format(comanda.data_criacao, "dd/MM/yy", { locale: ptBR })
                                       }
                                     </div>
                                     {comanda.data_pagamento && (
                                       <div className="text-xs text-muted-foreground">
                                         {format(comanda.data_pagamento, "HH:mm", { locale: ptBR })}
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                           
                           {/* Paginação das Comandas */}
                           {totalComandasPages > 1 && (
                             <div className="flex justify-center items-center gap-2 mt-4">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setComandasPage(prev => Math.max(prev - 1, 1))}
                                 disabled={comandasPage === 1}
                                 className="text-xs"
                               >
                                 Anterior
                               </Button>
                               <span className="text-xs text-muted-foreground px-2">
                                 {comandasPage} de {totalComandasPages}
                               </span>
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => setComandasPage(prev => Math.min(prev + 1, totalComandasPages))}
                                 disabled={comandasPage === totalComandasPages}
                                 className="text-xs"
                               >
                                 Próximo
                               </Button>
                             </div>
                           )}
                         </>
                      ) : (
                        <p className="mobile-text text-muted-foreground">Nenhuma comanda encontrada.</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            <TabsContent value="settings" className="space-y-4 sm:space-y-6">
              <Card className="barbershop-card">
                <CardHeader className="mobile-card pb-3 sm:pb-6">
                  <CardTitle className="mobile-heading">Configurações do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="mobile-card space-y-6">
                  {/* Informações Pessoais */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Informações Pessoais</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome" className="mobile-text">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input
                            id="nome"
                            value={formData.nome}
                            onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                            className="pl-8 sm:pl-10 mobile-text"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone" className="mobile-text">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input
                            id="telefone"
                            value={formData.telefone}
                            onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                            className="pl-8 sm:pl-10 mobile-text"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="email" className="mobile-text">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="pl-8 sm:pl-10 mobile-text"
                          />
                        </div>
                      </div>
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={isLoading} className="btn-hero mobile-button">
                      {isLoading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>

                  {/* Separator */}
                  <div className="border-t"></div>

                  {/* Alterar Senha */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Alterar Senha</h3>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="mobile-text">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="mobile-text"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="mobile-text">Confirmar Nova Senha</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="mobile-text"
                      />
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={isLoading} className="btn-hero mobile-button">
                      {isLoading ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modal para editar agendamento */}
      {selectedAgendamento && (
        <EditAgendamentoModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedAgendamento(null);
          }}
          agendamento={selectedAgendamento}
          onUpdate={() => {
            loadServicosPendentes();
          }}
        />
      )}

      {/* Modal para reagendar agendamento */}
      {selectedAgendamento && (
        <ReagendamentoModal
          isOpen={reagendamentoModalOpen}
          onClose={() => {
            setReagendamentoModalOpen(false);
            setSelectedAgendamento(null);
          }}
          agendamento={selectedAgendamento}
          onUpdate={() => {
            loadServicosPendentes();
          }}
        />
      )}

      {/* Modal de confirmação de reembolso */}
      <AlertDialog open={reembolsoModalOpen} onOpenChange={setReembolsoModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reembolso</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCancelado && (
                <div className="space-y-2 text-sm">
                  <p>Tem certeza que deseja processar o reembolso para:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p><strong>Serviço:</strong> {selectedCancelado.servico_nome}</p>
                    <p><strong>Cliente:</strong> {selectedCancelado.usuario_nome}</p>
                    <p><strong>Valor:</strong> R$ {selectedCancelado.preco.toFixed(2)}</p>
                    <p><strong>Data do cancelamento:</strong> {format(selectedCancelado.data_cancelamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                  <p className="text-muted-foreground">Esta ação marcará o agendamento como reembolsado e não poderá ser desfeita.</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setReembolsoModalOpen(false);
              setSelectedCancelado(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarReembolso}
              className="bg-green-600"
            >
              Confirmar Reembolso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Profile;