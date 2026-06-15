'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from './use-conversations';

/** Shared query key — keep in sync with invalidation in mark-all-incoming-read and use-realtime-notifications */
export const unreadNewMessageNotificationsQueryKey = (userId: string | undefined) =>
  ['unread-new-message-notifications', userId] as const;

/**
 * Total unread **messages** (incoming, not yet read) across all conversations.
 * Uses per-conversation counts from `messages` only — never falls back to notification rows
 * (those can be stale and caused phantom nav badges).
 */
export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { conversations, fetchConversations } = useConversations();

  const [unreadCount, setUnreadCount] = useState(0);
  const optimisticUpdatesRef = useRef<Map<string, number>>(new Map());
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeRefreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversations) {
      setUnreadCount(0);
      return;
    }

    const totalUnread = conversations.reduce((sum, conv) => {
      const optimisticDelta = optimisticUpdatesRef.current.get(conv.id) || 0;
      const baseCount = conv.unread_count || 0;
      const adjustedCount = Math.max(0, baseCount + optimisticDelta);
      return sum + adjustedCount;
    }, 0);

    setUnreadCount(totalUnread);
  }, [conversations]);

  useEffect(() => {
    const handleMessagesMarkedAsRead = (event: CustomEvent) => {
      const { conversationId, unreadCountDelta } = event.detail || {};

      if (unreadCountDelta !== undefined) {
        setUnreadCount((prev) => Math.max(0, prev + unreadCountDelta));
        if (conversationId === 'all') {
          optimisticUpdatesRef.current.clear();
        } else if (conversationId) {
          const currentDelta = optimisticUpdatesRef.current.get(conversationId) || 0;
          optimisticUpdatesRef.current.set(conversationId, currentDelta + unreadCountDelta);
        }
      }

      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (fetchConversations) {
          fetchConversations().then(() => {
            if (conversationId === 'all') {
              optimisticUpdatesRef.current.clear();
            } else if (conversationId) {
              optimisticUpdatesRef.current.delete(conversationId);
            }
          });
        }
        if (user?.id) {
          queryClient.invalidateQueries({
            queryKey: unreadNewMessageNotificationsQueryKey(user.id),
          });
        }
      }, 300);
    };

    const listener = (e: Event) => handleMessagesMarkedAsRead(e as CustomEvent);
    window.addEventListener('messagesMarkedAsRead', listener);
    return () => {
      window.removeEventListener('messagesMarkedAsRead', listener);
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [fetchConversations, queryClient, user?.id]);

  useEffect(() => {
    if (!user) return;

    const scheduleConversationsRefresh = () => {
      if (realtimeRefreshDebounceRef.current) {
        clearTimeout(realtimeRefreshDebounceRef.current);
      }
      realtimeRefreshDebounceRef.current = setTimeout(() => {
        realtimeRefreshDebounceRef.current = null;
        if (fetchConversations) {
          fetchConversations();
        }
        queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
        queryClient.invalidateQueries({
          queryKey: unreadNewMessageNotificationsQueryKey(user.id),
        });
      }, 350);
    };

    const messagesChannel = supabase
      .channel(`messages:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => {
          scheduleConversationsRefresh();
        }
      )
      .subscribe();

    return () => {
      if (realtimeRefreshDebounceRef.current) {
        clearTimeout(realtimeRefreshDebounceRef.current);
        realtimeRefreshDebounceRef.current = null;
      }
      supabase.removeChannel(messagesChannel);
    };
  }, [user, queryClient, fetchConversations]);

  return { unreadCount };
};
