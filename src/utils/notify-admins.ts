import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotifyAdminsParams {
  clienteNome: string;
  servicoNome: string;
  dataAgendamento: Date;
  appointmentId: string;
}

/**
 * Envia notificações push para todos os administradores
 * quando um novo agendamento é adicionado à fila
 */
export const notifyAdminsNewQueue = async ({
  clienteNome,
  servicoNome,
  dataAgendamento,
  appointmentId
}: NotifyAdminsParams): Promise<void> => {
  try {
    console.log('📱 Notificando admins sobre novo agendamento:', {
      clienteNome,
      servicoNome,
      dataAgendamento,
      appointmentId
    });

    // Formatar data/hora para português
    const dataFormatada = format(dataAgendamento, "dd/MM 'às' HH:mm", { locale: ptBR });

    // Chamar edge function para notificar admins
    const { data, error } = await supabase.functions.invoke('notify-admins-new-queue', {
      body: {
        clienteNome,
        servicoNome,
        dataAgendamento: dataFormatada,
        appointmentId
      }
    });

    if (error) {
      console.error('❌ Erro ao notificar admins:', error);
      // Não lançar erro para não bloquear o fluxo principal
      return;
    }

    console.log('✅ Admins notificados com sucesso:', data);
  } catch (error) {
    console.error('❌ Erro inesperado ao notificar admins:', error);
    // Não lançar erro para não bloquear o fluxo principal
  }
};
