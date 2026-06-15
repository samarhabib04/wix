'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from "@/contexts/AuthContext";
import { Home, ListFilter, Calendar, MessageSquare, Heart, Settings, Package, RotateCcw, Plus, Shield, ShoppingBag, Bell, Mail, TrendingUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/lib/supabase/client";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useUnreadEnquiryCount } from "@/hooks/use-unread-enquiry-count";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardSidebarAvatarLabel } from "@/lib/utils/avatar-initials";

export default function BusinessDashboardLayoutNext({
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
  const [hasVetPartnerInvitation, setHasVetPartnerInvitation] = useState(false);
  const [isVetPartner, setIsVetPartner] = useState(false);
  const [hasEliteSubscription, setHasEliteSubscription] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useRealtimeNotifications();
  const { unreadCount: unreadEnquiryCount } = useUnreadEnquiryCount();

  useEffect(() => {
    const path = pathname.split('/').pop() || 'home';
    setActiveNav(path === 'my-business-dashboard' ? 'home' : path);
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
          .select('first_name, last_name, business_name, avatar_url')
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

  // Fetch vet partner status and subscription tier
  useEffect(() => {
    const fetchVetPartnerStatus = async () => {
      if (!user?.id) return;

      try {
        // Get user's business
        const { data: business, error: businessError } = await supabase
          .from('business_listings')
          .select('id, is_vet_partner, subscription_tier')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();

        if (businessError || !business) return;

        // Check for pending invitation
        const { data: pendingInvitation } = await supabase
          .from('vet_partners' as any)
          .select('id')
          .eq('business_id', (business as any).id)
          .eq('status', 'pending_approval')
          .maybeSingle();

        if (pendingInvitation) {
          setHasVetPartnerInvitation(true);
        }

        // Check if already a vet partner
        if ((business as any).is_vet_partner) {
          setIsVetPartner(true);
        }

        // Check for elite_marketplace subscription from business_subscriptions table by user_id only
        // Only fetch active subscriptions for consistency
        const { data: subscription, error: subError } = await supabase
          .from('business_subscriptions' as any)
          .select('subscription_tier, status, end_date')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('subscription_tier', 'elite_marketplace')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!subError && subscription) {
          const sub = subscription as any;
          // Verify end_date is in the future (if provided)
          const isExpired = sub.end_date 
            ? new Date(sub.end_date) < new Date()
            : false;
          
          if (!isExpired && sub.subscription_tier === 'elite_marketplace') {

            setHasEliteSubscription(true);
          } else {

          }
        } else {

        }
      } catch (error) {
        console.error('Error fetching vet partner status:', error);
      }
    };

    fetchVetPartnerStatus();
  }, [user?.id]);

  // Build nav items dynamically based on subscription tier and vet partner status
  const baseNavItems = [
    { name: 'Dashboard', path: 'home', href: '/my-business-dashboard', icon: Home },
    { name: 'My Listing', path: 'listing', href: '/my-business-dashboard/listing', icon: ListFilter },
    { name: 'Create Listing', path: '/services/add', href: '/services/add', icon: Plus, external: true },
    { 
      name: 'Notifications', 
      path: 'notifications', 
      href: '/my-business-dashboard/notifications', 
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
  ];

  // Add Dog Products menu item right after Create Listing if has elite_marketplace subscription
  const marketplaceItem = hasEliteSubscription ? [
    {
      name: 'Dog Products',
      path: 'marketplace',
      href: '/my-business-dashboard/marketplace',
      icon: ShoppingBag,
    }
  ] : [];

  const afterMarketplaceNavItems = [
    { 
      name: 'Enquiries', 
      path: 'enquiries', 
      href: '/my-business-dashboard/enquiries', 
      icon: Mail,
      badge: unreadEnquiryCount > 0 ? unreadEnquiryCount : undefined
    },
    { name: 'Subscription', path: 'subscription', href: '/my-business-dashboard/subscription', icon: Calendar },
    { name: 'Boost', path: 'boost', href: '/my-business-dashboard/boost', icon: TrendingUp },
    { name: 'Reviews', path: 'reviews', href: '/my-business-dashboard/reviews', icon: MessageSquare },
    { name: 'Wishlist', path: 'wishlist', href: '/my-business-dashboard/wishlist', icon: Heart },
    { name: 'Orders', path: 'orders', href: '/my-business-dashboard/orders', icon: Package },
    { name: 'Quiz Results', path: 'quiz-results', href: '/my-business-dashboard/quiz-results', icon: RotateCcw },
  ];

  // Add Vet Partner menu item if has invitation or is vet partner
  const vetPartnerItem = (hasVetPartnerInvitation || isVetPartner) ? [
    {
      name: hasVetPartnerInvitation ? 'Vet Partner Invitation' : 'Vet Partner',
      path: hasVetPartnerInvitation ? 'vet-partner-invitation' : 'vet-partner',
      href: hasVetPartnerInvitation ? '/my-business-dashboard/vet-partner-invitation' : '/vet-partners/upgrade',
      icon: Shield,
      badge: hasVetPartnerInvitation ? 1 : undefined,
    }
  ] : [];

  const navItems = [
    ...baseNavItems,
    ...marketplaceItem, // Dog Products appears right after Create Listing
    ...afterMarketplaceNavItems,
    ...vetPartnerItem,
    { name: 'Settings', path: 'settings', href: '/my-business-dashboard/settings', icon: Settings },
  ];

  // Get display name from profile data or fallback to user data
  const getDisplayName = () => {
    if (userProfile?.business_name) {
      return userProfile.business_name;
    }
    if (userProfile?.first_name) {
      return `${userProfile.first_name} ${userProfile.last_name || ''}`.trim();
    }
    return user?.user_metadata?.first_name || user?.email?.split('@')[0] || "User";
  };

  const avatarText = dashboardSidebarAvatarLabel({
    businessName: userProfile?.business_name,
    firstName: userProfile?.first_name,
    lastName: userProfile?.last_name,
    metadataFirstName: user?.user_metadata?.first_name as string | undefined,
    email: user?.email ?? undefined,
    fallbackLetter: "B",
  });

  const isActive = (href: string) => {
    if (href === '/my-business-dashboard') {
      return pathname === '/my-business-dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-[#E1E8E0]">
      {isMobile ? (
        <div className="container mx-auto max-w-full min-w-0 overflow-x-hidden py-6 px-2 sm:px-4">
          <div className="bg-white rounded-lg shadow-sm mx-1 sm:mx-2 mb-6 min-w-0">
            <div className="p-4 pb-0">
              <h1 className="text-2xl font-semibold">
                Business Dashboard
              </h1>
              <div className="text-sm text-gray-500 mt-1">
                Welcome, {getDisplayName()}
              </div>
            </div>
            
            <div className="relative">
              <div
                className="overflow-x-auto scrollbar-hide py-3 px-3"
                ref={scrollContainerRef}
                style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
              >
                <Tabs 
                  value={activeNav} 
                  className="w-max"
                  onValueChange={(value) => {
                    const item = navItems.find(n => n.path === value || n.href === value);
                    if (item) {
                      if ((item as any).external) {
                        router.push(item.href);
                      } else {
                        router.push(item.href);
                        setActiveNav(value);
                      }
                    }
                  }}
                >
                  <TabsList className="bg-transparent p-0 flex gap-1 h-auto">
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const tabValue = (item as any).external ? item.href : item.path;
                      const isBoostTab = item.path === 'boost';
                      return (
                        <TabsTrigger
                          key={item.path}
                          value={tabValue}
                          data-tab-path={tabValue}
                          className={cn(
                            "flex flex-col items-center px-3 py-3 rounded-lg transition-all duration-200 border-0 flex-shrink-0 relative",
                            isBoostTab
                              ? "bg-orange-50 text-orange-950 ring-1 ring-orange-300/80 shadow-sm hover:bg-orange-100 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:ring-orange-600 data-[state=active]:shadow-md [&_svg]:text-orange-600 data-[state=active]:[&_svg]:text-white"
                              : "bg-transparent data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 hover:bg-gray-50"
                          )}
                          style={{ scrollSnapAlign: 'center' }}
                        >
                          <Icon className="h-5 w-5 mb-1" />
                          <span className="text-xs whitespace-nowrap font-medium">{item.name}</span>
                          {(item as any).badge && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                              {(item as any).badge}
                            </span>
                          )}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </div>
            
            <div className="text-center text-xs text-gray-400 pb-3">
              <span>← Swipe to see more tabs →</span>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm mx-1 sm:mx-2 p-3 sm:p-4 min-w-0 max-w-full overflow-x-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div className="container mx-auto py-8 px-4 md:px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <div className="lg:w-64">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={userProfile?.avatar_url} />
                      <AvatarFallback className="bg-brand-soft-green text-white">
                        {avatarText}
                      </AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs border-2 border-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">
                      {getDisplayName()}
                    </h2>
                    <p className="text-sm text-gray-500">Business Account</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActiveRoute = isActive(item.href);
                    
                    if ((item as any).external) {
                      return (
                        <Link
                          key={item.path}
                          href={item.href}
                          className={`flex items-center px-3 py-2 rounded-md relative ${
                            isActiveRoute 
                              ? "bg-[hsl(var(--light-green))] text-emerald-800" 
                              : "hover:bg-gray-100 text-gray-800"
                          }`}
                        >
                          <Icon 
                            className={`mr-3 h-5 w-5 ${
                              isActiveRoute ? "text-emerald-600" : "text-gray-400"
                            }`} 
                          />
                          {item.name}
                          {(item as any).badge && (
                            <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                              {(item as any).badge}
                            </span>
                          )}
                        </Link>
                      );
                    }
                    
                    return (
                      <Link
                        key={item.path}
                        href={item.href}
                        className={`flex items-center px-3 py-2 rounded-md relative ${
                          isActiveRoute 
                            ? "bg-[hsl(var(--light-green))] text-emerald-800" 
                            : "hover:bg-gray-100 text-gray-800"
                        }`}
                      >
                        <Icon 
                          className={`mr-3 h-5 w-5 ${
                            isActiveRoute ? "text-emerald-600" : "text-gray-400"
                          }`} 
                        />
                        {item.name}
                        {(item as any).badge && (
                          <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {(item as any).badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
            
            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 min-w-0 max-w-full overflow-x-hidden">
                {children}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

