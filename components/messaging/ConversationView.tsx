
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ArrowLeft, Send, Clock, User, DollarSign } from 'lucide-react';
import { useMessages } from '@/hooks/use-conversations';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { messageSenderDisplayName } from '@/lib/utils/message-sender-display-name';

const formatCurrency = (amount: number, currency: string = 'EUR') => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  });
  return formatter.format(amount);
};

interface ConversationViewProps {
  conversationId: string;
}

export const ConversationView = ({ conversationId }: ConversationViewProps) => {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [otherPersonName, setOtherPersonName] = useState<string>('');
  const [otherPersonAvatar, setOtherPersonAvatar] = useState<string>('');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>('');
  const [otherPersonInitials, setOtherPersonInitials] = useState<string>('');
  const [currentUserInitials, setCurrentUserInitials] = useState<string>('');
  const [isOtherPersonTyping, setIsOtherPersonTyping] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string>('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  /** Subscribed presence channel — must not await track() on a fresh unsuscribed channel (hangs UI on Send). */
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  const { messages, loading, sendMessage } = useMessages(conversationId || '');

  // Mark messages as read when conversation view is opened
  // Note: useMessages hook already marks messages as read, but we ensure conversation timestamp is updated
  useEffect(() => {
    if (conversationId && user && !loading && messages.length > 0) {
      // The useMessages hook already marks messages as read when fetching,
      // but we ensure conversation timestamp is updated and event is dispatched
      const markAsRead = async () => {
        try {
          const now = new Date().toISOString();

          // Count unread messages for this conversation
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conversationId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);

          // Update conversation's last_read_at timestamp
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('buyer_id, seller_id')
            .eq('id', conversationId)
            .single();

          if (convError) {
            console.error('Error fetching conversation:', convError);
            return;
          }

          if (conv) {
            const updateField = conv.buyer_id === user.id ? 'buyer_last_read_at' : 'seller_last_read_at';
            const { error: timestampError } = await supabase
              .from('conversations')
              .update({ [updateField]: now })
              .eq('id', conversationId);

            if (timestampError) {
              console.error('Error updating conversation timestamp:', timestampError);
            }

            // Dispatch event with conversation ID and unread count delta
            // If there are still unread messages, the delta will be 0 (already handled by useMessages)
            // This ensures the conversation timestamp is updated
            window.dispatchEvent(new CustomEvent('messagesMarkedAsRead', {
              detail: {
                conversationId,
                unreadCountDelta: 0, // Already handled by useMessages hook
                userId: user.id
              }
            }));

            // Invalidate conversations query to refresh unread counts
            queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
          }
        } catch (error) {
          console.error('Error in markAsRead:', error);
        }
      };

      // Small delay to ensure messages are loaded
      const timeoutId = setTimeout(() => {
        markAsRead();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [conversationId, user, loading, messages.length, queryClient]);

  // Fetch user profiles and set up typing indicators
  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!conversationId || !user) return;

      try {
        const { data: conv, error } = await supabase
          .from('conversations')
          .select('buyer_id, seller_id')
          .eq('id', conversationId)
          .single();

        if (error) throw error;

        const otherUserIdValue = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;
        setOtherUserId(otherUserIdValue);

        // Fetch other person's profile using security definer function
        const { data: otherData, error: otherError } = await supabase.rpc('get_public_user_name', {
          user_id_param: otherUserIdValue
        });

        if (otherError) {
          console.error('Error fetching other person profile:', otherError);
        } else if (otherData && otherData.length > 0) {
          const profile = otherData[0] as {
            business_name?: string | null;
            first_name?: string | null;
            last_name?: string | null;
            role?: string | null;
            is_admin?: boolean | null;
            avatar_url?: string | null;
          };
          // Same rules as reservation notifications + message list (admin / business / name).
          const displayName = messageSenderDisplayName(profile, 'User');
          setOtherPersonName(displayName);

          let initials = displayName.length >= 2 ? displayName.slice(0, 2).toUpperCase() : displayName.toUpperCase();
          if (profile.business_name?.trim() && displayName === profile.business_name.trim()) {
            initials = profile.business_name.substring(0, 2).toUpperCase();
          } else {
            const fromNames = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
            if (fromNames) initials = fromNames;
          }
          setOtherPersonInitials(initials);

          // Set avatar from the function result
          if (profile.avatar_url) {
            setOtherPersonAvatar(profile.avatar_url);
          }
        }

        // Fetch current user's profile using security definer function
        const { data: currentData, error: currentError } = await supabase.rpc('get_public_user_name', {
          user_id_param: user.id
        });

        if (currentError) {
          console.error('Error fetching current user profile:', currentError);
        } else if (currentData && currentData.length > 0) {
          const currentProfile = currentData[0];

          if (currentProfile.avatar_url) {
            setCurrentUserAvatar(currentProfile.avatar_url);
          }

          const currentInitials = currentProfile.business_name
            ? currentProfile.business_name.substring(0, 2).toUpperCase()
            : `${currentProfile.first_name?.[0] || ''}${currentProfile.last_name?.[0] || ''}`.toUpperCase() || 'Y';
          setCurrentUserInitials(currentInitials);
        }
      } catch (error) {
        console.error('Error fetching user profiles:', error);
      }
    };

    fetchUserProfiles();
  }, [conversationId, user]);

  // Set up typing indicators with Realtime
  useEffect(() => {
    if (!conversationId || !user || !otherUserId) return;

    const channel = supabase.channel(`conversation:${conversationId}`);
    presenceChannelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserPresence = state[otherUserId] as any[];

        if (otherUserPresence && otherUserPresence[0]?.typing) {
          setIsOtherPersonTyping(true);
        } else {
          setIsOtherPersonTyping(false);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }: any) => {
        if (key === otherUserId && newPresences[0]?.typing) {
          setIsOtherPersonTyping(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }: any) => {
        if (key === otherUserId) {
          setIsOtherPersonTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ typing: false });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, otherUserId]);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    if (messages.length > 0 && !loading) {
      // Small delay to ensure messages are rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, loading]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      // Clear typing on the subscribed channel only — never await track() on a new channel (can hang forever).
      void presenceChannelRef.current?.track({ typing: false });
      await sendMessage(newMessage);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    void presenceChannelRef.current?.track({ typing: value.length > 0 });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      void presenceChannelRef.current?.track({ typing: false });
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-dark-green" />
        <span className="ml-2 text-lg">Loading conversation...</span>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-2 bg-brand-soft-green/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Messages
        </Button>
        <div className="mt-4">
          <h1 className="text-2xl font-berkshire">Conversation with</h1>
          {otherPersonName ? (
            <p className="text-xl font-semibold text-brand-soft-green mt-1 flex items-center gap-2">
              <User className="h-5 w-5" />
              {otherPersonName}
            </p>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-96 w-full" ref={scrollAreaRef}>
        <div className="space-y-4 p-4">
          {messages.map((message) => {
            const isFromCurrentUser = message.sender_id === user?.id;
            const isOfferMessage = message.message_type === 'offer';
            const hasOfferAmount = message.offer_amount && message.offer_amount > 0;
            const avatarUrl = isFromCurrentUser ? currentUserAvatar : otherPersonAvatar;
            const initials = isFromCurrentUser ? currentUserInitials : otherPersonInitials;

            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isFromCurrentUser && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={avatarUrl} alt={message.sender_name || otherPersonName} />
                    <AvatarFallback className="bg-brand-soft-green text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div className="max-w-xs lg:max-w-md">
                  <Card className={isFromCurrentUser ? 'bg-brand-soft-green text-white' : 'bg-gray-50'}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium">
                          {isFromCurrentUser ? 'You' : (message.sender_name || otherPersonName || 'User')}
                        </span>
                        {message.message_type !== 'reply' && (
                          <Badge variant="secondary" className="text-xs">
                            {message.message_type}
                          </Badge>
                        )}
                      </div>

                      {/* Show offer amount prominently for offer messages */}
                      {isOfferMessage && hasOfferAmount && (
                        <div className={`mb-3 p-2 rounded-md ${isFromCurrentUser ? 'bg-white/20' : 'bg-green-50'} border-l-4 ${isFromCurrentUser ? 'border-white' : 'border-green-500'}`}>
                          <div className="flex items-center gap-2">
                            <DollarSign className={`h-4 w-4 ${isFromCurrentUser ? 'text-white' : 'text-green-600'}`} />
                            <span className={`font-semibold ${isFromCurrentUser ? 'text-white' : 'text-green-700'}`}>
                              Offer: {formatCurrency(message.offer_amount ?? 0, message.offer_currency || 'EUR')}
                            </span>
                          </div>
                        </div>
                      )}

                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs opacity-75">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {isFromCurrentUser && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={avatarUrl} alt="You" />
                    <AvatarFallback className="bg-brand-dark-green text-white text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {isOtherPersonTyping && (
            <div className="flex gap-2 justify-start">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarImage src={otherPersonAvatar} alt={otherPersonName} />
                <AvatarFallback className="bg-brand-soft-green text-white text-xs">
                  {otherPersonInitials}
                </AvatarFallback>
              </Avatar>
              <Card className="bg-gray-50">
                <CardContent className="p-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Send a Reply</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your message here..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="bg-brand-soft-green hover:bg-brand-soft-green/90 flex items-center gap-2"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {sending ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
