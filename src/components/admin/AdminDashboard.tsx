import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Users, 
  Calendar,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  ShoppingCart,
  UserCheck,
  CreditCard,
  FileText,
  Clock,
  CalendarIcon,
  Heart,
  Scissors,
  User,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoritosChart } from "@/components/FavoritosChart";
import { cn } from "@/lib/utils";
import { Top5Produtos } from "./Top5Produtos";
import { AnaliseComandas } from "./AnaliseComandas";
import { HorariosMaisProcurados } from "./HorariosMaisProcurados";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart as RechartsBarChart,
  Bar
} from 'recharts';

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

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean; label: string };
  description: string;
  className?: string;
}

const StatsCard = ({ title, value, icon, trend, description, className }: StatsCardProps) => (
  <Card className={className}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && (
            <p className="text-white/70 text-xs mt-1">
              {trend.positive ? "↗" : "↘"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>
          )}
          <p className="text-white/60 text-xs">{description}</p>
        </div>
        <div className="opacity-80">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

interface AdminDashboardProps {
  statistics: Statistics | null;
  period: "hoje" | "semana" | "mes" | "ano";
  setPeriod: (period: "hoje" | "semana" | "mes" | "ano") => void;
  startDate: Date;
  endDate: Date;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const METRIC_DESCRIPTIONS: Record<string, string> = {
  'Conclusão': 'Agendamentos concluídos com sucesso (excluindo cancelamentos)',
  'Satisfação': 'Baseada na taxa de sucesso dos agendamentos',
  'Eficiência': 'Comandas finalizadas / total de comandas',
  'Crescimento': 'Produtos vendidos + agendamentos concluídos',
  'Engajamento': 'Usuários ativos no período / total de usuários'
};

export const AdminDashboard = ({
  statistics,
  period,
  setPeriod,
  startDate,
  endDate,
  setStartDate,
  setEndDate
}: AdminDashboardProps) => {
  const [faturamentoDiario, setFaturamentoDiario] = useState<Array<{ name: string; transferencias: number }>>([]);
  const [vendasPorCategoria, setVendasPorCategoria] = useState<Array<{ name: string; value: number }>>([]);
  const [statusPagamentos, setStatusPagamentos] = useState<Array<{ name: string; value: number }>>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<Array<{ subject: string; A: number; fullMark: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [atendimentosConcluidos, setAtendimentosConcluidos] = useState<Array<{ id: string; servico_nome: string; funcionario_nome: string; data_atendimento: Date }>>([]);
  const [servicosFavoritos, setServicosFavoritos] = useState<Array<{ nome: string; quantidade: number }>>([]);
  const [profissionaisFavoritos, setProfissionaisFavoritos] = useState<Array<{ nome: string; quantidade: number }>>([]);
  const [crescimentoClientes, setCrescimentoClientes] = useState<Array<{ name: string; novos: number }>>([]);
  const [agendamentosPorDiaSemana, setAgendamentosPorDiaSemana] = useState<Array<{ dia: string; quantidade: number }>>([]);

  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate, period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Usar as datas do período personalizado
      const periodStartDate = startOfDay(startDate);
      const periodEndDate = endOfDay(endDate);

      // Carregar todos os atendimentos concluídos para calcular favoritos
      const atendimentosQuery = query(collection(db, 'agendamentos_finalizados'));
      const atendimentosSnapshot = await getDocs(atendimentosQuery);
      const atendimentos: Array<{ id: string; servico_nome: string; funcionario_nome: string; data_atendimento: Date }> = [];
      
      atendimentosSnapshot.forEach(doc => {
        const data = doc.data();
        atendimentos.push({
          id: doc.id,
          servico_nome: data.servico_nome || data.servico || 'Serviço não informado',
          funcionario_nome: data.funcionario_nome || data.barbeiro || 'Profissional não informado',
          data_atendimento: data.data_atendimento?.toDate() || data.data_conclusao?.toDate() || new Date()
        });
      });
      
      setAtendimentosConcluidos(atendimentos);

      // Calcular serviços favoritos (top 3)
      const servicosCount: { [key: string]: number } = {};
      atendimentos.forEach(atendimento => {
        const servicoNome = atendimento.servico_nome;
        servicosCount[servicoNome] = (servicosCount[servicoNome] || 0) + 1;
      });
      
      const servicosFavoritosArray = Object.entries(servicosCount)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      
      setServicosFavoritos(servicosFavoritosArray);

      // Calcular profissionais favoritos (top 3)
      const profissionaisCount: { [key: string]: number } = {};
      atendimentos.forEach(atendimento => {
        const profissionalNome = atendimento.funcionario_nome;
        profissionaisCount[profissionalNome] = (profissionaisCount[profissionalNome] || 0) + 1;
      });
      
      const profissionaisFavoritosArray = Object.entries(profissionaisCount)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      
      setProfissionaisFavoritos(profissionaisFavoritosArray);

      // Calcular crescimento de clientes ao longo do período
      try {
        const clientesQuery = query(
          collection(db, 'usuarios'),
          where('data_registro', '>=', periodStartDate),
          where('data_registro', '<=', periodEndDate)
        );
        const clientesSnapshot = await getDocs(clientesQuery);
        
        console.log('Total de clientes no período:', clientesSnapshot.size);
        
        // Agrupar por data
        const clientesPorData: { [key: string]: number } = {};
        clientesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.data_registro) {
            const dataFormatada = format(data.data_registro.toDate(), 'dd/MM');
            clientesPorData[dataFormatada] = (clientesPorData[dataFormatada] || 0) + 1;
          }
        });
        
        const crescimentoArray = Object.entries(clientesPorData)
          .map(([name, novos]) => ({ name, novos }))
          .sort((a, b) => {
            const [diaA, mesA] = a.name.split('/').map(Number);
            const [diaB, mesB] = b.name.split('/').map(Number);
            return mesA !== mesB ? mesA - mesB : diaA - diaB;
          });
        
        console.log('Crescimento de clientes array:', crescimentoArray);
        setCrescimentoClientes(crescimentoArray);
      } catch (error) {
        console.error('Erro ao carregar crescimento de clientes:', error);
        setCrescimentoClientes([]);
      }

      // Calcular agendamentos por dia da semana
      const agendamentosQuery = query(collection(db, 'agendamentos_finalizados'));
      const agendamentosSnapshot = await getDocs(agendamentosQuery);
      
      const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const agendamentosPorDia: { [key: string]: number } = {
        'Domingo': 0,
        'Segunda': 0,
        'Terça': 0,
        'Quarta': 0,
        'Quinta': 0,
        'Sexta': 0,
        'Sábado': 0
      };
      
      agendamentosSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.data_atendimento || data.data_conclusao) {
          const dataAtendimento = data.data_atendimento?.toDate() || data.data_conclusao?.toDate();
          const diaSemana = diasSemana[dataAtendimento.getDay()];
          agendamentosPorDia[diaSemana]++;
        }
      });
      
      const agendamentosPorDiaArray = diasSemana.map(dia => ({
        dia,
        quantidade: agendamentosPorDia[dia]
      }));
      
      setAgendamentosPorDiaSemana(agendamentosPorDiaArray);

      // Calcular faturamento baseado no período
      let faturamentoPorDia;
      
      if (period === 'ano') {
        // Para o ano, agrupar por mês
        const mesesArray = Array.from({ length: 12 }, (_, i) => i);
        faturamentoPorDia = await Promise.all(
          mesesArray.map(async (monthIndex) => {
            const start = new Date(periodStartDate.getFullYear(), monthIndex, 1);
            const end = new Date(periodStartDate.getFullYear(), monthIndex + 1, 0, 23, 59, 59);
            
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
              name: format(start, 'MMM', { locale: ptBR }),
              transferencias: total
            };
          })
        );
      } else {
        // Para outros períodos, mostrar dias
        const diffTime = Math.abs(periodEndDate.getTime() - periodStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysToShow = Math.min(diffDays, 30); // Máximo de 30 dias no gráfico
        
        const daysArray = Array.from({ length: daysToShow }, (_, i) => 
          subDays(periodEndDate, daysToShow - 1 - i)
        );
        faturamentoPorDia = await Promise.all(
          daysArray.map(async (day) => {
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
              name: format(day, daysToShow > 7 ? 'dd/MM' : 'dd/MM'),
              transferencias: total
            };
          })
        );
      }
      setFaturamentoDiario(faturamentoPorDia);

      // Carregar vendas por categoria de produtos no período
      const vendasQuery = query(
        collection(db, 'compras_finalizadas'),
        where('data_compra', '>=', periodStartDate),
        where('data_compra', '<=', periodEndDate)
      );
      const vendasSnapshot = await getDocs(vendasQuery);
      const categoriaCounts: Record<string, number> = {};
      
      vendasSnapshot.forEach(doc => {
        const venda = doc.data();
        if (venda.produtos && Array.isArray(venda.produtos)) {
          venda.produtos.forEach((produto: any) => {
            const categoria = produto.categoria || 'Outros';
            const quantidade = produto.quantidade || 1;
            categoriaCounts[categoria] = (categoriaCounts[categoria] || 0) + quantidade;
          });
        }
      });
      
      const categoriasArray = Object.entries(categoriaCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      
      setVendasPorCategoria(categoriasArray.length > 0 ? categoriasArray : [
        { name: 'Pomadas', value: 0 },
        { name: 'Shampoos', value: 0 },
        { name: 'Óleos', value: 0 }
      ]);

      // Carregar status de pagamentos no período
      const filaQuery = query(
        collection(db, 'fila'),
        where('data', '>=', periodStartDate),
        where('data', '<=', periodEndDate)
      );
      const filaSnapshot = await getDocs(filaQuery);
      
      const comandasQuery = query(
        collection(db, 'comandas'),
        where('data_criacao', '>=', periodStartDate),
        where('data_criacao', '<=', periodEndDate)
      );
      const comandasSnapshot = await getDocs(comandasQuery);
      
      const comandasFinalizadasQuery = query(
        collection(db, 'comandas_finalizadas'),
        where('data_finalizacao', '>=', periodStartDate),
        where('data_finalizacao', '<=', periodEndDate)
      );
      const comandasFinalizadasSnapshot = await getDocs(comandasFinalizadasQuery);
      
      const agendamentosFinalizadosQuery = query(
        collection(db, 'agendamentos_finalizados'),
        where('data_conclusao', '>=', periodStartDate),
        where('data_conclusao', '<=', periodEndDate)
      );
      const agendamentosFinalizadosSnapshot = await getDocs(agendamentosFinalizadosQuery);
      
      let totalPago = 0;
      let totalPendente = 0;
      let totalCancelado = 0;
      
      agendamentosFinalizadosSnapshot.forEach(doc => {
        const valor = doc.data().preco || 0;
        if (doc.data().status === 'cancelado') {
          totalCancelado += valor;
        } else {
          totalPago += valor;
        }
      });
      
      comandasFinalizadasSnapshot.forEach(doc => {
        totalPago += doc.data().total || 0;
      });
      
      comandasSnapshot.forEach(doc => {
        totalPendente += doc.data().total || 0;
      });
      
      setStatusPagamentos([
        { name: 'Pagos', value: totalPago },
        { name: 'Pendentes', value: totalPendente },
        { name: 'Cancelados', value: totalCancelado }
      ]);

      // Calcular métricas de performance baseadas no período
      const totalAgendamentos = filaSnapshot.size + agendamentosFinalizadosSnapshot.size;
      const agendamentosConcluidos = agendamentosFinalizadosSnapshot.size;
      const agendamentosCancelados = Array.from(agendamentosFinalizadosSnapshot.docs).filter(
        doc => doc.data().status === 'cancelado'
      ).length;
      
      // Total de usuários que tiveram atividade no período
      const usuariosAtivosSet = new Set();
      filaSnapshot.forEach(doc => {
        if (doc.data().usuario_id) usuariosAtivosSet.add(doc.data().usuario_id);
      });
      agendamentosFinalizadosSnapshot.forEach(doc => {
        if (doc.data().usuario_id) usuariosAtivosSet.add(doc.data().usuario_id);
      });
      const totalUsuariosAtivos = usuariosAtivosSet.size;
      
      const totalComandas = comandasSnapshot.size + comandasFinalizadasSnapshot.size;
      const comandasFinalizadas = comandasFinalizadasSnapshot.size;
      const totalProdutosVendidos = vendasSnapshot.size;
      
      // Taxa de Conclusão: % de agendamentos concluídos com sucesso
      const taxaConclusao = totalAgendamentos > 0 
        ? ((agendamentosConcluidos - agendamentosCancelados) / totalAgendamentos) * 100 
        : 0;
      
      // Satisfação do Cliente: baseada em conclusões bem-sucedidas e baixo cancelamento
      const taxaSucesso = totalAgendamentos > 0 
        ? ((agendamentosConcluidos - agendamentosCancelados) / totalAgendamentos) * 100 
        : 0;
      const satisifacaoCliente = Math.min(100, taxaSucesso * 0.85 + 15);
      
      // Eficiência Operacional: % de comandas finalizadas
      const eficienciaOperacional = totalComandas > 0 
        ? (comandasFinalizadas / totalComandas) * 100 
        : 0;
      
      // Crescimento: baseado em produtos vendidos e agendamentos
      const fatorCrescimento = (totalProdutosVendidos * 2) + (agendamentosConcluidos * 1.5);
      const crescimentoVendas = Math.min(100, (fatorCrescimento / Math.max(1, totalAgendamentos)) * 10);
      
      // Engajamento: usuários ativos no período
      const totalUsuarios = (await getDocs(collection(db, 'usuarios'))).size;
      const engajamento = totalUsuarios > 0 
        ? Math.min(100, (totalUsuariosAtivos / totalUsuarios) * 100) 
        : 0;
      
      setPerformanceMetrics([
        { subject: 'Conclusão', A: Math.round(taxaConclusao), fullMark: 100 },
        { subject: 'Satisfação', A: Math.round(satisifacaoCliente), fullMark: 100 },
        { subject: 'Eficiência', A: Math.round(eficienciaOperacional), fullMark: 100 },
        { subject: 'Crescimento', A: Math.round(crescimentoVendas), fullMark: 100 },
        { subject: 'Engajamento', A: Math.round(engajamento), fullMark: 100 }
      ]);
      
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={period} onValueChange={(value: "hoje" | "semana" | "mes" | "ano") => setPeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">ou</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
              <CalendarComponent
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[140px] justify-start text-left font-normal",
                  !endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
              <CalendarComponent
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setEndDate(date)}
                initialFocus
                disabled={(date) => date < startDate}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Cards de estatísticas com degradês */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total de Clientes"
            value={statistics.totalClientes.toString()}
            icon={<Users className="h-8 w-8 text-white" />}
            trend={{ value: statistics.crescimentoMensal, positive: statistics.crescimentoMensal > 0, label: "este mês" }}
            description="Clientes cadastrados"
            className="bg-gradient-to-br from-blue-500/10 to-blue-700/10 text-white"
          />
          <StatsCard
            title="Agendamentos na Fila"
            value={statistics.agendamentosHoje.toString()}
            icon={<Calendar className="h-8 w-8 text-white" />}
            description="No período selecionado"
            className="bg-gradient-to-br from-green-500/10 to-green-700/10 text-white"
          />
          <StatsCard
            title="Faturamento"
            value={`R$ ${statistics.faturamentoMes.toLocaleString()}`}
            icon={<DollarSign className="h-8 w-8 text-white" />}
            description="No período selecionado"
            className="bg-gradient-to-br from-purple-500/10 to-purple-700/10 text-white"
          />
          <StatsCard
            title="Cancelamentos"
            value={statistics.totalCancelamentos.toString()}
            icon={<AlertTriangle className="h-8 w-8 text-white" />}
            trend={{ value: -statistics.taxaCancelamento, positive: false, label: "taxa atual" }}
            description="No período selecionado"
            className="bg-gradient-to-br from-orange-500/10 to-orange-700/10 text-white"
          />
        </div>
      )}

      {/* Gráficos com lazy loading */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Faturamento Diário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <BarChart3 className="h-5 w-5" />
              Faturamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && faturamentoDiario.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={faturamentoDiario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm mb-2">{label}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded bg-[#8884d8]" />
                              <span>Faturamento: R$ {payload[0].value.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="transferencias" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </RechartsAreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Análise de Comandas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <PieChart className="h-5 w-5" />
              Análise de Comandas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnaliseComandas />
          </CardContent>
        </Card>

        {/* Performance Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <Activity className="h-5 w-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && performanceMetrics.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceMetrics}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis dataKey="subject" style={{ fontSize: '10px' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: '10px' }} />
                  <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const metricName = payload[0].payload.subject;
                        const description = METRIC_DESCRIPTIONS[metricName] || '';
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50 max-w-xs">
                            <p className="font-semibold text-sm mb-1">{metricName}</p>
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <div className="w-3 h-3 rounded bg-[#8884d8]" />
                              <span className="font-medium text-primary">Performance: {payload[0].value}%</span>
                            </div>
                            {description && (
                              <p className="text-xs text-muted-foreground italic">{description}</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuição de Vendas por Produto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <ShoppingCart className="h-5 w-5" />
              Vendas por Produto
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && vendasPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie
                    data={vendasPorCategoria}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(props) => {
                      const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="currentColor" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          style={{ fontSize: '10px' }}
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {vendasPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </RechartsPie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-primary font-medium">Vendas: {data.value.toFixed(0)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Produtos Mais Vendidos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <ShoppingCart className="h-5 w-5" />
              Top 5 Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Top5Produtos />
          </CardContent>
        </Card>

        {/* Status dos Pagamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <CreditCard className="h-5 w-5" />
              Status dos Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && statusPagamentos.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie
                    data={statusPagamentos}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(props) => {
                      const { cx, cy, midAngle, innerRadius, outerRadius, name, percent } = props;
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 25;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="currentColor" 
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          style={{ fontSize: '10px' }}
                        >
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[1,2,3].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444'][index]} />
                    ))}
                  </RechartsPie>
                  <RechartsTooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-primary font-medium">Valor: R$ {data.value.toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Horários Mais Procurados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <Clock className="h-5 w-5" />
              Horários Mais Procurados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorariosMaisProcurados />
          </CardContent>
        </Card>

        {/* Crescimento de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <TrendingUp className="h-5 w-5" />
              Crescimento de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            ) : crescimentoClientes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={crescimentoClientes}>
                  <defs>
                    <linearGradient id="colorNovos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{payload[0].payload.name}</p>
                            <p className="text-primary font-medium">Novos clientes: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="novos" 
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorNovos)" 
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center border border-dashed rounded-lg p-6">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum cliente novo cadastrado no período selecionado
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tente selecionar um período diferente
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agendamentos por Dia da Semana */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold">
              <Calendar className="h-5 w-5" />
              Agendamentos por Dia da Semana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && agendamentosPorDiaSemana.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={agendamentosPorDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="dia" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{payload[0].payload.dia}</p>
                            <p className="text-primary font-medium">Agendamentos: {payload[0].value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="quantidade" 
                    fill="hsl(var(--chart-2))"
                    radius={[8, 8, 0, 0]}
                  />
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Favoritos & Avaliações - Seção completa */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Favoritos & Avaliações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção: Serviços Favoritos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Scissors className="h-5 w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold">Serviços Favoritos</h3>
            </div>
            {servicosFavoritos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {servicosFavoritos.map((servico, index) => (
                  <Card key={index} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-sm">{servico.nome}</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {servico.quantidade}x
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {index === 0 ? '🥇 Mais usado' : index === 1 ? '🥈 Segundo lugar' : '🥉 Terceiro lugar'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ainda não há serviços favoritos registrados
                </p>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="border-t"></div>

          {/* Seção: Profissionais Favoritos */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold">Profissionais Favoritos</h3>
            </div>
            {profissionaisFavoritos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {profissionaisFavoritos.map((profissional, index) => (
                  <Card key={index} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-sm">{profissional.nome}</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {profissional.quantidade} atendimento{profissional.quantidade > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {index === 0 ? '⭐ Favorito' : index === 1 ? '✨ Top 2' : '💫 Top 3'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg border-dashed">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ainda não há profissionais favoritos registrados
                </p>
              </div>
            )}
          </div>

          {/* Separador */}
          <div className="border-t"></div>

          {/* Seção: Gráfico de Serviços e Profissionais Favoritos */}
          <div>
            <FavoritosChart 
              atendimentos={atendimentosConcluidos} 
              servicosFavoritos={servicosFavoritos} 
              profissionaisFavoritos={profissionaisFavoritos} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};