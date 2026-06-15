import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { isShowcasePuppyAgeExpired } from '@/lib/utils/showcase-age';
import { toast } from 'sonner';

interface BoostedListing {
  id: string;
  listing_id: string;
  listing_type: string;
  boost_type: string;
  boost_start_time: string;
  boost_end_time: string;
  is_active: boolean;
  listing_title: string;
  listing_images: string[];
  seller_name: string;
  seller_id: string;
}

export const useBoostedListings = () => {
  return useQuery({
    queryKey: ['boosted-listings'],
    queryFn: async (): Promise<BoostedListing[]> => {
      // Fetch all boosts with their associated listing information
      const { data: boosts, error: boostsError } = await supabase
        .from('boosts')
        .select(`
          id,
          listing_id,
          listing_type,
          boost_type,
          boost_start_time,
          boost_end_time,
          is_active,
          user_id
        `)
        .order('boost_start_time', { ascending: false });

      if (boostsError) {
        throw boostsError;
      }

      if (!boosts || boosts.length === 0) {
        return [];
      }

      const boostedListings: BoostedListing[] = [];

      // Process each boost and fetch corresponding listing details
      for (const boost of boosts) {
        let listingData = null;
        let sellerData = null;

        try {
          // Fetch seller information
          const { data: seller } = await supabase
            .from('user_profiles')
            .select('first_name, last_name, email')
            .eq('id', boost.user_id)
            .single();

          sellerData = seller;

          // Fetch listing details based on listing type
          if (boost.listing_type === 'sale') {
            const { data: listing } = await supabase
              .from('sale_listings')
              .select('title, images')
              .eq('id', boost.listing_id)
              .single();
            listingData = listing;
          } else if (boost.listing_type === 'stud') {
            const { data: listing } = await supabase
              .from('stud_listings')
              .select('title, images')
              .eq('id', boost.listing_id)
              .single();
            listingData = listing;
          } else if (boost.listing_type === 'showcase') {
            const { data: listing } = await supabase
              .from('showcase_listings')
              .select('title, images, date_of_birth, created_at')
              .eq('id', boost.listing_id)
              .single();
            if (listing && isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at)) {
              listingData = null;
            } else {
              listingData = listing;
            }
          }

          if (listingData && sellerData) {
            // Parse images - handle string (JSON), array, or null
            let parsedImages: string[] = [];
            if (listingData.images) {
              if (typeof listingData.images === 'string') {
                try {
                  parsedImages = JSON.parse(listingData.images);
                } catch {
                  parsedImages = [];
                }
              } else if (Array.isArray(listingData.images)) {
                parsedImages = listingData.images.filter((img): img is string => typeof img === 'string');
              }
            }

            boostedListings.push({
              id: boost.id,
              listing_id: boost.listing_id ?? '',
              listing_type: boost.listing_type ?? 'listing',
              boost_type: boost.boost_type ?? 'standard',
              boost_start_time: boost.boost_start_time ?? '',
              boost_end_time: boost.boost_end_time ?? '',
              is_active: boost.is_active,
              listing_title: listingData.title || 'Untitled',
              listing_images: parsedImages,
              seller_name: `${sellerData.first_name || ''} ${sellerData.last_name || ''}`.trim() || sellerData.email || '',
              seller_id: boost.user_id ?? '',
            });
          }
        } catch (error) {
          console.error(`Error fetching data for boost ${boost.id}:`, error);
        }
      }

      return boostedListings;
    },
  });
};

