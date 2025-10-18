interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 8000,
  backoffMultiplier: 2
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
  let delay = finalConfig.initialDelayMs;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Se não é um erro retryable, não tentar novamente
      if (!isRetryableError(error)) {
        console.error('Erro não retryable:', error);
        throw error;
      }

      // Se foi a última tentativa, lançar o erro
      if (attempt === finalConfig.maxAttempts) {
        console.error(`Falhou após ${attempt} tentativas:`, error);
        throw error;
      }

      // Log da tentativa
      console.log(`Tentativa ${attempt} falhou. Aguardando ${delay}ms antes da próxima tentativa...`);
      
      // Aguardar com backoff exponencial
      await sleep(delay);
      
      // Calcular próximo delay (com cap no máximo)
      delay = Math.min(delay * finalConfig.backoffMultiplier, finalConfig.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed without error');
}

function isRetryableError(error: any): boolean {
  // Verificar se é um erro de fetch
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Verificar status codes retryable (429, 503, 504)
  if (error.status) {
    const retryableStatusCodes = [429, 503, 504, 502];
    return retryableStatusCodes.includes(error.status);
  }

  // Verificar resposta HTTP
  if (error.response) {
    const status = error.response.status;
    const retryableStatusCodes = [429, 503, 504, 502];
    return retryableStatusCodes.includes(status);
  }

  // Por padrão, não retry
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
