// Tipos de notificações inteligentes
export type NotificationType = 
  | 'appointment_reminder' 
  | 'appointment_checkin'
  | 'appointment_late'
  | 'loyalty_progress'
  | 'loyalty_levelup'
  | 'loyalty_expiring'
  | 'payment_pending'
  | 'payment_proof'
  | 'review_request'
  | 'inactivity'
  | 'suggestion';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface SmartNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  priority: NotificationPriority;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  userId: string;
}

export interface NotificationPreferences {
  userId: string;
  enabledTypes: {
    appointment_reminder: boolean;
    appointment_checkin: boolean;
    appointment_late: boolean;
    loyalty_progress: boolean;
    loyalty_levelup: boolean;
    loyalty_expiring: boolean;
    payment_pending: boolean;
    payment_proof: boolean;
    review_request: boolean;
    inactivity: boolean;
    suggestion: boolean;
  };
  doNotDisturbStart?: string; // HH:mm format
  doNotDisturbEnd?: string; // HH:mm format
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const DEFAULT_PREFERENCES: Omit<NotificationPreferences, 'userId'> = {
  enabledTypes: {
    appointment_reminder: true,
    appointment_checkin: true,
    appointment_late: true,
    loyalty_progress: true,
    loyalty_levelup: true,
    loyalty_expiring: true,
    payment_pending: true,
    payment_proof: true,
    review_request: true,
    inactivity: false,
    suggestion: true,
  },
  doNotDisturbStart: '22:00',
  doNotDisturbEnd: '08:00',
  soundEnabled: true,
  vibrationEnabled: true,
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  appointment_reminder: 'Lembretes de Agendamento',
  appointment_checkin: 'Confirmação de Presença',
  appointment_late: 'Alertas de Atraso',
  loyalty_progress: 'Progresso de Fidelidade',
  loyalty_levelup: 'Subida de Nível',
  loyalty_expiring: 'Pontos Expirando',
  payment_pending: 'Pagamentos Pendentes',
  payment_proof: 'Comprovantes',
  review_request: 'Solicitação de Avaliação',
  inactivity: 'Alertas de Inatividade',
  suggestion: 'Sugestões Personalizadas',
};

export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  appointment_reminder: '🕐',
  appointment_checkin: '✅',
  appointment_late: '⏰',
  loyalty_progress: '🎯',
  loyalty_levelup: '🏆',
  loyalty_expiring: '⚠️',
  payment_pending: '💰',
  payment_proof: '📄',
  review_request: '⭐',
  inactivity: '💈',
  suggestion: '💡',
};
