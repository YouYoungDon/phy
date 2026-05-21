// Pure logic for the rest interaction. No React, no SDK, no storage at the
// helper layer. The orchestrator `grantRest()` lives in this file too and
// composes the helpers with store writes + storage persistence — it is only
// ever called from the `userEarnedReward` callback path (see the boundary
// comment on grantRest itself).

import { useUserStore } from '../store/userStore';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { REST_LETTERS, RestLetter } from '../constants/restLetters';
import { getLocalDateString } from '../utils/date';

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

export interface RestGrant {
  pebbleDelta: number;
  newCount: number;
  lettersDelivered: RestLetter[];
}

/**
 * CRITICAL BOUNDARY: this function is the only writer of pebble state,
 * `restsToday`, `lastRestDate`, `lastRestAt`, and rest-letter delivery.
 * It MUST be called exclusively from the `userEarnedReward` SDK event
 * callback — never from `dismissed`, never from a button press alone,
 * never from a debug menu. The trust signal that authorises this side
 * effect is the SDK's `userEarnedReward` event.
 *
 * The function itself does not check that boundary (it can't — it has no
 * way to verify the caller). Reviewers enforce it.
 */
export async function grantRest(): Promise<RestGrant> {
  // Snapshot state once. Safe because userEarnedReward is serial — the SDK
  // never fires a second event while this promise is in flight, so the
  // pre-await read of pebbleCount cannot be invalidated by another
  // grantRest mid-flight.
  const store = useUserStore.getState();
  const pebbleDelta = computePebbleDelta();
  const oldCount = store.pebbleCount;
  const newCount = oldCount + pebbleDelta;
  const todayStr = getLocalDateString(new Date());
  const nowISO = new Date().toISOString();

  // Daily-reset-aware: if lastRestDate is stale, restsToday effectively
  // starts at 0 before this watch counts as the first of the new day.
  const effectiveBefore = getEffectiveRestsToday(store.restsToday, store.lastRestDate, todayStr);
  const newRestsToday = effectiveBefore + 1;

  const crossed = findCrossedLetterThresholds(REST_LETTERS, oldCount, newCount);

  // Look up already-delivered letters to avoid duplicate inserts. The
  // mailbox UI does dedupe rendering, but persistence layer should also
  // stay clean — we don't want the list to grow with duplicates.
  const existingDelivered =
    (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];
  const lettersDelivered = crossed.filter((l) => !existingDelivered.includes(l.id));
  const nextDelivered = [...existingDelivered, ...lettersDelivered.map((l) => l.id)];

  store.setPebbleCount(newCount);
  store.setRestsToday(newRestsToday);
  store.setLastRestDate(todayStr);
  store.setLastRestAt(nowISO);

  void storageService.save(STORAGE_KEYS.PEBBLE_COUNT, newCount);
  void storageService.save(STORAGE_KEYS.RESTS_TODAY, newRestsToday);
  void storageService.save(STORAGE_KEYS.LAST_REST_DATE, todayStr);
  void storageService.save(STORAGE_KEYS.LAST_REST_AT, nowISO);
  if (lettersDelivered.length > 0) {
    void storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, nextDelivered);
  }

  // TODO(rest-rare-item): when pebbleCount crosses 500 / 1500 / 3000,
  // deliver a rare ambient item to the room placements. Item pool and
  // delivery shape defined in a separate spec — not in scope.

  return { pebbleDelta, newCount, lettersDelivered };
}
