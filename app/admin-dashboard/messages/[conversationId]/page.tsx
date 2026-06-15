'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Flag, MessageSquare, User, AlertTriangle, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { messageSenderDisplayName } from "@/lib/utils/message-sender-display-name";

interface ConversationDetail {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_type: string;
  subject: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  buyer_name?: string;
  seller_name?: string;
  listing_title?: string;
  message_count?: number;
}

interface MessageDetail {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
  moderation_status?: string;
  fraud_flag?: boolean;
}

export default function AdminMessageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const conversationId = params.conversationId as string;
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessageDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (conversationId) {
      fetchConversationDetails();
    }
  }, [conversationId]);

  const fetchConversationDetails = async () => {
    try {
      setIsLoading(true);
      
      // Fetch conversation
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Fetch messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Enrich with user names
      const enrichedMessages = await Promise.all(
        (messagesData || []).map(async (msg) => {
          const { data: sender } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, business_name, role, is_admin')
            .eq('id', msg.sender_id)
            .single();

          return {
            ...msg,
            sender_name: messageSenderDisplayName(sender, 'Unknown'),
          };
        })
      );

      setConversation(convData);
      setMessages(enrichedMessages);
    } catch (error: any) {
      console.error('Error fetching conversation:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversation"
      });
      router.push('/admin-dashboard/messages');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="py-12 text-center">Loading conversation...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Conversation not found</p>
          <Button onClick={() => router.push('/admin-dashboard/messages')} className="mt-4">
            Back to Messages
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/admin-dashboard/messages')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Messages
        </Button>
        <h2 className="text-2xl font-bold">Conversation Details</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Subject:</strong> {conversation.subject}
          </div>
          <div>
            <strong>Status:</strong> <Badge>{conversation.status}</Badge>
          </div>
          <div>
            <strong>Listing:</strong> {conversation.listing_title || conversation.listing_id}
          </div>
          <div>
            <strong>Created:</strong> {format(new Date(conversation.created_at), 'PPpp')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Messages ({messages.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <strong>{message.sender_name}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    {message.fraud_flag && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Fraud Flagged
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <p className="text-sm">{message.content}</p>
                {message.moderation_status && (
                  <div className="mt-2">
                    <Badge variant="secondary">{message.moderation_status}</Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



