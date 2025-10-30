import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
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
import { User, Phone, Mail, Wallet, Award, History, Settings, Clock, CheckCircle, ShoppingCart, Calendar, AlertTriangle, X, Scissors, CreditCard, Banknote, RefreshCw, Search, Heart, Star, TrendingUp, Users, Lock, ShieldCheck, Pencil, Eye, Camera, Upload, Image as ImageIcon } from "lucide-react";
import { FavoritosChart } from "@/components/FavoritosChart";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComandas, type Comanda } from "@/hooks/useComandas";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EditAgendamentoModal } from "@/components/EditAgendamentoModal";
import { ReagendamentoModal } from "@/components/ReagendamentoModal";
import maleProfileAvatar from "@/assets/male-profile-avatar.jpg";
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  usuario_nome?: string;
  tempo_inicio?: Date;
  tempo_fim?: Date;
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
interface Funcionario {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  especialidades?: string[];
  ativo: boolean;
}
interface ServicoFavorito {
  nome: string;
  quantidade: number;
}
interface ProfissionalFavorito {
  nome: string;
  quantidade: number;
}
interface AvaliacaoHistorico {
  id: string;
  servico_nome: string;
  avaliacao: number;
  data_avaliacao: Date;
  profissional_nome?: string;
  agendamento_id: string;
}
const Profile = () => {
  const {
    currentUser,
    userData,
    updateUserData,
    loading: authLoading
  } = useAuth();
  const {
    toast
  } = useToast();
  const {
    comandasFinalizadas,
    loading: loadingComandas
  } = useComandas();

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
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [searchCliente, setSearchCliente] = useState("");
  const [selectedProfissional, setSelectedProfissional] = useState<string>("todos");
  const [servicosFavoritos, setServicosFavoritos] = useState<ServicoFavorito[]>([]);
  const [profissionaisFavoritos, setProfissionaisFavoritos] = useState<ProfissionalFavorito[]>([]);
  const [avaliacoesHistorico, setAvaliacoesHistorico] = useState<AvaliacaoHistorico[]>([]);
  const [loadingFavoritos, setLoadingFavoritos] = useState(true);
  const [loadingAvaliacoes, setLoadingAvaliacoes] = useState(true);
  const [avaliacoesPage, setAvaliacoesPage] = useState(1);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);
  const [changeAvatarModalOpen, setChangeAvatarModalOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isCapturing,
    capturedImageUrl,
    isUploading,
    isVideoLoading,
    currentCamera,
    startCapture,
    capturePhoto,
    stopCapture,
    switchCamera,
    videoRef,
    canvasRef
  } = useCameraCapture();
  const [formData, setFormData] = useState({
    nome: userData?.nome || "",
    telefone: userData?.telefone || "",
    email: userData?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    tempoAtendimento: userData?.tempo_atendimento || 40
  });

  // Formata a data para exibição
  const formatDate = (date: Date) => {
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", {
      locale: ptBR
    }) + ' UTC-3';
  };

  // Pega a URL do avatar do usuário ou usa a padrão
  const avatarUrl = userData?.avatar_url || maleProfileAvatar;

  // Função para fazer upload de arquivo para Cloudinary
  const uploadFileToCloudinary = async (file: File): Promise<string> => {
    const CLOUDINARY_CLOUD_NAME = 'dqu2uuz72';
    const CLOUDINARY_UPLOAD_PRESET = 'Barbearia Confallony';
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    
    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      
      if (!response.ok) {
        throw new Error('Erro ao fazer upload da imagem');
      }
      
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Erro durante upload para Cloudinary:', error);
      throw error;
    }
  };

  // Salva a URL da foto no Firestore
  const saveAvatarToFirestore = async (imageUrl: string) => {
    if (!currentUser?.uid) return;
    
    try {
      const userRef = doc(db, 'usuarios', currentUser.uid);
      await updateDoc(userRef, {
        avatar_url: imageUrl
      });
      
      // Atualiza o contexto local
      if (updateUserData) {
        await updateUserData({ avatar_url: imageUrl });
      }
      
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar foto no Firestore:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a foto no banco de dados.",
        variant: "destructive"
      });
    }
  };

  // Handler para capturar foto da câmera
  const handleCaptureAndSave = async () => {
    try {
      setUploadingAvatar(true);
      const imageUrl = await capturePhoto();
      
      if (imageUrl) {
        await saveAvatarToFirestore(imageUrl);
        stopCapture();
        setCameraModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao capturar e salvar foto:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a foto.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handler para upload de arquivo
  const handleFileUpload = async (file: File) => {
    try {
      setUploadingAvatar(true);
      
      // Valida o tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um arquivo de imagem válido.",
          variant: "destructive"
        });
        return;
      }
      
      // Upload para Cloudinary
      const imageUrl = await uploadFileToCloudinary(file);
      
      // Salva no Firestore
      await saveAvatarToFirestore(imageUrl);
      
      setChangeAvatarModalOpen(false);
    } catch (error) {
      console.error('Erro ao fazer upload do arquivo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer upload da imagem.",
        variant: "destructive"
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Funções de filtro
  const filterByClienteAndProfissional = (item: any) => {
    const clienteMatch = searchCliente === "" || item.usuario_nome && item.usuario_nome.toLowerCase().includes(searchCliente.toLowerCase());
    const profissionalMatch = selectedProfissional === "todos" || item.funcionario_nome === selectedProfissional || item.barbeiro === selectedProfissional;
    return clienteMatch && profissionalMatch;
  };

  // Aplicar filtros aos dados
  const servicosPendentesFiltrados = servicosPendentes.filter(filterByClienteAndProfissional);
  const atendimentosConcluidosFiltrados = atendimentosConcluidos.filter(filterByClienteAndProfissional);
  const agendamentosCanceladosFiltrados = agendamentosCancelados.filter(filterByClienteAndProfissional);

  // Paginação para atendimentos
  const itemsPerPage = 10;
  const totalAtendimentosPages = Math.ceil(atendimentosConcluidosFiltrados.length / itemsPerPage);
  const paginatedAtendimentos = atendimentosConcluidosFiltrados.slice((atendimentosPage - 1) * itemsPerPage, atendimentosPage * itemsPerPage);

  // Paginação para comandas
  const totalComandasPages = Math.ceil(comandasFinalizadas.length / itemsPerPage);
  const paginatedComandas = comandasFinalizadas.slice((comandasPage - 1) * itemsPerPage, comandasPage * itemsPerPage);

  // Carrega serviços pendentes do usuário
  const loadServicosPendentes = async () => {
    if (!userData?.email) return;
    try {
      const q = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['aguardando_confirmacao', 'confirmado']));
      const querySnapshot = await getDocs(q);
      const servicos: QueueItem[] = [];
      querySnapshot.forEach(doc => {
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
      setServicosPendentes(prev => prev.map(servico => servico.id === id ? {
        ...servico,
        presente,
        status: presente ? 'confirmado' : 'aguardando_confirmacao'
      } : servico));
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
      const servico = servicosPendentes.find(s => s.id === id);
      if (!servico) return;
      const servicoRef = doc(db, 'fila', id);
      await updateDoc(servicoRef, {
        status: 'aguardando_confirmacao',
        presente: false,
        cancelamentos: (servico.cancelamentos || 0) + 1
      });

      // Atualiza a lista local
      setServicosPendentes(prev => prev.map(s => s.id === id ? {
        ...s,
        status: 'aguardando_confirmacao',
        presente: false,
        cancelamentos: (s.cancelamentos || 0) + 1
      } : s));
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
      setAgendamentosCancelados(prev => prev.map(cancelado => cancelado.id === selectedCancelado.id ? {
        ...cancelado,
        reembolsado: true
      } : cancelado));
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
      const q = query(collection(db, 'agendamentos_finalizados'));
      const querySnapshot = await getDocs(q);
      const atendimentos: AtendimentoConcluido[] = [];
      querySnapshot.forEach(doc => {
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
          forma_pagamento_utilizada: data.forma_pagamento_utilizada || data.forma_pagamento || 'Não informado',
          usuario_nome: data.usuario_nome || 'Cliente não informado',
          tempo_inicio: data.tempo_inicio?.toDate(),
          tempo_fim: data.tempo_fim?.toDate()
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

  // Carrega funcionários
  const loadFuncionarios = async () => {
    try {
      const q = query(collection(db, 'funcionarios'), where('ativo', '==', true));
      const querySnapshot = await getDocs(q);
      const funcionariosData: Funcionario[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        funcionariosData.push({
          id: doc.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          especialidades: data.especialidades || [],
          ativo: data.ativo
        });
      });
      setFuncionarios(funcionariosData);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  // Calcula serviços favoritos (top 3)
  const calcularServicosFavoritos = () => {
    setLoadingFavoritos(true);
    try {
      const servicosCount: {
        [key: string]: number;
      } = {};
      atendimentosConcluidos.forEach(atendimento => {
        const servicoNome = atendimento.servico_nome;
        servicosCount[servicoNome] = (servicosCount[servicoNome] || 0) + 1;
      });
      const servicosFavoritosArray: ServicoFavorito[] = Object.entries(servicosCount).map(([nome, quantidade]) => ({
        nome,
        quantidade
      })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 3);
      setServicosFavoritos(servicosFavoritosArray);
    } catch (error) {
      console.error('Erro ao calcular serviços favoritos:', error);
    } finally {
      setLoadingFavoritos(false);
    }
  };

  // Calcula profissionais favoritos (top 3)
  const calcularProfissionaisFavoritos = () => {
    try {
      const profissionaisCount: {
        [key: string]: number;
      } = {};
      atendimentosConcluidos.forEach(atendimento => {
        const profissionalNome = atendimento.funcionario_nome;
        profissionaisCount[profissionalNome] = (profissionaisCount[profissionalNome] || 0) + 1;
      });
      const profissionaisFavoritosArray: ProfissionalFavorito[] = Object.entries(profissionaisCount).map(([nome, quantidade]) => ({
        nome,
        quantidade
      })).sort((a, b) => b.quantidade - a.quantidade).slice(0, 3);
      setProfissionaisFavoritos(profissionaisFavoritosArray);
    } catch (error) {
      console.error('Erro ao calcular profissionais favoritos:', error);
    }
  };

  // Carrega avaliações do usuário
  const loadAvaliacoesUsuario = async () => {
    if (!userData?.uid) return;
    setLoadingAvaliacoes(true);
    try {
      const q = query(collection(db, 'avaliacoes'), where('usuario_id', '==', userData.uid));
      const querySnapshot = await getDocs(q);
      const avaliacoes: AvaliacaoHistorico[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        avaliacoes.push({
          id: doc.id,
          servico_nome: data.servico_nome || 'Serviço não informado',
          avaliacao: data.avaliacao || 0,
          data_avaliacao: data.data_avaliacao?.toDate() || new Date(),
          profissional_nome: data.profissional_nome,
          agendamento_id: data.agendamento_id || ''
        });
      });

      // Ordena por data (mais recente primeiro)
      setAvaliacoesHistorico(avaliacoes.sort((a, b) => b.data_avaliacao.getTime() - a.data_avaliacao.getTime()));
    } catch (error) {
      console.error('Erro ao carregar avaliações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar suas avaliações.",
        variant: "destructive"
      });
    } finally {
      setLoadingAvaliacoes(false);
    }
  };

  // Carrega histórico de agendamentos cancelados
  const loadAgendamentosCancelados = async () => {
    try {
      const q = query(collection(db, 'agendamentos_cancelados'));
      const querySnapshot = await getDocs(q);
      const cancelados: AgendamentoCancelado[] = [];
      querySnapshot.forEach(doc => {
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
        await Promise.all([loadServicosPendentes(), loadAtendimentosConcluidos(), loadAgendamentosCancelados(), loadFuncionarios(), loadAvaliacoesUsuario()]);
        setLoadingServicos(false);
        // Reset pagination when data loads
        setAtendimentosPage(1);
        setComandasPage(1);
        setAvaliacoesPage(1);
      };
      loadData();
    }
  }, [userData?.email]);

  // Calcula favoritos quando atendimentos são carregados
  useEffect(() => {
    if (atendimentosConcluidos.length > 0) {
      calcularServicosFavoritos();
      calcularProfissionaisFavoritos();
    }
  }, [atendimentosConcluidos]);

  // Atualiza formData quando userData muda
  useEffect(() => {
    if (userData) {
      setFormData({
        nome: userData.nome || "",
        telefone: userData.telefone || "",
        email: userData.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        tempoAtendimento: userData.tempo_atendimento || 40
      });
    }
  }, [userData]);
  const handleUpdateProfile = async () => {
    if (!currentUser || !userData) return;

    // Validação de senha atual para segurança
    if (!formData.currentPassword) {
      toast({
        title: "Senha necessária",
        description: "Por favor, insira sua senha atual para confirmar as alterações.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      // Reautenticar usuário com senha atual
      const credential = EmailAuthProvider.credential(currentUser.email!, formData.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Se a reautenticação foi bem sucedida, atualiza os dados
      await updateUserData({
        nome: formData.nome,
        telefone: formData.telefone,
        email: formData.email,
        tempo_atendimento: formData.tempoAtendimento
      });
      if (formData.email !== userData.email) {
        await updateEmail(currentUser, formData.email);
      }

      // Limpa o campo de senha atual após sucesso
      setFormData(prev => ({
        ...prev,
        currentPassword: ""
      }));
      toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Verifica se o erro é de senha incorreta
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast({
          title: "Senha incorreta",
          description: "A senha atual está incorreta. Por favor, tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o perfil.",
          variant: "destructive"
        });
      }
    }
    setIsLoading(false);
  };
  const handleUpdatePassword = async () => {
    if (!currentUser) return;

    // Validação de senha atual para segurança
    if (!formData.currentPassword) {
      toast({
        title: "Senha atual necessária",
        description: "Por favor, insira sua senha atual para confirmar a alteração.",
        variant: "destructive"
      });
      return;
    }
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
      // Reautenticar usuário com senha atual
      const credential = EmailAuthProvider.credential(currentUser.email!, formData.currentPassword);
      await reauthenticateWithCredential(currentUser, credential);

      // Se a reautenticação foi bem sucedida, atualiza a senha
      await updatePassword(currentUser, formData.newPassword);
      setFormData(prev => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      toast({
        title: "Senha atualizada!",
        description: "Sua senha foi alterada com sucesso."
      });
    } catch (error: any) {
      console.error("Error updating password:", error);

      // Verifica se o erro é de senha incorreta
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast({
          title: "Senha incorreta",
          description: "A senha atual está incorreta. Por favor, tente novamente.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Erro",
          description: "Erro ao alterar senha. Faça login novamente e tente.",
          variant: "destructive"
        });
      }
    }
    setIsLoading(false);
  };
  if (authLoading || !userData) {
    return <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Carregando perfil...</h2>
          </div>
        </div>
      </Layout>;
  }
  return <Layout>
      <div className="min-h-screen bg-muted/30 mobile-padding py-4 sm:py-8 lg:py-12">
        <div className="max-w-7xl mx-auto space-y-3 sm:space-y-6 px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <Card className="barbershop-card mobile-card overflow-hidden">
            <CardContent className="mobile-card pt-6 sm:pt-8 pb-6 sm:pb-8">
              <div className="flex flex-col sm:flex-row items-center space-y-6 sm:space-y-0 sm:space-x-8">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                    <img src={avatarUrl} alt="Profile Avatar" className="w-full h-full rounded-full object-cover border-4 border-primary/20 shadow-lg" />
                    <button 
                      onClick={() => setAvatarMenuOpen(true)}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary hover:bg-primary/90 rounded-full border-4 border-background flex items-center justify-center transition-all hover:scale-110 cursor-pointer"
                      aria-label="Editar foto de perfil"
                    >
                      <Pencil className="h-4 w-4 text-primary-foreground" />
                    </button>
                  </div>
                </div>

                {/* User Info Section */}
                <div className="flex-1 text-center sm:text-left space-y-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">{userData.nome}</h1>
                    <p className="text-sm sm:text-base text-muted-foreground break-all sm:break-normal mb-1">{userData.email}</p>
                    {userData.telefone && <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                        <Phone className="h-4 w-4" />
                        {userData.telefone}
                      </p>}
                  </div>

                  {/* Badges Section */}
                  <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center sm:justify-start gap-3">
                    <Badge variant="secondary" className="flex items-center gap-2 text-sm px-4 py-2 bg-primary/10 text-primary border-primary/20">
                      <Award className="h-4 w-4" />
                      <span className="font-semibold">{userData.pontos_fidelidade || 0}</span>
                      <span className="hidden xs:inline">pontos de fidelidade</span>
                      <span className="xs:hidden">pts</span>
                    </Badge>
                    
                    {userData?.isAdmin && <Badge variant="outline" className="flex items-center gap-2 text-sm px-4 py-2">
                        <User className="h-4 w-4" />
                        ADMINISTRADOR
                      </Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configurações do Usuário */}
          <div className="space-y-3 sm:space-y-6">
              <Card className="barbershop-card">
                <CardHeader className="mobile-card pb-3 sm:pb-6">
                  <CardTitle className="mobile-heading">Configurações do Usuário</CardTitle>
                </CardHeader>
                <CardContent className="mobile-card space-y-6">
                  {/* Informações Pessoais */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Informações Pessoais</h3>
                    
                    {/* Alerta de Segurança */}
                    

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nome" className="mobile-text">Nome Completo</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input id="nome" value={formData.nome} onChange={e => setFormData(prev => ({
                          ...prev,
                          nome: e.target.value
                        }))} className="pl-8 sm:pl-10 mobile-text" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefone" className="mobile-text">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input id="telefone" value={formData.telefone} onChange={e => setFormData(prev => ({
                          ...prev,
                          telefone: e.target.value
                        }))} className="pl-8 sm:pl-10 mobile-text" />
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="email" className="mobile-text">E-mail</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                          <Input id="email" type="email" value={formData.email} onChange={e => setFormData(prev => ({
                          ...prev,
                          email: e.target.value
                        }))} className="pl-8 sm:pl-10 mobile-text bg-muted cursor-not-allowed" readOnly />
                        </div>
                      </div>
                      <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="currentPasswordProfile" className="mobile-text flex items-center gap-2">
                          <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          Senha Atual (obrigatório)
                        </Label>
                        <Input id="currentPasswordProfile" type="password" value={formData.currentPassword} onChange={e => setFormData(prev => ({
                        ...prev,
                        currentPassword: e.target.value
                      }))} placeholder="Digite sua senha atual para confirmar" className="mobile-text" />
                      </div>
                    </div>
                    <Button onClick={handleUpdateProfile} disabled={isLoading || !formData.currentPassword} className="btn-hero mobile-button">
                      {isLoading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>

                  {/* Separator */}
                  <div className="border-t"></div>

                  {/* Alterar Senha */}
                  <div className="space-y-4">
                    <h3 className="text-base sm:text-lg font-semibold">Alterar Senha</h3>
                    
                    {/* Alerta de Segurança */}
                    

                    <div className="space-y-2">
                      <Label htmlFor="currentPasswordChange" className="mobile-text flex items-center gap-2">
                        <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                        Senha Atual (obrigatório)
                      </Label>
                      <Input id="currentPasswordChange" type="password" value={formData.currentPassword} onChange={e => setFormData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))} placeholder="Digite sua senha atual" className="mobile-text" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="mobile-text">Nova Senha</Label>
                      <Input id="newPassword" type="password" value={formData.newPassword} onChange={e => setFormData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))} placeholder="Mínimo 6 caracteres" className="mobile-text" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="mobile-text">Confirmar Nova Senha</Label>
                      <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={e => setFormData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))} placeholder="Digite a nova senha novamente" className="mobile-text" />
                    </div>
                    <Button onClick={handleUpdatePassword} disabled={isLoading || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword} className="btn-hero mobile-button">
                      {isLoading ? "Alterando..." : "Alterar Senha"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>
      </div>

      {/* Modal de menu do avatar */}
      <AlertDialog open={avatarMenuOpen} onOpenChange={setAvatarMenuOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Foto de Perfil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Escolha uma opção para sua foto de perfil
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => {
                setAvatarMenuOpen(false);
                setViewImageModalOpen(true);
              }}
            >
              <Eye className="h-5 w-5" />
              Visualizar Foto
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => {
                setAvatarMenuOpen(false);
                setChangeAvatarModalOpen(true);
              }}
            >
              <Pencil className="h-5 w-5" />
              Alterar Foto
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para visualizar imagem */}
      <AlertDialog open={viewImageModalOpen} onOpenChange={setViewImageModalOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Foto de Perfil</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex items-center justify-center p-4">
            <img 
              src={avatarUrl} 
              alt="Profile Avatar Large" 
              className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-xl"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Fechar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal para alterar foto */}
      <AlertDialog open={changeAvatarModalOpen} onOpenChange={setChangeAvatarModalOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Alterar Foto de Perfil
            </AlertDialogTitle>
            <AlertDialogDescription>
              Escolha como deseja adicionar sua nova foto
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 py-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => {
                setChangeAvatarModalOpen(false);
                setCameraModalOpen(true);
                setTimeout(() => startCapture(), 300);
              }}
              disabled={uploadingAvatar}
            >
              <Camera className="h-5 w-5" />
              Tirar Foto
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 h-12"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
            >
              <Upload className="h-5 w-5" />
              Escolher dos Arquivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleFileUpload(file);
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploadingAvatar}>
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal da câmera */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => {
        setCameraModalOpen(open);
        if (!open) {
          stopCapture();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Capturar Foto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview da câmera */}
            <div className="relative bg-black rounded-lg overflow-hidden aspect-[9/16] max-h-[60vh] mx-auto">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
                    <p>Carregando câmera...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controles */}
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={switchCamera}
                disabled={!isCapturing || isVideoLoading || uploadingAvatar}
              >
                <RefreshCw className="h-5 w-5" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                stopCapture();
                setCameraModalOpen(false);
              }}
              disabled={uploadingAvatar}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCaptureAndSave}
              disabled={!isCapturing || isVideoLoading || uploadingAvatar}
            >
              {uploadingAvatar ? "Salvando..." : "Capturar e Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para editar agendamento */}
      {selectedAgendamento && <EditAgendamentoModal isOpen={editModalOpen} onClose={() => {
      setEditModalOpen(false);
      setSelectedAgendamento(null);
    }} agendamento={selectedAgendamento} onUpdate={() => {
      loadServicosPendentes();
      setSelectedAgendamento(null);
    }} />}

      {/* Modal para reagendar agendamento */}
      {selectedAgendamento && <ReagendamentoModal isOpen={reagendamentoModalOpen} onClose={() => {
      setReagendamentoModalOpen(false);
      setSelectedAgendamento(null);
    }} agendamento={selectedAgendamento} onUpdate={() => {
      loadServicosPendentes();
    }} />}

      {/* Modal de confirmação de reembolso */}
      <AlertDialog open={reembolsoModalOpen} onOpenChange={setReembolsoModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Reembolso</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedCancelado && <div className="space-y-2 text-sm">
                  <p>Tem certeza que deseja processar o reembolso para:</p>
                  <div className="bg-muted p-3 rounded-lg space-y-1">
                    <p><strong>Serviço:</strong> {selectedCancelado.servico_nome}</p>
                    <p><strong>Cliente:</strong> {selectedCancelado.usuario_nome}</p>
                    <p><strong>Valor:</strong> R$ {selectedCancelado.preco.toFixed(2)}</p>
                    <p><strong>Data do cancelamento:</strong> {format(selectedCancelado.data_cancelamento, "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR
                  })}</p>
                  </div>
                  <p className="text-muted-foreground">Esta ação marcará o agendamento como reembolsado e não poderá ser desfeita.</p>
                </div>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
            setReembolsoModalOpen(false);
            setSelectedCancelado(null);
          }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarReembolso} className="bg-green-600">
              Confirmar Reembolso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>;
};
export default Profile;