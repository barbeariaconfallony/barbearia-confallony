import { corsHeaders } from '../_shared/cors.ts';

/**
 * Edge Function para agendar lembretes de agendamentos
 * Executa periodicamente (via cron) para verificar agendamentos próximos
 * e enviar notificações push automáticas
 */

interface Agendamento {
  id: string;
  usuario_id: string;
  usuario_nome: string;
  servico_nome: string;
  funcionario_nome?: string;
  sala_atendimento?: string;
  data: string;
}

// Configurações de antecedência para lembretes (em minutos)
const REMINDER_INTERVALS = [1440, 120, 60, 30, 15]; // 1 dia, 2h, 1h, 30min, 15min

async function sendPushNotification(userId: string, title: string, body: string, data?: any) {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      userId,
      title,
      body,
      data,
    }),
  });

  return await response.json();
}

async function getUpcomingAppointments() {
  const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID');
  const FIREBASE_API_KEY = Deno.env.get('FIREBASE_API_KEY');
  
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
    throw new Error('Credenciais do Firebase não configuradas');
  }

  const now = new Date();
  const maxTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Próximas 24 horas

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/agendamentos`;
  
  const response = await fetch(firestoreUrl, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIREBASE_API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erro ao buscar agendamentos');
  }

  const data = await response.json();
  
  // Filtrar e transformar agendamentos
  const appointments: Agendamento[] = (data.documents || [])
    .map((doc: any) => {
      const fields = doc.fields;
      return {
        id: doc.name.split('/').pop(),
        usuario_id: fields.usuario_id?.stringValue,
        usuario_nome: fields.usuario_nome?.stringValue,
        servico_nome: fields.servico_nome?.stringValue,
        funcionario_nome: fields.funcionario_nome?.stringValue,
        sala_atendimento: fields.sala_atendimento?.stringValue,
        data: fields.data?.timestampValue,
      };
    })
    .filter((apt: Agendamento) => {
      const aptDate = new Date(apt.data);
      return aptDate > now && aptDate <= maxTime && 
             (apt as any).status !== 'concluido' && 
             (apt as any).status !== 'cancelado';
    });

  return appointments;
}

async function checkAndSendReminders(appointments: Agendamento[]) {
  const now = new Date();
  const results = [];

  for (const appointment of appointments) {
    const appointmentTime = new Date(appointment.data);
    
    for (const minutesBefore of REMINDER_INTERVALS) {
      const reminderTime = new Date(appointmentTime.getTime() - minutesBefore * 60 * 1000);
      const timeDiff = Math.abs(now.getTime() - reminderTime.getTime());
      
      // Se estamos dentro de uma janela de 5 minutos do horário do lembrete
      if (timeDiff < 5 * 60 * 1000) {
        const timeText = minutesBefore >= 60 
          ? `${minutesBefore / 60} ${minutesBefore === 60 ? 'hora' : 'horas'}`
          : `${minutesBefore} minutos`;

        const title = minutesBefore >= 1440 
          ? '📅 Lembrete: Agendamento Amanhã'
          : '⏰ Lembrete: Agendamento Próximo';
          
        const body = minutesBefore >= 1440
          ? `Amanhã você tem ${appointment.servico_nome}${appointment.funcionario_nome ? ` com ${appointment.funcionario_nome}` : ''}`
          : `Faltam ${timeText} para seu ${appointment.servico_nome}${appointment.funcionario_nome ? ` com ${appointment.funcionario_nome}` : ''}`;

        try {
          const result = await sendPushNotification(
            appointment.usuario_id,
            title,
            body,
            {
              agendamentoId: appointment.id,
              tipo: 'lembrete_agendamento',
              minutesBefore,
            }
          );
          
          results.push({
            appointmentId: appointment.id,
            minutesBefore,
            success: true,
            result,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
          results.push({
            appointmentId: appointment.id,
            minutesBefore,
            success: false,
            error: errorMessage,
          });
        }
      }
    }
  }

  return results;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Iniciando verificação de lembretes de agendamentos...');

    // Buscar agendamentos próximos
    const appointments = await getUpcomingAppointments();
    console.log(`Encontrados ${appointments.length} agendamentos nas próximas 24 horas`);

    // Verificar e enviar lembretes
    const results = await checkAndSendReminders(appointments);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verificação de lembretes concluída',
        appointmentsChecked: appointments.length,
        notificationsSent: successCount,
        notificationsFailed: failureCount,
        results,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao processar lembretes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
