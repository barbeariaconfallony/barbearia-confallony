import { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where,
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEstoque } from '@/hooks/useEstoque';

export interface Produto {
  id: string;
  nome: string;
  preco: number;
  categoria: string;
  ativo: boolean;
  imagem_url?: string;
  imageUrl?: string;
  tipo_venda?: string;
}

export interface ItemComanda {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
  total: number;
}

export interface Comanda {
  id: string;
  numero: string;
  cliente_id: string;
  cliente_nome: string;
  cliente_cpf?: string;
  cliente_telefone?: string;
  cliente_email?: string;
  itens: ItemComanda[];
  total: number;
  status: 'Aberta' | 'Finalizada';
  data_criacao: Date;
  data_finalizacao?: Date;
  tipo_pagamento?: 'PIX' | 'Dinheiro Físico';
  data_pagamento?: Date;
}

export const useComandas = () => {
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [comandasFinalizadas, setComandasFinalizadas] = useState<Comanda[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { darBaixaMultiplos } = useEstoque();

  // Carrega comandas abertas em tempo real
  useEffect(() => {
    const q = query(
      collection(db, 'comandas'),
      where('status', '==', 'Aberta')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comandasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data_criacao: doc.data().data_criacao?.toDate() || new Date(),
        data_finalizacao: doc.data().data_finalizacao?.toDate()
      })) as Comanda[];
      
      // Ordena manualmente no cliente para evitar problemas de índice
      comandasData.sort((a, b) => b.data_criacao.getTime() - a.data_criacao.getTime());
      
      setComandas(comandasData);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao escutar comandas:', error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Carrega comandas finalizadas em tempo real
  useEffect(() => {
    const q = query(collection(db, 'comandas_finalizadas'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const comandasData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        data_criacao: doc.data().data_criacao?.toDate() || new Date(),
        data_finalizacao: doc.data().data_finalizacao?.toDate(),
        tipo_pagamento: doc.data().tipo_pagamento,
        data_pagamento: doc.data().data_pagamento?.toDate()
      })) as Comanda[];
      
      // Ordena manualmente no cliente
      comandasData.sort((a, b) => {
        const dateA = a.data_finalizacao || a.data_criacao;
        const dateB = b.data_finalizacao || b.data_criacao;
        return dateB.getTime() - dateA.getTime();
      });
      
      setComandasFinalizadas(comandasData);
    }, (error) => {
      console.error('Erro ao escutar comandas finalizadas:', error);
    });

    return unsubscribe;
  }, []);

  // Carrega produtos
  useEffect(() => {
    const loadProdutos = async () => {
      try {
        const q = query(
          collection(db, 'produtos'),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);
        const produtosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Produto[];
        setProdutos(produtosData);
      } catch (error) {
        console.error('Erro ao carregar produtos:', error);
      }
    };

    loadProdutos();
  }, []);

  // Carrega usuários
  useEffect(() => {
    const loadUsuarios = async () => {
      try {
        const q = query(
          collection(db, 'usuarios'),
          where('ativo', '==', true)
        );
        const snapshot = await getDocs(q);
        const usuariosData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsuarios(usuariosData);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    };

    loadUsuarios();
  }, []);

  // Gera próximo número da comanda
  const gerarNumeroComanda = async (): Promise<string> => {
    const snapshot = await getDocs(collection(db, 'comandas'));
    const numero = (snapshot.docs.length + 1).toString().padStart(3, '0');
    return numero;
  };

  // Criar nova comanda
  const criarComanda = async (cliente_id: string, cliente_nome: string, itens: ItemComanda[], cliente_cpf?: string, cliente_telefone?: string, cliente_email?: string) => {
    try {
      const numero = await gerarNumeroComanda();
      const total = itens.reduce((sum, item) => sum + item.total, 0);

      const novaComanda = {
        numero,
        cliente_id,
        cliente_nome,
        cliente_cpf: cliente_cpf || 'não inserido',
        cliente_telefone: cliente_telefone || 'não inserido',
        cliente_email: cliente_email || 'não inserido',
        itens,
        total,
        status: 'Aberta',
        data_criacao: Timestamp.now()
      };

      await addDoc(collection(db, 'comandas'), novaComanda);
      
      toast({
        title: "Comanda criada!",
        description: `Comanda #${numero} criada com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao criar comanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a comanda.",
        variant: "destructive"
      });
    }
  };

  // Atualizar comanda
  const atualizarComanda = async (comandaId: string, itens: ItemComanda[]) => {
    try {
      const total = itens.reduce((sum, item) => sum + item.total, 0);
      
      await updateDoc(doc(db, 'comandas', comandaId), {
        itens,
        total
      });

      toast({
        title: "Comanda atualizada!",
        description: "Itens da comanda foram atualizados."
      });
    } catch (error) {
      console.error('Erro ao atualizar comanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a comanda.",
        variant: "destructive"
      });
    }
  };

  // Finalizar comanda com baixa automática de estoque e atualização de fidelidade
  const finalizarComanda = async (comandaId: string, tipoPagamento: 'PIX' | 'Dinheiro Físico', clienteData?: { cpf: string; telefone: string }) => {
    try {
      const comanda = comandas.find(c => c.id === comandaId);
      if (!comanda) return;

      // Move para comandas_finalizadas
      const comandaFinalizada = {
        ...comanda,
        status: 'Finalizada',
        data_finalizacao: Timestamp.now(),
        tipo_pagamento: tipoPagamento,
        data_pagamento: Timestamp.now()
      };

      // Se clienteData foi fornecido (pagamento em dinheiro), atualiza os dados
      if (clienteData) {
        comandaFinalizada.cliente_cpf = clienteData.cpf;
        comandaFinalizada.cliente_telefone = clienteData.telefone;
      }

      await addDoc(collection(db, 'comandas_finalizadas'), comandaFinalizada);

      // Remove da coleção comandas
      await deleteDoc(doc(db, 'comandas', comandaId));

      // Dar baixa no estoque
      const itensEstoque = comanda.itens.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade
      }));
      await darBaixaMultiplos(itensEstoque, comandaId);

      // Atualizar programa de fidelidade
      await atualizarFidelidade(comanda.cliente_id, comanda.cliente_nome, comanda.total);

      // Salvar no histórico de consumo
      await addDoc(collection(db, 'historico_consumo'), {
        cliente_id: comanda.cliente_id,
        cliente_nome: comanda.cliente_nome,
        comanda_id: comandaId,
        comanda_numero: comanda.numero,
        itens: comanda.itens,
        total: comanda.total,
        tipo_pagamento: tipoPagamento,
        data_consumo: Timestamp.now(),
        created_at: Timestamp.now()
      });

      toast({
        title: "Comanda finalizada!",
        description: `Comanda #${comanda.numero} foi finalizada com sucesso.`
      });
    } catch (error) {
      console.error('Erro ao finalizar comanda:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a comanda.",
        variant: "destructive"
      });
    }
  };

  // Atualizar programa de fidelidade do cliente
  const atualizarFidelidade = async (clienteId: string, clienteNome: string, valorGasto: number) => {
    try {
      const q = query(
        collection(db, 'cliente_fidelidade'),
        where('cliente_id', '==', clienteId)
      );
      const snapshot = await getDocs(q);

      const pontosGanhos = Math.floor(valorGasto); // 1 ponto por real gasto

      if (snapshot.empty) {
        // Criar novo registro de fidelidade
        await addDoc(collection(db, 'cliente_fidelidade'), {
          cliente_id: clienteId,
          cliente_nome: clienteNome,
          pontos_totais: pontosGanhos,
          pontos_disponiveis: pontosGanhos,
          nivel: 'bronze',
          total_gasto: valorGasto,
          visitas_total: 1,
          ultima_visita: Timestamp.now(),
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });
      } else {
        // Atualizar registro existente
        const fidelidadeDoc = snapshot.docs[0];
        const fidelidadeData = fidelidadeDoc.data();
        
        const novoTotalGasto = fidelidadeData.total_gasto + valorGasto;
        const novosPontosTotais = fidelidadeData.pontos_totais + pontosGanhos;
        const novosPontosDisponiveis = fidelidadeData.pontos_disponiveis + pontosGanhos;
        const novasVisitas = fidelidadeData.visitas_total + 1;

        // Calcular nível baseado no total gasto
        let nivel = 'bronze';
        if (novoTotalGasto >= 5000) nivel = 'platina';
        else if (novoTotalGasto >= 2000) nivel = 'ouro';
        else if (novoTotalGasto >= 500) nivel = 'prata';

        await updateDoc(doc(db, 'cliente_fidelidade', fidelidadeDoc.id), {
          pontos_totais: novosPontosTotais,
          pontos_disponiveis: novosPontosDisponiveis,
          total_gasto: novoTotalGasto,
          visitas_total: novasVisitas,
          nivel: nivel,
          ultima_visita: Timestamp.now(),
          updated_at: Timestamp.now()
        });
      }

      // Registrar histórico de pontos
      await addDoc(collection(db, 'historico_pontos'), {
        cliente_id: clienteId,
        pontos: pontosGanhos,
        tipo: 'ganho',
        descricao: `Ganhou ${pontosGanhos} pontos na comanda`,
        created_at: Timestamp.now()
      });

    } catch (error) {
      console.error('Erro ao atualizar fidelidade:', error);
    }
  };

  return {
    comandas,
    comandasFinalizadas,
    produtos,
    usuarios,
    loading,
    criarComanda,
    atualizarComanda,
    finalizarComanda
  };
};