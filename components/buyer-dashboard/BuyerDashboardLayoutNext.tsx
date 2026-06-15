'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { Package, MessageSquare, Heart, Star, Settings, Home, HelpCircle, Bell, Shield } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { dashboardSidebarAvatarLabel } from "@/lib/utils/avatar-initials";

export default function BuyerDashboardLayoutNext({
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

  useEffect(() => {
    const path = pathname.split('/').pop() || 'home';
    setActiveNav(path === 'my-buyer-dashboard' ? 'home' : path);
  }, [pathname]);

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
    { name: 'Dashboard', path: 'home', href: '/my-buyer-dashboard', icon: Home },
    { name: 'Messages', path: 'messages', href: '/my-buyer-dashboard/messages', icon: MessageSquare },
    { name: 'Reservations', path: 'reservations', href: '/my-buyer-dashboard/reservations', icon: Shield },
    { name: 'Notifications', path: 'notifications', href: '/my-buyer-dashboard/notifications', icon: Bell },
    { name: 'Wishlist', path: 'wishlist', href: '/my-buyer-dashboard/wishlist', icon: Heart },
    { name: 'Quiz Results', path: 'quiz-results', href: '/my-buyer-dashboard/quiz-results', icon: HelpCircle },
    { name: 'Breed Alerts', path: 'breed-alerts', href: '/my-buyer-dashboard/breed-alerts', icon: Bell },
    { name: 'Orders', path: 'orders', href: '/my-buyer-dashboard/orders', icon: Package },
    { name: 'Reviews', path: 'reviews', href: '/my-buyer-dashboard/reviews', icon: Star },
    { name: 'Settings', path: 'account-settings', href: '/my-buyer-dashboard/account-settings', icon: Settings },
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
    fallbackLetter: "B",
  });

  const isActive = (href: string) => {
    if (href === '/my-buyer-dashboard') {
      return pathname === '/my-buyer-dashboard';
    }
    // Handle both /settings and /account-settings as the same route
    if (href === '/my-buyer-dashboard/account-settings') {
      return pathname === '/my-buyer-dashboard/settings' || pathname === '/my-buyer-dashboard/account-settings';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-brand-soft-green/10 py-6">
        {isMobile ? (
          <div className="container mx-auto max-w-full min-w-0 overflow-x-hidden py-6 px-4">
            <div className="bg-white rounded-lg shadow-sm mx-2 mb-6 min-w-0">
              <div className="p-4 pb-0">
                <h1 className="text-2xl font-semibold">
                  Buyer Dashboard
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
                      const showMessageBadge = item.path === 'messages' && unreadMessageCount > 0;
                      const showNotificationBadge = item.path === 'notifications' && unreadNotificationCount > 0;
                      const tabBadgeCount =
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
                            {(showMessageBadge || showNotificationBadge) && (
                              <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 min-w-[16px] h-4 flex items-center justify-center">
                                {tabBadgeCount > 99 ? '99+' : tabBadgeCount}
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
            </div>
            
            <div className="bg-white rounded-lg shadow-sm mx-2 min-w-0 max-w-full overflow-x-hidden p-4">
              {children}
            </div>
          </div>
        ) : (
          <div className="container mx-auto max-w-full min-w-0 overflow-x-hidden py-2 px-4 md:px-6">
            <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
              {/* Sidebar: use lg: so tablets get full-width main (matches business dashboard) */}
              <div className="w-full flex-shrink-0 lg:w-64">
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
                      <p className="text-sm text-gray-500">Buyer Account</p>
                    </div>
                  </div>
                  
                  <nav className="space-y-1">
                    <Link 
                      href="/my-buyer-dashboard"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard') && pathname === '/my-buyer-dashboard'
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Home className="mr-3 h-5 w-5 text-gray-400" />
                      Dashboard Home
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/messages"
                      className={`flex items-center justify-between px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/messages')
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
                      href="/my-buyer-dashboard/reservations"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/reservations')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Shield className="mr-3 h-5 w-5 text-gray-400" />
                      Reservations
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/notifications"
                      className={`flex items-center justify-between px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/notifications')
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
                      href="/my-buyer-dashboard/wishlist"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/wishlist')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Heart className="mr-3 h-5 w-5 text-gray-400" />
                      Wishlist
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/quiz-results"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/quiz-results')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <HelpCircle className="mr-3 h-5 w-5 text-gray-400" />
                      Quiz Results
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/breed-alerts"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/breed-alerts')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Bell className="mr-3 h-5 w-5 text-gray-400" />
                      Breed Alerts
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/orders"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/orders')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Package className="mr-3 h-5 w-5 text-gray-400" />
                      My Orders
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/reviews"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/reviews')
                          ? 'bg-[hsl(var(--light-green))] text-emerald-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                    >
                      <Star className="mr-3 h-5 w-5 text-gray-400" />
                      Reviews
                    </Link>
                    
                    <Link 
                      href="/my-buyer-dashboard/account-settings"
                      className={`flex items-center px-3 py-2 rounded-md ${
                        isActive('/my-buyer-dashboard/account-settings')
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
              <div className="min-w-0 flex-1">
                <div className="min-w-0 max-w-full overflow-x-hidden rounded-lg bg-white p-4 shadow-sm sm:p-6">
                  {children}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
























