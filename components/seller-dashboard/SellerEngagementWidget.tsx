'use client';

import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, TrendingUp, Users, Sparkles, ExternalLink, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/use-conversations';
import { cn } from '@/lib/utils';

type WishlistEvent = {
  id: string;
  user_id: string;
  item_id: string;
  item_type: 'listing' | 'stud' | 'showcase';
  created_at: string;
  listingTitle: string;
  /**
   * For showcase wishlists only: true until the linked For Sale advert is live.
   * Then the same row shows the buyer’s name and Message (identity still from wishlist user_id).
   */
  showcaseContactLocked: boolean;
  /** When a showcase row is unlocked, messaging and “View listing” use this sale id. */
  saleListingId?: string | null;
};

function listingHref(ev: WishlistEvent): string {
  if (ev.saleListingId) return `/listing/${ev.saleListingId}`;
  if (ev.item_type === 'listing') return `/listing/${ev.item_id}`;
  if (ev.item_type === 'stud') return `/stud/${ev.item_id}`;
  return `/showcase/${ev.item_id}`;
}

function wishlistTypeToConversationListingType(
  t: WishlistEvent['item_type']
): 'sale' | 'stud' | 'showcase' {
  if (t === 'listing') return 'sale';
  return t;
}

function formatPublicName(row: {
  business_name: string | null;
  first_name: string | null;
  last_name: string | null;
} | null): string {
  if (!row) return 'Someone';
  if (row.business_name?.trim()) return row.business_name.trim();
  const full = `${row.first_name?.trim() || ''} ${row.last_name?.trim() || ''}`.trim();
  return full || 'Dog Quest member';
}

