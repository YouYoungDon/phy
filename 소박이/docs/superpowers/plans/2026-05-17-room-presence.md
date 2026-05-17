# Room Presence System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Items in Sobagi's bag gradually appear in her room and photocards — ambient, quiet, emotionally resonant — without any decoration-game UI.

**Architecture:** Extract `BAG_ITEMS` to a new `src/constants/bagItems.ts` with an extended type carrying optional `roomPresence` and `photocardAffinity` metadata. A new `roomPresenceService.ts` checks emotion / return-visit triggers on each app open and writes to two new storage keys. The home screen shows a one-line Sobagi prompt for `promptOnPlace: true` items; all others settle silently. PhotocardView gains an optional emoji overlay at the zone's normalized position.

**Tech Stack:** React Native 0.84 · TypeScript 5.8 (`noUncheckedIndexedAccess: true`) · Zustand 5 · existing `storageService` / `useAppInit` patterns

---

## MVP scope lock

**Ships in this plan:**
- `BagItem` type extension (roomPresence, photocardAffinity, ambientAffinity slots)
- BAG_ITEMS extracted to `src/constants/bagItems.ts`, room metadata added
- 5 new bag items (담요, 작은 식물, 엽서, 머그컵, 우산)
- `roomPresenceService.ts` — B/A/C placement logic, B→A drift, 나중에 auto-settle
- Two new storage keys (`ROOM_PLACEMENTS`, `PENDING_PLACEMENT`)
- Home screen placement prompt (one Sobagi line + 응/나중에 buttons)
- Photocard emoji overlay (placed items with matching `photocardAffinity`)

**Explicitly NOT in this plan:**
- Room sprite rendering (no assets)
- `timeAffinity` visual logic (type slot only)
- `temporaryAmbient`, `wearable`, `seasonal` systems (type slots only)
- Umbrella room presence (enters bag only; temporaryAmbient deferred)

---

## File map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/constants/bagItems.ts` | BagItem type, RoomZone, RoomPlacement, PendingPlacement, ZONE_SLOTS, BAG_ITEMS, ALL_BAG_ITEMS |
| Create | `src/services/roomPresenceService.ts` | Pure logic + async I/O for placement triggers |
| Create | `src/services/__tests__/roomPresenceService.test.ts` | Unit tests for pure placement logic |
| Modify | `src/constants/storage.ts` | +2 keys |
| Modify | `src/hooks/useAppInit.ts` | Wire roomPresenceService on app open |
| Modify | `src/pages/index.tsx` | Import from bagItems, load placement state, placement prompt UI |
| Modify | `src/components/photocard/PhotocardView.tsx` | itemOverlay prop + emoji render |
| Modify | `src/pages/reaction.tsx` | Compute + pass itemOverlay |

---

## Task 1: Storage keys + bagItems.ts

**Files:**
- Modify: `src/constants/storage.ts`
- Create: `src/constants/bagItems.ts`

- [ ] **Step 1.1: Add two storage keys**

Open `src/constants/storage.ts`. Replace the entire file content with:

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
  ROOM_PLACEMENTS: 'sobagi-room-placements',
  PENDING_PLACEMENT: 'sobagi-pending-placement',
} as const;
```

- [ ] **Step 1.2: Create `src/constants/bagItems.ts`**

Create this file:

```typescript
import { SobagiEmotion } from '../types';

export type RoomZone =
  | '창가'
  | '책상'
  | '침대옆'
  | '방구석'
  | '벽걸이'
  | '차코너'
  | '작은선반';

// Reserved for future systems — not implemented yet
export type AmbientAffinity =
  | 'room'
  | 'photocardOnly'
  | 'wearable'
  | 'temporaryAmbient'
  | 'seasonal';

export type BagTab = '장신구' | '재료' | '간식' | '장난감';

export type BagItem = {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  minDays: number;

  // Room placement — undefined means bag-only forever
  roomPresence?: {
    zones: [RoomZone, ...RoomZone[]];
    emotionAffinity?: SobagiEmotion[];
    promptOnPlace: boolean;
    minDaysInBag: number;
    // timeAffinity: reserved, not used in this implementation
  };

  // Photocard appearance — only for already-placed items
  photocardAffinity?: SobagiEmotion[];

  // Reserved — type slot for future systems
  ambientAffinity?: AmbientAffinity;
};

export type RoomPlacement = {
  itemId: string;
  zone: RoomZone;
  placedAt: string;                    // YYYY-MM-DD
  placementPath: 'B' | 'A' | 'C';     // internal only, never shown in UI
};

export type PendingPlacement = {
  itemId: string;
  pendingFrom: string;   // YYYY-MM-DD
  settleAfter: number;   // 3, 4, or 5 — jittered at 나중에 tap time
};

