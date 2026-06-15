import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { adminToast } from '@/lib/utils/adminToast';
import { getVerificationBadgeUpdatesForListing } from '@/lib/utils/code-verification';

interface UpdateListingParams {
  listingId: string;
  field: string;
  value: string | number | boolean;
  oldValue: string | number | boolean;
  listingType?: 'sale' | 'stud' | 'showcase';
}

export const useAdminListingEdit = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async ({ listingId, field, value, oldValue, listingType = 'sale' }: UpdateListingParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Determine the table name based on listing type
      const tableName = listingType === 'sale' ? 'sale_listings' : 
                       listingType === 'stud' ? 'stud_listings' : 'showcase_listings';

      // Prepare the update data conditionally to avoid missing columns
      let updateData: any = {};

      if (field === 'status') {
        if (tableName === 'sale_listings') {
          const normalized = value === 'approved' ? 'active' : value;
          updateData.status = normalized;
          if (normalized === 'active') {
            updateData.admin_approved = true;
            updateData.is_published = true;
          }
        } else {
          // stud_listings and showcase_listings don't use a status column
          if (value === 'active' || value === 'approved') {
            updateData.admin_approved = true;
            updateData.is_published = true;
          } else {
            updateData.admin_approved = false;
            updateData.is_published = false;
          }
        }
      } else {
        // Default: update the specific field
        updateData[field] = value;
      }
      
      // If toggling green_tick to true, set verification_date to now
      if (field === 'green_tick' && value === true) {
        updateData.verification_date = new Date().toISOString();
      }

      // When approving or activating listings via admin_approved toggle
      if (field === 'admin_approved' && value === true) {
        updateData.is_published = true;
        if (tableName === 'sale_listings') {
          updateData.status = 'active';
        }
      }

      const shouldApplyVerificationBadges =
        (listingType === 'sale' || listingType === 'stud') &&
        ((field === 'admin_approved' && value === true) ||
          (field === 'status' && (value === 'active' || value === 'approved')));

      if (shouldApplyVerificationBadges) {
        const badges = await getVerificationBadgeUpdatesForListing(listingId, listingType);
        if (badges) {
          Object.assign(updateData, badges);
        }
      }

      // Update the listing
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', listingId);

      if (updateError) throw updateError;

      // Log the change to audit table
      const { error: logError } = await supabase.rpc('log_listing_change', {
        p_admin_id: user.id,
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_field_changed: field,
        p_old_value: String(oldValue),
        p_new_value: String(value)
      });

      if (logError) {
        console.error('Failed to log audit entry:', logError);
        // Don't throw here as the main update succeeded
      }

      return { listingId, field, value };
    },
    onSuccess: () => {
      toast(adminToast.success('Listing updated successfully'));
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
    },
    onError: (error) => {
      console.error('Failed to update listing:', error);
      toast(adminToast.error('Failed to update listing'));
    }
  });

  return {
    updateListing: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
};
