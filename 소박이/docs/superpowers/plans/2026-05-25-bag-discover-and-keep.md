# Bag "Discover & Keep" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the bag into a keepsake box and the room into a calm one-at-a-time discovery surface: items *arrive* in the room, the user taps to pick them up into the bag, and tapping a kept item is a quiet moment.

**Anchor:** Discovery is not a reward queue. It is a gentle arrival queue.

**Architecture:** A pure `discoveryService.ts` owns the time-arrival schedule + keep transition + migration seeding. New storage: `KEPT_ITEM_IDS`, `DISCOVERY_QUEUE`, `DISCOVERY_MIGRATION_DONE`. The room renders the queue front (tappable); the bag renders kept items. Built in 5 stages; **Stage 1 is fully TDD-coded here**; Stages 2–5 are concrete task specs implemented against live file state (UI/animation iterates better in place), each TDD where logic exists.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess`), Jest 29, Zustand.

**Spec:** `docs/superpowers/specs/2026-05-25-bag-discover-and-keep-design.md`

---

## File Structure
- `src/constants/storage.ts` — 3 new keys.
- `src/services/discoveryService.ts` — **new**, pure: arrivals / keep / migration-seed. No RN imports.
- `__tests__/discoveryService.test.ts` — **new**, unit tests.
- `src/hooks/useAppInit.ts` — run discovery migration + arrival compute during init.
- `src/pages/index.tsx` — room: render queue front (tappable) instead of `roomPlacements`; bag: render kept items; item-tap dialogue; pickup animation.
- `src/services/roomPresenceService.ts` — Stage 2: route pattern/streak/night selections into the queue instead of `ROOM_PLACEMENTS`.
- `src/constants/ambientDialogue.ts` — Stage 4: keepsake/pickup line resolution may reuse `OBJECT_LINES`.

---

## Stage 1 — storage/migration + kept bag model (pure, TDD)

**Files:**
- Modify: `src/constants/storage.ts`
- Create: `src/services/discoveryService.ts`
- Test: `__tests__/discoveryService.test.ts`
- Modify: `src/hooks/useAppInit.ts`

- [ ] **Step 1: Add storage keys**

In `src/constants/storage.ts`, add inside `STORAGE_KEYS` (before the closing `} as const;`):

```ts
  KEPT_ITEM_IDS: 'sobagi-kept-item-ids',
  DISCOVERY_QUEUE: 'sobagi-discovery-queue',
  DISCOVERY_MIGRATION_DONE: 'sobagi-discovery-migration-done',
```

- [ ] **Step 2: Write the failing tests**

Create `__tests__/discoveryService.test.ts`:

```ts
import {
  computeTimeArrivals, enqueueArrivals, keepItem, seedKeptForMigration,
} from '../src/services/discoveryService';
import { ALL_BAG_ITEMS } from '../src/constants/bagItems';

const day0Ids = ALL_BAG_ITEMS.filter((i) => i.minDays === 0).map((i) => i.id);

describe('computeTimeArrivals', () => {
  it('returns items whose minDays <= recordedDaysCount, not already kept/queued', () => {
    const arrivals = computeTimeArrivals(0, [], []);
    expect(arrivals.sort()).toEqual(day0Ids.sort());
  });
  it('excludes kept and queued ids', () => {
    const [first, ...rest] = day0Ids;
    const arrivals = computeTimeArrivals(0, [first!], rest.slice(0, 1));
    expect(arrivals).not.toContain(first);
    expect(arrivals).not.toContain(rest[0]);
  });
  it('includes an item exactly at its minDays boundary', () => {
    const item = ALL_BAG_ITEMS.find((i) => i.minDays === 7);
    expect(computeTimeArrivals(7, [], [])).toContain(item!.id);
    expect(computeTimeArrivals(6, [], [])).not.toContain(item!.id);
  });
});

