# Guia do Sistema de Logging do Firebase

## O que foi implementado?

Sistema completo de logging que registra todas as operações do Firebase (leituras, escritas e exclusões) em tempo real.

## Componentes

### 1. Coleções no Firestore

- **`operation_logs`**: Registra cada operação individual
  - `type`: 'read' | 'write' | 'delete'
  - `collection`: nome da coleção
  - `documentId`: ID do documento (opcional)
  - `timestamp`: timestamp da operação
  - `metadata`: dados adicionais

- **`operation_aggregations`**: Agregações diárias das operações
  - `date`: data da agregação
  - `reads`: total de leituras
  - `writes`: total de escritas
  - `deletes`: total de exclusões
  - `collectionStats`: estatísticas por coleção

### 2. Hooks

- **`useFirebaseLogger`**: Hook para registrar operações manualmente
- **`useFirebaseOperationAggregator`**: Agregador automático que roda em background

### 3. Helpers

- **`firebase-logger.ts`**: Funções wrapper para operações com logging automático

## Como usar?

### Método 1: Usar wrappers automáticos (Recomendado)

```typescript
import { getDocsWithLogging, addDocWithLogging } from '@/lib/firebase-logger';
import { collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Em vez de getDocs normal
const snapshot = await getDocsWithLogging(
  collection(db, 'usuarios'),
  'usuarios'
);

// Em vez de addDoc normal
const docRef = await addDocWithLogging(
  collection(db, 'usuarios'),
  userData,
  'usuarios'
);
```

### Método 2: Usar hook manual

```typescript
import { useFirebaseLogger } from '@/hooks/useFirebaseLogger';

const { logOperation } = useFirebaseLogger();

// Registrar manualmente após uma operação
const snapshot = await getDocs(collection(db, 'usuarios'));
await logOperation('read', 'usuarios', undefined, {
  documentCount: snapshot.size
});
```

### Método 3: Usar função global

```typescript
import { logFirebaseOperation } from '@/lib/firebase-logger';

// Registrar uma operação
await logFirebaseOperation('write', 'usuarios', userId, {
  operation: 'update',
  fields: ['nome', 'email']
});
```

## Visualização dos dados

A aba **Banco** no painel Admin agora mostra:

- ✅ Dados reais de operações (não estimativas)
- ✅ Status do sistema de logging em tempo real
- ✅ Gráficos baseados em dados reais
- ✅ Alertas quando próximo dos limites

## Performance

O sistema foi otimizado para não impactar a performance:

1. **Logs assíncronos**: Não bloqueiam operações principais
2. **Agregação periódica**: A cada 5 minutos, evita processar milhares de logs
3. **Fallback inteligente**: Se logging falhar, a operação principal continua
4. **Cache**: Agregações diárias são cacheadas

## Próximos passos

Para começar a usar:

1. O sistema já está ativo no painel Admin
2. Para registrar operações, substitua suas chamadas normais do Firestore pelos wrappers
3. O agregador já está rodando em background automaticamente

## Exemplo completo de migração

**Antes:**
```typescript
const snapshot = await getDocs(collection(db, 'usuarios'));
const newDoc = await addDoc(collection(db, 'usuarios'), userData);
```

**Depois:**
```typescript
import { getDocsWithLogging, addDocWithLogging } from '@/lib/firebase-logger';

const snapshot = await getDocsWithLogging(
  collection(db, 'usuarios'),
  'usuarios'
);

const newDoc = await addDocWithLogging(
  collection(db, 'usuarios'),
  userData,
  'usuarios'
);
```

## Monitoramento

Acesse: **Admin > Aba Banco** para ver:
- Status do sistema de logging
- Operações em tempo real
- Gráficos e estatísticas
- Alertas de limite
