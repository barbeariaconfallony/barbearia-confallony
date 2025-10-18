-- Alterar tabela payment_queue para aceitar Firebase UID como texto
-- Isso permite usar Firebase Auth em vez de Supabase Auth

-- 1. Primeiro, criar uma nova coluna temporária para o Firebase UID
ALTER TABLE public.payment_queue 
ADD COLUMN firebase_uid text;

-- 2. Remover a constraint de NOT NULL do user_id atual (será deprecado)
ALTER TABLE public.payment_queue 
ALTER COLUMN user_id DROP NOT NULL;

-- 3. Adicionar constraint para garantir que pelo menos um ID está presente
ALTER TABLE public.payment_queue
ADD CONSTRAINT check_user_identification 
CHECK (user_id IS NOT NULL OR firebase_uid IS NOT NULL);

-- 4. Atualizar RLS policies para aceitar Firebase UID também
DROP POLICY IF EXISTS "Users can create payment queue entries" ON public.payment_queue;
DROP POLICY IF EXISTS "Users can view their own payment queue" ON public.payment_queue;

-- Nova policy para INSERT (permite criar com firebase_uid)
CREATE POLICY "Users can create payment queue entries"
ON public.payment_queue
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR 
  firebase_uid IS NOT NULL
);

-- Nova policy para SELECT (permite ver com firebase_uid)
CREATE POLICY "Users can view their own payment queue"
ON public.payment_queue
FOR SELECT
USING (
  auth.uid() = user_id OR
  firebase_uid IS NOT NULL
);

-- Comentário explicativo
COMMENT ON COLUMN public.payment_queue.firebase_uid IS 'Firebase UID do usuário (usado quando não há autenticação Supabase)';