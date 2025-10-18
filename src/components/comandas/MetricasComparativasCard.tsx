import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface MetricasComparativas {
  vendasHoje: number;
  vendasOntem: number;
  vendasSemanaAtual: number;
  vendasSemanaAnterior: number;
  ticketMedioHoje: number;
  ticketMedioOntem: number;
}

export const MetricasComparativasCard: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasComparativas>({
    vendasHoje: 0,
    vendasOntem: 0,
    vendasSemanaAtual: 0,
    vendasSemanaAnterior: 0,
    ticketMedioHoje: 0,
    ticketMedioOntem: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetricas();
  }, []);

  const loadMetricas = async () => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      
      const inicioSemanaAtual = new Date(hoje);
      inicioSemanaAtual.setDate(hoje.getDate() - hoje.getDay());
      
      const inicioSemanaAnterior = new Date(inicioSemanaAtual);
      inicioSemanaAnterior.setDate(inicioSemanaAnterior.getDate() - 7);
      
      const fimSemanaAnterior = new Date(inicioSemanaAtual);
      fimSemanaAnterior.setMilliseconds(-1);

      // Vendas de hoje
      const vendasHojeQuery = query(
        collection(db, 'comandas_finalizadas'),
        where('data_finalizacao', '>=', Timestamp.fromDate(hoje))
      );
      const vendasHojeSnapshot = await getDocs(vendasHojeQuery);
      const vendasHoje = vendasHojeSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
      const ticketMedioHoje = vendasHojeSnapshot.size > 0 ? vendasHoje / vendasHojeSnapshot.size : 0;

      // Vendas de ontem
      const vendasOntemQuery = query(
        collection(db, 'comandas_finalizadas'),
        where('data_finalizacao', '>=', Timestamp.fromDate(ontem)),
        where('data_finalizacao', '<', Timestamp.fromDate(hoje))
      );
      const vendasOntemSnapshot = await getDocs(vendasOntemQuery);
      const vendasOntem = vendasOntemSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);
      const ticketMedioOntem = vendasOntemSnapshot.size > 0 ? vendasOntem / vendasOntemSnapshot.size : 0;

      // Vendas semana atual
      const vendasSemanaAtualQuery = query(
        collection(db, 'comandas_finalizadas'),
        where('data_finalizacao', '>=', Timestamp.fromDate(inicioSemanaAtual))
      );
      const vendasSemanaAtualSnapshot = await getDocs(vendasSemanaAtualQuery);
      const vendasSemanaAtual = vendasSemanaAtualSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

      // Vendas semana anterior
      const vendasSemanaAnteriorQuery = query(
        collection(db, 'comandas_finalizadas'),
        where('data_finalizacao', '>=', Timestamp.fromDate(inicioSemanaAnterior)),
        where('data_finalizacao', '<=', Timestamp.fromDate(fimSemanaAnterior))
      );
      const vendasSemanaAnteriorSnapshot = await getDocs(vendasSemanaAnteriorQuery);
      const vendasSemanaAnterior = vendasSemanaAnteriorSnapshot.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

      setMetricas({
        vendasHoje,
        vendasOntem,
        vendasSemanaAtual,
        vendasSemanaAnterior,
        ticketMedioHoje,
        ticketMedioOntem
      });
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularVariacao = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const renderVariacao = (atual: number, anterior: number) => {
    const variacao = calcularVariacao(atual, anterior);
    const isPositivo = variacao >= 0;
    
    return (
      <Badge 
        variant={isPositivo ? "default" : "destructive"}
        className="flex items-center gap-1 animate-fade-in"
      >
        {isPositivo ? (
          <TrendingUp className="h-3 w-3" />
        ) : (
          <TrendingDown className="h-3 w-3" />
        )}
        {Math.abs(variacao).toFixed(1)}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comparativo de Períodos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Carregando métricas...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Comparativo de Períodos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vendas Hoje vs Ontem */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Vendas de Hoje</span>
            </div>
            {renderVariacao(metricas.vendasHoje, metricas.vendasOntem)}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hoje:</span>
            <span className="font-bold text-primary">R$ {metricas.vendasHoje.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ontem:</span>
            <span>R$ {metricas.vendasOntem.toFixed(2)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Ticket Médio Hoje vs Ontem */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Ticket Médio</span>
            {renderVariacao(metricas.ticketMedioHoje, metricas.ticketMedioOntem)}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Hoje:</span>
            <span className="font-bold text-primary">R$ {metricas.ticketMedioHoje.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ontem:</span>
            <span>R$ {metricas.ticketMedioOntem.toFixed(2)}</span>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Vendas Semana Atual vs Anterior */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vendas Semanais</span>
            {renderVariacao(metricas.vendasSemanaAtual, metricas.vendasSemanaAnterior)}
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Esta semana:</span>
            <span className="font-bold text-primary">R$ {metricas.vendasSemanaAtual.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Semana passada:</span>
            <span>R$ {metricas.vendasSemanaAnterior.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
