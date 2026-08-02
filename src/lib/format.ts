import {
  format,
  isToday,
  isYesterday,
  isThisYear,
  isThisWeek,
  formatDistanceToNow,
  differenceInMinutes,
} from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Format a message timestamp for a bubble, e.g. "8:20 PM". */
export function formatMessageTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'h:mm a');
}

/** Format the last-seen / list timestamp, e.g. "8:20 PM" or "Yesterday". */
export function formatListTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEE');
  if (isThisYear(d)) return format(d, 'MMM d');
  return format(d, 'MM/d/yy');
}

/** Date divider label between message groups. */
export function formatDateDivider(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  if (isThisWeek(d)) return format(d, 'EEEE');
  return format(d, 'MMMM d, yyyy');
}

/** Whether two dates fall on the same calendar day. */
export function isSameDay(a: string | Date, b: string | Date): boolean {
  const da = typeof a === 'string' ? new Date(a) : a;
  const db = typeof b === 'string' ? new Date(b) : b;
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** "online" | "last seen today at 8:20 PM" | "last seen recently". */
export function formatPresence(
  isOnline: boolean,
  lastSeen: string | null | undefined,
  visible: boolean = true
): string {
  if (isOnline) return 'online';
  if (!lastSeen || !visible) return 'offline';
  const d = new Date(lastSeen);
  const mins = differenceInMinutes(new Date(), d);
  if (mins < 1) return 'last seen just now';
  if (mins < 60) return `last seen ${formatDistanceToNow(d, { addSuffix: false })} ago`;
  if (isToday(d)) return `last seen today at ${format(d, 'h:mm a')}`;
  if (isYesterday(d)) return `last seen yesterday at ${format(d, 'h:mm a')}`;
  if (isThisWeek(d)) return `last seen ${format(d, 'EEEE')} at ${format(d, 'h:mm a')}`;
  return `last seen ${format(d, 'MMM d')}`;
}

/** Relative time for notifications, e.g. "2h ago". */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export { toZonedTime, fromZonedTime };
