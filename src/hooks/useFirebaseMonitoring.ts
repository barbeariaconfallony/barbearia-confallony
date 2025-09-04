import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, doc, getDoc, onSnapshot, query, limit, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface CollectionInfo {
  name: string;
  documents: number;
  size: string;
  lastUpdate: string;
  status: 'active' | 'inactive';
  estimatedSizeBytes: number;
}

export interface DatabaseUsage {
  totalDocuments: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  collections: CollectionInfo[];
  dailyOperations: {
    reads: number;
    writes: number;
    deletes: number;
  };
  monthlyOperations: {
    reads: number;
    writes: number;
    deletes: number;
  };
  estimatedCost: {
    monthly: number;
    daily: number;
  };
}

export interface DatabaseAlert {
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

// Constantes do Firebase Firestore (plano gratuito)
const FIRESTORE_LIMITS = {
  DAILY_READS: 50000,
  DAILY_WRITES: 20000,
  DAILY_DELETES: 20000,
  STORAGE_GB: 1,
  // Preços por operação (valores aproximados em USD)
  READ_COST: 0.06 / 100000, // $0.06 per 100,000 reads
  WRITE_COST: 0.18 / 100000, // $0.18 per 100,000 writes
  STORAGE_COST: 0.18 / 1024 / 1024 / 1024, // $0.18 per GB per month
};

export const useFirebaseMonitoring = () => {
  const [databaseUsage, setDatabaseUsage] = useState<DatabaseUsage | null>(null);
  const [alerts, setAlerts] = useState<DatabaseAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [operationCount, setOperationCount] = useState({
    reads: 0,
    writes: 0,
    deletes: 0,
  });

  // Função para estimar o tamanho de um documento
  const estimateDocumentSize = (data: any): number => {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  };

  // Função para calcular informações de uma coleção
  const getCollectionInfo = useCallback(async (collectionName: string): Promise<CollectionInfo> => {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      
      let totalSize = 0;
      let lastUpdate = new Date(0);

      snapshot.forEach(doc => {
        const data = doc.data();
        totalSize += estimateDocumentSize(data);
        
        // Verificar timestamps para última atualização
        const docUpdate = data.updatedAt?.toDate() || 
                         data.data_atualizacao?.toDate() || 
                         data.createdAt?.toDate() || 
                         data.data_registro?.toDate() || 
                         new Date();
        
        if (docUpdate > lastUpdate) {
          lastUpdate = docUpdate;
        }
      });

      const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
      };

      const formatLastUpdate = (date: Date): string => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Agora';
        if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `Há ${diffInHours}h`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        return `Há ${diffInDays}d`;
      };

      return {
        name: collectionName,
        documents: snapshot.size,
        size: formatBytes(totalSize),
        lastUpdate: formatLastUpdate(lastUpdate),
        status: snapshot.size > 0 ? 'active' : 'inactive',
        estimatedSizeBytes: totalSize,
      };
    } catch (error) {
      console.error(`Erro ao analisar coleção ${collectionName}:`, error);
      return {
        name: collectionName,
        documents: 0,
        size: '0 B',
        lastUpdate: 'Nunca',
        status: 'inactive',
        estimatedSizeBytes: 0,
      };
    }
  }, []);

  // Função principal para carregar dados do banco
  const loadDatabaseUsage = useCallback(async () => {
    setLoading(true);
    try {
      // Lista de coleções conhecidas do sistema
      const collectionNames = [
        'usuarios',
        'fila',
        'servicos',
        'funcionarios',
        'agendamentos_finalizados',
        'produtos',
        'comandas',
        'comandas_finalizadas',
        'configuracoes',
      ];

      // Carregar informações de todas as coleções
      const collectionsInfo = await Promise.all(
        collectionNames.map(name => getCollectionInfo(name))
      );

      // Calcular totais
      const totalDocuments = collectionsInfo.reduce((sum, col) => sum + col.documents, 0);
      const totalSizeBytes = collectionsInfo.reduce((sum, col) => sum + col.estimatedSizeBytes, 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);

      // Simular operações diárias baseado no número de documentos
      // Em um ambiente real, você precisaria implementar um sistema de logging
      const dailyReads = Math.floor(totalDocuments * 10 + Math.random() * 1000);
      const dailyWrites = Math.floor(totalDocuments * 2 + Math.random() * 100);
      const dailyDeletes = Math.floor(totalDocuments * 0.1 + Math.random() * 10);

      // Calcular custos estimados
      const dailyCost = 
        (dailyReads * FIRESTORE_LIMITS.READ_COST) +
        (dailyWrites * FIRESTORE_LIMITS.WRITE_COST) +
        (totalSizeBytes * FIRESTORE_LIMITS.STORAGE_COST);

      const monthlyCost = dailyCost * 30;

      const usage: DatabaseUsage = {
        totalDocuments,
        totalSizeBytes,
        totalSizeMB,
        collections: collectionsInfo.filter(col => col.documents > 0),
        dailyOperations: {
          reads: dailyReads,
          writes: dailyWrites,
          deletes: dailyDeletes,
        },
        monthlyOperations: {
          reads: dailyReads * 30,
          writes: dailyWrites * 30,
          deletes: dailyDeletes * 30,
        },
        estimatedCost: {
          daily: dailyCost,
          monthly: monthlyCost,
        },
      };

      setDatabaseUsage(usage);
      setOperationCount({
        reads: dailyReads,
        writes: dailyWrites,
        deletes: dailyDeletes,
      });

      // Verificar alertas
      checkAlerts(usage);
    } catch (error) {
      console.error('Erro ao carregar dados do banco:', error);
    } finally {
      setLoading(false);
    }
  }, [getCollectionInfo]);

  // Função para verificar alertas
  const checkAlerts = (usage: DatabaseUsage) => {
    const newAlerts: DatabaseAlert[] = [];

    // Verificar limite de operações de leitura
    const readUsagePercent = (usage.dailyOperations.reads / FIRESTORE_LIMITS.DAILY_READS) * 100;
    if (readUsagePercent > 80) {
      newAlerts.push({
        type: readUsagePercent > 95 ? 'error' : 'warning',
        title: 'Limite de Leituras Próximo',
        message: `${readUsagePercent.toFixed(1)}% do limite diário de leituras atingido (${usage.dailyOperations.reads.toLocaleString()} / ${FIRESTORE_LIMITS.DAILY_READS.toLocaleString()})`,
        timestamp: new Date(),
      });
    }

    // Verificar limite de operações de escrita
    const writeUsagePercent = (usage.dailyOperations.writes / FIRESTORE_LIMITS.DAILY_WRITES) * 100;
    if (writeUsagePercent > 80) {
      newAlerts.push({
        type: writeUsagePercent > 95 ? 'error' : 'warning',
        title: 'Limite de Escritas Próximo',
        message: `${writeUsagePercent.toFixed(1)}% do limite diário de escritas atingido (${usage.dailyOperations.writes.toLocaleString()} / ${FIRESTORE_LIMITS.DAILY_WRITES.toLocaleString()})`,
        timestamp: new Date(),
      });
    }

    // Verificar armazenamento
    const storageUsagePercent = (usage.totalSizeMB / (FIRESTORE_LIMITS.STORAGE_GB * 1024)) * 100;
    if (storageUsagePercent > 80) {
      newAlerts.push({
        type: storageUsagePercent > 95 ? 'error' : 'warning',
        title: 'Limite de Armazenamento Próximo',
        message: `${storageUsagePercent.toFixed(1)}% do limite de armazenamento atingido (${usage.totalSizeMB.toFixed(2)} MB / ${FIRESTORE_LIMITS.STORAGE_GB * 1024} MB)`,
        timestamp: new Date(),
      });
    }

    // Verificar custo estimado
    if (usage.estimatedCost.monthly > 10) {
      newAlerts.push({
        type: 'warning',
        title: 'Custo Mensal Elevado',
        message: `Custo mensal estimado: $${usage.estimatedCost.monthly.toFixed(2)} USD`,
        timestamp: new Date(),
      });
    }

    // Alertas de boas práticas
    if (usage.totalDocuments > 1000000) {
      newAlerts.push({
        type: 'info',
        title: 'Grande Volume de Dados',
        message: 'Considere implementar paginação e arquivamento de dados antigos',
        timestamp: new Date(),
      });
    }

    setAlerts(newAlerts);
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadDatabaseUsage();
    
    // Recarregar a cada 5 minutos
    const interval = setInterval(loadDatabaseUsage, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [loadDatabaseUsage]);

  return {
    databaseUsage,
    alerts,
    loading,
    operationCount,
    refreshData: loadDatabaseUsage,
    FIRESTORE_LIMITS,
  };
};