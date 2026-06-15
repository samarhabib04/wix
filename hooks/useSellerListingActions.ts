import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  listingRequiresEditApproval,
  submitListingPendingEdit,
  type EditableListingType,
} from '@/lib/utils/listing-edit-approval';

interface ListingActionParams {
  listingId: string;
  listingType: 'sale' | 'stud' | 'showcase';
}

interface EditListingParams extends ListingActionParams {
  editData: any;
  /** Admin edits apply immediately without pending review */
  forceDirectUpdate?: boolean;
}

interface PauseListingParams extends ListingActionParams {
  isPaused: boolean;
}

const resolveListingTableName = (listingType: string) => {
  if (listingType === 'sale' || listingType === 'listing') return 'sale_listings';
  if (listingType === 'stud') return 'stud_listings';
  return 'showcase_listings';
};

export const useSellerListingActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Edit listing mutation
  const editListing = useMutation({
    mutationFn: async ({
      listingId,
      listingType,
      editData,
      forceDirectUpdate = false,
    }: EditListingParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const tableName = resolveListingTableName(listingType);

      const { data: existingListing, error: fetchError } = await supabase
        .from(tableName)
        .select(
          'current_boost_id, admin_approved, is_published, status, pending_edit_id, title',
        )
        .eq('id', listingId)
        .single();

      if (fetchError) throw fetchError;

      const existing = existingListing as {
        current_boost_id?: string | null;
        admin_approved?: boolean | null;
        is_published?: boolean | null;
        status?: string | null;
        pending_edit_id?: string | null;
        title?: string | null;
      } | null;

      const needsApproval =
        !forceDirectUpdate &&
        listingRequiresEditApproval(existing ?? {}, listingType as EditableListingType);

      if (needsApproval) {
        const { editId } = await submitListingPendingEdit({
          listingId,
          listingType: listingType as EditableListingType,
          sellerId: user.id,
          editData,
          title: editData.title ?? existing?.title,
        });

        await supabase.rpc('log_seller_action', {
          p_listing_id: listingId,
          p_listing_type: listingType,
          p_seller_id: user.id,
          p_action: 'Edit submitted for review',
          p_old_value: 'Live listing',
          p_new_value: `Pending edit ${editId}`,
        });

        return { listingId, listingType, pendingEdit: true as const };
      }

      // Strip lifecycle / gate fields from payload — edits are content-only; keep original
      // approval, publish state, status, and dates (DB trigger also locks created_at / expires_at).
      const {
        created_at: _ca,
        expires_at: _ea,
        admin_approved: _aa,
        is_published: _ip,
        status: _st,
        ...safeEditData
      } = editData as Record<string, unknown>;

      const updateData: any = {
        ...safeEditData,
        current_boost_id: existing?.current_boost_id ?? null,
      };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', listingId);

      if (error) throw error;

      await supabase.rpc('log_seller_action', {
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_seller_id: user.id,
        p_action: 'Edited (content update)',
        p_old_value: 'Listing',
        p_new_value: 'Updated in place',
      });

      return { listingId, listingType, pendingEdit: false as const };
    },
    onSuccess: (result) => {
      if (result.pendingEdit) {
        toast.success(
          'Edit submitted for review. Your current listing stays live until admin approves.',
        );
      } else {
        toast.success('Listing updated successfully.');
      }
      queryClient.invalidateQueries({ queryKey: ['seller-stud-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });
    },
    onError: (error) => {
      console.error('Error editing listing:', error);
      toast.error('Failed to update listing');
    }
  });

  // Delete listing mutation (soft delete)
  const deleteListing = useMutation({
    mutationFn: async ({ listingId, listingType }: ListingActionParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const tableName = resolveListingTableName(listingType);

      // Soft delete the listing
      const { data: updatedRows, error } = await supabase
        .from(tableName)
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          is_published: false
        })
        .eq('id', listingId)
        .select('id');

      if (error) throw error;
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('Listing not found or you do not have permission to delete it.');
      }

      // Log the action
      await supabase.rpc('log_seller_action', {
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_seller_id: user.id,
        p_action: 'Deleted',
        p_old_value: 'Active',
        p_new_value: 'Deleted'
      });

      return { listingId, listingType };
    },
    onSuccess: () => {
      toast.success('Listing deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-stud-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });
    },
    onError: (error) => {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    }
  });

  // Pause/Unpause listing mutation
  const pauseListing = useMutation({
    mutationFn: async ({ listingId, listingType, isPaused }: PauseListingParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const tableName = resolveListingTableName(listingType);

      const updateData = {
        is_paused: isPaused,
        paused_at: isPaused ? new Date().toISOString() : null,
        is_published: isPaused ? false : true
      };

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', listingId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_seller_action', {
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_seller_id: user.id,
        p_action: isPaused ? 'Paused' : 'Unpaused',
        p_old_value: isPaused ? 'Active' : 'Paused',
        p_new_value: isPaused ? 'Paused' : 'Active'
      });

      return { listingId, listingType, isPaused };
    },
    onSuccess: (data) => {
      toast.success(`Listing ${data.isPaused ? 'paused' : 'resumed'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['seller-stud-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });
    },
    onError: (error) => {
      console.error('Error pausing/unpausing listing:', error);
      toast.error('Failed to update listing status');
    }
  });

  // Renew listing mutation (expired For Sale ads → pending re-approval)
  const renewListing = useMutation({
    mutationFn: async ({ listingId, listingType }: ListingActionParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const tableName = resolveListingTableName(listingType);

      if (listingType === 'sale') {
        const { data: existing, error: fetchError } = await supabase
          .from('sale_listings')
          .select('status, can_renew')
          .eq('id', listingId)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!existing || existing.status !== 'expired') {
          throw new Error('Only expired listings can be renewed.');
        }
        if (existing.can_renew === false) {
          throw new Error('This listing cannot be renewed.');
        }
      }

      const { error } = await supabase
        .from(tableName)
        .update({
          status: 'pending_re_approval',
          admin_approved: false,
          is_published: false,
          is_paused: false,
          paused_at: null,
        })
        .eq('id', listingId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_seller_action', {
        p_listing_id: listingId,
        p_listing_type: listingType,
        p_seller_id: user.id,
        p_action: 'Renewal Requested',
        p_old_value: 'Expired/Paused',
        p_new_value: 'Pending Re-Approval'
      });

      return { listingId, listingType };
    },
    onSuccess: () => {
      toast.success('Renewal request submitted! Pending admin approval.');
      queryClient.invalidateQueries({ queryKey: ['seller-stud-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-showcase-listings'] });
      queryClient.invalidateQueries({ queryKey: ['seller-sale-listings'] });
    },
    onError: (error) => {
      console.error('Error renewing listing:', error);
      toast.error('Failed to submit renewal request');
    }
  });

  return {
    editListing: editListing.mutate,
    deleteListing: deleteListing.mutate,
    pauseListing: pauseListing.mutate,
    renewListing: renewListing.mutate,
    isEditing: editListing.isPending,
    isDeleting: deleteListing.isPending,
    isPausing: pauseListing.isPending,
    isRenewing: renewListing.isPending
  };
};
