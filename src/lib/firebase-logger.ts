import { collection, addDoc, serverTimestamp, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type OperationType = 'read' | 'write' | 'delete';

// Função global para logging de operações
export const logFirebaseOperation = async (
  type: OperationType,
  collectionName: string,
  documentId?: string,
  metadata?: Record<string, any>
) => {
  try {
    await addDoc(collection(db, 'operation_logs'), {
      type,
      collection: collectionName,
      documentId,
      timestamp: serverTimestamp(),
      metadata,
    });
  } catch (error) {
    console.error('Error logging operation:', error);
  }
};

// Wrapper para getDocs com logging automático
export const getDocsWithLogging = async (q: any, collectionName: string) => {
  const result = await getDocs(q);
  
  // Log a operação de leitura
  logFirebaseOperation('read', collectionName, undefined, {
    documentCount: result.size,
    queryType: 'collection',
  });
  
  return result;
};

// Wrapper para addDoc com logging automático
export const addDocWithLogging = async (
  collectionRef: any,
  data: any,
  collectionName: string
) => {
  const result = await addDoc(collectionRef, data);
  
  // Log a operação de escrita
  logFirebaseOperation('write', collectionName, result.id, {
    operation: 'add',
  });
  
  return result;
};

// Wrapper para setDoc com logging automático
export const setDocWithLogging = async (
  docRef: any,
  data: any,
  collectionName: string,
  documentId: string
) => {
  await setDoc(docRef, data);
  
  // Log a operação de escrita
  logFirebaseOperation('write', collectionName, documentId, {
    operation: 'set',
  });
};
