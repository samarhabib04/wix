/**
 * Computes boost_start_time / boost_end_time for listing boosts (`public.boosts`).
 * Gold: fixed Irish evening window 19:00–23:00 Europe/Dublin (DST-aware).
 *   - Purchase before 19:00 local → starts 19:00 same Irish calendar day, ends 23:00 same day.
 *   - Purchase between 19:00 and 23:00 local → starts immediately, ends 23:00 same Irish day.
 *   - Purchase at or after 23:00 local → starts 19:00 next Irish calendar day, ends 23:00 that day.
 * Standard: start at payment, no fixed end. Other timed tiers: 24h from payment.
 */

const GOLD_TIMEZONE = 'Europe/Dublin';

type ZonedYmdHm = { y: number; m: number; d: number; h: number; min: number };

function getZonedParts(d: Date, timeZone: string): ZonedYmdHm & { sec: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const v = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? '0', 10);
  return { y: v('year'), m: v('month'), d: v('day'), h: v('hour'), min: v('minute'), sec: v('second') };
}

function cmpZoned(a: ZonedYmdHm, b: ZonedYmdHm): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  if (a.d !== b.d) return a.d < b.d ? -1 : 1;
  if (a.h !== b.h) return a.h < b.h ? -1 : 1;
  if (a.min !== b.min) return a.min < b.min ? -1 : 1;
  return 0;
}

/** Instant where `timeZone` shows the given wall-clock time (resolved via binary search). */
function zonedWallClockToUtc(y: number, mo: number, d: number, h: number, min: number, timeZone: string): Date {
  const target: ZonedYmdHm = { y, m: mo, d, h, min };
  let lo = Date.UTC(y, mo - 1, d) - 72 * 3600000;
  let hi = Date.UTC(y, mo - 1, d) + 72 * 3600000;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    const p = getZonedParts(new Date(mid), timeZone);
    const c = cmpZoned({ y: p.y, m: p.m, d: p.d, h: p.h, min: p.min }, target);
    if (c === 0) return new Date(mid);
    if (c < 0) lo = mid;
    else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

/** Next Irish calendar date after `paidAt` (first instant whose Dublin Y-M-D differs). */
function nextDublinYmdAfter(paidAt: Date): { y: number; m: number; d: number } {
  const start = getZonedParts(paidAt, GOLD_TIMEZONE);
  let t = new Date(paidAt.getTime());
  for (let i = 0; i < 96; i++) {
    t = new Date(t.getTime() + 15 * 60000);
    const p = getZonedParts(t, GOLD_TIMEZONE);
    if (p.y !== start.y || p.m !== start.m || p.d !== start.d) {
      return { y: p.y, m: p.m, d: p.d };
    }
  }
  throw new Error('[boost-activation-window] nextDublinYmdAfter: could not find next calendar day');
}

export function getBoostActivationWindow(
  boostType: string,
  paidAt: Date,
): { boostStart: string; boostEnd: string | null } {
  const tier = (boostType || '').trim().toLowerCase();

  if (tier === 'standard') {
    return { boostStart: paidAt.toISOString(), boostEnd: null };
  }

  if (tier === 'gold') {
    const { y, m, d, h, min } = getZonedParts(paidAt, GOLD_TIMEZONE);
    const minutesSinceMidnight = h * 60 + min;
    const sevenPm = 19 * 60;
    const elevenPm = 23 * 60;

    let boostStart: Date;
    let boostEnd: Date;

    if (minutesSinceMidnight < sevenPm) {
      boostStart = zonedWallClockToUtc(y, m, d, 19, 0, GOLD_TIMEZONE);
      boostEnd = zonedWallClockToUtc(y, m, d, 23, 0, GOLD_TIMEZONE);
    } else if (minutesSinceMidnight >= elevenPm) {
      const nd = nextDublinYmdAfter(paidAt);
      boostStart = zonedWallClockToUtc(nd.y, nd.m, nd.d, 19, 0, GOLD_TIMEZONE);
      boostEnd = zonedWallClockToUtc(nd.y, nd.m, nd.d, 23, 0, GOLD_TIMEZONE);
    } else {
      boostStart = new Date(paidAt.getTime());
      boostEnd = zonedWallClockToUtc(y, m, d, 23, 0, GOLD_TIMEZONE);
    }

    return { boostStart: boostStart.toISOString(), boostEnd: boostEnd.toISOString() };
  }

  const end = new Date(paidAt);
  end.setHours(end.getHours() + 24);
  return { boostStart: paidAt.toISOString(), boostEnd: end.toISOString() };
}

export function boostOverlapsWindow(
  boostStart: string | null | undefined,
  boostEnd: string | null | undefined,
  windowStart: string,
  windowEnd: string | null,
): boolean {
  if (!boostStart) return false;
  const bs = new Date(boostStart).getTime();
  const be = boostEnd ? new Date(boostEnd).getTime() : Number.POSITIVE_INFINITY;
  const ws = new Date(windowStart).getTime();
  const we = windowEnd ? new Date(windowEnd).getTime() : Number.POSITIVE_INFINITY;
  return bs < we && be > ws;
}

export interface BoostWindowRow {
  boost_type: string;
  boost_start_time: string | null;
  boost_end_time: string | null;
}

export function countBoostsInActivationWindow(
  boosts: BoostWindowRow[],
  boostType: string,
  referenceDate = new Date(),
): number {
  const tier = boostType.trim().toLowerCase();
  const { boostStart, boostEnd } = getBoostActivationWindow(tier, referenceDate);
  return boosts.filter(
    (b) =>
      (b.boost_type || '').toLowerCase() === tier &&
      boostOverlapsWindow(b.boost_start_time, b.boost_end_time, boostStart, boostEnd),
  ).length;
}

export function isBoostLiveNow(
  boostType: string,
  boostStart: string | null | undefined,
  boostEnd: string | null | undefined,
  now = new Date(),
): boolean {
  if (!boostStart) return false;

  const nowMs = now.getTime();
  if (new Date(boostStart).getTime() > nowMs) return false;

  const tier = (boostType || '').trim().toLowerCase();
  if (tier === 'gold') {
    if (!boostEnd) return false;
    return new Date(boostEnd).getTime() > nowMs;
  }

  if (tier === 'standard') {
    return !boostEnd || new Date(boostEnd).getTime() > nowMs;
  }

  if (!boostEnd) return false;
  return new Date(boostEnd).getTime() > nowMs;
}

export function formatGoldBoostScheduleMessage(referenceDate = new Date()): string {
  const { boostStart, boostEnd } = getBoostActivationWindow('gold', referenceDate);
  const start = new Date(boostStart);
  const dublinOpts: Intl.DateTimeFormatOptions = {
    timeZone: GOLD_TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  };
  const endLabel = boostEnd
    ? new Date(boostEnd).toLocaleString('en-IE', dublinOpts)
    : '11:00 PM';

  if (start.getTime() <= referenceDate.getTime() + 60_000) {
    return `Your Gold Boost goes live immediately and runs until ${endLabel} (Irish time) tonight.`;
  }

  return `Your Gold Boost is scheduled for ${start.toLocaleString('en-IE', dublinOpts)} and runs until ${endLabel} that evening (Irish time).`;
}

export function formatBoostScheduleMessage(boostType: string, referenceDate = new Date()): string {
  const tier = (boostType || '').trim().toLowerCase();
  if (tier === 'gold') return formatGoldBoostScheduleMessage(referenceDate);
  if (tier === 'standard') {
    return 'Your Standard Boost goes live immediately after payment and stays active until bumped by newer boosts.';
  }
  return 'Your boost goes live immediately after payment and runs for 24 hours.';
}
