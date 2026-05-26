# Quiet Trinket Re-find Traces (×N) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a found trinket occasionally turn up again and render its copies as one keepsake tile with a quiet `×N`, as a soft "turned up again" trace.

**Architecture:** `FOUND_ITEM_IDS` becomes a multiset (repeats allowed, zero migration). The found-item trigger prefers undiscovered trinkets and only re-delivers owned ones once all 8 are found ("new first, repeats later"). The bag renders one tile per unique id and derives the count from a pure `trinketCounts(foundItemIds)` helper, showing `×N` only when ≥ 2.

**Tech Stack:** React Native 0.84 / React 19 / TypeScript 5.8 (`noUnusedLocals` ON — unused imports are build errors), Jest 29, Zustand 5.

**Verification rhythm:** From `소박이/`, single test file `npx jest <name>`; full gate `npx tsc --noEmit` (exit 0) + `npx jest` (whole suite green). All commands run from the `소박이/` directory.

**Spec:** `docs/superpowers/specs/2026-05-26-bag-trinket-refind-stacking-design.md`

---

## File Structure

- `src/services/discoveryService.ts` — add pure `trinketCounts(foundItemIds): Record<string, number>`. Pure logic file, already the home of the keep/arrival helpers.
- `src/services/foundItemService.ts` — change the staging pool to "new first, repeats later". Async storage-backed trigger.
- `src/pages/index.tsx` — append-on-promote write, count derivation, `×N` render in the bag cell, one new style.
- `__tests__/discoveryService.test.ts` — tests for `trinketCounts`.
- `__tests__/foundItemService.test.ts` — update the "all 8 found" test; add a "prefers undiscovered" test.

---

## Task 1: `trinketCounts` pure helper

**Files:**
- Modify: `src/services/discoveryService.ts` (append a new exported function at end of file, after `pickupLineFor`)
- Test: `__tests__/discoveryService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add this `describe` block to the end of `__tests__/discoveryService.test.ts`:

```ts
describe('trinketCounts', () => {
  it('returns an empty map for no found items', () => {
    expect(trinketCounts([])).toEqual({});
  });
  it('counts each id once when there are no repeats', () => {
    expect(trinketCounts(['f1', 'f3'])).toEqual({ f1: 1, f3: 1 });
  });
  it('counts repeated ids as their occurrence count', () => {
    expect(trinketCounts(['f1', 'f1', 'f3'])).toEqual({ f1: 2, f3: 1 });
  });
});
```

Add `trinketCounts` to the existing import at the top of the file:

```ts
import {
  computeTimeArrivals, enqueueArrivals, keepItem, seedKeptForMigration, keepsakeLineFor,
  pickupLineFor, isFreshInstall, trinketCounts,
} from '../src/services/discoveryService';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest discoveryService`
Expected: FAIL — `trinketCounts is not a function` (or a TS/import error).

- [ ] **Step 3: Implement the helper**

Append to the end of `src/services/discoveryService.ts`:

```ts
// Occurrence count per found-trinket id, derived from the FOUND_ITEM_IDS multiset.
// Repeats in the array mean a trinket turned up more than once; the bag shows this
// as a quiet ×N. Catalog ids never appear here, so they resolve to 1 at the call site
// (`counts[id] ?? 1`). A trace of repetition — not a collection count.
export function trinketCounts(foundItemIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of foundItemIds) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest discoveryService`
Expected: PASS (all `discoveryService` tests green, including the new `trinketCounts` block).

- [ ] **Step 5: Commit**

```bash
git add src/services/discoveryService.ts __tests__/discoveryService.test.ts
git commit -m "feat(bag): add trinketCounts helper for re-find ×N"
```

---

## Task 2: "New first, repeats later" staging pool

**Files:**
- Modify: `src/services/foundItemService.ts:108-121`
- Test: `__tests__/foundItemService.test.ts:52-60` (replace) and add one new test

- [ ] **Step 1: Update the existing test and add the preference test**

In `__tests__/foundItemService.test.ts`, REPLACE the existing block (currently
"does nothing if all 8 items already found", lines 52-60):

```ts
  it('does nothing if all 8 items already found', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });
