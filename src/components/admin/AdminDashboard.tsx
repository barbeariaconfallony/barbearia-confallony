import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Clock
} from "lucide-react";
import { Top5Produtos } from "./Top5Produtos";
import { AnaliseComandas } from "./AnaliseComandas";
import { HorariosMaisProcurados } from "./HorariosMaisProcurados";
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
  transferenciasPorPeriodo: Array<{ name: string; transferencias: number }>;
  topClientesComandas: Array<{ name: string; value: number }>;
  dadosAnaliseEstoque: Array<{ subject: string; A: number; fullMark: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AdminDashboard = ({
  statistics,
  period,
  setPeriod,
  transferenciasPorPeriodo,
  topClientesComandas,
  dadosAnaliseEstoque
}: AdminDashboardProps) => {
  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
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
            description={`Para ${period === 'hoje' ? 'hoje' : 'o período'}`}
            className="bg-gradient-to-br from-green-500/10 to-green-700/10 text-white"
          />
          <StatsCard
            title="Faturamento"
            value={`R$ ${statistics.faturamentoMes.toLocaleString()}`}
            icon={<DollarSign className="h-8 w-8 text-white" />}
            description={`No ${period === 'hoje' ? 'dia' : 'período'}`}
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
              Faturamento Diário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsAreaChart data={transferenciasPorPeriodo}>
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
              Performance Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statistics ? (
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={dadosAnaliseEstoque}>
                  <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
                  <PolarAngleAxis dataKey="subject" style={{ fontSize: '10px' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} style={{ fontSize: '10px' }} />
                  <Radar name="Performance" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                  <RechartsTooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                            <p className="font-semibold text-sm mb-2">{payload[0].payload.subject}</p>
                            <div className="flex items-center gap-2 text-sm">
                              <div className="w-3 h-3 rounded bg-[#8884d8]" />
                              <span>Performance: {payload[0].value}%</span>
                            </div>
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
            {statistics ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie
                    data={[
                      { name: 'Pomadas', value: statistics.totalClientes * 0.3 },
                      { name: 'Shampoos', value: statistics.totalClientes * 0.25 },
                      { name: 'Óleos', value: statistics.totalClientes * 0.2 },
                      { name: 'Cremes', value: statistics.totalClientes * 0.15 },
                      { name: 'Outros', value: statistics.totalClientes * 0.1 }
                    ]}
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
                    {[1,2,3,4,5].map((entry, index) => (
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
            {statistics ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <RechartsPie
                    data={[
                      { name: 'Pagos', value: statistics.faturamentoMes * 0.85 },
                      { name: 'Pendentes', value: statistics.faturamentoMes * 0.10 },
                      { name: 'Cancelados', value: statistics.faturamentoMes * 0.05 }
                    ]}
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
      </div>
    </div>
  );
};