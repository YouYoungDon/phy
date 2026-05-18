jest.mock('../storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import {
  isDriftPhase,
  pickEligibleItems,
  selectCandidate,
  shouldAutoSettle,
} from '../roomPresenceService';
import { BagItem } from '../../constants/bagItems';

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
