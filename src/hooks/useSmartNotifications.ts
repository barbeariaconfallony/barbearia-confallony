import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc,
  setDoc,
  limit as firestoreLimit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  SmartNotification, 
  NotificationPreferences, 
  DEFAULT_PREFERENCES,
  NotificationType,
  NOTIFICATION_TYPE_ICONS 
} from '@/types/notifications';
import { differenceInMinutes, differenceInDays, isBefore, addMinutes } from 'date-fns';

export const useSmartNotifications = () => {
  const { currentUser } = useAuth();
  const { showNotification, permission } = useNotifications(currentUser?.uid);
  
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Carregar preferências do usuário
  useEffect(() => {
    if (!currentUser) return;

    const loadPreferences = async () => {
      try {
        const prefDoc = await getDoc(doc(db, 'notification_preferences', currentUser.uid));
        
        if (prefDoc.exists()) {
          setPreferences(prefDoc.data() as NotificationPreferences);
        } else {
          // Criar preferências padrão
          const defaultPrefs: NotificationPreferences = {
            ...DEFAULT_PREFERENCES,
            userId: currentUser.uid,
          };
          await setDoc(doc(db, 'notification_preferences', currentUser.uid), defaultPrefs);
          setPreferences(defaultPrefs);
        }
      } catch (error) {
        console.error('Erro ao carregar preferências:', error);
      }
    };

    loadPreferences();
  }, [currentUser]);

  // Carregar notificações do usuário em tempo real
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);

    // Removido orderBy para evitar erro de índice faltando
    // Vamos ordenar no cliente depois
    const q = query(
      collection(db, 'smart_notifications'),
      where('userId', '==', currentUser.uid),
      firestoreLimit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as SmartNotification;
      });

      // Ordenar por timestamp no cliente (mais recente primeiro)
      const sortedNotifs = notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setNotifications(sortedNotifs);
      setUnreadCount(sortedNotifs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar notificações:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Verificar se está no período "Não Perturbe"
  const isDoNotDisturb = useCallback((): boolean => {
    if (!preferences?.doNotDisturbStart || !preferences?.doNotDisturbEnd) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = preferences.doNotDisturbStart;
    const end = preferences.doNotDisturbEnd;

    // Se o período cruza a meia-noite (ex: 22:00 até 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    
    return currentTime >= start && currentTime < end;
  }, [preferences]);

  // Enviar notificação inteligente
  const sendSmartNotification = useCallback(async (
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, any>
  ) => {
    if (!currentUser || !preferences) return;

    // Verificar se tipo está habilitado
    if (!preferences.enabledTypes[type]) {
      console.log(`[SmartNotifications] Tipo ${type} desabilitado pelo usuário`);
      return;
    }

    // Verificar "Não Perturbe"
    if (isDoNotDisturb()) {
      console.log('[SmartNotifications] Modo Não Perturbe ativo');
      return;
    }

    try {
      // Salvar no Firestore
      const notificationData = {
        type,
        title,
        body,
        priority: 'normal' as const,
        timestamp: Timestamp.now(),
        read: false,
        userId: currentUser.uid,
        metadata: metadata || {},
      };

      await addDoc(collection(db, 'smart_notifications'), notificationData);

      // Enviar push notification se tiver permissão
      if (permission === 'granted') {
        const icon = NOTIFICATION_TYPE_ICONS[type];
        showNotification({
          title: `${icon} ${title}`,
          body,
          tag: type,
          requireInteraction: type === 'appointment_checkin' || type === 'payment_pending',
        });
      }

      console.log(`[SmartNotifications] Notificação enviada: ${type}`);
    } catch (error) {
      console.error('[SmartNotifications] Erro ao enviar notificação:', error);
    }
  }, [currentUser, preferences, permission, showNotification, isDoNotDisturb]);

  // Marcar notificação como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'smart_notifications', notificationId), {
        read: true,
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(
        unreadNotifs.map(n => updateDoc(doc(db, 'smart_notifications', n.id), { read: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }, [notifications]);

  // Atualizar preferências
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    if (!currentUser) return;

    try {
      const updatedPrefs = { ...preferences, ...newPrefs, userId: currentUser.uid };
      await setDoc(doc(db, 'notification_preferences', currentUser.uid), updatedPrefs);
      setPreferences(updatedPrefs as NotificationPreferences);
    } catch (error) {
      console.error('Erro ao atualizar preferências:', error);
    }
  }, [currentUser, preferences]);

  // ========== CHECKERS DE CONTEXTO ==========

  // Verificar agendamentos próximos e enviar lembretes
  const checkAppointmentReminders = useCallback(async (appointments: any[]) => {
    if (!currentUser) return;

    for (const appointment of appointments) {
      if (appointment.status !== 'aguardando_confirmacao') continue;

      const now = new Date();
      const appointmentTime = appointment.data.toDate();
      const minutesUntil = differenceInMinutes(appointmentTime, now);

      // Lembrete 1 hora antes (entre 58-62 minutos para janela de 4 minutos)
      if (minutesUntil >= 58 && minutesUntil <= 62) {
        const existingNotif = notifications.find(
          n => n.type === 'appointment_reminder' && 
          n.metadata?.appointmentId === appointment.id
        );

        if (!existingNotif) {
          await sendSmartNotification(
            'appointment_reminder',
            '🕐 Seu horário está chegando!',
            `${appointment.servico_nome} às ${appointmentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Sala ${appointment.sala_atendimento || 'N/A'}`,
            { appointmentId: appointment.id }
          );
        }
      }

      // Check-in 15 minutos antes (janela de 13-17 minutos)
      if (minutesUntil >= 13 && minutesUntil <= 17) {
        const existingNotif = notifications.find(
          n => n.type === 'appointment_checkin' && 
          n.metadata?.appointmentId === appointment.id
        );

        if (!existingNotif) {
          await sendSmartNotification(
            'appointment_checkin',
            '✅ Confirme sua presença',
            'Seu horário é em 15 min. Está a caminho?',
            { appointmentId: appointment.id }
          );
        }
      }

      // Alerta de atraso (horário passou mas ainda aguardando)
      if (isBefore(appointmentTime, now) && minutesUntil < -5 && minutesUntil > -10) {
        const existingNotif = notifications.find(
          n => n.type === 'appointment_late' && 
          n.metadata?.appointmentId === appointment.id
        );

        if (!existingNotif) {
          await sendSmartNotification(
            'appointment_late',
            '⏰ Perdeu seu horário?',
            'Reagende agora ou entre em contato conosco',
            { appointmentId: appointment.id }
          );
        }
      }
    }
  }, [currentUser, notifications, sendSmartNotification]);

  // Verificar progresso de fidelidade
  const checkLoyaltyProgress = useCallback(async (loyaltyData: any) => {
    if (!currentUser || !loyaltyData) return;

    const { nivel_atual, pontos, pontos_proximo_nivel } = loyaltyData;
    const progress = (pontos / pontos_proximo_nivel) * 100;

    // Notificar quando estiver perto de subir de nível (85-90%)
    if (progress >= 85 && progress < 90) {
      const existingNotif = notifications.find(
        n => n.type === 'loyalty_progress' && 
        n.metadata?.nivel === nivel_atual &&
        !n.read
      );

      if (!existingNotif) {
        const pontosRestantes = pontos_proximo_nivel - pontos;
        await sendSmartNotification(
          'loyalty_progress',
          '🎯 Quase lá!',
          `Faltam apenas ${pontosRestantes} pontos para o próximo nível! Agende seu corte.`,
          { nivel: nivel_atual }
        );
      }
    }
  }, [currentUser, notifications, sendSmartNotification]);

  // Notificar subida de nível
  const notifyLevelUp = useCallback(async (newLevel: string, discount: number) => {
    await sendSmartNotification(
      'loyalty_levelup',
      '🏆 Parabéns! Você subiu de nível!',
      `Agora você é ${newLevel}! Ganhe ${discount}% de desconto em seus próximos serviços.`,
      { newLevel, discount }
    );
  }, [sendSmartNotification]);

  // Solicitar avaliação após serviço finalizado
  const requestReview = useCallback(async (appointment: any) => {
    // Aguardar 5 minutos após finalização para não ser intrusivo
    setTimeout(async () => {
      await sendSmartNotification(
        'review_request',
        '⭐ Como foi seu atendimento?',
        `Avalie ${appointment.funcionario_nome || 'o profissional'} em ${appointment.servico_nome}`,
        { appointmentId: appointment.id }
      );
    }, 5 * 60 * 1000); // 5 minutos
  }, [sendSmartNotification]);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    sendSmartNotification,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    checkAppointmentReminders,
    checkLoyaltyProgress,
    notifyLevelUp,
    requestReview,
  };
};
