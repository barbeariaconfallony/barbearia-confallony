import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, startOfYear, endOfYear, eachMonthOfInterval, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
interface AtendimentoConcluido {
  id: string;
  servico_nome: string;
  funcionario_nome: string;
  data_atendimento: Date;
}
interface FavoritosChartProps {
  atendimentos: AtendimentoConcluido[];
  servicosFavoritos: {
    nome: string;
    quantidade: number;
  }[];
  profissionaisFavoritos: {
    nome: string;
    quantidade: number;
  }[];
}
export const FavoritosChart = ({
  atendimentos,
  servicosFavoritos,
  profissionaisFavoritos
}: FavoritosChartProps) => {
  const chartData = useMemo(() => {
    const hoje = new Date();
    const inicioAno = startOfYear(hoje);
    const fimAno = endOfYear(hoje);

    // Filtra atendimentos do ano atual
    const atendimentosAnoAtual = atendimentos.filter(atendimento => isWithinInterval(atendimento.data_atendimento, {
      start: inicioAno,
      end: fimAno
    }));

    // Cria array com todos os meses do ano
    const mesesDoAno = eachMonthOfInterval({
      start: inicioAno,
      end: fimAno
    });

    // Prepara os dados para cada mês
    const dados = mesesDoAno.map(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      const nomeMes = format(mes, 'MMM', {
        locale: ptBR
      });
      const dadosMes: any = {
        mes: nomeMes
      };

      // Conta serviços favoritos para este mês
      servicosFavoritos.forEach(servico => {
        const contagem = atendimentosAnoAtual.filter(atendimento => isWithinInterval(atendimento.data_atendimento, {
          start: inicioMes,
          end: fimMes
        }) && atendimento.servico_nome === servico.nome).length;
        dadosMes[servico.nome] = contagem;
      });

      return dadosMes;
    });
    return dados;
  }, [atendimentos, servicosFavoritos, profissionaisFavoritos]);

  // Cores para as linhas (palette vibrante)
  const coresServicos = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
  return <div className="w-full h-full">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h3 className="text-base sm:text-lg font-semibold">Serviços Favoritos ( Mensal )</h3>
        <p className="text-xs text-muted-foreground ml-auto">Ano {new Date().getFullYear()} por mês</p>
      </div>
      
      {servicosFavoritos.length === 0 ? <div className="text-center py-12 border rounded-lg border-dashed">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            Você ainda não tem dados suficientes para exibir o gráfico
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Continue agendando serviços para ver suas preferências!
          </p>
        </div> : <div className="rounded-lg p-4 border border-border/50">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{
          top: 5,
          right: 20,
          left: 0,
          bottom: 5
        }}>
              <defs>
                {servicosFavoritos.map((servico, index) => <linearGradient key={`gradient-servico-${servico.nome}`} id={`gradient-servico-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={coresServicos[index % coresServicos.length]} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={coresServicos[index % coresServicos.length]} stopOpacity={0.1} />
                  </linearGradient>)}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} vertical={true} />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 11
          }} tickLine={false} axisLine={{
            stroke: 'hsl(var(--border))'
          }} interval={0} />
              <YAxis stroke="hsl(var(--muted-foreground))" tick={{
            fill: 'hsl(var(--muted-foreground))',
            fontSize: 11
          }} tickLine={false} axisLine={{
            stroke: 'hsl(var(--border))'
          }} allowDecimals={false} />
              <Tooltip contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--foreground))'
          }} labelStyle={{
            color: 'hsl(var(--foreground))',
            marginBottom: '8px',
            fontWeight: 500
          }} itemStyle={{
            color: 'hsl(var(--foreground))'
          }} />
              <Legend wrapperStyle={{
            paddingTop: '20px'
          }} iconType="rect" formatter={value => <span className="text-foreground text-xs">{value}</span>} />
              
              {/* Áreas dos serviços favoritos */}
              {servicosFavoritos.map((servico, index) => <Area key={`servico-${servico.nome}`} type="monotone" dataKey={servico.nome} stroke={coresServicos[index % coresServicos.length]} strokeWidth={2} fill={`url(#gradient-servico-${index})`} name={servico.nome} />)}
            </AreaChart>
          </ResponsiveContainer>
        </div>}
    </div>;
};