async function fetchSellerEngagement(sellerId: string): Promise<{
  events: WishlistEvent[];
  totalLikes: number;
  uniqueLikers: number;
  likesLast7Days: number;
  listingsWithLikes: number;
  nameByUserId: Record<string, string>;
}> {
  const [salesRes, studsRes, showcasesRes] = await Promise.all([
    supabase.from('sale_listings').select('id, title').eq('seller_id', sellerId).eq('is_deleted', false),
    supabase.from('stud_listings').select('id, title').eq('user_id', sellerId).eq('is_deleted', false),
    supabase
      .from('showcase_listings')
      .select('id, title, converted_to_sale_id')
      .eq('seller_id', sellerId)
      .eq('is_deleted', false),
  ]);

  const saleRows = salesRes.data || [];
  const studRows = studsRes.data || [];
  const showcaseRows = (showcasesRes.data || []) as {
    id: string;
    title: string | null;
    converted_to_sale_id: string | null;
  }[];

  const titleByKey = new Map<string, string>();
  saleRows.forEach((r) => titleByKey.set(`listing:${r.id}`, r.title || 'Listing'));
  studRows.forEach((r) => titleByKey.set(`stud:${r.id}`, r.title || 'Stud listing'));
  showcaseRows.forEach((r) => titleByKey.set(`showcase:${r.id}`, r.title || 'Showcase'));

  const showcasesPointingAtSale = showcaseRows.filter((r) => r.converted_to_sale_id);
  const candidateSaleIds = [
    ...new Set(showcasesPointingAtSale.map((r) => r.converted_to_sale_id).filter(Boolean)),
  ] as string[];

  /** Same bar as public For Sale: only then may sellers see who hearted during Showcase. */
  const saleTitleById = new Map<string, string>();
  const liveUnlockedSaleIdSet = new Set<string>();
  if (candidateSaleIds.length) {
    const { data: liveSales } = await supabase
      .from('sale_listings')
      .select('id, title')
      .eq('seller_id', sellerId)
      .eq('is_deleted', false)
      .eq('is_published', true)
      .eq('admin_approved', true)
      .eq('is_paused', false)
      .in('id', candidateSaleIds);
    (liveSales || []).forEach((s: { id: string; title: string | null }) => {
      liveUnlockedSaleIdSet.add(s.id);
      saleTitleById.set(s.id, s.title?.trim() || 'Listing');
    });
  }

  /** Per showcase: unlocked + sale id when live For Sale exists; otherwise locked (anonymous in UI). */
  const showcaseStateById = new Map<
    string,
    { unlocked: boolean; saleListingId: string | null; showcaseTitle: string }
  >();
  showcaseRows.forEach((r) => {
    const title = r.title?.trim() || 'Showcase';
    if (!r.converted_to_sale_id) {
      showcaseStateById.set(r.id, { unlocked: false, saleListingId: null, showcaseTitle: title });
      return;
    }
    if (liveUnlockedSaleIdSet.has(r.converted_to_sale_id)) {
      showcaseStateById.set(r.id, {
        unlocked: true,
        saleListingId: r.converted_to_sale_id,
        showcaseTitle: title,
      });
    } else {
      showcaseStateById.set(r.id, {
        unlocked: false,
        saleListingId: null,
        showcaseTitle: title,
      });
    }
  });

  const saleIds = saleRows.map((r) => r.id);
  const studIds = studRows.map((r) => r.id);
  const allShowcaseIds = showcaseRows.map((r) => r.id);

  if (!saleIds.length && !studIds.length && !allShowcaseIds.length) {
    return { events: [], totalLikes: 0, uniqueLikers: 0, likesLast7Days: 0, listingsWithLikes: 0, nameByUserId: {} };
  }

  const raw: { id: string; user_id: string; item_id: string; item_type: string; created_at: string }[] = [];

  if (saleIds.length) {
    const { data } = await supabase
      .from('user_wishlists')
      .select('id, user_id, item_id, item_type, created_at')
      .eq('item_type', 'listing')
      .in('item_id', saleIds);
    if (data?.length) raw.push(...data);
  }
  if (studIds.length) {
    const { data } = await supabase
      .from('user_wishlists')
      .select('id, user_id, item_id, item_type, created_at')
      .eq('item_type', 'stud')
      .in('item_id', studIds);
    if (data?.length) raw.push(...data);
  }
  if (allShowcaseIds.length) {
    const { data } = await supabase
      .from('user_wishlists')
      .select('id, user_id, item_id, item_type, created_at')
      .eq('item_type', 'showcase')
      .in('item_id', allShowcaseIds);
    if (data?.length) raw.push(...data);
  }

  const events: WishlistEvent[] = raw.map((row) => {
    const t = row.item_type as WishlistEvent['item_type'];
    if (t === 'showcase') {
      const st = showcaseStateById.get(row.item_id);
      const unlocked = st?.unlocked === true;
      const saleId = unlocked ? st?.saleListingId ?? null : null;
      const displayTitle =
        unlocked && saleId
          ? saleTitleById.get(saleId) || st?.showcaseTitle || 'Showcase'
          : st?.showcaseTitle || titleByKey.get(`showcase:${row.item_id}`) || 'Showcase';
      return {
        id: row.id,
        user_id: row.user_id,
        item_id: row.item_id,
        item_type: 'showcase',
        created_at: row.created_at,
        listingTitle: displayTitle,
        showcaseContactLocked: !unlocked,
        saleListingId: saleId,
      };
    }
    return {
      id: row.id,
      user_id: row.user_id,
      item_id: row.item_id,
      item_type: t,
      created_at: row.created_at,
      listingTitle: titleByKey.get(`${row.item_type}:${row.item_id}`) || 'Your listing',
      showcaseContactLocked: false,
      saleListingId: null,
    };
  });

  events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const likesLast7Days = events.filter((e) => new Date(e.created_at).getTime() >= sevenDaysAgo).length;
  const uniqueLikers = new Set(events.map((e) => e.user_id)).size;
  const listingsWithLikes = new Set(events.map((e) => `${e.item_type}:${e.item_id}`)).size;

  const likerIds = [
    ...new Set(
      events
        .filter((e) => !(e.item_type === 'showcase' && e.showcaseContactLocked))
        .map((e) => e.user_id)
    ),
  ];
  const nameByUserId: Record<string, string> = {};

  await Promise.all(
    likerIds.map(async (uid) => {
      const { data, error } = await supabase.rpc('get_public_user_name', { user_id_param: uid });
      if (error) {
        nameByUserId[uid] = 'Someone';
        return;
      }
      const row = Array.isArray(data) ? data[0] : data;
      nameByUserId[uid] = formatPublicName(row as { business_name: string | null; first_name: string | null; last_name: string | null } | null);
    })
  );

  return {
    events,
    totalLikes: events.length,
    uniqueLikers,
    likesLast7Days,
    listingsWithLikes,
    nameByUserId,
  };
}

