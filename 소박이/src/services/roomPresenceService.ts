import { SobagiEmotion, Expense, ExpenseCategory } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import * as storageService from './storageService';
import { getLocalDateString, expenseLocalDate } from '../utils/date';
import {
  BagItem,
  RoomPlacement,
  PendingPlacement,
  ALL_BAG_ITEMS,
} from '../constants/bagItems';

// ─── Pure functions (exported for testing) ───────────────────────────────────

export function isDriftPhase(placementCount: number, recordedDaysCount: number): boolean {
  return placementCount >= 5 || recordedDaysCount >= 45;
}

/** Returns a random settle window: 3, 4, or 5 days. */
export function randomSettleAfter(): number {
  return 3 + Math.floor(Math.random() * 3);
}

function calendarDaysBetween(laterStr: string, earlierStr: string): number {
  const later = new Date(laterStr + 'T12:00:00');
  const earlier = new Date(earlierStr + 'T12:00:00');
  return Math.round((later.getTime() - earlier.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns items that are unlocked, not yet placed, and have been in the bag
 * long enough. Pass jitter=0 in tests for exact threshold behaviour.
 */
export function pickEligibleItems(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  recordedDaysCount: number,
  jitter = Math.floor(Math.random() * 5) - 2,
): BagItem[] {
  return items.filter((item) => {
    if (!item.roomPresence) return false;
    if (placedItemIds.has(item.id)) return false;
    const daysInBag = recordedDaysCount - item.minDays;
    if (daysInBag < 0) return false;
    const threshold = Math.max(0, item.roomPresence.minDaysInBag + jitter);
    return daysInBag >= threshold;
  });
}

export type PlacementCandidate = { item: BagItem; path: 'B' | 'A' };

/**
 * Picks one candidate from eligible items.
 * Path B (emotion match) takes priority; Path A (return gap) is the fallback.
 * Returns null if no trigger fires.
 */
export function selectCandidate(
  eligibleItems: BagItem[],
  lastEmotion: SobagiEmotion,
  hasReturnGap: boolean,
): PlacementCandidate | null {
  const bMatch = eligibleItems.find((item) =>
    item.roomPresence?.emotionAffinity?.includes(lastEmotion),
  );
  if (bMatch) return { item: bMatch, path: 'B' };

  if (hasReturnGap) {
    const aMatch = eligibleItems.find((item) => !item.roomPresence?.emotionAffinity);
    if (aMatch) return { item: aMatch, path: 'A' };
  }

  return null;
}

export function shouldAutoSettle(
  pending: PendingPlacement | null,
  today: string,
): boolean {
  if (!pending) return false;
  return calendarDaysBetween(today, pending.pendingFrom) >= pending.settleAfter;
}

// ─── Implicit accumulation: category-pattern path ────────────────────────────
//
// Pattern-triggered presences are not rewards.
// They are quiet traces of repeated behaviour.
//
// The user does not earn these by hitting a number. The mug doesn't say
// "you reached 3 cafes!" — it just shows up in the room one day, after a
// habit has already formed. The signal must require recurrence (not a one-day
// burst) so that the trace honestly reflects "this is something you do",
// not "this is something you did once".
//
// Gates we deliberately keep:
//   - Recurrence (minDistinctDays) prevents single-day spending sprees from
//     triggering. "Three cafes in one day" is data, not a habit.
//   - Look-back window (windowDays) keeps the trace recent — a long-dormant
//     habit shouldn't surface a presence today.
//   - Already-placed exclusion ensures each pattern only deposits its trace
//     once. The room absorbs the habit; it doesn't keep announcing it.
//   - One-action-per-session (enforced in checkForPlacement) keeps the room
//     from filling on any single app open.
//
// Gates we deliberately don't apply:
//   - minDays / minDaysInBag: the behavioural pattern IS the eligibility gate.
//     A daily cafe-goer earns the mug on day 9, not day 55.
//   - Drift relabelling: P-path placements are already silent and don't go
//     through pending, so the C-relabel that drift applies to B/A is moot.
//

export interface CategoryPatternOpts {
  minCount: number;        // total matching records within the window
  minDistinctDays: number; // recurrence — pattern means "shows up on multiple days"
  windowDays: number;      // look back this many days from `today`
}

/**
 * Pure. Returns true when the user has a behavioural pattern for `category`
 * within `windowDays` of `today`: at least `minCount` records spread across
 * at least `minDistinctDays` distinct local calendar days. The recurrence
 * gate prevents a single-day spree from triggering as a "habit".
 */
export function hasCategoryPattern(
  expenses: Expense[],
  category: ExpenseCategory,
  opts: CategoryPatternOpts,
  today: string,
): boolean {
  const todayMs = new Date(today + 'T12:00:00').getTime();
  const cutoffMs = todayMs - opts.windowDays * 24 * 60 * 60 * 1000;
  const matching = expenses.filter((e) => {
    if (e.category !== category) return false;
    const ts = new Date(e.createdAt).getTime();
    return ts >= cutoffMs && ts <= todayMs + 24 * 60 * 60 * 1000;
  });
  if (matching.length < opts.minCount) return false;
  const distinctDays = new Set(
    matching.map((e) => expenseLocalDate(e)),
  );
  return distinctDays.size >= opts.minDistinctDays;
}

/**
 * Pure. Returns items that carry a `categoryAffinity` for `category`, have a
 * roomPresence definition, and are not yet placed. Unlike `pickEligibleItems`,
 * this bypasses `minDays` and `minDaysInBag` — the user's behavioural pattern
 * is the gate, not bag dwell time.
 */
export function pickCategoryEligibleItems(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  category: ExpenseCategory,
): BagItem[] {
  return items.filter((item) => {
    if (!item.roomPresence) return false;
    if (placedItemIds.has(item.id)) return false;
    if (!item.categoryAffinity?.includes(category)) return false;
    return true;
  });
}

/**
 * Pure composition. If the pattern fires for `category` and an eligible item
 * exists, returns the first one. Otherwise null.
 */
export function selectCategoryCandidate(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  category: ExpenseCategory,
  expenses: Expense[],
  opts: CategoryPatternOpts,
  today: string,
): BagItem | null {
  if (!hasCategoryPattern(expenses, category, opts, today)) return null;
  return pickCategoryEligibleItems(items, placedItemIds, category)[0] ?? null;
}

// Triggers config. Keep this small — one trigger at a time as a proof-of-feel
// until the implicit-accumulation pattern is proven across multiple categories.
//
// Cafe → 머그컵: 3 records across 3 distinct days within 14 days.
//   - 3 records: enough to suggest preference, not enough to feel arbitrary
//   - 3 distinct days: recurrence — rules out a single-day spree
//   - 14 days: recent enough that "this is something you do *now*"
// Adjusting these later is fine; the test suite asserts the relationship
// (recurrence beats raw count), not the specific numbers.
const CATEGORY_TRIGGERS: ReadonlyArray<{
  category: ExpenseCategory;
  opts: CategoryPatternOpts;
}> = [
  { category: 'cafe', opts: { minCount: 3, minDistinctDays: 3, windowDays: 14 } },
];

// ─── Implicit accumulation: recording-streak path ───────────────────────────
//
// Same philosophy as the category-pattern path — *quiet trace of repeated
// behaviour, not a reward*. The streak path detects consecutive days of
// presence (recording at least one expense per day) and lets items declare
// at what streak they want to surface via `streakAffinity.minStreak`.
//
// "Consecutive" is forgiving: a streak counted as ending *today or yesterday*
// is still alive. This honours Sobagi's tone ("absence is never failure") —
// missing today doesn't immediately collapse a week of presence. Two-day
// silence does collapse it, which is the right floor.
//
// Per-item threshold (vs. the global cafe config) lets future streak items
// settle at their own pace — e.g. 식물 at 7, something later at 30.

/**
 * Pure. Returns the current consecutive-recording-day count ending at
 * `today` or `today - 1`. A gap of two or more days from `today` yields 0.
 */
export function computeRecordingStreak(expenses: Expense[], today: string): number {
  if (expenses.length === 0) return 0;

  const dates = new Set(
    expenses.map((e) => expenseLocalDate(e)),
  );

  const previousLocalDate = (dateStr: string): string => {
    const d = new Date(dateStr + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  };

  // Anchor the streak to today if it has a record; otherwise yesterday (grace
  // day). A gap of two days from today means the streak is broken.
  let cursor = today;
  if (!dates.has(cursor)) {
    cursor = previousLocalDate(cursor);
    if (!dates.has(cursor)) return 0;
  }

  let count = 0;
  while (dates.has(cursor)) {
    count++;
    cursor = previousLocalDate(cursor);
  }
  return count;
}

/**
 * Pure. Returns items whose `streakAffinity.minStreak` is met by `streak`,
 * that have a roomPresence definition, and that aren't already placed.
 * Bypasses minDays / minDaysInBag — the streak is the gate.
 */
export function pickStreakEligibleItems(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  streak: number,
): BagItem[] {
  return items.filter((item) => {
    if (!item.roomPresence) return false;
    if (placedItemIds.has(item.id)) return false;
    if (!item.streakAffinity) return false;
    return streak >= item.streakAffinity.minStreak;
  });
}

/**
 * Pure composition. Returns the first eligible item if the user's current
 * streak meets any item's `streakAffinity.minStreak`. Otherwise null.
 */
export function selectStreakCandidate(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  expenses: Expense[],
  today: string,
): BagItem | null {
  const streak = computeRecordingStreak(expenses, today);
  return pickStreakEligibleItems(items, placedItemIds, streak)[0] ?? null;
}

// ─── Implicit accumulation: night-activity path ─────────────────────────────
//
// Same shape as the category-pattern path (recurrence-gated, recent-window-
// bounded), but the filter is *when* a record was made rather than its
// category. Across multiple distinct nights, the room absorbs a warm light.
//
// The night window can wrap midnight — a 19:00–04:00 window covers evening
// through early morning. Hours are compared on the record's local clock.
// Calendar-day distinctness is used for the "different nights" gate; a single
// hangout that crosses midnight will count as two distinct days, which is the
// honest reading (the user opened the app twice across local dates).

export interface NightPatternOpts {
  startHour: number;       // inclusive, 0–23
  endHour: number;         // exclusive, 0–23. May be <= startHour (wraps midnight).
  minCount: number;
  minDistinctDays: number;
  windowDays: number;
}

/**
 * Pure. True when `hour` falls inside the (possibly midnight-wrapping)
 * window `[startHour, endHour)`.
 */
export function isNightHour(hour: number, startHour: number, endHour: number): boolean {
  if (startHour < endHour) return hour >= startHour && hour < endHour;
  return hour >= startHour || hour < endHour;
}

/**
 * Pure. Returns true when the user has recorded enough times during the
 * night window across enough distinct days within `windowDays` of `today`.
 * Same recurrence gate as the category path: one all-nighter is data, a
 * habit is multiple nights.
 */
export function hasNightPattern(
  expenses: Expense[],
  opts: NightPatternOpts,
  today: string,
): boolean {
  // Night pattern reads user-presence at night. Income records (e.g., salary deposits
  // timestamped late) are system events, not late-night user activity. Sub-spec C §7.
  const spendingExpenses = expenses.filter((e) => e.kind !== 'income');
  const todayMs = new Date(today + 'T12:00:00').getTime();
  const cutoffMs = todayMs - opts.windowDays * 24 * 60 * 60 * 1000;
  const matching = spendingExpenses.filter((e) => {
    const d = new Date(e.createdAt);
    const ts = d.getTime();
    if (ts < cutoffMs || ts > todayMs + 24 * 60 * 60 * 1000) return false;
    return isNightHour(d.getHours(), opts.startHour, opts.endHour);
  });
  if (matching.length < opts.minCount) return false;
  const distinctDays = new Set(
    matching.map((e) => expenseLocalDate(e)),
  );
  return distinctDays.size >= opts.minDistinctDays;
}

/**
 * Pure. Returns items flagged with `nightAffinity: true` that have a
 * roomPresence definition and aren't already placed. Like the other
 * implicit paths, bypasses minDays / minDaysInBag.
 */
export function pickNightEligibleItems(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
): BagItem[] {
  return items.filter((item) => {
    if (!item.roomPresence) return false;
    if (placedItemIds.has(item.id)) return false;
    return item.nightAffinity === true;
  });
}

/**
 * Pure composition. If the night pattern fires for `opts` and an eligible
 * item exists, returns the first one. Otherwise null.
 */
export function selectNightCandidate(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  expenses: Expense[],
  opts: NightPatternOpts,
  today: string,
): BagItem | null {
  if (!hasNightPattern(expenses, opts, today)) return null;
  return pickNightEligibleItems(items, placedItemIds)[0] ?? null;
}

// Night trigger config. Single source of truth — items just flag
// `nightAffinity: true` and the window/threshold are decided here.
//
// 19:00–04:00 covers evening through pre-dawn. 3 records across 3 distinct
// nights within 14 days mirrors the cafe pattern's recurrence floor: a
// single late hangout doesn't fire the trigger; a habit does.
const NIGHT_TRIGGER: NightPatternOpts = {
  startHour: 19,
  endHour: 4,
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
};

// ─── I/O entry points (called from useAppInit) ───────────────────────────────

/**
 * Called on every app open. Auto-settles any pending item whose window has
 * passed (silent — no UI), then evaluates triggers in order:
 *   1. Category-pattern (P): user behaviour signals a habit — place silently.
 *   2. Emotion-match (B) / return-gap (A): existing implicit paths.
 *
 * `promptOnPlace: true` items in the B/A path are routed through pending →
 * auto-settle so they appear between sessions. The P path always places
 * directly — the pattern is the delay.
 */
export async function checkForPlacement(
  lastEmotion: SobagiEmotion,
  recordedDaysCount: number,
  prevVisitDate: string | null,
  expenses: Expense[] = [],
): Promise<void> {
  const today = getLocalDateString(new Date());

  // Step 1: auto-settle 나중에 items
  const pending = await storageService.load<PendingPlacement>(STORAGE_KEYS.PENDING_PLACEMENT);
  if (shouldAutoSettle(pending ?? null, today)) {
    const placements = (await storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS)) ?? [];
    if (pending) {
      const item = ALL_BAG_ITEMS.find((i) => i.id === pending.itemId);
      const zone = item?.roomPresence?.zones[0];
      if (zone) {
        const newPlacement: RoomPlacement = {
          itemId: pending.itemId,
          zone,
          placedAt: today,
          placementPath: 'C',
        };
        await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, [...placements, newPlacement]);
      }
    }
    await storageService.save(STORAGE_KEYS.PENDING_PLACEMENT, null);
    return; // one action per session
  }

  // Step 2: skip if a placement is already pending — wait for its settle window
  if (pending != null) return;

  // Step 3: category-pattern path. Fires before B/A so a habit signal wins
  // over a same-session emotion match. Always places directly, never queued.
  const placements = (await storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS)) ?? [];
  const placedItemIds = new Set(placements.map((p) => p.itemId));

  for (const trigger of CATEGORY_TRIGGERS) {
    const item = selectCategoryCandidate(
      ALL_BAG_ITEMS, placedItemIds, trigger.category, expenses, trigger.opts, today,
    );
    if (item) {
      const zone = item.roomPresence!.zones[0]!;
      const newPlacement: RoomPlacement = {
        itemId: item.id,
        zone,
        placedAt: today,
        placementPath: 'P',
      };
      await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, [...placements, newPlacement]);
      return; // one action per session
    }
  }

  // Step 3b: streak path. Fires after category-pattern, before B/A — habits
  // of presence (recording over days) are a quieter signal than category
  // habits, so they get the lower priority within the implicit-accumulation
  // band. Same direct-placement model as P; the streak is the delay.
  const streakItem = selectStreakCandidate(ALL_BAG_ITEMS, placedItemIds, expenses, today);
  if (streakItem) {
    const zone = streakItem.roomPresence!.zones[0]!;
    const newPlacement: RoomPlacement = {
      itemId: streakItem.id,
      zone,
      placedAt: today,
      placementPath: 'S',
    };
    await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, [...placements, newPlacement]);
    return; // one action per session
  }

  // Step 3c: night-activity path. Same model as P/S — direct placement,
  // recurrence gate. Sits after streak because it's a more specific time-of-day
  // habit; if the room is going to absorb only one trace this session, prefer
  // the more general "user is here" signals first.
  const nightItem = selectNightCandidate(ALL_BAG_ITEMS, placedItemIds, expenses, NIGHT_TRIGGER, today);
  if (nightItem) {
    const zone = nightItem.roomPresence!.zones[0]!;
    const newPlacement: RoomPlacement = {
      itemId: nightItem.id,
      zone,
      placedAt: today,
      placementPath: 'L',
    };
    await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, [...placements, newPlacement]);
    return; // one action per session
  }

  // Step 4: emotion / return-gap path (existing)
  const eligibleItems = pickEligibleItems(ALL_BAG_ITEMS, placedItemIds, recordedDaysCount);
  if (eligibleItems.length === 0) return;

  const hasReturnGap =
    prevVisitDate != null && calendarDaysBetween(today, prevVisitDate) >= 1;
  const candidate = selectCandidate(eligibleItems, lastEmotion, hasReturnGap);
  if (!candidate) return;

  const { item, path } = candidate;
  const zone = item.roomPresence!.zones[0]!;
  const inDrift = isDriftPhase(placements.length, recordedDaysCount);

  if (!inDrift && item.roomPresence!.promptOnPlace) {
    const newPending: PendingPlacement = {
      itemId: item.id,
      pendingFrom: today,
      settleAfter: randomSettleAfter(),
    };
    await storageService.save(STORAGE_KEYS.PENDING_PLACEMENT, newPending);
  } else {
    const newPlacement: RoomPlacement = {
      itemId: item.id,
      zone,
      placedAt: today,
      placementPath: inDrift ? 'C' : path,
    };
    await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, [...placements, newPlacement]);
  }
}

