# Sobagi Long-Term Emotional Progression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the five immediately-buildable systems from the progression design spec: found item trigger (commit existing), atmosphere overlay, dialogue tier expansion, dynamic mailbox, and bag new-item dot.

**Architecture:** Five independent task groups. Each group produces working, testable software on its own and can be executed in isolation. All groups share a common storage pattern. Groups A and B have zero asset dependencies. Groups C, D, and E modify `src/pages/index.tsx` — execute them sequentially if running in the same session to avoid merge conflicts.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess`), Zustand 5, Granite SDK, Jest. No new npm packages required.

**Spec:** `docs/superpowers/specs/2026-05-16-sobagi-long-term-progression-design.md`

---

## File Map

| File | Action | Group |
|------|--------|-------|
| `src/services/foundItemService.ts` | Already created (untracked) — test and commit | A |
| `src/constants/findableItems.ts` | Already created (untracked) — test and commit | A |
| `src/services/atmosphereService.ts` | Create | B |
| `__tests__/atmosphereService.test.ts` | Create | B |
| `src/pages/index.tsx` | Modify — atmosphere overlay | B |
| `src/constants/dialogue.ts` | Create | C |
| `src/services/dialogueService.ts` | Create | C |
| `__tests__/dialogueService.test.ts` | Create | C |
| `src/pages/record.tsx` | Modify — use dialogueService | C |
| `src/constants/storage.ts` | Modify — add keys (groups B, C, D, E) | B then C then D then E |
| `src/hooks/useAppInit.ts` | Modify — lastVisitDate, mailbox delivery, bag dot | C then D then E |
| `src/constants/letters.ts` | Create | D |
| `src/pages/index.tsx` | Modify — dynamic letters | D |
| `src/pages/index.tsx` | Modify — bag new-item dot | E |

---

## Note on Testing

Pure service/constant files (`atmosphereService`, `dialogueService`, `foundItemService`) are unit-tested in `__tests__/`. React Native component changes cannot be unit-tested here — verify them in the Granite dev server with `npm run dev`. After each task: run `npm test` to confirm all suites still pass, and `npm run typecheck` for any TypeScript changes.

---

## Task Group A: Found Item System — Test and Commit

`foundItemService.ts` and `findableItems.ts` already exist as untracked files. The service is already wired into `useAppInit.ts`. This group adds tests and commits the work.

### Task A1: Write tests for foundItemService

**Files:**
- Create: `__tests__/foundItemService.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// __tests__/foundItemService.test.ts
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { checkForFoundItem, promoteStaged } from '../src/services/foundItemService';
import { Expense } from '../src/types';

const mockLoad = storageService.load as jest.MockedFunction<typeof storageService.load>;

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1',
  amount: 4500,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
});

describe('checkForFoundItem', () => {
  it('does nothing if pending item already exists', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-pending-item-id') return 'f1';
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if staged item already exists', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if recordedDaysCount is below grace period (< 3)', async () => {
    await checkForFoundItem([makeExpense()], 2);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if all 8 items already found', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('stages an item when trigger fires and no cooldown is active', async () => {
    // T4 trigger: small cafe purchase under 6,000
    const smallCafe = makeExpense({ amount: 4500, category: 'cafe' });
    await checkForFoundItem([smallCafe], 5);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });
});

describe('promoteStaged', () => {
  it('does nothing if no staged item exists', async () => {
    await promoteStaged();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if lastItemDate is today', async () => {
    const today = new Date().toISOString().slice(0, 10);
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      if (key === 'sobagi-last-item-date') return today;
      return null;
    });
    await promoteStaged();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('promotes staged to pending when called on a new day', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      if (key === 'sobagi-last-item-date') return '2020-01-01';
      return null;
    });
    await promoteStaged();
    expect(storageService.save).toHaveBeenCalledWith('sobagi-pending-item-id', 'f1');
    expect(storageService.save).toHaveBeenCalledWith('sobagi-staged-item-id', null);
  });
});
```

- [ ] **Step 2: Run the tests — expect them to pass**

```
cd 소박이 && npm test -- --testPathPattern="foundItemService"
```

Expected: suite passes. If any test fails, read the error and fix the test (the service is already written; the test is what's new here).

- [ ] **Step 3: Commit new files**

```
git add 소박이/src/services/foundItemService.ts 소박이/src/constants/findableItems.ts 소박이/src/hooks/useAppInit.ts 소박이/__tests__/foundItemService.test.ts 소박이/src/constants/storage.ts
git commit -m "feat: implement found item trigger with staged delivery and tests"
```

---

## Task Group B: Atmosphere Overlay

Two stacked color overlays on the room background: time-of-day tint (5 zones by device hour) and warmth drift (opacity grows with `recordedDaysCount`). Pure color math — no assets needed.

### Task B1: Create atmosphereService

**Files:**
- Create: `src/services/atmosphereService.ts`
- Create: `__tests__/atmosphereService.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// __tests__/atmosphereService.test.ts
import { getTimeOfDayTint, getWarmthOpacity } from '../src/services/atmosphereService';

