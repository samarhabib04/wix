'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LucideIcon,
  LayoutDashboard,
  PawPrint,
  Users2,
  Star,
  Building2,
  ShoppingBag,
  BookOpen,
  FileEdit,
  Settings,
  LogOut,
  Menu,
  TrendingUp,
  DollarSign,
  Heart,
  Dog,
  MessageCircle,
  Scale3D,
  Shield,
  Bell,
  Stethoscope,
  FileCheck
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useReservationCount } from "@/hooks/useReservationCount";
import { useAdminUnreadMessageCount } from "@/hooks/useAdminUnreadMessageCount";
import { useAdminFraudAlertsCount } from "@/hooks/useAdminFraudAlertsCount";
import { useAdminDisputesCount } from "@/hooks/useAdminDisputesCount";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useAdminPendingApprovalsCount } from "@/hooks/useAdminPendingApprovalsCount";
import { useAdminNotificationCounts } from "@/hooks/useAdminNotificationCounts";

// Interface for navigation item
interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
}

// Navigation items for the sidebar
const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/admin-dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Listings Management",
    href: "/admin-dashboard/listings",
    icon: PawPrint,
  },
  {
    title: "Breeds Management",
    href: "/admin-dashboard/breeds",
    icon: Dog,
  },
  {
    title: "Boosting Management",
    href: "/admin-dashboard/boosting",
    icon: TrendingUp,
  },
  {
    title: "Users",
    href: "/admin-dashboard/users",
    icon: Users2,
  },
  {
    title: "Admin Team",
    href: "/admin-dashboard/admins",
    icon: Shield,
  },
  {
    title: "Messages",
    href: "/admin-dashboard/messages",
    icon: MessageCircle,
  },
  {
    title: "Notifications",
    href: "/admin-dashboard/notifications",
    icon: Bell,
  },
  {
    title: "Fraud Alerts",
    href: "/admin-dashboard/fraud-alerts",
    icon: Shield,
  },
  {
    title: "Disputes",
    href: "/admin-dashboard/disputes",
    icon: Scale3D,
  },
  {
    title: "Handle Reservations",
    href: "/admin-dashboard/handle-reservations",
    icon: Shield,
  },
  {
    title: "Reviews",
    href: "/admin-dashboard/reviews",
    icon: Star,
  },
  {
    title: "Businesses",
    href: "/admin-dashboard/businesses",
    icon: Building2,
  },
  {
    title: "Vet Partners",
    href: "/admin-dashboard/vet-partners",
    icon: Stethoscope,
  },
  {
    title: "Code Management",
    href: "/admin-dashboard/code-management",
    icon: FileCheck,
  },
  {
    title: "Shop Management",
    href: "/admin-dashboard/shop",
    icon: ShoppingBag,
  },
  {
    title: "Blog Management",
    href: "/admin-dashboard/blog",
    icon: BookOpen,
  },
  {
    title: "Content Management",
    href: "/admin-dashboard/content",
    icon: FileEdit,
  },
  {
    title: "Settings",
    href: "/admin-dashboard/settings",
    icon: Settings,
  },
];

