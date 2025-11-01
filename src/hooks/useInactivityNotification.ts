import { useEffect, useRef } from 'react';
import { useCustomNotifications } from './useCustomNotifications';
import { User } from 'firebase/auth';

/**
 * Hook que detecta inatividade e envia notificação após 1 minuto
 * quando usuário sai ou minimiza o navegador
 */
export const useInactivityNotification = (currentUser: User | null) => {
  const { notifyInactivity, isSupported } = useCustomNotifications(currentUser?.uid);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!currentUser || !isSupported) return;

    const scheduleInactivityNotification = () => {
      // Cancelar timer anterior se existir
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Salvar timestamp no localStorage
      localStorage.setItem('last_activity', Date.now().toString());

      // Agendar notificação para 1 minuto
      inactivityTimerRef.current = setTimeout(() => {
        console.log('🔔 Enviando notificação de inatividade...');
        notifyInactivity();
      }, 60 * 1000); // 60 segundos
    };

    const cancelInactivityNotification = () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      localStorage.removeItem('last_activity');
    };

    // Detectar quando usuário sai ou minimiza a aba
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('👋 Usuário saiu/minimizou - agendando notificação');
        scheduleInactivityNotification();
      } else {
        console.log('👀 Usuário voltou - cancelando notificação');
        cancelInactivityNotification();
      }
    };

    // Detectar fechamento do navegador
    const handleBeforeUnload = () => {
      scheduleInactivityNotification();
    };

    // Registrar listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Verificar se passou mais de 1 minuto desde a última atividade ao carregar
    const lastActivity = localStorage.getItem('last_activity');
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity);
      if (elapsed < 60000) {
        // Menos de 1 minuto, cancelar notificação pendente
        cancelInactivityNotification();
      }
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cancelInactivityNotification();
    };
  }, [currentUser, isSupported, notifyInactivity]);
};
