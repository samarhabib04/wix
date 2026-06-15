import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeadersForRequest } from '../_shared/cors-headers.ts';
import { isBoostLiveNow } from '../_shared/boost-activation-window.ts';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?q=80&w=800';

const TIER_RANK: Record<string, number> = {
  gold: 0,
  elite: 1,
  premium: 2,
  standard: 3,
};

const PUBLIC_SALE_STATUSES = ['active', 'approved'];

function parsePuppyDetails(raw: unknown): Array<Record<string, unknown>> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseImages(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

function resolvePrimaryImage(listing: Record<string, unknown>): string {
  const puppyDetails = parsePuppyDetails(listing.puppy_details);
  if (puppyDetails.length > 0) {
    const first = puppyDetails[0];
    const puppyUrl = (first.imageUrl ?? first.image_url) as string | undefined;
    if (puppyUrl && puppyUrl.trim()) return puppyUrl;
  }

  const images = parseImages(listing.images);
  const idx = typeof listing.primary_image_index === 'number' ? listing.primary_image_index : 0;
  if (images.length > 0) {
    if (idx >= 0 && idx < images.length) return images[idx];
    return images[0];
  }

  return DEFAULT_IMAGE;
}

function toNumericId(uuid: string): number {
  return Math.abs(
    uuid.split('').reduce((acc, char) => {
      const next = (acc << 5) - acc + char.charCodeAt(0);
      return next & next;
    }, 0),
  );
}

serve(async (req) => {
  const corsHeaders = corsHeadersForRequest(req, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Number(body.limit) || 50, 100);
    const listingType = body.listingType === 'stud' || body.listingType === 'showcase'
      ? body.listingType
      : 'sale';

    if (listingType !== 'sale') {
      return new Response(JSON.stringify({ listings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    );

    const nowISO = new Date().toISOString();
    const now = new Date();
    const { data: boosts, error: boostsError } = await supabase
      .from('boosts')
      .select('listing_id, boost_type, boost_start_time, boost_end_time, listing_type')
      .eq('is_active', true)
      .eq('listing_type', 'sale')
      .lte('boost_start_time', nowISO)
      .or(`boost_end_time.gt.${nowISO},boost_end_time.is.null`)
      .order('boost_start_time', { ascending: false });

    if (boostsError) throw boostsError;

    const liveBoosts = (boosts || []).filter((b) =>
      isBoostLiveNow(b.boost_type, b.boost_start_time, b.boost_end_time, now),
    );
    if (!liveBoosts.length) {
      return new Response(JSON.stringify({ listings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderedIds: string[] = [];
    const seen = new Set<string>();
    const boostByListing = new Map<string, (typeof liveBoosts)[0]>();

    for (const b of liveBoosts) {
      if (!b.listing_id || seen.has(b.listing_id)) continue;
      seen.add(b.listing_id);
      orderedIds.push(b.listing_id);
      boostByListing.set(b.listing_id, b);
    }

    const { data: rows, error: listingsError } = await supabase
      .from('sale_listings')
      .select('*')
      .in('id', orderedIds)
      .eq('admin_approved', true)
      .eq('is_published', true)
      .not('is_deleted', 'is', true)
      .not('is_paused', 'is', true)
      .in('status', PUBLIC_SALE_STATUSES);

    if (listingsError) throw listingsError;

    const rowById = new Map((rows || []).map((r) => [r.id, r]));

    let listings = orderedIds
      .map((id) => {
        const row = rowById.get(id);
        const boost = boostByListing.get(id);
        if (!row || !boost?.boost_type) return null;

        const images = parseImages(row.images);
        const puppyDetails = parsePuppyDetails(row.puppy_details);
        const primaryImageIndex = typeof row.primary_image_index === 'number'
          ? row.primary_image_index
          : 0;
        const cardImage = resolvePrimaryImage(row as Record<string, unknown>);

        return {
          id: toNumericId(row.id),
          originalId: row.id,
          title: row.title,
          breed: row.breed,
          price: row.uniform_price ?? row.min_price ?? row.max_price ?? 0,
          minPrice: row.min_price,
          maxPrice: row.max_price,
          maleCount: row.male_count,
          femaleCount: row.female_count,
          location: row.location,
          image: cardImage,
          images,
          puppyDetails,
          primaryImageIndex,
          hasGreenTick: !!row.green_tick,
          hasGoldStar: !!row.gold_star,
          type: 'listing',
          created_at: row.created_at,
          boostType: boost.boost_type,
          boostStartTime: boost.boost_start_time,
        };
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    listings.sort((a, b) => {
      const aRank = TIER_RANK[String(a.boostType)] ?? 99;
      const bRank = TIER_RANK[String(b.boostType)] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return new Date(String(b.boostStartTime)).getTime() -
        new Date(String(a.boostStartTime)).getTime();
    });

    listings = listings.slice(0, limit).map(({ boostStartTime: _removed, ...rest }) => rest);

    return new Response(JSON.stringify({ listings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('get-boosted-listings error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
