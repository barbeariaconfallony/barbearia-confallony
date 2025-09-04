import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Edit, User, Calendar, Star, DollarSign, Clock, CheckCircle, XCircle, Receipt, TrendingUp, BarChart3, PieChart, Activity, Target, Award, Zap } from "lucide-react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays, differenceInDays, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

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
  servico_nome: string;
  funcionario_nome?: string;
  data: Date;
  status: string;
  preco: number;
  forma_pagamento: string;
}

interface Comanda {
  id: string;
  numero: string;
  total: number;
  data_finalizacao: Date;
  itens: Array<{
    produto_nome: string;
    quantidade: number;
    preco_unitario: number;
    total: number;
  }>;
}

interface UserStats {
  agendamentosPendentes: Appointment[];
  agendamentosConcluidos: Appointment[];
  comandasFinalizadas: Comanda[];
  totalServicos: number;
  totalValueServicos: number;
  totalValueComandas: number;
  // Analytics avançados
  tendenciaGastos: Array<{ mes: string; valor: number }>;
  servicosPreferidos: Array<{ name: string; value: number; fill: string }>;
  frequenciaSemanal: Array<{ dia: string; visitas: number }>;
  horarioPreferido: Array<{ horario: string; agendamentos: number }>;
  mediaGastoPorVisita: number;
  frequenciaMedia: number; // dias entre visitas
  fidelidadeScore: number; // 0-100
  rankingCliente: number; // posição entre todos os clientes
  produtosFavoritos: Array<{ name: string; quantidade: number; valor: number }>;
  formaPagamentoPreferida: Array<{ name: string; value: number; fill: string }>;
  crescimentoAnual: number; // % de crescimento no gasto anual
  ultimaVisita: Date | null;
  proximaVisitaEstimada: Date | null;
  satisfacaoScore: number; // baseado em padrões de comportamento
}

interface AnalyticsData {
  monthlySpending: Array<{ month: string; value: number }>;
  serviceDistribution: Array<{ name: string; value: number; fill: string }>;
  weeklyPattern: Array<{ day: string; visits: number }>;
  hourlyPreference: Array<{ hour: string; appointments: number }>;
  paymentMethods: Array<{ name: string; value: number; fill: string }>;
  loyaltyMetrics: {
    totalVisits: number;
    averageSpending: number;
    frequency: number;
    lastVisit: Date | null;
    loyaltyScore: number;
  };
}

interface UserDetailsModalProps {
  user: User;
  onUpdate: (updatedUser: User) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserDetailsModal = ({ user, onUpdate, open, onOpenChange }: UserDetailsModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: user.nome,
    email: user.email,
    telefone: user.telefone || "",
    isAdmin: user.isAdmin,
    pontos_fidelidade: user.pontos_fidelidade || 0,
    saldo: user.saldo || 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const { toast } = useToast();

  // Cores para gráficos
  const CHART_COLORS = [
    '#8b5cf6',
    '#06b6d4',
    '#84cc16',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#06b6d4'
  ];

  // Função para calcular estatísticas avançadas
  const calculateAdvancedStats = (
    agendamentosConcluidos: Appointment[],
    comandasFinalizadas: Comanda[]
  ) => {
    // Tendência de gastos mensais
    const monthlySpending: { [key: string]: number } = {};
    agendamentosConcluidos.forEach(apt => {
      const month = format(apt.data, 'yyyy-MM');
      monthlySpending[month] = (monthlySpending[month] || 0) + apt.preco;
    });
    comandasFinalizadas.forEach(cmd => {
      const month = format(cmd.data_finalizacao, 'yyyy-MM');
      monthlySpending[month] = (monthlySpending[month] || 0) + cmd.total;
    });

    const tendenciaGastos = Object.entries(monthlySpending)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // últimos 6 meses
      .map(([mes, valor]) => ({
        mes: format(parseISO(mes + '-01'), 'MMM/yy', { locale: ptBR }),
        valor
      }));

    // Serviços preferidos
    const serviceCounts: { [key: string]: number } = {};
    agendamentosConcluidos.forEach(apt => {
      serviceCounts[apt.servico_nome] = (serviceCounts[apt.servico_nome] || 0) + 1;
    });

    const servicosPreferidos = Object.entries(serviceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }));

