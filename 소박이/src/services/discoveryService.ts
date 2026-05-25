import { ALL_BAG_ITEMS } from '../constants/bagItems';
import { FINDABLE_ITEMS } from '../constants/findableItems';
import { OBJECT_LINES } from '../constants/ambientDialogue';

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

// The quiet line shown when a kept item is tapped in the bag. Prefers a specific
// ambient object line (observational — "오늘 물 줬어요 🌱"), then the catalog
// item's own note, then a found trinket's find line, then a gentle default.
// Observational, never ownership/collection praise.
export function keepsakeLineFor(itemId: string, rng: () => number = Math.random): string {
  const objectLines = OBJECT_LINES[itemId];
  if (objectLines && objectLines.length > 0) {
    const picked = objectLines[Math.floor(rng() * objectLines.length)] ?? objectLines[0];
    if (picked) return picked.text;
  }
  const catalogItem = ALL_BAG_ITEMS.find((i) => i.id === itemId);
  if (catalogItem) return catalogItem.desc;
  const trinket = FINDABLE_ITEMS.find((f) => f.id === itemId);
  if (trinket) return trinket.findLine;
  return '여기 잘 간직하고 있어요 🌿';
}
