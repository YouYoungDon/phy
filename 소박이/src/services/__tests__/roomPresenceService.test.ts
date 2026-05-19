jest.mock('../storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import {
  isDriftPhase,
  pickEligibleItems,
  selectCandidate,
  shouldAutoSettle,
  hasCategoryPattern,
  pickCategoryEligibleItems,
  selectCategoryCandidate,
  computeRecordingStreak,
  pickStreakEligibleItems,
  selectStreakCandidate,
  isNightHour,
  hasNightPattern,
  pickNightEligibleItems,
  selectNightCandidate,
} from '../roomPresenceService';
import { BagItem } from '../../constants/bagItems';
import { Expense } from '../../types';

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

// ─── Category-pattern path (P) ──────────────────────────────────────────────
//
// Safety checks (1:1 with the polish task on 2026-05-18):
//   1. cafe records across 3+ different days triggers mug
//   2. cafe records all on one day does NOT trigger mug
//   3. already placed mug does NOT re-trigger
//   4. non-cafe categories do NOT trigger mug
//   5. old cafe records outside 14 days do NOT trigger mug
//

const makeExpense = (overrides: Partial<Expense> & Pick<Expense, 'id' | 'createdAt'>): Expense => ({
  amount: 5000,
  category: 'cafe',
  sobagiEmotion: 'happy',
  ...overrides,
});

const CAFE_OPTS = { minCount: 3, minDistinctDays: 3, windowDays: 14 } as const;

describe('hasCategoryPattern', () => {
  it('returns false when no matching records exist', () => {
    expect(hasCategoryPattern([], 'cafe', CAFE_OPTS, '2026-05-18')).toBe(false);
  });

  it('returns false when fewer than minCount records', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(false);
  });

  // Safety check #2: cafe records all on one day does NOT trigger mug
  it('returns false when records all fall on one day (single-day spree)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-18T08:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-18T12:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T18:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(false);
  });

  // Safety check #1: cafe records across 3+ different days triggers mug
  it('returns true when records span at least minDistinctDays distinct days', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(true);
  });

  // Boundary: exactly meeting the minimum on both axes still fires.
  it('returns true at exact minimum (minCount records / minDistinctDays days)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-17T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(true);
  });

  // Safety check #5: old cafe records outside 14 days do NOT trigger mug
  it('ignores records older than windowDays', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-04-01T10:00:00' }), // > 14 days ago
      makeExpense({ id: '2', createdAt: '2026-04-15T10:00:00' }), // > 14 days ago
      makeExpense({ id: '3', createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(false);
  });

  // Boundary: a record landing inside the window edge still counts.
  it('counts a record landing at the inner edge of the look-back window', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-05T12:00:00' }), // 13 days before today
      makeExpense({ id: '2', createdAt: '2026-05-11T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(true);
  });

  // Safety check #4: non-cafe categories do NOT trigger mug
  it('ignores records of other categories', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00', category: 'dining_out' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T10:00:00', category: 'dining_out' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00', category: 'dining_out' }),
    ];
    expect(hasCategoryPattern(expenses, 'cafe', CAFE_OPTS, '2026-05-18')).toBe(false);
  });
});

describe('pickCategoryEligibleItems', () => {
  const cafeItem = makeItem({
    id: 'mug',
    roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    categoryAffinity: ['cafe'],
  });
  const otherItem = makeItem({
    id: 'plant',
    roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 5 },
  });

  it('returns items with matching categoryAffinity', () => {
    expect(pickCategoryEligibleItems([cafeItem, otherItem], new Set(), 'cafe')).toEqual([cafeItem]);
  });

  // Safety check #3: already placed mug does NOT re-trigger
  it('excludes already-placed items', () => {
    expect(pickCategoryEligibleItems([cafeItem], new Set(['mug']), 'cafe')).toHaveLength(0);
  });

  it('excludes items without roomPresence', () => {
    const noPresence = makeItem({ id: 'x', categoryAffinity: ['cafe'] });
    expect(pickCategoryEligibleItems([noPresence], new Set(), 'cafe')).toHaveLength(0);
  });

  it('does NOT gate on minDays or minDaysInBag — pattern is the gate', () => {
    const lateItem = makeItem({
      id: 'late',
      minDays: 999, // far future — would be excluded by pickEligibleItems
      roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 999 },
      categoryAffinity: ['cafe'],
    });
    expect(pickCategoryEligibleItems([lateItem], new Set(), 'cafe')).toEqual([lateItem]);
  });
});