describe('getTimeOfDayTint', () => {
  it('returns null for morning hours (baseline)', () => {
    expect(getTimeOfDayTint(7)).toBeNull();
    expect(getTimeOfDayTint(9)).toBeNull();
    expect(getTimeOfDayTint(11)).toBeNull();
  });

  it('returns cool blue for dawn (5–6)', () => {
    const tint = getTimeOfDayTint(5);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#C8D4E8');
    expect(tint!.opacity).toBe(0.07);
  });

  it('returns golden for afternoon (12–16)', () => {
    const tint = getTimeOfDayTint(14);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#F5E8C0');
  });

  it('returns amber for evening (17–20)', () => {
    const tint = getTimeOfDayTint(18);
    expect(tint).not.toBeNull();
    expect(tint!.color).toBe('#E8C070');
    expect(tint!.opacity).toBe(0.09);
  });

  it('returns dark for night (21–4)', () => {
    expect(getTimeOfDayTint(22)!.color).toBe('#2A3048');
    expect(getTimeOfDayTint(0)!.color).toBe('#2A3048');
    expect(getTimeOfDayTint(4)!.color).toBe('#2A3048');
  });

  it('covers hour 12 as afternoon (boundary)', () => {
    expect(getTimeOfDayTint(12)!.color).toBe('#F5E8C0');
  });

  it('covers hour 17 as evening (boundary)', () => {
    expect(getTimeOfDayTint(17)!.color).toBe('#E8C070');
  });

  it('covers hour 21 as night (boundary)', () => {
    expect(getTimeOfDayTint(21)!.color).toBe('#2A3048');
  });
});

describe('getWarmthOpacity', () => {
  it('returns 0 at day 0', () => {
    expect(getWarmthOpacity(0)).toBe(0);
  });

  it('returns a small positive value at day 7', () => {
    const v = getWarmthOpacity(7);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(0.03);
  });

  it('returns a moderate value by day 30', () => {
    const v = getWarmthOpacity(30);
    expect(v).toBeGreaterThan(0.02);
    expect(v).toBeLessThan(0.06);
  });

  it('caps at 0.06 by day 90', () => {
    expect(getWarmthOpacity(90)).toBeCloseTo(0.06, 3);
  });

  it('never exceeds 0.06 even at high day counts', () => {
    expect(getWarmthOpacity(200)).toBe(0.06);
    expect(getWarmthOpacity(500)).toBe(0.06);
  });

  it('is monotonically increasing', () => {
    expect(getWarmthOpacity(30)).toBeGreaterThan(getWarmthOpacity(7));
    expect(getWarmthOpacity(90)).toBeGreaterThan(getWarmthOpacity(30));
  });
});
```

- [ ] **Step 2: Run tests — expect to fail**

```
cd 소박이 && npm test -- --testPathPattern="atmosphereService"
```

Expected: FAIL — `atmosphereService` module not found.

- [ ] **Step 3: Implement atmosphereService**

```typescript
// src/services/atmosphereService.ts

export type TimeOfDayTint = {
  color: string;
  opacity: number;
};

export function getTimeOfDayTint(hour: number): TimeOfDayTint | null {
  if (hour >= 5 && hour < 7)   return { color: '#C8D4E8', opacity: 0.07 };
  if (hour >= 7 && hour < 12)  return null;
  if (hour >= 12 && hour < 17) return { color: '#F5E8C0', opacity: 0.08 };
  if (hour >= 17 && hour < 21) return { color: '#E8C070', opacity: 0.09 };
  return { color: '#2A3048', opacity: 0.10 };
}

// Eased warmth curve. Imperceptible day-to-day, unmistakable across months.
// Reaches 0.06 at day 90. Capped there permanently.
export function getWarmthOpacity(recordedDaysCount: number): number {
  if (recordedDaysCount <= 0) return 0;
  return Math.min(Math.sqrt(recordedDaysCount / 90) * 0.06, 0.06);
}
```

- [ ] **Step 4: Run tests — expect to pass**

```
cd 소박이 && npm test -- --testPathPattern="atmosphereService"
```

Expected: all 14 tests pass.

- [ ] **Step 5: Commit**

```
git add 소박이/src/services/atmosphereService.ts 소박이/__tests__/atmosphereService.test.ts
git commit -m "feat: add atmosphereService for time-of-day tint and warmth drift"
```

---

### Task B2: Add atmosphere overlay to HomeScreen

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Import atmosphereService at the top of index.tsx**

Find the import block. Add after the existing service imports:

```typescript
import { getTimeOfDayTint, getWarmthOpacity } from '../services/atmosphereService';
```

- [ ] **Step 2: Compute overlay values inside HomeScreen component**

Find this line inside `HomeScreen()`:
```typescript
const expenses = useExpenseStore((s) => s.expenses);
```

Add after it:
```typescript
const timeOfDayTint = getTimeOfDayTint(new Date().getHours());
const warmthOpacity = getWarmthOpacity(recordedDaysCount);
```

- [ ] **Step 3: Add overlay Views inside RoomBackground**

Find the `<RoomBackground ...>` opening tag (it renders children). Inside it, before any other children, add two overlay Views. The existing `<View style={styles.bottomFade} ...>` (if present from the atmosphere polish plan) or `<View style={styles.header}>` is the first child — insert before it:

```jsx
{/* atmosphere overlays — pointerEvents="none" so touches pass through */}
{timeOfDayTint !== null && (
  <View
    style={[styles.atmosphereOverlay, { backgroundColor: timeOfDayTint.color, opacity: timeOfDayTint.opacity }]}
    pointerEvents="none"
  />
)}
<View
  style={[styles.atmosphereOverlay, { backgroundColor: '#E8C070', opacity: warmthOpacity }]}
  pointerEvents="none"
