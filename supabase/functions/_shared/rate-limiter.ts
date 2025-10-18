import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
  endpoint: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const windowStart = new Date(Date.now() - config.windowMs);

  // Buscar registros de rate limit para este identificador e endpoint
  const { data: existingLimits, error: fetchError } = await supabase
    .from('rate_limit_tracker')
    .select('*')
    .eq('identifier', config.identifier)
    .eq('endpoint', config.endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error('Erro ao buscar rate limit:', fetchError);
    // Em caso de erro, permitir a requisição (fail open)
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(Date.now() + config.windowMs)
    };
  }

  // Se não há registro ou está expirado, criar novo
  if (!existingLimits || existingLimits.length === 0) {
    const { error: insertError } = await supabase
      .from('rate_limit_tracker')
      .insert({
        identifier: config.identifier,
        endpoint: config.endpoint,
        request_count: 1,
        window_start: new Date().toISOString()
      });

    if (insertError) {
      console.error('Erro ao criar rate limit:', insertError);
    }

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(Date.now() + config.windowMs)
    };
  }

  const currentLimit = existingLimits[0];
  const currentCount = currentLimit.request_count;

  // Verificar se excedeu o limite
  if (currentCount >= config.maxRequests) {
    const resetAt = new Date(new Date(currentLimit.window_start).getTime() + config.windowMs);
    return {
      allowed: false,
      remaining: 0,
      resetAt
    };
  }

  // Incrementar contador
  const { error: updateError } = await supabase
    .from('rate_limit_tracker')
    .update({ request_count: currentCount + 1 })
    .eq('id', currentLimit.id);

  if (updateError) {
    console.error('Erro ao atualizar rate limit:', updateError);
  }

  return {
    allowed: true,
    remaining: config.maxRequests - (currentCount + 1),
    resetAt: new Date(new Date(currentLimit.window_start).getTime() + config.windowMs)
  };
}
