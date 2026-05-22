jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import { Expense } from '../src/types';
import { selectStatsObservation } from '../src/services/statsObservationService';

// Helper: build a spending expense at a specific local-date and hour.
function expense(dateStr: string, hour: number, category: Expense['category'] = 'cafe', amount = 5000): Expense {
  // Use a stable ISO string anchored at local midnight + hour offset.
  // The detectors only read year/month/day and hour, so any timezone-stable
  // representation works.
  const iso = `${dateStr}T${String(hour).padStart(2, '0')}:00:00`;
  return {
    id: `${dateStr}-${hour}-${category}`,
    amount,
    category,
    sobagiEmotion: 'happy',
    createdAt: iso,
  };
}

function cafePatternExpenses(today: string): Expense[] {
  // 3 cafe records on 3 different days inside the last 14 days, daytime hours.
  const todayD = new Date(today + 'T12:00:00');
  return [-1, -3, -5].map((offset) => {
    const d = new Date(todayD);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    return expense(dateStr, 14, 'cafe');
  });
}

function nightPatternExpenses(today: string): Expense[] {
  // 3 night-hour records on 3 different days inside the window (hours 19–04).
  const todayD = new Date(today + 'T12:00:00');
  return [-1, -3, -5].map((offset) => {
    const d = new Date(todayD);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    return expense(dateStr, 22, 'home_meal');
  });
}

function calmDayExpenses(today: string, dayCount: number): Expense[] {
  // dayCount calm days: a single small record per day, under the 10,000 threshold.
  const todayD = new Date(today + 'T12:00:00');
  const out: Expense[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(todayD);
    d.setDate(d.getDate() - (i + 1));
    const dateStr = d.toISOString().slice(0, 10);
    out.push(expense(dateStr, 12, 'home_meal', 2000));
  }
  return out;
}

const TODAY = '2026-05-22';

describe('selectStatsObservation', () => {
  it('returns cafe observation when cafe pattern is present', () => {
    const expenses = cafePatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('returns night observation when only night pattern is present', () => {
    const expenses = nightPatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('밤에도 종종 기록했네요 🌙');
  });

  it('prefers cafe over night when both match', () => {
    const expenses = [...cafePatternExpenses(TODAY), ...nightPatternExpenses(TODAY)];
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('returns calm observation when ≥4 calm days and no cafe/night pattern', () => {
    const expenses = calmDayExpenses(TODAY, 4);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('차분한 날이 자주 있었어요 🍃');
  });

  it('does not fire calm observation when calm-day count is 3', () => {
    const expenses = calmDayExpenses(TODAY, 3);
    const result = selectStatsObservation(expenses, 0, TODAY);
    // Falls through to streak tiers; streak is 0 → default
    expect(result).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('returns long-streak observation when streak >= 7 and no texture patterns', () => {
    const result = selectStatsObservation([], 7, TODAY);
    expect(result).toBe('요즘 자주 들르고 있어요 🌿');
  });

  it('returns medium-streak observation when streak >= 3', () => {
    const result = selectStatsObservation([], 3, TODAY);
    expect(result).toBe('꾸준히 들르고 있어요 🌿');
  });

  it('streak 6 falls into medium-streak tier (boundary below the long-streak threshold)', () => {
    const result = selectStatsObservation([], 6, TODAY);
    expect(result).toBe('꾸준히 들르고 있어요 🌿');
  });

  it('returns short-streak observation when streak >= 1', () => {
    const result = selectStatsObservation([], 1, TODAY);
    expect(result).toBe('오늘도 잠깐 들렀네요 🍃');
  });

  it('returns default observation when streak is 0 and no patterns', () => {
    const result = selectStatsObservation([], 0, TODAY);
    expect(result).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('cafe pattern beats long streak (texture wins over consistency)', () => {
    const expenses = cafePatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 30, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('cafe pattern beats calm observation (texture > calm)', () => {
    const expenses = [...cafePatternExpenses(TODAY), ...calmDayExpenses(TODAY, 4)];
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });
});
