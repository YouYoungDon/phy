import { SobagiEmotion } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import * as storageService from './storageService';
import { getLocalDateString } from '../utils/date';
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

// ─── I/O entry points (called from useAppInit) ───────────────────────────────

/**
 * Called on every app open. Auto-settles any pending item whose window has
 * passed (silent — no UI), otherwise checks for new placement triggers.
 * `promptOnPlace: true` items are routed through pending → auto-settle so
 * they appear between sessions, not during the one that triggered them.
 */
export async function checkForPlacement(
  lastEmotion: SobagiEmotion,
  recordedDaysCount: number,
  prevVisitDate: string | null,
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

  // Step 3: check for new placement
  const placements = (await storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS)) ?? [];
  const placedItemIds = new Set(placements.map((p) => p.itemId));
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

