'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertTriangle, Eye, X, ArrowUp, Search, Users, MessageSquare, ShoppingCart } from "lucide-react";
import { isUnreviewedSuspiciousUser } from "@/lib/utils/fraud-utils";

interface FraudUser {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  fraud_flags: any;
  created_at: string | null;
}

interface FraudMessage {
  id: string;
  content: string;
  fraud_keywords: string[];
  created_at: string;
  sender_id: string;
  conversation_id: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface FraudReservation {
  id: string;
  user_id: string;
  ip_address: string;
  reason: string;
  details: any;
  created_at: string;
  reservation_id?: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminFraudAlertsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch fraudulent users (excluding reviewed and only suspicious ones)
  const { data: fraudUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['fraud-users'],
    queryFn: async (): Promise<FraudUser[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name, fraud_flags, created_at')
        .not('fraud_flags', 'is', null);

      if (error) throw error;
      // Filter to only show suspicious users (is_suspicious: true OR has flags) and exclude reviewed
      return (data || []).filter((user: any) => isUnreviewedSuspiciousUser(user.fraud_flags));
    }
  });

  // Fetch fraudulent messages (excluding reviewed)
  const { data: fraudMessages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['fraud-messages'],
    queryFn: async (): Promise<FraudMessage[]> => {
      const { data: messages, error } = await supabase
        .from('messages')
        .select('id, content, fraud_keywords, created_at, sender_id, conversation_id, reviewed_at')
        .eq('fraud_flag', true)
        .is('reviewed_at', null) as any;

      if (error) throw error;
      if (!messages) return [];

      // Get sender details separately
      const senderIds = (messages as any[]).map(m => m.sender_id).filter((id): id is string => id !== null);
      const { data: senders } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', senderIds.length > 0 ? senderIds : []);

      // Combine data
      const enrichedMessages = (messages as any[]).map(message => ({
        ...message,
        sender: senders?.find(s => s.id === message.sender_id)
      }));

      return enrichedMessages as FraudMessage[];
    }
  });

  // Fetch fraud logs (reservations) - excluding reviewed
  const { data: fraudReservations = [], isLoading: loadingReservations } = useQuery({
    queryKey: ['fraud-logs'],
    queryFn: async (): Promise<FraudReservation[]> => {
      const { data: logs, error } = await supabase
        .from('fraud_logs')
        .select('id, user_id, ip_address, reason, details, created_at, reservation_id, reviewed_at')
        .is('reviewed_at', null)
        .order('created_at', { ascending: false }) as any;

      if (error) throw error;
      if (!logs) return [];

      // Get user details separately
      const userIds = (logs as any[]).map(log => log.user_id).filter((id): id is string => id !== null);
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds.length > 0 ? userIds : []);

      // Combine data
      const enrichedLogs = (logs as any[]).map(log => ({
        ...log,
        ip_address: String(log.ip_address),
        user: users?.find(u => u.id === log.user_id)
      }));

      return enrichedLogs as FraudReservation[];
    }
  });

  // Mutation to remove/dismiss fraud alert
  const dismissAlert = useMutation({
    mutationFn: async ({ type, id }: { type: string; id: string }) => {

      if (type === 'user') {
        // Get current fraud_flags to preserve the data
        const { data: userData, error: fetchError } = await supabase
          .from('user_profiles')
          .select('fraud_flags')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('❌ Error fetching user fraud_flags:', fetchError);
          throw new Error(`Failed to fetch user data: ${fetchError.message}`);
        }

        // Update fraud_flags to add closed_by_admin flag
        let currentFlags = userData?.fraud_flags as any;

        // Handle case where fraud_flags is null or empty
        if (!currentFlags || (Array.isArray(currentFlags) && currentFlags.length === 0)) {
          currentFlags = {};
        }

        // If it's an array (legacy format), convert to object
        if (Array.isArray(currentFlags)) {
          currentFlags = {
            flags: currentFlags,
            is_suspicious: currentFlags.length > 0 ? true : null
          };
        }

        // Ensure it's an object
        if (typeof currentFlags !== 'object' || Array.isArray(currentFlags)) {
          currentFlags = {};
        }

        // Add closed_by_admin flag and timestamp
        const adminUser = (await supabase.auth.getUser()).data.user;
        const updatedFlags = {
          ...currentFlags,
          closed_by_admin: true,
          closed_at: new Date().toISOString(),
          closed_by: adminUser?.id
        };
        // Use RPC function to update fraud_flags, bypassing the trigger

        // First try using RPC function to bypass trigger
        const { error: rpcError } = await (supabase.rpc as any)('update_user_fraud_flags', {
          p_user_id: id,
          p_fraud_flags: updatedFlags
        });

        if (rpcError) {
          // Fallback to direct update if RPC doesn't exist
          const { data, error } = await supabase
            .from('user_profiles')
            .update({
              fraud_flags: updatedFlags
            })
            .eq('id', id)
            .select('id, fraud_flags')
            .single();

          if (error) {
            console.error('❌ Supabase error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            throw new Error(`Failed to remove user alert: ${error.message} (Code: ${error.code})`);
          }

          if (!data) {
            throw new Error('No user found with that ID or update failed');
          }
          // Check if the response already has the flag
          const fraudFlags = data.fraud_flags as any;
          if (fraudFlags?.closed_by_admin === true) {

            return; // Success, exit early
          }
        } else {

        }

        // Wait a moment for database to commit

        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch fresh data to verify

        const { data: verifyData, error: verifyError } = await supabase
          .from('user_profiles')
          .select('fraud_flags')
          .eq('id', id)
          .single();

        if (verifyError) {
          console.error('❌ Error verifying update:', verifyError);
          throw new Error(`Verification failed: ${verifyError.message}`);
        }
        // Verify the update was successful
        const verifiedFlags = verifyData?.fraud_flags as any;
        if (verifiedFlags?.closed_by_admin !== true) {
          console.error('❌ ERROR: closed_by_admin flag not set correctly in database!');
          console.error('❌ Expected closed_by_admin: true');
          console.error('❌ Actual fraud_flags:', verifyData?.fraud_flags);
          console.error('❌ The trigger may be overwriting the update. Please run the migration to fix the trigger.');
          throw new Error('Database update verification failed - closed_by_admin not set. The trigger is overwriting the update. Please run the migration: 20250104000001_fix_fraud_trigger_preserve_closed_by_admin.sql');
        }

      } else if (type === 'message') {
        const { data, error } = await supabase
          .from('messages')
          .update({ fraud_flag: false, fraud_keywords: null, reviewed_at: new Date().toISOString() })
          .eq('id', id)
          .select();

        if (error) {
          console.error('❌ Error dismissing message alert:', error);
          throw new Error(`Failed to remove message alert: ${error.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error('No message found with that ID');
        }

      } else if (type === 'reservation') {
        const { data, error } = await supabase
          .from('fraud_logs')
          .update({ reviewed_at: new Date().toISOString() })
          .eq('id', id)
          .select();

        if (error) {
          console.error('❌ Error dismissing reservation alert:', error);
          throw new Error(`Failed to remove reservation alert: ${error.message}`);
        }

        if (!data || data.length === 0) {
          throw new Error(
            'Could not update this fraud log (0 rows). If you are an admin, apply the migration that adds RLS policies on fraud_logs, or ask a DBA to grant UPDATE on fraud_logs for admins.',
          );
        }

      } else {
        throw new Error(`Unknown alert type: ${type}`);
      }
    },
    onMutate: async ({ type, id }) => {

      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ['fraud-users'] });
      await queryClient.cancelQueries({ queryKey: ['fraud-messages'] });
      await queryClient.cancelQueries({ queryKey: ['fraud-logs'] });
      await queryClient.cancelQueries({ queryKey: ['admin-fraud-alerts-count'] });

      // Snapshot previous values for rollback
      const previousUsers = queryClient.getQueryData<FraudUser[]>(['fraud-users']);
      const previousMessages = queryClient.getQueryData<FraudMessage[]>(['fraud-messages']);
      const previousLogs = queryClient.getQueryData<FraudReservation[]>(['fraud-logs']);
      const previousCount = queryClient.getQueryData<number>(['admin-fraud-alerts-count']);

      // Optimistically remove the item from the list
      if (type === 'user') {
        queryClient.setQueryData<FraudUser[]>(['fraud-users'], (old = []) =>
          old.filter((user) => user.id !== id)
        );
      } else if (type === 'message') {
        queryClient.setQueryData<FraudMessage[]>(['fraud-messages'], (old = []) =>
          old.filter((msg) => msg.id !== id)
        );
      } else if (type === 'reservation') {
        queryClient.setQueryData<FraudReservation[]>(['fraud-logs'], (old = []) =>
          old.filter((log) => log.id !== id)
        );
      }

      // Optimistically decrease the count
      queryClient.setQueryData<number>(['admin-fraud-alerts-count'], (old = 0) =>
        Math.max(0, old - 1)
      );

      // Close modal immediately
      setSelectedAlert(null);

      return { previousUsers, previousMessages, previousLogs, previousCount };
    },
    onError: (error: any, variables, context) => {
      console.error('❌ Error dismissing alert:', error);

      // Rollback optimistic updates on error
      if (context) {
        queryClient.setQueryData(['fraud-users'], context.previousUsers);
        queryClient.setQueryData(['fraud-messages'], context.previousMessages);
        queryClient.setQueryData(['fraud-logs'], context.previousLogs);
        queryClient.setQueryData(['admin-fraud-alerts-count'], context.previousCount);
      }

      toast({
        variant: "destructive",
        title: "Error removing alert",
        description: error?.message || "Please try again"
      });
    },
    onSuccess: async (_, variables) => {

      toast({
        title: "Alert removed successfully",
        description: "The fraud alert has been removed."
      });

      // Wait a moment to ensure database transaction is fully committed
      await new Promise(resolve => setTimeout(resolve, 300));

      // Invalidate queries to trigger refetch with latest data

      queryClient.invalidateQueries({ queryKey: ['fraud-users'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-messages'] });
      queryClient.invalidateQueries({ queryKey: ['fraud-logs'] });
      queryClient.invalidateQueries({ queryKey: ['admin-fraud-alerts-count'] });

    }
  });

  const escalateAlert = useMutation({
    mutationFn: async ({
      type,
      id,
      detailText,
    }: {
      type: string;
      id: string;
      detailText: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("fraud-escalate", {
        body: { alertType: type, alertId: id, detailText },
      });
      if (error) throw new Error(error.message || "Escalation failed");
      return data;
    },
    onError: (error: unknown) => {
      toast({
        variant: "destructive",
        title: "Escalation failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    },
    onSuccess: () => {
      toast({
        title: "Escalation sent",
        description: "Admins have been emailed with this alert context.",
      });
    },
  });

  const getAlertSeverity = (item: any, type: string) => {
    if (type === 'user') {
      const flags = item.fraud_flags?.flags || [];
      if (flags.some((f: string) => f.includes('disposable_email'))) return 'high';
      if (flags.length > 2) return 'medium';
      return 'low';
    }
    if (type === 'message') {
      const keywords = item.fraud_keywords || [];
      if (keywords.some((k: string) => k.includes('scam') || k.includes('fraud'))) return 'high';
      return 'medium';
    }
    if (type === 'reservation') {
      if (item.reason.includes('multiple_ip_reservations')) return 'high';
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const filteredUsers = fraudUsers.filter(user => {
    const matchesSearch = !searchTerm ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    const severity = getAlertSeverity(user, 'user');
    return matchesSearch && severity === statusFilter;
  });

  const filteredMessages = fraudMessages.filter(message => {
    const matchesSearch = !searchTerm ||
      message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      message.sender?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    const severity = getAlertSeverity(message, 'message');
    return matchesSearch && severity === statusFilter;
  });

  const filteredReservations = fraudReservations.filter(reservation => {
    const matchesSearch = !searchTerm ||
      reservation.ip_address.includes(searchTerm) ||
      reservation.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'all') return matchesSearch;
    const severity = getAlertSeverity(reservation, 'reservation');
    return matchesSearch && severity === statusFilter;
  });

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Fraud Alerts</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Monitor and manage suspicious activity across the platform
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              Flagged Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fraudUsers.length}</p>
            <p className="text-xs text-muted-foreground">Suspicious signups</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-red-500" />
              Flagged Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fraudMessages.length}</p>
            <p className="text-xs text-muted-foreground">Suspicious messages</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-500" />
              Flagged Reservations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{fraudReservations.length}</p>
            <p className="text-xs text-muted-foreground">Suspicious bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alerts</SelectItem>
            <SelectItem value="high">High Risk</SelectItem>
            <SelectItem value="medium">Medium Risk</SelectItem>
            <SelectItem value="low">Low Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts Tabs */}
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="flex-wrap w-full h-auto">
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users ({filteredUsers.length})</TabsTrigger>
          <TabsTrigger value="messages" className="text-xs sm:text-sm">Messages ({filteredMessages.length})</TabsTrigger>
          <TabsTrigger value="reservations" className="text-xs sm:text-sm">Reservations ({filteredReservations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {loadingUsers ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading fraudulent users...
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No fraudulent users found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => {
                const severity = getAlertSeverity(user, 'user');
                const flags = user.fraud_flags?.flags || [];

                return (
                  <Card key={user.id} className="border-l-4 border-l-orange-500">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg break-words">
                            {user.first_name || ''} {user.last_name || ''}
                          </CardTitle>
                          <CardDescription className="break-words">{user.email || 'No email'}</CardDescription>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <Badge variant={getSeverityColor(severity)} className="text-xs">
                            {severity.toUpperCase()} RISK
                          </Badge>
                          <Dialog
                            open={selectedAlert?.type === 'user' && selectedAlert?.id === user.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setSelectedAlert(null);
                              } else {
                                setSelectedAlert({ type: 'user', id: user.id });
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>User Fraud Details</DialogTitle>
                                <DialogDescription>
                                  Review suspicious signup activity for {user.email}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Detected Issues:</h4>
                                  <ul className="list-disc list-inside space-y-1 text-sm">
                                    {flags.map((flag: string, index: number) => (
                                      <li key={index} className="text-muted-foreground">{flag}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4 className="font-medium">Registration Date:</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {user.created_at ? format(new Date(user.created_at), 'PPpp') : 'Unknown'}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {

                                      dismissAlert.mutate({ type: 'user', id: user.id });
                                    }}
                                    disabled={dismissAlert.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {dismissAlert.isPending ? 'Removing...' : 'Remove'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={escalateAlert.isPending}
                                    onClick={() =>
                                      escalateAlert.mutate({
                                        type: "user",
                                        id: user.id,
                                        detailText: JSON.stringify({
                                          email: user.email,
                                          fraud_flags: user.fraud_flags,
                                        }),
                                      })
                                    }
                                  >
                                    <ArrowUp className="h-4 w-4 mr-1" />
                                    {escalateAlert.isPending ? "Sending…" : "Escalate"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {flags.slice(0, 3).map((flag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {flag.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {flags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{flags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {loadingMessages ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading fraudulent messages...
              </CardContent>
            </Card>
          ) : filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No fraudulent messages found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredMessages.map((message) => {
                const severity = getAlertSeverity(message, 'message');

                return (
                  <Card key={message.id} className="border-l-4 border-l-red-500">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg">
                            Suspicious Message
                          </CardTitle>
                          <CardDescription className="break-words">
                            From: {message.sender?.first_name} {message.sender?.last_name} ({message.sender?.email})
                          </CardDescription>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <Badge variant={getSeverityColor(severity)} className="text-xs">
                            {severity.toUpperCase()} RISK
                          </Badge>
                          <Dialog
                            open={selectedAlert?.type === 'message' && selectedAlert?.id === message.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setSelectedAlert(null);
                              } else {
                                setSelectedAlert({ type: 'message', id: message.id });
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Message Fraud Details</DialogTitle>
                                <DialogDescription>
                                  Review suspicious message content
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Message Content:</h4>
                                  <div className="bg-muted p-3 rounded text-sm">
                                    {message.content}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium">Flagged Keywords:</h4>
                                  <div className="flex flex-wrap gap-1">
                                    {message.fraud_keywords.map((keyword, index) => (
                                      <Badge key={index} variant="destructive" className="text-xs">
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="font-medium">Sent Date:</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(message.created_at), 'PPpp')}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {

                                      dismissAlert.mutate({ type: 'message', id: message.id });
                                    }}
                                    disabled={dismissAlert.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {dismissAlert.isPending ? 'Removing...' : 'Remove'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={escalateAlert.isPending}
                                    onClick={() =>
                                      escalateAlert.mutate({
                                        type: "message",
                                        id: message.id,
                                        detailText: JSON.stringify({
                                          sender: message.sender?.email,
                                          conversation_id: message.conversation_id,
                                          content: message.content?.slice(0, 2000),
                                          keywords: message.fraud_keywords,
                                        }),
                                      })
                                    }
                                  >
                                    <ArrowUp className="h-4 w-4 mr-1" />
                                    {escalateAlert.isPending ? "Sending…" : "Escalate"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {message.fraud_keywords.slice(0, 3).map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {message.fraud_keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{message.fraud_keywords.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reservations" className="space-y-4">
          {loadingReservations ? (
            <Card>
              <CardContent className="py-8 text-center">
                Loading fraudulent reservations...
              </CardContent>
            </Card>
          ) : filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No fraudulent reservations found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReservations.map((reservation) => {
                const severity = getAlertSeverity(reservation, 'reservation');

                return (
                  <Card key={reservation.id} className="border-l-4 border-l-purple-500">
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg">
                            Suspicious Reservation Activity
                          </CardTitle>
                          <CardDescription className="break-words">
                            IP: {reservation.ip_address} | User: {reservation.user?.email}
                          </CardDescription>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          <Badge variant={getSeverityColor(severity)} className="text-xs">
                            {severity.toUpperCase()} RISK
                          </Badge>
                          <Dialog
                            open={selectedAlert?.type === 'reservation' && selectedAlert?.id === reservation.id}
                            onOpenChange={(open) => {
                              if (!open) {
                                setSelectedAlert(null);
                              } else {
                                setSelectedAlert({ type: 'reservation', id: reservation.id });
                              }
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Reservation Fraud Details</DialogTitle>
                                <DialogDescription>
                                  Review suspicious reservation activity
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-medium">Fraud Reason:</h4>
                                  <p className="text-sm text-muted-foreground">{reservation.reason}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium">IP Address:</h4>
                                  <p className="text-sm text-muted-foreground">{reservation.ip_address}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium">User Details:</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {reservation.user?.first_name} {reservation.user?.last_name} ({reservation.user?.email})
                                  </p>
                                </div>
                                {reservation.details && (
                                  <div>
                                    <h4 className="font-medium">Additional Details:</h4>
                                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                      {JSON.stringify(reservation.details, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                <div>
                                  <h4 className="font-medium">Detected Date:</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(reservation.created_at), 'PPpp')}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => {

                                      dismissAlert.mutate({ type: 'reservation', id: reservation.id });
                                    }}
                                    disabled={dismissAlert.isPending}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    {dismissAlert.isPending ? 'Removing...' : 'Remove'}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={escalateAlert.isPending}
                                    onClick={() =>
                                      escalateAlert.mutate({
                                        type: "reservation",
                                        id: reservation.id,
                                        detailText: JSON.stringify({
                                          reason: reservation.reason,
                                          ip: reservation.ip_address,
                                          user: reservation.user?.email,
                                          details: reservation.details,
                                        }),
                                      })
                                    }
                                  >
                                    <ArrowUp className="h-4 w-4 mr-1" />
                                    {escalateAlert.isPending ? "Sending…" : "Escalate"}
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <Badge variant="outline" className="mt-2 w-fit text-xs">
                        {reservation.reason.replace(/_/g, ' ')}
                      </Badge>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

