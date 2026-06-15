
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/lib/supabase/types';
import { messageSenderDisplayName } from '@/lib/utils/message-sender-display-name';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_type: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  buyer_last_read_at: string | null;
  seller_last_read_at: string | null;
  buyer_deleted: boolean;
  seller_deleted: boolean;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  listing_title?: string;
  listing_image?: string;
  other_user_name?: string;
  message_types?: string[];
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  message_type: string;
  content: string;
  attachments: Json | null;
  offer_amount: number | null;
  offer_currency: string | null;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
}

const getListingTitle = async (listingId: string, listingType: string): Promise<string> => {
  try {
    // Validate inputs
    if (!listingId || !listingType) {
      return 'Unknown Listing';
    }

    let query;

    switch (listingType) {
      case 'sale':
        query = supabase
          .from('sale_listings')
          .select('title')
          .eq('id', listingId)
          .maybeSingle();
        break;
      case 'stud':
        query = supabase
          .from('stud_listings')
          .select('title')
          .eq('id', listingId)
          .maybeSingle();
        break;
      case 'showcase':
        query = supabase
          .from('showcase_listings')
          .select('title')
          .eq('id', listingId)
          .maybeSingle();
        break;
      default:
        return 'Unknown Listing';
    }

    const { data, error } = await query;
    
    if (error) {
      // Log the actual error details
      console.error('Error fetching listing title:', {
        listingId,
        listingType,
        error: error.message || error,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return 'Unknown Listing';
    }

    if (!data) {
      return 'Unknown Listing';
    }

    return data.title || 'Unknown Listing';
  } catch (error) {
    // Handle unexpected errors
    console.error('Error fetching listing title (catch block):', {
      listingId,
      listingType,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return 'Unknown Listing';
  }
};

const getListingImage = async (listingId: string, listingType: string): Promise<string> => {
  try {
    // Validate inputs
    if (!listingId || !listingType) {
      return '';
    }

    let query;

    switch (listingType) {
      case 'sale':
        query = supabase
          .from('sale_listings')
          .select('images')
          .eq('id', listingId)
          .maybeSingle();
        break;
      case 'stud':
        query = supabase
          .from('stud_listings')
          .select('images')
          .eq('id', listingId)
          .maybeSingle();
        break;
      case 'showcase':
        query = supabase
          .from('showcase_listings')
          .select('images')
          .eq('id', listingId)
          .maybeSingle();
        break;
      default:
        return '';
    }

    const { data, error } = await query;
    
    if (error) {
      // Log error but don't throw - image is optional
      return '';
    }

    if (!data) {
      return '';
    }

    // Handle different image storage formats
    const images = data?.images as any;
    if (images) {
      if (Array.isArray(images) && images.length > 0 && typeof images[0] === 'string') {
        return images[0] as string;
      } else if (typeof images === 'object' && (images as any)[0] && typeof (images as any)[0] === 'string') {
        return (images as any)[0] as string;
      }
    }

    return '';
  } catch (error) {
    // Handle unexpected errors - image is optional so just log and return empty
    return '';
  }
};

const getUserName = async (userId: string): Promise<string> => {
  try {

    // Validate the user ID format
    if (!userId || typeof userId !== 'string' || userId.length < 30) {
      console.error(`[getUserName-v3] Invalid user ID format: ${userId}`);
      return 'Unknown User';
    }

    // Use the security definer function that bypasses RLS

    const { data, error } = await supabase.rpc('get_public_user_name', {
      user_id_param: userId
    });

    if (error) {
      console.error(`[getUserName-v3] Function error:`, error);
    }

    if (data && data.length > 0) {
      const profile = data[0] as {
        avatar_url?: string | null;
        business_name?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        role?: string | null;
        is_admin?: boolean | null;
      };
      return messageSenderDisplayName(profile, 'User');
    }

    return 'User';
  } catch (error) {
    console.error(`[getUserName-v3] ❌ EXCEPTION:`, error);
    return 'User';
  }
};

const getConversationMessageTypes = async (conversationId: string): Promise<string[]> => {
  try {

    const { data, error } = await supabase
      .from('messages')
      .select('message_type')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Error fetching message types:', error);
      throw error;
    }

    // Get unique message types
    const uniqueTypes = [...new Set(data.map(msg => msg.message_type))];

    return uniqueTypes;
  } catch (error) {
    console.error('Error fetching message types:', error);
    return [];
  }
};

function useConversationsState() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      const { data: conversationsData, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        throw error;
      }

      // Fetch additional data for each conversation
      const enrichedConversations = await Promise.all(
        conversationsData.map(async (conv) => {

          // Get listing title and image
          const listingTitle = await getListingTitle(conv.listing_id, conv.listing_type);
          const listingImage = await getListingImage(conv.listing_id, conv.listing_type);

          // Get other user's name and ID
          const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;

          const otherUserName = await getUserName(otherUserId);

          // Get unread count - count messages FROM the other user TO current user that are unread
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('sender_id', otherUserId)
            .eq('recipient_id', user.id)
            .eq('is_read', false);

          // Get message types for this conversation
          const messageTypes = await getConversationMessageTypes(conv.id);

          const enrichedConv = {
            ...conv,
            listing_title: listingTitle,
            listing_image: listingImage,
            other_user_name: otherUserName,
            unread_count: unreadCount || 0,
            message_types: messageTypes
          };

          return enrichedConv;
        })
      );

      setConversations(enrichedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error loading conversations",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const createConversation = useCallback(async (
    sellerId: string,
    listingId: string,
    listingType: string,
    subject: string,
    initialMessage: string,
    messageType: string = 'contact',
    offerAmount?: number,
    offerCurrency?: string
  ) => {
    if (!user) {
      console.error('No user found when creating conversation');
      toast({
        title: "Authentication required",
        description: "Please log in to send messages.",
        variant: "destructive"
      });
      return null;
    }

    try {
      // Check if conversation already exists

      const { data: existingConv, error: existingError } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', sellerId)
        .eq('listing_id', listingId)
        .eq('listing_type', listingType)
        .maybeSingle();

      if (existingError) {
        console.error('Error checking existing conversation:', existingError);
        throw existingError;
      }

      let conversationId;

      if (existingConv) {
        conversationId = existingConv.id;

      } else {
        // Create new conversation

        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: user.id,
            seller_id: sellerId,
            listing_id: listingId,
            listing_type: listingType,
            subject: subject,
            gdpr_consent_buyer: true
          })
          .select()
          .single();

        if (convError) {
          console.error('Error creating conversation:', convError);
          throw convError;
        }

        if (!newConv) {
          console.error('No conversation data returned after insert');
          throw new Error('Failed to create conversation - no data returned');
        }

        conversationId = newConv.id;

      }

      // Prepare message data
      const messagePayload: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        recipient_id: sellerId,
        message_type: messageType,
        content: initialMessage,
        gdpr_processing_basis: 'legitimate_interest'
      };

      // Add offer fields if provided
      if (offerAmount !== undefined && offerAmount !== null) {
        messagePayload.offer_amount = offerAmount;
        messagePayload.offer_currency = offerCurrency || 'EUR';
      }

      // Send initial message

      const { data: messageResult, error: messageError } = await supabase
        .from('messages')
        .insert(messagePayload)
        .select()
        .single();

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw messageError;
      }

      if (!messageResult) {
        console.error('No message data returned after insert');
        throw new Error('Failed to create message - no data returned');
      }

      // Verify the data was actually inserted by querying it back

      const { data: verifyConv, error: verifyError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      const { data: verifyMsg, error: verifyMsgError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageResult.id)
        .single();

      const successMessage = messageType === 'offer'
        ? "Offer submitted successfully"
        : "Message sent successfully";
      const successDescription = messageType === 'offer'
        ? "Your offer has been sent to the seller."
        : "The seller will be notified of your message.";

      toast({
        title: successMessage,
        description: successDescription
      });

      // Refresh conversations
      fetchConversations();

      return conversationId;
    } catch (error) {
      console.error('Error in createConversation:', error);
      const errorMessage = messageType === 'offer'
        ? "Failed to submit offer"
        : "Failed to send message";

      toast({
        title: errorMessage,
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive"
      });
      return null;
    }
  }, [user, toast, fetchConversations]);

  /**
   * Seller starts a thread with a buyer about a listing the seller owns (e.g. contacted a liker).
   * listingType must match conversations.listing_type: 'sale' | 'stud' | 'showcase'.
   */
  const createConversationAsSeller = useCallback(
    async (
      buyerId: string,
      listingId: string,
      listingType: 'sale' | 'stud' | 'showcase',
      subject: string,
      initialMessage: string,
      messageType: string = 'contact'
    ) => {
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please log in to send messages.',
          variant: 'destructive',
        });
        return null;
      }

      if (!buyerId || buyerId === user.id) {
        toast({
          title: 'Cannot message',
          description: 'Invalid recipient.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const { data: existingConv, error: existingError } = await supabase
          .from('conversations')
          .select('id')
          .eq('buyer_id', buyerId)
          .eq('seller_id', user.id)
          .eq('listing_id', listingId)
          .eq('listing_type', listingType)
          .maybeSingle();

        if (existingError) throw existingError;

        let conversationId: string;

        if (existingConv) {
          conversationId = existingConv.id;
        } else {
          const { data: newConv, error: convError } = await supabase
            .from('conversations')
            .insert({
              buyer_id: buyerId,
              seller_id: user.id,
              listing_id: listingId,
              listing_type: listingType,
              subject,
              gdpr_consent_buyer: true,
              gdpr_consent_seller: true,
            })
            .select()
            .single();

          if (convError) throw convError;
          if (!newConv) throw new Error('Failed to create conversation');
          conversationId = newConv.id;
        }

        const messagePayload: {
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          message_type: string;
          content: string;
          gdpr_processing_basis: string;
        } = {
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: buyerId,
          message_type: messageType,
          content: initialMessage,
          gdpr_processing_basis: 'legitimate_interest',
        };

        const { error: messageError } = await supabase.from('messages').insert(messagePayload);

        if (messageError) throw messageError;

        toast({
          title: 'Message sent',
          description: 'Opening your conversation…',
        });

        fetchConversations();
        return conversationId;
      } catch (error) {
        console.error('Error in createConversationAsSeller:', error);
        toast({
          title: 'Failed to send message',
          description: error instanceof Error ? error.message : 'Please try again later.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [user, toast, fetchConversations]
  );

  useEffect(() => {
    fetchConversations();
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    fetchConversations,
    createConversation,
    createConversationAsSeller,
  };
}

const ConversationsContext = createContext<ReturnType<typeof useConversationsState> | null>(null);

/** Single shared conversations state for the app (badges + lists stay in sync). Wrap app in this provider. */
export function ConversationsProvider({ children }: { children: ReactNode }) {
  const value = useConversationsState();
  return (
    <ConversationsContext.Provider value={value}>{children}</ConversationsContext.Provider>
  );
}

export function useConversations() {
  const ctx = useContext(ConversationsContext);
  if (!ctx) {
    throw new Error('useConversations must be used within ConversationsProvider');
  }
  return ctx;
}

export const useMessages = (conversationId: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Enrich messages with sender names
      const enrichedMessages = await Promise.all(
        messagesData.map(async (msg) => {

          const senderName = await getUserName(msg.sender_id);

          return {
            ...msg,
            sender_name: senderName
          };
        })
      );

      // Mark messages as read BEFORE setting state to ensure it happens immediately
      const now = new Date().toISOString();

      // Count unread messages BEFORE marking as read to calculate delta
      const { count: unreadCountBefore } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      // Update ALL unread messages in this conversation sent to current user as read
      const { data: updateResult, error: updateError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .select('id');

      if (updateError) {
        console.error('Error marking messages as read:', updateError);
        // Don't throw - continue to show messages even if marking as read fails
      } else {

        // Verify the update worked by checking unread count after
        const { count: unreadCountAfter } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversationId)
          .eq('recipient_id', user.id)
          .eq('is_read', false);

        if (unreadCountAfter && unreadCountAfter > 0) {
        }
      }

      // Refetch messages to ensure we have the latest read status from database
      const { data: refreshedMessagesData, error: refreshError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!refreshError && refreshedMessagesData) {
        // Re-enrich messages with sender names and updated read status

        const refreshedEnrichedMessages = await Promise.all(
          refreshedMessagesData.map(async (msg, index) => {
            const senderName = await getUserName(msg.sender_id);
            // Ensure messages sent TO the current user are marked as read in the UI
            // even if the DB update hasn't propagated fully or we're seeing cached data
            const isRecipient = msg.recipient_id === user.id;
            const isRead = isRecipient ? true : msg.is_read;

            return {
              ...msg,
              is_read: isRead,
              sender_name: senderName
            };
          })
        );
        setMessages(refreshedEnrichedMessages);

      } else {

        // Fallback: Update enriched messages to reflect read status locally
        const enrichedMessagesWithReadStatus = enrichedMessages.map(msg => ({
          ...msg,
          // Ensure messages sent TO the current user are marked as read in the UI
          is_read: msg.recipient_id === user.id ? true : msg.is_read
        }));

        setMessages(enrichedMessagesWithReadStatus);
      }

      // Calculate unread count delta (negative because we're marking as read)
      const unreadCountDelta = -(unreadCountBefore || 0);

      // Update conversation's last_read_at timestamp
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single();

      if (convError) {
        console.error('Error fetching conversation:', convError);
      } else if (conv) {
        const updateField = conv.buyer_id === user.id ? 'buyer_last_read_at' : 'seller_last_read_at';
        const { error: timestampError } = await supabase
          .from('conversations')
          .update({ [updateField]: now })
          .eq('id', conversationId);

        if (timestampError) {
          console.error('Error updating conversation timestamp:', timestampError);
        }

        // Dispatch event with conversation ID and unread count delta for optimistic updates
        window.dispatchEvent(new CustomEvent('messagesMarkedAsRead', {
          detail: {
            conversationId,
            unreadCountDelta,
            userId: user.id
          }
        }));
      }

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error loading messages",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, user, toast]);

  const sendMessage = useCallback(async (content: string, messageType: string = 'reply') => {
    if (!conversationId || !user || !content.trim()) return;

    try {
      // Get conversation details to find recipient
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('buyer_id, seller_id')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      const recipientId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          recipient_id: recipientId,
          message_type: messageType,
          content: content.trim(),
          gdpr_processing_basis: 'legitimate_interest'
        });

      if (error) throw error;

      // Refresh messages
      fetchMessages();

      toast({
        title: "Message sent",
        description: "Your message has been sent successfully."
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Failed to send message",
        description: "Please try again later.",
        variant: "destructive"
      });
    }
  }, [conversationId, user, toast, fetchMessages]);

  useEffect(() => {
    fetchMessages();
  }, [conversationId, user, fetchMessages]);

  // Subscribe to real-time message updates for this conversation
  useEffect(() => {
    if (!conversationId || !user) return;

    const messagesChannel = supabase
      .channel(`messages-realtime:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Refetch messages to get the new message with all details
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user, fetchMessages]);

  return {
    messages,
    loading,
    sendMessage,
    fetchMessages
  };
};
