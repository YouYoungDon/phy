# Time-of-Day Home Backgrounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Light the Home room with one of four time-of-day background images (morning/afternoon/evening/latenight) chosen by the local hour, replacing the static background and the `getTimeOfDayTint` color overlay.

**Architecture:** A pure `getTimeOfDayBackgroundKey(hour)` resolver maps the hour to a bucket key; `ROOM_TIME_BACKGROUND_URIS` maps the key to a CDN image URI; `index.tsx` resolves the URI at render and passes it to the existing `RoomBackground` cover-image path. The dead `getTimeOfDayTint` function and its tests are removed; the warmth/calm/rest overlays and bottom fade are untouched.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess`), Jest 29. CDN: jsdelivr pinned to a `sobaki` repo commit SHA.

**Spec:** `docs/superpowers/specs/2026-05-24-time-of-day-backgrounds-design.md`

---

## File Structure

- `src/services/atmosphereService.ts` — add pure `getTimeOfDayBackgroundKey` + `TimeOfDayBackgroundKey` type; remove `getTimeOfDayTint`; keep `TimeOfDayTint` type and all warmth/calm/rest exports.
- `__tests__/atmosphereService.test.ts` — remove `getTimeOfDayTint` import + describe block; add `getTimeOfDayBackgroundKey` describe block.
- `src/constants/assets.ts` — bump `CDN` SHA; add `ROOM_TIME_BACKGROUND_URIS`.
- `src/pages/index.tsx` — swap imports; compute `timeBackgroundUri`; pass to `RoomBackground`; delete tint-overlay `<View>` block.

Task order: resolver+tests first (pure, testable in isolation), then assets (the data the resolver indexes into), then the Home wiring (consumes both), then full verification.

---

### Task 1: Add `getTimeOfDayBackgroundKey` resolver, remove `getTimeOfDayTint`

**Files:**
- Modify: `src/services/atmosphereService.ts:4-15`
- Test: `__tests__/atmosphereService.test.ts:1-56`

- [ ] **Step 1: Update the test file — swap the import**

In `__tests__/atmosphereService.test.ts`, replace the import block (lines 1-9). Remove `getTimeOfDayTint` and add `getTimeOfDayBackgroundKey`:

```ts
import {
  getTimeOfDayBackgroundKey,
  getWarmthOpacity,
  computeCalmDayCount,
  getCalmAtmosphereOpacity,
  CALM_DAILY_THRESHOLD,
  CALM_MAX_OPACITY,
  CALM_PER_DAY_OPACITY,
} from '../src/services/atmosphereService';
import { Expense } from '../src/types';
```

- [ ] **Step 2: Replace the `getTimeOfDayTint` describe block with the new resolver's**

Replace the entire `describe('getTimeOfDayTint', ...)` block (lines 12-56) with:

```ts
describe('getTimeOfDayBackgroundKey', () => {
  it('returns morning for 5 <= h < 12', () => {
    expect(getTimeOfDayBackgroundKey(5)).toBe('morning');
    expect(getTimeOfDayBackgroundKey(8)).toBe('morning');
    expect(getTimeOfDayBackgroundKey(11)).toBe('morning');
  });

  it('returns afternoon for 12 <= h < 17', () => {
    expect(getTimeOfDayBackgroundKey(12)).toBe('afternoon');
    expect(getTimeOfDayBackgroundKey(14)).toBe('afternoon');
    expect(getTimeOfDayBackgroundKey(16)).toBe('afternoon');
  });

  it('returns evening for 17 <= h < 21', () => {
    expect(getTimeOfDayBackgroundKey(17)).toBe('evening');
    expect(getTimeOfDayBackgroundKey(19)).toBe('evening');
    expect(getTimeOfDayBackgroundKey(20)).toBe('evening');
  });

  it('returns latenight for 21 <= h < 24 and 0 <= h < 5', () => {
    expect(getTimeOfDayBackgroundKey(21)).toBe('latenight');
    expect(getTimeOfDayBackgroundKey(23)).toBe('latenight');
    expect(getTimeOfDayBackgroundKey(0)).toBe('latenight');
    expect(getTimeOfDayBackgroundKey(3)).toBe('latenight');
    expect(getTimeOfDayBackgroundKey(4)).toBe('latenight');
  });

  it('covers every boundary hour exactly once', () => {
    expect(getTimeOfDayBackgroundKey(4)).toBe('latenight');  // just below morning
    expect(getTimeOfDayBackgroundKey(11)).toBe('morning');   // just below afternoon
    expect(getTimeOfDayBackgroundKey(16)).toBe('afternoon'); // just below evening
    expect(getTimeOfDayBackgroundKey(20)).toBe('evening');   // just below latenight
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd 소박이; npm test -- atmosphereService 2>&1 | Select-String -Pattern "getTimeOfDayBackgroundKey|FAIL|PASS|is not a function|Cannot find"`
Expected: FAIL — `getTimeOfDayBackgroundKey is not a function` (it doesn't exist yet).

- [ ] **Step 4: Add the resolver and remove `getTimeOfDayTint` in `atmosphereService.ts`**

Replace the `getTimeOfDayTint` function (lines 9-15) with the new resolver. Keep the `TimeOfDayTint` type (lines 4-7) — it is still referenced by `PhotocardView.tsx`. The result for lines 4-15 becomes:

```ts
export type TimeOfDayTint = {
  color: string;
  opacity: number;
};

export type TimeOfDayBackgroundKey = 'morning' | 'afternoon' | 'evening' | 'latenight';

// Pure. Maps a local hour (0-23) to the time-of-day background bucket. Total over
// all hours: latenight is the else branch, so any value yields a defined key.
// Buckets: morning 5-12, afternoon 12-17, evening 17-21, latenight 21-5.
export function getTimeOfDayBackgroundKey(hour: number): TimeOfDayBackgroundKey {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'latenight';
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd 소박이; npm test -- atmosphereService 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS"`
Expected: PASS — all atmosphereService describe blocks green.

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/atmosphereService.ts 소박이/__tests__/atmosphereService.test.ts
git commit -m "feat(home): add getTimeOfDayBackgroundKey, remove getTimeOfDayTint"
```

---

### Task 2: CDN bump + `ROOM_TIME_BACKGROUND_URIS`

**Files:**
- Modify: `src/constants/assets.ts:3-7`

- [ ] **Step 1: Bump the CDN pin SHA**

In `src/constants/assets.ts`, change line 3:

```ts
const CDN = 'https://cdn.jsdelivr.net/gh/YouYoungDon/sobaki@d940b2c41d269ec842aaf127c3c334df5e7ad000/assets';
```

(Was pinned to `ffd169c1e2cf370768506179f0e1be1b6386ec3a`. The new commit is a superset — all existing filenames still resolve.)

- [ ] **Step 2: Add `ROOM_TIME_BACKGROUND_URIS` below `ROOM_BACKGROUND_URIS`**

After the existing `ROOM_BACKGROUND_URIS` block (lines 5-7), add:

```ts
export const ROOM_TIME_BACKGROUND_URIS: Record<
  'morning' | 'afternoon' | 'evening' | 'latenight',
  string
> = {
  morning: `${CDN}/sobaki_stage_morning.png`,
  afternoon: `${CDN}/sobaki_stage_afternoon.png`,
  evening: `${CDN}/sobaki_stage_evening.png`,
  latenight: `${CDN}/sobaki_stage_latenight.png`,
};
```

Leave `ROOM_BACKGROUND_URIS` and all other exports unchanged.

- [ ] **Step 3: Typecheck to verify the constants file compiles**

Run: `cd 소박이; npm run typecheck 2>&1 | Select-String -Pattern "assets.ts|error TS"`
Expected: no errors referencing `assets.ts`.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/constants/assets.ts
git commit -m "feat(assets): bump CDN pin, add ROOM_TIME_BACKGROUND_URIS"
```

---

### Task 3: Wire the time background into the Home screen

**Files:**
- Modify: `src/pages/index.tsx:14,20,91,247-253`

- [ ] **Step 1: Swap the asset import (line 14)**

Change the assets import to drop `ROOM_BACKGROUND_URIS` and add `ROOM_TIME_BACKGROUND_URIS`:

```ts
import { ROOM_TIME_BACKGROUND_URIS, SOBAGI_DEFAULT_URI, SOBAGI_IMAGE_URIS, UTILITY_ICON_URIS, ROOM_FURNITURE_URIS } from '../constants/assets';
```

- [ ] **Step 2: Swap the atmosphereService import (line 20)**

Change the import to drop `getTimeOfDayTint` and add `getTimeOfDayBackgroundKey`:

```ts
import { getTimeOfDayBackgroundKey, getWarmthOpacity, getCalmAtmosphereOpacity, CALM_OVERLAY_COLOR, getRestWarmthOpacity } from '../services/atmosphereService';
```

- [ ] **Step 3: Replace the `timeOfDayTint` computation (line 91)**

Replace line 91:

```ts
  const timeBackgroundUri = ROOM_TIME_BACKGROUND_URIS[getTimeOfDayBackgroundKey(new Date().getHours())];
```

- [ ] **Step 4: Point `RoomBackground` at the time background (line 247)**

Replace line 247:

```tsx
      <RoomBackground stage={roomStage} backgroundUri={timeBackgroundUri}>
```

- [ ] **Step 5: Delete the tint-overlay block (lines 248-253)**

Remove the entire conditional tint overlay:

```tsx
            {timeOfDayTint !== null && (
              <View
                style={[styles.atmosphereOverlay, { backgroundColor: timeOfDayTint.color, opacity: timeOfDayTint.opacity }]}
                pointerEvents="none"
              />
            )}
```

Leave the warmth overlay, rest-warmth overlay, calm overlay, and `bottomFade` (the blocks immediately after) untouched.

- [ ] **Step 6: Typecheck to confirm no dangling references**

Run: `cd 소박이; npm run typecheck 2>&1 | Select-String -Pattern "index.tsx|error TS"`
Expected: no errors. (Confirms no leftover `timeOfDayTint` / `ROOM_BACKGROUND_URIS` / `getTimeOfDayTint` references in `index.tsx`.)

- [ ] **Step 7: Grep to confirm no stale references remain in src/**

Run: `cd 소박이; Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern "getTimeOfDayTint|ROOM_BACKGROUND_URIS|timeOfDayTint"`
Expected: no matches in `src/` (the `TimeOfDayTint` *type* in atmosphereService.ts and PhotocardView.tsx is allowed — it is a different identifier; this pattern won't match it because it lacks the `get`/`ROOM_`/`timeOfDay` lead).

Note: if `Select-String` reports `ROOM_BACKGROUND_URIS` only in `assets.ts` (the kept export/definition), that is expected and fine — the check is specifically that `index.tsx` no longer references it.

- [ ] **Step 8: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat(home): light room with time-of-day background, drop tint overlay"
```

---

### Task 4: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd 소박이; npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 2: Full Jest suite**

Run: `cd 소박이; npm test -- --no-cache 2>&1 | Select-String -Pattern "Tests:|Test Suites:|FAIL"`
Expected: all suites pass; no `FAIL` lines. The new `getTimeOfDayBackgroundKey` block is counted; the old `getTimeOfDayTint` block is gone.

- [ ] **Step 3: Confirm overlay regression-safety by reading the render block**

Run: `cd 소박이; Get-Content src/pages/index.tsx | Select-String -Pattern "atmosphereOverlay|bottomFade|RoomBackground"`
Expected: `RoomBackground` present with `backgroundUri={timeBackgroundUri}`; three `atmosphereOverlay` Views (warmth, rest-warmth, calm) still present; `bottomFade` still present; no tint overlay.

- [ ] **Step 4: No commit**

Verification only — nothing to commit unless a fix was needed.

---

## Self-Review

**1. Spec coverage:**
- CDN bump → Task 2 Step 1. ✓
- `ROOM_TIME_BACKGROUND_URIS` map → Task 2 Step 2. ✓
- Keep `ROOM_BACKGROUND_URIS` export → Task 2 leaves it; Task 3 only stops importing it. ✓
- `getTimeOfDayBackgroundKey` pure resolver + buckets 5-12/12-17/17-21/else → Task 1 Step 4 + tests Step 2. ✓
- Remove `getTimeOfDayTint` → Task 1 Step 4. ✓
- Keep `TimeOfDayTint` type → Task 1 Step 4 keeps lines 4-7. ✓
- Keep warmth/calm/rest exports → untouched in Task 1. ✓
- index.tsx import swaps, compute, RoomBackground, delete tint block → Task 3 Steps 1-5. ✓
- Apply to all stages (bucket independent of roomStage) → Task 3 Step 4 passes `timeBackgroundUri` with no stage gating. ✓
- Keep warmth/rest/calm/bottomFade in render → Task 3 Step 5 note + Task 4 Step 3. ✓
- Remove tint tests, add resolver tests → Task 1 Steps 1-2. ✓
- typecheck + full jest green → Task 4. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases"/"similar to Task N". Every code step shows full code. ✓

**3. Type consistency:** `getTimeOfDayBackgroundKey`, `TimeOfDayBackgroundKey`, `ROOM_TIME_BACKGROUND_URIS`, `timeBackgroundUri` spelled identically across Tasks 1-3 and the test file. The four bucket string literals (`'morning'|'afternoon'|'evening'|'latenight'`) match between the resolver return type, the `ROOM_TIME_BACKGROUND_URIS` key union, and the test assertions. ✓
