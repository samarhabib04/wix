
import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, DollarSign, Heart, Clock, Search } from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { markAllIncomingMessagesRead } from "@/lib/messages/mark-all-incoming-read";

const SellerMessages = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const { conversations, loading, fetchConversations } = useConversations();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "offer" || tab === "reserve" || tab === "contact" || tab === "all") {
      setActiveTab(tab);
      return;
    }
    setActiveTab("all");
  }, [searchParams]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0),
    [conversations]
  );

  const handleMarkAllRead = async () => {
    if (!user?.id || totalUnread === 0) return;
    setMarkingAll(true);
    try {
      await markAllIncomingMessagesRead(user.id, queryClient);
      await fetchConversations();
      toast({ title: "All messages marked as read" });
    } catch {
      toast({
        variant: "destructive",
        title: "Could not mark all as read",
        description: "Try again in a moment.",
      });
    } finally {
      setMarkingAll(false);
    }
  };
  
  // Refresh conversations when component mounts or becomes visible
  // This ensures unread counts are updated when user navigates back
  useEffect(() => {
    const handleFocus = () => {
      fetchConversations();
    };
    
    const handleMessagesMarkedAsRead = () => {
      // Refresh conversations when messages are marked as read
      fetchConversations();
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('messagesMarkedAsRead', handleMessagesMarkedAsRead);
    // Also refresh on mount
    fetchConversations();
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('messagesMarkedAsRead', handleMessagesMarkedAsRead);
    };
  }, [fetchConversations]);
  
  /** Subject is set once at conversation creation — use message_types for tabs when offers are sent in an existing thread. */
  const matchesSellerTab = (
    conversation: (typeof conversations)[number],
    tab: string
  ) => {
    if (tab === "all") return true;
    const types = conversation.message_types ?? [];
    const subj = (conversation.subject ?? "").toLowerCase();

    if (types.length > 0) {
      if (tab === "offer") return types.includes("offer");
      if (tab === "reserve") return types.includes("reserve");
      if (tab === "contact") {
        return types.includes("contact") || types.includes("message");
      }
    }

    if (tab === "offer") return subj.includes("offer");
    if (tab === "reserve") return subj.includes("reserve");
    if (tab === "contact") {
      return (
        subj.includes("contact") ||
        subj.includes("enquiry") ||
        subj.includes("inquiry") ||
        subj.includes("general enquiry")
      );
    }
    return false;
  };

  const filteredConversations = conversations.filter((conversation) => {
    if (!matchesSellerTab(conversation, activeTab)) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        conversation.listing_title?.toLowerCase().includes(searchLower) ||
        conversation.other_user_name?.toLowerCase().includes(searchLower) ||
        conversation.subject.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getTypeColor = (conversation: (typeof conversations)[number]) => {
    const types = conversation.message_types ?? [];
    const subj = conversation.subject.toLowerCase();
    if (types.includes("offer") || subj.includes("offer")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (types.includes("reserve") || subj.includes("reserve")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    return "bg-amber-100 text-amber-800 border-amber-200";
  };

  const getTypeLabel = (conversation: (typeof conversations)[number]) => {
    const types = conversation.message_types ?? [];
    const subj = conversation.subject.toLowerCase();
    if (types.includes("offer") || subj.includes("offer")) return "Offer";
    if (types.includes("reserve") || subj.includes("reserve")) return "Reserve";
    return "Contact";
  };

  const handleMessageClick = (conversationId: string) => {
    router.push(`/my-seller-dashboard/messages/${conversationId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-dark-green" />
        <span className="ml-2 text-lg">Loading your messages...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-start mb-6">
        <div>
          <h2 className="text-2xl font-berkshire text-brand-dark-green mb-1">My Messages</h2>
          <p className="text-gray-600">Communication with potential buyers</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={markingAll || totalUnread === 0}
          onClick={handleMarkAllRead}
        >
          {markingAll ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search messages, buyers, or listings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-md"
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
        <div className="overflow-x-auto scrollbar-hide -mx-1 px-1">
          <TabsList className="mb-6 w-max min-w-full">
            <TabsTrigger value="all" className="min-w-0 flex-shrink-0">
              All Messages
            </TabsTrigger>
            <TabsTrigger value="contact" className="min-w-0 flex-shrink-0">
              Enquiries
            </TabsTrigger>
            <TabsTrigger value="offer" className="min-w-0 flex-shrink-0">
              Offers
            </TabsTrigger>
            <TabsTrigger value="reserve" className="min-w-0 flex-shrink-0">
              Reservations
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {filteredConversations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredConversations.map((conversation) => (
                <Card 
                  key={conversation.id} 
                  className={`hover:shadow-md transition-shadow ${
                    (conversation.unread_count ?? 0) > 0 ? "border-l-4 border-l-brand-soft-green" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 shrink-0 bg-brand-soft-green/10 rounded-md flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-brand-soft-green" />
                      </div>
                      
                      <div className="flex-grow min-w-0">
                        <div className="flex justify-between items-start mb-2 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="font-medium text-sm truncate">{conversation.listing_title}</h4>
                            {(conversation.unread_count ?? 0) > 0 && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                                title="Unread messages"
                                aria-label="Unread messages in this chat"
                              />
                            )}
                          </div>
                          <Badge className={getTypeColor(conversation)}>
                            {getTypeLabel(conversation)}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1 mb-2">
                          <div className="flex justify-center items-center w-5 h-5 rounded-full bg-brand-soft-green text-xs font-medium text-white">
                            {conversation.other_user_name?.charAt(0) || 'U'}
                          </div>
                          <p className="text-xs text-gray-600">{conversation.other_user_name}</p>
                        </div>
                        
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            {conversation.last_message_at
                              ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                              : 'No messages yet'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="px-4 py-2 border-t flex justify-between">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs"
                      onClick={() => handleMessageClick(conversation.id)}
                    >
                      View all messages
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="text-xs bg-brand-soft-green hover:bg-brand-soft-green/90 text-white"
                      onClick={() => handleMessageClick(conversation.id)}
                    >
                      Reply
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No messages found.</p>
              {searchTerm && (
                <Button 
                  variant="link" 
                  onClick={() => setSearchTerm("")}
                  className="mt-2"
                >
                  Clear search
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SellerMessages;
