'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { Package, MessageSquare, Heart, Star, Settings, Home, Bell, Plus, ShoppingBag, TrendingUp, Shield, DollarSign } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";

import { useReservationCount } from "@/hooks/useReservationCount";
import { dashboardSidebarAvatarLabel } from "@/lib/utils/avatar-initials";

export default function SellerDashboardLayoutNext({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [activeNav, setActiveNav] = useState("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { unreadCount: unreadNotificationCount } = useRealtimeNotifications();
  const { unreadCount: unreadMessageCount } = useUnreadMessageCount();

  const reservationCount = useReservationCount();

  useEffect(() => {
    const path = pathname.split('/').pop() || 'home';
    const onMessagesRoute = pathname.startsWith('/my-seller-dashboard/messages');

    if (onMessagesRoute && typeof window !== 'undefined') {
      const tab = new URLSearchParams(window.location.search).get('tab');
      if (tab === 'offer') {
        setActiveNav('offer');
        return;
      }
    }

    setActiveNav(path === 'my-seller-dashboard' ? 'home' : path);
  }, [pathname]);

  // Scroll the active tab into view on mount / route change
  useEffect(() => {
    if (!activeNav || !scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const activeTab = container.querySelector<HTMLElement>(`[data-tab-path="${activeNav}"]`);
    if (activeTab) {
      requestAnimationFrame(() => {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    }
  }, [activeNav]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;

      try {
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', user.id)
          .single();

        if (!error && profile) {
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  const navItems = [
    { name: 'Dashboard', path: 'home', href: '/my-seller-dashboard', icon: Home },
    { name: 'My Listings', path: 'listings', href: '/my-seller-dashboard/listings', icon: Package },
    { name: 'Orders', path: 'orders', href: '/my-seller-dashboard/orders', icon: ShoppingBag },
    { name: 'Reservations', path: 'reservations', href: '/my-seller-dashboard/reservations', icon: Shield },
    { name: 'Wishlist', path: 'wishlist', href: '/my-seller-dashboard/wishlist', icon: Heart },
    { name: 'Offer', path: 'offer', href: '/my-seller-dashboard/messages?tab=offer', icon: DollarSign },
    { name: 'Messages', path: 'messages', href: '/my-seller-dashboard/messages', icon: MessageSquare },
    { name: 'Reviews', path: 'reviews', href: '/my-seller-dashboard/reviews', icon: Star },
    { name: 'Notifications', path: 'notifications', href: '/my-seller-dashboard/notifications', icon: Bell },
    { name: 'Settings', path: 'settings', href: '/my-seller-dashboard/settings', icon: Settings },
  ];

  // Get display name from profile data or fallback to user data
  const getDisplayName = () => {
    if (userProfile?.first_name) {
      return `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
    }
    return user?.user_metadata?.first_name || user?.email?.split('@')[0] || "User";
  };

  const avatarText = dashboardSidebarAvatarLabel({
    firstName: userProfile?.first_name,
    lastName: userProfile?.last_name,
    metadataFirstName: user?.user_metadata?.first_name as string | undefined,
    email: user?.email ?? undefined,
    fallbackLetter: "S",
  });

  const handleAddListing = () => {
    router.push('/add-listing');
  };

  const isActive = (href: string) => {
    if (href === '/my-seller-dashboard') {
      return pathname === '/my-seller-dashboard';
    }
    // Handle both /settings and /account-settings as the same route
    if (href === '/my-seller-dashboard/settings') {
      return pathname === '/my-seller-dashboard/settings' || pathname === '/my-seller-dashboard/account-settings';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-brand-soft-green/10 py-6">
      {isMobile ? (
        <div className="container mx-auto py-6 px-4">
          <div className="bg-white rounded-lg shadow-sm mx-2 mb-6">
            <div className="p-4 pb-0">
              <h1 className="text-2xl font-semibold">
                Seller Dashboard
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                Welcome, {getDisplayName()}
              </div>
            </div>

            <div
              className="overflow-x-auto scrollbar-hide py-3 px-3"
              ref={scrollContainerRef}
              style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
            >
              <Tabs
                value={activeNav}
                className="w-max"
                onValueChange={(value) => {
                  const item = navItems.find(n => n.path === value);
                  if (item) {
                    router.push(item.href);
                    setActiveNav(value);
                  }
                }}
              >
                <TabsList className="bg-transparent p-0 flex gap-1 h-auto">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const showBadge =
                      (item.path === 'messages' && unreadMessageCount > 0) ||
                      (item.path === 'notifications' && unreadNotificationCount > 0);
                    const badgeCount =
                      item.path === 'messages'
                        ? unreadMessageCount
                        : item.path === 'notifications'
                          ? unreadNotificationCount
                          : 0;
                    return (
                      <TabsTrigger
                        key={item.path}
                        value={item.path}
                        data-tab-path={item.path}
                        className="flex flex-col items-center px-3 py-3 rounded-lg transition-all duration-200 bg-transparent border-0 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 hover:bg-gray-50 flex-shrink-0 data-[state=active]:shadow-none shadow-none relative"
                        style={{ scrollSnapAlign: 'center' }}
                      >
                        <div className="relative">
                          <Icon className="h-5 w-5 mb-1" />
                          {showBadge && (
                            <Badge className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center">
                              {badgeCount > 99 ? '99+' : badgeCount}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs whitespace-nowrap font-medium">{item.name}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="text-center text-xs text-gray-400 pb-3">
              <span>← Swipe to see more tabs →</span>
            </div>

            <div className="px-3 pb-3">
              <Button
                onClick={handleAddListing}
                className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add New Listing
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm mx-2 p-4">
            {children}
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-2 px-4 md:px-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-64 flex-shrink-0">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <Avatar className="w-12 h-12">
                    {userProfile?.avatar_url ? (
                      <AvatarImage
                        src={userProfile.avatar_url}
                        alt="Profile picture"
                        className="object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-brand-soft-green text-white font-semibold text-lg">
                      {avatarText}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="font-semibold">
                      {getDisplayName()}
                    </h2>
                    <p className="text-sm text-gray-500">Seller Account</p>
                  </div>
                </div>

                <Button
                  onClick={handleAddListing}
                  className="w-full bg-brand-soft-green hover:bg-brand-dark-green text-white mb-4"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Listing
                </Button>

                <nav className="space-y-1">
                  <Link
                    href="/my-seller-dashboard"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard') && pathname === '/my-seller-dashboard'
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Home className="mr-3 h-5 w-5 text-gray-400" />
                    Dashboard Home
                  </Link>

                  <Link
                    href="/my-seller-dashboard/listings"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/listings')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Package className="mr-3 h-5 w-5 text-gray-400" />
                    My Listings
                  </Link>

                  <Link
                    href="/boost-listing"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/boost-listing')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <TrendingUp className="mr-3 h-5 w-5 text-gray-400" />
                    Boost Listings
                  </Link>

                  <Link
                    href="/my-seller-dashboard/orders"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/orders')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <ShoppingBag className="mr-3 h-5 w-5 text-gray-400" />
                    My Orders
                  </Link>

                  <Link
                    href="/my-seller-dashboard/reservations"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/reservations')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Shield className="mr-3 h-5 w-5 text-gray-400" />
                    Reservations
                    {reservationCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs ml-auto">
                        {reservationCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/my-seller-dashboard/wishlist"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/wishlist')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Heart className="mr-3 h-5 w-5 text-gray-400" />
                    Wishlist
                  </Link>

                  <Link
                    href="/my-seller-dashboard/messages?tab=offer"
                    className={`flex items-center px-3 py-2 rounded-md ${pathname.startsWith('/my-seller-dashboard/messages') && activeNav === 'offer'
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <DollarSign className="mr-3 h-5 w-5 text-gray-400" />
                    Offer
                  </Link>

                  <Link
                    href="/my-seller-dashboard/messages"
                    className={`flex items-center justify-between px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/messages')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="mr-3 h-5 w-5 text-gray-400" />
                      Messages
                    </div>
                    {unreadMessageCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs ml-2">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/my-seller-dashboard/reviews"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/reviews')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Star className="mr-3 h-5 w-5 text-gray-400" />
                    Reviews
                  </Link>

                  <Link
                    href="/my-seller-dashboard/notifications"
                    className={`flex items-center justify-between px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/notifications')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <div className="flex items-center">
                      <Bell className="mr-3 h-5 w-5 text-gray-400" />
                      Notifications
                    </div>
                    {unreadNotificationCount > 0 && (
                      <Badge className="bg-red-500 text-white text-xs ml-2">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </Badge>
                    )}
                  </Link>

                  <Link
                    href="/my-seller-dashboard/settings"
                    className={`flex items-center px-3 py-2 rounded-md ${isActive('/my-seller-dashboard/settings')
                      ? 'bg-[hsl(var(--light-green))] text-emerald-800'
                      : 'hover:bg-gray-100 text-gray-800'
                      }`}
                  >
                    <Settings className="mr-3 h-5 w-5 text-gray-400" />
                    Settings
                  </Link>
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
























