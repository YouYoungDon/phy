# 쉬어가기 TV — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a TV resting interaction in Sobagi's room paired with a pebble jar — watching a rewarded ad grants 5–20 pebbles (which never spend), pulses room warmth for 60 minutes, and at hidden pebble thresholds delivers a personal letter into the existing mailbox.

**Architecture:** Pure logic (pebble RNG, threshold detection, day-reset selectors) lives in `restService.ts` and is unit-tested. State persists through `userStore` + `storageService` using existing patterns. SDK lifecycle is encapsulated in a `useRestedAd` hook that exposes only `{ status, show(onReward) }`; the consuming component (`RestPrompt`) passes a callback that invokes `grantRest()` — `grantRest()` is **never** called outside that callback. Room sprites are static fixtures positioned via normalized constants (`TV_POSITION` anchored to `MAILBOX_POSITION`).

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29, `@apps-in-toss/framework` 2.5.

**Spec:** `docs/superpowers/specs/2026-05-21-rest-tv-ads-design.md`

**Phasing (matches user-specified order):**
1. Pure logic + tests (Tasks 1–3)
2. Store/storage hydration (Tasks 4–6)
3. Ad hook (Task 7)
4. Room sprites (Tasks 8–9)
5. index.tsx wiring (Tasks 10–14)
6. Polish/edge cases (Task 15)

**Critical boundary:** `grantRest()` is the only call path that writes pebbles, warmth, and letters. It is invoked exclusively from the `onReward` callback that `RestPrompt` passes to `useRestedAd.show()`. The hook itself never imports `grantRest`. Tests assert this in Task 11.

**Commands used throughout:**
- Run a single test file: `npx jest __tests__/<file>.test.ts`
- Run full suite: `npm test`
- Typecheck: `npm run typecheck`

---

## Phase 1 — Pure logic + tests

### Task 1: `getRestWarmthOpacity` in atmosphereService

**Files:**
- Modify: `src/services/atmosphereService.ts` (append below existing exports)
- Test: `__tests__/atmosphereService.test.ts` (append to existing file)

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/atmosphereService.test.ts`:

```ts
import { getRestWarmthOpacity } from '../src/services/atmosphereService';