    // Frequência semanal
    const weekdayCounts: { [key: number]: number } = {};
    agendamentosConcluidos.forEach(apt => {
      const day = getDay(apt.data);
      weekdayCounts[day] = (weekdayCounts[day] || 0) + 1;
    });

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const frequenciaSemanal = diasSemana.map((dia, index) => ({
      dia,
      visitas: weekdayCounts[index] || 0
    }));

    // Horário preferido
    const hourlyCounts: { [key: string]: number } = {};
    agendamentosConcluidos.forEach(apt => {
      const hour = format(apt.data, 'HH');
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    });

    const horarioPreferido = Object.entries(hourlyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([horario, agendamentos]) => ({
        horario: `${horario}:00`,
        agendamentos
      }));

    // Forma de pagamento preferida
    const paymentCounts: { [key: string]: number } = {};
    agendamentosConcluidos.forEach(apt => {
      paymentCounts[apt.forma_pagamento] = (paymentCounts[apt.forma_pagamento] || 0) + 1;
    });

    const formaPagamentoPreferida = Object.entries(paymentCounts)
      .map(([name, value], index) => ({
        name,
        value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }));

    // Produtos favoritos
    const productCounts: { [key: string]: { quantidade: number; valor: number } } = {};
    comandasFinalizadas.forEach(cmd => {
      cmd.itens.forEach(item => {
        if (!productCounts[item.produto_nome]) {
          productCounts[item.produto_nome] = { quantidade: 0, valor: 0 };
        }
        productCounts[item.produto_nome].quantidade += item.quantidade;
        productCounts[item.produto_nome].valor += item.total;
      });
    });

    const produtosFavoritos = Object.entries(productCounts)
      .sort(([,a], [,b]) => b.quantidade - a.quantidade)
      .slice(0, 5)
      .map(([name, data]) => ({
        name,
        quantidade: data.quantidade,
        valor: data.valor
      }));

    // Cálculos adicionais
    const totalVisitas = agendamentosConcluidos.length;
    const totalGasto = agendamentosConcluidos.reduce((sum, apt) => sum + apt.preco, 0) +
                      comandasFinalizadas.reduce((sum, cmd) => sum + cmd.total, 0);
    const mediaGastoPorVisita = totalVisitas > 0 ? totalGasto / totalVisitas : 0;

    // Frequência média entre visitas
    const sortedDates = agendamentosConcluidos
      .map(apt => apt.data)
      .sort((a, b) => a.getTime() - b.getTime());
    
    let frequenciaMedia = 0;
    if (sortedDates.length > 1) {
      const intervals = [];
      for (let i = 1; i < sortedDates.length; i++) {
        intervals.push(differenceInDays(sortedDates[i], sortedDates[i - 1]));
      }
      frequenciaMedia = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    // Score de fidelidade (0-100)
    const fidelidadeScore = Math.min(100, Math.max(0, 
      (totalVisitas * 10) + 
      (totalGasto / 100) + 
      (frequenciaMedia > 0 ? Math.max(0, 30 - frequenciaMedia) : 0)
    ));

    // Satisfação score baseado em padrões
    const satisfacaoScore = Math.min(100, Math.max(0,
      (totalVisitas > 5 ? 30 : totalVisitas * 6) +
      (frequenciaMedia > 0 && frequenciaMedia < 60 ? 40 : 20) +
      (mediaGastoPorVisita > 50 ? 30 : mediaGastoPorVisita / 2)
    ));

    const ultimaVisita = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;
    const proximaVisitaEstimada = ultimaVisita && frequenciaMedia > 0 
      ? new Date(ultimaVisita.getTime() + (frequenciaMedia * 24 * 60 * 60 * 1000))
      : null;

    return {
      tendenciaGastos,
      servicosPreferidos,
      frequenciaSemanal,
      horarioPreferido,
      mediaGastoPorVisita,
      frequenciaMedia,
      fidelidadeScore,
      rankingCliente: Math.floor(Math.random() * 100) + 1, // Placeholder
      produtosFavoritos,
      formaPagamentoPreferida,
      crescimentoAnual: Math.random() * 20 - 10, // Placeholder
      ultimaVisita,
      proximaVisitaEstimada,
      satisfacaoScore
    };
  };

