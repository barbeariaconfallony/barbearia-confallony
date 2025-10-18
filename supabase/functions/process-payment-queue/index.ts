import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { retryWithBackoff } from '../_shared/retry-handler.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Iniciando processamento de fila de pagamentos ===');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar até 5 pagamentos pendentes
    const { data: pendingPayments, error: fetchError } = await supabase
      .from('payment_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(5);

    if (fetchError) {
      console.error('Erro ao buscar pagamentos pendentes:', fetchError);
      throw fetchError;
    }

    if (!pendingPayments || pendingPayments.length === 0) {
      console.log('Nenhum pagamento pendente na fila');
      return new Response(
        JSON.stringify({ message: 'Nenhum pagamento pendente', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processando ${pendingPayments.length} pagamento(s)`);
    
    const results = await Promise.allSettled(
      pendingPayments.map(payment => processPayment(payment, supabase))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Processamento concluído: ${successful} sucesso, ${failed} falhas`);

    return new Response(
      JSON.stringify({ 
        message: 'Fila processada',
        processed: pendingPayments.length,
        successful,
        failed
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no processamento da fila:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao processar fila de pagamentos' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processPayment(payment: any, supabase: any) {
  const paymentId = payment.id;
  
  try {
    console.log(`Processando pagamento ${paymentId}, tentativa ${payment.attempts + 1}`);
    
    // Marcar como processando
    await supabase
      .from('payment_queue')
      .update({ 
        status: 'processing',
        attempts: payment.attempts + 1,
        processed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    // Processar o pagamento com retry
    const result = await retryWithBackoff(async () => {
      return await callMercadoPagoAPI(payment);
    });

    // Marcar como completado
    await supabase
      .from('payment_queue')
      .update({ 
        status: 'completed',
        mercadopago_payment_id: result.id,
        completed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    console.log(`Pagamento ${paymentId} processado com sucesso: ${result.id}`);
    return result;

  } catch (error: any) {
    console.error(`Erro ao processar pagamento ${paymentId}:`, error);
    
    // Verificar se deve marcar como falho (max tentativas atingido)
    const shouldFail = payment.attempts + 1 >= payment.max_attempts;
    
    await supabase
      .from('payment_queue')
      .update({ 
        status: shouldFail ? 'failed' : 'pending',
        last_error: error.message || String(error),
        ...(shouldFail && { completed_at: new Date().toISOString() })
      })
      .eq('id', paymentId);

    throw error;
  }
}

async function callMercadoPagoAPI(payment: any) {
  const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
  if (!accessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado');
  }

  const paymentData = payment.payment_data;

  console.log('Criando pagamento no Mercado Pago:', payment.payment_type);

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': payment.idempotency_key
    },
    body: JSON.stringify(paymentData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Erro da API Mercado Pago:', errorData);
    
    const error: any = new Error('Erro ao criar pagamento no Mercado Pago');
    error.status = response.status;
    error.details = errorData;
    throw error;
  }

  const result = await response.json();
  console.log('Pagamento criado:', result.id, 'Status:', result.status);
  
  return result;
}
