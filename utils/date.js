import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isYesterday,
  isToday,
  addDays,
  addWeeks,
  addMonths,
  differenceInCalendarDays,
  subMonths,
} from 'date-fns';

export const toISO = (d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

export const safeParse = (d) => {
  if (!d) return new Date();
  if (d instanceof Date) return d;
  const parsed = parseISO(d);
  return isValid(parsed) ? parsed : new Date(d);
};

export const fmt = (d, pattern = 'MMM d, yyyy') => format(safeParse(d), pattern);

export const fmtTime = (d) => format(safeParse(d), 'h:mm a');

export const fmtMonth = (d) => format(safeParse(d), 'MMMM yyyy');

export const fmtMonthShort = (d) => format(safeParse(d), 'MMM yyyy');

export const fmtRelative = (d) => {
  const date = safeParse(d);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
};

export const monthRange = (d = new Date()) => {
  const date = safeParse(d);
  return { start: startOfMonth(date), end: endOfMonth(date) };
};

export const dayRange = (d) => {
  const date = safeParse(d);
  return { start: startOfDay(date), end: endOfDay(date) };
};

export const weekRange = (d = new Date()) => {
  const date = safeParse(d);
  return { start: startOfWeek(date), end: endOfWeek(date) };
};

export const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

export const advanceRecurring = (date, frequency) => {
  const d = safeParse(date);
  if (frequency === 'daily') return addDays(d, 1);
  if (frequency === 'weekly') return addWeeks(d, 1);
  if (frequency === 'monthly') return addMonths(d, 1);
  return addMonths(d, 1);
};

export {
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isToday,
  isYesterday,
  addDays,
  addWeeks,
  addMonths,
  subMonths,
  differenceInCalendarDays,
  format,
};
