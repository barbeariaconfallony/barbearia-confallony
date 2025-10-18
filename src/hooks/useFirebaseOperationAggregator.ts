import { useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { startOfDay, endOfDay } from 'date-fns';

// Hook para agregar logs de operações diariamente
// Isso evita ter que processar milhares de logs individuais
export const useFirebaseOperationAggregator = () => {
  useEffect(() => {
    const aggregateDailyOperations = async () => {
      try {
        const today = new Date();
        const startDate = startOfDay(today);
        const endDate = endOfDay(today);

        // Buscar logs do dia atual
        const logsQuery = query(
          collection(db, 'operation_logs'),
          where('timestamp', '>=', Timestamp.fromDate(startDate)),
          where('timestamp', '<=', Timestamp.fromDate(endDate))
        );

        const logsSnapshot = await getDocs(logsQuery);
        
        // Contar operações por tipo
        const counts = {
          reads: 0,
          writes: 0,
          deletes: 0,
        };

        const collectionStats: Record<string, { reads: number; writes: number; deletes: number }> = {};

        logsSnapshot.forEach(doc => {
          const data = doc.data();
          const type = data.type as 'read' | 'write' | 'delete';
          const collectionName = data.collection;

          // Contagem geral
          if (type === 'read') counts.reads++;
          else if (type === 'write') counts.writes++;
          else if (type === 'delete') counts.deletes++;

          // Contagem por coleção
          if (!collectionStats[collectionName]) {
            collectionStats[collectionName] = { reads: 0, writes: 0, deletes: 0 };
          }
          collectionStats[collectionName][`${type}s` as keyof typeof collectionStats[typeof collectionName]]++;
        });

        // Salvar agregação diária
        const aggregationRef = doc(db, 'operation_aggregations', today.toISOString().split('T')[0]);
        await setDoc(aggregationRef, {
          date: Timestamp.fromDate(today),
          totalOperations: logsSnapshot.size,
          reads: counts.reads,
          writes: counts.writes,
          deletes: counts.deletes,
          collectionStats,
          lastUpdated: serverTimestamp(),
        }, { merge: true });

        console.log('Daily operations aggregated:', counts);
      } catch (error) {
        console.error('Error aggregating operations:', error);
      }
    };

    // Agregar imediatamente
    aggregateDailyOperations();

    // Agregar a cada 5 minutos
    const interval = setInterval(aggregateDailyOperations, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);
};
