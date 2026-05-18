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
      makeExpense({ id: '1', createdAt: '2026-05-10T10:00:00', category: 'food' }),
      makeExpense({ id: '2', createdAt: '2026-05-14T10:00:00', category: 'food' }),
      makeExpense({ id: '3', createdAt: '2026-05-18T10:00:00', category: 'food' }),
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