/>
```

- [ ] **Step 4: Add atmosphereOverlay to StyleSheet**

In the `StyleSheet.create({...})` block, add:

```javascript
atmosphereOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
},
```

- [ ] **Step 5: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Run tests**

```
cd 소박이 && npm test
```

Expected: 3 suites (plus the new atmosphere suite), all passing.

- [ ] **Step 7: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "feat: add time-of-day and warmth drift atmosphere overlay to HomeScreen"
```

---

## Task Group C: Dialogue Tier System

Replaces the 5 fixed `EMOTION_MESSAGES` strings with tiered message pools. Adds soft observation messages that fire ~1-in-5 saves after Day 7, with a 4-save cooldown. The message is selected in `record.tsx` before navigating to the reaction screen.

### Task C1: Add storage keys for dialogue system

**Files:**
- Modify: `src/constants/storage.ts`

- [ ] **Step 1: Add new keys**

```typescript
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
} as const;
```

- [ ] **Step 2: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add 소박이/src/constants/storage.ts
git commit -m "feat: add LAST_VISIT_DATE and OBSERVATION_SAVE_COUNT storage keys"
```

---

### Task C2: Create dialogue constants

**Files:**
- Create: `src/constants/dialogue.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/constants/dialogue.ts
import { SobagiEmotion } from '../types';

export type DialogueTier = 1 | 2 | 3;

// Three pools per emotion per tier.
// Tier 1: stranger (Day 0–6). Tier 2: acquaintance (Day 7–29). Tier 3: old friend (Day 30+).
export const REACTION_POOLS: Record<DialogueTier, Record<SobagiEmotion, [string, string, string]>> = {
  1: {
    surprised:  ['오늘 처음 들렀네요 ✨', '처음 오셨군요. 반가워요 🌿', '새로 오셨네요 ✨'],
    excited:    ['따뜻한 하루 같았어요 🌿', '오늘도 이어지고 있네요 🌿', '조용히 이어지고 있어요 🍃'],
    sleepy:     ['이 시간에도 기록하다니... 소박이도 졸려요 zzz', '늦은 시간에 왔네요 🌙', '이 시간까지 기록해줬네요 🌙'],
    'soft-sad': ['오늘은 꽤 큰 날이었네요 🌿', '오늘은 좀 특별한 날이었네요', '큰 하루였네요 🌿'],
    happy:      ['조용히 기록해뒀어요 🌿', '오늘도 다녀왔네요 🌿', '잘 기록해뒀어요 🍃'],
  },
  2: {
    surprised:  ['또 처음인 날이네요 ✨', '오늘 처음 들렀네요 ✨', '이 시간에 처음 들렀네요 ✨'],
    excited:    ['요즘 자주 들르고 있네요 🌿', '이번 주도 이어지고 있어요 🌿', '따뜻하게 이어지고 있어요 🍃'],
    sleepy:     ['이 시간에 또 왔네요 🌙', '밤에도 기억해줘서 고마워요 🌙', '늦게까지 있었네요 🌙'],
    'soft-sad': ['오늘은 좀 큰 날이었네요 🌿', '특별한 날이었나봐요', '큰 날도 기록해줬네요 🌿'],
    happy:      ['또 왔네요. 반가워요 🍃', '이번에도 기록해줬네요 🌿', '조용히 다녀갔어요 🍃'],
  },
  3: {
    surprised:  ['오늘 처음 들렀네요 ✨', '어느새 처음인 날도 있네요 ✨', '오늘 첫 번째네요 ✨'],
    excited:    ['어느새 이렇게 됐네요 🌿', '이 방이 조금씩 달라지는 것 같아요 🍃', '조용히 계속되고 있네요 🌿'],
    sleepy:     ['이 시간까지 있었네요 🌙', '이 방은 밤에도 여기 있어요 🌙', '늦은 시간도 기억할게요 🌙'],
    'soft-sad': ['그런 날도 있어요 🌿', '오늘은 좀 큰 날이었네요 🌿', '다 기억해둘게요 🌿'],
    happy:      ['또 왔네요 🍃', '이 방이 기억하고 있어요 🌿', '오랜 친구처럼 왔네요 🍃'],
  },
};

export const OBSERVATION_POOLS: Record<'timeOfDay' | 'categoryWarm' | 'returnAfterGap' | 'quietDays', [string, string, string]> = {
  timeOfDay:      ['이 시간에 자주 오네요.', '요즘 이 시간대에 자주 들르네요.', '이 시간에 기록하는 게 익숙해진 것 같아요.'],
  categoryWarm:   ['따뜻한 걸 자주 찾게 되는 날인가 봐요.', '요즘 카페에 자주 가시나 봐요 ☕', '따뜻한 것들을 자주 기록하게 되네요.'],
  returnAfterGap: ['조용한 기록들이 조금씩 쌓이고 있어요.', '가끔씩 들러도, 다 기억하고 있어요 🌿', '오랜만이에요. 잘 지내셨어요? 🌿'],
  quietDays:      ['잠잠한 날들이 이어지고 있네요.', '조용한 한 주였네요 🍃', '잠잠하게 흘러가고 있어요 🌿'],
};
```

- [ ] **Step 2: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add 소박이/src/constants/dialogue.ts
git commit -m "feat: add tiered dialogue and observation message pools"
```

---

### Task C3: Create dialogueService with tests

