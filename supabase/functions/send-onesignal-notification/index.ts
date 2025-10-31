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
      console.log('📧 Enviando para External User IDs:', userIds);
    } else if (playerIds && playerIds.length > 0) {
      notification.include_player_ids = playerIds;
      console.log('📧 Enviando para Player IDs:', playerIds);
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
      notification.ios_attachments = { id: imageUrl };
    }

    // Configurações Android específicas (CRÍTICO para notificações funcionarem!)
    notification.android_channel_id = "default";
    notification.small_icon = "ic_stat_onesignal_default";
    notification.android_accent_color = "FFD700";
    notification.android_sound = "default";
    notification.android_visibility = 1;
    notification.android_led_color = "FFD700";
    notification.android_group = "barbearia_notifications";
    notification.android_group_message = { en: "$[notif_count] novas notificações" };
    
    // Configurações de entrega críticas
    notification.content_available = true; // Wake up em background
    notification.priority = 10; // Prioridade máxima
    notification.ttl = 86400; // 24 horas de validade
    notification.delayed_option = "timezone";
    
    // Configurações iOS para compatibilidade total
    notification.ios_sound = "default";
    notification.ios_badgeType = "Increase";
    notification.ios_badgeCount = 1;
    notification.ios_category = "barbearia_notification";

    console.log('📤 Enviando notificação OneSignal...');
    console.log('📋 Payload completo:', JSON.stringify(notification, null, 2));

    // Enviar notificação via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro OneSignal - Status:', response.status);
      console.error('❌ Resposta completa:', JSON.stringify(result, null, 2));
      throw new Error(`Erro OneSignal (${response.status}): ${JSON.stringify(result)}`);
    }

    console.log('✅ Notificação enviada com sucesso!');
    console.log('📊 ID da notificação:', result.id);
    console.log('📊 Total de destinatários:', result.recipients || 0);
    console.log('📊 Erros por destinatário:', result.errors || 'nenhum');

    // Verificar se há warnings
    if (result.warnings) {
      console.warn('⚠️ Avisos OneSignal:', JSON.stringify(result.warnings, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: result.id,
        recipients: result.recipients || 0,
        warnings: result.warnings || null,
        errors: result.errors || null,
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
