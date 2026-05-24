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

// ─── Calm-day atmosphere brightening ────────────────────────────────────────
//
// Safety checks (1:1 with the implicit-trigger family):
//   1. Several low-spend days within window → opacity > 0
//   2. High-spend days → do NOT count
//   3. Days with no records → do NOT count (absence is neutral)
//   4. Old low-spend records outside windowDays → do NOT count
//   5. Opacity caps at CALM_MAX_OPACITY
//

const makeExpense = (overrides: Partial<Expense> & Pick<Expense, 'id' | 'createdAt' | 'amount'>): Expense => ({
  category: 'cafe',
  sobagiEmotion: 'happy',
  ...overrides,
});

describe('computeCalmDayCount', () => {
  it('returns 0 on empty expenses', () => {
    expect(computeCalmDayCount([], '2026-05-18')).toBe(0);
  });

  // Safety check #1
  it('counts days within the window whose total is below the threshold', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 3000, createdAt: '2026-05-12T10:00:00' }),
      makeExpense({ id: '2', amount: 5000, createdAt: '2026-05-14T10:00:00' }),
      makeExpense({ id: '3', amount: 4500, createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(3);
  });

  // Safety check #2
  it('does NOT count days where the total is at or above the threshold', () => {
    const expenses = [
      makeExpense({ id: '1', amount: CALM_DAILY_THRESHOLD,     createdAt: '2026-05-12T10:00:00' }), // exactly threshold → not calm
      makeExpense({ id: '2', amount: CALM_DAILY_THRESHOLD + 1, createdAt: '2026-05-14T10:00:00' }), // above
      makeExpense({ id: '3', amount: 25000,                    createdAt: '2026-05-17T10:00:00' }), // way above
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });

  it('sums multiple records on the same day before comparing to threshold', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 4000, createdAt: '2026-05-17T08:00:00' }),
      makeExpense({ id: '2', amount: 7000, createdAt: '2026-05-17T18:00:00' }),
      // 11,000 total → above threshold → not calm
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });

  it('counts a day if the summed total stays below threshold', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 4000, createdAt: '2026-05-17T08:00:00' }),
      makeExpense({ id: '2', amount: 4500, createdAt: '2026-05-17T18:00:00' }),
      // 8,500 total → still calm
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(1);
  });

  // Safety check #3: implicit — empty days never appear in the map
  it('treats days with no records as neutral (does NOT count as calm)', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 5000, createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(1);
  });

  // Safety check #4
  it('ignores records older than windowDays', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 3000, createdAt: '2026-04-15T10:00:00' }), // > 14 days
      makeExpense({ id: '2', amount: 3000, createdAt: '2026-05-01T10:00:00' }), // > 14 days
      makeExpense({ id: '3', amount: 3000, createdAt: '2026-05-17T10:00:00' }), // in window
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(1);
  });

  it('exact-threshold record does NOT make a day calm (strict less-than)', () => {
    const expenses = [
      makeExpense({ id: '1', amount: CALM_DAILY_THRESHOLD, createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });

  // ─── Income decoupling (post-sub-spec-C calm-day fix) ──────────────────────
  // Income records must not contaminate the calm-day signal. A large salary
  // deposit cannot invalidate a low-spending day, and an income-only day with
  // no spending does not count as calm. See sub-spec C §7 + the original
  // QA-pass deviation that surfaced this.

  it('does NOT let a large income inflate a low-spending day above the threshold', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 's', amount: 5000, category: 'cafe',   kind: 'spending', createdAt: '2026-05-17T10:00:00' }),
      makeExpense({ id: 'i', amount: 3_000_000, category: 'salary', kind: 'income',   createdAt: '2026-05-17T11:00:00' }),
    ];
    // Spending only = 5,000 → calm. Income excluded.
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(1);
  });

  it('does NOT count an income-only day as calm (no spending happened)', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 'i', amount: 100, category: 'refund', kind: 'income', createdAt: '2026-05-17T10:00:00' }),
    ];
    // Spending total = 0 → fails the `total > 0` check → not calm.
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });

  it('treats a day with only large income (no spending) as neutral, not calm', () => {
    const expenses: Expense[] = [
      makeExpense({ id: 'i', amount: 5_000_000, category: 'salary', kind: 'income', createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });

  it('counts a no-spend day correctly (no_spend is kind=spending, amount=0)', () => {
    // No-spend records have amount 0, so they do NOT make a day calm
    // (the strict `total > 0` check still excludes them). This preserves
    // the existing "absence is neutral" rule for no-spend-only days.
    const expenses: Expense[] = [
      makeExpense({ id: 'n', amount: 0, category: 'no_spend', kind: 'spending', createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(computeCalmDayCount(expenses, '2026-05-18')).toBe(0);
  });
});

describe('getCalmAtmosphereOpacity', () => {
  it('returns 0 when no calm days exist', () => {
    expect(getCalmAtmosphereOpacity([], '2026-05-18')).toBe(0);
  });

  it('graduates with calm day count', () => {
    const oneCalmDay: Expense[] = [
      makeExpense({ id: '1', amount: 3000, createdAt: '2026-05-17T10:00:00' }),
    ];
    const twoCalmDays: Expense[] = [
      ...oneCalmDay,
      makeExpense({ id: '2', amount: 3000, createdAt: '2026-05-16T10:00:00' }),
    ];
    expect(getCalmAtmosphereOpacity(oneCalmDay, '2026-05-18'))
      .toBeLessThan(getCalmAtmosphereOpacity(twoCalmDays, '2026-05-18'));
  });

  it('opacity per calm day equals CALM_PER_DAY_OPACITY (below cap)', () => {
    const expenses = [
      makeExpense({ id: '1', amount: 3000, createdAt: '2026-05-16T10:00:00' }),
      makeExpense({ id: '2', amount: 3000, createdAt: '2026-05-17T10:00:00' }),
    ];
    expect(getCalmAtmosphereOpacity(expenses, '2026-05-18'))
      .toBeCloseTo(2 * CALM_PER_DAY_OPACITY, 5);
  });

  // Safety check #5: opacity caps at CALM_MAX_OPACITY
  it('caps opacity at CALM_MAX_OPACITY regardless of how many calm days', () => {
    // 14 calm days within the 14-day window
    const expenses = Array.from({ length: 14 }, (_, i) => {
      const day = String(4 + i).padStart(2, '0');
      return makeExpense({ id: String(i), amount: 3000, createdAt: `2026-05-${day}T10:00:00` });
    });
    const opacity = getCalmAtmosphereOpacity(expenses, '2026-05-18');
    expect(opacity).toBeLessThanOrEqual(CALM_MAX_OPACITY);
    expect(opacity).toBe(CALM_MAX_OPACITY);
  });

  it('never exceeds CALM_MAX_OPACITY even at extreme inputs', () => {
    // 100 calm days, only those in window count, but still — opacity must cap
    const expenses = Array.from({ length: 100 }, (_, i) => {
      const d = new Date('2026-05-18T10:00:00');
      d.setDate(d.getDate() - i);
      return makeExpense({ id: String(i), amount: 3000, createdAt: d.toISOString() });
    });
    expect(getCalmAtmosphereOpacity(expenses, '2026-05-18')).toBe(CALM_MAX_OPACITY);
  });
});

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