**Files:**
- Create: `src/services/dialogueService.ts`
- Create: `__tests__/dialogueService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/dialogueService.test.ts
import {
  getDialogueTier,
  selectReactionMessage,
  detectObservationType,
  selectObservationMessage,
} from '../src/services/dialogueService';
import { Expense } from '../src/types';

const makeExpense = (hour = 14, category: Expense['category'] = 'food', daysAgo = 0): Expense => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: String(Math.random()),
    amount: 5000,
    category,
    sobagiEmotion: 'happy',
    createdAt: d.toISOString(),
  };
};

describe('getDialogueTier', () => {
  it('returns 1 for Day 0–6', () => {
    expect(getDialogueTier(0)).toBe(1);
    expect(getDialogueTier(6)).toBe(1);
  });
  it('returns 2 for Day 7–29', () => {
    expect(getDialogueTier(7)).toBe(2);
    expect(getDialogueTier(29)).toBe(2);
  });
  it('returns 3 for Day 30+', () => {
    expect(getDialogueTier(30)).toBe(3);
    expect(getDialogueTier(90)).toBe(3);
  });
});

describe('selectReactionMessage', () => {
  it('returns a non-empty string for every emotion × tier combination', () => {
    const emotions = ['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'] as const;
    const tiers = [1, 2, 3] as const;
    for (const emotion of emotions) {
      for (const tier of tiers) {
        const msg = selectReactionMessage(emotion, tier);
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('detectObservationType', () => {
  it('returns null when recordedDaysCount < 7', () => {
    const result = detectObservationType({
      expenses: [makeExpense(22, 'cafe', 0)],
      lastVisitDate: null,
      recordedDaysCount: 5,
      savesSinceLastObservation: 10,
      currentHour: 22,
    });
    expect(result).toBeNull();
  });

  it('returns null when savesSinceLastObservation < 4', () => {
    const result = detectObservationType({
      expenses: [makeExpense(22, 'cafe', 0)],
      lastVisitDate: null,
      recordedDaysCount: 10,
      savesSinceLastObservation: 3,
      currentHour: 22,
    });
    expect(result).toBeNull();
  });

  it('returns returnAfterGap when gap >= 5 days regardless of random', () => {
    const gapDate = new Date();
    gapDate.setDate(gapDate.getDate() - 6);
    const lastVisitDate = gapDate.toISOString().slice(0, 10);
    // Call multiple times — returnAfterGap is forced (no random gate)
    let found = false;
    for (let i = 0; i < 20; i++) {
      const result = detectObservationType({
        expenses: [makeExpense(14, 'food', 0)],
        lastVisitDate,
        recordedDaysCount: 10,
        savesSinceLastObservation: 10,
        currentHour: 14,
      });
      if (result === 'returnAfterGap') { found = true; break; }
    }
    expect(found).toBe(true);
  });
});

describe('selectObservationMessage', () => {
  it('returns a non-empty string for each observation type', () => {
    const types = ['timeOfDay', 'categoryWarm', 'returnAfterGap', 'quietDays'] as const;
    for (const t of types) {
      const msg = selectObservationMessage(t);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests — expect to fail**

```
cd 소박이 && npm test -- --testPathPattern="dialogueService"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement dialogueService**

```typescript
// src/services/dialogueService.ts
import { SobagiEmotion, Expense } from '../types';
import { DialogueTier, REACTION_POOLS, OBSERVATION_POOLS } from '../constants/dialogue';
import { getLocalDateString } from '../utils/date';

export type ObservationType = 'timeOfDay' | 'categoryWarm' | 'returnAfterGap' | 'quietDays';

export { DialogueTier };

export function getDialogueTier(recordedDaysCount: number): DialogueTier {
  if (recordedDaysCount >= 30) return 3;
  if (recordedDaysCount >= 7)  return 2;
  return 1;
}

export function selectReactionMessage(emotion: SobagiEmotion, tier: DialogueTier): string {
  const pool = REACTION_POOLS[tier][emotion];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function selectObservationMessage(type: ObservationType): string {
  const pool = OBSERVATION_POOLS[type];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

type ObservationContext = {
  expenses: Expense[];
  lastVisitDate: string | null;
  recordedDaysCount: number;
  savesSinceLastObservation: number;
  currentHour: number;
};

function getTimeZone(hour: number): 'night' | 'morning' | 'afternoon' | 'evening' | 'lateNight' {
  if (hour >= 5  && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  if (hour >= 21 && hour < 24) return 'lateNight';
  return 'night'; // 0–4
}

function calendarDaysBetween(later: string, earlier: string): number {
  const a = new Date(later + 'T12:00:00').getTime();
  const b = new Date(earlier + 'T12:00:00').getTime();
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Returns an observation type to show, or null if none should fire.
// returnAfterGap bypasses the ~1-in-5 random gate (it's a meaningful moment).
// All other types require the random gate to keep observations rare.
export function detectObservationType(ctx: ObservationContext): ObservationType | null {
  if (ctx.recordedDaysCount < 7) return null;
  if (ctx.savesSinceLastObservation < 4) return null;

  const today = getLocalDateString(new Date());

  // Return after gap: forced if gap >= 5 days (bypasses random gate)
  if (ctx.lastVisitDate !== null && ctx.lastVisitDate !== today) {
    if (calendarDaysBetween(today, ctx.lastVisitDate) >= 5) return 'returnAfterGap';
  }

  // All other observations: ~1 in 5 chance
  if (Math.random() >= 0.2) return null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = getLocalDateString(sevenDaysAgo);

  const recentExpenses = ctx.expenses.filter(
    (e) => getLocalDateString(new Date(e.createdAt)) >= sevenDaysAgoStr,
  );

  // Time-of-day rhythm: >= 3 records in same time zone over past 7 days
  const currentZone = getTimeZone(ctx.currentHour);
  const sameZoneCount = recentExpenses.filter(
    (e) => getTimeZone(new Date(e.createdAt).getHours()) === currentZone,
  ).length;
  if (sameZoneCount >= 3) return 'timeOfDay';

  // Category warmth: café or food dominant in last 10 records
  const recent10 = ctx.expenses.slice(-10);
  const warmCount = recent10.filter(
    (e) => e.category === 'cafe' || e.category === 'food',
  ).length;
  if (warmCount >= 6) return 'categoryWarm';

  // Quiet days: fewer than 3 distinct recording days in the past 7 days
  const recentDays = new Set(
    recentExpenses.map((e) => getLocalDateString(new Date(e.createdAt))),
  ).size;
  if (recentDays < 3) return 'quietDays';

  return null;
}
```

