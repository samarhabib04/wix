'use client';

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCircle, Info, AlertCircle, ShieldCheck, ShoppingBag, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAdminNotificationDetailHref } from "@/lib/utils/admin-notification-links";
interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  listing_id?: string | null;
  listing_type?: string | null;
  created_at: string;
}

const ADMIN_APPROVAL_TYPES = new Set([
  "listing_approval_required",
  "stud_approval_required",
  "showcase_approval_required",
  "business_approval_required",
  "approval_required",
  "vet_partner_request_submitted",
  "marketplace_product_approval_required",
]);

const AdminNotificationsPage = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<"all" | "approvals" | "other">("all");

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: isAdmin, error: rpcError } = await supabase.rpc("is_current_user_admin");
      if (rpcError) {
        console.error("Error checking admin for notifications page:", rpcError);
        return [];
      }
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading admin notifications:", error);
        throw error;
      }

      return data as Notification[];
    },
    enabled: !!user,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications", user?.id] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to mark notification as read",
        description: error?.message || "Please try again.",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications", user?.id] });
      toast({ title: "Notification deleted" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete notification",
        description: error?.message || "Please try again.",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-notification-counts"] });
      toast({ title: "All notifications marked as read" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to mark all as read",
        description: error?.message || "Please try again.",
      });
    },
  });

  const getTypeIcon = (type: string) => {
    if (ADMIN_APPROVAL_TYPES.has(type)) {
      if (type === "vet_partner_request_submitted") {
        return <ShieldCheck className="h-4 w-4 text-blue-600" />;
      }
      return <Bell className="h-4 w-4 text-orange-600" />;
    }
    switch (type) {
      case "fraud_alert":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "dispute_resolved":
      case "reservation_payment_confirmed":
      case "new_reservation_received":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "new_shop_order":
        return <ShoppingBag className="h-4 w-4 text-emerald-600" />;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const wrapBadge = (href: string | null, node: ReactNode) => {
    if (!href) return node;
    return (
      <Link href={href} className="inline-flex items-center max-w-full" title="View details">
        <span className="inline-flex cursor-pointer ring-offset-background transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md">
          {node}
        </span>
      </Link>
    );
  };

  const getTypeBadge = (notification: Notification) => {
    const detailHref = getAdminNotificationDetailHref(notification);
    const type = notification.type;

    if (ADMIN_APPROVAL_TYPES.has(type)) {
      if (type === "vet_partner_request_submitted") {
        return wrapBadge(
          detailHref,
          <Badge className="bg-blue-500 text-white">Partner Request</Badge>
        );
      }
      return wrapBadge(
        detailHref,
        <Badge className="bg-orange-500 text-white">Approval Required</Badge>
      );
    }
    switch (type) {
      case "fraud_alert":
        return wrapBadge(
          detailHref,
          <Badge className="bg-red-500 text-white">Fraud Alert</Badge>
        );
      case "dispute_resolved":
        return <Badge className="bg-green-500 text-white">Dispute</Badge>;
      case "new_shop_order":
        return <Badge className="bg-emerald-500 text-white">Shop Order</Badge>;
      default:
        return wrapBadge(
          detailHref,
          <Badge variant="outline">Info</Badge>
        );
    }
  };

  const filterByType = (notification: Notification) => {
    const isApproval = ADMIN_APPROVAL_TYPES.has(notification.type);
    if (typeFilter === "approvals") return isApproval;
    if (typeFilter === "other") return !isApproval;
    return true;
  };



  // Do not gate on role === null (still resolving); layout + middleware enforce admin routes.
  if (user && role !== null && role !== "admin") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin Notifications</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You do not have permission to view this page.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Admin Notifications
          </CardTitle>
          <CardDescription>Loading notifications...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredNotifications = notifications.filter(filterByType);
  const unreadTotal = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 md:h-7 md:w-7 text-brand-dark-green" />
          Admin Notifications
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Review all system alerts, especially items that require your approval.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardDescription className="text-sm">
            Approval-required notifications are highlighted as high priority. Opening this page does not
            mark items read—use Mark read per item or Mark all read.
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {unreadTotal > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="whitespace-nowrap"
              >
                Mark all read
              </Button>
            )}
            <Select
              value={typeFilter}
              onValueChange={(value: "all" | "approvals" | "other") => setTypeFilter(value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All notifications</SelectItem>
                <SelectItem value="approvals">Approvals only</SelectItem>
                <SelectItem value="other">Other alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p>No notifications found for this filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => {
                const detailHref = getAdminNotificationDetailHref(notification);
                return (
                <div
                  key={notification.id}
                  className={`p-3 md:p-4 border rounded-lg flex flex-col md:flex-row items-start justify-between gap-3 md:gap-4 ${notification.read
                    ? "bg-gray-50"
                    : ADMIN_APPROVAL_TYPES.has(notification.type)
                      ? "bg-orange-50 border-orange-200"
                      : "bg-blue-50 border-blue-200"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getTypeIcon(notification.type)}
                      <h3 className="font-medium text-sm md:text-base break-words">{notification.title}</h3>
                      <div className="flex flex-wrap gap-1 items-center">
                        {getTypeBadge(notification)}
                        {!notification.read && (
                          <Badge className="bg-blue-600 text-white text-[10px]">New</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-700 mb-2 break-words">{notification.message}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleDateString()}{" "}
                      {new Date(notification.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto md:ml-4">
                    {detailHref && (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="flex-1 md:flex-none text-xs bg-brand-dark-green hover:bg-brand-dark-green/90"
                        asChild
                      >
                        <Link href={detailHref}>
                          <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                          View details
                        </Link>
                      </Button>
                    )}

                    {!notification.read && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsReadMutation.mutate(notification.id)}
                        disabled={markAsReadMutation.isPending}
                        className="flex-1 md:flex-none text-xs"
                      >
                        Mark Read
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteNotificationMutation.mutate(notification.id)}
                      disabled={deleteNotificationMutation.isPending}
                      className="flex-1 md:flex-none text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationsPage;

