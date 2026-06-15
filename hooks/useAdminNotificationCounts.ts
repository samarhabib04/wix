import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface NotificationCounts {
  sales: number;
  stud: number;
  showcase: number;
  business: number;
  marketplace: number;
  vetPartner: number;
  shopOrders: number;
  /** Fallback type from notify_admins (unknown listing_type) — still needs admin review */
  otherApprovals: number;
  total: number;
}

const emptyCounts = (): NotificationCounts => ({
  sales: 0,
  stud: 0,
  showcase: 0,
  business: 0,
  marketplace: 0,
  vetPartner: 0,
  shopOrders: 0,
  otherApprovals: 0,
  total: 0,
});

export function useAdminNotificationCounts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-notification-counts', user?.id],
    queryFn: async (): Promise<NotificationCounts> => {
      if (!user) {
        return emptyCounts();
      }

      const { data: isAdmin, error: adminRpcError } = await supabase.rpc('is_current_user_admin');
      if (adminRpcError) {
        console.error('Error checking admin for notification counts:', adminRpcError);
        return emptyCounts();
      }
      if (!isAdmin) {
        return emptyCounts();
      }

      try {
        const [{ data: notifications, error }, salePendingRes, studPendingRes, showcasePendingRes] =
          await Promise.all([
            supabase
              .from('notifications')
              .select('type, read')
              .eq('user_id', user.id)
              .eq('read', false),
            supabase
              .from('sale_listings')
              .select('id', { count: 'exact', head: true })
              .or('is_deleted.is.null,is_deleted.eq.false')
              .eq('admin_approved', false),
            supabase
              .from('stud_listings')
              .select('id', { count: 'exact', head: true })
              .or('is_deleted.is.null,is_deleted.eq.false')
              .eq('admin_approved', false),
            supabase
              .from('showcase_listings')
              .select('id', { count: 'exact', head: true })
              .or('is_deleted.is.null,is_deleted.eq.false')
              .eq('admin_approved', false),
          ]);

        if (error) {
          console.error('Error fetching notification counts:', error);
          return emptyCounts();
        }

        const counts = emptyCounts();

        // Source of truth for approval badges in Listings:
        // pending rows in listing tables (not unread notification volume).
        counts.sales = salePendingRes.count ?? 0;
        counts.stud = studPendingRes.count ?? 0;
        counts.showcase = showcasePendingRes.count ?? 0;

        if (salePendingRes.error) {
          console.error('Error fetching pending sale count:', salePendingRes.error);
        }
        if (studPendingRes.error) {
          console.error('Error fetching pending stud count:', studPendingRes.error);
        }
        if (showcasePendingRes.error) {
          console.error('Error fetching pending showcase count:', showcasePendingRes.error);
        }

        notifications?.forEach((notification) => {
          switch (notification.type) {
            case 'business_approval_required':
              counts.business++;
              break;
            case 'marketplace_product_approval_required':
              counts.marketplace++;
              break;
            case 'vet_partner_request_submitted':
              counts.vetPartner++;
              break;
            case 'new_shop_order':
              counts.shopOrders++;
              break;
            case 'approval_required':
              counts.otherApprovals++;
              break;
            default:
              break;
          }
        });

        counts.total =
          counts.sales +
          counts.stud +
          counts.showcase +
          counts.business +
          counts.marketplace +
          counts.vetPartner +
          counts.shopOrders +
          counts.otherApprovals;

        return counts;
      } catch (error) {
        console.error('Exception fetching notification counts:', error);
        return emptyCounts();
      }
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
