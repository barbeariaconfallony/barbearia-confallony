import { corsHeaders } from '../_shared/cors.ts';

interface OneSignalNotificationPayload {
  userIds?: string[];
  playerIds?: string[];
  title: string;
  message: string;
  data?: Record<string, any>;
  url?: string;
  imageUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      userIds, 
      playerIds, 
      title, 
      message, 
      data, 
      url,
      imageUrl 
    }: OneSignalNotificationPayload = await req.json();

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'title e message são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userIds && !playerIds) {
      return new Response(
        JSON.stringify({ error: 'userIds ou playerIds são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_REST_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY');

    console.log('🔑 Verificando credenciais OneSignal...');
    console.log('App ID presente:', !!ONESIGNAL_APP_ID);
    console.log('REST API Key presente:', !!ONESIGNAL_REST_API_KEY);

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
      const errorMsg = `Credenciais OneSignal não configuradas. App ID: ${!!ONESIGNAL_APP_ID}, REST API Key: ${!!ONESIGNAL_REST_API_KEY}`;
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Construir payload da notificação
    const notification: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { en: title },
      contents: { en: message },
      data: data || {},
    };

    // Adicionar destinatários
    if (userIds && userIds.length > 0) {
      notification.include_external_user_ids = userIds;
    } else if (playerIds && playerIds.length > 0) {
      notification.include_player_ids = playerIds;
    }

    // Adicionar URL se fornecida
    if (url) {
      notification.url = url;
    }

    // Adicionar imagem se fornecida
    if (imageUrl) {
      notification.big_picture = imageUrl;
      notification.large_icon = imageUrl;
      notification.chrome_web_image = imageUrl;
    }

    // Configurações adicionais
    notification.android_accent_color = "FFD700"; // Cor dourada
    notification.priority = 10;

    console.log('📤 Enviando notificação OneSignal:', notification);

    // Enviar notificação via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Erro OneSignal:', error);
      throw new Error(`Erro OneSignal: ${error}`);
    }

    const result = await response.json();
    console.log('✅ Notificação enviada com sucesso:', result);

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        recipients: result.recipients,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Erro ao enviar notificação OneSignal:', error);
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
