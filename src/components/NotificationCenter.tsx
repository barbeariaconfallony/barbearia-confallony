import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Bell, Check, CheckCheck, Filter, Calendar, Award, Wallet, Star } from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { SmartNotification, NotificationType, NOTIFICATION_TYPE_LABELS, NOTIFICATION_TYPE_ICONS } from '@/types/notifications';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useSmartNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment_checkin':
      case 'appointment_late':
        return <Calendar className="h-4 w-4" />;
      case 'loyalty_progress':
      case 'loyalty_levelup':
      case 'loyalty_expiring':
        return <Award className="h-4 w-4" />;
      case 'payment_pending':
      case 'payment_proof':
        return <Wallet className="h-4 w-4" />;
      case 'review_request':
      case 'suggestion':
        return <Star className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'appointment_reminder':
      case 'appointment_checkin':
        return 'text-blue-500';
      case 'appointment_late':
        return 'text-red-500';
      case 'loyalty_levelup':
        return 'text-yellow-500';
      case 'loyalty_progress':
        return 'text-green-500';
      case 'payment_pending':
        return 'text-orange-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const handleNotificationClick = async (notification: SmartNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Ações específicas por tipo (futuro)
    if (notification.actionUrl) {
      // Navegar para URL específica
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Central de Notificações</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="rounded-full px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não lidas ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtro por tipo */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="text-xs whitespace-nowrap"
          >
            Todas
          </Button>
          <Button
            variant={typeFilter === 'appointment_reminder' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('appointment_reminder')}
            className="text-xs whitespace-nowrap"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Agendamentos
          </Button>
          <Button
            variant={typeFilter === 'loyalty_progress' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('loyalty_progress')}
            className="text-xs whitespace-nowrap"
          >
            <Award className="h-3 w-3 mr-1" />
            Fidelidade
          </Button>
          <Button
            variant={typeFilter === 'payment_pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('payment_pending')}
            className="text-xs whitespace-nowrap"
          >
            <Wallet className="h-3 w-3 mr-1" />
            Pagamentos
          </Button>
        </div>

        {/* Lista de notificações */}
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {filter === 'unread' 
                ? 'Nenhuma notificação não lida' 
                : 'Nenhuma notificação ainda'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    !notification.read && 'bg-primary/5 border-primary/30'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'rounded-full p-2 flex-shrink-0',
                        !notification.read ? 'bg-primary/20' : 'bg-muted'
                      )}>
                        <span className={getNotificationColor(notification.type)}>
                          {getNotificationIcon(notification.type)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-sm font-semibold">
                            {NOTIFICATION_TYPE_ICONS[notification.type]} {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.body}
                        </p>

                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px]">
                            {NOTIFICATION_TYPE_LABELS[notification.type]}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {format(notification.timestamp, "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
