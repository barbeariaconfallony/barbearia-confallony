import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCustomNotifications } from './useCustomNotifications';
import { User } from 'firebase/auth';

interface QueueItem {
  id: string;
  usuario_id: string;
  status: string;
  tempo_estimado: number;
  posicao: number;
  duracao?: number;
  created_at: any;
}

/**
 * Hook que monitora agendamentos na fila e envia lembretes a cada 30 minutos
 */
export const useQueueReminders = (currentUser: User | null) => {
  const { notifyQueueReminder, isSupported } = useCustomNotifications(currentUser?.uid);
  const reminderIntervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Calcular tempo estimado baseado na posição na fila
  const calculateEstimatedTime = async (appointment: QueueItem): Promise<number> => {
    try {
      const queueRef = collection(db, 'fila');
      const beforeQuery = query(
        queueRef,
        where('status', 'in', ['aguardando', 'confirmado', 'em_atendimento']),
        where('posicao', '<', appointment.posicao),
        orderBy('posicao', 'asc')
      );

      const beforeSnapshot = await getDocs(beforeQuery);
      let totalTime = 0;

      beforeSnapshot.forEach((doc) => {
        const item = doc.data();
        totalTime += item.duracao || item.tempo_estimado || 30; // Default 30 min
      });

      return Math.max(totalTime, appointment.tempo_estimado || 0);
    } catch (error) {
      console.error('Erro ao calcular tempo estimado:', error);
      return appointment.tempo_estimado || 30;
    }
  };

  useEffect(() => {
    if (!currentUser || !isSupported) return;

    const queueRef = collection(db, 'fila');
    const userQueueQuery = query(
      queueRef,
      where('usuario_id', '==', currentUser.uid),
      where('status', 'in', ['aguardando', 'confirmado'])
    );

    const unsubscribe = onSnapshot(userQueueQuery, async (snapshot) => {
      // Limpar intervalos antigos
      reminderIntervalsRef.current.forEach((interval) => clearInterval(interval));
      reminderIntervalsRef.current.clear();

      for (const doc of snapshot.docs) {
        const appointment = { id: doc.id, ...doc.data() } as QueueItem;
        
        console.log('🔔 Agendando lembretes para agendamento:', appointment.id);

        // Calcular tempo estimado inicial
        const initialTime = await calculateEstimatedTime(appointment);

        // Enviar lembrete imediatamente (primeiro lembrete)
        notifyQueueReminder(initialTime);

        // Configurar lembretes a cada 30 minutos
        const interval = setInterval(async () => {
          const currentTime = await calculateEstimatedTime(appointment);
          console.log(`🔔 Enviando lembrete - Tempo restante: ${currentTime} minutos`);
          notifyQueueReminder(currentTime);
        }, 30 * 60 * 1000); // 30 minutos

        reminderIntervalsRef.current.set(appointment.id, interval);
      }

      // Se não há mais agendamentos, limpar tudo
      if (snapshot.empty) {
        console.log('✅ Sem agendamentos na fila - cancelando lembretes');
        reminderIntervalsRef.current.forEach((interval) => clearInterval(interval));
        reminderIntervalsRef.current.clear();
      }
    });

    return () => {
      unsubscribe();
      reminderIntervalsRef.current.forEach((interval) => clearInterval(interval));
      reminderIntervalsRef.current.clear();
    };
  }, [currentUser, isSupported, notifyQueueReminder]);
};
