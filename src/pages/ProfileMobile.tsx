import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQueueAutomation } from "@/contexts/QueueAutomationContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Calendar, History, Settings, Award, Wallet, Phone, Mail, LogOut, CheckCircle, ShoppingCart, Palette, CreditCard, Banknote, Clock, Plus, MapPin, Timer, Check, AlertTriangle, X, QrCode, Download, TrendingUp, Filter, DollarSign, BarChart3, Star, Crown, Zap, Bell, Receipt, Camera, Upload, Eye, Image as ImageIcon, Pencil, Gift, Percent, RefreshCw, XCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EditAgendamentoModal } from "@/components/EditAgendamentoModal";
import { ReagendamentoModal } from "@/components/ReagendamentoModal";
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit, onSnapshot, updateDoc, doc, addDoc, deleteDoc, getDoc } from "firebase/firestore";
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
import { useCameraCapture } from "@/hooks/useCameraCapture";
import { useAppointmentReminders } from "@/hooks/useAppointmentReminders";
import { useNotifications } from "@/hooks/useNotifications";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useConfigMobile } from "@/hooks/useConfigMobile";
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
  cancelado?: boolean;
  pagamento_parcial?: boolean;
  valor_restante?: number;
  valor_total?: number;
  valor_pago?: number;
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
  forma_pagamento?: string;
  sala_atendimento?: string;
  avaliado?: boolean;
  avaliacao?: number;
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