describe('selectCategoryCandidate', () => {
  const cafeItem = makeItem({
    id: 'mug',
    roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    categoryAffinity: ['cafe'],
  });

  it('returns the eligible item when the pattern fires', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    const result = selectCategoryCandidate(
      [cafeItem], new Set(), 'cafe', expenses, CAFE_OPTS, '2026-05-18',
    );
    expect(result?.id).toBe('mug');
  });

  it('returns null when the pattern does not fire', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-18T10:00:00' }),
    ];
    const result = selectCategoryCandidate(
      [cafeItem], new Set(), 'cafe', expenses, CAFE_OPTS, '2026-05-18',
    );
    expect(result).toBeNull();
  });

  // Safety check #3 (reinforced at the composition layer)
  it('returns null when the item is already placed even if the pattern fires', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    const result = selectCategoryCandidate(
      [cafeItem], new Set(['mug']), 'cafe', expenses, CAFE_OPTS, '2026-05-18',
    );
    expect(result).toBeNull();
  });
});

// ─── Recording-streak path (S) ──────────────────────────────────────────────
//
// Safety checks (mirror of the P-path checklist):
//   1. 7+ consecutive days triggers plant
//   2. 6-day streak does NOT trigger
//   3. already placed plant does NOT re-trigger
//   4. broken streak (gap of 2+ days) does NOT trigger
//   5. streak whose last record is older than yesterday does NOT trigger
//

describe('computeRecordingStreak', () => {
  it('returns 0 on no records', () => {
    expect(computeRecordingStreak([], '2026-05-18')).toBe(0);
  });

  it('returns 1 when only today has a record', () => {
    const expenses = [makeExpense({ id: '1', createdAt: '2026-05-18T10:00:00' })];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(1);
  });

  it('counts 7 consecutive days ending today', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-12T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-13T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '4', createdAt: '2026-05-15T10:00:00' }),
      makeExpense({ id: '5', createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '6', createdAt: '2026-05-17T10:00:00' }),
      makeExpense({ id: '7', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(7);
  });

  // Grace day: yesterday counts even if today has no record yet.
  it('counts 7 consecutive days ending yesterday (today is empty)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-11T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-12T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-13T10:00:00' }),
      makeExpense({ id: '4', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '5', createdAt: '2026-05-15T10:00:00' }),
      makeExpense({ id: '6', createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '7', createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(7);
  });

  // Safety check #4 (S): broken streak — gap of 2+ days breaks it.
  it('returns 0 when last record is older than yesterday (gap of 2+ days)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-11T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-12T10:00:00' }),
    ];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(0);
  });

  it('returns only the most recent consecutive run when there is an earlier gap', () => {
    const expenses = [
      // earlier 3-day run (broken by gap)
      makeExpense({ id: '1', createdAt: '2026-05-01T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-02T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-03T10:00:00' }),
      // recent 3-day run ending today
      makeExpense({ id: '4', createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '5', createdAt: '2026-05-17T10:00:00' }),
      makeExpense({ id: '6', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(3);
  });

  it('multiple records on the same day still count as one streak day', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-17T08:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-17T20:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00' }),
    ];
    expect(computeRecordingStreak(expenses, '2026-05-18')).toBe(2);
  });
});

describe('pickStreakEligibleItems', () => {
  const plant = makeItem({
    id: 'plant',
    roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 5 },
    streakAffinity: { minStreak: 7 },
  });
  const other = makeItem({
    id: 'mug',
    roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    categoryAffinity: ['cafe'],
  });

  // Safety check #1 (S): 7+ streak triggers plant
  it('returns items whose minStreak is met by the current streak', () => {
    expect(pickStreakEligibleItems([plant, other], new Set(), 7)).toEqual([plant]);
  });

  // Safety check #2 (S): 6-day streak does NOT trigger
  it('returns empty when streak is below minStreak', () => {
    expect(pickStreakEligibleItems([plant], new Set(), 6)).toHaveLength(0);
  });

  // Safety check #3 (S): already-placed plant does NOT re-trigger
  it('excludes already-placed items', () => {
    expect(pickStreakEligibleItems([plant], new Set(['plant']), 30)).toHaveLength(0);
  });

  it('excludes items without streakAffinity', () => {
    expect(pickStreakEligibleItems([other], new Set(), 30)).toHaveLength(0);
  });

  it('excludes items without roomPresence', () => {
    const noPresence = makeItem({ id: 'x', streakAffinity: { minStreak: 7 } });
    expect(pickStreakEligibleItems([noPresence], new Set(), 30)).toHaveLength(0);
  });

  it('does NOT gate on minDays or minDaysInBag — streak is the gate', () => {
    const lateItem = makeItem({
      id: 'late',
      minDays: 999,
      roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 999 },
      streakAffinity: { minStreak: 7 },
    });
    expect(pickStreakEligibleItems([lateItem], new Set(), 7)).toEqual([lateItem]);
  });
});

