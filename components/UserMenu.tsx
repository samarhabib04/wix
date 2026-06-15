'use client';

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  LogOut,
  Settings,
  Layers,
  Building,
  ShieldCheck,
  MessageSquare,
  DollarSign,
  Heart,
  HelpCircle,
  Package,
  Star,
  Calendar,
  Bell,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { usePendingReservationCount } from "@/hooks/use-pending-reservation-count";
import { useAdminFraudAlertsCount } from "@/hooks/useAdminFraudAlertsCount";
import { useAdminUnreadMessageCount } from "@/hooks/useAdminUnreadMessageCount";
import { useAdminDisputesCount } from "@/hooks/useAdminDisputesCount";
import { useReservationCount } from "@/hooks/useReservationCount";
import { dashboardSidebarAvatarLabel } from "@/lib/utils/avatar-initials";

export default function UserMenu() {
  const { user, role, signOut, isSigningOut } = useAuth();
  const [open, setOpen] = useState(false);
  /** DB-backed initials; session fallback avoids placeholder "??" while profile loads */
  const [profileInitials, setProfileInitials] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const sessionInitials = useMemo(
    () =>
      dashboardSidebarAvatarLabel({
        metadataFirstName: user?.user_metadata?.first_name as string | undefined,
        email: user?.email ?? undefined,
        fallbackLetter: "U",
      }),
    [user?.email, user?.user_metadata?.first_name]
  );
  const userInitials = profileInitials ?? sessionInitials;

  useEffect(() => {
    setProfileInitials(null);
    setAvatarUrl(null);
  }, [user?.id]);

  const router = useRouter();
  const { toast } = useToast();
  const { unreadCount: unreadNotificationCount } = useRealtimeNotifications();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();
  const { pendingCount: pendingReservationCount } = usePendingReservationCount();
  
  // Admin-specific notification counts
  const adminFraudAlertsCount = useAdminFraudAlertsCount();
  const adminUnreadMessageCount = useAdminUnreadMessageCount();
  const adminDisputesCount = useAdminDisputesCount();
  const adminReservationCount = useReservationCount();
  const adminUnreadGeneralNotifications = role === 'admin' ? unreadNotificationCount : 0;
  
  // Calculate total admin notifications
  const totalAdminNotifications = role === 'admin' 
    ? adminFraudAlertsCount + adminUnreadMessageCount + adminDisputesCount + adminUnreadGeneralNotifications
    : 0;

  // Fetch user profile data to get proper initials
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }

        if (data) {
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
          } else {
            setAvatarUrl(null);
          }

          setProfileInitials(
            dashboardSidebarAvatarLabel({
              firstName: data.first_name,
              lastName: data.last_name,
              metadataFirstName: user?.user_metadata?.first_name as string | undefined,
              email: user?.email ?? undefined,
              fallbackLetter: "U",
            })
          );
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id, user?.email, user?.user_metadata?.first_name]);

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          asChild
          className="hidden sm:flex"
        >
          <Link href="/auth/role-selection">Sign up</Link>
        </Button>
        <Button 
          size="sm" 
          asChild
          className="bg-brand-dark-green hover:bg-brand-dark-green/90"
        >
          <Link href="/auth/login">Log in</Link>
        </Button>
      </div>
    );
  }

  const handleSignOut = async () => {
    if (isSigningOut) return;

    setOpen(false);
    try {
      // signOut clears Supabase cookies then hard-redirects — avoid router.replace racing it
      await signOut();
    } catch (error) {
      console.error("UserMenu sign out error:", error);
      window.location.replace('/');
    }
  };

  const getDashboardLink = () => {
    if (role === "admin") return "/admin-dashboard";
    if (role === "seller") return "/my-seller-dashboard";
    if (role === "business") return "/my-business-dashboard";
    return "/my-buyer-dashboard";
  };

  const getSettingsLink = () => {
    if (role === "admin") return "/admin-dashboard/settings";
    if (role === "seller") return "/my-seller-dashboard/settings";
    if (role === "business") return "/my-business-dashboard/settings";
    return "/my-buyer-dashboard/account-settings";
  };

  const getNotificationsLink = () => {
    if (role === "admin") return "/admin-dashboard/notifications";
    if (role === "seller") return "/my-seller-dashboard/notifications";
    if (role === "business") return "/my-business-dashboard/notifications";
    return "/my-buyer-dashboard/notifications";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative rounded-full">
          <Avatar className="h-8 w-8">
            {avatarUrl && (
              <AvatarImage 
                src={avatarUrl} 
                alt="Profile picture"
                className="object-cover"
              />
            )}
            <AvatarFallback className="bg-brand-soft-green text-white">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          {((role === 'admin' && totalAdminNotifications > 0) || 
            (role !== 'admin' && (unreadNotificationCount > 0 || pendingReservationCount > 0 || unreadMessageCount > 0))) && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] border-2 border-white">
              {role === 'admin' 
                ? (totalAdminNotifications > 9 ? '9+' : totalAdminNotifications)
                : ((unreadNotificationCount + pendingReservationCount + unreadMessageCount) > 9 ? '9+' : (unreadNotificationCount + pendingReservationCount + unreadMessageCount))}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.email}</p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {role || "User"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={getDashboardLink()}>
              {role === "admin" && <ShieldCheck className="mr-2 h-4 w-4" />}
              {role === "seller" && <Layers className="mr-2 h-4 w-4" />}
              {role === "business" && <Building className="mr-2 h-4 w-4" />}
              {(!role || role === "buyer") && <User className="mr-2 h-4 w-4" />}
              Dashboard
            </Link>
          </DropdownMenuItem>
          
          {role === "buyer" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/messages" className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </div>
                  {unreadMessageCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/reservations" className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservations
                  </div>
                  {pendingReservationCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {pendingReservationCount > 99 ? '99+' : pendingReservationCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/wishlist">
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/quiz-results">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Quiz Results
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/orders">
                  <Package className="mr-2 h-4 w-4" />
                  Orders
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-buyer-dashboard/reviews">
                  <Star className="mr-2 h-4 w-4" />
                  Reviews
                </Link>
              </DropdownMenuItem>
            </>
          )}
          
          {role === "seller" && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/my-seller-dashboard/listings">
                  <Layers className="mr-2 h-4 w-4" />
                  My Listings
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/my-seller-dashboard/messages?tab=offer">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Offer
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-seller-dashboard/messages" className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Messages
                  </div>
                  {unreadMessageCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
              
              <DropdownMenuItem asChild>
                <Link href="/my-seller-dashboard/reservations" className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservations
                  </div>
                  {pendingReservationCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {pendingReservationCount > 99 ? '99+' : pendingReservationCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          
          {role === "admin" && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin-dashboard/notifications"
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </div>
                  {adminUnreadGeneralNotifications > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {adminUnreadGeneralNotifications > 99
                        ? "99+"
                        : adminUnreadGeneralNotifications}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/admin-dashboard/fraud-alerts"
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Fraud Alerts
                  </div>
                  {adminFraudAlertsCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {adminFraudAlertsCount > 99
                        ? "99+"
                        : adminFraudAlertsCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link
                  href="/admin-dashboard/handle-reservations"
                  className="flex items-center justify-between w-full"
                >
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Reservations
                  </div>
                  {adminReservationCount > 0 && (
                    <Badge className="bg-red-500 text-white text-xs ml-2">
                      {adminReservationCount > 99
                        ? "99+"
                        : adminReservationCount}
                    </Badge>
                  )}
                </Link>
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuItem asChild>
            <Link href={getSettingsLink()}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? "Signing out..." : "Log out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
