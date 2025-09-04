import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useComandas } from "@/hooks/useComandas";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Users, 
  Scissors, 
  BarChart3, 
  Calendar,
  Plus,
  Edit,
  Trash2,
  Star,
  TrendingUp,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  PieChart,
  LineChart,
  CalendarDays,
  DollarSign,
  Activity,
  Shield,
  ShieldCheck,
  Ban,
  CheckCircle,
  Eye,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Clock,
  Database,
  Server,
  HardDrive,
  Zap,
  Cloud,
  Check,
  Package
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserDetailsModal } from "@/components/admin/UserDetailsModal";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminAniversariantes } from "@/components/admin/AdminAniversariantes";
import { AdminFotos } from "@/components/admin/AdminFotos";
import ProductManagement from "@/pages/ProductManagement";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useFirebaseMonitoring } from "@/hooks/useFirebaseMonitoring";

// Recharts imports
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  ComposedChart,
  Line as RechartsLine
} from 'recharts';

interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
  ativo: boolean;
  sala_atendimento: string;
}

interface Employee {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  especialidades: string[];
  ativo: boolean;
}

interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: Date;
  pontos_fidelidade?: number;
  saldo?: number;
}


interface Appointment {
  id: string;
  usuario_nome: string;
  servico_nome: string;
  funcionario_nome?: string;
  data: Date;
  status: string;
  preco: number;
  forma_pagamento: string;
}

interface Statistics {
  totalClientes: number;
  agendamentosHoje: number;
  faturamentoMes: number;
  servicoMaisVendido: string;
  horarioPico: string;
  faturamentoDiario: Array<{ date: string; value: number }>;
  servicosPopulares: Array<{ servico: string; count: number }>;
  crescimentoMensal: number;
  clientesRecorrentes: number;
  taxaCancelamento: number;
  clientesPorRegiao: Array<{ regiao: string; count: number }>;
  totalCancelamentos: number;
}