describe('selectStreakCandidate', () => {
  const plant = makeItem({
    id: 'plant',
    roomPresence: { zones: ['창가'], promptOnPlace: false, minDaysInBag: 5 },
    streakAffinity: { minStreak: 7 },
  });

  // Safety check #1 (S)
  it('returns the eligible item when the streak meets the threshold', () => {
    const expenses = Array.from({ length: 7 }, (_, i) => {
      const day = 12 + i;
      return makeExpense({ id: String(i), createdAt: `2026-05-${String(day).padStart(2, '0')}T10:00:00` });
    });
    const result = selectStreakCandidate([plant], new Set(), expenses, '2026-05-18');
    expect(result?.id).toBe('plant');
  });

  // Safety check #2 (S)
  it('returns null when the streak is below threshold', () => {
    const expenses = Array.from({ length: 6 }, (_, i) => {
      const day = 13 + i;
      return makeExpense({ id: String(i), createdAt: `2026-05-${String(day).padStart(2, '0')}T10:00:00` });
    });
    const result = selectStreakCandidate([plant], new Set(), expenses, '2026-05-18');
    expect(result).toBeNull();
  });

  // Safety check #5 (S): last record older than yesterday — streak broken
  it('returns null when the streak is broken (last record older than yesterday)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-09T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-11T10:00:00' }),
      makeExpense({ id: '4', createdAt: '2026-05-12T10:00:00' }),
      makeExpense({ id: '5', createdAt: '2026-05-13T10:00:00' }),
      makeExpense({ id: '6', createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '7', createdAt: '2026-05-15T10:00:00' }),
    ];
    const result = selectStreakCandidate([plant], new Set(), expenses, '2026-05-18');
    expect(result).toBeNull();
  });

  // Safety check #3 (S) reinforced at composition layer
  it('returns null when the plant is already placed even if streak meets threshold', () => {
    const expenses = Array.from({ length: 7 }, (_, i) => {
      const day = 12 + i;
      return makeExpense({ id: String(i), createdAt: `2026-05-${String(day).padStart(2, '0')}T10:00:00` });
    });
    const result = selectStreakCandidate([plant], new Set(['plant']), expenses, '2026-05-18');
    expect(result).toBeNull();
  });
});

// ─── Night-activity path (L) ────────────────────────────────────────────────
//
// Safety checks (mirror of the P-path checklist, with a night-specific twist):
//   1. 3+ night-hour records across 3+ distinct nights triggers lamp
//   2. 3 records all in one night (one-night spree) does NOT trigger
//   3. already placed lamp does NOT re-trigger
//   4. daytime-only records do NOT trigger
//   5. old night records outside 14 days do NOT trigger
//

const NIGHT_OPTS = {
  startHour: 19,
  endHour: 4,
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
} as const;

describe('isNightHour', () => {
  it('inclusive at startHour', () => {
    expect(isNightHour(19, 19, 4)).toBe(true);
  });
  it('exclusive at endHour', () => {
    expect(isNightHour(4, 19, 4)).toBe(false);
  });
  it('counts midnight-wrapping hours (e.g. 2am with window 19–4)', () => {
    expect(isNightHour(2, 19, 4)).toBe(true);
  });
  it('does not count daytime hours', () => {
    expect(isNightHour(10, 19, 4)).toBe(false);
    expect(isNightHour(15, 19, 4)).toBe(false);
  });
  it('handles a non-wrapping window correctly', () => {
    expect(isNightHour(10, 9, 17)).toBe(true);
    expect(isNightHour(17, 9, 17)).toBe(false);
    expect(isNightHour(8, 9, 17)).toBe(false);
  });
});

