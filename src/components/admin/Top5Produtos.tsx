import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ProdutoData {
  produto: string;
  vendas: number;
}

export const Top5Produtos = () => {
  const [data, setData] = useState<ProdutoData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Buscar dados reais da coleção produtos_vendidos
        const vendasRef = collection(db, 'produtos_vendidos');
        const q = query(vendasRef, orderBy('data_compra', 'desc'));
        const querySnapshot = await getDocs(q);
        
        // Processar dados para contar vendas por produto
        const produtoVendas: { [key: string]: number } = {};
        
        querySnapshot.forEach((doc) => {
          const venda = doc.data();
          if (venda.produtos && Array.isArray(venda.produtos)) {
            venda.produtos.forEach((produto: any) => {
              const nome = produto.nome;
              const quantidade = produto.quantidade || 1;
              produtoVendas[nome] = (produtoVendas[nome] || 0) + quantidade;
            });
          }
        });
        
        // Converter para array e ordenar por vendas
        const produtosArray = Object.entries(produtoVendas)
          .map(([produto, vendas]) => ({ produto, vendas }))
          .sort((a, b) => b.vendas - a.vendas)
          .slice(0, 5); // Top 5
        
        setData(produtosArray);
      } catch (error) {
        console.error("Erro ao carregar top 5 produtos:", error);
        setData([]);
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
        <p className="text-sm text-muted-foreground">Nenhum produto encontrado</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
        <XAxis dataKey="produto" />
        <YAxis />
        <RechartsTooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
                  <p className="font-semibold text-sm mb-2">{label}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded bg-[#0ea5e9]" />
                    <span>Vendas: {payload[0].value}</span>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="vendas" fill="#0ea5e9" />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};