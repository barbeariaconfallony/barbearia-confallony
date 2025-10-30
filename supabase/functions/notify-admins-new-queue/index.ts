import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

interface NewQueueNotificationPayload {
  clienteNome: string;
  servicoNome: string;
  dataAgendamento: string;
  appointmentId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { clienteNome, servicoNome, dataAgendamento, appointmentId }: NewQueueNotificationPayload = await req.json();

    if (!clienteNome || !servicoNome || !dataAgendamento) {
      return new Response(
        JSON.stringify({ error: 'clienteNome, servicoNome e dataAgendamento são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📱 Iniciando notificação de novo agendamento:', { clienteNome, servicoNome, dataAgendamento });

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Credenciais do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar todos os usuários com role 'dono'
    console.log('🔍 Buscando administradores...');
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'dono');

    if (rolesError) {
      console.error('❌ Erro ao buscar admins:', rolesError);
      throw new Error(`Erro ao buscar administradores: ${rolesError.message}`);
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log('⚠️ Nenhum administrador encontrado');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum administrador encontrado para notificar',
          adminsFound: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminIds = adminRoles.map(role => role.user_id);
    console.log(`✅ ${adminIds.length} administrador(es) encontrado(s)`);

    // 2. Buscar tokens FCM de todos os admins no Firestore
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
    const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
    
    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      throw new Error('Credenciais do Firebase não configuradas');
    }

    console.log('🔍 Buscando tokens FCM dos admins...');
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/device_tokens`;
    
    // Buscar tokens para cada admin
    const allTokens: string[] = [];
    for (const adminId of adminIds) {
      try {
        const tokensResponse = await fetch(
          `${firestoreUrl}?pageSize=100`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (tokensResponse.ok) {
          const tokensData = await tokensResponse.json();
          const adminTokens = tokensData.documents
            ?.filter((doc: any) => doc.fields.userId?.stringValue === adminId)
            .map((doc: any) => doc.fields.token?.stringValue)
            .filter(Boolean) || [];
          
          allTokens.push(...adminTokens);
          console.log(`📱 Admin ${adminId}: ${adminTokens.length} token(s) encontrado(s)`);
        }
      } catch (error) {
        console.error(`⚠️ Erro ao buscar tokens do admin ${adminId}:`, error);
      }
    }

    if (allTokens.length === 0) {
      console.log('⚠️ Nenhum token FCM encontrado para os admins');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Admins encontrados mas nenhum token FCM registrado',
          adminsFound: adminIds.length,
          tokensFound: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Total de ${allTokens.length} token(s) encontrado(s)`);

    // 3. Preparar dados da notificação
    const title = '🔔 Novo Agendamento na Fila';
    const body = `${clienteNome} - ${servicoNome} - ${dataAgendamento}`;
    const notificationData = {
      appointment_id: appointmentId,
      cliente_nome: clienteNome,
      servico_nome: servicoNome,
      data_agendamento: dataAgendamento,
      type: 'new_queue_item',
      deeplink: '/queue'
    };

    // 4. Enviar notificações via FCM
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    
    if (!FCM_SERVER_KEY) {
      throw new Error('FCM_SERVER_KEY não configurado');
    }

    console.log('📤 Enviando notificações...');
    const results = await Promise.allSettled(
      allTokens.map(async (token: string) => {
        const message = {
          to: token,
          notification: {
            title: title,
            body: body,
            icon: '/favicon.png',
            badge: '/favicon.png',
            sound: 'default',
            priority: 'high',
          },
          data: notificationData,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'agendamentos',
            }
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: title,
                  body: body,
                },
                sound: 'default',
                badge: 1,
              }
            }
          }
        };

        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${FCM_SERVER_KEY}`,
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Erro FCM: ${error}`);
        }

        return await response.json();
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Notificações enviadas: ${successCount} sucesso, ${failureCount} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        adminsFound: adminIds.length,
        tokensFound: allTokens.length,
        sent: successCount,
        failed: failureCount,
        message: `Notificações enviadas para ${adminIds.length} admin(s)`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao notificar admins:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
