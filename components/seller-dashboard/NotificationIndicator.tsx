
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';

const NotificationIndicator: React.FC = () => {
  const { unreadCount } = useRealtimeNotifications();

  if (unreadCount === 0) return null;

  return (
    <Badge className="bg-red-500 text-white text-xs ml-2">
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
};

export default NotificationIndicator;
