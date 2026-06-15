import { supabase } from '@/lib/supabase/client';
import { resolveListingVerificationBadges } from '@/lib/utils/code-verification';
import { normalizeStudListingSex } from '@/lib/utils/stud-listing-sex';

/** DB types may lag migrations (edit tables, notify RPCs). */
const db = supabase as any;

export type EditableListingType = 'sale' | 'stud' | 'showcase';

const EDIT_TABLE: Record<EditableListingType, string> = {
  sale: 'sale_listing_edits',
  stud: 'stud_listing_edits',
  showcase: 'showcase_listing_edits',
};

const MAIN_TABLE: Record<EditableListingType, string> = {
  sale: 'sale_listings',
  stud: 'stud_listings',
  showcase: 'showcase_listings',
};

/** Lifecycle / gate fields — never written from a pending edit payload. */
const BLOCKED_EDIT_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'expires_at',
  'admin_approved',
  'is_published',
  'status',
  'pending_edit_id',
  'current_boost_id',
  'seller_id',
  'user_id',
  'payment_status',
  'is_paid',
  'can_renew',
  'is_deleted',
  'deleted_at',
  'is_paused',
  'paused_at',
  'stripe_session_id',
  'payment_amount',
  'payment_currency',
  'verification_date',
  'green_tick',
  'gold_star',
  'codes_verified',
  'rejection_message',
  'admin_notes',
  'listing_id',
]);

export function listingEditTable(type: EditableListingType): string {
  return EDIT_TABLE[type];
}

export function listingMainTable(type: EditableListingType): string {
  return MAIN_TABLE[type];
}

/** Published, approved listings require admin review before edits go live. */
export function listingRequiresEditApproval(
  listing: {
    admin_approved?: boolean | null;
    is_published?: boolean | null;
    status?: string | null;
  },
  listingType: EditableListingType,
): boolean {
  if (!listing.admin_approved || !listing.is_published) return false;

  if (listingType === 'sale') {
    const status = (listing.status || '').toLowerCase();
    return status === 'active' || status === 'approved';
  }

  return true;
}

function stripBlockedFields(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!BLOCKED_EDIT_KEYS.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

function buildEditInsertPayload(
  listingType: EditableListingType,
  listingId: string,
  sellerId: string,
  editData: Record<string, unknown>,
): Record<string, unknown> {
  const payload = stripBlockedFields(editData);
  return {
    ...payload,
    listing_id: listingId,
    status: 'pending',
    ...(listingType === 'stud' ? { user_id: sellerId } : { seller_id: sellerId }),
  };
}

export async function notifyAdminsListingEditPending(args: {
  listingId: string;
  listingType: EditableListingType;
  title: string;
  sellerId: string;
}): Promise<void> {
  const { error } = await db.rpc('notify_admins_listing_edit_pending', {
    p_listing_id: args.listingId,
    p_listing_type: args.listingType,
    p_title: args.title,
    p_seller_id: args.sellerId,
  });

  if (error) {
    // Fallback to generic approval notification if migration not applied yet
    await db.rpc('notify_admins_approval_required', {
      p_listing_id: args.listingId,
      p_listing_type: args.listingType,
      p_title: args.title,
      p_seller_id: args.sellerId,
    });
  }
}

export async function submitListingPendingEdit(args: {
  listingId: string;
  listingType: EditableListingType;
  sellerId: string;
  editData: Record<string, unknown>;
  title?: string;
}): Promise<{ editId: string }> {
  const mainTable = listingMainTable(args.listingType);
  const editTable = listingEditTable(args.listingType);

  const { data: existing, error: fetchError } = await db
    .from(mainTable)
    .select('pending_edit_id, current_boost_id, title, admin_approved, is_published, status')
    .eq('id', args.listingId)
    .single();

  if (fetchError) throw fetchError;
  if (!existing) throw new Error('Listing not found');

  if (existing.pending_edit_id) {
    throw new Error('A pending edit already exists for this listing. Please wait for admin approval.');
  }

  const insertPayload = buildEditInsertPayload(
    args.listingType,
    args.listingId,
    args.sellerId,
    args.editData,
  );

  const { data: editRow, error: insertError } = await db
    .from(editTable)
    .insert(insertPayload as never)
    .select('id')
    .single();

  if (insertError) throw insertError;
  if (!editRow?.id) throw new Error('Failed to create edit record');

  const { error: linkError } = await db
    .from(mainTable)
    .update({
      pending_edit_id: editRow.id,
      current_boost_id: existing.current_boost_id ?? null,
    })
    .eq('id', args.listingId);

  if (linkError) throw linkError;

  const listingTitle =
    args.title ||
    (typeof insertPayload.title === 'string' ? insertPayload.title : null) ||
    existing.title ||
    'Listing';

  await notifyAdminsListingEditPending({
    listingId: args.listingId,
    listingType: args.listingType,
    title: listingTitle,
    sellerId: args.sellerId,
  });

  return { editId: editRow.id };
}

const SALE_EDIT_APPLY_KEYS = [
  'title',
  'breed',
  'breed_1',
  'breed_2',
  'breed_type',
  'location',
  'date_of_birth',
  'description',
  'male_count',
  'female_count',
  'same_pricing',
  'price',
  'min_price',
  'max_price',
  'uniform_price',
  'images',
  'primary_image_index',
  'video_url',
  'microchip_database',
  'puppy_details',
  'use_collar_codes',
  'selected_colors',
  'identifiers',
  'vet_name',
  'vet_location',
  'documents',
  'energy',
  'size',
  'mother_name',
  'mother_breed',
  'mother_image',
  'mother_dob',
  'father_name',
  'father_breed',
  'father_image',
  'father_dob',
  'maternal_grandmother_name',
  'maternal_grandmother_breed',
  'maternal_grandmother_image',
  'maternal_grandmother_dob',
  'maternal_grandfather_name',
  'maternal_grandfather_breed',
  'maternal_grandfather_image',
  'maternal_grandfather_dob',
  'paternal_grandmother_name',
  'paternal_grandmother_breed',
  'paternal_grandmother_image',
  'paternal_grandmother_dob',
  'paternal_grandfather_name',
  'paternal_grandfather_breed',
  'paternal_grandfather_image',
  'paternal_grandfather_dob',
] as const;

function pickSaleEditFields(edit: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of SALE_EDIT_APPLY_KEYS) {
    if (key in edit) out[key] = edit[key];
  }
  return out;
}

