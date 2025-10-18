import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Agendamento {
  id: string;
  servico_nome: string;
  data: Date;
  funcionario_nome?: string;
}

// Intervalos de tempo para notificações (em minutos)
const NOTIFICATION_INTERVALS = [120, 60, 30, 15]; // 2h, 1h, 30min, 15min

export const useAppointmentReminders = (agendamentos: Agendamento[]) => {
  useEffect(() => {
    const scheduleReminders = async () => {
      // Só funciona em plataformas nativas
      if (!Capacitor.isNativePlatform()) {
        console.log('Lembretes de agendamento disponíveis apenas em dispositivos móveis');
        return;
      }

      try {
        // Verificar permissões
        const permissions = await LocalNotifications.checkPermissions();
        if (permissions.display !== 'granted') {
          console.log('Permissão para notificações não concedida');
          return;
        }

        // Cancelar todas as notificações pendentes anteriores
        const pending = await LocalNotifications.getPending();
        if (pending.notifications.length > 0) {
          await LocalNotifications.cancel({
            notifications: pending.notifications
          });
        }

        // Criar notificações para cada agendamento
        const now = new Date();
        const notificationsToSchedule: any[] = [];

        agendamentos.forEach((agendamento) => {
          const appointmentTime = new Date(agendamento.data);
          
          // Só agendar para agendamentos futuros
          if (appointmentTime > now) {
            NOTIFICATION_INTERVALS.forEach((minutesBefore) => {
              const notificationTime = new Date(appointmentTime.getTime() - minutesBefore * 60 * 1000);
              
              // Só agendar se a notificação for no futuro
              if (notificationTime > now) {
                const timeText = minutesBefore >= 60 
                  ? `${minutesBefore / 60} ${minutesBefore === 60 ? 'hora' : 'horas'}`
                  : `${minutesBefore} minutos`;

                notificationsToSchedule.push({
                  title: '⏰ Lembrete de Atendimento',
                  body: `Faltam ${timeText} para seu ${agendamento.servico_nome}${agendamento.funcionario_nome ? ` com ${agendamento.funcionario_nome}` : ''}`,
                  id: parseInt(`${agendamento.id.substring(0, 8).replace(/\D/g, '')}${minutesBefore}`),
                  schedule: { 
                    at: notificationTime,
                    allowWhileIdle: true 
                  },
                  sound: 'default',
                  extra: {
                    agendamentoId: agendamento.id,
                    minutesBefore: minutesBefore,
                    appointmentTime: appointmentTime.toISOString()
                  }
                });
              }
            });
          }
        });

        // Agendar todas as notificações
        if (notificationsToSchedule.length > 0) {
          await LocalNotifications.schedule({
            notifications: notificationsToSchedule
          });
          
          console.log(`${notificationsToSchedule.length} lembretes agendados com sucesso`);
        }

      } catch (error) {
        console.error('Erro ao agendar lembretes:', error);
      }
    };

    scheduleReminders();

    // Cleanup: cancelar notificações quando o componente desmontar
    return () => {
      if (Capacitor.isNativePlatform()) {
        LocalNotifications.getPending().then((pending) => {
          if (pending.notifications.length > 0) {
            LocalNotifications.cancel({
              notifications: pending.notifications
            });
          }
        }).catch(console.error);
      }
    };
  }, [agendamentos]);
};