// Zone coordinate slots (normalized 0–1 relative to room background).
// Used by PhotocardView for overlay positioning. Room sprite renderer uses these
// when assets exist — not rendered in this implementation.
export const ZONE_SLOTS: Record<RoomZone, { x: number; y: number }[]> = {
  '창가':    [{ x: 0.78, y: 0.18 }],
  '책상':    [{ x: 0.72, y: 0.58 }, { x: 0.82, y: 0.60 }],
  '침대옆':  [{ x: 0.18, y: 0.62 }],
  '방구석':  [{ x: 0.12, y: 0.72 }],
  '벽걸이':  [{ x: 0.85, y: 0.30 }],
  '차코너':  [{ x: 0.20, y: 0.52 }],
  '작은선반':[{ x: 0.15, y: 0.38 }, { x: 0.22, y: 0.38 }],
};

export const BAG_TABS: BagTab[] = ['장신구', '재료', '간식', '장난감'];

export const BAG_ITEMS: Record<BagTab, BagItem[]> = {
  장신구: [
    {
      id: 'a1', emoji: '🌸', name: '꽃잎 핀',
      desc: '봄날에 주운 꽃잎이에요. 아직 향이 남아있는 것 같아요.',
      minDays: 0,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
      photocardAffinity: ['happy', 'surprised'],
    },
    {
      id: 'a2', emoji: '🌿', name: '잎새 브로치',
      desc: '창문에 기대다가 발견했어요. 잘 어울려요.',
      minDays: 5,
    },
    {
      id: 'a3', emoji: '🌙', name: '달 반지',
      desc: '밤에 살짝 반짝이는 작은 반지예요. 소박이가 아끼는 물건이에요.',
      minDays: 14,
      roomPresence: { zones: ['침대옆'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: false, minDaysInBag: 7 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    {
      id: 'a4', emoji: '🎀', name: '작은 리본',
      desc: '소박이가 아끼는 작은 리본이에요 🌿',
      minDays: 25,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    },
    // New item — day 50
    {
      id: 'a5', emoji: '📮', name: '엽서',
      desc: '어디선가 날아온 엽서예요. 읽을수록 마음이 따뜻해져요.',
      minDays: 50,
      roomPresence: { zones: ['작은선반', '책상'], promptOnPlace: false, minDaysInBag: 5 },
      photocardAffinity: ['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'],
    },
  ],
  재료: [
    {
      id: 'm1', emoji: '🍃', name: '찻잎',
      desc: '은은한 향이 나요. 차 한 잔 마시면 마음이 편해져요.',
      minDays: 0,
    },
    {
      id: 'm2', emoji: '🌰', name: '도토리',
      desc: '산책하다 주웠어요. 특별한 이유는 없어요.',
      minDays: 7,
      roomPresence: { zones: ['작은선반'], promptOnPlace: false, minDaysInBag: 14 },
    },
    {
      id: 'm3', emoji: '🍯', name: '꿀병',
      desc: '달콤한 꿀이 가득 들어있어요. 가끔 한 숟갈씩 먹어요.',
      minDays: 18,
      roomPresence: { zones: ['차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: false, minDaysInBag: 5 },
    },
    {
      id: 'm4', emoji: '🪵', name: '나뭇조각',
      desc: '결이 부드럽고 따뜻한 나뭇조각이에요.',
      minDays: 32,
      roomPresence: { zones: ['방구석'], promptOnPlace: false, minDaysInBag: 14 },
    },
    // New item — day 28
    {
      id: 'm5', emoji: '🧣', name: '담요',
      desc: '차가운 날 꺼내 드는 부드러운 담요예요.',
      minDays: 28,
      roomPresence: { zones: ['침대옆'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: true, minDaysInBag: 7 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    // New item — day 45
    {
      id: 'm6', emoji: '🪴', name: '작은 식물',
      desc: '창가에 놓아두면 잘 자라는 작은 식물이에요.',
      minDays: 45,
      roomPresence: { zones: ['창가', '방구석'], promptOnPlace: true, minDaysInBag: 14 },
      photocardAffinity: ['happy', 'surprised'],
    },
  ],
  간식: [
    {
      id: 's1', emoji: '🍪', name: '버터 쿠키',
      desc: '바삭하고 달콤해요. 소박이가 가장 좋아하는 간식이에요.',
      minDays: 0,
    },
    {
      id: 's2', emoji: '🍡', name: '쑥 경단',
      desc: '쑥향이 은은하게 나요. 봄에 만든 거예요.',
      minDays: 10,
    },
    {
      id: 's3', emoji: '☕', name: '따뜻한 커피',
      desc: '식기 전에 마셔요. 한 모금이면 마음이 따뜻해져요.',
      minDays: 20,
      roomPresence: { zones: ['책상', '차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: false, minDaysInBag: 7 },
      photocardAffinity: ['happy', 'excited'],
    },
    {
      id: 's4', emoji: '🍞', name: '작은 빵',
      desc: '갓 구운 빵이에요. 아직 따뜻해요.',
      minDays: 35,
    },
    // New item — day 55
    {
      id: 's5', emoji: '🫖', name: '머그컵',
      desc: '두 손으로 감싸면 따뜻해지는 머그컵이에요.',
      minDays: 55,
      roomPresence: { zones: ['책상', '차코너'], emotionAffinity: ['happy', 'excited'], promptOnPlace: true, minDaysInBag: 10 },
      photocardAffinity: ['happy', 'excited'],
    },
  ],
  장난감: [
    {
      id: 't1', emoji: '🪀', name: '요요',
      desc: '잘 못 하는데 그냥 갖고 있어요.',
      minDays: 3,
    },
    {
      id: 't2', emoji: '🎈', name: '작은 풍선',
      desc: '언제 들고 온 건지 모르겠지만, 아직 팡 안 터졌어요.',
      minDays: 12,
      roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 10 },
    },
    {
      id: 't3', emoji: '🌀', name: '팽이',
      desc: '조용히 돌아가는 걸 보고 있으면 마음이 고요해져요.',
      minDays: 22,
    },
    {
      id: 't4', emoji: '🧸', name: '작은 곰',
      desc: '오래된 곰 인형이에요. 낡았지만 소박이가 아껴요.',
      minDays: 40,
      roomPresence: { zones: ['작은선반', '방구석'], emotionAffinity: ['soft-sad', 'sleepy'], promptOnPlace: true, minDaysInBag: 14 },
      photocardAffinity: ['soft-sad', 'sleepy'],
    },
    // New item — day 35 (bag only; temporaryAmbient deferred)
    {
      id: 't5', emoji: '☂', name: '우산',
      desc: '비 오는 날 꺼내 쓰는 소박이의 우산이에요.',
      minDays: 35,
      ambientAffinity: 'temporaryAmbient',  // room presence deferred
    },
  ],
};

export const ALL_BAG_ITEMS: BagItem[] = Object.values(BAG_ITEMS).flat();
```

- [ ] **Step 1.3: Run typecheck — should pass**

```
cd 소박이 && npm run typecheck
```

Expected: no new errors (pre-existing `_404.tsx` errors are acceptable).

- [ ] **Step 1.4: Commit**

```
git add 소박이/src/constants/storage.ts 소박이/src/constants/bagItems.ts
git commit -m "feat: add room presence types, storage keys, and extended BAG_ITEMS"
```

---

## Task 2: roomPresenceService — pure logic + tests

**Files:**
- Create: `src/services/roomPresenceService.ts`
- Create: `src/services/__tests__/roomPresenceService.test.ts`

The service separates pure logic from I/O. Tests cover the pure functions.

- [ ] **Step 2.1: Write the test file first**

Create `src/services/__tests__/roomPresenceService.test.ts`:

```typescript
import {
  isDriftPhase,
  pickEligibleItems,
  selectCandidate,
  shouldAutoSettle,
} from '../roomPresenceService';
import { BagItem, RoomPlacement } from '../../constants/bagItems';

const makeItem = (overrides: Partial<BagItem> & Pick<BagItem, 'id'>): BagItem => ({
  emoji: '🌸', name: 'test', desc: 'test', minDays: 0, ...overrides,
});

describe('isDriftPhase', () => {
  it('returns false when below both thresholds', () => {
    expect(isDriftPhase(4, 44)).toBe(false);
  });
  it('returns true when placements >= 5', () => {
    expect(isDriftPhase(5, 0)).toBe(true);
  });
  it('returns true when recordedDaysCount >= 45', () => {
    expect(isDriftPhase(0, 45)).toBe(true);
  });
});

describe('pickEligibleItems', () => {
  it('excludes items without roomPresence', () => {
    const item = makeItem({ id: 'x1' });
    expect(pickEligibleItems([item], new Set(), 20)).toHaveLength(0);
  });

  it('excludes already-placed items', () => {
    const item = makeItem({
      id: 'x1',
      minDays: 0,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 5 },
    });
    expect(pickEligibleItems([item], new Set(['x1']), 20)).toHaveLength(0);
  });

  it('excludes items not yet unlocked (recordedDaysCount < minDays)', () => {
    const item = makeItem({
      id: 'x1',
      minDays: 30,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 5 },
    });
    expect(pickEligibleItems([item], new Set(), 20)).toHaveLength(0);
  });

  it('excludes items where daysInBag < minDaysInBag (using exact threshold, no jitter in tests)', () => {
    // item unlocked at day 0, minDaysInBag 10, only 5 days recorded — not yet eligible
    const item = makeItem({
      id: 'x1',
      minDays: 0,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    });
    // recordedDaysCount=5 → daysInBag = 5 - 0 = 5 < 10
    expect(pickEligibleItems([item], new Set(), 5, 0)).toHaveLength(0);
  });

  it('includes items that meet all conditions', () => {
    const item = makeItem({
      id: 'x1',
      minDays: 0,
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 5 },
    });
    // recordedDaysCount=20 → daysInBag = 20 - 0 = 20 >= 5 ✓
    expect(pickEligibleItems([item], new Set(), 20, 0)).toHaveLength(1);
  });
});

describe('selectCandidate', () => {
  const itemWithEmotion = makeItem({
    id: 'b1',
    minDays: 0,
    roomPresence: { zones: ['책상'], emotionAffinity: ['happy'], promptOnPlace: false, minDaysInBag: 0 },
  });
  const itemNoEmotion = makeItem({
    id: 'a1',
    minDays: 0,
    roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 0 },
  });

  it('prefers B-path (emotion match) over A-path', () => {
    const result = selectCandidate([itemWithEmotion, itemNoEmotion], 'happy', true);
    expect(result?.item.id).toBe('b1');
    expect(result?.path).toBe('B');
  });

  it('falls back to A-path (return gap) when no emotion match', () => {
    const result = selectCandidate([itemNoEmotion], 'happy', true);
    expect(result?.item.id).toBe('a1');
    expect(result?.path).toBe('A');
  });

  it('returns null when no emotion match and no return gap', () => {
    const result = selectCandidate([itemNoEmotion], 'happy', false);
    expect(result).toBeNull();
  });

  it('returns null when only emotion items available but no match', () => {
    const result = selectCandidate([itemWithEmotion], 'soft-sad', false);
    expect(result).toBeNull();
  });
});

describe('shouldAutoSettle', () => {
  it('returns false when no pending placement', () => {
    expect(shouldAutoSettle(null, '2026-05-17')).toBe(false);
  });

  it('returns false when not enough days have passed', () => {
    expect(shouldAutoSettle(
      { itemId: 'x1', pendingFrom: '2026-05-16', settleAfter: 4 },
      '2026-05-17',
    )).toBe(false);
  });

  it('returns true when settleAfter days have passed', () => {
    expect(shouldAutoSettle(
      { itemId: 'x1', pendingFrom: '2026-05-13', settleAfter: 4 },
      '2026-05-17',
    )).toBe(true);
  });
});
```

- [ ] **Step 2.2: Run tests — confirm they fail (functions don't exist yet)**

```
cd 소박이 && npm test -- --testPathPattern=roomPresenceService
```

Expected: test file errors with "Cannot find module" or similar — functions not yet exported.

- [ ] **Step 2.3: Create `src/services/roomPresenceService.ts`**

```typescript
import { SobagiEmotion } from '../types';
import { STORAGE_KEYS } from '../constants/storage';
import * as storageService from './storageService';
import { getLocalDateString } from '../utils/date';
import {
  BagItem,
  RoomPlacement,
  PendingPlacement,
  ZONE_SLOTS,
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
 * long enough. The `jitter` parameter adds a deterministic offset to minDaysInBag
 * (pass 0 in tests to get exact threshold behaviour).
 */
export function pickEligibleItems(
  items: BagItem[],
  placedItemIds: ReadonlySet<string>,
  recordedDaysCount: number,
  jitter = Math.floor(Math.random() * 5) - 2,  // −2 to +2 in production
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
 * Called on every app open. Promotes a 나중에 item if its settle window has passed,
 * then checks for new placement triggers.
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

  // Step 2: skip if already has a pending prompt
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

/**
 * Called when user taps "응, 좋아".
 * Immediately places the pending item and clears the pending key.
 */
export async function confirmPlacement(
  pendingItemId: string,
  placements: RoomPlacement[],
): Promise<RoomPlacement[]> {
  const today = getLocalDateString(new Date());
  const item = ALL_BAG_ITEMS.find((i) => i.id === pendingItemId);
  const zone = item?.roomPresence?.zones[0];
  if (!zone) return placements;

  const newPlacement: RoomPlacement = {
    itemId: pendingItemId,
    zone,
    placedAt: today,
    placementPath: 'B',
  };
  const updated = [...placements, newPlacement];
  await storageService.save(STORAGE_KEYS.ROOM_PLACEMENTS, updated);
  await storageService.save(STORAGE_KEYS.PENDING_PLACEMENT, null);
  return updated;
}

/**
 * Called when user taps "나중에".
 * Records pendingFrom + jittered settleAfter. Sobagi does not ask again.
 */
export async function deferPlacement(
  pendingItemId: string,
  existingPending: PendingPlacement | null,
): Promise<void> {
  if (existingPending) return; // already deferred — no-op
  const today = getLocalDateString(new Date());
  const deferred: PendingPlacement = {
    itemId: pendingItemId,
    pendingFrom: today,
    settleAfter: randomSettleAfter(),
  };
  await storageService.save(STORAGE_KEYS.PENDING_PLACEMENT, deferred);
}
```

- [ ] **Step 2.4: Run tests — should pass**

```
cd 소박이 && npm test -- --testPathPattern=roomPresenceService
```

Expected: all tests PASS.

- [ ] **Step 2.5: Run full typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no new errors.

- [ ] **Step 2.6: Commit**

```
git add 소박이/src/services/roomPresenceService.ts 소박이/src/services/__tests__/roomPresenceService.test.ts
git commit -m "feat: add roomPresenceService with B/A/C placement logic and tests"
```

---

## Task 3: Wire roomPresenceService into useAppInit

**Files:**
- Modify: `src/hooks/useAppInit.ts`

- [ ] **Step 3.1: Add the import and call**

Open `src/hooks/useAppInit.ts`. Make these changes:

1. Add import at the top (after existing imports):
```typescript
import { checkForPlacement } from '../services/roomPresenceService';
```

2. Inside `loadStored()`, after the `await checkAndDeliverLetters(recomputedDays);` line, add:
```typescript
        const emotion: SobagiEmotion =
          lastEmotionRaw != null && VALID_EMOTIONS.includes(lastEmotionRaw as SobagiEmotion)
            ? (lastEmotionRaw as SobagiEmotion)
            : 'happy';

        await checkForPlacement(emotion, recomputedDays, prevVisitDate);
```

**Important:** This must be placed BEFORE the existing emotion store setState block. The full updated `loadStored` function body, starting from the `prevVisitDate` lines, should look like:

```typescript
        const storedVisitDate = await storageService.load<string>(STORAGE_KEYS.LAST_VISIT_DATE);
        prevVisitDate = storedVisitDate;
        const today = getLocalDateString(new Date());
        void storageService.save(STORAGE_KEYS.LAST_VISIT_DATE, today);
        await checkAndDeliverLetters(recomputedDays);

        const emotion: SobagiEmotion =
          lastEmotionRaw != null && VALID_EMOTIONS.includes(lastEmotionRaw as SobagiEmotion)
            ? (lastEmotionRaw as SobagiEmotion)
            : 'happy';

        await checkForPlacement(emotion, recomputedDays, prevVisitDate);

        useEmotionStore.setState({
          currentEmotion: emotion,
          currentMessage: EMOTION_MESSAGES[emotion],
        });
```

Note: The `emotion` variable was previously computed after the `useEmotionStore.setState` block — it is now hoisted up before the `checkForPlacement` call. Remove the duplicate `emotion` declaration that was below.

- [ ] **Step 3.2: Typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no new errors.

- [ ] **Step 3.3: Commit**

```
git add 소박이/src/hooks/useAppInit.ts
git commit -m "feat: wire roomPresenceService into app init"
```

---

## Task 4: index.tsx — migrate BAG_ITEMS + placement prompt UI

**Files:**
- Modify: `src/pages/index.tsx`

This is the largest task. Read the current `src/pages/index.tsx` before making any change.

- [ ] **Step 4.1: Replace inline BagItem type and BAG_ITEMS with imports**

At the top of `src/pages/index.tsx`, the file currently imports from several places and defines `BagItem` and `BAG_ITEMS` inline. Make these changes:

1. **Add import** (after the existing `import { FINDABLE_ITEMS, FindableItem }` line):
```typescript
import { BAG_ITEMS, BAG_TABS, BagItem, BagTab, ALL_BAG_ITEMS, RoomPlacement, PendingPlacement } from '../constants/bagItems';
```

2. **Remove** the inline `type BagTab` definition (was: `type BagTab = '장신구' | '재료' | '간식' | '장난감';`)

3. **Remove** the inline `const BAG_TABS: BagTab[]` definition

4. **Remove** the inline `type BagItem` definition (was: `type BagItem = { id: string; ... }`)

5. **Remove** the inline `const BAG_ITEMS: Record<BagTab, BagItem[]>` object (the entire block from `const BAG_ITEMS:` to its closing `};`)

6. **Remove** the inline `const ALL_BAG_ITEMS = Object.values(BAG_ITEMS).flat();`

The `BAG_ITEMS`, `BAG_TABS`, `BagItem`, `BagTab`, and `ALL_BAG_ITEMS` are now imported from `bagItems.ts`.

- [ ] **Step 4.2: Add placement state variables**

In `HomeScreen`, after the existing state declarations (after `const [expandedReadIds, ...]`), add:

```typescript
  const [roomPlacements, setRoomPlacements] = useState<RoomPlacement[]>([]);
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null);
```

- [ ] **Step 4.3: Load placement state in the existing useEffect**

The existing `useEffect` at the top of `HomeScreen` calls `Promise.all([...])` to load storage values. Extend the array to also load the two new keys:

Change the `Promise.all` call from:
```typescript
    Promise.all([
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
      storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
      storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS),
      storageService.load<number>(STORAGE_KEYS.LAST_BAG_OPEN_DAYS),
    ]).then(([readIdsRaw, foundIds, pending, deliveredIds, lastBagDays]) => {
```

To:
```typescript
    Promise.all([
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS),
      storageService.load<string[]>(STORAGE_KEYS.FOUND_ITEM_IDS),
      storageService.load<string>(STORAGE_KEYS.PENDING_NEW_ITEM_ID),
      storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS),
      storageService.load<number>(STORAGE_KEYS.LAST_BAG_OPEN_DAYS),
      storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS),
      storageService.load<PendingPlacement>(STORAGE_KEYS.PENDING_PLACEMENT),
    ]).then(([readIdsRaw, foundIds, pending, deliveredIds, lastBagDays, placements, pendingPlace]) => {
```

And inside the `.then(...)` callback, after the existing state sets, add:
```typescript
      if (placements) setRoomPlacements(placements);
      if (pendingPlace != null) setPendingPlacement(pendingPlace);
```

- [ ] **Step 4.4: Add imports for roomPresenceService actions**

Add to the imports at the top of index.tsx:
```typescript
import { confirmPlacement, deferPlacement } from '../services/roomPresenceService';
import { ALL_BAG_ITEMS as ALL_ITEMS_FOR_LOOKUP } from '../constants/bagItems';
```

Wait — `ALL_BAG_ITEMS` is already imported in Step 4.1. The import in Step 4.1 already covers it. Just add:
```typescript
import { confirmPlacement, deferPlacement } from '../services/roomPresenceService';
```

- [ ] **Step 4.5: Add the placement prompt callbacks**

After the `toggleLetterExpand` callback, add:

```typescript
  const handlePlacementConfirm = useCallback(async () => {
    if (!pendingPlacement) return;
    const updated = await confirmPlacement(pendingPlacement.itemId, roomPlacements);
    setRoomPlacements(updated);
    setPendingPlacement(null);
  }, [pendingPlacement, roomPlacements]);

  const handlePlacementDefer = useCallback(async () => {
    if (!pendingPlacement) return;
    await deferPlacement(pendingPlacement.itemId, pendingPlacement);
    // pendingPlacement stays in state (now has a settleAfter set) — hide prompt
    setPendingPlacement(null);
  }, [pendingPlacement]);
```

- [ ] **Step 4.6: Add the placement prompt UI**

In the JSX, find the `characterArea` TouchableOpacity (the area containing the EmotionBubble and SobagiCharacter). The placement prompt should appear in the same vertical space as the EmotionBubble but only when a pending placement exists and no idle bubble is showing.

After the `</TouchableOpacity>` that wraps the character area, add the prompt View. It should be a sibling to `characterArea`, positioned similarly to the bubble container. Place it **inside** the `<RoomBackground>` View, after the characterArea TouchableOpacity block and before the propMailbox TouchableOpacity:

```tsx
        {pendingPlacement !== null && !bubbleVisible && (() => {
          const item = ALL_BAG_ITEMS.find((i) => i.id === pendingPlacement.itemId);
          if (!item?.roomPresence) return null;
          const zoneName = item.roomPresence.zones[0];
          const ZONE_LABELS: Record<string, string> = {
            '창가': '창가',
            '책상': '책상 위',
            '침대옆': '침대 옆',
            '방구석': '방 구석',
            '벽걸이': '벽에',
            '차코너': '차 코너',
            '작은선반': '작은 선반',
          };
          const PLACEMENT_LINES: Record<string, string> = {
            'm5': '담요, 침대 옆에 놔둘까요? 차가워지는 날에 있으면 좋을 것 같아요 🌙',
            'm6': '이 식물, 창가에 어울릴 것 같아요. 빛이 잘 드는 곳이에요 🪴',
            's5': '머그컵 책상 위에 두면 좋을 것 같아요 🫖',
            't4': '작은 곰, 선반에 놔둬도 괜찮을까요? 🧸',
          };
          const line = PLACEMENT_LINES[item.id] ?? `${item.name}, ${ZONE_LABELS[zoneName ?? ''] ?? '어딘가'}에 놔둬도 될까요?`;
          return (
            <View style={styles.placementPrompt} pointerEvents="box-none">
              <View style={styles.placementBubble}>
                <Text style={styles.placementText}>{line}</Text>
                <View style={styles.placementActions}>
                  <Pressable style={styles.placementBtnYes} onPress={handlePlacementConfirm}>
                    <Text style={styles.placementBtnYesText}>응, 좋아</Text>
                  </Pressable>
                  <Pressable style={styles.placementBtnLater} onPress={handlePlacementDefer}>
                    <Text style={styles.placementBtnLaterText}>나중에</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          );
        })()}
```

- [ ] **Step 4.7: Add the placement prompt styles**

In the `StyleSheet.create({...})` at the bottom of the file, add these entries:

```typescript
  placementPrompt: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '28%',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  placementBubble: {
    backgroundColor: 'rgba(250, 240, 226, 0.92)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#3D3020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  placementText: {
    fontSize: 14,
    color: '#3D3020',
    lineHeight: 21,
    marginBottom: 12,
  },
  placementActions: {
    flexDirection: 'row',
    gap: 10,
  },
  placementBtnYes: {
    flex: 1,
    backgroundColor: 'rgba(61, 48, 32, 0.12)',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  placementBtnYesText: {
    fontSize: 13,
    color: '#3D3020',
    fontWeight: '500',
  },
  placementBtnLater: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  placementBtnLaterText: {
    fontSize: 13,
    color: 'rgba(61, 48, 32, 0.4)',
  },
```

- [ ] **Step 4.8: Typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no new errors.

- [ ] **Step 4.9: Commit**

```
git add 소박이/src/pages/index.tsx
git commit -m "feat: migrate BAG_ITEMS to bagItems.ts, add 5 new items, placement prompt UI"
```

---

## Task 5: Photocard emoji overlay

**Files:**
- Modify: `src/components/photocard/PhotocardView.tsx`
- Modify: `src/pages/reaction.tsx`

- [ ] **Step 5.1: Add the overlay prop to PhotocardView**

Open `src/components/photocard/PhotocardView.tsx`.

1. Add import at the top:
```typescript
import { RoomPlacement, ZONE_SLOTS, ALL_BAG_ITEMS } from '../../constants/bagItems';
import { SobagiEmotion } from '../../types';
```

2. Add `placedItems` and `currentEmotion` to the props interface:
```typescript
interface PhotocardViewProps {
  quote: string;
  dateStr: string;
  categories: string[];
  amount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
  backgroundUri?: string;
  sobagiImageUri: string;
  atmosphereTint: TimeOfDayTint | null;
  warmthOpacity: number;
  quoteAnimated?: boolean;
  placedItems?: RoomPlacement[];    // add this
  currentEmotion?: SobagiEmotion;   // add this
}
```

3. Add the parameters to the function signature:
```typescript
export function PhotocardView({
  quote,
  dateStr,
  categories,
  amount,
  roomStage,
  backgroundUri,
  sobagiImageUri,
  atmosphereTint,
  warmthOpacity,
  quoteAnimated = false,
  placedItems,
  currentEmotion,
}: PhotocardViewProps) {
```

4. Add the overlay computation inside the function body, before the `return`:
```typescript
  // Select one ambient item for this photocard — placed items whose affinity matches emotion
  const overlayItem = (() => {
    if (!placedItems || !currentEmotion) return null;
    const eligible = placedItems.filter((placement) => {
      const item = ALL_BAG_ITEMS.find((i) => i.id === placement.itemId);
      return item?.photocardAffinity?.includes(currentEmotion) ?? false;
    });
    if (eligible.length === 0) return null;
    const pick = eligible[Math.floor(Math.random() * eligible.length)];
    if (!pick) return null;
    const item = ALL_BAG_ITEMS.find((i) => i.id === pick.itemId);
    const slot = ZONE_SLOTS[pick.zone]?.[0];
    if (!item || !slot) return null;
    return { emoji: item.emoji, x: slot.x * CARD_WIDTH, y: slot.y * CARD_HEIGHT };
  })();
```

5. Inside the `return (...)`, after the warmth overlay `</View>` and before the composition `<View style={styles.composition}>`, add the overlay:
```tsx
      {/* Ambient item overlay — placed room item at zone position, quiet */}
      {overlayItem !== null && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            { justifyContent: 'flex-start', alignItems: 'flex-start' },
          ]}
          pointerEvents="none"
        >
          <Text
            style={{
              position: 'absolute',
              left: overlayItem.x,
              top: overlayItem.y,
              fontSize: 16,
              opacity: 0.52,
            }}
          >
            {overlayItem.emoji}
          </Text>
        </View>
      )}
```

- [ ] **Step 5.2: Pass placedItems and currentEmotion from reaction.tsx**

Open `src/pages/reaction.tsx`.

1. Add import:
```typescript
import * as storageService from '../services/storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { RoomPlacement } from '../constants/bagItems';
```

2. In `SobagiReactionScreen`, add state for room placements:
```typescript
  const [roomPlacements, setRoomPlacements] = useState<RoomPlacement[]>([]);
```

3. Add a `useEffect` to load placements once at mount (add after the existing `useEffect`):
```typescript
  useEffect(() => {
    storageService.load<RoomPlacement[]>(STORAGE_KEYS.ROOM_PLACEMENTS).then((placements) => {
      if (placements) setRoomPlacements(placements);
    });
  }, []);
```

4. Find the `<PhotocardView ... />` component usage inside `showPhotocardModal` render. It currently passes several props. Add the two new props:
```tsx
              <PhotocardView
                quote={currentMessage}
                dateStr={dateStr}
                categories={todayCategories}
                amount={todayTotal}
                roomStage={roomStage}
                backgroundUri={ROOM_BACKGROUND_URIS[roomStage] ?? ROOM_BACKGROUND_URIS[1]}
                sobagiImageUri={SOBAGI_IMAGE_URIS[currentEmotion] ?? SOBAGI_DEFAULT_URI}
                atmosphereTint={getTimeOfDayTint(currentHour)}
                warmthOpacity={getWarmthOpacity(recordedDaysCount)}
                quoteAnimated
                placedItems={roomPlacements}
                currentEmotion={currentEmotion}
              />
```

- [ ] **Step 5.3: Typecheck**

```
cd 소박이 && npm run typecheck
```

Expected: no new errors.

- [ ] **Step 5.4: Run all tests**

```
cd 소박이 && npm test
```

Expected: all tests PASS.

- [ ] **Step 5.5: Commit**

```
git add 소박이/src/components/photocard/PhotocardView.tsx 소박이/src/pages/reaction.tsx
git commit -m "feat: add ambient item overlay to photocard (placed items at zone position)"
```

---

## Self-review checklist

**Spec coverage:**

| Spec requirement | Covered by |
|---|---|
| BagItem type extension (roomPresence, photocardAffinity, ambientAffinity) | Task 1 — bagItems.ts |
| Room metadata on existing items | Task 1 — BAG_ITEMS |
| 4 new bag items (담요, 식물, 엽서, 머그컵) | Task 1 |
| Umbrella enters bag, room deferred | Task 1 (ambientAffinity: 'temporaryAmbient', no roomPresence) |
| ZONE_SLOTS defined | Task 1 |
| Storage keys ROOM_PLACEMENTS, PENDING_PLACEMENT | Task 1 |
| Path B (emotion resonance) trigger | Task 2 — selectCandidate |
| Path A (return gap) fallback | Task 2 — selectCandidate |
| B→A drift (≥5 placements or day 45+) | Task 2 — isDriftPhase |
| 나중에 → auto-settle (3–5 jittered days) | Task 2 — shouldAutoSettle, deferPlacement |
| One action per session | Task 2 — early return after auto-settle |
| No second prompt after 나중에 | Task 2 — deferPlacement is no-op if pending exists |
| roomPresenceService wired into app init | Task 3 |
| Placement prompt — one Sobagi line + 응/나중에 | Task 4 |
| Prompt hidden when idle bubble visible | Task 4 |
| BAG_ITEMS migrated from index.tsx | Task 4 |
| Photocard emoji overlay — placed + affinity match, one item, 0.52 opacity | Task 5 |
| Zone coordinate position | Task 5 |
| No label, border, animation on overlay | Task 5 — Text only, no animation |
| Room visual rendering not implemented | Scope lock — no sprites |

**Philosophy compliance checks before final commit:**
- [ ] No console.log or debug output in roomPresenceService (no internal framing shown)
- [ ] Placement prompt has no "unlock" or reward language
- [ ] Photocard overlay has no label, no border, no animation
- [ ] Prompt disappears without fanfare when user taps either button
- [ ] 나중에 stores silently — no "will be placed in N days" message to user
