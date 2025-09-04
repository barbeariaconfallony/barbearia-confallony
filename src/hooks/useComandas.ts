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

  // Finalizar comanda
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