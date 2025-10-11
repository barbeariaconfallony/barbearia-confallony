import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Suportar tanto GET com ID no path quanto POST com body
    let paymentId: string | null = null;

    if (req.method === 'GET') {
      // Método original: ID na URL
      const url = new URL(req.url)
      paymentId = url.pathname.split('/').pop() || null
    } else if (req.method === 'POST') {
      // Novo método: ID no body
      const body = await req.json()
      paymentId = body.paymentId
    }

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'ID do pagamento não fornecido' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get access token from environment
    const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Credenciais do Mercado Pago não configuradas' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Verificando status do pagamento:', paymentId)

    // Chamada para API do Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Erro ao verificar status:', errorData)
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao verificar status no Mercado Pago',
          details: errorData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = await response.json()
    console.log('Status verificado:', { id: result.id, status: result.status })

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