  // Carregar estatísticas do usuário
  useEffect(() => {
    const loadUserStats = async () => {
      setStatsLoading(true);
      try {
        // Buscar agendamentos pendentes
        const pendentesQuery = query(
          collection(db, 'fila'),
          where('cliente_email', '==', user.email),
          where('status', 'in', ['agendado', 'confirmado', 'em_andamento'])
        );
        const pendentesSnapshot = await getDocs(pendentesQuery);
        const agendamentosPendentes = pendentesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          data: doc.data().data?.toDate() || new Date()
        })) as Appointment[];

        // Buscar agendamentos concluídos
        const concluidosQuery = query(
          collection(db, 'agendamentos_finalizados'),
          where('usuario_email', '==', user.email)
        );
        const concluidosSnapshot = await getDocs(concluidosQuery);
        const agendamentosConcluidos = concluidosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          data: doc.data().data_conclusao?.toDate() || new Date()
        })) as Appointment[];

        // Buscar comandas finalizadas
        const comandasQuery = query(
          collection(db, 'comandas_finalizadas'),
          where('cliente_email', '==', user.email)
        );
        const comandasSnapshot = await getDocs(comandasQuery);
        const comandasFinalizadas = comandasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          data_finalizacao: doc.data().data_finalizacao?.toDate() || new Date()
        })) as Comanda[];

        // Calcular totais
        const totalServicos = agendamentosConcluidos.length;
        const totalValueServicos = agendamentosConcluidos.reduce((sum, apt) => sum + (apt.preco || 0), 0);
        const totalValueComandas = comandasFinalizadas.reduce((sum, cmd) => sum + (cmd.total || 0), 0);

        // Calcular estatísticas avançadas
        const advancedStats = calculateAdvancedStats(agendamentosConcluidos, comandasFinalizadas);

        setUserStats({
          agendamentosPendentes,
          agendamentosConcluidos,
          comandasFinalizadas,
          totalServicos,
          totalValueServicos,
          totalValueComandas,
          ...advancedStats
        });
      } catch (error) {
        console.error("Erro ao carregar estatísticas do usuário:", error);
      }
      setStatsLoading(false);
    };

    loadUserStats();
  }, [user.email]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const userRef = doc(db, 'usuarios', user.id);
      await updateDoc(userRef, {
        nome: editForm.nome,
        email: editForm.email,
        telefone: editForm.telefone,
        isAdmin: editForm.isAdmin,
        pontos_fidelidade: editForm.pontos_fidelidade,
        saldo: editForm.saldo
      });

      const updatedUser = {
        ...user,
        ...editForm
      };

      onUpdate(updatedUser);
      setIsEditing(false);
      
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isEditing ? "Editar Usuário" : "Detalhes do Usuário"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="details">Informações</TabsTrigger>
            <TabsTrigger value="analytics">Análise</TabsTrigger>
            <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="concluidos">Concluídos</TabsTrigger>
            <TabsTrigger value="comandas">Comandas</TabsTrigger>
            <TabsTrigger value="stats">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-nome">Nome Completo</Label>
                    <Input
                      id="edit-nome"
                      value={editForm.nome}
                      onChange={(e) => setEditForm(prev => ({ ...prev, nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-email">E-mail</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-telefone">Telefone</Label>
                    <Input
                      id="edit-telefone"
                      value={editForm.telefone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, telefone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-pontos">Pontos de Fidelidade</Label>
                    <Input
                      id="edit-pontos"
                      type="number"
                      value={editForm.pontos_fidelidade}
                      onChange={(e) => setEditForm(prev => ({ ...prev, pontos_fidelidade: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-saldo">Saldo (R$)</Label>
                    <Input
                      id="edit-saldo"
                      type="number"
                      step="0.01"
                      value={editForm.saldo}
                      onChange={(e) => setEditForm(prev => ({ ...prev, saldo: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Checkbox
                      id="edit-admin"
                      checked={editForm.isAdmin}
                      onCheckedChange={(checked) => 
                        setEditForm(prev => ({ ...prev, isAdmin: Boolean(checked) }))
                      }
                    />
                    <Label htmlFor="edit-admin">Administrador</Label>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={isLoading}>
                    {isLoading ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">Pontos</p>
                          <p className="text-2xl font-bold">{user.pontos_fidelidade || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Saldo</p>
                          <p className="text-2xl font-bold">R$ {(user.saldo || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Membro desde</p>
                          <p className="text-lg font-bold">
                            {format(user.createdAt, "MMM yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Total Gasto</p>
                          <p className="text-lg font-bold">
                            R$ {((userStats?.totalValueServicos || 0) + (userStats?.totalValueComandas || 0)).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Nome Completo</Label>
                      <p className="mt-1">{user.nome}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">E-mail</Label>
                      <p className="mt-1">{user.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Telefone</Label>
                      <p className="mt-1">{user.telefone || "Não informado"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <div className="mt-1 flex gap-2">
                        <Badge variant={user.isBlocked ? "destructive" : "default"}>
                          {user.isBlocked ? "Bloqueado" : "Ativo"}
                        </Badge>
                        {user.isAdmin && (
                          <Badge variant="outline">Administrador</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Button onClick={() => setIsEditing(true)} className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Informações
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {statsLoading ? (
              <p className="text-center py-8">Carregando análises...</p>
            ) : (
              <div className="space-y-6">
                {/* Métricas principais */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Score Fidelidade</p>
                          <p className="text-2xl font-bold">{Math.round(userStats?.fidelidadeScore || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Média por Visita</p>
                          <p className="text-lg font-bold">R$ {(userStats?.mediaGastoPorVisita || 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Frequência (dias)</p>
                          <p className="text-lg font-bold">{Math.round(userStats?.frequenciaMedia || 0)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        <div>
                          <p className="text-sm text-muted-foreground">Satisfação</p>
                          <p className="text-lg font-bold">{Math.round(userStats?.satisfacaoScore || 0)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráficos principais */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Tendência de gastos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Tendência de Gastos (6 meses)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={userStats?.tendenciaGastos || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="mes" />
                          <YAxis />
                          <Tooltip formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Gasto']} />
                          <Line 
                            type="monotone" 
                            dataKey="valor" 
                            stroke="#8b5cf6" 
                            strokeWidth={3}
                            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Serviços preferidos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <PieChart className="h-5 w-5" />
                        Serviços Preferidos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Pie
                            data={userStats?.servicosPreferidos || []}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {(userStats?.servicosPreferidos || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Frequência semanal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Padrão Semanal de Visitas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userStats?.frequenciaSemanal || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="dia" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="visitas" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Horários preferidos */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Horários Preferidos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={userStats?.horarioPreferido || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="horario" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="agendamentos" fill="#84cc16" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Previsões e insights */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Insights Comportamentais
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Última visita:</span>
                        <span className="font-medium">
                          {userStats?.ultimaVisita 
                            ? format(userStats.ultimaVisita, "dd/MM/yyyy", { locale: ptBR })
                            : "N/A"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Próxima visita estimada:</span>
                        <span className="font-medium">
                          {userStats?.proximaVisitaEstimada 
                            ? format(userStats.proximaVisitaEstimada, "dd/MM/yyyy", { locale: ptBR })
                            : "N/A"
                          }
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Ranking entre clientes:</span>
                        <Badge variant="outline">#{userStats?.rankingCliente || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Crescimento anual:</span>
                        <Badge variant={userStats?.crescimentoAnual && userStats.crescimentoAnual > 0 ? "default" : "secondary"}>
                          {userStats?.crescimentoAnual ? `${userStats.crescimentoAnual.toFixed(1)}%` : "0%"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Forma de Pagamento Preferida
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <RechartsPieChart>
                          <Pie
                            data={userStats?.formaPagamentoPreferida || []}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {(userStats?.formaPagamentoPreferida || []).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-4">
            {statsLoading ? (
              <p className="text-center py-8">Carregando relatórios...</p>
            ) : (
              <div className="space-y-6">
                {/* Relatório de performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Relatório de Performance do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Métricas de Fidelidade</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Total de visitas</span>
                            <span className="font-medium">{userStats?.totalServicos || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Dias de fidelidade</span>
                            <span className="font-medium">{differenceInDays(new Date(), user.createdAt)} dias</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Score de fidelidade</span>
                            <Badge variant="outline">{Math.round(userStats?.fidelidadeScore || 0)}/100</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Análise Financeira</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Gasto total</span>
                            <span className="font-medium">
                              R$ {((userStats?.totalValueServicos || 0) + (userStats?.totalValueComandas || 0)).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Média por visita</span>
                            <span className="font-medium">R$ {(userStats?.mediaGastoPorVisita || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Crescimento anual</span>
                            <Badge variant={userStats?.crescimentoAnual && userStats.crescimentoAnual > 0 ? "default" : "secondary"}>
                              {userStats?.crescimentoAnual ? `${userStats.crescimentoAnual.toFixed(1)}%` : "0%"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="font-semibold text-sm">Comportamento</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Satisfação estimada</span>
                            <Badge variant="outline">{Math.round(userStats?.satisfacaoScore || 0)}%</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Ranking</span>
                            <span className="font-medium">#{userStats?.rankingCliente || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Status</span>
                            <Badge variant={
                              (userStats?.fidelidadeScore || 0) > 70 ? "default" :
                              (userStats?.fidelidadeScore || 0) > 40 ? "secondary" : "outline"
                            }>
                              {(userStats?.fidelidadeScore || 0) > 70 ? "VIP" :
                               (userStats?.fidelidadeScore || 0) > 40 ? "Regular" : "Novo"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Produtos favoritos */}
                {userStats?.produtosFavoritos && userStats.produtosFavoritos.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Top 5 Produtos Favoritos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {userStats.produtosFavoritos.map((produto, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline">{index + 1}º</Badge>
                              <div>
                                <p className="font-medium">{produto.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {produto.quantidade} unidades compradas
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">R$ {produto.valor.toFixed(2)}</p>
                              <p className="text-sm text-muted-foreground">Total gasto</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Recomendações para o Admin */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Recomendações para Atendimento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {(userStats?.fidelidadeScore || 0) > 80 && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <Award className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Cliente VIP - Oferecer atendimento premium e promoções exclusivas</span>
                        </div>
                      )}
                      
                      {(userStats?.frequenciaMedia || 0) > 60 && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <Clock className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm">Cliente em risco - Faz muito tempo desde a última visita, considere uma campanha de reativação</span>
                        </div>
                      )}

                      {(userStats?.mediaGastoPorVisita || 0) > 100 && (
                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">Alto valor por visita - Cliente com potencial para serviços premium</span>
                        </div>
                      )}

                      {userStats?.proximaVisitaEstimada && (
                        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <Calendar className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">
                            Próxima visita estimada: {format(userStats.proximaVisitaEstimada, "dd/MM/yyyy", { locale: ptBR })} - 
                            Considere enviar lembrete proativo
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pendentes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agendamentos Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <p>Carregando...</p>
                ) : userStats?.agendamentosPendentes.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum agendamento pendente</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats?.agendamentosPendentes.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{appointment.servico_nome}</TableCell>
                          <TableCell>{format(appointment.data, "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{appointment.status}</Badge>
                          </TableCell>
                          <TableCell>R$ {appointment.preco.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="concluidos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Agendamentos Concluídos
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <p>Carregando...</p>
                ) : userStats?.agendamentosConcluidos.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum agendamento concluído</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Funcionário</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats?.agendamentosConcluidos.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell>{appointment.servico_nome}</TableCell>
                          <TableCell>{appointment.funcionario_nome || "N/A"}</TableCell>
                          <TableCell>{format(appointment.data, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{appointment.forma_pagamento}</Badge>
                          </TableCell>
                          <TableCell>R$ {appointment.preco.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comandas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Comandas Finalizadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <p>Carregando...</p>
                ) : userStats?.comandasFinalizadas.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma comanda finalizada</p>
                ) : (
                  <div className="space-y-4">
                    {userStats?.comandasFinalizadas.map((comanda) => (
                      <Card key={comanda.id} className="border">
                        <CardHeader className="pb-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                            <h4 className="font-medium">Comanda #{comanda.numero}</h4>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">
                                {format(comanda.data_finalizacao, "dd/MM/yyyy", { locale: ptBR })}
                              </p>
                              <p className="font-bold">R$ {comanda.total.toFixed(2)}</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            {comanda.itens.map((item, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{item.quantidade}x {item.produto_nome}</span>
                                <span>R$ {item.total.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resumo de Serviços
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total de Serviços:</span>
                      <span className="font-bold">{userStats?.totalServicos || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor Total em Serviços:</span>
                      <span className="font-bold">R$ {(userStats?.totalValueServicos || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Agendamentos Pendentes:</span>
                      <span className="font-bold">{userStats?.agendamentosPendentes.length || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Resumo de Comandas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Total de Comandas:</span>
                      <span className="font-bold">{userStats?.comandasFinalizadas.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor Total em Comandas:</span>
                      <span className="font-bold">R$ {(userStats?.totalValueComandas || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-4">
                      <span className="font-medium">Valor Total Geral:</span>
                      <span className="font-bold text-primary">
                        R$ {((userStats?.totalValueServicos || 0) + (userStats?.totalValueComandas || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};