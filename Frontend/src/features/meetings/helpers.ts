/**
 * Shared types, constants and helpers used across the meeting feature.
 * Module-level (no React, no i18n runtime deps that prevent code-splitting).
 */

/** Status set used by both the card and the edit modal. */
export type LocalMeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/** Phase filter used by the list view. */
export type PhaseFilter = 'ALL' | 'UPCOMING' | 'ONGOING' | 'ENDED';

/** View-mode toggle in the list header. */
export type DisplayView = 'list' | 'calendar';

/** Tailwind class map for each meeting status badge. */
export const STATUS_VARIANTS: Record<string, string> = {
  SCHEDULED: 'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};

/** Format an ISO timestamp as a locale-friendly "Mon, Jan 5, 09:30" string. */
export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Map meeting status -> i18n label.
 * Module-level (takes `t` as a parameter) so it can be reused by
 * any component without a shared React context.
 */
export function getStatusLabel(status: string, t: (key: string) => string) {
  const s = status.toLowerCase();
  const map: Record<string, string> = {
    scheduled: t('scheduled'),
    in_progress: t('in_progress'),
    completed: t('completed'),
    cancelled: t('cancelled'),
  };
  return map[s] ?? status;
}
