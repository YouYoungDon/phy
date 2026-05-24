import { Expense } from '../types';
import { getLocalDateString } from '../utils/date';

export type TimeOfDayTint = {
  color: string;
  opacity: number;
};

export function getTimeOfDayTint(hour: number): TimeOfDayTint | null {
  if (hour >= 5 && hour < 7)   return { color: '#C8D4E8', opacity: 0.07 };
  if (hour >= 7 && hour < 12)  return null;
  if (hour >= 12 && hour < 17) return { color: '#F5E8C0', opacity: 0.08 };
  if (hour >= 17 && hour < 21) return { color: '#E8C070', opacity: 0.09 };
  return { color: '#2A3048', opacity: 0.10 };
}

export function getWarmthOpacity(recordedDaysCount: number): number {
  if (recordedDaysCount <= 0) return 0;
  return Math.min(Math.sqrt(recordedDaysCount / 90) * 0.06, 0.06);
}

// ─── Calm-day atmosphere brightening ────────────────────────────────────────
//
// Days where the user recorded but the daily total stayed low are "calm days".
// Several calm days in a recent window cause a soft, warm-white film to settle
// over the room — *not* a new object, *not* a counter, *not* an unlock. The
// room simply reads a little lighter, like a window opened.
//
// Definition: a calm day is a local calendar date where recorded spending is
// strictly less than CALM_DAILY_THRESHOLD. Days with no records don't count
// (absence is not a calm day; absence is neutral).
//
// The brightening is graduated and small — opacity steps by 0.005 per calm
// day, capped at 0.04. Strictly less than the warmth ceiling (0.06) so calm
// never overpowers the warmth accumulation it sits on top of.

export const CALM_DAILY_THRESHOLD = 10000;   // KRW per day
export const CALM_WINDOW_DAYS = 14;
export const CALM_PER_DAY_OPACITY = 0.005;
export const CALM_MAX_OPACITY = 0.04;
export const CALM_OVERLAY_COLOR = '#FFF5E6'; // warm white — never cool

/**
 * Pure. Returns the count of local calendar days within the last `windowDays`
 * (anchored at `today`) where the user recorded but the daily SPENDING total
 * stayed strictly below `dailyThreshold`. Days with no records are NOT counted.
 *
 * Income records are excluded from the daily total — a large salary deposit
 * does not invalidate a low-spending day, and an income-only day with no
 * spending does not count as a calm day. Aligns with the decoupling rule in
 * `feedback_sobagi_decoupled_signals.md` and sub-spec C §7.
 */
export function computeCalmDayCount(
  expenses: Expense[],
  today: string,
  windowDays: number = CALM_WINDOW_DAYS,
  dailyThreshold: number = CALM_DAILY_THRESHOLD,
): number {
  const todayMs = new Date(today + 'T12:00:00').getTime();
  const cutoffMs = todayMs - windowDays * 24 * 60 * 60 * 1000;

  const totalsByDay = new Map<string, number>();
  for (const e of expenses) {
    if (e.kind === 'income') continue;
    const ts = new Date(e.createdAt).getTime();
    if (ts < cutoffMs || ts > todayMs + 24 * 60 * 60 * 1000) continue;
    const day = getLocalDateString(new Date(e.createdAt));
    totalsByDay.set(day, (totalsByDay.get(day) ?? 0) + e.amount);
  }

  let count = 0;
  for (const total of totalsByDay.values()) {
    if (total > 0 && total < dailyThreshold) count++;
  }
  return count;
}

/**
 * Pure. Returns the calm-atmosphere overlay opacity given the current
 * expenses snapshot. Graduated and capped — never exceeds CALM_MAX_OPACITY.
 * Returns 0 when there are no qualifying calm days.
 */
export function getCalmAtmosphereOpacity(
  expenses: Expense[],
  today: string,
): number {
  const count = computeCalmDayCount(expenses, today);
  return Math.min(CALM_MAX_OPACITY, count * CALM_PER_DAY_OPACITY);
}

// ─── Rest-warmth nudge ──────────────────────────────────────────────────────
//
// A small warm overlay that appears immediately after a rest watch and fades
// over 60 minutes. Composes additively with the existing warmth/calm overlays
// — never replaces them. The 60-minute window persists across app reloads via
// the stored `lastRestAt`.

export const REST_WARMTH_MAX_OPACITY = 0.08;
export const REST_WARMTH_FADE_MINUTES = 60;

/**
 * Pure. Returns the rest-warmth overlay opacity given the current moment and
 * the ISO timestamp of the most recent rest. Returns 0 when no rest has
 * happened, the timestamp is in the future, or the 60-minute fade window has
 * closed. Linear fade from REST_WARMTH_MAX_OPACITY (0.08) to 0.
 */
export function getRestWarmthOpacity(now: Date, lastRestAtISO: string | null): number {
  if (lastRestAtISO === null) return 0;
  const minsSince = (now.getTime() - Date.parse(lastRestAtISO)) / 60_000;
  if (minsSince < 0 || minsSince >= REST_WARMTH_FADE_MINUTES) return 0;
  return REST_WARMTH_MAX_OPACITY * (1 - minsSince / REST_WARMTH_FADE_MINUTES);
}
