import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  listing_id?: string | null;
  listing_type?: string | null;
  created_at: string;
  updated_at: string;
}

export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    // Fallback when Realtime is off or websocket drops; keeps bell badge accurate after likes, etc.
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });

  const invalidateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;

    const scheduleInvalidate = () => {
      if (invalidateDebounceRef.current) {
        clearTimeout(invalidateDebounceRef.current);
      }
      invalidateDebounceRef.current = setTimeout(() => {
        invalidateDebounceRef.current = null;
        queryClient.invalidateQueries({ queryKey: ['unread-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['seller-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['buyer-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['business-notifications', user.id] });
        queryClient.invalidateQueries({ queryKey: ['seller-dashboard-stats', user.id] });
        queryClient.invalidateQueries({ queryKey: ['admin-notification-counts'] });
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
        queryClient.invalidateQueries({
          queryKey: ['unread-new-message-notifications', user.id],
        });
      }, 200);
    };

    const notificationsChannel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        scheduleInvalidate
      )
      .subscribe();

    return () => {
      if (invalidateDebounceRef.current) {
        clearTimeout(invalidateDebounceRef.current);
        invalidateDebounceRef.current = null;
      }
      supabase.removeChannel(notificationsChannel);
    };
  }, [user, queryClient]);

  return { unreadCount };
};