- [ ] **Step 4: Run tests — expect to pass**

```
cd 소박이 && npm test -- --testPathPattern="dialogueService"
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```
git add 소박이/src/services/dialogueService.ts 소박이/__tests__/dialogueService.test.ts
git commit -m "feat: add dialogueService with tier selection and observation detection"
```

---

### Task C4: Save lastVisitDate in useAppInit

**Files:**
- Modify: `src/hooks/useAppInit.ts`

- [ ] **Step 1: Import the new storage key and save lastVisitDate after hydration**

Find the `useAppInit.ts` file. After the line:

```typescript
await promoteStaged();
await checkForFoundItem(expenses ?? [], recomputedDays);
```

Add:

```typescript
// Save today as lastVisitDate (used by dialogueService for gap detection)
const today = getLocalDateString(new Date());
void storageService.save(STORAGE_KEYS.LAST_VISIT_DATE, today);
```

- [ ] **Step 2: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add 소박이/src/hooks/useAppInit.ts
git commit -m "feat: save lastVisitDate on app open for dialogue gap detection"
```

---

### Task C5: Wire dialogueService into record.tsx

**Files:**
- Modify: `src/pages/record.tsx`

- [ ] **Step 1: Add imports at the top of record.tsx**

Find the existing imports. Add after the `EMOTION_MESSAGES` import line:

```typescript
import { getDialogueTier, selectReactionMessage, detectObservationType, selectObservationMessage } from '../services/dialogueService';
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
```

- [ ] **Step 2: Add recordedDaysCount and observation state to the component**

Find in `RecordScreen()`:

```typescript
const streak = useUserStore((s) => s.streak);
```

Add after it:

```typescript
const recordedDaysCount = useUserStore((s) => s.recordedDaysCount);
const totalRecordCount = useUserStore((s) => s.totalRecordCount);
const expenses = useExpenseStore((s) => s.expenses);
const [lastVisitDate, setLastVisitDate] = useState<string | null>(null);
const [lastObservationSaveCount, setLastObservationSaveCount] = useState(0);

useEffect(() => {
  Promise.all([
    storageService.load<string>(STORAGE_KEYS.LAST_VISIT_DATE),
    storageService.load<number>(STORAGE_KEYS.OBSERVATION_SAVE_COUNT),
  ]).then(([visitDate, obsSaveCount]) => {
    if (visitDate !== null) setLastVisitDate(visitDate);
    if (obsSaveCount !== null) setLastObservationSaveCount(obsSaveCount);
  });
}, []);
```

- [ ] **Step 3: Replace the message selection in handleSave**

Find in `handleSave`:

```typescript
setEmotion(sobagiEmotion, EMOTION_MESSAGES[sobagiEmotion]);
```

Replace with:

```typescript
const tier = getDialogueTier(recordedDaysCount);
const savesSinceLastObservation = totalRecordCount - lastObservationSaveCount;
const observationType = detectObservationType({
  expenses,
  lastVisitDate,
  recordedDaysCount,
  savesSinceLastObservation,
  currentHour: new Date().getHours(),
});

let message: string;
if (observationType !== null) {
  message = selectObservationMessage(observationType);
  // Record when this observation fired so the cooldown resets
  void storageService.save(STORAGE_KEYS.OBSERVATION_SAVE_COUNT, totalRecordCount + 1);
} else {
  message = selectReactionMessage(sobagiEmotion, tier);
}

setEmotion(sobagiEmotion, message);
```

- [ ] **Step 4: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors. If TypeScript complains about `expenses` not being imported, check that `useExpenseStore` import and usage are correct.

- [ ] **Step 5: Run all tests**

```
cd 소박이 && npm test
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```
git add 소박이/src/pages/record.tsx
git commit -m "feat: use tiered dialogue and observation messages in record flow"
```

---

## Task Group D: Dynamic Mailbox System

Replaces the hardcoded 2-letter LETTERS array with a content-managed system. Personal letters are delivered at `recordedDaysCount` thresholds. Seasonal world letters are delivered on calendar dates. All letters persist as a quiet archive.

### Task D1: Create letters constants

**Files:**
- Create: `src/constants/letters.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/constants/letters.ts

export type PersonalLetter = {
  id: string;
  triggerDays: number;  // deliver when recordedDaysCount >= this
  sig: string;
  body: string;
};

export type SeasonalLetter = {
  id: string;          // format: 'seasonal-{name}-{yyyy}', e.g. 'seasonal-spring-2026'
  month: number;       // 1–12: calendar month for delivery window
  day: number;         // day of month: delivery on or after this date
  endDay: number;      // stop delivering after this day of month
  sig: string;
  body: string;
};