export default function SellerEngagementWidget() {
  const { user } = useAuth();
  const router = useRouter();
  const { createConversationAsSeller } = useConversations();
  const [messagingUserId, setMessagingUserId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seller-engagement', user?.id, 'showcase-two-phase'],
    queryFn: () => fetchSellerEngagement(user!.id),
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  if (!user) return null;

  if (isLoading) {
    return (
      <Card className="border-rose-200/80 bg-gradient-to-br from-rose-50/90 to-amber-50/40 overflow-hidden">
        <CardHeader className="px-4 pt-4 pb-2 sm:px-6 sm:pt-6">
          <div className="h-6 w-48 animate-pulse rounded bg-rose-100/80" />
          <div className="mt-2 h-16 w-full max-w-2xl animate-pulse rounded bg-rose-100/60" />
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="h-24 animate-pulse rounded-lg bg-white/50" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return null;
  }

  const { events, totalLikes, uniqueLikers, likesLast7Days, listingsWithLikes, nameByUserId } = data;
  const recent = events.slice(0, 8);

  return (
    <Card className="border-rose-200/80 bg-gradient-to-br from-rose-50/90 via-white to-amber-50/50 shadow-sm overflow-hidden">
      <CardHeader className="space-y-3 pb-2 px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <Heart className="h-5 w-5 text-rose-600 fill-rose-200" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg font-berkshire text-brand-dark-green break-words sm:text-xl">
                Likes and Interests
              </CardTitle>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[15px] sm:leading-relaxed">
                {
                  "For Showcase ads, likes are anonymous initially. When you convert the Showcase ad into a 'For Sale' advert (once puppies reach 6 weeks old and are microchipped), the names of users who previously liked the Showcase will be revealed, and messaging becomes available through DogQuest. This prevents early contact before legal requirements are met. For For Sale and Stud ads, likes are not anonymous — user names and contact options are visible immediately."
                }
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-full shrink-0 justify-center border-rose-200 sm:h-9 sm:w-auto sm:self-start"
            asChild
          >
            <Link href="/my-seller-dashboard/notifications">
              <Sparkles className="h-4 w-4 mr-1 shrink-0" />
              Notifications
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
        <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
          <StatPill icon={Heart} label="Total likes" value={totalLikes} accent="text-rose-600" />
          <StatPill icon={Users} label="Unique likers" value={uniqueLikers} accent="text-violet-600" />
          <StatPill icon={TrendingUp} label="Likes (7 days)" value={likesLast7Days} accent="text-emerald-600" />
          <StatPill icon={Sparkles} label="Listings liked" value={listingsWithLikes} accent="text-amber-600" />
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-rose-200 bg-white/60 px-3 py-5 text-center text-sm leading-relaxed text-muted-foreground text-pretty sm:px-4 sm:py-6">
            <Heart className="mx-auto mb-2 h-10 w-10 text-rose-200" />
            Showcase likes will appear here anonymously until you convert to a &apos;For Sale&apos; advert (puppies at
            least 6 weeks old and microchipped); then names and messaging unlock. For Sale and stud likes show names and
            contact options here straight away.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-rose-100 bg-white/80">
            <p className="border-b border-rose-100 bg-rose-50/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent activity
            </p>
            <ul className="max-h-[min(320px,55vh)] divide-y divide-rose-50 overflow-y-auto overscroll-contain">
              {recent.map((ev) => {
                const lockedShowcase = ev.item_type === 'showcase' && ev.showcaseContactLocked;
                const likerLabel = lockedShowcase
                  ? 'A buyer'
                  : nameByUserId[ev.user_id] || 'Someone';
                return (
                <li key={ev.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900">{likerLabel}</span>
                    {lockedShowcase ? (
                      <>
                        <span className="text-muted-foreground"> liked your showcase </span>
                        <span className="font-medium text-gray-800 break-words">{ev.listingTitle}</span>
                      </>
                    ) : (
                      <>
                        <span className="text-muted-foreground"> liked </span>
                        <span className="font-medium text-gray-800 break-words">{ev.listingTitle}</span>
                      </>
                    )}
                    <span className="mt-1 block text-xs text-muted-foreground sm:mt-0 sm:inline sm:ml-2">
                      {new Date(ev.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:max-w-[min(100%,280px)] sm:shrink-0 sm:justify-end">
                    {!lockedShowcase && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 border-rose-200 text-rose-800"
                      disabled={messagingUserId === ev.user_id}
                      onClick={async () => {
                        if (!user?.id || messagingUserId) return;
                        setMessagingUserId(ev.user_id);
                        try {
                          const subject = `${ev.listingTitle} — thanks for your interest`;
                          const body = `Hi! You showed interest in "${ev.listingTitle}". I wanted to reach out — happy to answer any questions.`;
                          const listingId = ev.saleListingId ?? ev.item_id;
                          const listingType = ev.saleListingId
                            ? 'sale'
                            : wishlistTypeToConversationListingType(ev.item_type);
                          const cid = await createConversationAsSeller(
                            ev.user_id,
                            listingId,
                            listingType,
                            subject,
                            body
                          );
                          if (cid) {
                            router.push(`/my-seller-dashboard/messages/${cid}`);
                          }
                        } finally {
                          setMessagingUserId(null);
                        }
                      }}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" />
                      Message
                    </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-8 text-rose-700" asChild>
                      <Link href={listingHref(ev)}>
                        View listing
                        <ExternalLink className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </li>
              );
              })}
            </ul>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground text-pretty">
          Notifications for &apos;liked your listing&apos; apply to For Sale and Stud ads only. Showcase likes do not
          trigger notifications. When a Showcase is converted to a For Sale ad, previously anonymous likes will become
          visible here without separate notifications.
        </p>
      </CardContent>
    </Card>
  );
}

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className={cn('min-w-0 rounded-lg border border-rose-100/80 bg-white/90 px-2.5 py-2 shadow-sm sm:px-3')}>
      <div className="mb-1 flex min-w-0 items-start gap-1.5 text-xs text-muted-foreground">
        <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', accent)} />
        <span className="min-w-0 leading-tight break-words">{label}</span>
      </div>
      <div className={cn('text-lg font-bold tabular-nums sm:text-xl', accent)}>{value}</div>
    </div>
  );
}
