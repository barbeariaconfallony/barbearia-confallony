import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, Calendar, DollarSign, AlertTriangle, BarChart3, PieChart, Activity, ShoppingCart, UserCheck, CreditCard, FileText, Clock, CalendarIcon, Heart, Scissors, User, TrendingUp, CheckCircle, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FavoritosChart } from "@/components/FavoritosChart";
import { cn } from "@/lib/utils";
import { Top5Produtos } from "./Top5Produtos";
import { AnaliseComandas } from "./AnaliseComandas";
import { HorariosMaisProcurados } from "./HorariosMaisProcurados";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, AreaChart as RechartsAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart as RechartsPieChart, Pie as RechartsPie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart as RechartsBarChart, Bar } from 'recharts';
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
interface Statistics {
  totalClientes: number;
  agendamentosHoje: number;
  faturamentoMes: number;
  servicoMaisVendido: string;
  horarioPico: string;
  faturamentoDiario: Array<{
    date: string;
    value: number;
  }>;
  servicosPopulares: Array<{
    servico: string;
    count: number;
  }>;
  crescimentoMensal: number;
  clientesRecorrentes: number;
  taxaCancelamento: number;
  clientesPorRegiao: Array<{
    regiao: string;
    count: number;
  }>;
  totalCancelamentos: number;
  totalAgendamentosRealizados: number;
  topClientesRecorrentes: Array<{
    nome: string;
    email: string;
    quantidade: number;
  }>;
  crescimentoPorPeriodo: number;
}
interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    positive: boolean;
    label: string;
  };
  description: string;
  className?: string;
}
const StatsCard = ({
  title,
  value,
  icon,
  trend,
  description,
  className
}: StatsCardProps) => <Card className={className}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-card-foreground/80 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-card-foreground">{value}</p>
          {trend && <p className="text-muted-foreground text-xs mt-1">
              {trend.positive ? "↗" : "↘"} {Math.abs(trend.value).toFixed(1)}% {trend.label}
            </p>}
          <p className="text-muted-foreground text-xs">{description}</p>
        </div>
        <div className="text-card-foreground/70">{icon}</div>
      </div>
    </CardContent>
  </Card>;
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
  const [faturamentoDiario, setFaturamentoDiario] = useState<Array<{
    name: string;
    transferencias: number;
  }>>([]);
  const [vendasPorCategoria, setVendasPorCategoria] = useState<Array<{
    name: string;
    value: number;
  }>>([]);
  const [statusPagamentos, setStatusPagamentos] = useState<Array<{
    name: string;
    value: number;
  }>>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<Array<{
    subject: string;
    A: number;
    fullMark: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [atendimentosConcluidos, setAtendimentosConcluidos] = useState<Array<{
    id: string;
    servico_nome: string;
    funcionario_nome: string;
    data_atendimento: Date;
  }>>([]);
  const [servicosFavoritos, setServicosFavoritos] = useState<Array<{
    nome: string;
    quantidade: number;
  }>>([]);
  const [profissionaisFavoritos, setProfissionaisFavoritos] = useState<Array<{
    nome: string;
    quantidade: number;
  }>>([]);
  const [crescimentoClientes, setCrescimentoClientes] = useState<Array<{
    name: string;
    novos: number;
  }>>([]);
  const [agendamentosPorDiaSemana, setAgendamentosPorDiaSemana] = useState<Array<{
    dia: string;
    quantidade: number;
  }>>([]);
  const [topClientesLimit, setTopClientesLimit] = useState<number>(10);
  const [customTopClientesLimit, setCustomTopClientesLimit] = useState<string>('');
  
  useEffect(() => {
    loadDashboardData();
  }, [startDate, endDate, period]);
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Usar as datas do período personalizado
      const periodStartDate = startOfDay(startDate);
      const periodEndDate = endOfDay(endDate);

      // ===== FASE 1: CARREGAR TODAS AS QUERIES EM PARALELO =====
      const [
        atendimentosSnapshot,
        clientesSnapshot,
        vendasSnapshot,
        filaSnapshot,
        comandasSnapshot,
        comandasFinalizadasSnapshot,
        agendamentosCanceladosSnapshot,
        todosUsuariosSnapshot
      ] = await Promise.all([
        // Query de atendimentos finalizados (será usado em múltiplos cálculos)
        getDocs(query(
          collection(db, 'agendamentos_finalizados'),
          where('data_conclusao', '>=', Timestamp.fromDate(periodStartDate)),
          where('data_conclusao', '<=', Timestamp.fromDate(periodEndDate))
        )),
        // Query de novos clientes
        getDocs(query(
          collection(db, 'usuarios'),
          where('data_registro', '>=', periodStartDate),
          where('data_registro', '<=', periodEndDate)
        )),
        // Query de vendas
        getDocs(query(
          collection(db, 'compras_finalizadas'),
          where('data_compra', '>=', periodStartDate),
          where('data_compra', '<=', periodEndDate)
        )),
        // Query de fila
        getDocs(query(
          collection(db, 'fila'),
          where('data', '>=', periodStartDate),
          where('data', '<=', periodEndDate)
        )),
        // Query de comandas abertas
        getDocs(query(
          collection(db, 'comandas'),
          where('data_criacao', '>=', periodStartDate),
          where('data_criacao', '<=', periodEndDate)
        )),
        // Query de comandas finalizadas
        getDocs(query(
          collection(db, 'comandas_finalizadas'),
          where('data_finalizacao', '>=', periodStartDate),
          where('data_finalizacao', '<=', periodEndDate)
        )),
        // Query de cancelamentos
        getDocs(query(
          collection(db, 'agendamentos_cancelados'),
          where('data', '>=', periodStartDate),
          where('data', '<=', periodEndDate)
        )),
        // Query de todos os usuários (para cálculo de engajamento)
        getDocs(collection(db, 'usuarios'))
      ]);

      // ===== FASE 2: PROCESSAR ATENDIMENTOS CONCLUÍDOS =====
      const atendimentos: Array<{
        id: string;
        servico_nome: string;
        funcionario_nome: string;
        data_atendimento: Date;
        preco: number;
        data_conclusao: Date;
      }> = [];
      
      atendimentosSnapshot.forEach(doc => {
        const data = doc.data();
        atendimentos.push({
          id: doc.id,
          servico_nome: data.servico_nome || data.servico || 'Serviço não informado',
          funcionario_nome: data.funcionario_nome || data.barbeiro || 'Profissional não informado',
          data_atendimento: data.data_atendimento?.toDate() || data.data_conclusao?.toDate() || new Date(),
          preco: data.preco || 0,
          data_conclusao: data.data_conclusao?.toDate() || new Date()
        });
      });
      setAtendimentosConcluidos(atendimentos);

      // ===== FASE 3: CALCULAR SERVIÇOS FAVORITOS =====
      const servicosCount: Record<string, number> = {};
      atendimentos.forEach(atendimento => {
        const servicoNome = atendimento.servico_nome;
        servicosCount[servicoNome] = (servicosCount[servicoNome] || 0) + 1;
      });
      const servicosFavoritosArray = Object.entries(servicosCount)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      setServicosFavoritos(servicosFavoritosArray);

      // ===== FASE 4: CALCULAR PROFISSIONAIS FAVORITOS =====
      const profissionaisCount: Record<string, number> = {};
      atendimentos.forEach(atendimento => {
        const profissionalNome = atendimento.funcionario_nome;
        profissionaisCount[profissionalNome] = (profissionaisCount[profissionalNome] || 0) + 1;
      });
      const profissionaisFavoritosArray = Object.entries(profissionaisCount)
        .map(([nome, quantidade]) => ({ nome, quantidade }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 3);
      setProfissionaisFavoritos(profissionaisFavoritosArray);

      // ===== FASE 5: CALCULAR CRESCIMENTO DE CLIENTES =====
      try {
        const clientesPorData: Record<string, number> = {};
        const formatoData = period === 'ano' ? 'MMM/yyyy' : 'dd/MM';
        
        clientesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.data_registro) {
            const dataFormatada = format(data.data_registro.toDate(), formatoData, { locale: ptBR });
            clientesPorData[dataFormatada] = (clientesPorData[dataFormatada] || 0) + 1;
          }
        });
        
        const crescimentoArray = Object.entries(clientesPorData)
          .map(([name, novos]) => ({ name, novos }))
          .sort((a, b) => {
            if (period === 'ano') {
              const [mesA, anoA] = a.name.split('/');
              const [mesB, anoB] = b.name.split('/');
              const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
              const indexA = meses.indexOf(mesA.toLowerCase());
              const indexB = meses.indexOf(mesB.toLowerCase());
              return anoA !== anoB ? parseInt(anoA) - parseInt(anoB) : indexA - indexB;
            } else {
              const [diaA, mesA] = a.name.split('/').map(Number);
              const [diaB, mesB] = b.name.split('/').map(Number);
              return mesA !== mesB ? mesA - mesB : diaA - diaB;
            }
          });
        
        setCrescimentoClientes(crescimentoArray);
      } catch (error) {
        console.error('Erro ao carregar crescimento de clientes:', error);
        setCrescimentoClientes([]);
      }

      // ===== FASE 6: CALCULAR AGENDAMENTOS POR DIA DA SEMANA (do período) =====
      const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const agendamentosPorDia: Record<string, number> = {
        'Domingo': 0, 'Segunda': 0, 'Terça': 0, 'Quarta': 0, 'Quinta': 0, 'Sexta': 0, 'Sábado': 0
      };
      
      atendimentos.forEach(atendimento => {
        const dataAtendimento = atendimento.data_atendimento;
        const diaSemana = diasSemana[dataAtendimento.getDay()];
        agendamentosPorDia[diaSemana]++;
      });
      
      const agendamentosPorDiaArray = diasSemana.map(dia => ({
        dia,
        quantidade: agendamentosPorDia[dia]
      }));
      setAgendamentosPorDiaSemana(agendamentosPorDiaArray);

      // ===== FASE 7: CALCULAR FATURAMENTO (usando dados já carregados) =====
      let faturamentoPorDia;
      if (period === 'ano') {
        // Agrupar por mês
        const faturamentoPorMes: Record<string, number> = {};
        atendimentos.forEach(atendimento => {
          const mes = format(atendimento.data_conclusao, 'MMM', { locale: ptBR });
          faturamentoPorMes[mes] = (faturamentoPorMes[mes] || 0) + atendimento.preco;
        });
        
        // Criar array com todos os meses do ano
        const mesesDoAno = Array.from({ length: 12 }, (_, i) => {
          const data = new Date(periodStartDate.getFullYear(), i, 1);
          return format(data, 'MMM', { locale: ptBR });
        });
        
        faturamentoPorDia = mesesDoAno.map(mes => ({
          name: mes,
          transferencias: faturamentoPorMes[mes] || 0
        }));
      } else {
        // Agrupar por dia
        const faturamentoPorDiaMap: Record<string, number> = {};
        atendimentos.forEach(atendimento => {
          const dia = format(atendimento.data_conclusao, 'dd/MM');
          faturamentoPorDiaMap[dia] = (faturamentoPorDiaMap[dia] || 0) + atendimento.preco;
        });
        
        // Criar array com os dias do período
        const diffTime = Math.abs(periodEndDate.getTime() - periodStartDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysToShow = Math.min(diffDays, 30);
        
        const daysArray = Array.from({ length: daysToShow }, (_, i) => subDays(periodEndDate, daysToShow - 1 - i));
        
        faturamentoPorDia = daysArray.map(day => ({
          name: format(day, 'dd/MM'),
          transferencias: faturamentoPorDiaMap[format(day, 'dd/MM')] || 0
        }));
      }
      setFaturamentoDiario(faturamentoPorDia);

      // ===== FASE 8: PROCESSAR VENDAS POR CATEGORIA =====
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

      // ===== FASE 9: CALCULAR STATUS DE PAGAMENTOS =====
      let totalPago = 0;
      let totalPendente = 0;
      let totalCancelado = 0;
      
      // Usar dados já carregados dos atendimentos
      atendimentos.forEach(atendimento => {
        totalPago += atendimento.preco;
      });
      
      agendamentosCanceladosSnapshot.forEach(doc => {
        const valor = doc.data().preco || 0;
        totalCancelado += valor;
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

      // ===== FASE 10: CALCULAR MÉTRICAS DE PERFORMANCE =====
      const totalAgendamentos = filaSnapshot.size + atendimentos.length + agendamentosCanceladosSnapshot.size;
      const agendamentosConcluidos = atendimentos.length;
      const agendamentosCancelados = agendamentosCanceladosSnapshot.size;

      // Total de usuários que tiveram atividade no período
      const usuariosAtivosSet = new Set<string>();
      filaSnapshot.forEach(doc => {
        const userId = doc.data().usuario_id;
        if (userId) usuariosAtivosSet.add(userId);
      });
      atendimentos.forEach(atendimento => {
        // Assumindo que atendimentos tem usuario_id, se não tiver, ignorar
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
      const satisfacaoCliente = Math.min(100, taxaSucesso * 0.85 + 15);

      // Eficiência Operacional: % de comandas finalizadas
      const eficienciaOperacional = totalComandas > 0 
        ? (comandasFinalizadas / totalComandas) * 100 
        : 0;

      // Crescimento: baseado em produtos vendidos e agendamentos
      const fatorCrescimento = totalProdutosVendidos * 2 + agendamentosConcluidos * 1.5;
      const crescimentoVendas = Math.min(100, fatorCrescimento / Math.max(1, totalAgendamentos) * 10);

      // Engajamento: usuários ativos no período
      const totalUsuarios = todosUsuariosSnapshot.size;
      const engajamento = totalUsuarios > 0 
        ? Math.min(100, (totalUsuariosAtivos / totalUsuarios) * 100) 
        : 0;
      
      setPerformanceMetrics([
        { subject: 'Conclusão', A: Math.round(taxaConclusao), fullMark: 100 },
        { subject: 'Satisfação', A: Math.round(satisfacaoCliente), fullMark: 100 },
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
  return <div className="space-y-6">
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
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "De"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
              <CalendarComponent mode="single" selected={startDate} onSelect={date => date && setStartDate(date)} initialFocus className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "Até"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
              <CalendarComponent mode="single" selected={endDate} onSelect={date => date && setEndDate(date)} initialFocus disabled={date => date < startDate} className="pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Cards de estatísticas com degradês */}
      {statistics && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Total de Clientes" value={statistics.totalClientes.toString()} icon={<Users className="h-8 w-8 text-card-foreground" />} trend={{
        value: statistics.crescimentoMensal,
        positive: statistics.crescimentoMensal > 0,
        label: "este mês"
      }} description="Clientes cadastrados" className="bg-gradient-to-br from-blue-500/10 to-blue-700/10" />
          <StatsCard title="Agendamentos na Fila" value={statistics.agendamentosHoje.toString()} icon={<Calendar className="h-8 w-8 text-card-foreground" />} description="No período selecionado" className="bg-gradient-to-br from-green-500/10 to-green-700/10" />
          <StatsCard title="Faturamento" value={`R$ ${statistics.faturamentoMes.toLocaleString()}`} icon={<DollarSign className="h-8 w-8 text-card-foreground" />} description="No período selecionado" className="bg-gradient-to-br from-purple-500/10 to-purple-700/10" />
          <StatsCard title="Agendamentos Realizados" value={statistics.totalAgendamentosRealizados.toString()} icon={<CheckCircle className="h-8 w-8 text-card-foreground" />} description="No período selecionado" className="bg-gradient-to-br from-teal-500/10 to-teal-700/10" />
          <StatsCard title="Cancelamentos" value={statistics.totalCancelamentos.toString()} icon={<AlertTriangle className="h-8 w-8 text-card-foreground" />} trend={{
        value: -statistics.taxaCancelamento,
        positive: false,
        label: "taxa atual"
      }} description="No período selecionado" className="bg-gradient-to-br from-orange-500/10 to-orange-700/10" />
          
          {/* Card Clientes Recorrentes com Tooltip */}
          <HoverCard>
            <HoverCardTrigger asChild>
              <div>
                <StatsCard 
                  title="Clientes Recorrentes" 
                  value={statistics.topClientesRecorrentes.length.toString()} 
                  icon={<Repeat className="h-8 w-8 text-card-foreground" />} 
                  description={`Clique para ver top ${topClientesLimit === -1 ? 'todos' : topClientesLimit}`} 
                  className="bg-gradient-to-br from-indigo-500/10 to-indigo-700/10 cursor-pointer hover:scale-105 transition-transform" 
                />
              </div>
            </HoverCardTrigger>
            <HoverCardContent className="w-96 z-50 bg-background" side="top">
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">
                    Top {topClientesLimit === -1 ? 'Todos os' : topClientesLimit} Clientes Recorrentes
                  </h4>
                </div>
                
                {/* Seletor de Top */}
                <div className="space-y-2 pb-3 border-b">
                  <label className="text-xs font-medium text-muted-foreground">
                    Mostrar Top:
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={topClientesLimit === 10 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopClientesLimit(10)}
                      className="text-xs h-7"
                    >
                      Top 10
                    </Button>
                    <Button
                      variant={topClientesLimit === 20 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopClientesLimit(20)}
                      className="text-xs h-7"
                    >
                      Top 20
                    </Button>
                    <Button
                      variant={topClientesLimit === 50 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopClientesLimit(50)}
                      className="text-xs h-7"
                    >
                      Top 50
                    </Button>
                    <Button
                      variant={topClientesLimit === -1 ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopClientesLimit(-1)}
                      className="text-xs h-7"
                    >
                      Todos
                    </Button>
                  </div>
                  
                  {/* Input personalizado */}
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      min="1"
                      max="200"
                      placeholder="Valor personalizado"
                      value={customTopClientesLimit}
                      onChange={(e) => setCustomTopClientesLimit(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && customTopClientesLimit) {
                          const value = parseInt(customTopClientesLimit);
                          if (value > 0 && value <= 200) {
                            setTopClientesLimit(value);
                          }
                        }
                      }}
                      className="flex h-7 w-full rounded-md border border-input bg-background px-3 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (customTopClientesLimit) {
                          const value = parseInt(customTopClientesLimit);
                          if (value > 0 && value <= 200) {
                            setTopClientesLimit(value);
                          }
                        }
                      }}
                      disabled={!customTopClientesLimit || parseInt(customTopClientesLimit) <= 0}
                      className="text-xs h-7 whitespace-nowrap"
                    >
                      Aplicar
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Digite um valor entre 1 e 200 ou pressione Enter
                  </p>
                </div>

                {/* Lista de clientes */}
                {statistics.topClientesRecorrentes.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {statistics.topClientesRecorrentes
                      .slice(0, topClientesLimit === -1 ? undefined : topClientesLimit)
                      .map((cliente, index) => (
                        <div 
                          key={cliente.email} 
                          className="flex items-center justify-between text-xs border-b pb-2 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="secondary" 
                              className="w-6 h-6 flex items-center justify-center p-0"
                            >
                              {index + 1}
                            </Badge>
                            <div>
                              <p className="font-medium">{cliente.nome}</p>
                              <p className="text-muted-foreground text-[10px]">{cliente.email}</p>
                            </div>
                          </div>
                          <Badge className="bg-primary/10 text-primary">
                            {cliente.quantidade} visitas
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum cliente recorrente no período
                  </p>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>

          {/* Card Crescimento por Período */}
          <StatsCard title="Crescimento no Período" value={`${statistics.crescimentoPorPeriodo >= 0 ? '+' : ''}${statistics.crescimentoPorPeriodo.toFixed(1)}%`} icon={<TrendingUp className="h-8 w-8 text-card-foreground" />} trend={{
        value: statistics.crescimentoPorPeriodo,
        positive: statistics.crescimentoPorPeriodo >= 0,
        label: "vs período anterior"
      }} description="Comparado ao período anterior" className="bg-gradient-to-br from-cyan-500/10 to-cyan-700/10" />
        </div>}

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
            {!loading && faturamentoDiario.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={faturamentoDiario}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip content={({
                active,
                payload,
                label
              }) => {
                if (active && payload && payload.length) {
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm mb-2">{label}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded bg-[#8884d8]" />
                              <span>Faturamento: R$ {payload[0].value.toLocaleString()}</span>
                            </div>
                          </div>;
                }
                return null;
              }} />
                  <Area type="monotone" dataKey="transferencias" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                </RechartsAreaChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>}
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
            {!loading && performanceMetrics.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={performanceMetrics}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis dataKey="subject" style={{
                fontSize: '10px'
              }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} style={{
                fontSize: '10px'
              }} />
                  <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <RechartsTooltip content={({
                active,
                payload,
                label
              }) => {
                if (active && payload && payload.length) {
                  const metricName = payload[0].payload.subject;
                  const description = METRIC_DESCRIPTIONS[metricName] || '';
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50 max-w-xs">
                            <p className="font-semibold text-sm mb-1">{metricName}</p>
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <div className="w-3 h-3 rounded bg-[#8884d8]" />
                              <span className="font-medium text-primary">Performance: {payload[0].value}%</span>
                            </div>
                            {description && <p className="text-xs text-muted-foreground italic">{description}</p>}
                          </div>;
                }
                return null;
              }} />
                </RadarChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>}
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
            {!loading && vendasPorCategoria.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie data={vendasPorCategoria} cx="50%" cy="50%" labelLine={true} label={props => {
                const {
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  name,
                  percent
                } = props;
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 25;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{
                  fontSize: '10px'
                }}>
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>;
              }} outerRadius={70} fill="#8884d8" dataKey="value">
                    {vendasPorCategoria.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </RechartsPie>
                  <RechartsTooltip content={({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-primary font-medium">Vendas: {data.value.toFixed(0)}</p>
                          </div>;
                }
                return null;
              }} />
                </RechartsPieChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>}
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
            {!loading && statusPagamentos.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie data={statusPagamentos} cx="50%" cy="50%" labelLine={true} label={props => {
                const {
                  cx,
                  cy,
                  midAngle,
                  innerRadius,
                  outerRadius,
                  name,
                  percent
                } = props;
                const RADIAN = Math.PI / 180;
                const radius = outerRadius + 25;
                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                return <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{
                  fontSize: '10px'
                }}>
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>;
              }} outerRadius={70} fill="#8884d8" dataKey="value">
                    {[1, 2, 3].map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#f59e0b', '#ef4444'][index]} />)}
                  </RechartsPie>
                  <RechartsTooltip content={({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{data.name}</p>
                            <p className="text-primary font-medium">Valor: R$ {data.value.toLocaleString()}</p>
                          </div>;
                }
                return null;
              }} />
                </RechartsPieChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>}
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
            {loading ? <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div> : crescimentoClientes.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={crescimentoClientes}>
                  <defs>
                    <linearGradient id="colorNovos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11
              }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11
              }} allowDecimals={false} />
                  <RechartsTooltip content={({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{payload[0].payload.name}</p>
                            <p className="text-primary font-medium">Novos clientes: {payload[0].value}</p>
                          </div>;
                }
                return null;
              }} />
                  <Area type="monotone" dataKey="novos" stroke="hsl(var(--chart-1))" strokeWidth={2} fillOpacity={1} fill="url(#colorNovos)" />
                </RechartsAreaChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center border border-dashed rounded-lg p-6">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum cliente novo cadastrado no período selecionado
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tente selecionar um período diferente
                  </p>
                </div>
              </div>}
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
            {!loading && agendamentosPorDiaSemana.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={agendamentosPorDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11
              }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" tick={{
                fill: 'hsl(var(--muted-foreground))',
                fontSize: 11
              }} allowDecimals={false} />
                  <RechartsTooltip content={({
                active,
                payload
              }) => {
                if (active && payload && payload.length) {
                  return <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm">{payload[0].payload.dia}</p>
                            <p className="text-primary font-medium">Agendamentos: {payload[0].value}</p>
                          </div>;
                }
                return null;
              }} />
                  <Bar dataKey="quantidade" fill="hsl(var(--chart-2))" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer> : <div className="h-[300px] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Carregando dados...</p>
                </div>
              </div>}
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
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <Scissors className="h-5 w-5 text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">Serviços Favoritos</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-7">No Período Selecionado</p>
            </div>
            {servicosFavoritos.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {servicosFavoritos.map((servico, index) => <Card key={index} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                    <CardContent className="p-4 flex flex-col items-center text-center space-y-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <Scissors className="h-6 w-6 text-primary" />
                      </div>
                      <h4 className="font-semibold text-sm">{servico.nome}</h4>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          {servico.quantidade} atendimento{servico.quantidade > 1 ? 's' : ''}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {index === 0 ? '⭐ Favorito' : index === 1 ? '✨ Top 2' : '💫 Top 3'}
                      </p>
                    </CardContent>
                  </Card>)}
              </div> : <div className="text-center py-6 border rounded-lg border-dashed">
                <Scissors className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ainda não há serviços favoritos registrados
                </p>
              </div>}
          </div>

          {/* Separador */}
          <div className="border-t"></div>

          {/* Seção: Profissionais Favoritos */}
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-base sm:text-lg font-semibold">Profissionais em Destaque</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 ml-7">No Período Selecionado</p>
            </div>
            {profissionaisFavoritos.length > 0 ? <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {profissionaisFavoritos.map((profissional, index) => <Card key={index} className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
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
                  </Card>)}
              </div> : <div className="text-center py-6 border rounded-lg border-dashed">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Ainda não há profissionais favoritos registrados
                </p>
              </div>}
          </div>

          {/* Separador */}
          <div className="border-t"></div>

          {/* Seção: Gráfico de Serviços e Profissionais Favoritos */}
          <div>
            <FavoritosChart atendimentos={atendimentosConcluidos} servicosFavoritos={servicosFavoritos} profissionaisFavoritos={profissionaisFavoritos} />
          </div>
        </CardContent>
      </Card>
    </div>;
};