export async function approveSaleListingEdit(args: {
  listingId: string;
  pendingEdit: Record<string, unknown>;
  adminNotes?: string | null;
  sellerId: string;
}): Promise<void> {
  const content = pickSaleEditFields(args.pendingEdit);
  const badges = await resolveListingVerificationBadges(
    'sale',
    { puppy_details: content.puppy_details },
    {
      excludeListingId: args.listingId,
      excludeListingType: 'sale',
    },
  );

  const { error: updateError } = await db
    .from('sale_listings')
    .update({
      ...content,
      pending_edit_id: null,
      admin_notes: args.adminNotes ?? null,
      updated_at: new Date().toISOString(),
      green_tick: badges.green_tick,
      gold_star: badges.gold_star,
      codes_verified: badges.codes_verified,
      verification_date: badges.verification_date,
    })
    .eq('id', args.listingId);

  if (updateError) throw updateError;

  if (args.pendingEdit.id) {
    const { error: editStatusError } = await db
      .from('sale_listing_edits')
      .update({ status: 'approved', admin_notes: args.adminNotes ?? null })
      .eq('id', args.pendingEdit.id);

    if (editStatusError) {
      console.error('approveSaleListingEdit: edit row update failed', editStatusError);
    }
  }

  const { error: notifyError } = await db.from('notifications').insert({
    user_id: args.sellerId,
    title: 'Edit Approved',
    message: `Your edit for "${content.title ?? 'your listing'}" has been approved and is now live.`,
    type: 'success',
    listing_id: args.listingId,
    listing_type: 'sale',
  });

  if (notifyError) {
    console.error('approveSaleListingEdit: notification insert failed', notifyError);
  }
}

export async function rejectSaleListingEdit(args: {
  listingId: string;
  editId: string;
  adminNotes: string;
  sellerId: string;
  listingTitle: string;
}): Promise<void> {
  const { error: clearError } = await db
    .from('sale_listings')
    .update({ pending_edit_id: null, admin_notes: args.adminNotes })
    .eq('id', args.listingId);

  if (clearError) throw clearError;

  await db
    .from('sale_listing_edits')
    .update({ status: 'rejected', admin_notes: args.adminNotes, rejection_message: args.adminNotes })
    .eq('id', args.editId);

  await db.from('notifications').insert({
    user_id: args.sellerId,
    title: 'Edit Rejected',
    message: `Your edit for "${args.listingTitle}" was not approved. Feedback: ${args.adminNotes}`,
    type: 'warning',
    listing_id: args.listingId,
    listing_type: 'sale',
  });
}

