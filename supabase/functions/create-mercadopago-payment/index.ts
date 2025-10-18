import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'

interface CreatePaymentRequest {
  firebase_uid: string; // UID do Firebase Auth
  transaction_amount: number;
  description: string;
  payment_method_id: string;
  installments?: number;
  card_token?: string;
  issuer_id?: string;
  payer: {
    email: string;
    first_name: string;
    last_name: string;
    identification: {
      type: 'CPF';
      number: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== Iniciando criação de pagamento Mercado Pago (Firebase Auth) ===');
    
    const requestData = await req.json() as CreatePaymentRequest
    const { firebase_uid } = requestData;

    // Validar que firebase_uid foi fornecido
    if (!firebase_uid || typeof firebase_uid !== 'string' || firebase_uid.trim() === '') {
      console.error('Firebase UID não fornecido ou inválido');
      return new Response(
        JSON.stringify({ error: 'Firebase UID é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Firebase UID recebido:', firebase_uid);

    // Verificar rate limit usando Firebase UID (10 tentativas por minuto)
    const rateLimitResult = await checkRateLimit({
      identifier: firebase_uid,
      endpoint: 'create-mercadopago-payment',
      maxRequests: 10,
      windowMs: 60000 // 1 minuto
    });

    if (!rateLimitResult.allowed) {
      console.log(`Rate limit excedido para usuário Firebase ${firebase_uid}`);
      return new Response(
        JSON.stringify({ 
          error: 'Muitas tentativas. Aguarde um momento e tente novamente.',
          resetAt: rateLimitResult.resetAt
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString()
          } 
        }
      );
    }
    const { 
      transaction_amount, 
      description, 
      payment_method_id,
      installments,
      card_token,
      issuer_id,
      payer 
    } = requestData;

    console.log('Dados recebidos:', {
      transaction_amount,
      description,
      payment_method_id,
      installments,
      has_card_token: !!card_token,
      issuer_id,
      payer: { email: payer?.email }
    });

    // Validações básicas
    if (!transaction_amount || !description || !payer || !payment_method_id) {
      console.error('Dados obrigatórios faltando');
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios não fornecidos' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validar valor mínimo (Mercado Pago exige mínimo de R$ 1.00 para cartões)
    const minAmount = payment_method_id === 'pix' ? 0.01 : 1.00;
    if (Number(transaction_amount) < minAmount) {
      console.error(`Valor abaixo do mínimo permitido. Mínimo: R$ ${minAmount}`);
      return new Response(
        JSON.stringify({ 
          error: `Valor mínimo para ${payment_method_id === 'pix' ? 'PIX' : 'cartão'} é R$ ${minAmount.toFixed(2)}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Para cartão, validar card_token
    if (payment_method_id !== 'pix' && !card_token) {
      console.error('Card token não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token do cartão é obrigatório para pagamento com cartão' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get access token from environment
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
      return new Response(
        JSON.stringify({ error: 'Credenciais do Mercado Pago não configuradas' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Token encontrado, preparando pagamento...');

    // Garantir formato correto do valor (número com 2 decimais)
    const amount = Math.round(Number(transaction_amount) * 100) / 100;
    
    console.log('Valor processado:', { 
      original: transaction_amount, 
      parsed: amount,
      type: typeof amount,
      formatted: amount.toFixed(2)
    });

    let paymentData: any = {
      transaction_amount: amount,
      description: String(description),
      payment_method_id: String(payment_method_id),
      payer: {
        email: String(payer.email),
        first_name: String(payer.first_name),
        last_name: String(payer.last_name),
        identification: {
          type: String(payer.identification.type),
          number: String(payer.identification.number)
        }
      }
    };

    // Se for cartão, adicionar token, parcelas e issuer
    if (payment_method_id !== 'pix') {
      if (!installments) {
        return new Response(
          JSON.stringify({ error: 'Número de parcelas é obrigatório para pagamento com cartão' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      paymentData = {
        ...paymentData,
        installments: installments,
        token: card_token,
      };

      // Adicionar issuer_id APENAS se for uma string válida e não vazia
      if (issuer_id && typeof issuer_id === 'string' && issuer_id.trim() !== '') {
        paymentData.issuer_id = issuer_id;
        console.log('Issuer ID adicionado:', issuer_id);
      } else {
        console.log('Prosseguindo sem issuer_id');
      }

      console.log('Pagamento com cartão configurado');
    }

    console.log('Criando pagamento:', { 
      ...paymentData, 
      payer: { email: payer.email },
      token: card_token ? '[HIDDEN]' : undefined
    });

    // Gerar idempotency key única
    const idempotencyKey = crypto.randomUUID();

    // Salvar na fila antes de processar
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: queueEntry, error: queueError } = await supabaseAdmin
      .from('payment_queue')
      .insert({
        firebase_uid: firebase_uid,
        payment_type: 'card',
        payment_data: paymentData,
        idempotency_key: idempotencyKey,
        status: 'processing'
      })
      .select()
      .single();

    if (queueError) {
      console.error('Erro ao salvar na fila:', queueError);
      // Continuar mesmo com erro na fila
    }

    // Chamada para API do Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey
      },
      body: JSON.stringify(paymentData)
    })

    console.log('Status da resposta MP:', response.status);

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro da API Mercado Pago:', errorData)
      
      // Atualizar fila como falha
      if (queueEntry) {
        await supabaseAdmin
          .from('payment_queue')
          .update({ 
            status: 'failed',
            last_error: errorData,
            completed_at: new Date().toISOString()
          })
          .eq('id', queueEntry.id);
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar pagamento no Mercado Pago',
          details: errorData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await response.json()
    console.log('Pagamento criado com sucesso:', result.id, 'Status:', result.status)

    // Atualizar fila como completo
    if (queueEntry) {
      await supabaseAdmin
        .from('payment_queue')
        .update({ 
          status: 'completed',
          mercadopago_payment_id: result.id,
          completed_at: new Date().toISOString()
        })
        .eq('id', queueEntry.id);
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro interno:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
