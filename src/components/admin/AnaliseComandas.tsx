import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie as RechartsPie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface ComandaData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const AnaliseComandas = () => {
  const [data, setData] = useState<ComandaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      try {
        const comandasSnapshot = await getDocs(collection(db, 'comandas_finalizadas'));
        const clienteGastos: Record<string, number> = {};

        comandasSnapshot.forEach(doc => {
          const comandaData = doc.data();
          const clienteNome = comandaData.cliente_nome || 'Cliente Anônimo';
          const total = comandaData.total || 0;
          
          clienteGastos[clienteNome] = (clienteGastos[clienteNome] || 0) + total;
        });

        const chartData = Object.entries(clienteGastos)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5); // Top 5 clientes

        const totalGeral = chartData.reduce((acc, item) => acc + item.value, 0);
        setTotal(totalGeral);
        setData(chartData);
      } catch (error) {
        console.error("Erro ao carregar análise de comandas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Nenhuma comanda finalizada encontrada</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 h-[300px]">
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={300}>
          <RechartsPieChart>
            <RechartsPie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={false}
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
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
                      <p className="text-primary font-medium">Total Gasto: R$ {data.value.toLocaleString()}</p>
                      <p className="text-muted-foreground text-xs">
                        Participação: {total > 0 ? ((data.value / total) * 100).toFixed(1) : 0}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex flex-col gap-2 justify-center min-w-[140px]">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div className="flex flex-col">
              <span 
                className="text-xs font-medium truncate"
                style={{ color: COLORS[index % COLORS.length] }}
              >
                {item.name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                R$ {item.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};