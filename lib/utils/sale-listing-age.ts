import { differenceInCalendarDays, startOfDay } from 'date-fns';

function toDay(value: string | Date): Date {
  return startOfDay(typeof value === 'string' ? new Date(value) : value);
}

/** Whole weeks since date of birth (calendar days ÷ 7, floored). */
export function getPuppyAgeInWeeks(
  dateOfBirth: string | Date | null | undefined,
  referenceDate: Date = new Date(),
): number | null {
  if (dateOfBirth == null || dateOfBirth === '') return null;

  const dob = toDay(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const days = differenceInCalendarDays(startOfDay(referenceDate), dob);
  if (days < 0) return null;

  return Math.floor(days / 7);
}

/** e.g. "6 weeks", "1 week", "Less than 1 week" */
export function formatPuppyAgeInWeeks(
  dateOfBirth: string | Date | null | undefined,
  referenceDate: Date = new Date(),
): string | null {
  const weeks = getPuppyAgeInWeeks(dateOfBirth, referenceDate);
  if (weeks === null) return null;
  if (weeks === 0) return 'Less than 1 week';
  return weeks === 1 ? '1 week' : `${weeks} weeks`;
}

/** e.g. "31 May 2026" */
export function formatPostedOnDate(
  createdAt: string | Date | null | undefined,
): string | null {
  if (createdAt == null || createdAt === '') return null;

  const posted = new Date(createdAt);
  if (Number.isNaN(posted.getTime())) return null;

  return posted.toLocaleDateString('en-IE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** e.g. "Posted 31 May 2026" */
export function formatPostedOnLabel(
  createdAt: string | Date | null | undefined,
): string | null {
  const date = formatPostedOnDate(createdAt);
  return date ? `Posted ${date}` : null;
}
