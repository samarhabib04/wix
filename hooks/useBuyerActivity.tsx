
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BuyerActivity {
  id: string;
  text: string;
  time: string;
  type: 'wishlist' | 'message' | 'order' | 'quiz';
}

export const useBuyerActivity = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['buyer-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const activities: BuyerActivity[] = [];

      // Get recent wishlist additions
      const { data: wishlistItems } = await supabase
        .from('user_wishlists')
        .select('id, created_at, item_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      wishlistItems?.forEach(item => {
        activities.push({
          id: item.id,
          text: `Added ${item.item_type} to wishlist`,
          time: item.created_at,
          type: 'wishlist'
        });
      });

      // Get recent messages
      const { data: recentMessages } = await supabase
        .from('messages')
        .select('id, created_at, content')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      recentMessages?.forEach(message => {
        activities.push({
          id: message.id,
          text: `Sent a message`,
          time: message.created_at,
          type: 'message'
        });
      });

      // Get recent shop orders
      const { data: recentOrders } = await supabase
        .from('shop_orders')
        .select('id, created_at, total_price, currency')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      recentOrders?.forEach(order => {
        const currency = order.currency === 'EUR' ? '€' : '£';
        activities.push({
          id: order.id,
          text: `Placed shop order - ${currency}${order.total_price}`,
          time: order.created_at,
          type: 'order'
        });
      });

      // Get recent quiz results
      const { data: recentQuizzes } = await supabase
        .from('quiz_results')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      recentQuizzes?.forEach(quiz => {
        activities.push({
          id: quiz.id,
          text: `Completed breed quiz`,
          time: quiz.created_at,
          type: 'quiz'
        });
      });

      // Sort by time and return latest 5
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
    },
    enabled: !!user?.id
  });
};