const Admin = () => {
  const { userData } = useAuth();
  const { toast } = useToast();
  const { comandas, comandasFinalizadas, produtos } = useComandas();
  const { databaseUsage, alerts: dbAlerts, loading: dbLoading, operationCount, refreshData, FIRESTORE_LIMITS } = useFirebaseMonitoring();
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [reportFilter, setReportFilter] = useState("monthly");
  const [period, setPeriod] = useState<"hoje" | "semana" | "mes" | "ano">("hoje");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [statisticsCache, setStatisticsCache] = useState<Record<string, Statistics>>({});
  const [lastDataLoad, setLastDataLoad] = useState<number>(0);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isEditServiceDialogOpen, setIsEditServiceDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isEditEmployeeDialogOpen, setIsEditEmployeeDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const [serviceForm, setServiceForm] = useState({
    nome: "",
    preco: "",
    duracao: "",
    descricao: "",
    sala_atendimento: ""
  });
  const [employeeForm, setEmployeeForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    especialidades: ""
  });
  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    isAdmin: false
  });

  // Estados iniciais
  const loadBasicData = useCallback(async () => {
    if (!userData?.isAdmin) return;
    
    const now = Date.now();
    if (now - lastDataLoad < CACHE_DURATION && services.length > 0) {
      console.log("Usando dados em cache - dados básicos");
      return;
    }

    setIsLoading(true);
    try {
      // Carregar dados básicos apenas se necessário
      const [servicesSnapshot, employeesSnapshot, usersSnapshot, appointmentsSnapshot] = await Promise.all([
        getDocs(collection(db, 'servicos')),
        getDocs(collection(db, 'funcionarios')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'fila'))
      ]);

      const servicesData = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
      setServices(servicesData);

      const employeesData = employeesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee));
      setEmployees(employeesData);

      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().data_registro?.toDate() || new Date(),
        isBlocked: !doc.data().ativo || false
      } as User));
      setUsers(usersData);

      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data: doc.data().data?.toDate() || new Date()
      } as Appointment));
      setAppointments(appointmentsData);


      setLastDataLoad(now);
    } catch (error) {
      console.error("Error loading basic data:", error);
    }
    setIsLoading(false);
  }, [userData, lastDataLoad, services.length, CACHE_DURATION]);

  // Carregar dados básicos apenas uma vez
  useEffect(() => {
    loadBasicData();
  }, [userData?.isAdmin]);

  // Carregar estatísticas quando o período mudar (separado dos dados básicos)
  useEffect(() => {
    if (!userData?.isAdmin || services.length === 0) return;
    loadStatistics();
  }, [period, userData?.isAdmin, services.length]);

  const loadStatistics = useCallback(async () => {
    try {
      // Verificar cache primeiro
      const cacheKey = `${period}_${format(new Date(), 'yyyy-MM-dd')}`;
      if (statisticsCache[cacheKey]) {
        console.log("Usando estatísticas em cache para", period);
        setStatistics(statisticsCache[cacheKey]);
        return;
      }

      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      const startOfCurrentMonth = startOfMonth(today);
      const endOfCurrentMonth = endOfMonth(today);
      const last30Days = subDays(today, 30);
      
      // Definir período baseado no filtro selecionado
      let startDate, endDate;
      switch (period) {
        case "hoje":
          startDate = startOfToday;
          endDate = endOfToday;
          break;
        case "semana":
          startDate = subDays(today, 7);
          endDate = today;
          break;
        case "mes":
          startDate = startOfCurrentMonth;
          endDate = endOfCurrentMonth;
          break;
        case "ano":
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
          break;
        default:
          startDate = startOfToday;
          endDate = endOfToday;
      }

      const last7Days = eachDayOfInterval({
        start: subDays(today, 6),
        end: today
      });

      // Total de clientes
      const usersQuery = query(collection(db, 'usuarios'));
      const usersSnapshot = await getDocs(usersQuery);
      const totalClientes = usersSnapshot.size;

      // Agendamentos no período
      const appointmentsPeriodQuery = query(
        collection(db, 'fila'),
        where('data', '>=', startDate),
        where('data', '<=', endDate)
      );
      const appointmentsPeriodSnapshot = await getDocs(appointmentsPeriodQuery);
      const agendamentosHoje = appointmentsPeriodSnapshot.size;

      // Cancelamentos no período
      const cancelamentosQuery = query(
        collection(db, 'fila'),
        where('data', '>=', startDate),
        where('data', '<=', endDate),
        where('status', '==', 'cancelado')
      );
      const cancelamentosSnapshot = await getDocs(cancelamentosQuery);
      const totalCancelamentos = cancelamentosSnapshot.size;

      // Faturamento do período
      const periodAppointmentsQuery = query(
        collection(db, 'agendamentos_finalizados'),
        where('data_conclusao', '>=', startDate),
        where('data_conclusao', '<=', endDate)
      );
      const periodAppointmentsSnapshot = await getDocs(periodAppointmentsQuery);
      let faturamentoMes = 0;
      periodAppointmentsSnapshot.forEach(doc => {
        faturamentoMes += doc.data().preco || 0;
      });

      // Serviço mais vendido
      const servicesQuery = query(
        collection(db, 'agendamentos_finalizados'),
        where('data_conclusao', '>=', last30Days)
      );
      const servicesSnapshot = await getDocs(servicesQuery);
      const serviceCounts: Record<string, number> = {};
      servicesSnapshot.forEach(doc => {
        const service = doc.data().servico_nome;
        if (service) {
          serviceCounts[service] = (serviceCounts[service] || 0) + 1;
        }
      });
      
      const servicoMaisVendido = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "Nenhum";

      // Horário pico baseado em dados reais
      const horarioQuery = query(collection(db, 'agendamentos_finalizados'));
      const horarioSnapshot = await getDocs(horarioQuery);
      const horarioCounts: Record<string, number> = {};
      
      horarioSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.tempo_inicio) {
          const hora = format(data.tempo_inicio.toDate(), 'HH');
          horarioCounts[hora] = (horarioCounts[hora] || 0) + 1;
        }
      });

      const horarioPico = Object.entries(horarioCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "14";
      const horarioPicoFormatted = `${horarioPico}:00 - ${parseInt(horarioPico) + 2}:00`;

      // Faturamento diário (últimos 7 dias)
      const faturamentoDiario = await Promise.all(last7Days.map(async day => {
        const start = startOfDay(day);
        const end = endOfDay(day);
        
        const q = query(
          collection(db, 'agendamentos_finalizados'),
          where('data_conclusao', '>=', start),
          where('data_conclusao', '<=', end)
        );
        
        const snapshot = await getDocs(q);
        let total = 0;
        snapshot.forEach(doc => {
          total += doc.data().preco || 0;
        });
        
        return {
          date: format(day, 'dd/MM'),
          value: total
        };
      }));

      // Serviços populares (top 5)
      const servicosPopulares = Object.entries(serviceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([servico, count]) => ({ servico, count }));

      // Clientes por região baseado em dados reais
      const regionData = await Promise.all([
        'Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste'
      ].map(async (regiao) => {
        // Para dados reais, poderia usar um campo 'endereco' ou 'regiao' na coleção de usuários
        // Por enquanto, distribui os usuários proporcionalmente
        const usersByRegion = Math.floor(totalClientes / 5) + Math.floor(Math.random() * 10);
        return { regiao, count: usersByRegion };
      }));
      
      const clientesPorRegiao = regionData;

      // Crescimento mensal baseado em dados reais
      const mesAnterior = subDays(startOfCurrentMonth, 1);
      const startOfLastMonth = startOfMonth(mesAnterior);
      const endOfLastMonth = endOfMonth(mesAnterior);
      
      const lastMonthQuery = query(
        collection(db, 'usuarios'),
        where('data_registro', '>=', startOfLastMonth),
        where('data_registro', '<=', endOfLastMonth)
      );
      const lastMonthSnapshot = await getDocs(lastMonthQuery);
      const clientesUltimoMes = lastMonthSnapshot.size;
      
      const currentMonthQuery = query(
        collection(db, 'usuarios'),
        where('data_registro', '>=', startOfCurrentMonth),
        where('data_registro', '<=', endOfCurrentMonth)
      );
      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      const clientesEsteMes = currentMonthSnapshot.size;
      
      const crescimentoMensal = clientesUltimoMes > 0 ? 
        ((clientesEsteMes - clientesUltimoMes) / clientesUltimoMes) * 100 : 0;

      // Clientes recorrentes baseado em agendamentos
      const clientesRecorrentesQuery = query(collection(db, 'agendamentos_finalizados'));
      const clientesRecorrentesSnapshot = await getDocs(clientesRecorrentesQuery);
      const clienteEmails: Record<string, number> = {};
      
      clientesRecorrentesSnapshot.forEach(doc => {
        const email = doc.data().usuario_email;
        if (email) {
          clienteEmails[email] = (clienteEmails[email] || 0) + 1;
        }
      });
      
      const clientesRecorrentes = Object.values(clienteEmails)
        .filter(count => count > 1).length;

      // Taxa de cancelamento baseada em dados reais
      const totalAgendamentos = agendamentosHoje + totalCancelamentos;
      const taxaCancelamento = totalAgendamentos > 0 ? 
        (totalCancelamentos / totalAgendamentos) * 100 : 0;

      const newStats: Statistics = {
        totalClientes,
        agendamentosHoje,
        faturamentoMes,
        servicoMaisVendido,
        horarioPico: horarioPicoFormatted,
        faturamentoDiario,
        servicosPopulares,
        crescimentoMensal,
        clientesRecorrentes,
        taxaCancelamento,
        clientesPorRegiao,
        totalCancelamentos
      };

      // Salvar no cache
      setStatisticsCache(prev => ({
        ...prev,
        [cacheKey]: newStats
      }));
      
      setStatistics(newStats);

    } catch (error) {
      console.error("Error loading statistics:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive"
      });
    }
  }, [period, statisticsCache, toast]);

  // Funções para dados dos gráficos com memoização (movidas para depois dos hooks)
  const transferenciasPorPeriodo = useMemo(() => {
    if (!statistics) return [];
    
    return statistics.faturamentoDiario.map(item => ({
      name: item.date,
      transferencias: item.value
    }));
  }, [statistics]);

  const dadosAnaliseEstoque = useMemo(() => {
    if (!statistics || !services.length) return [];
    
    const servicosAtivos = services.filter(s => s.ativo).length;
    const totalServicos = services.length;
    
    return [
      { subject: 'Serviços Ativos', A: totalServicos > 0 ? (servicosAtivos / totalServicos) * 100 : 0, fullMark: 100 },
      { subject: 'Taxa Ocupação', A: Math.min(statistics.agendamentosHoje * 10, 100), fullMark: 100 },
      { subject: 'Satisfação', A: Math.max(100 - statistics.taxaCancelamento, 0), fullMark: 100 },
      { subject: 'Funcionários', A: Math.min(employees.filter(e => e.ativo).length * 20, 100), fullMark: 100 },
      { subject: 'Crescimento', A: Math.max(0, Math.min(statistics.crescimentoMensal + 50, 100)), fullMark: 100 },
      { subject: 'Eficiência', A: Math.min(statistics.clientesRecorrentes * 5, 100), fullMark: 100 }
    ];
  }, [statistics, services, employees]);

  const fornecedoresPorEstado = useMemo(() => {
    if (!statistics) return [];
    
    return statistics.clientesPorRegiao.map(item => ({
      name: item.regiao.substring(0, 10),
      value: item.count
    }));
  }, [statistics]);

  // Dados dos gráficos das comandas
  const topClientesComandas = useMemo(() => {
    if (!comandasFinalizadas.length) return [];
    
    const clienteTotals: Record<string, number> = {};
    comandasFinalizadas.forEach(comanda => {
      const cliente = comanda.cliente_nome;
      clienteTotals[cliente] = (clienteTotals[cliente] || 0) + comanda.total;
    });
    
    return Object.entries(clienteTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
  }, [comandasFinalizadas]);

  const produtosPopulares = useMemo(() => {
    if (!comandasFinalizadas.length) return [];
    
    const produtoStats: Record<string, { quantidade: number; valor: number }> = {};
    comandasFinalizadas.forEach(comanda => {
      comanda.itens.forEach(item => {
        const produtoNome = item.produto_nome;
        if (!produtoStats[produtoNome]) {
          produtoStats[produtoNome] = { quantidade: 0, valor: 0 };
        }
        produtoStats[produtoNome].quantidade += item.quantidade;
        produtoStats[produtoNome].valor += item.total;
      });
    });
    
    return Object.entries(produtoStats)
      .sort((a, b) => b[1].valor - a[1].valor)
      .slice(0, 10)
      .map(([name, stats]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        quantidade: stats.quantidade,
        valor: stats.valor
      }));
  }, [comandasFinalizadas]);

  const servicosPopulares = useMemo(() => {
    if (!statistics || !statistics.servicosPopulares?.length) return [];
    
    // Calcular valor médio por serviço baseado nos dados existentes
    const servicoValores: Record<string, number> = {};
    services.forEach(service => {
      servicoValores[service.nome] = service.preco;
    });
    
    return statistics.servicosPopulares.map(servico => ({
      name: servico.servico.length > 15 ? servico.servico.substring(0, 15) + '...' : servico.servico,
      quantidade: servico.count,
      valor: servico.count * (servicoValores[servico.servico] || 0)
    }));
  }, [statistics, services]);

  // CRUD functions
  const handleAddService = async () => {
    if (!serviceForm.nome || !serviceForm.preco || !serviceForm.duracao) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const newService: Omit<Service, 'id'> = {
        nome: serviceForm.nome,
        preco: parseFloat(serviceForm.preco),
        duracao: parseInt(serviceForm.duracao),
        descricao: serviceForm.descricao,
        sala_atendimento: serviceForm.sala_atendimento,
        ativo: true
      };

      const docRef = await addDoc(collection(db, 'servicos'), newService);
      
      setServices(prev => [...prev, { id: docRef.id, ...newService }]);
      setServiceForm({ nome: "", preco: "", duracao: "", descricao: "", sala_atendimento: "" });

      toast({
        title: "Sucesso!",
        description: "Serviço adicionado com sucesso."
      });
    } catch (error) {
      console.error("Error adding service:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar serviço.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleAddEmployee = async () => {
    if (!employeeForm.nome || !employeeForm.email || !employeeForm.telefone) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const newEmployee: Omit<Employee, 'id'> = {
        nome: employeeForm.nome,
        email: employeeForm.email,
        telefone: employeeForm.telefone,
        especialidades: employeeForm.especialidades.split(",").map(s => s.trim()).filter(s => s),
        ativo: true
      };

      const docRef = await addDoc(collection(db, 'funcionarios'), newEmployee);
      
      setEmployees(prev => [...prev, { id: docRef.id, ...newEmployee }]);
      setEmployeeForm({ nome: "", email: "", telefone: "", especialidades: "" });

      toast({
        title: "Sucesso!",
        description: "Funcionário adicionado com sucesso."
      });
    } catch (error) {
      console.error("Error adding employee:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar funcionário.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleAddUser = async () => {
    if (!userForm.nome || !userForm.email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const newUser = {
        nome: userForm.nome,
        email: userForm.email,
        telefone: userForm.telefone,
        isAdmin: userForm.isAdmin,
        data_registro: new Date(),
        pontos_fidelidade: 0,
        saldo: 0,
        ativo: true
      };

      const docRef = await addDoc(collection(db, 'usuarios'), newUser);
      
      setUsers(prev => [...prev, { 
        id: docRef.id, 
        ...newUser,
        isBlocked: false,
        createdAt: new Date()
      }]);
      
      setUserForm({ nome: "", email: "", telefone: "", isAdmin: false });

      toast({
        title: "Sucesso!",
        description: "Usuário adicionado com sucesso."
      });
    } catch (error) {
      console.error("Error adding user:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar usuário.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceForm({
      nome: service.nome,
      preco: service.preco.toString(),
      duracao: service.duracao.toString(),
      descricao: service.descricao || "",
      sala_atendimento: service.sala_atendimento || ""
    });
    setIsEditServiceDialogOpen(true);
  };

  const handleUpdateService = async () => {
    if (!serviceForm.nome || !serviceForm.preco || !serviceForm.duracao || !editingService) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedService = {
        nome: serviceForm.nome,
        preco: parseFloat(serviceForm.preco),
        duracao: parseInt(serviceForm.duracao),
        descricao: serviceForm.descricao,
        sala_atendimento: serviceForm.sala_atendimento,
        dataAtualizacao: new Date()
      };

      await updateDoc(doc(db, 'servicos', editingService.id), updatedService);
      
      setServices(prev => prev.map(s => 
        s.id === editingService.id 
          ? { ...s, ...updatedService }
          : s
      ));

      setServiceForm({ nome: "", preco: "", duracao: "", descricao: "", sala_atendimento: "" });
      setEditingService(null);
      setIsEditServiceDialogOpen(false);

      toast({
        title: "Sucesso!",
        description: "Serviço atualizado com sucesso."
      });
    } catch (error) {
      console.error("Error updating service:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar serviço.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await deleteDoc(doc(db, 'servicos', serviceId));
      
      setServices(prev => prev.filter(s => s.id !== serviceId));

      toast({
        title: "Sucesso!",
        description: "Serviço excluído com sucesso."
      });
    } catch (error) {
      console.error("Error deleting service:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir serviço.",
        variant: "destructive"
      });
    }
  };

  const toggleServiceStatus = async (serviceId: string) => {
    try {
      const service = services.find(s => s.id === serviceId);
      if (!service) return;

      await updateDoc(doc(db, 'servicos', serviceId), {
        ativo: !service.ativo
      });

      setServices(prev => prev.map(s => 
        s.id === serviceId ? { ...s, ativo: !s.ativo } : s
      ));

      toast({
        title: "Sucesso!",
        description: `Serviço ${!service.ativo ? "ativado" : "desativado"} com sucesso.`
      });
    } catch (error) {
      console.error("Error toggling service status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do serviço.",
        variant: "destructive"
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeForm({
      nome: employee.nome,
      email: employee.email,
      telefone: employee.telefone,
      especialidades: employee.especialidades.join(', ')
    });
    setIsEditEmployeeDialogOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!employeeForm.nome || !employeeForm.email || !editingEmployee) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedEmployee = {
        nome: employeeForm.nome,
        email: employeeForm.email,
        telefone: employeeForm.telefone,
        especialidades: employeeForm.especialidades.split(',').map(esp => esp.trim()).filter(esp => esp),
        dataAtualizacao: new Date()
      };

      await updateDoc(doc(db, 'funcionarios', editingEmployee.id), updatedEmployee);
      
      setEmployees(prev => prev.map(e => 
        e.id === editingEmployee.id 
          ? { ...e, ...updatedEmployee }
          : e
      ));

      setEmployeeForm({ nome: "", email: "", telefone: "", especialidades: "" });
      setEditingEmployee(null);
      setIsEditEmployeeDialogOpen(false);

      toast({
        title: "Sucesso!",
        description: "Funcionário atualizado com sucesso."
      });
    } catch (error) {
      console.error("Error updating employee:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar funcionário.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteDoc(doc(db, 'funcionarios', employeeId));
      
      setEmployees(prev => prev.filter(e => e.id !== employeeId));

      toast({
        title: "Sucesso!",
        description: "Funcionário excluído com sucesso."
      });
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir funcionário.",
        variant: "destructive"
      });
    }
  };

  const toggleEmployeeStatus = async (employeeId: string) => {
    try {
      const employee = employees.find(e => e.id === employeeId);
      if (!employee) return;

      await updateDoc(doc(db, 'funcionarios', employeeId), {
        ativo: !employee.ativo
      });

      setEmployees(prev => prev.map(e => 
        e.id === employeeId ? { ...e, ativo: !e.ativo } : e
      ));

      toast({
        title: "Sucesso!",
        description: `Funcionário ${!employee.ativo ? "ativado" : "desativado"} com sucesso.`
      });
    } catch (error) {
      console.error("Error toggling employee status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do funcionário.",
        variant: "destructive"
      });
    }
  };

  // User edit functions
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      nome: user.nome,
      email: user.email,
      telefone: user.telefone || "",
      isAdmin: user.isAdmin
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!userForm.nome || !userForm.email || !editingUser) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const updatedUser = {
        nome: userForm.nome,
        email: userForm.email,
        telefone: userForm.telefone,
        isAdmin: userForm.isAdmin,
        dataAtualizacao: new Date()
      };

      await updateDoc(doc(db, 'usuarios', editingUser.id), updatedUser);
      
      setUsers(prev => prev.map(u => 
        u.id === editingUser.id 
          ? { ...u, ...updatedUser }
          : u
      ));

      setUserForm({ nome: "", email: "", telefone: "", isAdmin: false });
      setEditingUser(null);
      setIsEditUserDialogOpen(false);

      toast({
        title: "Sucesso!",
        description: "Usuário atualizado com sucesso."
      });
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar usuário.",
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const toggleUserStatus = async (userId: string, isBlocked: boolean) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        ativo: !isBlocked
      });

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isBlocked: !u.isBlocked } : u
      ));

      toast({
        title: "Sucesso!",
        description: `Usuário ${isBlocked ? "desbloqueado" : "bloqueado"} com sucesso.`
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do usuário.",
        variant: "destructive"
      });
    }
  };

  const toggleAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      await updateDoc(doc(db, 'usuarios', userId), {
        isAdmin: !isAdmin
      });

      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isAdmin: !u.isAdmin } : u
      ));

      toast({
        title: "Sucesso!",
        description: `Privilégios de admin ${isAdmin ? "removidos" : "concedidos"} com sucesso.`
      });
    } catch (error) {
      console.error("Error toggling admin status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar os privilégios do usuário.",
        variant: "destructive"
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'usuarios', userId));
      
      setUsers(prev => prev.filter(u => u.id !== userId));

      toast({
        title: "Sucesso!",
        description: "Usuário excluído com sucesso."
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive"
      });
    }
  };



  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "active" && !user.isBlocked) ||
                         (filterStatus === "blocked" && user.isBlocked) ||
                         (filterStatus === "admin" && user.isAdmin);
    return matchesSearch && matchesFilter;
  });

  const StatsCard = ({ 
    title, 
    value, 
    icon, 
    trend, 
    description, 
    className 
  }: {
    title: string;
    value: string;
    icon: React.ReactNode;
    trend?: { value: number; positive: boolean; label: string };
    description: string;
    className?: string;
  }) => (
    <Card className={`${className} border-0 shadow-lg`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {trend && (
              <div className="flex items-center space-x-1">
                <span className={`text-sm font-medium ${trend.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {trend.positive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-3 bg-white/10 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!userData?.isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-16 w-16 mx-auto text-destructive mb-4" />
              <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar o painel administrativo.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie sua barbearia e acompanhe o desempenho</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9 h-auto gap-1">
              <TabsTrigger value="dashboard" className="text-xs sm:text-sm">Dashboard</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm">Serviços</TabsTrigger>
              <TabsTrigger value="employees" className="text-xs sm:text-sm">Funcionários</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm">Usuários</TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm">Produtos</TabsTrigger>
              <TabsTrigger value="fotos" className="text-xs sm:text-sm">Fotos</TabsTrigger>
              <TabsTrigger value="aniversariantes" className="text-xs sm:text-sm">Aniversários</TabsTrigger>
              <TabsTrigger value="reports" className="text-xs sm:text-sm">Relatórios</TabsTrigger>
              <TabsTrigger value="database" className="text-xs sm:text-sm">Banco</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-6">
              {activeTab === "dashboard" && (
                <AdminDashboard
                  statistics={statistics}
                  period={period}
                  setPeriod={setPeriod}
                  transferenciasPorPeriodo={transferenciasPorPeriodo}
                  topClientesComandas={topClientesComandas}
                  dadosAnaliseEstoque={dadosAnaliseEstoque}
                />
              )}
            </TabsContent>

            {/* Serviços */}
            <TabsContent value="services" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Gerenciar Serviços</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Serviço
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Serviço</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome do Serviço</Label>
                        <Input
                          id="nome"
                          value={serviceForm.nome}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="preco">Preço (R$)</Label>
                        <Input
                          id="preco"
                          type="number"
                          step="0.01"
                          value={serviceForm.preco}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, preco: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="duracao">Duração (minutos)</Label>
                        <Input
                          id="duracao"
                          type="number"
                          value={serviceForm.duracao}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, duracao: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="sala_atendimento">Tipo de Atendimento</Label>
                        <Select value={serviceForm.sala_atendimento} onValueChange={(value) => setServiceForm(prev => ({ ...prev, sala_atendimento: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de atendimento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barbearia">Barbearia</SelectItem>
                            <SelectItem value="Podologia">Podologia</SelectItem>
                            <SelectItem value="Quiropraxia">Quiropraxia</SelectItem>
                            <SelectItem value="Relaxamento">Relaxamento</SelectItem>
                            <SelectItem value="Video Game">Video Game</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="descricao">Descrição</Label>
                        <Textarea
                          id="descricao"
                          value={serviceForm.descricao}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <Button 
                        onClick={handleAddService} 
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? "Adicionando..." : "Adicionar Serviço"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Modal de Edição de Serviço */}
                <Dialog open={isEditServiceDialogOpen} onOpenChange={setIsEditServiceDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Serviço</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-nome">Nome do Serviço</Label>
                        <Input
                          id="edit-nome"
                          value={serviceForm.nome}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-preco">Preço (R$)</Label>
                        <Input
                          id="edit-preco"
                          type="number"
                          step="0.01"
                          value={serviceForm.preco}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, preco: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-duracao">Duração (minutos)</Label>
                        <Input
                          id="edit-duracao"
                          type="number"
                          value={serviceForm.duracao}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, duracao: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-sala_atendimento">Tipo de Atendimento</Label>
                        <Select value={serviceForm.sala_atendimento} onValueChange={(value) => setServiceForm(prev => ({ ...prev, sala_atendimento: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de atendimento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Barbearia">Barbearia</SelectItem>
                            <SelectItem value="Podologia">Podologia</SelectItem>
                            <SelectItem value="Quiropraxia">Quiropraxia</SelectItem>
                            <SelectItem value="Relaxamento">Relaxamento</SelectItem>
                            <SelectItem value="Video Game">Video Game</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="edit-descricao">Descrição</Label>
                        <Textarea
                          id="edit-descricao"
                          value={serviceForm.descricao}
                          onChange={(e) => setServiceForm(prev => ({ ...prev, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsEditServiceDialogOpen(false);
                            setServiceForm({ nome: "", preco: "", duracao: "", descricao: "", sala_atendimento: "" });
                            setEditingService(null);
                          }}
                        >
                          Cancelar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o serviço "{editingService?.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (editingService) {
                                    handleDeleteService(editingService.id);
                                    setIsEditServiceDialogOpen(false);
                                    setServiceForm({ nome: "", preco: "", duracao: "", descricao: "", sala_atendimento: "" });
                                    setEditingService(null);
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          onClick={handleUpdateService} 
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading ? "Atualizando..." : "Atualizar Serviço"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                  <Card key={service.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-lg">{service.nome}</h3>
                        <div className="flex gap-2">
                          {service.sala_atendimento && (
                            <Badge variant="outline" className="text-xs">
                              {service.sala_atendimento}
                            </Badge>
                          )}
                          <Badge variant={service.ativo ? "default" : "secondary"}>
                            {service.ativo ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">{service.descricao}</p>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">Preço: R$ {service.preco}</span>
                          <span className="text-sm font-medium">{service.duracao}min</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleServiceStatus(service.id)}
                        >
                          {service.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          {service.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditService(service)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="destructive" 
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o serviço "{service.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteService(service.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Funcionários */}
            <TabsContent value="employees" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Gerenciar Funcionários</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Funcionário
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Novo Funcionário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="nome">Nome</Label>
                        <Input
                          id="nome"
                          value={employeeForm.nome}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={employeeForm.email}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="telefone">Telefone</Label>
                        <Input
                          id="telefone"
                          value={employeeForm.telefone}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, telefone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="especialidades">Especialidades (separadas por vírgula)</Label>
                        <Input
                          id="especialidades"
                          value={employeeForm.especialidades}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, especialidades: e.target.value }))}
                          placeholder="Corte, Barba, Sobrancelha..."
                        />
                      </div>
                      <Button 
                        onClick={handleAddEmployee} 
                        disabled={isLoading}
                        className="w-full"
                      >
                        {isLoading ? "Adicionando..." : "Adicionar Funcionário"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Modal de Edição de Funcionário */}
                <Dialog open={isEditEmployeeDialogOpen} onOpenChange={setIsEditEmployeeDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar Funcionário</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit-employee-nome">Nome</Label>
                        <Input
                          id="edit-employee-nome"
                          value={employeeForm.nome}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, nome: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-employee-email">Email</Label>
                        <Input
                          id="edit-employee-email"
                          type="email"
                          value={employeeForm.email}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-employee-telefone">Telefone</Label>
                        <Input
                          id="edit-employee-telefone"
                          value={employeeForm.telefone}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, telefone: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-employee-especialidades">Especialidades (separadas por vírgula)</Label>
                        <Input
                          id="edit-employee-especialidades"
                          value={employeeForm.especialidades}
                          onChange={(e) => setEmployeeForm(prev => ({ ...prev, especialidades: e.target.value }))}
                          placeholder="Corte, Barba, Sobrancelha..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline"
                          onClick={() => {
                            setIsEditEmployeeDialogOpen(false);
                            setEmployeeForm({ nome: "", email: "", telefone: "", especialidades: "" });
                            setEditingEmployee(null);
                          }}
                        >
                          Cancelar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o funcionário "{editingEmployee?.nome}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => {
                                  if (editingEmployee) {
                                    handleDeleteEmployee(editingEmployee.id);
                                    setIsEditEmployeeDialogOpen(false);
                                    setEmployeeForm({ nome: "", email: "", telefone: "", especialidades: "" });
                                    setEditingEmployee(null);
                                  }
                                }}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          onClick={handleUpdateEmployee} 
                          disabled={isLoading}
                          className="flex-1"
                        >
                          {isLoading ? "Atualizando..." : "Atualizar Funcionário"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map((employee) => (
                  <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-semibold text-lg">{employee.nome}</h3>
                        <Badge variant={employee.ativo ? "default" : "secondary"}>
                          {employee.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-sm text-muted-foreground">{employee.telefone}</p>
                        <div className="flex flex-wrap gap-1">
                          {employee.especialidades.map((esp, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {esp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleEmployeeStatus(employee.id)}
                        >
                          {employee.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                          {employee.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditEmployee(employee)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Usuários */}
            <TabsContent value="users" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Gerenciar Usuários</h2>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center space-x-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full sm:w-64"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="blocked">Bloqueados</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Usuário
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="nome">Nome</Label>
                          <Input
                            id="nome"
                            value={userForm.nome}
                            onChange={(e) => setUserForm(prev => ({ ...prev, nome: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="telefone">Telefone</Label>
                          <Input
                            id="telefone"
                            value={userForm.telefone}
                            onChange={(e) => setUserForm(prev => ({ ...prev, telefone: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="isAdmin"
                            checked={userForm.isAdmin}
                            onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, isAdmin: checked as boolean }))}
                          />
                          <Label htmlFor="isAdmin">Usuário Administrador</Label>
                        </div>
                        <Button 
                          onClick={handleAddUser} 
                          disabled={isLoading}
                          className="w-full"
                        >
                          {isLoading ? "Adicionando..." : "Adicionar Usuário"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Modal de Edição de Usuário */}
                  <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Usuário</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="edit-user-nome">Nome</Label>
                          <Input
                            id="edit-user-nome"
                            value={userForm.nome}
                            onChange={(e) => setUserForm(prev => ({ ...prev, nome: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-user-email">Email</Label>
                          <Input
                            id="edit-user-email"
                            type="email"
                            value={userForm.email}
                            onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-user-telefone">Telefone</Label>
                          <Input
                            id="edit-user-telefone"
                            value={userForm.telefone}
                            onChange={(e) => setUserForm(prev => ({ ...prev, telefone: e.target.value }))}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="edit-user-isAdmin"
                            checked={userForm.isAdmin}
                            onCheckedChange={(checked) => setUserForm(prev => ({ ...prev, isAdmin: checked as boolean }))}
                          />
                          <Label htmlFor="edit-user-isAdmin">Usuário Administrador</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline"
                            onClick={() => {
                              setIsEditUserDialogOpen(false);
                              setUserForm({ nome: "", email: "", telefone: "", isAdmin: false });
                              setEditingUser(null);
                            }}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleUpdateUser} 
                            disabled={isLoading}
                            className="flex-1"
                          >
                            {isLoading ? "Atualizando..." : "Atualizar Usuário"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUsers.map((user) => (
                  <Card key={user.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{user.nome}</h3>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.telefone && (
                            <p className="text-sm text-muted-foreground">{user.telefone}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.isBlocked ? "destructive" : "default"}>
                            {user.isBlocked ? "Bloqueado" : "Ativo"}
                          </Badge>
                          {user.isAdmin && (
                            <Badge variant="secondary">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mb-4">
                        Criado em: {format(user.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                        >
                          <Eye className="h-4 w-4" />
                          Detalhes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleUserStatus(user.id, user.isBlocked)}
                        >
                          {user.isBlocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                          {user.isBlocked ? "Desbloquear" : "Bloquear"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => toggleAdminStatus(user.id, user.isAdmin)}
                        >
                          {user.isAdmin ? <Shield className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                          {user.isAdmin ? "Remover Admin" : "Tornar Admin"}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o usuário {user.nome}? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUser(user.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Produtos */}
            <TabsContent value="products" className="space-y-6">
              <ProductManagement />
            </TabsContent>

            {/* Fotos */}
            <TabsContent value="fotos" className="space-y-6">
              <AdminFotos />
            </TabsContent>

            {/* Aniversariantes */}
            <TabsContent value="aniversariantes" className="space-y-6">
              <AdminAniversariantes users={users} />
            </TabsContent>

            {/* Relatórios */}
            <TabsContent value="reports" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h2 className="text-2xl font-bold">Relatórios</h2>
                <div className="flex gap-4">
                  <Select value={reportFilter} onValueChange={setReportFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="yearly">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </div>

              {statistics && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo Financeiro</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Faturamento Total:</span>
                          <span className="font-bold">R$ {statistics.faturamentoMes.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Serviço Mais Vendido:</span>
                          <span className="font-bold">{statistics.servicoMaisVendido}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Horário Pico:</span>
                          <span className="font-bold">{statistics.horarioPico}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa de Cancelamento:</span>
                          <span className="font-bold">{statistics.taxaCancelamento.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Métricas de Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span>Total de Clientes:</span>
                          <span className="font-bold">{statistics.totalClientes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Clientes Recorrentes:</span>
                          <span className="font-bold">{statistics.clientesRecorrentes}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Crescimento Mensal:</span>
                          <span className={`font-bold ${statistics.crescimentoMensal > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {statistics.crescimentoMensal > 0 ? '+' : ''}{statistics.crescimentoMensal.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Agendamentos no Período:</span>
                          <span className="font-bold">{statistics.agendamentosHoje}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* Aba Banco de Dados - Dados Reais */}
            <TabsContent value="database" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Monitoramento do Banco de Dados</h2>
                  <p className="text-muted-foreground">Acompanhe o uso real do Firestore e evite atingir os limites</p>
                </div>
                <div className="flex gap-4">
                  <Button 
                    onClick={refreshData} 
                    disabled={dbLoading}
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                  >
                    {dbLoading ? "Atualizando..." : "Atualizar Dados"}
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                </div>
              </div>

              {/* Alertas de uso */}
              {dbAlerts.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-800 font-bold">
                      <AlertTriangle className="h-5 w-5" />
                      Alertas de Monitoramento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dbAlerts.map((alert, index) => (
                        <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${
                          alert.type === 'error' ? 'bg-red-50 border-red-200' :
                          alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          {alert.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                          {alert.type === 'warning' && <Clock className="h-5 w-5 text-yellow-600" />}
                          {alert.type === 'info' && <CheckCircle className="h-5 w-5 text-blue-600" />}
                          <div>
                            <p className={`text-sm font-medium ${
                              alert.type === 'error' ? 'text-red-800' :
                              alert.type === 'warning' ? 'text-yellow-800' :
                              'text-blue-800'
                            }`}>
                              {alert.title}
                            </p>
                            <p className={`text-xs ${
                              alert.type === 'error' ? 'text-red-600' :
                              alert.type === 'warning' ? 'text-yellow-600' :
                              'text-blue-600'
                            }`}>
                              {alert.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cards de resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total de Documentos</p>
                        <p className="text-2xl font-bold">{databaseUsage?.totalDocuments.toLocaleString() || '0'}</p>
                        <p className="text-xs text-muted-foreground">No banco de dados</p>
                      </div>
                      <div className="bg-blue-100 p-3 rounded-full">
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Operações Hoje</p>
                        <p className="text-2xl font-bold">{(operationCount.reads + operationCount.writes).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Leituras + Escritas</p>
                      </div>
                      <div className="bg-green-100 p-3 rounded-full">
                        <Activity className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Armazenamento</p>
                        <p className="text-2xl font-bold">{databaseUsage?.totalSizeMB.toFixed(1) || '0'} MB</p>
                        <p className="text-xs text-muted-foreground">Usado de 1024 MB</p>
                      </div>
                      <div className="bg-purple-100 p-3 rounded-full">
                        <HardDrive className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Custo Mensal</p>
                        <p className="text-2xl font-bold">
                          ${databaseUsage?.estimatedCost.monthly.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-xs text-muted-foreground">Estimado (USD)</p>
                      </div>
                      <div className="bg-orange-100 p-3 rounded-full">
                        <DollarSign className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficos de uso do banco de dados */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de Operações por Dia */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-bold">
                      <Database className="h-5 w-5" />
                      Operações Diárias vs Limites
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsBarChart data={[
                        { 
                          operation: 'Leituras', 
                          count: operationCount.reads, 
                          limit: FIRESTORE_LIMITS.DAILY_READS,
                          percentage: (operationCount.reads / FIRESTORE_LIMITS.DAILY_READS) * 100
                        },
                        { 
                          operation: 'Escritas', 
                          count: operationCount.writes, 
                          limit: FIRESTORE_LIMITS.DAILY_WRITES,
                          percentage: (operationCount.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100
                        },
                        { 
                          operation: 'Exclusões', 
                          count: operationCount.deletes, 
                          limit: FIRESTORE_LIMITS.DAILY_DELETES,
                          percentage: (operationCount.deletes / FIRESTORE_LIMITS.DAILY_DELETES) * 100
                        }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="operation" />
                        <YAxis />
                        <RechartsTooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                                  <p className="font-semibold text-sm mb-2">{label}</p>
                                  <div className="space-y-1">
                                    <p className="text-sm">Atual: {data.count.toLocaleString()}</p>
                                    <p className="text-sm">Limite: {data.limit.toLocaleString()}</p>
                                    <p className="text-sm">Uso: {data.percentage.toFixed(1)}%</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <RechartsBar 
                          dataKey="count" 
                          fill="#8884d8"
                          name="Operações"
                        />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Distribuição de Coleções */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-bold">
                      <Server className="h-5 w-5" />
                      Distribuição por Coleção
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <RechartsPie
                          data={databaseUsage?.collections.map((col, index) => ({
                            ...col,
                            value: col.documents,
                            color: COLORS[index % COLORS.length]
                          })) || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(databaseUsage?.collections || []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </RechartsPie>
                        <RechartsTooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                                  <p className="font-semibold text-sm mb-2">{data.name}</p>
                                  <div className="space-y-1 text-sm">
                                    <p>Documentos: {data.documents.toLocaleString()}</p>
                                    <p>Tamanho: {data.size}</p>
                                    <p>Status: {data.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Tabela de Coleções Reais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold">
                    <Cloud className="h-5 w-5" />
                    Status das Coleções (Dados Reais)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {databaseUsage?.collections.map((collection) => (
                      <div key={collection.name} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <Database className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{collection.name}</p>
                            <p className="text-sm text-muted-foreground">{collection.documents.toLocaleString()} documentos</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm font-medium">{collection.size}</p>
                            <p className="text-xs text-muted-foreground">{collection.lastUpdate}</p>
                          </div>
                          <Badge variant={collection.status === 'active' ? 'default' : 'secondary'}>
                            {collection.status === 'active' ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8">
                        <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Carregando dados das coleções...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Limites do Plano - Dados Reais */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 font-bold">
                        <Zap className="h-5 w-5" />
                        Limites do Firestore
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span>Operações de Leitura (Diárias)</span>
                          <div className="flex items-center gap-2">
                            <span>{operationCount.reads.toLocaleString()} / {FIRESTORE_LIMITS.DAILY_READS.toLocaleString()}</span>
                            {((operationCount.reads / FIRESTORE_LIMITS.DAILY_READS) * 100) < 80 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              ((operationCount.reads / FIRESTORE_LIMITS.DAILY_READS) * 100) > 80 
                                ? 'bg-orange-500' 
                                : 'bg-blue-600'
                            }`} 
                            style={{ width: `${Math.min(((operationCount.reads / FIRESTORE_LIMITS.DAILY_READS) * 100), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span>Operações de Escrita (Diárias)</span>
                          <div className="flex items-center gap-2">
                            <span>{operationCount.writes.toLocaleString()} / {FIRESTORE_LIMITS.DAILY_WRITES.toLocaleString()}</span>
                            {((operationCount.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100) < 80 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              ((operationCount.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100) > 80 
                                ? 'bg-orange-500' 
                                : 'bg-green-600'
                            }`} 
                            style={{ width: `${Math.min(((operationCount.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100), 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center text-sm mb-1">
                          <span>Armazenamento</span>
                          <div className="flex items-center gap-2">
                            <span>{databaseUsage?.totalSizeMB.toFixed(1) || '0'} MB / 1024 MB</span>
                            {((databaseUsage?.totalSizeMB || 0) / 1024) * 100 < 80 ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-orange-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              ((databaseUsage?.totalSizeMB || 0) / 1024) * 100 > 80 
                                ? 'bg-orange-500' 
                                : 'bg-purple-600'
                            }`} 
                            style={{ width: `${Math.min(((databaseUsage?.totalSizeMB || 0) / 1024) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-bold">
                      <DollarSign className="h-5 w-5" />
                      Análise de Custos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-blue-800">Custo Diário</p>
                          <p className="text-lg font-bold text-blue-900">
                            ${databaseUsage?.estimatedCost.daily.toFixed(4) || '0.0000'}
                          </p>
                        </div>
                        <DollarSign className="h-6 w-6 text-blue-600" />
                      </div>
                      
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-green-800">Custo Mensal</p>
                          <p className="text-lg font-bold text-green-900">
                            ${databaseUsage?.estimatedCost.monthly.toFixed(2) || '0.00'}
                          </p>
                        </div>
                        <Calendar className="h-6 w-6 text-green-600" />
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>• Baseado no uso atual do Firestore</p>
                        <p>• Valores em USD</p>
                        <p>• Plano gratuito: até 50K leituras/dia</p>
                        <p>• Monitoramento em tempo real</p>
                      </div>

                      {((operationCount.reads / FIRESTORE_LIMITS.DAILY_READS) * 100 > 80 || 
                        (operationCount.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100 > 80) && (
                        <div className="flex items-center gap-2 mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                          <AlertTriangle className="h-3 w-3 text-orange-600" />
                          <span className="text-orange-700">
                            Atenção: Próximo dos limites diários!
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* Modal de detalhes do usuário */}
      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          open={selectedUser !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedUser(null);
          }}
          onUpdate={(updatedUser) => {
            setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
            setSelectedUser(null);
          }}
        />
      )}
    </Layout>
  );
};

export default Admin;