// Personal letters from Sobagi — intimate, milestone-triggered.
// id '001' matches the hardcoded welcome letter so existing read-IDs stay valid.
export const PERSONAL_LETTERS: PersonalLetter[] = [
  {
    id: '001',
    triggerDays: 0,
    sig: '— 소박이',
    body: '안녕하세요. 처음 오셨군요.\n\n이 방은 조용한 곳이에요. 작은 것들을 여기에 두고 가셔도 돼요.\n소박이가 잘 보관할게요 🌿',
  },
  {
    id: 'personal-week1',
    triggerDays: 7,
    sig: '— 소박이',
    body: '벌써 일주일이 됐네요.\n\n짧은 것 같지만, 꽤 많은 날들을 함께 보냈어요.\n앞으로도 가끔씩 들러주세요 🍃',
  },
  {
    id: 'personal-month1',
    triggerDays: 30,
    sig: '— 소박이',
    body: '한 달이 됐어요.\n\n이 방도 조금씩 달라지고 있는 것 같아요. 잘 모르겠지만요.\n그냥 — 고마워요 🌿',
  },
  {
    id: 'personal-month3',
    triggerDays: 90,
    sig: '— 소박이',
    body: '세 달이 넘었네요.\n\n이 방에 시간이 쌓인 것 같아요. 처음이랑은 좀 다른 것 같기도 하고요.\n계속 이렇게 지내도 될 것 같아요 🌿',
  },
];

// World letters — arrive on calendar date windows, once per year.
// id includes the year so the same letter isn't re-delivered next year without new content.
// To add 2027 letters: copy each entry with year bumped.
export const SEASONAL_LETTERS_2026: SeasonalLetter[] = [
  {
    id: 'seasonal-spring-2026',
    month: 3,
    day: 1,
    endDay: 15,
    sig: '— 창가에서',
    body: '창문 너머로 꽃잎이 날리고 있어요.\n\n봄이 오면 항상 이 냄새가 나는 것 같아요.\n오늘 하루도 어딘가에 남겨두세요 🌸',
  },
  {
    id: 'seasonal-rain-2026',
    month: 6,
    day: 20,
    endDay: 31,
    sig: '— 창가에서',
    body: '비가 오는 날엔 어쩐지 더 조용해지는 것 같아요.\n\n우산을 챙겼나요?\n젖은 신발 냄새가 나는 날도 기록해둬요 🌧️',
  },
  {
    id: 'seasonal-autumn-2026',
    month: 10,
    day: 10,
    endDay: 25,
    sig: '— 창가에서',
    body: '낙엽이 지기 시작했어요.\n\n가을엔 어쩐지 따뜻한 게 자꾸 생각나요.\n오늘 마신 것도 여기 두고 가세요 ☕',
  },
  {
    id: 'seasonal-yearend-2026',
    month: 12,
    day: 20,
    endDay: 31,
    sig: '— 창가에서',
    body: '올해도 거의 다 갔네요.\n\n이 방에 남겨진 것들을 가끔 꺼내 봐요.\n작은 것들도 다 기억되고 있어요 🌿',
  },
];

export const ALL_SEASONAL_LETTERS = [...SEASONAL_LETTERS_2026];
```

- [ ] **Step 2: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add 소박이/src/constants/letters.ts
git commit -m "feat: add personal and seasonal letter content definitions"
```

---

### Task D2: Add mailbox storage key and delivery logic in useAppInit

**Files:**
- Modify: `src/constants/storage.ts`
- Modify: `src/hooks/useAppInit.ts`

- [ ] **Step 1: Add MAILBOX_DELIVERED_IDS to storage.ts**

```typescript
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
} as const;
```

- [ ] **Step 2: Add letter delivery check function to useAppInit.ts**

At the top of `useAppInit.ts`, add the new imports:

```typescript
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';
```

Then add a helper function before `useAppInit`:

```typescript
async function checkAndDeliverLetters(recordedDaysCount: number): Promise<void> {
  const today = new Date();
  const month = today.getMonth() + 1; // 1–12
  const dayOfMonth = today.getDate();

  const deliveredIds = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];
  const deliveredSet = new Set(deliveredIds);
  let changed = false;

  // Personal letters: deliver when recordedDaysCount crosses threshold
  for (const letter of PERSONAL_LETTERS) {
    if (!deliveredSet.has(letter.id) && recordedDaysCount >= letter.triggerDays) {
      deliveredSet.add(letter.id);
      changed = true;
    }
  }

  // Seasonal letters: deliver when today falls in the calendar window
  for (const letter of ALL_SEASONAL_LETTERS) {
    if (!deliveredSet.has(letter.id) && month === letter.month && dayOfMonth >= letter.day && dayOfMonth <= letter.endDay) {
      deliveredSet.add(letter.id);
      changed = true;
    }
  }

  if (changed) {
    await storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, [...deliveredSet]);
  }
}
```

- [ ] **Step 3: Call checkAndDeliverLetters in loadStored**

Inside `loadStored()`, after the existing `promoteStaged` and `checkForFoundItem` calls, add:

```typescript
await checkAndDeliverLetters(recomputedDays);
```

- [ ] **Step 4: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```
cd 소박이 && npm test
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```
git add 소박이/src/constants/storage.ts 소박이/src/hooks/useAppInit.ts 소박이/src/constants/letters.ts
git commit -m "feat: add letter delivery logic — personal thresholds and seasonal calendar triggers"
```

---

### Task D3: Update HomeScreen to use dynamic letters

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Add imports at the top of index.tsx**

Add after the existing service imports:

```typescript
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';
```

- [ ] **Step 2: Replace the hardcoded LETTERS array with a derived state**

Find and **delete** the hardcoded `LETTERS` constant (around lines 25–38):

```typescript
const LETTERS = [
  {
    id: '001',
    date: '5월 초',
    body: '...',
    sig: '...',
  },
  {
    id: '002',
    date: '5월 15일',
    body: '...',
    sig: '...',
  },
] as const;

