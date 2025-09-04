import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export interface Service {
  id: string;
  nome: string;
  preco: number;
  duracao: number;
  descricao: string;
  sala_atendimento: string;
  ativo: boolean;
}

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadServices = async () => {
    setLoading(true);
    try {
      const servicosQuery = query(
        collection(db, 'servicos'),
        where('ativo', '==', true)
      );
      const servicosSnapshot = await getDocs(servicosQuery);
      const servicosData: Service[] = [];
      
      servicosSnapshot.forEach((doc) => {
        const data = doc.data();
        servicosData.push({
          id: doc.id,
          nome: data.nome,
          preco: data.preco,
          duracao: data.duracao,
          descricao: data.descricao,
          sala_atendimento: data.sala_atendimento || '',
          ativo: data.ativo
        });
      });
      
      setServices(servicosData);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar serviços.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  return {
    services,
    loading,
    refetch: loadServices
  };
};