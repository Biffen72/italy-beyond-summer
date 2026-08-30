// A request sitting untouched this long needs a human look, whether
// that's "propose an alternative supplier" or just "check in with the
// agency" — used to flag stale pending requests across the admin pages.
export const STALE_REQUEST_DAYS = 3;

export function daysSince(dateStr: string): number {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function daysAgoLabel(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}
