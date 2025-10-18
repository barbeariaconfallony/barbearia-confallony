import { corsHeaders } from '../_shared/cors.ts';

interface PushNotificationPayload {
  userId: string;
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
      icon: '/favicon.png',
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
    const { userId, title, body, data, imageUrl }: PushNotificationPayload = await req.json();

    if (!userId || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'userId, title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar tokens FCM do usuário no Firebase
    const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
    const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
    
    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      throw new Error('Credenciais do Firebase não configuradas');
    }

    // Buscar tokens do Firestore
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/device_tokens`;
    
    const tokensResponse = await fetch(
      `${firestoreUrl}?pageSize=100&orderBy=userId&where=userId=${userId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FIREBASE_API_KEY}`,
        },
      }
    );

    if (!tokensResponse.ok) {
      throw new Error('Erro ao buscar tokens do usuário');
    }

    const tokensData = await tokensResponse.json();
    const tokens = tokensData.documents?.map((doc: any) => 
      doc.fields.token.stringValue
    ) || [];

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum token encontrado para este usuário' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar notificação para todos os tokens do usuário
    const results = await Promise.allSettled(
      tokens.map((token: string) => 
        sendFCMNotification(token, { title, body, data, imageUrl })
      )
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        totalTokens: tokens.length,
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
