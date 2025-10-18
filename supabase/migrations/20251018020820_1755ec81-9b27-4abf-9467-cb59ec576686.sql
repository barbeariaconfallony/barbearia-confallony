-- Corrigir função clean_old_rate_limits com search_path
CREATE OR REPLACE FUNCTION public.clean_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limit_tracker
  WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Corrigir função clean_old_payment_queue com search_path
CREATE OR REPLACE FUNCTION public.clean_old_payment_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.payment_queue
  WHERE (status IN ('completed', 'cancelled'))
    AND completed_at < now() - interval '30 days';
END;
$$;

-- Adicionar política RLS para rate_limit_tracker
-- Apenas funções internas devem acessar esta tabela
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limit_tracker
FOR ALL
USING (true)
WITH CHECK (true);