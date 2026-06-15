import { supabase } from '@/lib/supabase/client';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Marks every incoming message for the user as read and clears unread `new_message` notifications.
 * Used from the messages list “Mark all as read” — not from the Messages nav link (badge stays until a thread is opened or user chooses bulk clear).
 */
export async function markAllIncomingMessagesRead(
  userId: string,
  queryClient: QueryClient
): Promise<void> {
  const { count: unreadCountBefore } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('recipient_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }

  const { error: notifError } = await supabase
    .from('notifications')
    .update({ read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('type', 'new_message')
    .eq('read', false);

  if (notifError) {
    console.error('Error marking new_message notifications as read:', notifError);
  }

  const unreadCountDelta = -(unreadCountBefore || 0);
  window.dispatchEvent(
    new CustomEvent('messagesMarkedAsRead', {
      detail: {
        conversationId: 'all',
        unreadCountDelta,
        userId,
      },
    })
  );

  await queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
  await queryClient.invalidateQueries({
    queryKey: ['unread-new-message-notifications', userId],
  });
  await queryClient.invalidateQueries({ queryKey: ['unread-notifications', userId] });
}