export default function AdminDashboardLayoutNext({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const reservationCount = useReservationCount();
  const unreadMessageCount = useAdminUnreadMessageCount();
  const fraudAlertsCount = useAdminFraudAlertsCount();
  const disputesCount = useAdminDisputesCount();
  const { unreadCount: adminUnreadNotifications } = useRealtimeNotifications();
  const pendingApprovalsCount = useAdminPendingApprovalsCount();
  const { data: notificationCounts } = useAdminNotificationCounts();

  // Calculate badge counts for each menu section
  const listingsCount = notificationCounts
    ? notificationCounts.sales +
      notificationCounts.stud +
      notificationCounts.showcase +
      (notificationCounts.otherApprovals ?? 0)
    : 0;
  const businessesCount = notificationCounts?.business || 0;
  const shopCount = (notificationCounts?.marketplace || 0) + (notificationCounts?.shopOrders || 0);
  const vetPartnersCount = notificationCounts?.vetPartner || 0;

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
      window.location.replace("/");
    }
  };

  const isActive = (href: string) => {
    if (href === '/admin-dashboard') {
      return pathname === '/admin-dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-[#E1E8E0] flex-col md:flex-row">
      {/* Mobile navigation - Fixed at top for easy access */}
      <div className="md:hidden sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="font-berkshire text-lg text-brand-dark-green">Dog Quest</div>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
              <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex flex-col h-full">
            <div className="border-b px-6 py-5">
              <div className="font-berkshire text-xl text-brand-dark-green">Dog Quest</div>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
            <ScrollArea className="flex-1 py-3">
              <div className="space-y-1 px-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                      isActive(item.href)
                        ? "bg-brand-light-green/20 text-brand-dark-green shadow-sm border border-brand-light-green/30"
                        : "text-muted-foreground hover:text-brand-dark-green hover:bg-brand-light-green/10"
                    )}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 transition-colors",
                      isActive(item.href)
                        ? "text-brand-dark-green"
                        : "text-muted-foreground group-hover:text-brand-soft-green"
                    )} />
                    <span className="flex-1">{item.title}</span>
                    {item.badge ? (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {item.badge}
                      </span>
                    ) : null}
                    {/* Dynamically show badges for various menu items */}
                    {item.href === "/admin-dashboard/messages" && unreadMessageCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/notifications" && adminUnreadNotifications > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {adminUnreadNotifications > 99 ? '99+' : adminUnreadNotifications}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/fraud-alerts" && fraudAlertsCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {fraudAlertsCount > 99 ? '99+' : fraudAlertsCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/disputes" && disputesCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {disputesCount > 99 ? '99+' : disputesCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/handle-reservations" && reservationCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {reservationCount}
                      </span>
                    )}
                    {/* Notification-based badges for approval-related sections */}
                    {item.href === "/admin-dashboard/listings" && listingsCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {listingsCount > 99 ? '99+' : listingsCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/businesses" && businessesCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {businessesCount > 99 ? '99+' : businessesCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/shop" && shopCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {shopCount > 99 ? '99+' : shopCount}
                      </span>
                    )}
                    {item.href === "/admin-dashboard/vet-partners" && vetPartnersCount > 0 && (
                      <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                        {vetPartnersCount > 99 ? '99+' : vetPartnersCount}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t px-3 py-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
        </div>
      </div>

      {/* Desktop navigation */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:shrink-0 border-r bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <div className="font-berkshire text-xl text-brand-dark-green">Dog Quest</div>
          <p className="text-sm text-muted-foreground">Admin Dashboard</p>
        </div>
        <nav className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                  isActive(item.href)
                    ? "bg-brand-light-green/20 text-brand-dark-green shadow-sm border border-brand-light-green/30"
                    : "text-muted-foreground hover:text-brand-dark-green hover:bg-brand-light-green/10"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-colors",
                  isActive(item.href)
                    ? "text-brand-dark-green"
                    : "text-muted-foreground group-hover:text-brand-soft-green"
                )} />
                <span className="flex-1">{item.title}</span>
                {item.badge ? (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
                {/* Dynamically show badges for various menu items */}
                {item.href === "/admin-dashboard/messages" && unreadMessageCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/notifications" && adminUnreadNotifications > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {adminUnreadNotifications > 99 ? '99+' : adminUnreadNotifications}
                  </span>
                )}
                {item.href === "/admin-dashboard/fraud-alerts" && fraudAlertsCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {fraudAlertsCount > 99 ? '99+' : fraudAlertsCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/disputes" && disputesCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {disputesCount > 99 ? '99+' : disputesCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/handle-reservations" && reservationCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {reservationCount}
                  </span>
                )}
                {/* Notification-based badges for approval-related sections */}
                {item.href === "/admin-dashboard/listings" && listingsCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {listingsCount > 99 ? '99+' : listingsCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/businesses" && businessesCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {businessesCount > 99 ? '99+' : businessesCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/shop" && shopCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {shopCount > 99 ? '99+' : shopCount}
                  </span>
                )}
                {item.href === "/admin-dashboard/vet-partners" && vetPartnersCount > 0 && (
                  <span className="bg-destructive/10 text-destructive text-xs font-semibold px-2.5 py-1 rounded-full">
                    {vetPartnersCount > 99 ? '99+' : vetPartnersCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </nav>
        <div className="border-t px-3 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
            onClick={handleLogout}
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-auto min-w-0">
        <div className="container max-w-7xl mx-auto py-4 md:py-8 px-4 md:px-8 w-full">
          <div className="w-full overflow-x-auto">
          {children}
          </div>
        </div>
      </main>
    </div>
  );
}

























