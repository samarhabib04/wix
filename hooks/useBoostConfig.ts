'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export interface BoostConfigNames {
  gold: string;
  elite: string;
  premium: string;
  standard: string;
}

/** Public carousel / card headings (admin-editable via boost_config). Standard default = no section heading. */
export const DEFAULT_BOOST_DISPLAY_NAMES: BoostConfigNames = {
  gold: "Tonight's Pawfect Picks",
  elite: 'Puppy in My Pocket',
  premium: 'Love at First Wag',
  standard: '',
};

/**
 * Strips zero-width / invisible characters that `.trim()` keeps (common CMS copy-paste).
 * When the result is empty, callers should fall back to default tier titles.
 */
export function sanitizeBoostHeadingInput(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
}

/**
 * Seasonal heading from boost_config (and env). For Standard, empty means no title on the
 * homepage new-listings row — use {@link standardBoostCardTitle} on /boost-listing and /boost cards.
 * Gold / Elite / Premium fall back to defaults via parseBoostConfigRow when DB fields are blank.
 */
export function boostTierPublicTitle(
  tier: 'gold' | 'elite' | 'premium' | 'standard',
  names: BoostConfigNames
): string | null {
  const raw =
    tier === 'gold'
      ? names.gold
      : tier === 'elite'
        ? names.elite
        : tier === 'premium'
          ? names.premium
          : names.standard;
  const t = sanitizeBoostHeadingInput(raw);
  if (tier === 'standard' && !t) return null;
  return t || null;
}

/** Label for Standard tier on pricing/marketing cards when seasonal title is intentionally empty. */
export const STANDARD_BOOST_CARD_LABEL = 'Standard Boost';

/** Shown above the home “new listings” carousel when `standard_boost_name` is left blank in admin. */
export const DEFAULT_NEW_LISTINGS_SECTION_HEADING = 'New Dogs & Puppies';

/** Optional Vercel/build overrides (non-empty replaces DB). Standard may be set to "" to force no heading. */
function applyOptionalPublicEnvOverrides(names: BoostConfigNames): BoostConfigNames {
  const g = process.env.NEXT_PUBLIC_BOOST_HEADING_GOLD;
  const e = process.env.NEXT_PUBLIC_BOOST_HEADING_ELITE;
  const p = process.env.NEXT_PUBLIC_BOOST_HEADING_PREMIUM;
  const s = process.env.NEXT_PUBLIC_BOOST_HEADING_STANDARD;

  const tierFromEnv = (env: string | undefined, fallback: string) => {
    if (env == null || env === '') return fallback;
    const cleaned = sanitizeBoostHeadingInput(env);
    return cleaned || fallback;
  };

  return {
    gold: g !== undefined ? tierFromEnv(g, names.gold) : names.gold,
    elite: e !== undefined ? tierFromEnv(e, names.elite) : names.elite,
    premium: p !== undefined ? tierFromEnv(p, names.premium) : names.premium,
    standard: s !== undefined ? sanitizeBoostHeadingInput(s) : names.standard,
  };
}

let cachedConfig: BoostConfigNames | null = null;
let fetchPromise: Promise<BoostConfigNames> | null = null;

export function invalidateBoostConfigCache() {
  cachedConfig = null;
  fetchPromise = null;
}

export function parseBoostConfigRow(data: Record<string, unknown>): BoostConfigNames {
  const str = (v: unknown) =>
    typeof v === 'string' ? sanitizeBoostHeadingInput(v) : '';
  return {
    gold: str(data.gold_boost_name) || DEFAULT_BOOST_DISPLAY_NAMES.gold,
    elite: str(data.elite_boost_name) || DEFAULT_BOOST_DISPLAY_NAMES.elite,
    premium: str(data.premium_boost_name) || DEFAULT_BOOST_DISPLAY_NAMES.premium,
    // Empty string allowed: no heading for standard / “new listings” carousel
    standard:
      typeof data.standard_boost_name === 'string'
        ? sanitizeBoostHeadingInput(data.standard_boost_name)
        : DEFAULT_BOOST_DISPLAY_NAMES.standard,
  };
}

/** DB row (or null) + same optional env overrides as useBoostConfig. */
export function resolveBoostDisplayNames(
  row: Record<string, unknown> | null | undefined
): BoostConfigNames {
  const base = row ? parseBoostConfigRow(row) : { ...DEFAULT_BOOST_DISPLAY_NAMES };
  return applyOptionalPublicEnvOverrides(base);
}

async function fetchBoostConfig(): Promise<BoostConfigNames> {
  if (cachedConfig) return cachedConfig;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('boost_config' as any)
        .select('gold_boost_name, elite_boost_name, premium_boost_name, standard_boost_name')
        .single();

      if (data && !error) {
        const config = applyOptionalPublicEnvOverrides(
          parseBoostConfigRow(data as unknown as Record<string, unknown>)
        );
        cachedConfig = config;
        return config;
      }
    } catch (err) {
      console.error('Error fetching boost config:', err);
    }
    return applyOptionalPublicEnvOverrides({ ...DEFAULT_BOOST_DISPLAY_NAMES });
  })();

  return fetchPromise;
}

export function useBoostConfig(): BoostConfigNames {
  const [names, setNames] = useState<BoostConfigNames>(
    cachedConfig || { ...DEFAULT_BOOST_DISPLAY_NAMES }
  );

  useEffect(() => {
    fetchBoostConfig().then(setNames);
  }, []);

  return names;
}
