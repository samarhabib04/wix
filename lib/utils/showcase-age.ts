import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';

/** Inclusive calendar-day window for Showcase (4–6 weeks old). */
export const SHOWCASE_MIN_AGE_DAYS = 28;
export const SHOWCASE_MAX_AGE_DAYS = 42;
/**
 * TEMPORARY TEST MODE:
 * Showcase expires this many minutes after creation (instead of 4-6 week DOB window).
 * Set to `null` to restore normal DOB-based behavior.
 */


function toDay(d: Date | string): Date {
  return startOfDay(typeof d === 'string' ? parseISO(d) : d);
}

/** Calendar age in whole days from date of birth to `now` (same basis as DOB picker). */
export function getShowcasePuppyAgeCalendarDays(
  dateOfBirth: string | Date,
  now: Date = new Date()
): number {
  return differenceInCalendarDays(startOfDay(now), toDay(dateOfBirth));
}

/** True when the puppy is outside the Showcase age window (not 4–6 weeks). */
export function isShowcasePuppyAgeExpired(
  dateOfBirth: string | Date | null | undefined,
  createdAt?: string | Date | null,
  now: Date = new Date()
): boolean {
  

  if (dateOfBirth == null || dateOfBirth === '') return true;
  const age = getShowcasePuppyAgeCalendarDays(dateOfBirth, now);
  return age < SHOWCASE_MIN_AGE_DAYS || age > SHOWCASE_MAX_AGE_DAYS;
}

/**
 * True when the puppy is eligible for Showcase (4–6 weeks inclusive).
 * Must NOT use {@link isShowcasePuppyAgeExpired} with null `createdAt` while test mode is on — that path
 * incorrectly treats every DOB as “in window” (calendar would allow future dates).
 */
export function isShowcasePuppyAgeInWindow(
  dateOfBirth: string | Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (dateOfBirth == null || dateOfBirth === '') return false;
  const age = getShowcasePuppyAgeCalendarDays(dateOfBirth, now);
  if (age < 0) return false;
  return age >= SHOWCASE_MIN_AGE_DAYS && age <= SHOWCASE_MAX_AGE_DAYS;
}

/** True when a showcase row should not be shown publicly (DB flag or outside 4–6 week window). */
export function isShowcaseListingExpired(listing: {
  is_expired?: boolean | null;
  date_of_birth?: string | Date | null;
  created_at?: string | Date | null;
}): boolean {
  return (
    listing.is_expired === true ||
    isShowcasePuppyAgeExpired(listing.date_of_birth, listing.created_at)
  );
}