// Componente separado para item de avaliação
const AvaliacaoItem = ({
  agendamento,
  onRemove
}: {
  agendamento: AtendimentoConcluido;
  onRemove: (id: string) => void;
}) => {
  const [hoveredRating, setHoveredRating] = React.useState(0);
  const {
    toast
  } = useToast();
  const handleRating = async (star: number) => {
    try {
      await updateDoc(doc(db, "agendamentos_finalizados", agendamento.id), {
        avaliado: true,
        avaliacao: star
      });
      onRemove(agendamento.id);
      toast({
        title: "Avaliação enviada!",
        description: `Obrigado por avaliar com ${star} estrela${star > 1 ? 's' : ''}!`
      });
    } catch (error) {
      console.error("Erro ao salvar avaliação:", error);
      toast({
        title: "Erro ao salvar avaliação",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };
  const handleSkip = async () => {
    try {
      await updateDoc(doc(db, "agendamentos_finalizados", agendamento.id), {
        avaliado: true
      });
      onRemove(agendamento.id);
      toast({
        title: "Agendamento marcado como avaliado",
        description: "Você pode avaliar depois se quiser"
      });
    } catch (error) {
      console.error("Erro ao marcar como avaliado:", error);
      toast({
        title: "Erro",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };
  const handleSaveReceipt = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const bgColor = '#000000';
      const textColor = '#ffffff';
      const overlayLight = 'rgba(255, 255, 255, 0.1)';
      const overlayMedium = 'rgba(255, 255, 255, 0.15)';
      const borderColor = 'rgba(255, 255, 255, 0.2)';
      const comprovanteDiv = document.createElement('div');
      comprovanteDiv.style.position = 'absolute';
      comprovanteDiv.style.left = '-9999px';
      comprovanteDiv.style.width = '600px';
      comprovanteDiv.innerHTML = `
        <div style="background: ${bgColor}; padding: 40px; font-family: Arial, sans-serif; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
          <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid ${borderColor};">
            <h1 style="font-size: 28px; font-weight: bold; margin: 0 0 8px 0; color: ${textColor};">Comprovante de Atendimento</h1>
            <p style="font-size: 14px; opacity: 0.8; margin: 0; color: ${textColor};">Confallony Barbearia</p>
          </div>
          <div style="background: ${overlayLight}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid ${borderColor};">
            <div style="margin-bottom: 12px;">
              <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0; color: ${textColor};">Serviço</p>
              <p style="font-size: 18px; font-weight: 600; margin: 0; color: ${textColor};">${agendamento.servico_nome}</p>
            </div>
            <div style="margin-bottom: 12px;">
              <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0; color: ${textColor};">Data e Hora</p>
              <p style="font-size: 16px; margin: 0; color: ${textColor};">${format(agendamento.data_atendimento, "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      })}</p>
            </div>
            ${agendamento.funcionario_nome ? `
              <div style="margin-bottom: 12px;">
                <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0; color: ${textColor};">Profissional</p>
                <p style="font-size: 16px; margin: 0; color: ${textColor};">${agendamento.funcionario_nome}</p>
              </div>
            ` : ''}
            ${agendamento.sala_atendimento ? `
              <div style="margin-bottom: 12px;">
                <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0; color: ${textColor};">Sala</p>
                <p style="font-size: 16px; margin: 0; color: ${textColor};">${agendamento.sala_atendimento}</p>
              </div>
            ` : ''}
            ${agendamento.forma_pagamento ? `
              <div style="margin-bottom: 12px;">
                <p style="font-size: 12px; opacity: 0.7; margin: 0 0 4px 0; color: ${textColor};">Forma de Pagamento</p>
                <p style="font-size: 16px; margin: 0; color: ${textColor};">${agendamento.forma_pagamento}</p>
              </div>
            ` : ''}
          </div>
          <div style="background: ${overlayMedium}; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid ${borderColor};">
            <p style="font-size: 12px; opacity: 0.7; margin: 0 0 8px 0; color: ${textColor};">Valor Total</p>
            <p style="font-size: 32px; font-weight: bold; margin: 0; color: ${textColor};">R$ ${agendamento.preco.toFixed(2)}</p>
          </div>
          <div style="text-align: center; padding-top: 20px; border-top: 2px solid ${borderColor};">
            <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: ${textColor};">Obrigado pela preferência!</p>
            <p style="font-size: 11px; opacity: 0.7; margin: 0; color: ${textColor};">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
        locale: ptBR
      })}</p>
          </div>
        </div>
      `;
      document.body.appendChild(comprovanteDiv);
      const canvas = await html2canvas(comprovanteDiv, {
        backgroundColor: null,
        scale: 2
      });
      document.body.removeChild(comprovanteDiv);
      canvas.toBlob(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `comprovante-${agendamento.servico_nome}-${format(agendamento.data_atendimento, "dd-MM-yyyy")}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          toast({
            title: "Comprovante salvo!",
            description: "O comprovante foi baixado com sucesso"
          });
        }
      });
    } catch (error) {
      console.error("Erro ao salvar comprovante:", error);
      toast({
        title: "Erro ao salvar comprovante",
        description: "Tente novamente mais tarde",
        variant: "destructive"
      });
    }
  };
  return <Card className="bg-card/50 backdrop-blur border-primary/20 overflow-hidden">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{agendamento.servico_nome}</p>
            <p className="text-xs text-muted-foreground">
              {format(agendamento.data_atendimento, "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR
            })}
            </p>
            
            {/* Informações do Profissional e Sala */}
            <div className="mt-2 space-y-1">
              {agendamento.funcionario_nome && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Profissional: {agendamento.funcionario_nome}</span>
                </div>}
              {agendamento.sala_atendimento && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">Sala: {agendamento.sala_atendimento}</span>
                </div>}
              {agendamento.forma_pagamento && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {agendamento.forma_pagamento.toLowerCase().includes('pix') ? <QrCode className="h-3 w-3 flex-shrink-0 text-primary" /> : <Wallet className="h-3 w-3 flex-shrink-0 text-green-600" />}
                  <span className="truncate">Pagamento: {agendamento.forma_pagamento}</span>
                </div>}
            </div>
          </div>
          <Badge variant='default' className="flex-shrink-0 text-[10px] px-2 py-1">
            <CheckCircle className="h-2.5 w-2.5 mr-1" />Finalizado
          </Badge>
        </div>
        
        <div className="flex flex-col gap-3 pt-3 border-t border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-bold text-primary">
              R$ {agendamento.preco.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="text-[10px] h-8 border-primary/30 hover:bg-primary/10" onClick={handleSaveReceipt}>
              <Download className="h-3 w-3 mr-1" />
              <span className="truncate">Comprovante</span>
            </Button>

            <AddToCalendarButton agendamento={{
            id: agendamento.id,
            servico_nome: agendamento.servico_nome,
            data: agendamento.data_atendimento,
            duracao: 30,
            funcionario_nome: agendamento.funcionario_nome,
            sala_atendimento: agendamento.sala_atendimento
          }} variant="outline" size="sm" className="text-[10px] h-8 border-primary/30 hover:bg-primary/10" />
          </div>

          {/* Seção de Avaliação */}
          <div className="pt-3 border-t border-primary/20 space-y-2">
            <div className="flex items-center gap-2 justify-center">
              <Star className="h-4 w-4 text-yellow-500" />
              <p className="text-xs font-medium text-foreground">Avalie seu atendimento</p>
            </div>
            
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" onMouseEnter={() => setHoveredRating(star)} onMouseLeave={() => setHoveredRating(0)} onClick={() => handleRating(star)} className="transition-transform hover:scale-110">
                  <Star className={`h-7 w-7 ${star <= hoveredRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                </button>)}
            </div>

            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={handleSkip}>
              Não avaliar agora
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>;
};
const CountdownTimer = ({
  targetDate,
  isInService = false,
  endTime,
  pagamentoParcial = false
}: {
  targetDate: Date;
  isInService?: boolean;
  endTime?: Date;
  pagamentoParcial?: boolean;
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
      const timeToUse = isInService && endTime ? endTime : targetDate;
      const difference = timeToUse.getTime() - now.getTime();
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
  }, [targetDate, isInService, endTime]);
  const isPast = new Date() > targetDate;

  // Se está em atendimento, mostra o countdown até o fim
  if (isInService && endTime) {
    const now = new Date();
    const difference = endTime.getTime() - now.getTime();
    if (difference > 0) {
      return <div className="mt-2 space-y-2">
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <Timer className="h-3 w-3" />
            Atendimento em andamento - Faltam {String(timeLeft.hours).padStart(2, '0')}:
            {String(timeLeft.minutes).padStart(2, '0')}:
            {String(timeLeft.seconds).padStart(2, '0')} para finalizar
          </p>
        </div>;
    } else {
      return <p className="text-xs text-green-600 font-medium mt-1">
          Atendimento em andamento
        </p>;
    }
  }

  // Se não está em atendimento e o horário passou, não mostra "Horário já passou"
  // pois isso será tratado pelo status do agendamento
  if (isPast && !isInService) {
    return null;
  }
  return <div className="mt-2 space-y-2">
      <p className="text-xs text-primary font-medium flex items-center gap-1">
        <Timer className="h-3 w-3" />
        Faltam {timeLeft.days > 0 && `${timeLeft.days}d `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')} para o início do atendimento.
      </p>
      {pagamentoParcial && (
        <p className="text-xs text-amber-600 font-medium mt-2 flex items-center gap-1">
          <Wallet className="h-3 w-3" />
          Pague o restante após a conclusão do serviço na barbearia.
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-3">Obrigado pela preferência, estamos te aguardando!</p>
    </div>;
};
const ProfileMobile = () => {
  const {
    currentUser,
    userData,
    logout
  } = useAuth();
  const {
    queueData,
    currentlyServing,
    currentServiceCountdown
  } = useQueueAutomation();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("perfil");
  const [historicoSubTab, setHistoricoSubTab] = useState<"agendamentos_pendentes" | "agendamentos_finalizados" | "agendamentos_cancelados" | "comandas_abertas" | "comandas_finalizadas">("agendamentos_pendentes");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [filtroPeriodo, setFiltroPeriodo] = useState<"mensal" | "anual">("mensal");
  const [filtroDataInicio, setFiltroDataInicio] = useState<Date | null>(null);
  const [filtroDataFim, setFiltroDataFim] = useState<Date | null>(null);
  const [agendamentos, setAgendamentos] = useState<QueueItem[]>([]);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState<QueueItem[]>([]);
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
  const [agendamentosNaoAvaliados, setAgendamentosNaoAvaliados] = useState<AtendimentoConcluido[]>([]);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [changeAvatarModalOpen, setChangeAvatarModalOpen] = useState(false);
  const [viewImageModalOpen, setViewImageModalOpen] = useState(false);

  // Hook de configuração mobile
  const {
    config,
    loading: loadingConfig
  } = useConfigMobile();

  // Hook de captura de câmera
  const {
    isCapturing,
    capturedImageUrl,
    isUploading,
    isVideoLoading,
    currentCamera,
    videoRef,
    canvasRef,
    startCapture,
    stopCapture,
    capturePhoto,
    switchCamera
  } = useCameraCapture();

  // Agendar lembretes de agendamento (2h, 1h, 30min, 15min antes)
  useAppointmentReminders(agendamentos);

  // Hook de notificações com registro automático de token FCM
  const {
    fcmToken,
    permission: notificationPermission
  } = useNotifications(currentUser?.uid);

  // URL do avatar do usuário ou padrão
  const avatarUrl = userData?.avatar_url || maleProfileAvatar;

  // Função para fazer upload de arquivo para Cloudinary
  const uploadFileToCloudinary = async (file: File): Promise<string> => {
    const CLOUDINARY_CLOUD_NAME = 'dqu2uuz72';
    const CLOUDINARY_UPLOAD_PRESET = 'Barbearia Confallony';
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        throw new Error(`Erro no upload: ${response.status}`);
      }
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Erro durante upload:', error);
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
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi atualizada com sucesso."
      });
    } catch (error) {
      console.error('Erro ao salvar foto no Firestore:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar sua foto de perfil.",
        variant: "destructive"
      });
    }
  };

  // Captura foto e salva
  const handleTakePhoto = async () => {
    try {
      const imageUrl = await capturePhoto();
      if (imageUrl) {
        await saveAvatarToFirestore(imageUrl);
        stopCapture();
        setCameraModalOpen(false);
      }
    } catch (error) {
      console.error('Erro ao processar foto:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a foto.",
        variant: "destructive"
      });
    }
  };

  // Upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imageUrl = await uploadFileToCloudinary(file);

      // Salva no Firestore
      await saveAvatarToFirestore(imageUrl);
      setChangeAvatarModalOpen(false);
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast({
        title: "Erro",
        description: "Erro ao fazer upload da imagem.",
        variant: "destructive"
      });
    }
  };

  // Redireciona admin para /profile
  if (userData?.isAdmin) {
    return <Navigate to="/profile" replace />;
  }
  useEffect(() => {
    const loadData = async () => {
      if (!userData?.email) return;
      try {
        // Carrega agendamentos pendentes e em atendimento (apenas aguardando_confirmacao para Pendentes)
        const qAgendamentos = query(collection(db, 'fila'), where('usuario_email', '==', userData.email), where('status', 'in', ['aguardando_confirmacao', 'confirmado', 'em_atendimento']));
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
            forma_pagamento: data.forma_pagamento || '',
            tempo_inicio: data.tempo_inicio?.toDate(),
            tempo_fim: data.tempo_fim?.toDate(),
            duracao: data.duracao || data.tempo_estimado || 30,
            cancelamentos: data.cancelamentos || 0,
            barbeiro: data.barbeiro,
            reagendado: data.reagendado || false,
            editado: data.editado || false,
            cancelado: data.cancelado || false,
            tempo_estimado: data.tempo_estimado || 30,
            pagamento_parcial: data.pagamento_parcial || false,
            valor_restante: (data.valor_parcial_restante ?? data.valor_restante ?? 0),
            valor_total: data.valor_total || 0,
            valor_pago: data.valor_pago || 0
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
        const naoAvaliados: AtendimentoConcluido[] = [];
        const idsProcessados = new Set<string>(); // Controle de duplicação por ID
        const idsNaoAvaliados = new Set<string>(); // Controle adicional para não avaliados

        agendamentosFinalizadosSnapshot.forEach(doc => {
          // Evitar duplicação por ID
          if (idsProcessados.has(doc.id)) {
            console.warn('Documento duplicado detectado:', doc.id);
            return;
          }
          idsProcessados.add(doc.id);
          const data = doc.data();
          const item: AtendimentoConcluido = {
            id: doc.id,
            servico: data.servico || data.servico_nome || 'Serviço não informado',
            servico_nome: data.servico_nome || data.servico || 'Serviço não informado',
            data_atendimento: data.data_atendimento?.toDate() || data.data_conclusao?.toDate() || new Date(),
            data_conclusao: data.data_conclusao?.toDate() || data.data_atendimento?.toDate() || new Date(),
            barbeiro: data.barbeiro || data.funcionario_nome || 'Funcionário não informado',
            funcionario_nome: data.funcionario_nome || data.barbeiro || 'Funcionário não informado',
            preco: data.preco || 0,
            forma_pagamento_utilizada: data.forma_pagamento_utilizada || data.forma_pagamento || 'Não informado',
            forma_pagamento: data.forma_pagamento || data.forma_pagamento_utilizada,
            sala_atendimento: data.sala_atendimento,
            avaliado: data.avaliado || false,
            avaliacao: data.avaliacao
          };
          agendamentosFinalizadosItems.push(item);
          
          // Adicionar aos não avaliados apenas se não estiver avaliado E não for duplicado
          if (!item.avaliado && !idsNaoAvaliados.has(item.id)) {
            idsNaoAvaliados.add(item.id);
            naoAvaliados.push(item);
          }
        });
        setAgendamentosFinalizados(agendamentosFinalizadosItems.sort((a, b) => b.data_atendimento.getTime() - a.data_atendimento.getTime()));
        setAgendamentosNaoAvaliados(naoAvaliados.sort((a, b) => b.data_atendimento.getTime() - a.data_atendimento.getTime()));

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

        // Carrega agendamentos cancelados
        const qAgendamentosCancelados = query(collection(db, 'agendamentos_cancelados'), where('usuario_email', '==', userData.email));
        const agendamentosCanceladosSnapshot = await getDocs(qAgendamentosCancelados);
        const agendamentosCanceladosItems: QueueItem[] = [];
        agendamentosCanceladosSnapshot.forEach(doc => {
          const data = doc.data();
          agendamentosCanceladosItems.push({
            id: doc.id,
            servico_nome: data.servico_nome,
            preco: data.preco || 0,
            status: 'cancelado',
            data: data.data?.toDate() || new Date(),
            presente: data.presente || false,
            funcionario_nome: data.funcionario_nome || '',
            sala_atendimento: data.sala_atendimento || '',
            forma_pagamento: data.forma_pagamento || '',
            tempo_inicio: data.tempo_inicio?.toDate(),
            tempo_fim: data.tempo_fim?.toDate(),
            duracao: data.duracao || data.tempo_estimado || 30,
            cancelamentos: data.cancelamentos || 0,
            barbeiro: data.barbeiro,
            reagendado: data.reagendado || false,
            editado: data.editado || false,
            cancelado: true,
            tempo_estimado: data.tempo_estimado || 30
          });
        });
        setAgendamentosCancelados(agendamentosCanceladosItems.sort((a, b) => b.data.getTime() - a.data.getTime()));
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

  // Cancela agendamento movendo para coleção de cancelados
  const handleCancelarAgendamento = async (id: string) => {
    try {
      console.log('🚫 Iniciando cancelamento do agendamento:', id);
      
      const agendamento = agendamentos.find(a => a.id === id);
      if (!agendamento) {
        console.log('❌ Agendamento não encontrado na lista local');
        return;
      }

      // Buscar dados completos do agendamento
      const agendamentoRef = doc(db, 'fila', id);
      console.log('📄 Buscando documento na fila...');
      const agendamentoSnap = await getDoc(agendamentoRef);

      if (!agendamentoSnap.exists()) {
        console.log('❌ Documento não existe na fila');
        throw new Error('Agendamento não encontrado na fila');
      }

      const agendamentoData = agendamentoSnap.data();
      console.log('✅ Dados do agendamento recuperados:', agendamentoData);

      // Preparar dados para a coleção de cancelados
      const canceledAppointment = {
        ...agendamentoData,
        cancelado_em: new Date(),
        cancelado_por: userData?.email || '',
        cancelamentos: (agendamentoData.cancelamentos || 0) + 1,
        motivo_cancelamento: 'Cancelado pelo cliente'
      };

      // Salvar na coleção de agendamentos cancelados
      console.log('💾 Salvando na coleção agendamentos_cancelados...');
      const docRef = await addDoc(collection(db, 'agendamentos_cancelados'), canceledAppointment);
      console.log('✅ Salvo com sucesso, ID:', docRef.id);

      // Remover da fila
      console.log('🗑️ Removendo da fila...');
      await deleteDoc(agendamentoRef);
      console.log('✅ Removido da fila com sucesso!');

      // Atualizar lista local removendo o agendamento
      setAgendamentos(prev => prev.filter(a => a.id !== id));

      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi removido da fila e movido para cancelados.",
        variant: "destructive"
      });
    } catch (error) {
      console.error('❌ ERRO ao cancelar agendamento:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível cancelar o agendamento.",
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
          duracao: data.duracao || data.tempo_estimado || 30,
          funcionario_nome: data.funcionario_nome,
          sala_atendimento: data.sala_atendimento,
          forma_pagamento: data.forma_pagamento,
          pagamento_parcial: data.pagamento_parcial || false,
          valor_restante: (data.valor_parcial_restante ?? data.valor_restante ?? 0),
          valor_total: data.valor_total || 0,
          valor_pago: data.valor_pago || 0,
          editado: data.editado || false,
          cancelado: data.cancelado || false
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
        // Cálculos de estatísticas com useMemo para evitar re-renderizações
        const currentDate = new Date();
        const mesAtualInicio = startOfMonth(currentDate);
        const mesAtualFim = endOfMonth(currentDate);
        const servicosMesAtual = agendamentosFinalizados.filter(a => isWithinInterval(a.data_atendimento, {
          start: mesAtualInicio,
          end: mesAtualFim
        })).length;

        // Total gasto REAL - Soma de agendamentos e comandas finalizadas
        const totalGastoAgendamentos = agendamentosFinalizados.reduce((acc, a) => acc + (a.preco || 0), 0);
        const totalGastoComandas = comandasFinalizadas.reduce((acc, c) => acc + (c.total || 0), 0);
        const totalGastoGeral = totalGastoAgendamentos + totalGastoComandas;

        // Total gasto do mês atual (agendamentos + comandas)
        const totalGastoAgendamentosMesAtual = agendamentosFinalizados.filter(a => isWithinInterval(a.data_atendimento, {
          start: mesAtualInicio,
          end: mesAtualFim
        })).reduce((acc, a) => acc + (a.preco || 0), 0);
        const totalGastoComandasMesAtual = comandasFinalizadas.filter(c => {
          const dataComanda = c.data_finalizacao || c.data_criacao;
          return isWithinInterval(dataComanda, {
            start: mesAtualInicio,
            end: mesAtualFim
          });
        }).reduce((acc, c) => acc + (c.total || 0), 0);
        const totalGastoMesAtual = totalGastoAgendamentosMesAtual + totalGastoComandasMesAtual;

        // Dados do gráfico de frequência (últimos 6 meses)
        const sixMonthsAgo = subMonths(currentDate, 5);
        const monthsInterval = eachMonthOfInterval({
          start: sixMonthsAgo,
          end: currentDate
        });
        const frequenciaData = monthsInterval.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const count = agendamentosFinalizados.filter(a => isWithinInterval(a.data_atendimento, {
            start: monthStart,
            end: monthEnd
          })).length;
          return {
            mes: format(month, 'MMM', {
              locale: ptBR
            }),
            visitas: count
          };
        });

        // Calcular máximo de visitas para o eixo Y
        const maxVisitas = Math.max(...frequenciaData.map(d => d.visitas), 5);

        // Sistema de níveis/tiers - Pontos REAIS do Firestore com configuração dinâmica
        const pontosTotal = userData?.pontos_fidelidade || 0;
        const niveis = [{
          nome: 'Bronze',
          minPontos: 0,
          maxPontos: config.pontos_bronze_prata - 1,
          cor: 'text-amber-700',
          bgCor: 'bg-amber-100/20',
          icon: Star
        }, {
          nome: 'Prata',
          minPontos: config.pontos_bronze_prata,
          maxPontos: config.pontos_prata_ouro - 1,
          cor: 'text-gray-400',
          bgCor: 'bg-gray-100/20',
          icon: Award
        }, {
          nome: 'Ouro',
          minPontos: config.pontos_prata_ouro,
          maxPontos: config.pontos_ouro_premium - 1,
          cor: 'text-yellow-500',
          bgCor: 'bg-yellow-100/20',
          icon: Crown
        }, {
          nome: 'Cliente Premium',
          minPontos: config.pontos_ouro_premium,
          maxPontos: Infinity,
          cor: 'text-purple-500',
          bgCor: 'bg-purple-100/20',
          icon: Zap
        }];
        const nivelAtual = niveis.find(n => pontosTotal >= n.minPontos && pontosTotal <= n.maxPontos) || niveis[0];
        const proximoNivel = niveis.find(n => n.minPontos > pontosTotal);
        const progressoNivel = proximoNivel ? (pontosTotal - nivelAtual.minPontos) / (proximoNivel.minPontos - nivelAtual.minPontos) * 100 : 100;

        // Obter mensagem e benefícios do nível atual
        const getMensagemNivel = () => {
          if (nivelAtual.nome === 'Bronze') return config.mensagem_bronze;
          if (nivelAtual.nome === 'Prata') return config.mensagem_prata;
          if (nivelAtual.nome === 'Ouro') return config.mensagem_ouro;
          if (nivelAtual.nome === 'Cliente Premium') return config.mensagem_premium;
          return '';
        };
        const getDescontoNivel = () => {
          if (nivelAtual.nome === 'Bronze') return config.desconto_bronze;
          if (nivelAtual.nome === 'Prata') return config.desconto_prata;
          if (nivelAtual.nome === 'Ouro') return config.desconto_ouro;
          if (nivelAtual.nome === 'Cliente Premium') return config.desconto_premium;
          return 0;
        };
        const getBonusAniversario = () => {
          if (nivelAtual.nome === 'Bronze') return config.bonus_aniversario_bronze;
          if (nivelAtual.nome === 'Prata') return config.bonus_aniversario_prata;
          if (nivelAtual.nome === 'Ouro') return config.bonus_aniversario_ouro;
          if (nivelAtual.nome === 'Cliente Premium') return config.bonus_aniversario_premium;
          return 0;
        };
        return <div className="space-y-4 p-4">
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-primary/20">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>{userData?.nome?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <button onClick={() => setAvatarMenuOpen(true)} className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary hover:bg-primary/90 rounded-full border-4 border-background flex items-center justify-center transition-all hover:scale-110 cursor-pointer" aria-label="Editar foto de perfil">
                  <Pencil className="h-4 w-4 text-primary-foreground" />
                </button>
              </div>
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

                {proximoNivel && <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso para {proximoNivel.nome}</span>
                      <span>{Math.round(progressoNivel)}%</span>
                    </div>
                    <div className="w-full bg-muted/30 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{
                    width: `${progressoNivel}%`
                  }} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Faltam {proximoNivel.minPontos - pontosTotal} pontos
                    </p>
                  </div>}

                {/* Mensagem do Nível */}
                {getMensagemNivel() && <div className="mt-3 pt-3 border-t border-primary/20">
                    <p className="text-xs text-muted-foreground italic">
                      {getMensagemNivel()}
                    </p>
                  </div>}

                {/* Benefícios do Nível */}
                <div className="mt-3 pt-3 border-t border-primary/20 space-y-2">
                  <p className="text-xs font-semibold text-foreground">Seus Benefícios:</p>
                  <div className="space-y-1">
                    {getDescontoNivel() > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Percent className="h-3 w-3 text-green-600" />
                        <span>{getDescontoNivel()}% de desconto em serviços</span>
                      </div>}
                    {getBonusAniversario() > 0 && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Gift className="h-3 w-3 text-purple-600" />
                        <span>{getBonusAniversario()} pontos bônus no aniversário</span>
                      </div>}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Zap className="h-3 w-3 text-yellow-600" />
                      <span>{config.pontos_por_real} ponto(s) por R$ 1,00 gasto</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Boas-vindas ao Programa (apenas se tiver poucos pontos) */}
            {pontosTotal < config.pontos_bronze_prata / 2 && config.mensagem_boas_vindas && <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Gift className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-1">
                        Programa de Fidelidade
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config.mensagem_boas_vindas}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>}


            {/* Cards de Estatísticas */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
                <CardContent className="pt-3 pb-3 text-center">
                  <DollarSign className="h-7 w-7 text-primary mx-auto mb-1" />
                  <p className="text-xl font-bold text-foreground">
                    R$ {totalGastoMesAtual.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
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

            {/* Gráfico de Frequência */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Frequência de Visitas</h4>
                </div>
                
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={frequenciaData} margin={{
                  top: 4,
                  right: 8,
                  bottom: 8,
                  left: 8
                }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={false} />
                    <XAxis dataKey="mes" tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 12
                  }} tickLine={false} axisLine={{
                    stroke: 'hsl(var(--border))'
                  }} interval={0} tickMargin={8} />
                    <YAxis domain={[0, 'auto']} allowDecimals={false} tickCount={6} tick={{
                    fill: 'hsl(var(--muted-foreground))',
                    fontSize: 12
                  }} tickLine={false} axisLine={{
                    stroke: 'hsl(var(--border))'
                  }} />
                    <Tooltip contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} labelStyle={{
                    color: 'hsl(var(--foreground))'
                  }} />
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
                      R$ {totalGastoMesAtual.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                    </p>
                    <p className="text-xs text-muted-foreground">Gasto este Mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agendamentos Não Avaliados */}
            {agendamentosNaoAvaliados.length > 0 && <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <h4 className="text-sm font-semibold text-foreground">Avalie seus Atendimentos</h4>
                  </div>

                  <div className="space-y-3">
                    {agendamentosNaoAvaliados.map(agendamento => <AvaliacaoItem key={agendamento.id} agendamento={agendamento} onRemove={id => setAgendamentosNaoAvaliados(prev => prev.filter(a => a.id !== id))} />)}
                  </div>
                </CardContent>
              </Card>}

            {/* Agendamento Rápido e Sugestões */}
            <QuickBookingCard userEmail={userData?.email} />

            {/* Agendamentos Pendentes ou em Atendimento */}
            {(() => {
              // Filtrar agendamentos: não cancelados OU com pagamento parcial pendente
              const agendamentosVisiveis = agendamentos.filter(agendamento => {
                const cancelado = (agendamento as any).cancelado;
                const pagamentoParcial = (agendamento as any).pagamento_parcial;
                
                // Se cancelado E NÃO tem pagamento parcial pendente, ocultar
                if (cancelado && !pagamentoParcial) return false;
                
                // Se concluído E NÃO tem pagamento parcial pendente, ocultar
                if (agendamento.status === 'concluido' && !pagamentoParcial) return false;
                
                return true;
              });
              
              if (agendamentosVisiveis.length === 0) return null;
              
              const agendamentoEmAtendimento = agendamentosVisiveis.find(a => a.status === 'em_atendimento');
              const titulo = agendamentoEmAtendimento ? 'Agendamento em Atendimento' : 'Agendamentos Pendentes';
              
              return <div className="space-y-3 mb-6">
                      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        {titulo}
                      </h3>
                      {agendamentosVisiveis.map(agendamento => {
                  const isInService = agendamento.status === 'em_atendimento';
                  return <Card key={agendamento.id} className="bg-card/50 backdrop-blur border-primary/20 overflow-hidden">
                            <CardContent className="pt-4 pb-4 space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{agendamento.servico_nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(agendamento.data, "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR
                            })}
                                  </p>
                                  
                                  {/* Informações do Profissional e Sala */}
                                  <div className="mt-2 space-y-1">
                                    {agendamento.funcionario_nome && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">Profissional: {agendamento.funcionario_nome}</span>
                                      </div>}
                                    {agendamento.sala_atendimento && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">Sala: {agendamento.sala_atendimento}</span>
                                      </div>}
                                    {agendamento.forma_pagamento && <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {agendamento.forma_pagamento.toLowerCase().includes('pix') ? <QrCode className="h-3 w-3 flex-shrink-0 text-primary" /> : <Wallet className="h-3 w-3 flex-shrink-0 text-green-600" />}
                                        <span className="truncate">Pagamento: {agendamento.forma_pagamento}</span>
                                      </div>}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                  <Badge variant={isInService ? 'default' : agendamento.status === 'confirmado' ? 'default' : 'secondary'} className="flex-shrink-0 text-[10px] px-2 py-1">
                                    {isInService ? <><Timer className="h-2.5 w-2.5 mr-1" />Em Atendimento</> : agendamento.status === 'confirmado' ? <><CheckCircle className="h-2.5 w-2.5 mr-1" />Confirmado</> : <><Clock className="h-2.5 w-2.5 mr-1" />Aguardando</>}
                                  </Badge>
                                  {(agendamento as any).pagamento_parcial && (
                                    <Badge variant="outline" className="flex-shrink-0 text-[10px] px-2 py-1 border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20">
                                      <Wallet className="h-2.5 w-2.5 mr-1" />
                                      Pagamento Parcial
                                    </Badge>
                                  )}
                                  {agendamento.editado && (
                                    <Badge variant="outline" className="flex-shrink-0 text-[10px] px-2 py-1 border-blue-500 text-blue-600">
                                      <RefreshCw className="h-2.5 w-2.5 mr-1" />
                                      Reagendado
                                    </Badge>
                                  )}
                                  {(agendamento as any).cancelado && (
                                    <Badge variant="outline" className="flex-shrink-0 text-[10px] px-2 py-1 border-red-500 text-red-600">
                                      <XCircle className="h-2.5 w-2.5 mr-1" />
                                      Cancelado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <CountdownTimer targetDate={agendamento.data} isInService={isInService} endTime={agendamento.tempo_fim} pagamentoParcial={(agendamento as any).pagamento_parcial} />
                              
                              <div className="flex flex-col gap-3 pt-3 border-t border-primary/20">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-col">
                                    <p className="text-lg font-bold text-primary">
                                      R$ {agendamento.preco.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}
                                    </p>
                                    {(agendamento as any).pagamento_parcial && (agendamento as any).valor_restante > 0 && (
                                      <p className="text-[10px] text-amber-600 font-medium">
                                        Restante: R$ {((agendamento as any).valor_restante).toLocaleString('pt-BR', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}
                                      </p>
                                    )}
                                  </div>
                                  <div className={`text-[10px] flex-shrink-0 ${isInService ? 'text-green-600' : agendamento.status === 'confirmado' ? 'text-green-600' : 'text-amber-600'}`}>
                                    {isInService ? <div className="flex items-center gap-1">
                                        <Timer className="h-2.5 w-2.5" />
                                        <span className="whitespace-nowrap">Em Atendimento</span>
                                      </div> : agendamento.status === 'confirmado' ? <div className="flex items-center gap-1">
                                        
                                        
                                      </div> : <div className="flex items-center gap-1">
                                        <Clock className="h-2.5 w-2.5" />
                                        <span className="whitespace-nowrap">Aguardando</span>
                                      </div>}
                                  </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="grid grid-cols-2 gap-2">
                                  <Button variant="outline" size="sm" className="text-[10px] h-8 border-primary/30 hover:bg-primary/10" onClick={() => handleSaveReceipt(agendamento)}>
                                    <Download className="h-3 w-3 mr-1" />
                                    <span className="truncate">Comprovante</span>
                                  </Button>

                                  <AddToCalendarButton agendamento={{
                            id: agendamento.id,
                            servico_nome: agendamento.servico_nome,
                            data: agendamento.data,
                            duracao: 30,
                            funcionario_nome: agendamento.funcionario_nome,
                            sala_atendimento: agendamento.sala_atendimento
                          }} variant="outline" size="sm" className="text-[10px] h-8 border-primary/30 hover:bg-primary/10" />
                                </div>

                                {agendamento.status === 'aguardando_confirmacao' ? <div className="flex items-center space-x-2">
                                    <Checkbox id={`presente-${agendamento.id}`} checked={agendamento.presente} onCheckedChange={checked => handleConfirmAppointment(agendamento.id, Boolean(checked))} />
                                    <label htmlFor={`presente-${agendamento.id}`} className="text-xs cursor-pointer">
                                      Confirmar presença
                                    </label>
                                  </div> : !isInService && <div className="flex flex-col gap-2">
                                    {(agendamento.cancelamentos || 0) === 0 ? <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="destructive" size="sm" className="w-full text-xs h-9">
                                            Cancelar Agendamento
                                          </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-4">
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
                                          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
                                            {!agendamento.editado && <Button variant="outline" onClick={() => handleEditarAgendamento(agendamento)} className="w-full text-xs h-9">
                                                Reagendar
                                              </Button>}
                                            <AlertDialogCancel className="w-full text-xs h-9 mt-0">
                                              Manter Agendamento
                                            </AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleCancelarAgendamento(agendamento.id)} className="w-full text-xs h-9 bg-destructive">
                                              Confirmar Cancelamento
                                            </AlertDialogAction>
                                          </AlertDialogFooter>
                                        </AlertDialogContent>
                                      </AlertDialog> : agendamento.cancelamentos === 1 && !agendamento.editado ? <Button variant="outline" size="sm" className="w-full text-xs h-9 border-blue-500 text-blue-600" onClick={() => handleReagendarAgendamento(agendamento)}>
                                        <Calendar className="h-3 w-3 mr-2" />
                                        Reagendar sem Cobrança
                                      </Button> : <Badge variant="destructive" className="flex items-center gap-1 text-xs justify-center py-2">
                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                        <span className="text-[10px]">{agendamento.editado ? 'Reagendado' : 'Limite excedido'}</span>
                                      </Badge>}
                                  </div>}
                              </div>
                            </CardContent>
                          </Card>;
                })}
              </div>;
            })()}

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

                <button onClick={() => setHistoricoSubTab("agendamentos_cancelados")} className={`w-full py-2 px-3 rounded-md transition-colors ${historicoSubTab === "agendamentos_cancelados" ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground hover:bg-background"}`}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-medium text-xs">Cancelados</span>
                    <Badge variant={historicoSubTab === "agendamentos_cancelados" ? "secondary" : "outline"} className="text-xs">
                      {agendamentosCancelados.length}
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
                            {format(agendamento.data, "dd 'de' MMMM 'às' HH:mm", {
                      locale: ptBR
                    })}
                          </p>
                        </div>
                        <Badge variant={agendamento.status === 'confirmado' || agendamento.presente ? "default" : "secondary"}>
                          {agendamento.status === 'confirmado' || agendamento.presente ? "Confirmado" : "Aguardando"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-primary">
                          R$ {agendamento.preco.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                        </div>
                        {agendamento.status === 'aguardando_confirmacao' && <Button size="sm" variant="default" onClick={() => handleConfirmAppointment(agendamento.id, true)}>
                            <Check className="h-4 w-4 mr-1" />
                            Confirmar Agendamento
                          </Button>}
                      </div>
                    </CardContent>
                  </Card>) : historicoSubTab === "agendamentos_finalizados" ? <UltimosAgendamentos userEmail={userData?.email || ''} maxItems={50} compact={false} /> : historicoSubTab === "agendamentos_cancelados" ? agendamentosCancelados.length === 0 ? <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum agendamento cancelado</p>
                  </CardContent>
                </Card> : agendamentosCancelados.map(agendamento => <Card key={agendamento.id} className="bg-card/50 backdrop-blur border-destructive/20">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-semibold text-foreground">{agendamento.servico_nome}</h4>
                          <p className="text-sm text-muted-foreground">
                            {format(agendamento.data, "dd 'de' MMMM 'às' HH:mm", {
                      locale: ptBR
                    })}
                          </p>
                          {agendamento.funcionario_nome && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Profissional: {agendamento.funcionario_nome}
                            </p>
                          )}
                          {agendamento.sala_atendimento && (
                            <p className="text-xs text-muted-foreground">
                              Sala: {agendamento.sala_atendimento}
                            </p>
                          )}
                        </div>
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          Cancelado
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold text-muted-foreground line-through">
                          R$ {agendamento.preco.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>) : historicoSubTab === "comandas_abertas" ? comandasAbertas.length === 0 ? <Card className="bg-card/50 backdrop-blur">
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
                            Criada: {format(comanda.data_criacao, "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR
                    })}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {comanda.itens?.length || 0} {comanda.itens?.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            R$ {comanda.total.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
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
                                        Unit: R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-primary">
                                      R$ {(item.total || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
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
                            {comanda.data_finalizacao && `Finalizada: ${format(comanda.data_finalizacao, "dd/MM/yyyy", {
                      locale: ptBR
                    })}`}
                          </p>
                          {comanda.data_pagamento && <p className="text-xs text-muted-foreground">
                              Pago: {format(comanda.data_pagamento, "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR
                    })}
                            </p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {comanda.itens?.length || 0} {comanda.itens?.length === 1 ? 'item' : 'itens'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            R$ {comanda.total.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
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
                                        Unit: R$ {(item.preco_unitario || 0).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right ml-2">
                                    <p className="text-sm font-bold text-primary">
                                      R$ {(item.total || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
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
        const todosPagamentos: Pagamento[] = [...agendamentosFinalizados.map(a => ({
          id: a.id,
          tipo: 'servico' as const,
          descricao: a.servico_nome,
          valor: a.preco,
          data: a.data_atendimento,
          metodo: a.forma_pagamento_utilizada,
          status: 'pago' as const
        })), ...comandasFinalizadas.map(c => ({
          id: c.id,
          tipo: 'comanda' as const,
          descricao: `Comanda #${c.numero}`,
          valor: c.total,
          data: c.data_pagamento || c.data_finalizacao || c.data_criacao,
          metodo: c.tipo_pagamento || 'Não informado',
          status: 'pago' as const
        })), ...comandasAbertas.map(c => ({
          id: c.id,
          tipo: 'comanda' as const,
          descricao: `Comanda #${c.numero}`,
          valor: c.total,
          data: c.data_criacao,
          metodo: 'Pendente',
          status: 'pendente' as const
        }))].sort((a, b) => b.data.getTime() - a.data.getTime());
        const pagamentosFiltrados = todosPagamentos.filter(p => {
          // Filtro por método
          if (filtroMetodo !== 'todos' && p.metodo !== filtroMetodo) return false;

          // Filtro por data
          if (filtroDataInicio && filtroDataFim) {
            return isWithinInterval(p.data, {
              start: filtroDataInicio,
              end: filtroDataFim
            });
          }
          return true;
        });
        const financeiroDate = new Date();
        const periodoInicio = filtroPeriodo === 'mensal' ? startOfMonth(financeiroDate) : startOfYear(financeiroDate);
        const periodoFim = filtroPeriodo === 'mensal' ? endOfMonth(financeiroDate) : endOfYear(financeiroDate);
        const totalPeriodo = todosPagamentos.filter(p => p.status === 'pago' && isWithinInterval(p.data, {
          start: periodoInicio,
          end: periodoFim
        })).reduce((acc, p) => acc + p.valor, 0);
        const pagamentosPendentes = todosPagamentos.filter(p => p.status === 'pendente');
        const totalPendente = pagamentosPendentes.reduce((acc, p) => acc + p.valor, 0);
        const metodosPagamento = Array.from(new Set(agendamentosFinalizados.map(a => a.forma_pagamento_utilizada).filter(m => m && m !== 'Não informado')));
        return <div className="space-y-4 p-4">
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
                    R$ {totalPeriodo.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filtroPeriodo === 'mensal' ? format(financeiroDate, "MMMM 'de' yyyy", {
                    locale: ptBR
                  }) : format(financeiroDate, "yyyy", {
                    locale: ptBR
                  })}
                  </p>
                </div>

                {pagamentosPendentes.length > 0 && <div className="pt-3 border-t border-primary/20">
                    <div className="flex items-center justify-between text-amber-600">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm font-medium">Pendentes</span>
                      </div>
                      <span className="font-bold">R$ {totalPendente.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}</span>
                    </div>
                  </div>}
              </CardContent>
            </Card>

            {/* Métodos de Pagamento Salvos */}
            {metodosPagamento.length > 0 && <Card className="bg-card/50 backdrop-blur border-primary/20">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-primary" />
                    Métodos Utilizados
                  </h4>
                  <div className="space-y-2">
                    {metodosPagamento.map((metodo, index) => <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-2">
                          {metodo.toLowerCase().includes('pix') ? <QrCode className="h-4 w-4 text-primary" /> : metodo.toLowerCase().includes('cartão') ? <CreditCard className="h-4 w-4 text-blue-600" /> : <Banknote className="h-4 w-4 text-green-600" />}
                          <span className="text-sm font-medium">{metodo}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {todosPagamentos.filter(p => p.metodo === metodo && p.status === 'pago').length} vezes
                        </Badge>
                      </div>)}
                  </div>
                </CardContent>
              </Card>}

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
                      {metodosPagamento.map((metodo, index) => <SelectItem key={index} value={metodo}>{metodo}</SelectItem>)}
                      <SelectItem value="Pendente">Pendentes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Pagamentos Pendentes em Destaque */}
            {pagamentosPendentes.length > 0 && <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Pagamentos Pendentes
                </h4>
                {pagamentosPendentes.map(pagamento => <Card key={pagamento.id} className="bg-amber-50/10 border-amber-600/30">
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
                            {format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR
                      })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-600">
                            R$ {pagamento.valor.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
              </div>}

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

              {pagamentosFiltrados.length === 0 ? <Card className="bg-card/50 backdrop-blur">
                  <CardContent className="pt-6 text-center py-8">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
                  </CardContent>
                </Card> : pagamentosFiltrados.map(pagamento => <Card key={pagamento.id} className="bg-card/50 backdrop-blur border-primary/20">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant={pagamento.status === 'pago' ? 'default' : 'secondary'} className={pagamento.status === 'pendente' ? 'bg-amber-600/20 text-amber-600 border-amber-600/30' : ''}>
                              {pagamento.status === 'pago' ? 'Pago' : 'Pendente'}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {pagamento.tipo === 'servico' ? 'Serviço' : 'Comanda'}
                            </Badge>
                          </div>
                          <p className="font-medium text-sm text-foreground">{pagamento.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR
                      })}
                          </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div>
                            <p className="text-lg font-bold text-primary">
                              R$ {pagamento.valor.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              {pagamento.metodo.toLowerCase().includes('pix') ? <QrCode className="h-3 w-3 text-primary" /> : pagamento.metodo.toLowerCase().includes('cartão') ? <CreditCard className="h-3 w-3 text-blue-600" /> : pagamento.status === 'pendente' ? <Clock className="h-3 w-3 text-amber-600" /> : <Banknote className="h-3 w-3 text-green-600" />}
                              <span className="text-xs text-muted-foreground">{pagamento.metodo}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="outline" onClick={async () => {
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
                                    <div style="font-size: 14px; color: ${textColor};">${format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}</div>
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
                                    <div style="font-size: 32px; font-weight: bold; color: ${textColor};">R$ ${pagamento.valor.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</div>
                                  </div>
                                  
                                  <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid ${borderColor};">
                                    <p style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: ${textColor};">Obrigado pela preferência!</p>
                                    <p style="font-size: 11px; opacity: 0.7; margin: 0; color: ${textColor};">Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR
                        })}</p>
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
                        canvas.toBlob(blob => {
                          if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');

                            // Nome do arquivo baseado no tipo
                            const dataFormatada = format(pagamento.data, "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR
                            });
                            const nomeArquivo = pagamento.tipo === 'servico' ? `${pagamento.descricao}-${dataFormatada}.png` : `comanda-${dataFormatada}.png`;
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
                    }} className="h-8 gap-1">
                            <Receipt className="h-3 w-3" />
                            <span className="text-xs">Salvar comprovante</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>)}
            </div>
          </div>;
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

            {/* Configurações de Notificações Push */}
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <Bell className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold text-foreground">Notificações de Lembrete</h4>
                </div>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Receba lembretes automáticos no seu dispositivo antes dos seus atendimentos:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>2 horas antes</li>
                    <li>1 hora antes</li>
                    <li>30 minutos antes</li>
                    <li>15 minutos antes</li>
                  </ul>
                  <p className="text-xs">
                    Ative as notificações para não perder seus horários agendados!
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <NotificationPermissionButton />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={async () => {
                      if (!currentUser?.uid) {
                        toast({
                          title: "Erro",
                          description: "Usuário não autenticado",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const { supabase } = await import('@/integrations/supabase/client');
                        
                        const { data, error } = await supabase.functions.invoke('send-push-notification', {
                          body: {
                            userIds: [currentUser.uid],
                            title: '🔔 Notificação de Teste',
                            message: 'Esta é uma notificação de teste do sistema Firebase!',
                            data: { type: 'test' }
                          }
                        });

                        if (error) {
                          console.error('Erro ao enviar notificação:', error);
                          toast({
                            title: "Erro ao enviar",
                            description: "Não foi possível enviar a notificação de teste",
                            variant: "destructive"
                          });
                          return;
                        }

                        toast({
                          title: "Notificação enviada!",
                          description: data?.recipients > 0 
                            ? "Você deve receber a notificação em instantes" 
                            : "Certifique-se de ter ativado as notificações",
                        });
                      } catch (error) {
                        console.error('Erro:', error);
                        toast({
                          title: "Erro",
                          description: "Ocorreu um erro ao enviar a notificação",
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Testar Notificação
                  </Button>
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
      {agendamentoParaAvaliar && <AvaliacaoModal open={avaliacaoModalOpen} onOpenChange={open => {
      setAvaliacaoModalOpen(open);
      if (!open) {
        setAgendamentoParaAvaliar(null);
      }
    }} agendamentoId={agendamentoParaAvaliar.id} usuarioId={currentUser?.uid || ''} usuarioNome={userData?.nome || ''} servicoNome={agendamentoParaAvaliar.servico_nome} />}
      
      {selectedAgendamento && <>
          <EditAgendamentoModal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} agendamento={selectedAgendamento} onUpdate={() => {
        setEditModalOpen(false);
        setSelectedAgendamento(null);
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
                tempo_estimado: data.tempo_estimado || 30,
                funcionario_nome: data.funcionario_nome || '',
                sala_atendimento: data.sala_atendimento || '',
                forma_pagamento: data.forma_pagamento || '',
                cancelado: data.cancelado || false,
                pagamento_parcial: data.pagamento_parcial || false,
                valor_restante: (data.valor_parcial_restante ?? data.valor_restante ?? 0),
                valor_total: data.valor_total || 0,
                valor_pago: data.valor_pago || 0
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
                tempo_estimado: data.tempo_estimado || 30,
                funcionario_nome: data.funcionario_nome || '',
                sala_atendimento: data.sala_atendimento || '',
                forma_pagamento: data.forma_pagamento || '',
                cancelado: data.cancelado || false,
                pagamento_parcial: data.pagamento_parcial || false,
                valor_restante: (data.valor_parcial_restante ?? data.valor_restante ?? 0),
                valor_total: data.valor_total || 0,
                valor_pago: data.valor_pago || 0
              });
            });
            setAgendamentos(items.sort((a, b) => a.data.getTime() - b.data.getTime()));
          }
        };
        loadData();
      }} />
        </>}

      {/* Menu de Opções de Avatar */}
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
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => {
            setAvatarMenuOpen(false);
            setViewImageModalOpen(true);
          }}>
              <Eye className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Visualizar Foto</div>
                <div className="text-xs text-muted-foreground">Ver foto em tamanho grande</div>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => {
            setAvatarMenuOpen(false);
            setCameraModalOpen(true);
            startCapture();
          }}>
              <Camera className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Tirar Foto</div>
                <div className="text-xs text-muted-foreground">Usar câmera do dispositivo</div>
              </div>
            </Button>

            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => {
            setAvatarMenuOpen(false);
            setChangeAvatarModalOpen(true);
          }}>
              <Upload className="h-5 w-5 mr-3" />
              <div className="text-left">
                <div className="font-medium">Carregar Foto</div>
                <div className="text-xs text-muted-foreground">Escolher da galeria</div>
              </div>
            </Button>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Visualização da Imagem */}
      <AlertDialog open={viewImageModalOpen} onOpenChange={setViewImageModalOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Foto de Perfil</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex items-center justify-center p-4">
            <img src={avatarUrl} alt="Profile Avatar Large" className="max-w-full max-h-[70vh] rounded-lg object-contain shadow-xl" />
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Câmera */}
      <Dialog open={cameraModalOpen} onOpenChange={open => {
      setCameraModalOpen(open);
      if (!open) stopCapture();
    }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Capturar Foto
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Pré-visualização da câmera ou imagem capturada */}
            {!capturedImageUrl && <div className="relative w-full aspect-[9/16] max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden">
                {isVideoLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                    <div className="text-white">Carregando câmera...</div>
                  </div>}
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>}
            
            {/* Imagem Capturada */}
            {capturedImageUrl && <div className="space-y-2">
                <div className="relative w-full aspect-[9/16] max-w-[300px] mx-auto bg-muted rounded-lg overflow-hidden">
                  <img src={capturedImageUrl} alt="Foto capturada" className="w-full h-full object-cover" />
                </div>
                <Button type="button" variant="outline" onClick={startCapture} className="w-full" disabled={isUploading}>
                  Tirar Nova Foto
                </Button>
              </div>}
            
            {/* Canvas oculto */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Botões de Ação */}
            <div className="flex gap-2">
              {!capturedImageUrl && <Button type="button" onClick={handleTakePhoto} disabled={isUploading || isVideoLoading} className="flex-1">
                  {isUploading ? "Salvando..." : "Capturar"}
                </Button>}
              
              {capturedImageUrl && <Button type="button" onClick={handleTakePhoto} disabled={isUploading} className="flex-1">
                  {isUploading ? "Salvando..." : "Salvar Foto"}
                </Button>}
              
              <Button type="button" variant="outline" onClick={() => {
              stopCapture();
              setCameraModalOpen(false);
            }} disabled={isUploading}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Upload de Arquivo */}
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
          
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="avatar-upload" />
              <label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-primary" />
                <span className="text-sm font-medium">Clique para escolher</span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG ou WEBP (máx. 10MB)
                </span>
              </label>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>;
};
export default ProfileMobile;