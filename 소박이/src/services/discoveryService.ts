import { ALL_BAG_ITEMS } from '../constants/bagItems';

// Discovery is not a reward queue. It is a gentle arrival queue.
//
// Pure logic for the arrival schedule (minDays cadence preserved), the
// keep transition, and the one-time migration seed. No React, no storage,
// no RN — unit-testable.

// Items newly eligible by time (minDays reached) that aren't already kept or queued.
export function computeTimeArrivals(
  recordedDaysCount: number,
  kept: string[],
  queue: string[],
): string[] {
  const have = new Set([...kept, ...queue]);
  return ALL_BAG_ITEMS
    .filter((i) => i.minDays <= recordedDaysCount && !have.has(i.id))
    .map((i) => i.id);
}

// Append new arrivals to the queue, de-duplicated, order preserved.
export function enqueueArrivals(queue: string[], arrivals: string[]): string[] {
  const out = [...queue];
  for (const id of arrivals) if (!out.includes(id)) out.push(id);
  return out;
}

// Move a specific item from the queue into kept (idempotent).
export function keepItem(
  itemId: string,
  queue: string[],
  kept: string[],
): { queue: string[]; kept: string[] } {
  return {
    queue: queue.filter((id) => id !== itemId),
    kept: kept.includes(itemId) ? kept : [...kept, itemId],
  };
}

// The kept set to seed on first migration: everything the user already has —
// catalog items unlocked by days, items placed in the room, found trinkets.
export function seedKeptForMigration(
  recordedDaysCount: number,
  placedItemIds: string[],
  foundItemIds: string[],
): string[] {
  const unlocked = ALL_BAG_ITEMS
    .filter((i) => i.minDays <= recordedDaysCount)
    .map((i) => i.id);
  return Array.from(new Set([...unlocked, ...placedItemIds, ...foundItemIds]));
}
