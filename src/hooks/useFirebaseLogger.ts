import { useCallback } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type OperationType = 'read' | 'write' | 'delete';

interface LogOperation {
  type: OperationType;
  collection: string;
  documentId?: string;
  timestamp: any;
  userId?: string;
  metadata?: Record<string, any>;
}

export const useFirebaseLogger = () => {
  const logOperation = useCallback(async (
    type: OperationType,
    collectionName: string,
    documentId?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const logData: LogOperation = {
        type,
        collection: collectionName,
        documentId,
        timestamp: serverTimestamp(),
        metadata,
      };

      // Log assíncrono - não bloqueia a operação principal
      await addDoc(collection(db, 'operation_logs'), logData);
    } catch (error) {
      // Não queremos que erros de logging quebrem a aplicação
      console.error('Error logging operation:', error);
    }
  }, []);

  return { logOperation };
};

// Helper para wrapper de operações do Firestore
export const withLogging = async <T>(
  operation: () => Promise<T>,
  type: OperationType,
  collectionName: string,
  documentId?: string,
  metadata?: Record<string, any>
): Promise<T> => {
  try {
    // Executa a operação
    const result = await operation();
    
    // Registra o log
    try {
      await addDoc(collection(db, 'operation_logs'), {
        type,
        collection: collectionName,
        documentId,
        timestamp: serverTimestamp(),
        metadata,
      });
    } catch (logError) {
      console.error('Error logging operation:', logError);
    }
    
    return result;
  } catch (error) {
    throw error;
  }
};