describe('hasNightPattern', () => {
  it('returns false on empty expenses', () => {
    expect(hasNightPattern([], NIGHT_OPTS, '2026-05-18')).toBe(false);
  });

  // Safety check #1 (L): 3+ night-hour records across 3+ distinct nights triggers
  it('returns true when 3 night-hour records span 3 distinct days', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T22:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T23:30:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T20:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(true);
  });

  // Safety check #2 (L): all on one night does NOT trigger
  it('returns false when 3 night-hour records all fall on one date (single-night spree)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-17T19:30:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-17T21:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T23:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(false);
  });

  // Safety check #4 (L): daytime records do NOT trigger
  it('returns false when records fall in daytime hours', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T13:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T16:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(false);
  });

  // Safety check #5 (L): old records outside windowDays do NOT trigger
  it('ignores night records older than windowDays', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-04-01T22:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-04-15T22:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T22:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(false);
  });

  // Boundary cases
  it('counts a record at exactly startHour as a night record', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-15T19:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-16T19:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T19:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(true);
  });

  it('does NOT count a record at exactly endHour', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-15T04:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-16T04:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T04:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(false);
  });

  it('counts a record at 2am (window wraps midnight)', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-15T02:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-16T02:00:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T02:00:00' }),
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(true);
  });

  it('does not count daytime records mixed with night records — needs minCount of night-hour records', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-15T22:00:00' }), // night
      makeExpense({ id: '2', createdAt: '2026-05-16T10:00:00' }), // day
      makeExpense({ id: '3', createdAt: '2026-05-17T14:00:00' }), // day
    ];
    expect(hasNightPattern(expenses, NIGHT_OPTS, '2026-05-18')).toBe(false);
  });
});

describe('pickNightEligibleItems', () => {
  const lamp = makeItem({
    id: 'lamp',
    roomPresence: { zones: ['침대옆'], promptOnPlace: false, minDaysInBag: 10 },
    nightAffinity: true,
  });
  const mug = makeItem({
    id: 'mug',
    roomPresence: { zones: ['책상'], promptOnPlace: false, minDaysInBag: 10 },
    categoryAffinity: ['cafe'],
  });

  it('returns items flagged with nightAffinity', () => {
    expect(pickNightEligibleItems([lamp, mug], new Set())).toEqual([lamp]);
  });

  // Safety check #3 (L): already placed lamp excluded
  it('excludes already-placed items', () => {
    expect(pickNightEligibleItems([lamp], new Set(['lamp']))).toHaveLength(0);
  });

  it('excludes items without nightAffinity', () => {
    expect(pickNightEligibleItems([mug], new Set())).toHaveLength(0);
  });

  it('excludes items without roomPresence', () => {
    const noPresence = makeItem({ id: 'x', nightAffinity: true });
    expect(pickNightEligibleItems([noPresence], new Set())).toHaveLength(0);
  });

  it('does NOT gate on minDays or minDaysInBag — pattern is the gate', () => {
    const lateItem = makeItem({
      id: 'late',
      minDays: 999,
      roomPresence: { zones: ['침대옆'], promptOnPlace: false, minDaysInBag: 999 },
      nightAffinity: true,
    });
    expect(pickNightEligibleItems([lateItem], new Set())).toEqual([lateItem]);
  });
});

describe('selectNightCandidate', () => {
  const lamp = makeItem({
    id: 'lamp',
    roomPresence: { zones: ['침대옆'], promptOnPlace: false, minDaysInBag: 10 },
    nightAffinity: true,
  });

  // Safety check #1 (L) reinforced at composition layer
  it('returns the eligible item when the night pattern fires', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T22:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T23:30:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T20:00:00' }),
    ];
    const result = selectNightCandidate([lamp], new Set(), expenses, NIGHT_OPTS, '2026-05-18');
    expect(result?.id).toBe('lamp');
  });

  it('returns null when the night pattern does not fire', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-17T22:00:00' }),
    ];
    const result = selectNightCandidate([lamp], new Set(), expenses, NIGHT_OPTS, '2026-05-18');
    expect(result).toBeNull();
  });

  // Safety check #3 (L) reinforced at composition layer
  it('returns null when the lamp is already placed even if pattern fires', () => {
    const expenses = [
      makeExpense({ id: '1', createdAt: '2026-05-10T22:00:00' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T23:30:00' }),
      makeExpense({ id: '3', createdAt: '2026-05-17T20:00:00' }),
    ];
    const result = selectNightCandidate([lamp], new Set(['lamp']), expenses, NIGHT_OPTS, '2026-05-18');
    expect(result).toBeNull();
  });
});