const ALL_LETTER_IDS = LETTERS.map((l) => l.id);
```

Add this replacement directly after the `FINDABLE_ITEMS` import:

```typescript
// All letters available in the app. Combine personal + seasonal.
// Display order: by deliveredIds insertion order (newest last = bottom of list).
type MailboxLetter = { id: string; body: string; sig: string };

function buildLetterLookup(): Map<string, MailboxLetter> {
  const map = new Map<string, MailboxLetter>();
  for (const l of PERSONAL_LETTERS) {
    map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  }
  for (const l of ALL_SEASONAL_LETTERS) {
    map.set(l.id, { id: l.id, body: l.body, sig: l.sig });
  }
  return map;
}

const LETTER_LOOKUP = buildLetterLookup();
```

- [ ] **Step 3: Replace the deliveredIds state in HomeScreen**

Find this `useEffect` in `HomeScreen()` that loads mailbox state:

```typescript
useEffect(() => {
  Promise.all([
    storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
    storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
    storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
  ]).then(([readIdsRaw, foundIds, pending]) => {
```

Update the `Promise.all` to also load `MAILBOX_DELIVERED_IDS`:

```typescript
useEffect(() => {
  Promise.all([
    storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
    storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
    storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
    storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS),
  ]).then(([readIdsRaw, foundIds, pending, deliveredIds]) => {
    if (readIdsRaw) setReadIds(new Set(readIdsRaw));
    if (foundIds) setFoundItemIds(foundIds);
    if (pending != null) {
      pendingRef.current = pending;
      setPendingNewItemId(pending);
    }
    if (deliveredIds) setDeliveredLetterIds(deliveredIds);
  });
}, []);
```

- [ ] **Step 4: Add deliveredLetterIds state**

Find:

```typescript
const [readIds, setReadIds] = useState<ReadonlySet<string>>(new Set());
```

Add after it:

```typescript
const [deliveredLetterIds, setDeliveredLetterIds] = useState<string[]>([]);
```

- [ ] **Step 5: Derive the rendered letters list**

Find:

```typescript
const mailboxUnread = LETTERS.some((l) => !readIds.has(l.id));
```

Replace with:

```typescript
const deliveredLetters: MailboxLetter[] = deliveredLetterIds
  .map((id) => LETTER_LOOKUP.get(id))
  .filter((l): l is MailboxLetter => l !== undefined);

const mailboxUnread = deliveredLetters.some((l) => !readIds.has(l.id));
```

- [ ] **Step 6: Update the mailbox openSheet handler to use deliveredLetters**

Find inside `openSheet` where `unreadAtOpenRef` is set and read-all is triggered:

```typescript
if (type === 'mailbox') {
  unreadAtOpenRef.current = new Set(LETTERS.filter((l) => !readIds.has(l.id)).map((l) => l.id));
  if (unreadAtOpenRef.current.size > 0) {
    setReadIds(new Set(ALL_LETTER_IDS));
    storageService.save(STORAGE_KEYS.MAILBOX_READ_IDS, ALL_LETTER_IDS);
  }
}
```

Replace with:

```typescript
if (type === 'mailbox') {
  const unreadIds = deliveredLetters.filter((l) => !readIds.has(l.id)).map((l) => l.id);
  unreadAtOpenRef.current = new Set(unreadIds);
  if (unreadIds.length > 0) {
    const allIds = deliveredLetterIds;
    setReadIds(new Set(allIds));
    storageService.save(STORAGE_KEYS.MAILBOX_READ_IDS, allIds);
  }
}
```

- [ ] **Step 7: Update the mailbox JSX to iterate deliveredLetters**

Find the mailbox sheet content block that renders `LETTERS.map(...)`. Replace the entire letter-mapping JSX with:

```jsx
{deliveredLetters.map((letter) => (
  <Pressable
    key={letter.id}
    style={styles.letterCard}
    onPress={() => {/* existing letter tap handler if any */}}
  >
    {unreadAtOpenRef.current.has(letter.id) && (
      <View style={styles.letterBadge}>
        <Text style={styles.letterBadgeText}>새 편지</Text>
      </View>
    )}
    <Text style={styles.letterBody}>{letter.body}</Text>
    <Text style={styles.letterSig}>{letter.sig}</Text>
  </Pressable>
))}
```

> **Note:** Match the exact existing letter card JSX structure. Only change `LETTERS.map` → `deliveredLetters.map`, `letter.date` label if used, and reference `deliveredLetters` instead. The styles (`letterCard`, `letterBody`, `letterSig`, `letterBadge`) already exist — do not add new ones.

- [ ] **Step 8: Remove any remaining references to the old LETTERS / ALL_LETTER_IDS**

```
cd 소박이 && npm run typecheck
```

Fix any TypeScript errors about `LETTERS` or `ALL_LETTER_IDS` still being referenced.

- [ ] **Step 9: Run all tests**

```
cd 소박이 && npm test
```

Expected: all suites pass.

- [ ] **Step 10: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "feat: replace hardcoded mailbox letters with dynamic delivery system"
```

---

## Task Group E: Bag New-Item Dot

The existing amber dot on 🎒 only shows when a found item is pending. This task also lights it up when a new bag item (based on `minDays` threshold) has become available since the bag was last opened.

### Task E1: Add storage key and new-item detection

**Files:**
- Modify: `src/constants/storage.ts`
- Modify: `src/hooks/useAppInit.ts`
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Add LAST_BAG_OPEN_DAYS key to storage.ts**

```typescript
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
} as const;
```

- [ ] **Step 2: Commit storage.ts change**

```
git add 소박이/src/constants/storage.ts
git commit -m "feat: add LAST_BAG_OPEN_DAYS storage key"
```

---

### Task E2: Save LAST_BAG_OPEN_DAYS when bag is opened

**Files:**
- Modify: `src/pages/index.tsx`

- [ ] **Step 1: Add hasNewBagItem state**

Find:

```typescript
const [pendingNewItemId, setPendingNewItemId] = useState<string | null>(null);
```

Add after it:

```typescript
const [hasNewBagItem, setHasNewBagItem] = useState(false);
```

- [ ] **Step 2: Load and compute hasNewBagItem on mount**

In the existing `useEffect` that loads mailbox/found-item state, add `LAST_BAG_OPEN_DAYS` to the `Promise.all`:

```typescript
storageService.load<number>(STORAGE_KEYS.LAST_BAG_OPEN_DAYS),
```

In the `.then()` handler, add:

```typescript
if (lastBagOpenDays !== null) {
  // Check if any BAG_ITEMS have crossed their minDays threshold since last bag open
  const allItems = Object.values(BAG_ITEMS).flat();
  const newItemAvailable = allItems.some(
    (item) => item.minDays > lastBagOpenDays && item.minDays <= recordedDaysCount,
  );
  if (newItemAvailable) setHasNewBagItem(true);
}
```

> The `recordedDaysCount` variable is already available in `HomeScreen` via `useUserStore`.

- [ ] **Step 3: Save LAST_BAG_OPEN_DAYS when bag is opened**

In the `openSheet` callback, find:

```typescript
if (type === 'bag') {
  setBagTab('장신구');
  setSelectedBagItem(null);
  setSelectedFoundItem(null);
```

Add at the end of that block:

```typescript
  setHasNewBagItem(false);
  void storageService.save(STORAGE_KEYS.LAST_BAG_OPEN_DAYS, recordedDaysCount);
```

- [ ] **Step 4: Show dot when hasNewBagItem OR pendingNewItemId**

Find the bag TouchableOpacity JSX:

```jsx
{pendingNewItemId !== null && <View style={styles.bagDot} />}
```

Replace with:

```jsx
{(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.bagDot} />}
```

- [ ] **Step 5: Run typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Run all tests**

```
cd 소박이 && npm test
```

Expected: all suites pass.

- [ ] **Step 7: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "feat: show bag dot when new minDays items available since last bag open"
```

---

## Final Verification Checklist

After all groups are committed, do a holistic check with `npm run dev`:

- [ ] Room tint shifts noticeably between dawn/morning/afternoon/evening/night hours
- [ ] Warmth overlay is imperceptible at day 1 and visible at simulated day 90 (`getWarmthOpacity(90)` = 0.06 — test by temporarily passing 90 to the component)
- [ ] Reaction messages vary across saves (not the same string twice in a row)
- [ ] Observation messages appear occasionally and always reference behavior, never money amounts
- [ ] Mailbox shows dynamically delivered letters (test: temporarily set `recordedDaysCount` to 7 in devtools to trigger week1 letter)
- [ ] Hardcoded `'5월 초'` and `'5월 15일'` dates are gone from the mailbox
- [ ] Bag dot appears when opening app with a new bag item available (test: temporarily set `lastBagOpenDays` to 0 in storage and `recordedDaysCount` to 10)
- [ ] All 26 original tests still pass: `npm test`
- [ ] TypeScript clean: `npm run typecheck`

---

## Self-Review Notes

**Spec coverage:**
- ✅ Found item trigger (Group A) — service already built, wired, now tested and committed
- ✅ Atmosphere overlay (Group B) — time-of-day tint + warmth drift
- ✅ Dialogue tier expansion (Group C) — 3 pools per emotion × 3 tiers + observation layer
- ✅ `lastVisitDate` storage for gap detection (Task C4)
- ✅ 4-save observation cooldown via `OBSERVATION_SAVE_COUNT` (Task C5)
- ✅ Mailbox personal letters (Group D) — 4 threshold-triggered letters
- ✅ Mailbox seasonal letters (Group D) — 4 calendar-triggered world letters
- ✅ Bag new-item dot (Group E) — signals when minDays item newly available

**Type consistency:**
- `DialogueTier` defined in `dialogue.ts`, re-exported from `dialogueService.ts` ✅
- `ObservationType` defined and used in `dialogueService.ts` only ✅
- `MailboxLetter` type defined in `index.tsx` (local, not exported — correct for a page-level type) ✅
- `LETTER_LOOKUP` uses `MailboxLetter` consistently ✅
- `hasNewBagItem` is `boolean` state — used in JSX condition correctly ✅
- `lastBagOpenDays` is `number | null` from storage — guard check before use ✅

**Placeholder scan:** No TBDs, no "implement later," no forward references to undefined symbols.

**Known gap not in this plan (out of scope):** Room stage 2 (blocked on art assets), Sobagi idle behavior variants, room object overlays (plant/bookshelf/candle — design is ready, sprites not yet commissioned).
