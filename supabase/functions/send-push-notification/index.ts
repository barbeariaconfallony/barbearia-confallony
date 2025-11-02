import { corsHeaders } from '../_shared/cors.ts';

interface PushNotificationPayload {
  userIds?: string[]; // Array de user IDs
  userId?: string; // ID único (para compatibilidade)
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Gera OAuth2 Access Token usando Service Account
async function getAccessToken(): Promise<string> {
  const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
  
  if (!serviceAccountJson) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado');
  }

  const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
  
  // Criar JWT para autenticação
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Codificar header e payload em base64url
  const base64url = (source: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(source);
    return btoa(String.fromCharCode(...data))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Importar chave privada para assinar JWT
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const keyData = privateKey
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Assinar JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureArray = new Uint8Array(signature);
  const encodedSignature = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  const jwt = `${unsignedToken}.${encodedSignature}`;

  // Trocar JWT por Access Token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Erro ao obter access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Função para enviar notificação via FCM HTTP v1
async function sendFCMNotification(
  token: string,
  payload: {
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
  },
  accessToken: string,
  projectId: string
) {
  const message = {
    message: {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.imageUrl && { image: payload.imageUrl }),
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'agendamentos',
          icon: 'ic_notification',
        },
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
          },
        },
      },
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: '/confallony-logo-icon.png',
          badge: '/favicon.png',
        },
      },
    },
  };

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erro FCM HTTP v1: ${error}`);
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
      console.error('❌ Parâmetros inválidos:', { userIds, userId, title, body });
      return new Response(
        JSON.stringify({ error: 'userId/userIds, title e body são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('='.repeat(60));
    console.log(`📤 [INÍCIO] Enviando notificação para ${targetUserIds.length} usuário(s)`);
    console.log('📋 Payload:', { title, body, data, imageUrl });
    console.log('👥 User IDs:', targetUserIds);
    console.log('='.repeat(60));
    
    console.log('🔐 [STEP 1/4] Gerando OAuth2 Access Token...');
    const tokenStartTime = Date.now();

    // Gerar Access Token OAuth2
    const accessToken = await getAccessToken();
    console.log(`✅ Access Token gerado em ${Date.now() - tokenStartTime}ms`);

    // Obter Project ID do Service Account
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado');
    }
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountJson);
    const projectId = serviceAccount.project_id;

    console.log(`📋 Projeto Firebase: ${projectId}`);
    console.log('🔍 [STEP 2/4] Buscando tokens FCM no Firestore...');

    let allTokens: string[] = [];
    const userTokenMap: Record<string, string[]> = {};

    // Buscar tokens para cada usuário
    for (const uid of targetUserIds) {
      try {
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;
        
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

        console.log(`  🔎 Buscando tokens para usuário: ${uid}...`);
        const queryStartTime = Date.now();

        const tokensResponse = await fetch(firestoreUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(queryPayload)
        });

        if (!tokensResponse.ok) {
          const errorText = await tokensResponse.text();
          console.error(`  ❌ Erro HTTP ${tokensResponse.status} ao buscar tokens do usuário ${uid}:`, errorText);
          continue;
        }

        const tokensData = await tokensResponse.json();
        const userTokens = tokensData
          .filter((item: any) => item.document)
          .map((item: any) => item.document.fields.token.stringValue);
        
        allTokens = [...allTokens, ...userTokens];
        userTokenMap[uid] = userTokens;
        
        console.log(`  ✅ ${userTokens.length} token(s) encontrado(s) para ${uid} em ${Date.now() - queryStartTime}ms`);
      } catch (error) {
        console.error(`  ❌ Exceção ao buscar tokens do usuário ${uid}:`, error);
      }
    }

    console.log(`📊 Total de tokens encontrados: ${allTokens.length}`);
    console.log('📋 Resumo por usuário:', Object.entries(userTokenMap).map(([uid, tokens]) => 
      `  • ${uid}: ${tokens.length} token(s)`
    ).join('\n'));

    if (allTokens.length === 0) {
      console.log('⚠️ [RESULTADO] Nenhum token FCM encontrado para os usuários');
      console.log('💡 Possíveis causas:');
      console.log('   1. Usuário(s) nunca ativou(aram) notificações');
      console.log('   2. Tokens não foram salvos no Firestore');
      console.log('   3. Collection "device_tokens" não existe');
      console.log('='.repeat(60));
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum token FCM encontrado. Usuário(s) precisa(m) ativar notificações.',
          recipients: 0,
          userTokenMap
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📨 [STEP 3/4] Enviando para ${allTokens.length} dispositivo(s) via FCM HTTP v1...`);
    const sendStartTime = Date.now();

    // Enviar notificação para todos os tokens usando HTTP v1
    const results = await Promise.allSettled(
      allTokens.map((token: string, index: number) => {
        console.log(`  📤 Enviando para dispositivo ${index + 1}/${allTokens.length}...`);
        return sendFCMNotification(token, { title, body, data, imageUrl }, accessToken, projectId);
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;

    console.log(`⏱️ Envio concluído em ${Date.now() - sendStartTime}ms`);
    console.log(`📊 [STEP 4/4] Resultados do envio:`);
    console.log(`  ✅ Sucesso: ${successCount}`);
    console.log(`  ❌ Falhas: ${failureCount}`);

    // Log detalhado de erros
    if (failureCount > 0) {
      console.log('🔍 Detalhes dos erros:');
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`  ❌ Token ${index + 1}:`, result.reason);
        }
      });
    }

    console.log('='.repeat(60));
    console.log(`🎉 [CONCLUÍDO] Notificação enviada com sucesso!`);
    console.log(`📊 Resumo final:`);
    console.log(`   • Total de usuários: ${targetUserIds.length}`);
    console.log(`   • Total de dispositivos: ${allTokens.length}`);
    console.log(`   • Enviados: ${successCount}`);
    console.log(`   • Falhas: ${failureCount}`);
    console.log(`   • Taxa de sucesso: ${((successCount/allTokens.length)*100).toFixed(1)}%`);
    console.log('='.repeat(60));

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        recipients: successCount,
        totalTokens: allTokens.length,
        totalUsers: targetUserIds.length,
        protocol: 'FCM HTTP v1 (OAuth2)',
        userTokenMap,
        details: failureCount > 0 ? 'Verifique os logs para detalhes dos erros' : 'Todas as notificações foram enviadas com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('='.repeat(60));
    console.error('❌ [ERRO FATAL] Exceção ao enviar push notification');
    console.error('Tipo:', error instanceof Error ? error.name : typeof error);
    console.error('Mensagem:', error instanceof Error ? error.message : error);
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A');
    console.error('='.repeat(60));
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        hint: 'Verifique: 1) FIREBASE_SERVICE_ACCOUNT_JSON configurado, 2) Permissões do Service Account, 3) Firebase Messaging API ativada'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
