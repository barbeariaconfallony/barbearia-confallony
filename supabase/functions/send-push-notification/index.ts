import { corsHeaders } from '../_shared/cors.ts';

interface PushNotificationPayload {
  userIds?: string[]; // Array de user IDs
  userId?: string; // ID único (para compatibilidade)
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

// Função para enviar notificação via FCM
async function sendFCMNotification(token: string, payload: {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}) {
  const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY');
  
  if (!FCM_SERVER_KEY) {
    throw new Error('FCM_SERVER_KEY não configurado');
  }

  const message = {
    to: token,
    notification: {
      title: payload.title,
      body: payload.body,
      icon: '/confallony-logo-icon.png',
      badge: '/favicon.png',
      ...(payload.imageUrl && { image: payload.imageUrl }),
      sound: 'default',
      priority: 'high',
    },
    data: payload.data || {},
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
            title: payload.title,
            body: payload.body,
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
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userIds, userId, title, body, data, imageUrl }: PushNotificationPayload = await req.json();

    // Aceitar tanto userId único quanto array de userIds
    const targetUserIds = userIds || (userId ? [userId] : []);

    if (targetUserIds.length === 0 || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId/userIds, title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Enviando notificação para ${targetUserIds.length} usuário(s)...`);

    // Buscar tokens FCM do usuário no Firebase
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
    const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
    
    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      throw new Error('Credenciais do Firebase não configuradas');
    }

    let allTokens: string[] = [];

    // Buscar tokens para cada usuário
    for (const uid of targetUserIds) {
      try {
        // Buscar tokens do Firestore usando a REST API
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`;
        
        const queryPayload = {
          structuredQuery: {
            from: [{ collectionId: 'device_tokens' }],
            where: {
              fieldFilter: {
                field: { fieldPath: 'userId' },
                op: 'EQUAL',
                value: { stringValue: uid }
              }
            }
          }
        };

        const tokensResponse = await fetch(firestoreUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryPayload)
        });

        if (!tokensResponse.ok) {
          console.error(`❌ Erro ao buscar tokens do usuário ${uid}`);
          continue;
        }

        const tokensData = await tokensResponse.json();
        const userTokens = tokensData
          .filter((item: any) => item.document)
          .map((item: any) => item.document.fields.token.stringValue);
        
        allTokens = [...allTokens, ...userTokens];
        console.log(`✅ ${userTokens.length} token(s) encontrado(s) para usuário ${uid}`);
      } catch (error) {
        console.error(`❌ Erro ao buscar tokens do usuário ${uid}:`, error);
      }
    }

    if (allTokens.length === 0) {
      console.log('⚠️ Nenhum token encontrado');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum token encontrado para os usuários',
          recipients: 0
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 Enviando para ${allTokens.length} dispositivo(s)...`);

    // Enviar notificação para todos os tokens
    const results = await Promise.allSettled(
      allTokens.map((token: string) => 
        sendFCMNotification(token, { title, body, data, imageUrl })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Enviado com sucesso: ${successCount}`);
    console.log(`❌ Falhas: ${failureCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        recipients: successCount,
        totalTokens: allTokens.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao enviar push notification:', error);
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
