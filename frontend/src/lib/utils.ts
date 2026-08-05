import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class strings safely — dedupes conflicting utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Turn "researching" → "Researching". */
export function titleCase(s: string): string {
  return s.replace(/(^|[\s-_])([a-z])/g, (_, sep, c) => sep + c.toUpperCase()).replace(/[-_]/g, ' ');
}

/** Truncate a string to n chars with a trailing ellipsis. */
export function truncate(s: string | undefined, n: number): string {
  if (!s) return '';
  return s.length <= n ? s : s.slice(0, n).trimEnd() + '…';
}

/** Clamp a number to a range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Format an ISO date as e.g. "3 hours ago" / "Mar 14". */
export function timeAgo(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - d);
  const min = 60_000;
  const h = 60 * min;
  const day = 24 * h;
  if (diff < min) return 'just now';
  if (diff < h) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / h)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Compact URL host, e.g. "https://arxiv.org/abs/…" → "arxiv.org". */
export function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] ?? '';
  }
}

/** Deterministic hash → hue used for tag chips etc. */
export function hueOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** Format a 0-1 score as a percentage. */
export function pct(v: number | undefined | null): string {
  if (v == null) return '—';
  return `${Math.round(v * 100)}%`;
}

/** Format initials from a name. */
export function initials(name: string | undefined | null): string {
  if (!name) return 'NX';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}
