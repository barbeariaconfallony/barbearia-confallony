import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, data } = body

    console.log('Webhook recebido:', { type, data })

    if (type === 'payment') {
      // Get access token from environment
      const accessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
      if (!accessToken) {
        console.error('Access token não configurado')
        return new Response('OK', { 
          status: 200, 
          headers: corsHeaders 
        })
      }

      try {
        // Buscar dados atualizados do pagamento
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const paymentInfo = await response.json()
          console.log('Pagamento atualizado via webhook:', {
            id: paymentInfo.id,
            status: paymentInfo.status,
            amount: paymentInfo.transaction_amount
          })

          // Aqui você pode:
          // 1. Salvar no banco de dados
          // 2. Enviar email de confirmação
          // 3. Atualizar status do agendamento
          // 4. Notificar via real-time (Supabase Realtime)

          // Exemplo: inserir log no Supabase
          // const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
          // const supabase = createClient(...)
          // await supabase.from('payment_logs').insert({...})
          
        } else {
          console.error('Erro ao buscar dados do pagamento:', response.status)
        }
      } catch (error) {
        console.error('Erro ao processar webhook:', error)
      }
    }

    // Sempre retornar 200 para o Mercado Pago
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response('OK', { 
      status: 200, 
      headers: corsHeaders 
    })
  }
})