describe('getRestWarmthOpacity', () => {
  it('returns 0 when lastRestAt is null', () => {
    expect(getRestWarmthOpacity(new Date('2026-05-21T12:00:00Z'), null)).toBe(0);
  });

  it('returns 0.08 immediately after rest (t=0)', () => {
    const now = new Date('2026-05-21T12:00:00Z');
    const lastRestAt = now.toISOString();
    expect(getRestWarmthOpacity(now, lastRestAt)).toBeCloseTo(0.08, 5);
  });

  it('returns 0.04 halfway through fade (t=30min)', () => {
    const now = new Date('2026-05-21T12:30:00Z');
    const lastRestAt = '2026-05-21T12:00:00Z';
    expect(getRestWarmthOpacity(now, lastRestAt)).toBeCloseTo(0.04, 5);
  });

  it('returns 0 at fade boundary (t=60min)', () => {
    const now = new Date('2026-05-21T13:00:00Z');
    const lastRestAt = '2026-05-21T12:00:00Z';
    expect(getRestWarmthOpacity(now, lastRestAt)).toBe(0);
  });

  it('returns 0 past fade window (t=90min)', () => {
    const now = new Date('2026-05-21T13:30:00Z');
    const lastRestAt = '2026-05-21T12:00:00Z';
    expect(getRestWarmthOpacity(now, lastRestAt)).toBe(0);
  });

  it('returns 0 when lastRestAt is in the future (clock skew)', () => {
    const now = new Date('2026-05-21T12:00:00Z');
    const lastRestAt = '2026-05-21T12:30:00Z';
    expect(getRestWarmthOpacity(now, lastRestAt)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/atmosphereService.test.ts`
Expected: 6 new tests fail with `getRestWarmthOpacity is not a function` or similar.

- [ ] **Step 3: Implement `getRestWarmthOpacity`**

Append to `src/services/atmosphereService.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/atmosphereService.test.ts`
Expected: all tests pass (existing + 6 new).

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. (Pre-existing `_404.tsx` errors are unrelated.)

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/atmosphereService.ts 소박이/__tests__/atmosphereService.test.ts
git commit -m "feat: getRestWarmthOpacity for rest-TV warmth fade"
```

---

### Task 2: `restService.ts` pure helpers + tests

**Files:**
- Create: `src/services/restService.ts`
- Test: `__tests__/restService.test.ts`

These are the pure, store-free, storage-free helpers. The orchestrator `grantRest()` lands in Task 11 after the store and the letters constant are in place.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/restService.test.ts`:

```ts
import {
  computePebbleDelta,
  findCrossedLetterThresholds,
  getEffectiveRestsToday,
  canRest,
  PEBBLE_MIN,
  PEBBLE_MAX,
  REST_DAILY_CAP,
} from '../src/services/restService';

type ThresholdItem = { id: string; triggerPebbles: number };

describe('computePebbleDelta', () => {
  it('returns a value within [PEBBLE_MIN, PEBBLE_MAX]', () => {
    for (let i = 0; i < 200; i++) {
      const v = computePebbleDelta();
      expect(v).toBeGreaterThanOrEqual(PEBBLE_MIN);
      expect(v).toBeLessThanOrEqual(PEBBLE_MAX);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('PEBBLE_MIN is 5 and PEBBLE_MAX is 20', () => {
    expect(PEBBLE_MIN).toBe(5);
    expect(PEBBLE_MAX).toBe(20);
  });
});

describe('findCrossedLetterThresholds', () => {
  const letters: ThresholdItem[] = [
    { id: 'a', triggerPebbles: 30 },
    { id: 'b', triggerPebbles: 100 },
    { id: 'c', triggerPebbles: 250 },
  ];

  it('returns empty array when no threshold crossed', () => {
    expect(findCrossedLetterThresholds(letters, 10, 25)).toEqual([]);
  });

  it('returns single letter when one threshold crossed', () => {
    const result = findCrossedLetterThresholds(letters, 20, 35);
    expect(result.map((l) => l.id)).toEqual(['a']);
  });

  it('returns multiple letters when several thresholds crossed in one watch', () => {
    const result = findCrossedLetterThresholds(letters, 20, 110);
    expect(result.map((l) => l.id)).toEqual(['a', 'b']);
  });

  it('does not re-deliver a letter when already past its threshold', () => {
    expect(findCrossedLetterThresholds(letters, 50, 70)).toEqual([]);
  });

  it('boundary: exactly hitting a threshold counts as crossing', () => {
    const result = findCrossedLetterThresholds(letters, 29, 30);
    expect(result.map((l) => l.id)).toEqual(['a']);
  });

  it('boundary: leaving and re-arriving at same threshold (no-op)', () => {
    expect(findCrossedLetterThresholds(letters, 30, 30)).toEqual([]);
  });
});

describe('getEffectiveRestsToday', () => {
  it('returns 0 when lastRestDate is null', () => {
    expect(getEffectiveRestsToday(2, null, '2026-05-21')).toBe(0);
  });

  it('returns 0 when lastRestDate is stale', () => {
    expect(getEffectiveRestsToday(2, '2026-05-20', '2026-05-21')).toBe(0);
  });

  it('returns stored value when lastRestDate matches today', () => {
    expect(getEffectiveRestsToday(1, '2026-05-21', '2026-05-21')).toBe(1);
    expect(getEffectiveRestsToday(2, '2026-05-21', '2026-05-21')).toBe(2);
  });
});

describe('canRest', () => {
  it('allows rest on a fresh day even when storedRestsToday is 2', () => {
    expect(canRest(2, '2026-05-20', '2026-05-21')).toBe(true);
  });

  it('allows rest when restsToday < REST_DAILY_CAP', () => {
    expect(canRest(0, '2026-05-21', '2026-05-21')).toBe(true);
    expect(canRest(1, '2026-05-21', '2026-05-21')).toBe(true);
  });

  it('blocks rest when restsToday >= REST_DAILY_CAP', () => {
    expect(canRest(2, '2026-05-21', '2026-05-21')).toBe(false);
  });

  it('REST_DAILY_CAP is 2', () => {
    expect(REST_DAILY_CAP).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/restService.test.ts`
Expected: file fails to import (`Cannot find module ...restService`).

- [ ] **Step 3: Implement pure helpers**

Create `src/services/restService.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/restService.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/restService.ts 소박이/__tests__/restService.test.ts
git commit -m "feat: rest service pure helpers (pebble RNG, threshold detection, day reset)"
```

---

### Task 3: `restLetters.ts` constant

**Files:**
- Create: `src/constants/restLetters.ts`

No tests — this is a static constant. Type-correctness is enforced by TypeScript.

- [ ] **Step 1: Create the constants file**

Create `src/constants/restLetters.ts`:

```ts
export type RestLetter = {
  id: string;
  triggerPebbles: number;
  body: string;
  sig: string;
};

// Rest letters mix into the existing mailbox flow. The mailbox UI renders
// them with zero changes — same card layout, same red-dot indicator,
// same expand/collapse. Thresholds are sorted ascending; finding the
// crossed ones is O(n) in restService.findCrossedLetterThresholds.

export const REST_LETTERS: readonly RestLetter[] = [
  {
    id: 'rest1',
    triggerPebbles: 30,
    body: '오늘도 잠깐 쉬어갔네요.\n조용한 채널을 보고 있으면\n시간이 천천히 흐르는 것 같아요.',
    sig: '— 소박이',
  },
  {
    id: 'rest2',
    triggerPebbles: 100,
    body: '요즘 자주 쉬어가네요.\n조용한 시간이 쌓이는 건\n작은 일이 아니에요.',
    sig: '— 소박이',
  },
  {
    id: 'rest3',
    triggerPebbles: 250,
    body: '이 방이 조금 따뜻해진 것 같아요.\n계속 들러줘서 그런가봐요 🌿',
    sig: '— 소박이',
  },
  {
    id: 'rest4',
    triggerPebbles: 500,
    body: '같이 본 채널이 꽤 됐네요.\n대단한 건 아니지만\n이 시간이 좋아요.',
    sig: '— 소박이',
  },
  {
    id: 'rest5',
    triggerPebbles: 1000,
    body: '조약돌이 한가득 모였어요.\n그동안 함께 쉬어갔던\n조용한 순간들이에요.',
    sig: '— 소박이',
  },
];
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add 소박이/src/constants/restLetters.ts
git commit -m "feat: REST_LETTERS pool with 5 pebble-threshold letters"
```

---

## Phase 2 — Store/storage hydration

### Task 4: Extend STORAGE_KEYS and UserState

**Files:**
- Modify: `src/constants/storage.ts:1-17`
- Modify: `src/types/index.ts:28-34`

- [ ] **Step 1: Add storage keys**

Edit `src/constants/storage.ts` — append to the `STORAGE_KEYS` object before the closing brace:

```ts
export const STORAGE_KEYS = {
  USER: 'sobagi-user',
  EXPENSES: 'sobagi-expenses',
  LAST_EMOTION: 'sobagi-last-emotion',
  MAILBOX_READ_IDS: 'sobagi-mailbox-read-ids',
  FOUND_ITEM_IDS: 'sobagi-found-item-ids',
  PENDING_NEW_ITEM_ID: 'sobagi-pending-item-id',
  LAST_ITEM_DATE: 'sobagi-last-item-date',
  STAGED_ITEM_ID: 'sobagi-staged-item-id',
  LAST_VISIT_DATE: 'sobagi-last-visit-date',
  OBSERVATION_SAVE_COUNT: 'sobagi-observation-save-count',
  MAILBOX_DELIVERED_IDS: 'sobagi-mailbox-delivered-ids',
  LAST_BAG_OPEN_DAYS: 'sobagi-last-bag-open-days',
  ROOM_PLACEMENTS: 'sobagi-room-placements',
  PENDING_PLACEMENT: 'sobagi-pending-placement',
  CATEGORY_MIGRATION_DONE: 'sobagi-category-migration-done',
  PEBBLE_COUNT: 'sobagi-pebble-count',
  RESTS_TODAY: 'sobagi-rests-today',
  LAST_REST_DATE: 'sobagi-last-rest-date',
  LAST_REST_AT: 'sobagi-last-rest-at',
} as const;
```

- [ ] **Step 2: Extend UserState type**

Edit `src/types/index.ts` — modify the `UserState` interface:

```ts
export interface UserState {
  level: number;
  streak: number;
  totalRecordCount: number;
  recordedDaysCount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
  pebbleCount: number;
  restsToday: number;
  lastRestDate: string | null;
  lastRestAt: string | null;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: errors in `userStore.ts` and any other consumer that builds `UserState` literally (e.g. `expenseService.ts`'s `updatedUser`, `useAppInit.ts`'s `hydrate({...userData, ...})`). These get fixed in the next two tasks — typecheck will be clean after Task 6.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/constants/storage.ts 소박이/src/types/index.ts
git commit -m "feat: storage keys and UserState fields for rest system"
```

(Commit even with typecheck errors — they're closed in Tasks 5–6.)

---

### Task 5: Extend userStore with rest fields + setters

**Files:**
- Modify: `src/store/userStore.ts`
- Test: `__tests__/stores.test.ts` (append)

- [ ] **Step 1: Read the existing stores test to match conventions**

```bash
cat 소박이/__tests__/stores.test.ts | head -30
```

(Read the file to see how existing zustand stores are exercised. Match the pattern.)

- [ ] **Step 2: Write the failing tests**

Append to `__tests__/stores.test.ts`:

```ts
describe('userStore — rest fields', () => {
  beforeEach(() => {
    useUserStore.setState({
      level: 1,
      streak: 0,
      totalRecordCount: 0,
      recordedDaysCount: 0,
      roomStage: 1,
      pebbleCount: 0,
      restsToday: 0,
      lastRestDate: null,
      lastRestAt: null,
    });
  });

  it('setPebbleCount writes the new value', () => {
    useUserStore.getState().setPebbleCount(42);
    expect(useUserStore.getState().pebbleCount).toBe(42);
  });

  it('setRestsToday writes the new value', () => {
    useUserStore.getState().setRestsToday(1);
    expect(useUserStore.getState().restsToday).toBe(1);
  });

  it('setLastRestDate writes the new value', () => {
    useUserStore.getState().setLastRestDate('2026-05-21');
    expect(useUserStore.getState().lastRestDate).toBe('2026-05-21');
  });

  it('setLastRestAt writes the new value', () => {
    useUserStore.getState().setLastRestAt('2026-05-21T12:00:00Z');
    expect(useUserStore.getState().lastRestAt).toBe('2026-05-21T12:00:00Z');
  });

  it('hydrate populates rest fields from a UserState', () => {
    useUserStore.getState().hydrate({
      level: 2,
      streak: 3,
      totalRecordCount: 10,
      recordedDaysCount: 7,
      roomStage: 1,
      pebbleCount: 55,
      restsToday: 1,
      lastRestDate: '2026-05-21',
      lastRestAt: '2026-05-21T12:00:00Z',
    });
    expect(useUserStore.getState().pebbleCount).toBe(55);
    expect(useUserStore.getState().restsToday).toBe(1);
    expect(useUserStore.getState().lastRestDate).toBe('2026-05-21');
    expect(useUserStore.getState().lastRestAt).toBe('2026-05-21T12:00:00Z');
  });
});
```

Make sure `useUserStore` is imported at the top of the file if it isn't already.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest __tests__/stores.test.ts`
Expected: tests fail with "setPebbleCount is not a function" or "Cannot read property 'pebbleCount'".

- [ ] **Step 4: Extend the store**

Edit `src/store/userStore.ts` — replace the existing store definition:

```ts
import { create } from 'zustand';
import { UserState } from '../types';

// Cumulative recorded-days thresholds per level.
// Index = level - 1, value = days needed to reach that level.
export const LEVEL_THRESHOLDS = [0, 7, 20, 40, 70, 110, 160] as const;

export function getLevel(days: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    const threshold = LEVEL_THRESHOLDS[i];
    if (threshold !== undefined && days >= threshold) return i + 1;
  }
  return 1;
}

export function getNextThreshold(days: number): number {
  const level = getLevel(days);
  const next = LEVEL_THRESHOLDS[level];
  if (next !== undefined) return next;
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return last ?? 160;
}

export function getRoomStage(_days: number): 1 | 2 | 3 | 4 | 5 {
  return 1;
}

interface UserStore extends UserState {
  incrementRecordedDays: () => void;
  incrementTotalRecordCount: () => void;
  setStreak: (streak: number) => void;
  setPebbleCount: (count: number) => void;
  setRestsToday: (count: number) => void;
  setLastRestDate: (date: string | null) => void;
  setLastRestAt: (iso: string | null) => void;
  hydrate: (state: UserState) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  level: 1,
  streak: 0,
  totalRecordCount: 0,
  recordedDaysCount: 0,
  roomStage: 1,
  pebbleCount: 0,
  restsToday: 0,
  lastRestDate: null,
  lastRestAt: null,
  incrementRecordedDays: () =>
    set((state) => {
      const newDays = state.recordedDaysCount + 1;
      return {
        recordedDaysCount: newDays,
        level: getLevel(newDays),
        roomStage: getRoomStage(newDays),
      };
    }),
  incrementTotalRecordCount: () =>
    set((state) => ({ totalRecordCount: state.totalRecordCount + 1 })),
  setStreak: (streak) => set({ streak }),
  setPebbleCount: (pebbleCount) => set({ pebbleCount }),
  setRestsToday: (restsToday) => set({ restsToday }),
  setLastRestDate: (lastRestDate) => set({ lastRestDate }),
  setLastRestAt: (lastRestAt) => set({ lastRestAt }),
  hydrate: (state) => set(state),
}));
```

- [ ] **Step 5: Fix `expenseService.ts` `updatedUser` literal**

Search for the `updatedUser: UserState = {...}` block — it currently lists 5 fields and will now fail to typecheck. Update it to include the new fields:

Find in `src/services/expenseService.ts`:

```ts
  const updatedUser: UserState = {
    level: s.level,
    streak: s.streak,
    totalRecordCount: s.totalRecordCount,
    recordedDaysCount: s.recordedDaysCount,
    roomStage: s.roomStage,
  };
```

Replace with:

```ts
  const updatedUser: UserState = {
    level: s.level,
    streak: s.streak,
    totalRecordCount: s.totalRecordCount,
    recordedDaysCount: s.recordedDaysCount,
    roomStage: s.roomStage,
    pebbleCount: s.pebbleCount,
    restsToday: s.restsToday,
    lastRestDate: s.lastRestDate,
    lastRestAt: s.lastRestAt,
  };
```

- [ ] **Step 6: Run tests + typecheck**

Run: `npx jest __tests__/stores.test.ts`
Expected: all tests pass.

Run: `npm run typecheck`
Expected: `useAppInit.ts` still errors on the `hydrate({...userData, ...})` call because `userData` is `UserState | null` and may be missing the new fields. That's Task 6.

- [ ] **Step 7: Commit**

```bash
git add 소박이/src/store/userStore.ts 소박이/src/services/expenseService.ts 소박이/__tests__/stores.test.ts
git commit -m "feat: userStore rest fields (pebbleCount, restsToday, lastRestDate, lastRestAt)"
```

---

### Task 6: Hydrate rest fields in useAppInit

**Files:**
- Modify: `src/hooks/useAppInit.ts:96-109`

- [ ] **Step 1: Update the hydrate call**

Find in `src/hooks/useAppInit.ts`:

```ts
        if (userData) {
          // Always recompute recordedDaysCount from expenses for correctness.
          // This also handles users migrating from the old exp-based system.
          useUserStore.getState().hydrate({
            ...userData,
            recordedDaysCount: recomputedDays,
            level: getLevel(recomputedDays),
            roomStage: getRoomStage(recomputedDays),
            // exp was removed — strip it from any legacy stored object
          });
        }
```

Replace with:

```ts
        if (userData) {
          // Always recompute recordedDaysCount from expenses for correctness.
          // This also handles users migrating from the old exp-based system.
          // Default rest fields when absent (legacy users predate them).
          useUserStore.getState().hydrate({
            ...userData,
            recordedDaysCount: recomputedDays,
            level: getLevel(recomputedDays),
            roomStage: getRoomStage(recomputedDays),
            pebbleCount: userData.pebbleCount ?? 0,
            restsToday: userData.restsToday ?? 0,
            lastRestDate: userData.lastRestDate ?? null,
            lastRestAt: userData.lastRestAt ?? null,
            // exp was removed — strip it from any legacy stored object
          });
        }
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean (only pre-existing `_404.tsx` errors).

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/hooks/useAppInit.ts
git commit -m "feat: hydrate rest fields on cold start, default for legacy users"
```

---

## Phase 3 — Ad hook

### Task 7: `constants/ads.ts` + `useRestedAd` hook

**Files:**
- Create: `src/constants/ads.ts`
- Create: `src/hooks/useRestedAd.ts`

No unit tests for the hook — the SDK is an external boundary, and the lifecycle is straightforward request/response. Manual verification happens in the room screen integration.

- [ ] **Step 1: Create the ad-group constant**

Create `src/constants/ads.ts`:

```ts
// Test ad group ID for development. Swap to the production rewarded ad
// group ID before release. The full-screen rewarded ad API is documented at
// https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/IntegratedAd.md
export const REST_AD_GROUP_ID = 'ait.dev.43daa14da3ae487b';
```

- [ ] **Step 2: Create the hook**

Create `src/hooks/useRestedAd.ts`:

```ts
import { useEffect, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/framework';
import { REST_AD_GROUP_ID } from '../constants/ads';

export type RestAdStatus = 'loading' | 'ready' | 'showing' | 'unsupported' | 'error';

interface UseRestedAdResult {
  status: RestAdStatus;
  show: (onReward: () => void) => void;
}

// Wraps the load → show → reload cycle of the rewarded full-screen ad.
// The boundary the parent code relies on: `onReward` is invoked **only**
// when the SDK fires the `userEarnedReward` event. Dismissal alone never
// triggers it. The hook itself never imports business logic; the consumer
// passes a callback that does whatever grant work is needed.
export function useRestedAd(): UseRestedAdResult {
  const supported = loadFullScreenAd.isSupported() && showFullScreenAd.isSupported();
  const [status, setStatus] = useState<RestAdStatus>(supported ? 'loading' : 'unsupported');
  const unregisterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!supported) return;

    const loadOnce = () => {
      const unregister = loadFullScreenAd({
        options: { adGroupId: REST_AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') setStatus('ready');
        },
        onError: () => setStatus('error'),
      });
      unregisterRef.current = unregister;
    };

    loadOnce();
    return () => {
      if (unregisterRef.current !== null) unregisterRef.current();
      unregisterRef.current = null;
    };
  }, [supported]);

  const show = (onReward: () => void) => {
    if (status !== 'ready') return;
    setStatus('showing');
    showFullScreenAd({
      options: { adGroupId: REST_AD_GROUP_ID },
      onEvent: (event) => {
        // The trust signal. dismissed alone is NOT enough.
        if (event.type === 'userEarnedReward') {
          onReward();
        }
        if (event.type === 'dismissed') {
          setStatus('loading');
          // Preload the next ad. The new unregister supersedes the previous.
          const unregister = loadFullScreenAd({
            options: { adGroupId: REST_AD_GROUP_ID },
            onEvent: (loadEvent) => {
              if (loadEvent.type === 'loaded') setStatus('ready');
            },
            onError: () => setStatus('error'),
          });
          unregisterRef.current = unregister;
        }
        if (event.type === 'failedToShow') {
          setStatus('error');
        }
      },
      onError: () => setStatus('error'),
    });
  };

  return { status, show };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean. If `loadFullScreenAd` types don't resolve, confirm `@apps-in-toss/framework` exports them — the spec assumes version 2.5.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/constants/ads.ts 소박이/src/hooks/useRestedAd.ts
git commit -m "feat: useRestedAd hook wrapping AppsInToss rewarded ad lifecycle"
```

---

## Phase 4 — Room sprites

### Task 8: Add TV asset + `RestTV` component

**Files:**
- Modify: `src/constants/assets.ts:18-22`
- Create: `src/components/room/RestTV.tsx`

- [ ] **Step 1: Add the TV asset URI**

Edit `src/constants/assets.ts` — append after `UTILITY_ICON_URIS`:

```ts
export const ROOM_FURNITURE_URIS: Record<'tv', string> = {
  tv: `${CDN}/sobaki_tv.png`,
};
```

- [ ] **Step 2: Create the RestTV component**

Create `src/components/room/RestTV.tsx`:

```ts
import React from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import { ROOM_FURNITURE_URIS } from '../../constants/assets';
import type { RestAdStatus } from '../../hooks/useRestedAd';

interface RestTVProps {
  position: { x: number; y: number };
  adStatus: RestAdStatus;
  effectiveRestsToday: number;
  onPress: () => void;
}

// Visual treatment for the four runtime states. Available = 0.85,
// loading = 0.55, done/error = 0.35. Matches the spec's state table.
function opacityFor(adStatus: RestAdStatus, effectiveRestsToday: number): number {
  if (effectiveRestsToday >= 2) return 0.35;
  if (adStatus === 'error') return 0.35;
  if (adStatus === 'loading') return 0.55;
  return 0.85;
}

export function RestTV({ position, adStatus, effectiveRestsToday, onPress }: RestTVProps) {
  // When the SDK is unsupported the TV never renders — no fallback messaging.
  if (adStatus === 'unsupported') return null;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tv,
        { left: `${position.x * 100}%`, top: `${position.y * 100}%`, opacity: opacityFor(adStatus, effectiveRestsToday) },
      ]}
      hitSlop={8}
    >
      <Image
        source={{ uri: ROOM_FURNITURE_URIS.tv }}
        style={styles.tvImage}
        resizeMode="contain"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tv: {
    position: 'absolute',
    width: 56,
    height: 56,
  },
  tvImage: {
    width: 56,
    height: 56,
  },
});
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/constants/assets.ts 소박이/src/components/room/RestTV.tsx
git commit -m "feat: RestTV component with 4-state opacity treatment"
```

---

### Task 9: `PebbleJar` component

**Files:**
- Create: `src/components/room/PebbleJar.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/room/PebbleJar.tsx`:

```ts
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface PebbleJarProps {
  position: { x: number; y: number };
  pebbleCount: number;
  onPress: () => void;
}

// Fill stages map to opacity + scale on a single emoji. Empty → barely
// visible, overflowing → fully opaque with a small scale-up. The spec's
// rationale: emoji-only assets can't change glyph by fill level, so we
// use opacity/scale instead — and the restraint matches the room's
// existing low-key visual vocabulary.
function fillStage(count: number): { opacity: number; scale: number } {
  if (count >= 200) return { opacity: 1.0, scale: 1.08 };
  if (count >= 50) return { opacity: 0.8, scale: 1.0 };
  if (count >= 10) return { opacity: 0.6, scale: 1.0 };
  return { opacity: 0.4, scale: 1.0 };
}

export function PebbleJar({ position, pebbleCount, onPress }: PebbleJarProps) {
  const stage = fillStage(pebbleCount);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.jar,
        {
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          opacity: stage.opacity,
          transform: [{ scale: stage.scale }],
        },
      ]}
      hitSlop={8}
    >
      <Text style={styles.jarEmoji}>🫙</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  jar: {
    position: 'absolute',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jarEmoji: {
    fontSize: 28,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add 소박이/src/components/room/PebbleJar.tsx
git commit -m "feat: PebbleJar component with 4 opacity+scale fill stages"
```

---

## Phase 5 — index.tsx wiring

### Task 10: Add position constants + render TV/jar in room

**Files:**
- Modify: `src/pages/index.tsx`

This task only renders the sprites with static state. The tap handlers are stubbed (toast/no-op) and replaced in Task 12.

- [ ] **Step 1: Add position constants and imports**

Edit `src/pages/index.tsx`. At the top of the file (after existing imports), add:

```ts
import { RestTV } from '../components/room/RestTV';
import { PebbleJar } from '../components/room/PebbleJar';
import { useRestedAd } from '../hooks/useRestedAd';
import { getEffectiveRestsToday } from '../services/restService';
```

Then, just below the existing module-level constants (before the `HomeScreen` function declaration), add:

```ts
// Normalized room coordinates. MAILBOX_POSITION represents the visual
// location of the mailbox utility icon — the utility stack itself stays
// pixel-positioned in its existing styles; this constant is the source of
// truth for room-layer fixtures that anchor below it.
const MAILBOX_POSITION = { x: 0.12, y: 0.29 } as const;
const TV_POSITION = {
  x: MAILBOX_POSITION.x + 0.02,
  y: MAILBOX_POSITION.y + 0.16,
};
const JAR_POSITION = { x: 0.18, y: 0.66 } as const;
```

- [ ] **Step 2: Wire the hook and derive `effectiveRestsToday`**

Inside `HomeScreen`, near the other zustand selectors (around line 60–66), add:

```ts
  const pebbleCount = useUserStore((s) => s.pebbleCount);
  const restsToday = useUserStore((s) => s.restsToday);
  const lastRestDate = useUserStore((s) => s.lastRestDate);
  const adState = useRestedAd();
  const todayStr = getLocalDateString(new Date());
  const effectiveRestsToday = getEffectiveRestsToday(restsToday, lastRestDate, todayStr);
```

- [ ] **Step 3: Render the sprites in the room layer**

Find the existing `roomPlacements.map(...)` block inside `<RoomBackground>` (around lines 225–238). Immediately after the closing `})}` of that map, add:

```tsx
            <RestTV
              position={TV_POSITION}
              adStatus={adState.status}
              effectiveRestsToday={effectiveRestsToday}
              onPress={() => { /* wired in Task 12 */ }}
            />
            <PebbleJar
              position={JAR_POSITION}
              pebbleCount={pebbleCount}
              onPress={() => { /* wired in Task 12 */ }}
            />
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat: render RestTV and PebbleJar in room layer with stub handlers"
```

---

### Task 11: Implement `grantRest()` orchestrator + boundary test

**Files:**
- Modify: `src/services/restService.ts`
- Test: `__tests__/restService.test.ts` (append)

`grantRest()` is the only call path that writes pebbles, increments `restsToday`, sets `lastRestAt`/`lastRestDate`, and appends rest letters into the mailbox delivered list. It is called **only** from the `onReward` callback in `RestPrompt` (Task 12). The test in this task asserts the orchestration shape; the call-site boundary is enforced by code review and the comment on the function.

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/restService.test.ts`:

```ts
// ─── grantRest() orchestrator ───────────────────────────────────────────────

jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { useUserStore } from '../src/store/userStore';
import { grantRest } from '../src/services/restService';
import { REST_LETTERS } from '../src/constants/restLetters';
import { STORAGE_KEYS } from '../src/constants/storage';

describe('grantRest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useUserStore.setState({
      level: 1,
      streak: 0,
      totalRecordCount: 0,
      recordedDaysCount: 0,
      roomStage: 1,
      pebbleCount: 0,
      restsToday: 0,
      lastRestDate: null,
      lastRestAt: null,
    });
  });

  it('grants 5–20 pebbles within the documented range', async () => {
    await grantRest();
    const after = useUserStore.getState().pebbleCount;
    expect(after).toBeGreaterThanOrEqual(5);
    expect(after).toBeLessThanOrEqual(20);
  });

  it('increments restsToday and sets lastRestDate / lastRestAt', async () => {
    await grantRest();
    const s = useUserStore.getState();
    expect(s.restsToday).toBe(1);
    expect(s.lastRestDate).not.toBeNull();
    expect(s.lastRestAt).not.toBeNull();
  });

  it('persists pebble count and dates to storage', async () => {
    await grantRest();
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.PEBBLE_COUNT,
      expect.any(Number),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.RESTS_TODAY,
      1,
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.LAST_REST_DATE,
      expect.any(String),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.LAST_REST_AT,
      expect.any(String),
    );
  });

  it('delivers a letter when its pebble threshold is crossed', async () => {
    // Starting at 25 with delta in [5, 20] gives newCount in [30, 45].
    // Threshold 30 is always crossed — deterministic regardless of RNG.
    useUserStore.setState({ pebbleCount: 25 });
    (storageService.load as jest.Mock).mockResolvedValueOnce(null);
    const result = await grantRest();
    expect(result.lettersDelivered.map((l) => l.id)).toContain('rest1');
    expect(storageService.save).toHaveBeenCalledWith(
      STORAGE_KEYS.MAILBOX_DELIVERED_IDS,
      expect.arrayContaining(['rest1']),
    );
  });

  it('does not re-deliver a letter the mailbox already has', async () => {
    // Same setup as above (always crosses 30), but rest1 already delivered.
    useUserStore.setState({ pebbleCount: 25 });
    (storageService.load as jest.Mock).mockResolvedValueOnce(['rest1']);
    const result = await grantRest();
    expect(result.lettersDelivered.map((l) => l.id)).not.toContain('rest1');
  });

  it('uses today (local) as lastRestDate', async () => {
    const before = new Date();
    await grantRest();
    const stored = useUserStore.getState().lastRestDate;
    const yyyy = before.getFullYear();
    const mm = String(before.getMonth() + 1).padStart(2, '0');
    const dd = String(before.getDate()).padStart(2, '0');
    expect(stored).toBe(`${yyyy}-${mm}-${dd}`);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/restService.test.ts`
Expected: tests fail with `grantRest is not a function` or similar.

- [ ] **Step 3: Implement `grantRest`**

Append to `src/services/restService.ts`:

```ts
import { useUserStore } from '../store/userStore';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { REST_LETTERS, RestLetter } from '../constants/restLetters';
import { getLocalDateString } from '../utils/date';

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/restService.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/restService.ts 소박이/__tests__/restService.test.ts
git commit -m "feat: grantRest orchestrator — pebbles, dates, letter delivery"
```

---

### Task 12: `RestPrompt` sheet + wire SDK → grantRest

**Files:**
- Create: `src/components/room/RestPrompt.tsx`
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Create RestPrompt**

Create `src/components/room/RestPrompt.tsx`:

```ts
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RestAdStatus } from '../../hooks/useRestedAd';
import { COLORS } from '../../constants/colors';

interface RestPromptProps {
  adStatus: RestAdStatus;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestPrompt({ adStatus, onConfirm, onCancel }: RestPromptProps) {
  const adReady = adStatus === 'ready';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>소박이랑 잠깐 쉬어갈까요? 📺</Text>
      <Text style={styles.body}>
        조용한 채널을 잠깐 보면{'\n'}소박이가 한 숨 돌릴 거예요.
      </Text>
      {!adReady && (
        <Text style={styles.hint}>준비 중이에요 🌿</Text>
      )}
      <View style={styles.buttonRow}>
        <Pressable style={styles.btnSecondary} onPress={onCancel}>
          <Text style={styles.btnSecondaryLabel}>다음에</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, !adReady && styles.btnPrimaryDisabled]}
          onPress={onConfirm}
          disabled={!adReady}
        >
          <Text style={styles.btnPrimaryLabel}>쉬어가기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  btnSecondaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.oliveDark,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Extend SheetType and wire rest sheet into index.tsx**

In `src/pages/index.tsx`, find the existing SheetType declaration (around line 80) and extend:

```ts
  type SheetType = 'mailbox' | 'bag' | 'rest';
```

Then add the rest prompt sheet rendering. Inside the `Animated.View` for the bottom sheet (currently containing `mailbox` and `bag` branches), add a new branch:

```tsx
        {activeSheet === 'rest' && (
          <RestPrompt
            adStatus={adState.status}
            onConfirm={() => {
              closeSheet();
              adState.show(() => {
                void grantRest();
              });
            }}
            onCancel={closeSheet}
          />
        )}
```

Import RestPrompt and grantRest at the top:

```ts
import { RestPrompt } from '../components/room/RestPrompt';
import { grantRest } from '../services/restService';
```

- [ ] **Step 3: Wire TV/jar tap handlers**

Find the `<RestTV ... onPress={() => { /* wired in Task 12 */ }} />` placeholder from Task 10 and replace with:

```tsx
            <RestTV
              position={TV_POSITION}
              adStatus={adState.status}
              effectiveRestsToday={effectiveRestsToday}
              onPress={() => {
                if (effectiveRestsToday >= 2) {
                  setBubbleMessage('오늘은 충분히 쉬었어요 🌿');
                  setBubbleVisible(true);
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
                  return;
                }
                if (adState.status === 'error') {
                  setBubbleMessage('지금은 조용한 채널이 없어요 🌿');
                  setBubbleVisible(true);
                  if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                  hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
                  return;
                }
                openSheet('rest');
              }}
            />
            <PebbleJar
              position={JAR_POSITION}
              pebbleCount={pebbleCount}
              onPress={() => {
                setBubbleMessage(`조약돌 ${pebbleCount}개`);
                setBubbleVisible(true);
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 2000);
              }}
            />
```

Note: this reuses the existing `bubbleMessage` / `bubbleVisible` / `hideTimeoutRef` state from `handleSobagiTap`. The bubble appears above Sobagi rather than above the sprite. That's intentional — there's only one bubble surface and overloading it keeps the room visually quiet.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/components/room/RestPrompt.tsx 소박이/src/pages/index.tsx
git commit -m "feat: RestPrompt sheet + SDK→grantRest wiring with boundary"
```

---

### Task 13: Merge rest letters into LETTER_LOOKUP + warmth overlay

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Merge rest letters into the lookup**

In `src/pages/index.tsx`, find `buildLetterLookup`:

```ts
function buildLetterLookup(): Map<string, MailboxLetter> {
  const map = new Map<string, MailboxLetter>();
  for (const l of PERSONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of ALL_SEASONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  return map;
}
```

Replace with:

```ts
function buildLetterLookup(): Map<string, MailboxLetter> {
  const map = new Map<string, MailboxLetter>();
  for (const l of PERSONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of ALL_SEASONAL_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  for (const l of REST_LETTERS) map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  return map;
}
```

Add the import at the top:

```ts
import { REST_LETTERS } from '../constants/restLetters';
```

- [ ] **Step 2: Add the rest-warmth overlay**

Find the existing warmth overlay block (around lines 208–217) inside `<RoomBackground>`:

```tsx
            <View
              style={[styles.atmosphereOverlay, { backgroundColor: '#E8C070', opacity: warmthOpacity }]}
              pointerEvents="none"
            />
```

Immediately after this block (still before the calm overlay), add a new overlay using `getRestWarmthOpacity`. First, add the import at the top:

```ts
import { getTimeOfDayTint, getWarmthOpacity, getCalmAtmosphereOpacity, getRestWarmthOpacity, CALM_OVERLAY_COLOR } from '../services/atmosphereService';
```

Then add the new overlay JSX:

```tsx
            <View
              style={[
                styles.atmosphereOverlay,
                { backgroundColor: '#E8C070', opacity: getRestWarmthOpacity(new Date(), lastRestAt) },
              ]}
              pointerEvents="none"
            />
```

Pull `lastRestAt` from the store next to the other selectors:

```ts
  const lastRestAt = useUserStore((s) => s.lastRestAt);
```

- [ ] **Step 3: Typecheck and run full suite**

Run: `npm run typecheck`
Expected: clean.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat: merge rest letters into mailbox + rest-warmth overlay"
```

---

### Task 14: Rest-aware idle line refresh

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Add the rest idle pool and merging function**

In `src/pages/index.tsx`, add a new module-level constant alongside `IDLE_MESSAGES`:

```ts
const REST_IDLE_MESSAGES = [
  '잠깐 쉬다 왔어요 🌿',
  '좋은 채널이었어요 📺',
  '한 숨 돌리니 좋네요 🌿',
];

function getIdleMessages(lastRestAtISO: string | null, now: Date): string[] {
  if (lastRestAtISO === null) return IDLE_MESSAGES;
  const minsSince = (now.getTime() - Date.parse(lastRestAtISO)) / 60_000;
  if (minsSince < 0 || minsSince >= 60) return IDLE_MESSAGES;
  return [...IDLE_MESSAGES, ...REST_IDLE_MESSAGES];
}
```

- [ ] **Step 2: Update `handleSobagiTap` to read from the merged pool**

Find `handleSobagiTap` (around line 185–197). Replace the body:

```ts
  const handleSobagiTap = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);

    const pool = getIdleMessages(lastRestAt, new Date());
    let idx = Math.floor(Math.random() * pool.length);
    if (idx === lastIndexRef.current && pool.length > 1) {
      idx = (idx + 1) % pool.length;
    }
    lastIndexRef.current = idx;
    setBubbleMessage(pool[idx] ?? '반가워요 🌿');
    setBubbleVisible(true);

    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
  }, [lastRestAt]);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat: rest-aware idle lines mix into Sobagi tap pool within 60min window"
```

---

## Phase 6 — Polish/edge cases

### Task 15: Post-watch visual sequence + final QA pass

**Files:**
- Modify: `src/pages/index.tsx`

Polish: after the SDK fires `userEarnedReward` and `grantRest()` resolves, pop a Sobagi line bubble announcing the rest. The persistent warmth overlay (Task 13) and the jar fill stage (Task 9) update automatically from state. Pebble counter "+N" rising animation is intentionally minimal — we use the bubble for textual feedback rather than a separate overlay. This keeps the room visually quiet, in line with the philosophy.

- [ ] **Step 1: Show the post-watch bubble after grant resolves**

In `src/pages/index.tsx`, update the `onConfirm` callback inside the rest sheet:

```tsx
        {activeSheet === 'rest' && (
          <RestPrompt
            adStatus={adState.status}
            onConfirm={() => {
              closeSheet();
              adState.show(async () => {
                const result = await grantRest();
                // Quiet post-watch line. The bubble surface is shared with
                // Sobagi tap and the daily-done message; we just update text.
                setBubbleMessage(
                  result.lettersDelivered.length > 0
                    ? `소박이가 한 숨 돌렸어요 🌿  +${result.pebbleDelta}`
                    : `소박이가 한 숨 돌렸어요 🌿  +${result.pebbleDelta}`,
                );
                setBubbleVisible(true);
                if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
              });
            }}
            onCancel={closeSheet}
          />
        )}
```

Note: the letter delivery itself is silent (just the mailbox red-dot lighting up). The bubble shows the pebble delta either way — the spec says "no separate celebration" for letters.

- [ ] **Step 2: Visual QA — code-level read**

Walk through the following scenarios by reading state flow in `index.tsx` and confirming the behavior matches the spec's "Success criteria" list:

  - First-load, no prior rest:
    - `pebbleCount = 0`, `restsToday = 0`, `lastRestDate = null`, `lastRestAt = null`
    - `effectiveRestsToday = 0` → TV opacity reads from `adStatus`
    - Jar opacity = 0.40 (empty stage)
    - No warmth overlay (`getRestWarmthOpacity(now, null) = 0`)

  - Just watched (within 60 min):
    - `pebbleCount` increased by 5–20, jar may change stage
    - `restsToday = 1`, `lastRestDate = today`, `lastRestAt = recent`
    - Warmth overlay active, fades over hour
    - Idle pool includes rest lines
    - TV still available

  - Watched twice today:
    - `effectiveRestsToday = 2`, TV opacity = 0.35
    - Tap → bubble: "오늘은 충분히 쉬었어요 🌿"

  - Next day after watching twice:
    - `lastRestDate !== todayStr` → `effectiveRestsToday = 0`
    - TV opacity returns to available
    - Jar opacity unchanged (pebbleCount accumulates forever)
    - Warmth overlay: most likely faded to 0 unless watch happened in the last hour

  - SDK unsupported:
    - `adStatus = 'unsupported'` → `<RestTV />` returns null
    - Jar still renders; pebble count stays at whatever it was loaded with
    - No fallback messaging

  - Ad load error:
    - `adStatus = 'error'` → TV opacity = 0.35
    - Tap → bubble: "지금은 조용한 채널이 없어요 🌿"

  - User dismisses ad without earning reward:
    - `dismissed` event fires; hook returns to `loading` then `ready`
    - `userEarnedReward` did not fire → `grantRest()` not called
    - No pebbles, no warmth, no `restsToday` increment

- [ ] **Step 3: Run typecheck + full test suite**

Run: `npm run typecheck`
Expected: clean.

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat: post-watch bubble announces rest with pebble delta"
```

- [ ] **Step 5: Final summary commit (optional handoff doc)**

If a docs handoff is conventional in this repo (see `소박이/docs/SOBAGI_CURRENT_STATE.md`), update it with the rest-TV landing summary. If not, skip.

---

## Verification matrix (from spec success criteria)

| Spec criterion | Verified by |
|---|---|
| TV renders below mailbox visually | Task 10 (position constants) + on-device check |
| Jar renders in floor-left | Task 10 (JAR_POSITION) |
| Prompt sheet opens on TV tap | Task 12 (onPress → openSheet('rest')) |
| Watch grants 5–20 pebbles | Task 11 tests |
| Warmth pulse + Sobagi line + letter | Tasks 11 + 13 + 15 |
| Dismiss without reward → nothing | Task 7 (hook only calls onReward on userEarnedReward) |
| 3rd tap of day → "오늘은 충분히 쉬었어요 🌿" | Task 12 (effectiveRestsToday >= 2 branch) |
| isSupported = false → TV hidden | Task 8 (`if (adStatus === 'unsupported') return null`) |
| Jar fill stages change | Task 9 (fillStage function) |
| Tap jar → "조약돌 N개" bubble | Task 12 (jar onPress) |
| Letters mix invisibly into mailbox | Task 13 (LETTER_LOOKUP merge) |
| Typecheck clean | Task 6 onward |
| New tests pass | Tasks 1, 2, 5, 11 |
| Full Jest suite green | Final task |
