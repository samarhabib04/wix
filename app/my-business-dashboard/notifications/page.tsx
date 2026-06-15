'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, XCircle, Info, Trash2, ShieldCheck, Package, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  listing_id?: string;
  listing_type?: string;
  created_at: string;
}

export default function BusinessNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { unreadCount } = useRealtimeNotifications();

  const [filter, setFilter] = useState<'all' | 'vet_partner' | 'marketplace'>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['business-notifications', user?.id, filter],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Filter by type if needed
      if (filter === 'vet_partner') {
        query = query.in('type', [
          'vet_partner_request_submitted',
          'vet_partner_request_approved',
          'vet_partner_request_rejected'
        ]);
      } else if (filter === 'marketplace') {
        query = query.in('type', [
          'marketplace_product_purchased',
          'marketplace_payment_completed'
        ]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to mark notification as read: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete notification: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to mark all as read: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: string) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'vet_partner_request_approved':
      case 'reservation_payment_confirmed':
      case 'reservation_confirmed':
      case 'success':
      case 'marketplace_payment_completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'vet_partner_request_rejected':
      case 'error':
      case 'reservation_dispute':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'vet_partner_request_submitted':
        return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      case 'marketplace_product_purchased':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'business_review_submitted':
        return <Star className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'vet_partner_request_submitted':
        return <Badge className="bg-blue-500">Request Submitted</Badge>;
      case 'vet_partner_request_approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'vet_partner_request_rejected':
        return <Badge className="bg-red-500">Rejected</Badge>;
      case 'reservation_payment_confirmed':
        return <Badge className="bg-green-500">Payment</Badge>;
      case 'reservation_confirmed':
        return <Badge className="bg-blue-500">Confirmed</Badge>;
      case 'reservation_dispute':
        return <Badge className="bg-red-500">Dispute</Badge>;
      case 'new_reservation_received':
        return <Badge className="bg-purple-500">New</Badge>;
      case 'marketplace_product_purchased':
        return <Badge className="bg-blue-500">Sale</Badge>;
      case 'marketplace_payment_completed':
        return <Badge className="bg-green-500">Payment Received</Badge>;
      case 'business_review_submitted':
        return <Badge className="bg-amber-500">New Review</Badge>;
      default:
        return <Badge>Info</Badge>;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const vetPartnerNotifications = notifications.filter(n => 
    n.type.includes('vet_partner')
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadNotifications.length > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadNotifications.length} new
              </Badge>
            )}
          </CardTitle>
          {unreadNotifications.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark All Read
            </Button>
          )}
        </div>
        <div className="overflow-x-auto -mx-2 px-2">
          <div className="flex gap-1 border rounded-md w-max">
            <Button
              size="sm"
              variant={filter === 'all' ? 'default' : 'ghost'}
              onClick={() => setFilter('all')}
              className="h-8 flex-shrink-0"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filter === 'vet_partner' ? 'default' : 'ghost'}
              onClick={() => setFilter('vet_partner')}
              className="h-8 flex-shrink-0"
            >
              Partner Requests
              {vetPartnerNotifications.filter(n => !n.read).length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs">
                  {vetPartnerNotifications.filter(n => !n.read).length}
                </Badge>
              )}
            </Button>
            <Button
              size="sm"
              variant={filter === 'marketplace' ? 'default' : 'ghost'}
              onClick={() => setFilter('marketplace')}
              className="h-8 flex-shrink-0"
            >
              <Package className="h-3 w-3 mr-1" />
              Marketplace
              {notifications.filter(n => !n.read && (n.type === 'marketplace_product_purchased' || n.type === 'marketplace_payment_completed')).length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs">
                  {notifications.filter(n => !n.read && (n.type === 'marketplace_product_purchased' || n.type === 'marketplace_payment_completed')).length}
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 border rounded-lg ${
                  notification.read ? 'bg-gray-50' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">{getTypeIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium">{notification.title}</h4>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {getTypeBadge(notification.type)}
                        {!notification.read && (
                          <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{notification.message}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleDateString()} at{' '}
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                    <div className="flex gap-2">
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={markAsReadMutation.isPending}
                        >
                          Mark Read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(notification.id)}
                        disabled={deleteNotificationMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
