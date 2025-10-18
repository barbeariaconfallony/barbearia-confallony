import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where,
  getDocs, 
  updateDoc,
  addDoc,
  doc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface ProdutoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  quantidade_disponivel: number;
  quantidade_minima: number;
  unidade: string;
  alerta_estoque_baixo: boolean;
}

export interface ProdutoComanda {
  id: string;
  nome: string;
  estoque: number;
  estoque_minimo: number;
  tipo_venda: string;
}

export const useEstoque = () => {
  const [estoque, setEstoque] = useState<ProdutoEstoque[]>([]);
  const [produtosEstoqueBaixo, setProdutosEstoqueBaixo] = useState<ProdutoEstoque[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Monitorar estoque em tempo real - buscar da coleção produtos tipo comanda
  useEffect(() => {
    const qProdutos = query(
      collection(db, 'produtos'),
      where('tipo_venda', '==', 'comanda')
    );

    const unsubscribe = onSnapshot(qProdutos, (snapshot) => {
      const produtosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ProdutoComanda[];
      
      // Filtrar produtos com estoque baixo ou igual ao estoque mínimo
      const baixo = produtosData
        .filter(p => {
          const estoqueMinimo = p.estoque_minimo || 0;
          return p.estoque <= estoqueMinimo;
        })
        .map(p => ({
          id: p.id,
          produto_id: p.id,
          produto_nome: p.nome,
          quantidade_disponivel: p.estoque,
          quantidade_minima: p.estoque_minimo || 0,
          unidade: 'un',
          alerta_estoque_baixo: true
        }));
      
      setProdutosEstoqueBaixo(baixo);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao escutar estoque:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Dar baixa no estoque de um produto
  const darBaixaEstoque = async (produtoId: string, quantidade: number, motivoComandaId?: string) => {
    try {
      // Buscar produto no estoque
      const q = query(collection(db, 'estoque'), where('produto_id', '==', produtoId));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.warn(`Produto ${produtoId} não encontrado no estoque`);
        return false;
      }

      const estoqueDoc = snapshot.docs[0];
      const estoqueData = estoqueDoc.data();
      const quantidadeAtual = estoqueData.quantidade_disponivel;
      const novaQuantidade = Math.max(0, quantidadeAtual - quantidade);

      // Atualizar quantidade
      await updateDoc(doc(db, 'estoque', estoqueDoc.id), {
        quantidade_disponivel: novaQuantidade,
        ultima_atualizacao: Timestamp.now()
      });

      // Registrar movimentação
      await addDoc(collection(db, 'movimentacao_estoque'), {
        produto_id: produtoId,
        produto_nome: estoqueData.produto_nome,
        tipo_movimentacao: 'saida',
        quantidade: quantidade,
        quantidade_anterior: quantidadeAtual,
        quantidade_nova: novaQuantidade,
        motivo: 'Venda em comanda',
        comanda_id: motivoComandaId,
        created_at: Timestamp.now()
      });

      // Alerta se estoque ficou baixo
      if (novaQuantidade <= estoqueData.quantidade_minima && quantidadeAtual > estoqueData.quantidade_minima) {
        toast({
          title: "⚠️ Estoque baixo!",
          description: `${estoqueData.produto_nome} está com estoque baixo (${novaQuantidade} ${estoqueData.unidade})`,
          variant: "destructive"
        });
      }

      return true;
    } catch (error) {
      console.error('Erro ao dar baixa no estoque:', error);
      toast({
        title: "Erro ao atualizar estoque",
        description: "Não foi possível atualizar o estoque do produto.",
        variant: "destructive"
      });
      return false;
    }
  };

  // Dar baixa em vários produtos (comanda completa)
  const darBaixaMultiplos = async (itens: Array<{ produto_id: string; quantidade: number }>, comandaId: string) => {
    try {
      const promises = itens.map(item => 
        darBaixaEstoque(item.produto_id, item.quantidade, comandaId)
      );
      
      await Promise.all(promises);
      
      return true;
    } catch (error) {
      console.error('Erro ao dar baixa em múltiplos produtos:', error);
      return false;
    }
  };

  // Verificar se produto tem estoque disponível
  const verificarDisponibilidade = (produtoId: string, quantidadeDesejada: number): boolean => {
    const produtoEstoque = estoque.find(e => e.produto_id === produtoId);
    
    if (!produtoEstoque) {
      return true; // Se não está no controle, considera disponível
    }
    
    return produtoEstoque.quantidade_disponivel >= quantidadeDesejada;
  };

  // Obter quantidade disponível de um produto
  const getQuantidadeDisponivel = (produtoId: string): number | null => {
    const produtoEstoque = estoque.find(e => e.produto_id === produtoId);
    return produtoEstoque ? produtoEstoque.quantidade_disponivel : null;
  };

  return {
    estoque,
    produtosEstoqueBaixo,
    loading,
    darBaixaEstoque,
    darBaixaMultiplos,
    verificarDisponibilidade,
    getQuantidadeDisponivel
  };
};