// Admin boost management functions
export const useBoostManagement = () => {
  const queryClient = useQueryClient();

  const changeBoostTier = useMutation({
    mutationFn: async ({ boostId, newTier }: { boostId: string; newTier: string }) => {
      // Get boost details first for notifications
      const { data: boost } = await supabase
        .from('boosts')
        .select('id, boost_type, user_id, listing_id, listing_type')
        .eq('id', boostId)
        .single();

      const { error } = await supabase
        .from('boosts')
        .update({ boost_type: newTier })
        .eq('id', boostId);

      if (error) throw error;

      // Send notification to seller
      if (boost) {
        let listingTitle = 'Unknown listing';
        
        // Get listing title based on type
        try {
          if (boost.listing_type === 'sale') {
            const { data: listing } = await supabase
              .from('sale_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'stud') {
            const { data: listing } = await supabase
              .from('stud_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'showcase') {
            const { data: listing } = await supabase
              .from('showcase_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          }
        } catch (titleError) {
          console.error('Error fetching listing title:', titleError);
        }

        try {
          await supabase.functions.invoke('send-boost-notification', {
            body: {
              sellerId: boost.user_id,
              listingId: boost.listing_id,
              listingTitle,
              listingType: boost.listing_type,
              action: 'tier_changed',
              oldValue: boost.boost_type,
              newValue: newTier
            }
          });
        } catch (notificationError) {
          console.error('Failed to send boost notification:', notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boosted-listings'] });
      toast.success('Boost tier updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update boost tier: ${error.message}`);
    },
  });

  const extendBoostDuration = useMutation({
    mutationFn: async ({ boostId, newEndDate }: { boostId: string; newEndDate: Date }) => {
      // Get boost details first for notifications
      const { data: boost } = await supabase
        .from('boosts')
        .select('id, boost_type, user_id, listing_id, listing_type')
        .eq('id', boostId)
        .single();

      const { error } = await supabase
        .from('boosts')
        .update({ 
          boost_end_time: newEndDate.toISOString(),
          is_active: true // Reactivate if it was expired
        })
        .eq('id', boostId);

      if (error) throw error;

      // Send notification to seller
      if (boost) {
        let listingTitle = 'Unknown listing';
        
        // Get listing title based on type
        try {
          if (boost.listing_type === 'sale') {
            const { data: listing } = await supabase
              .from('sale_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'stud') {
            const { data: listing } = await supabase
              .from('stud_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'showcase') {
            const { data: listing } = await supabase
              .from('showcase_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          }
        } catch (titleError) {
          console.error('Error fetching listing title:', titleError);
        }

        try {
          await supabase.functions.invoke('send-boost-notification', {
            body: {
              sellerId: boost.user_id,
              listingId: boost.listing_id,
              listingTitle,
              listingType: boost.listing_type,
              action: 'duration_extended',
              newEndDate: newEndDate.toISOString()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send boost notification:', notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boosted-listings'] });
      toast.success('Boost duration extended successfully');
    },
    onError: (error) => {
      toast.error(`Failed to extend boost duration: ${error.message}`);
    },
  });

  const expireBoost = useMutation({
    mutationFn: async (boostId: string) => {
      // First get the boost details to clear current_boost_id from listings and for notifications
      const { data: boost } = await supabase
        .from('boosts')
        .select('id, boost_type, user_id, listing_id, listing_type')
        .eq('id', boostId)
        .single();

      // Update the boost to inactive and set end time to now
      const { error } = await supabase
        .from('boosts')
        .update({ 
          is_active: false,
          boost_end_time: new Date().toISOString()
        })
        .eq('id', boostId);

      if (error) throw error;

      // Clear current_boost_id from the associated listing
      if (boost) {
        if (boost.listing_type === 'sale') {
          await supabase
            .from('sale_listings')
            .update({ current_boost_id: null })
            .eq('current_boost_id', boostId);
        } else if (boost.listing_type === 'stud') {
          await supabase
            .from('stud_listings')
            .update({ current_boost_id: null })
            .eq('current_boost_id', boostId);
        }

        // Send notification to seller
        let listingTitle = 'Unknown listing';
        
        // Get listing title based on type
        try {
          if (boost.listing_type === 'sale') {
            const { data: listing } = await supabase
              .from('sale_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'stud') {
            const { data: listing } = await supabase
              .from('stud_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'showcase') {
            const { data: listing } = await supabase
              .from('showcase_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          }
        } catch (titleError) {
          console.error('Error fetching listing title:', titleError);
        }

        try {
          await supabase.functions.invoke('send-boost-notification', {
            body: {
              sellerId: boost.user_id,
              listingId: boost.listing_id,
              listingTitle,
              listingType: boost.listing_type,
              action: 'expired'
            }
          });
        } catch (notificationError) {
          console.error('Failed to send boost notification:', notificationError);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boosted-listings'] });
      toast.success('Boost expired successfully');
    },
    onError: (error) => {
      toast.error(`Failed to expire boost: ${error.message}`);
    },
  });

  const removeBoost = useMutation({
    mutationFn: async (boostId: string) => {
      // First get the boost details to clear current_boost_id from listings and for notifications
      const { data: boost } = await supabase
        .from('boosts')
        .select('id, boost_type, user_id, listing_id, listing_type')
        .eq('id', boostId)
        .single();

      if (boost) {
        // Clear current_boost_id from the associated listing
        if (boost.listing_type === 'sale') {
          await supabase
            .from('sale_listings')
            .update({ current_boost_id: null })
            .eq('current_boost_id', boostId);
        } else if (boost.listing_type === 'stud') {
          await supabase
            .from('stud_listings')
            .update({ current_boost_id: null })
            .eq('current_boost_id', boostId);
        }

        // Send notification to seller before removing the boost
        let listingTitle = 'Unknown listing';
        
        // Get listing title based on type
        try {
          if (boost.listing_type === 'sale') {
            const { data: listing } = await supabase
              .from('sale_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'stud') {
            const { data: listing } = await supabase
              .from('stud_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          } else if (boost.listing_type === 'showcase') {
            const { data: listing } = await supabase
              .from('showcase_listings')
              .select('title')
              .eq('id', boost.listing_id)
              .single();
            listingTitle = listing?.title || listingTitle;
          }
        } catch (titleError) {
          console.error('Error fetching listing title:', titleError);
        }

        try {
          await supabase.functions.invoke('send-boost-notification', {
            body: {
              sellerId: boost.user_id,
              listingId: boost.listing_id,
              listingTitle,
              listingType: boost.listing_type,
              action: 'removed'
            }
          });
        } catch (notificationError) {
          console.error('Failed to send boost notification:', notificationError);
        }
      }

      // Then delete the boost
      const { error } = await supabase
        .from('boosts')
        .delete()
        .eq('id', boostId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boosted-listings'] });
      toast.success('Boost removed successfully');
    },
    onError: (error) => {
      toast.error(`Failed to remove boost: ${error.message}`);
    },
  });

  return {
    changeBoostTier,
    extendBoostDuration,
    expireBoost,
    removeBoost,
  };
};
