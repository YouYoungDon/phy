// Pure logic for the rest interaction. No React, no SDK, no storage.
// The orchestrator `grantRest()` lives in this file too (Task 11) but is
// only ever called from the `userEarnedReward` callback path — see the
// boundary comment on grantRest itself.

export const PEBBLE_MIN = 5;
export const PEBBLE_MAX = 20;
export const REST_DAILY_CAP = 2;

/** Inclusive integer in [PEBBLE_MIN, PEBBLE_MAX]. */
export function computePebbleDelta(): number {
  const range = PEBBLE_MAX - PEBBLE_MIN + 1;
  return PEBBLE_MIN + Math.floor(Math.random() * range);
}

/**
 * Returns the threshold items whose `triggerPebbles` was crossed by moving
 * from `oldCount` to `newCount`. An item is "crossed" when
 * `oldCount < triggerPebbles <= newCount`. Result preserves input order.
 */
export function findCrossedLetterThresholds<T extends { triggerPebbles: number }>(
  items: readonly T[],
  oldCount: number,
  newCount: number,
): T[] {
  return items.filter((l) => l.triggerPebbles > oldCount && l.triggerPebbles <= newCount);
}

/**
 * Daily-reset-aware view of `restsToday`. Returns 0 if `lastRestDate` is null
 * or doesn't match `todayStr`; otherwise returns the stored value. This is
 * the value the UI should consult — never trust the raw store field alone.
 */
export function getEffectiveRestsToday(
  storedRestsToday: number,
  lastRestDate: string | null,
  todayStr: string,
): number {
  if (lastRestDate === null || lastRestDate !== todayStr) return 0;
  return storedRestsToday;
}

/**
 * True when the user may take another rest today. Uses
 * `getEffectiveRestsToday` so day rollovers don't require a separate reset.
 */
export function canRest(
  storedRestsToday: number,
  lastRestDate: string | null,
  todayStr: string,
): boolean {
  return getEffectiveRestsToday(storedRestsToday, lastRestDate, todayStr) < REST_DAILY_CAP;
}
