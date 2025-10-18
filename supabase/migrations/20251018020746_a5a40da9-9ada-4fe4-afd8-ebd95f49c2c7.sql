-- Criar tabela de fila de pagamentos
CREATE TABLE IF NOT EXISTS public.payment_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  payment_type text NOT NULL CHECK (payment_type IN ('pix', 'card')),
  payment_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  last_error text,
  mercadopago_payment_id text,
  idempotency_key text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  completed_at timestamptz
);

-- Habilitar RLS
ALTER TABLE public.payment_queue ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: usuários podem ver suas próprias filas
CREATE POLICY "Users can view their own payment queue"
ON public.payment_queue
FOR SELECT
USING (auth.uid() = user_id);

-- Políticas RLS: usuários podem inserir na fila
CREATE POLICY "Users can create payment queue entries"
ON public.payment_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_payment_queue_status ON public.payment_queue(status);
CREATE INDEX idx_payment_queue_user_id ON public.payment_queue(user_id);
CREATE INDEX idx_payment_queue_created_at ON public.payment_queue(created_at);
CREATE INDEX idx_payment_queue_idempotency_key ON public.payment_queue(idempotency_key);

-- Criar tabela de rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- user_id ou IP
  endpoint text NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.rate_limit_tracker ENABLE ROW LEVEL SECURITY;

-- Índice para performance
CREATE INDEX idx_rate_limit_identifier_endpoint ON public.rate_limit_tracker(identifier, endpoint);

-- Função para limpar registros antigos de rate limit (executa automaticamente)
CREATE OR REPLACE FUNCTION clean_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_tracker
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Função para limpar pagamentos antigos completados/cancelados após 30 dias
CREATE OR REPLACE FUNCTION clean_old_payment_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.payment_queue
  WHERE (status IN ('completed', 'cancelled'))
    AND completed_at < now() - interval '30 days';
END;
$$;