export async function fetchPendingListingEdit(
  listingType: EditableListingType,
  editId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await db
    .from(listingEditTable(listingType))
    .select('*')
    .eq('id', editId)
    .maybeSingle();

  if (error) throw error;
  return data as Record<string, unknown> | null;
}

/** Approve a pending edit when admin activates from the listings table dropdown. */
export async function approvePendingListingEditForListing(args: {
  listingType: EditableListingType;
  listingId: string;
  pendingEditId: string;
  sellerId: string;
  adminNotes?: string | null;
}): Promise<void> {
  const pendingEdit = await fetchPendingListingEdit(args.listingType, args.pendingEditId);
  if (!pendingEdit || pendingEdit.status !== 'pending') {
    throw new Error('No pending edit found to approve.');
  }

  if (args.listingType === 'sale') {
    await approveSaleListingEdit({
      listingId: args.listingId,
      pendingEdit,
      adminNotes: args.adminNotes ?? null,
      sellerId: args.sellerId,
    });
    return;
  }

  if (args.listingType === 'stud') {
    const badges = await resolveListingVerificationBadges('stud', {
      v1_cert: pendingEdit.v1_cert,
      v2_cert: pendingEdit.v2_cert,
      h1_cert: pendingEdit.h1_cert,
    });

    const { error: updateError } = await db
      .from('stud_listings')
      .update({
        title: pendingEdit.title,
        breed: pendingEdit.breed,
        location: pendingEdit.location,
        dob: pendingEdit.dob,
        sex: normalizeStudListingSex(pendingEdit.sex),
        description: pendingEdit.description,
        vet_name: pendingEdit.vet_name,
        vet_location: pendingEdit.vet_location,
        stud_fee: pendingEdit.stud_fee,
        pick_of_litter: pendingEdit.pick_of_litter,
        images: pendingEdit.images,
        video_url: pendingEdit.video_url,
        v1_cert: pendingEdit.v1_cert,
        v2_cert: pendingEdit.v2_cert,
        h1_cert: pendingEdit.h1_cert,
        family_tree: pendingEdit.family_tree,
        pending_edit_id: null,
        admin_notes: args.adminNotes ?? null,
        updated_at: new Date().toISOString(),
        green_tick: badges.green_tick,
        gold_star: badges.gold_star,
        codes_verified: badges.codes_verified,
        verification_date: badges.verification_date,
      })
      .eq('id', args.listingId);

    if (updateError) throw updateError;

    await db
      .from('stud_listing_edits')
      .update({ status: 'approved', admin_notes: args.adminNotes ?? null })
      .eq('id', args.pendingEditId);

    await db.from('notifications').insert({
      user_id: args.sellerId,
      title: 'Edit Approved',
      message: `Your edit for "${pendingEdit.title ?? 'your listing'}" has been approved and is now live.`,
      type: 'success',
      listing_id: args.listingId,
      listing_type: 'stud',
    });
  }
}

/** Reject a pending edit from the admin status dropdown (listing stays live). */
export async function rejectPendingListingEditForListing(args: {
  listingType: EditableListingType;
  listingId: string;
  pendingEditId: string;
  sellerId: string;
  listingTitle: string;
  adminNotes?: string;
}): Promise<void> {
  const notes = args.adminNotes?.trim() || 'Edit rejected by admin.';

  if (args.listingType === 'sale') {
    await rejectSaleListingEdit({
      listingId: args.listingId,
      editId: args.pendingEditId,
      adminNotes: notes,
      sellerId: args.sellerId,
      listingTitle: args.listingTitle,
    });
    return;
  }

  if (args.listingType === 'stud') {
    await db
      .from('stud_listings')
      .update({ pending_edit_id: null, admin_notes: notes })
      .eq('id', args.listingId);

    await db
      .from('stud_listing_edits')
      .update({ status: 'rejected', admin_notes: notes })
      .eq('id', args.pendingEditId);

    await db.from('notifications').insert({
      user_id: args.sellerId,
      title: 'Edit Rejected',
      message: `Your edit for "${args.listingTitle}" was not approved. Feedback: ${notes}`,
      type: 'warning',
      listing_id: args.listingId,
      listing_type: 'stud',
    });
  }
}
