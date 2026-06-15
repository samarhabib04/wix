
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, DollarSign, Heart, Clock, ExternalLink } from "lucide-react";
import { useConversations } from "@/hooks/use-conversations";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { markAllIncomingMessagesRead } from "@/lib/messages/mark-all-incoming-read";

type MessageType = "all" | "contact" | "offer" | "reserve";

export const BuyerMessages = () => {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MessageType>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const { conversations, loading, fetchConversations } = useConversations();

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

  const filteredConversations = activeTab === "all" 
    ? conversations 
    : conversations.filter(conv => {
        const messageTypes = conv.message_types || [];
        
        switch (activeTab) {
          case "contact":
            return messageTypes.includes('contact') || messageTypes.includes('message');
          case "offer":
            return messageTypes.includes('offer');
          case "reserve":
            return messageTypes.includes('reserve');
          default:
            return true;
        }
      });

  const getTypeIcon = (messageTypes: string[]) => {
    if (messageTypes.includes('offer')) return DollarSign;
    if (messageTypes.includes('reserve')) return Heart;
    return MessageSquare;
  };

  const getTypeBadges = (messageTypes: string[]) => {
    const badges = [];
    
    if (messageTypes.includes('contact') || messageTypes.includes('message')) {
      badges.push({ label: 'Contact', color: 'bg-brand-soft-green text-white ' });
    }
    if (messageTypes.includes('offer')) {
      badges.push({ label: 'Offer', color: 'bg-orange-600 text-white ' });
    }
    if (messageTypes.includes('reserve')) {
      badges.push({ label: 'Reserve', color: 'bg-brand-dark-green text-white ' });
    }
    
    return badges.length > 0 ? badges : [{ label: 'Contact', color: 'bg-orange-100 text-orange-800 border-orange-200' }];
  };

  const getListingUrl = (listingId: string, listingType: string) => {
  switch (listingType) {
    case 'sale':
      return `/listing/${listingId}`;
    case 'stud':
      return `/stud/${listingId}`;
    case 'showcase':
      return `/showcase/${listingId}`;
    default:
      return `/listing/${listingId}`;
  }
};

  const viewConversation = (conversationId: string) => {
    router.push(`/my-buyer-dashboard/messages/${conversationId}`);
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
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markingAll || totalUnread === 0}
          onClick={handleMarkAllRead}
        >
          {markingAll ? "Marking…" : "Mark all as read"}
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => setActiveTab(value as MessageType)}>
        <TabsList className="mb-4 w-full grid grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <span className="hidden sm:inline">All Messages</span>
            <span className="sm:hidden">All</span>
          </TabsTrigger>
          <TabsTrigger value="contact" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Contact</span>
            <span className="sm:hidden ml-1">Contact</span>
          </TabsTrigger>
          <TabsTrigger value="offer" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Offers</span>
            <span className="sm:hidden ml-1">Offers</span>
          </TabsTrigger>
          <TabsTrigger value="reserve" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Heart className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
            <span className="hidden sm:inline">Reservations</span>
            <span className="sm:hidden ml-1">Reserve</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="space-y-3 sm:space-y-4">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => {
              const messageTypes = conversation.message_types || [];
              const TypeIcon = getTypeIcon(messageTypes);
              const typeBadges = getTypeBadges(messageTypes);
              const listingUrl = getListingUrl(conversation.listing_id, conversation.listing_type);
              const hasUnreadMessages = (conversation.unread_count ?? 0) > 0;
              
              return (
                <Card 
                  key={conversation.id} 
                  className={`cursor-pointer hover:shadow-md transition-shadow touch-manipulation ${
                    hasUnreadMessages ? "border-l-4 border-l-brand-soft-green bg-brand-soft-green/5" : ""
                  }`}
                  onClick={() => viewConversation(conversation.id)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex gap-3">
                      {/* Listing image */}
                      <div className="flex-shrink-0">
                        <Link 
                          href={listingUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="block w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                        >
                          {conversation.listing_image ? (
                            <img 
                              src={conversation.listing_image} 
                              alt={conversation.listing_title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-brand-soft-green/10 flex items-center justify-center ${conversation.listing_image ? 'hidden' : ''}`}>
                            <TypeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-brand-soft-green" />
                          </div>
                        </Link>
                      </div>

                      {/* Content */}
                      <div className="flex-grow min-w-0 space-y-2">
                        {/* Header row with name and icon */}
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Message type icon */}
                          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-brand-soft-green/10 grid place-items-center flex-shrink-0">
                            <TypeIcon className="h-3 w-3 sm:h-4 sm:w-4 text-brand-soft-green" />
                          </div>
                          <h3 className={`font-semibold text-sm sm:text-base truncate min-w-0 ${hasUnreadMessages ? 'text-brand-dark-green' : ''}`}>
                            {conversation.other_user_name}
                          </h3>
                          {hasUnreadMessages && (
                            <span
                              className="h-2 w-2 shrink-0 rounded-full bg-red-500"
                              title="Unread messages"
                              aria-label="Unread messages in this chat"
                            />
                          )}
                        </div>
                        
                        {/* Badges row */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          {typeBadges.map((badge, index) => (
                            <Badge key={index} className={`${badge.color} text-xs px-1.5 py-0.5`}>
                              {badge.label}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Listing title with link */}
                        <Link 
                          href={listingUrl}
                          onClick={(e) => e.stopPropagation()}
                          className="block text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline truncate"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="truncate">Re: {conversation.listing_title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </div>
                        </Link>
                        
                        {/* Footer with time and button */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span className="truncate">
                              {conversation.last_message_at
                                ? formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })
                                : 'No messages yet'}
                            </span>
                          </div>
                          
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-brand-soft-green hover:text-white hover:bg-brand-soft-green border-brand-soft-green text-xs px-2 py-1 h-auto min-h-[28px] flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewConversation(conversation.id);
                            }}
                          >
                            <span className="hidden sm:inline">View Chat</span>
                            <span className="sm:hidden">View</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-10 px-4">
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-base sm:text-lg font-semibold">No messages found</h3>
              <p className="text-gray-500 mt-2 text-sm sm:text-base">
                You don't have any {activeTab !== "all" ? activeTab : ""} messages yet.
              </p>
              <Button 
                variant="outline" 
                className="mt-4 text-sm"
                onClick={() => router.push('/listings')}
              >
                Browse Listings
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BuyerMessages;
