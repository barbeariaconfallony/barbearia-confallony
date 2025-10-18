import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { corsHeaders } from '../_shared/cors.ts';

interface BroadcastNotificationPayload {
  title: string;
  body: string;
  adminUserId: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body, adminUserId }: BroadcastNotificationPayload = await req.json();

    if (!title || !body || !adminUserId) {
      return new Response(
        JSON.stringify({ error: 'title, body e adminUserId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📢 Iniciando broadcast de notificação:', { title, body, adminUserId });

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Credenciais do Supabase não configuradas');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar se quem está enviando é admin
    console.log('🔍 Verificando se usuário é admin...');
    const { data: adminCheck, error: adminError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUserId)
      .eq('role', 'admin')
      .single();

    if (adminError || !adminCheck) {
      console.error('❌ Usuário não é admin:', adminError);
      return new Response(
        JSON.stringify({ error: 'Acesso negado: usuário não é administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Usuário é admin, prosseguindo...');

    // Buscar todos os usuários (exceto admins)
    console.log('🔍 Buscando usuários não-admin...');
    const { data: adminIds, error: adminIdsError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (adminIdsError) {
      console.error('❌ Erro ao buscar admins:', adminIdsError);
      throw new Error(`Erro ao buscar administradores: ${adminIdsError.message}`);
    }

    const adminUserIds = adminIds?.map(a => a.user_id) || [];
    console.log(`📋 ${adminUserIds.length} admin(s) encontrado(s)`);

    // Buscar todos os tokens FCM do Firebase (exceto de admins)
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
    const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
    
    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      throw new Error('Credenciais do Firebase não configuradas');
    }

    console.log('🔍 Buscando tokens FCM de todos os usuários...');
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/device_tokens`;
    
    const tokensResponse = await fetch(
      `${firestoreUrl}?pageSize=1000`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!tokensResponse.ok) {
      throw new Error('Erro ao buscar tokens do Firestore');
    }

    const tokensData = await tokensResponse.json();
    
    // Filtrar tokens de usuários não-admin
    const userTokens = tokensData.documents
      ?.filter((doc: any) => {
        const userId = doc.fields.userId?.stringValue;
        return userId && !adminUserIds.includes(userId);
      })
      .map((doc: any) => doc.fields.token?.stringValue)
      .filter(Boolean) || [];

    console.log(`✅ ${userTokens.length} token(s) de usuários encontrado(s)`);

    if (userTokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum usuário com token FCM registrado',
          sent: 0,
          failed: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificações via FCM
    const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
    
    if (!FCM_SERVER_KEY) {
      throw new Error('FCM_SERVER_KEY não configurado');
    }

    console.log('📤 Enviando notificações em massa...');
    const results = await Promise.allSettled(
      userTokens.map(async (token: string) => {
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
          data: {
            type: 'broadcast',
            timestamp: new Date().toISOString(),
          },
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'broadcasts',
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

    console.log(`✅ Broadcast concluído: ${successCount} sucesso, ${failureCount} falhas`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        totalTokens: userTokens.length,
        message: `Notificação enviada para ${successCount} usuário(s)`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar broadcast:', error);
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