```

with this (new behavior — a re-find IS staged once all are found):

```ts
  it('stages a re-find when all 8 are already found and a trigger fires', async () => {
    // "New first, repeats later": once every trinket has been discovered, the pool
    // opens up to owned ones so a gentle re-find can happen. makeExpense() is a small
    // cafe purchase (T4 trigger); no cooldown is set, so staging proceeds.
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });

  it('prefers an undiscovered trinket while some remain', async () => {
    // f1..f7 found, only f8 undiscovered: the staged id must be f8 (deterministic —
    // the pool is the single-item [f8], so randomness cannot pick anything else).
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).toHaveBeenCalledWith('sobagi-staged-item-id', 'f8');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest foundItemService`
Expected: FAIL — the "stages a re-find when all 8 are already found" test fails because
the current code returns early when `unfound.length === 0` (so `save` is never called).

- [ ] **Step 3: Implement the pool change**

In `src/services/foundItemService.ts`, the current block reads:

```ts
  const foundIds = (await storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS)) ?? [];
  const unfound = FINDABLE_ITEMS.filter((item) => !foundIds.includes(item.id));
  if (unfound.length === 0) return;

  const now = new Date();
  const today = getLocalDateString(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  if (!hasTrigger(expenses, today, yesterday)) return;

  const item = unfound[Math.floor(Math.random() * unfound.length)];
  if (!item) return;
```

Replace it with:

```ts
  const foundIds = (await storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS)) ?? [];
  // New first, repeats later: always prefer trinkets the user hasn't discovered yet.
  // Only once every trinket has turned up at least once does the pool open to owned
  // ones, so a gentle re-find (the ×N trace) becomes possible. The same GRACE/COOLDOWN
  // gating below still applies to re-finds — they can't be farmed.
  const undiscovered = FINDABLE_ITEMS.filter((item) => !foundIds.includes(item.id));
  const pool = undiscovered.length > 0 ? undiscovered : FINDABLE_ITEMS;

  const now = new Date();
  const today = getLocalDateString(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateString(yesterdayDate);

  if (!hasTrigger(expenses, today, yesterday)) return;

  const item = pool[Math.floor(Math.random() * pool.length)];
  if (!item) return;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest foundItemService`
Expected: PASS — all `foundItemService` tests green (the re-find test and the
"prefers undiscovered" test pass; the other trigger tests are unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/services/foundItemService.ts __tests__/foundItemService.test.ts
git commit -m "feat(bag): allow gentle trinket re-finds once all are found"
```

---

## Task 3: Append-on-promote write + ×N render

**Files:**
- Modify: `src/pages/index.tsx` (import line ~29; promotion write ~153-158; count derivation near ~114; cell render ~527-528; style near ~751-756)

This task is React-Native UI wiring with no pure unit to test; it is verified by
`npx tsc --noEmit` + the full Jest suite staying green + the anti-pattern grep in Task 4.

- [ ] **Step 1: Import the helper**

In `src/pages/index.tsx`, the current import reads:

```ts
import { keepsakeLineFor, pickupLineFor } from '../services/discoveryService';
```

Replace with:

```ts
import { keepsakeLineFor, pickupLineFor, trinketCounts } from '../services/discoveryService';
```

- [ ] **Step 2: Always append on promotion (increment the count)**

In `openSheet`, the current pending-trinket promotion reads:

```ts
        setFoundItemIds((prev) => {
          if (prev.includes(pendingId)) return prev;
          const next = [...prev, pendingId];
          storageService.save(STORAGE_KEYS.FOUND_ITEM_IDS, next);
          return next;
        });
```

Replace with (drop the dedup guard so a re-found trinket increments its count):

```ts
        setFoundItemIds((prev) => {
          // Always append — a re-found trinket adds another copy (its ×N trace).
          // FOUND_ITEM_IDS is a multiset; tiles still group by id at render.
          const next = [...prev, pendingId];
          storageService.save(STORAGE_KEYS.FOUND_ITEM_IDS, next);
          return next;
        });
```

- [ ] **Step 3: Derive per-id counts**

Find the existing `displayedKeptIds` memo (it merges kept + found into unique ids):

```ts
  const displayedKeptIds = useMemo(
    () => Array.from(new Set([...keptItemIds, ...foundItemIds])),
    [keptItemIds, foundItemIds],
  );
```

Immediately AFTER it, add:

```ts
  // Per-id occurrence counts for found trinkets; catalog ids resolve to 1 via `?? 1`.
  const keepsakeCounts = useMemo(() => trinketCounts(foundItemIds), [foundItemIds]);
```

- [ ] **Step 4: Render ×N in the bag cell**

In the bag grid, the current cell renders emoji + name:

```tsx
                          >
                            <Text style={styles.bagCellEmoji}>{item.emoji}</Text>
                            <Text style={styles.bagCellName}>{item.name}</Text>
                          </Pressable>
```

Replace with (add the quiet count, shown only at ≥ 2):

```tsx
                          >
                            <Text style={styles.bagCellEmoji}>{item.emoji}</Text>
                            <Text style={styles.bagCellName}>{item.name}</Text>
                            {(keepsakeCounts[id] ?? 1) >= 2 && (
                              <Text style={styles.bagCellCount}>×{keepsakeCounts[id]}</Text>
                            )}
                          </Pressable>
```

- [ ] **Step 5: Add the style**

Find the `bagCellName` style:

```ts
  bagCellName: {
    fontSize: 9,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 3,
  },
```

Immediately AFTER it, add:

```ts
  // Quiet "turned up again" trace in the cell corner. Softer than the name (textLight,
  // not textMuted), no background pill — a trace, never a badge. Shown only at ×2+.
  bagCellCount: {
    position: 'absolute',
    right: 6,
    bottom: 5,
    fontSize: 11,
    color: COLORS.textLight,
  },
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (no errors). In particular, no `noUnusedLocals` error for `trinketCounts`
(it is now used in `keepsakeCounts`).

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat(bag): render quiet ×N on stacked trinket keepsakes"
```

---

## Task 4: Full-suite verification + anti-drift grep

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Run the whole test suite**

Run: `npx jest`
Expected: all suites pass (the existing count plus the new `trinketCounts` tests and
the two updated `foundItemService` tests; no regressions).

- [ ] **Step 3: Anti-drift grep on touched files**

Confirm no rejected vocabulary/mechanics leaked into the three touched files. Run:

```bash
git grep -nE "수입|보상|축하|순수익|차액|rarity|tier|synthes|craft|progress|unlock|collect" -- src/services/discoveryService.ts src/services/foundItemService.ts src/pages/index.tsx
```

Expected: no NEW matches introduced by this change. (Pre-existing unrelated matches such
as `unlock` in comments about `minDays` are acceptable; the new ×N code adds none of these.)

- [ ] **Step 4: Manual dogfood note (no code)**

The ×N is intentionally rare (only after all 8 trinkets are found). To eyeball the visual
without waiting, temporarily set `FOUND_ITEM_IDS` to e.g. `['f1','f1','f3']` via a fresh
run / devtools, open the bag, and confirm: f1 shows one tile with a muted `×2` bottom-right,
f3 shows no badge, tapping either still shows its keepsake line. Revert any temporary data.
This is an observation step, not a committed change.

---

## Self-Review

**Spec coverage:**
- Scope (trinkets only, badge ≥ 2) → Task 3 Step 4 (`>= 2` guard); catalog ids resolve to 1 (`?? 1`). ✓
- Multiset storage, zero migration → Task 3 Step 2 (append, no schema change). ✓
- Trigger "new first, repeats later" → Task 2 Step 3. ✓
- Append-on-promote → Task 3 Step 2. ✓
- One tile + derived count → Task 1 (`trinketCounts`) + Task 3 Steps 3–4. ✓
- Quietest UI (bottom-right, textLight, no pill) → Task 3 Step 5. ✓
- Tap/dialogue unchanged → not touched (no task modifies the `onPress`/`keepsakeLineFor`). ✓
- Tests: `trinketCounts` (Task 1), re-find-after-all-found + prefers-undiscovered (Task 2). ✓
- Anti-drift verification → Task 4 Step 3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands. ✓

**Type consistency:** Helper is `trinketCounts(foundItemIds: string[]): Record<string, number>` everywhere — defined Task 1 Step 3, imported Task 3 Step 1, called as `trinketCounts(foundItemIds)` Task 3 Step 3, read as `keepsakeCounts[id]` Task 3 Step 4. Style key `bagCellCount` defined Task 3 Step 5, used Task 3 Step 4. Consistent. ✓
