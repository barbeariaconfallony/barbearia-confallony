// EXEMPLO DE USO DO SISTEMA DE LOGGING
// Este arquivo mostra como migrar operações existentes para usar o sistema de logging

import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { logFirebaseOperation } from '@/lib/firebase-logger';

// ========================================
// EXEMPLO 1: Buscar documentos com logging
// ========================================

export const fetchUsuariosWithLogging = async () => {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const snapshot = await getDocs(usuariosRef);
    
    // Registrar a operação de leitura
    await logFirebaseOperation('read', 'usuarios', undefined, {
      documentCount: snapshot.size,
      operation: 'fetchAll',
    });
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 2: Buscar com query e logging
// ========================================

export const fetchUsuariosAtivosWithLogging = async () => {
  try {
    const q = query(
      collection(db, 'usuarios'),
      where('ativo', '==', true)
    );
    
    const snapshot = await getDocs(q);
    
    // Registrar a operação de leitura com query
    await logFirebaseOperation('read', 'usuarios', undefined, {
      documentCount: snapshot.size,
      operation: 'query',
      filter: 'ativo=true',
    });
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching active usuarios:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 3: Adicionar documento com logging
// ========================================

export const addUsuarioWithLogging = async (userData: any) => {
  try {
    const usuariosRef = collection(db, 'usuarios');
    const docRef = await addDoc(usuariosRef, userData);
    
    // Registrar a operação de escrita
    await logFirebaseOperation('write', 'usuarios', docRef.id, {
      operation: 'add',
      hasEmail: !!userData.email,
      hasNome: !!userData.nome,
    });
    
    return docRef;
  } catch (error) {
    console.error('Error adding usuario:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 4: Atualizar documento com logging
// ========================================

export const updateUsuarioWithLogging = async (userId: string, updates: any) => {
  try {
    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, updates);
    
    // Registrar a operação de escrita
    await logFirebaseOperation('write', 'usuarios', userId, {
      operation: 'update',
      fieldsUpdated: Object.keys(updates),
    });
    
    return true;
  } catch (error) {
    console.error('Error updating usuario:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 5: Deletar documento com logging
// ========================================

export const deleteUsuarioWithLogging = async (userId: string) => {
  try {
    const userRef = doc(db, 'usuarios', userId);
    await deleteDoc(userRef);
    
    // Registrar a operação de exclusão
    await logFirebaseOperation('delete', 'usuarios', userId, {
      operation: 'delete',
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting usuario:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 6: Operação em lote com logging
// ========================================

export const fetchMultipleCollectionsWithLogging = async () => {
  try {
    const [usuarios, servicos, produtos] = await Promise.all([
      getDocs(collection(db, 'usuarios')),
      getDocs(collection(db, 'servicos')),
      getDocs(collection(db, 'produtos')),
    ]);
    
    // Registrar todas as operações de leitura
    await Promise.all([
      logFirebaseOperation('read', 'usuarios', undefined, {
        documentCount: usuarios.size,
        operation: 'batch',
      }),
      logFirebaseOperation('read', 'servicos', undefined, {
        documentCount: servicos.size,
        operation: 'batch',
      }),
      logFirebaseOperation('read', 'produtos', undefined, {
        documentCount: produtos.size,
        operation: 'batch',
      }),
    ]);
    
    return {
      usuarios: usuarios.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      servicos: servicos.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      produtos: produtos.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    };
  } catch (error) {
    console.error('Error fetching multiple collections:', error);
    throw error;
  }
};

// ========================================
// EXEMPLO 7: Wrapper genérico reutilizável
// ========================================

export const withLogging = async <T>(
  operation: () => Promise<T>,
  type: 'read' | 'write' | 'delete',
  collectionName: string,
  documentId?: string,
  metadata?: Record<string, any>
): Promise<T> => {
  try {
    // Executar operação
    const result = await operation();
    
    // Registrar log (não await para não bloquear)
    logFirebaseOperation(type, collectionName, documentId, metadata).catch(err => {
      console.error('Failed to log operation:', err);
    });
    
    return result;
  } catch (error) {
    throw error;
  }
};

// Uso do wrapper:
// const usuarios = await withLogging(
//   () => getDocs(collection(db, 'usuarios')),
//   'read',
//   'usuarios',
//   undefined,
//   { operation: 'fetchAll' }
// );
