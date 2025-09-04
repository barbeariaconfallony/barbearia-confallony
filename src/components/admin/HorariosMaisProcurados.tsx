import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

interface HorarioData {
  horario: string;
  atendimentos: number;
}

export const HorariosMaisProcurados = () => {
  const [data, setData] = useState<HorarioData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const atendimentosSnapshot = await getDocs(collection(db, 'agendamentos_finalizados'));
        const horarioCount: Record<string, number> = {};

        atendimentosSnapshot.forEach(doc => {
          const atendimentoData = doc.data();
          if (atendimentoData.tempo_inicio) {
            const hora = format(atendimentoData.tempo_inicio.toDate(), 'HH:00');
            horarioCount[hora] = (horarioCount[hora] || 0) + 1;
          }
        });

        const chartData = Object.entries(horarioCount)
          .map(([horario, atendimentos]) => ({ horario, atendimentos }))
          .sort((a, b) => a.horario.localeCompare(b.horario));

        setData(chartData);
      } catch (error) {
        console.error("Erro ao carregar horários mais procurados:", error);
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
        <p className="text-sm text-muted-foreground">Nenhum atendimento concluído encontrado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
        <XAxis dataKey="horario" />
        <YAxis />
        <RechartsTooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                  <p className="font-semibold text-sm mb-2">Horário: {label}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded bg-[#f59e0b]" />
                    <span>Atendimentos: {payload[0].value}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="atendimentos" fill="#f59e0b" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};