describe('enqueueArrivals', () => {
  it('appends new ids, de-duplicated, order preserved', () => {
    expect(enqueueArrivals(['a'], ['b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('keepItem', () => {
  it('moves an id from queue to kept', () => {
    expect(keepItem('b', ['a', 'b', 'c'], ['x'])).toEqual({ queue: ['a', 'c'], kept: ['x', 'b'] });
  });
  it('is idempotent if already kept', () => {
    expect(keepItem('x', ['x'], ['x'])).toEqual({ queue: [], kept: ['x'] });
  });
});

describe('seedKeptForMigration', () => {
  it('unions unlocked-by-days + placed + found, de-duplicated', () => {
    const seeded = seedKeptForMigration(7, ['placed1'], ['found1']);
    expect(seeded).toEqual(expect.arrayContaining(['placed1', 'found1']));
    // every catalog item with minDays <= 7 is included
    for (const i of ALL_BAG_ITEMS.filter((x) => x.minDays <= 7)) {
      expect(seeded).toContain(i.id);
    }
    expect(new Set(seeded).size).toBe(seeded.length);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd 소박이; npm test -- discoveryService 2>&1 | Select-String -Pattern "Cannot find module|FAIL|PASS"`
Expected: FAIL — cannot find `../src/services/discoveryService`.

- [ ] **Step 4: Create `src/services/discoveryService.ts`**

```ts
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
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd 소박이; npm test -- discoveryService 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS"`
Expected: PASS — all describe blocks green.

- [ ] **Step 6: Wire migration + arrival compute into init**

In `src/hooks/useAppInit.ts`: add imports

```ts
import { computeTimeArrivals, enqueueArrivals, seedKeptForMigration } from '../services/discoveryService';
import { RoomPlacement } from '../constants/bagItems';
```

Add this function above `useAppInit` (near `getPrevVisitDate`):

```ts
// Seeds the kept/queue model once (migration), then enqueues newly-eligible
// arrivals. Runs silently in Stage 1 — nothing renders the queue yet.
async function runDiscoveryInit(recordedDaysCount: number): Promise<void> {
  const done = await storageService.load<boolean>(STORAGE_KEYS.DISCOVERY_MIGRATION_DONE);
  let kept = (await storageService.load<string[]>(STORAGE_KEYS.KEPT_ITEM_IDS)) ?? [];
  let queue = (await storageService.load<string[]>(STORAGE_KEYS.DISCOVERY_QUEUE)) ?? [];

  if (!done) {
    const placements = (await storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS)) ?? [];
    const found = (await storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS)) ?? [];
    const pending = await storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID);
    kept = seedKeptForMigration(recordedDaysCount, placements.map((p) => p.itemId), found);
    queue = pending ? enqueueArrivals(queue, [pending]) : queue;
    await storageService.save(STORAGE_KEYS.KEPT_ITEM_IDS, kept);
    await storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, queue);
    await storageService.save(STORAGE_KEYS.DISCOVERY_MIGRATION_DONE, true);
    return; // seed before any arrival compute — no re-discovery storm
  }

  const arrivals = computeTimeArrivals(recordedDaysCount, kept, queue);
  if (arrivals.length > 0) {
    await storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, enqueueArrivals(queue, arrivals));
  }
}
```

Call it inside `loadStored`, right after `checkForPlacement(...)` (line ~171):

```ts
        await checkForPlacement(emotion, recomputedDays, prevVisitDate, normalized ?? []);
        await runDiscoveryInit(recomputedDays);
```

- [ ] **Step 7: Typecheck + full Jest**

Run: `cd 소박이; npm run typecheck; npm test -- --no-cache 2>&1 | Select-String -Pattern "Tests:|Test Suites:|FAIL"`
Expected: typecheck exits 0; all suites pass (new discoveryService suite counted). No visible app change yet.

- [ ] **Step 8: Commit**

```bash
git add 소박이/src/constants/storage.ts 소박이/src/services/discoveryService.ts 소박이/__tests__/discoveryService.test.ts 소박이/src/hooks/useAppInit.ts
git commit -m "feat(bag): discovery model + kept storage + migration (stage 1)"
```

---

## Stage 2 — room discovery render + tap to keep

**Files:** `src/pages/index.tsx`, `src/services/roomPresenceService.ts`

**Goal:** the room shows the queue-front item as a single tappable discoverable; tapping keeps it; the static `roomPlacements` render is removed; pattern/streak/night selections route into the queue.

- [ ] **Step 1:** In `index.tsx`, add state loaded from storage: `keptItemIds: string[]` and `discoveryQueue: string[]` (load in the existing storage-load effect alongside `roomPlacements`). Remove the `roomPlacements` state + its load.
- [ ] **Step 2:** Replace the `{roomPlacements.map(...)}` block (the static emoji render) with a single discoverable render: if `discoveryQueue[0]` resolves to an item (`ALL_BAG_ITEMS ∪ FINDABLE_ITEMS`), render it as a `Pressable` at a calm fixed position with a gentle affordance (`pointerEvents` enabled). No badge, no count.
- [ ] **Step 3:** Add a `handlePickUp` callback: `const { queue, kept } = keepItem(frontId, discoveryQueue, keptItemIds)`; `setDiscoveryQueue(queue)`; `setKeptItemIds(kept)`; persist both (`storageService.save`); show a soft bubble line (front item's `findLine` ?? `오늘 이런 걸 주웠어요 🌿`). (Animation deferred to Stage 5 — for now an instant swap is fine.)
- [ ] **Step 4:** In `roomPresenceService.checkForPlacement`, route each selected item into the queue instead of writing `ROOM_PLACEMENTS`: replace each `save(ROOM_PLACEMENTS, [...placements, newPlacement])` with enqueueing the item id to `DISCOVERY_QUEUE` (load queue, `enqueueArrivals(queue, [item.id])`, save). Retire the `PENDING_PLACEMENT` / 나중에 settle path (discovery has no "place later" choice). Keep the candidate-selection helpers (`selectCategoryCandidate`/`selectStreakCandidate`/`selectNightCandidate`/`pickEligibleItems`/`selectCandidate`) — only their *effect* changes from place→enqueue. Stop writing `ROOM_PLACEMENTS` entirely.
- [ ] **Step 5:** Verify: `npm run typecheck`; manual reasoning — placing logic now enqueues; room renders one discoverable. Grep `index.tsx` for `roomPlacements` → none. Commit: `feat(bag): room discovery render + tap-to-keep (stage 2)`.

---

## Stage 3 — bag read-only keepsake view

**Files:** `src/pages/index.tsx`

**Goal:** the bag shows kept items only (no day-locked grid).

- [ ] **Step 1:** Replace the 4×4 `BAG_ITEMS[bagTab]` grid render with a render over `keptItemIds`: resolve each id from `ALL_BAG_ITEMS ∪ FINDABLE_ITEMS`, show emoji + name in a clean grid; no greyed/locked cells, no `minDays` gating, no counts/completion meter.
- [ ] **Step 2:** Decide tab handling: either keep the 4 tabs filtering kept items by source group, or drop tabs for a single keepsake grid (spec leaves this to this stage — prefer the single clean grid unless kept counts get large). Remove the now-unused `LAST_BAG_OPEN_DAYS`/`hasNewBagItem` "new catalog item" logic (or repoint the bag dot to `discoveryQueue.length > 0`, **without** showing the number).
- [ ] **Step 3:** Keep the existing description card, but it now shows the selected kept item's `desc`/`findLine` (Stage 4 upgrades this to a spoken moment). Empty state when nothing kept yet: a soft line (e.g. `아직 간직한 게 없어요. 천천히 모일 거예요 🌿`).
- [ ] **Step 4:** Verify: `npm run typecheck`; full Jest green; manual — bag shows kept items, no locked cells. Commit: `feat(bag): read-only keepsake view (stage 3)`.

---

## Stage 4 — item tap dialogue (the quiet moment)

**Files:** `src/pages/index.tsx`, possibly `src/constants/ambientDialogue.ts`

**Goal:** tapping a kept item surfaces a short Sobagi line about it.

- [ ] **Step 1:** Add a pure resolver (in `discoveryService.ts` or a small helper): `keepsakeLineFor(itemId): string` → a specific `OBJECT_LINES[itemId]` line if one exists (reuse the ambient pool), else the catalog item's `desc`, else the trinket's `findLine`, else a gentle default. Unit-test the fallback order.
- [ ] **Step 2:** On kept-item tap, instead of (or alongside) the static desc card, surface the line as Sobagi's voice (reuse the bubble or the desc card with the resolved line). Observational tone only — never ownership/collection praise.
- [ ] **Step 3:** Verify: typecheck + Jest (resolver test) green; guardrail (banned-vocab) still clean. Commit: `feat(bag): item-tap quiet moment (stage 4)`.

---

## Stage 5 — pickup animation / polish

**Files:** `src/pages/index.tsx`

**Goal:** the discovery feels alive without becoming loud.

- [ ] **Step 1:** Discoverable affordance: a gentle continuous bob (`Animated.loop`, small `translateY`) and/or a faint glow — calm, not a sparkle burst.
- [ ] **Step 2:** Pickup animation: on tap, animate the item toward the bag icon (translate + fade/scale down) before it's removed from the room; then advance the queue front.
- [ ] **Step 3:** Queue-advance polish: a brief beat before the next arrival appears (don't pop the next item instantly).
- [ ] **Step 4:** Verify: typecheck + full Jest green; anti-pattern grep clean; manual on-device feel check. Commit: `feat(bag): discovery pickup animation + polish (stage 5)`.

---

## Self-Review

**1. Spec coverage:**
- Anchor sentence in plan header + discoveryService doc comment. ✓
- minDays cadence preserved as arrival schedule → `computeTimeArrivals`. ✓
- Migration seeds kept from unlocked+placed+found, before arrival compute → `seedKeptForMigration` + early-return in `runDiscoveryInit`. ✓
- One-at-a-time render of queue front, queue length never surfaced → Stage 2 Step 2 + Stage 3 Step 2 (dot, no number). ✓
- Bag keepsake view, no locked grid → Stage 3. ✓
- Item-tap quiet moment, observational, reuses ambient voice → Stage 4. ✓
- Pickup animation/polish → Stage 5. ✓
- Stop rendering / stop writing ROOM_PLACEMENTS; retire PendingPlacement path → Stage 2 Steps 2,4. ✓
- Staged in the user's exact order. ✓

**2. Placeholder scan:** Stage 1 is full code. Stages 2–5 give concrete files + steps + key snippets (intentionally implemented against live state, declared in the header) — no "TBD"/"handle edge cases". ✓

**3. Type consistency:** `computeTimeArrivals`/`enqueueArrivals`/`keepItem`/`seedKeptForMigration` signatures identical across the test, the module, and the init wiring. `keepItem` returns `{ queue, kept }` used the same way in init and Stage 2. Storage keys spelled identically. ✓

## Risks (carried from spec)
- **ROOM_PLACEMENTS consumers:** confirmed only `index.tsx` (render) + `roomPresenceService` (writer) reference it in `src/` (not PhotocardView). Stage 2 removes both usages safely; the data is already migrated into kept by Stage 1.
- **No re-discovery storm:** Stage 1 migration early-returns before the arrival compute. ✓
- **Queue invisibility:** Stages 2–3 never render the queue length. ✓
