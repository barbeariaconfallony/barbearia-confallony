import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface CreatePixPaymentRequest {
  transaction_amount: number;
  description: string;
  payment_method_id: 'pix';
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
    console.log('=== Iniciando criação de pagamento PIX ===');
    const { transaction_amount, description, payer } = await req.json() as CreatePixPaymentRequest

    console.log('Dados recebidos:', {
      transaction_amount,
      description,
      payer: { email: payer?.email }
    });

    // Validações básicas
    if (!transaction_amount || !description || !payer) {
      console.error('Dados obrigatórios faltando');
      return new Response(
        JSON.stringify({ error: 'Dados obrigatórios não fornecidos' }),
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

    // Dados do pagamento
    const paymentData = {
      transaction_amount: Number(transaction_amount),
      description,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        identification: {
          type: payer.identification.type,
          number: payer.identification.number
        }
      }
    }

    console.log('Criando pagamento:', { ...paymentData, payer: { email: payer.email } })

    // Chamada para API do Mercado Pago
    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentData)
    })

    console.log('Status da resposta MP:', response.status);

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro da API Mercado Pago:', errorData)
      
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
    console.log('Pagamento criado com sucesso:', result.id)

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