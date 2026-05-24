import { evaluate } from '../src/services/emotionEngine';
import { Expense, EmotionContext } from '../src/types';

const baseExpense = (amount: number): Expense => ({
  id: '1',
  amount,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
});

const baseCtx = (overrides: Partial<EmotionContext> = {}): EmotionContext => ({
  isFirstRecordToday: false,
  currentStreak: 0,
  currentHour: 14,
  ...overrides,
});

describe('emotionEngine.evaluate', () => {
  it('returns surprised for first record today (highest priority)', () => {
    expect(evaluate(baseExpense(100000), baseCtx({ isFirstRecordToday: true }))).toBe('surprised');
  });

  it('returns excited for streak >= 3 (above late-night and large-spend)', () => {
    expect(evaluate(baseExpense(100000), baseCtx({ currentStreak: 3, currentHour: 23 }))).toBe('excited');
  });

  it('returns sleepy for late night (hour >= 22) when no higher priority', () => {
    expect(evaluate(baseExpense(3000), baseCtx({ currentHour: 22 }))).toBe('sleepy');
  });

  it('returns soft-sad for large spending >= 50000', () => {
    expect(evaluate(baseExpense(50000), baseCtx())).toBe('soft-sad');
  });

  it('returns happy for small spending < 5000', () => {
    expect(evaluate(baseExpense(4999), baseCtx())).toBe('happy');
  });

  it('returns happy as default fallback', () => {
    expect(evaluate(baseExpense(10000), baseCtx())).toBe('happy');
  });

  it('first-record-today beats streak (priority 1 > priority 2)', () => {
    const ctx = baseCtx({ isFirstRecordToday: true, currentStreak: 5 });
    expect(evaluate(baseExpense(1000), ctx)).toBe('surprised');
  });
});

const incomeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 't1',
  kind: 'income',
  amount: 1_000_000,
  category: 'salary',
  sobagiEmotion: 'happy', // not consulted by evaluate
  createdAt: '2026-05-24T14:00:00.000Z',
  ...overrides,
});

const incomeCtx = (overrides: Partial<EmotionContext> = {}): EmotionContext => ({
  currentHour: 14,
  currentStreak: 0,
  isFirstRecordToday: false,
  ...overrides,
});

describe('evaluate — income subroutine', () => {
  describe('positive', () => {
    it('returns sleepy when hour >= 22', () => {
      expect(evaluate(incomeExpense(), incomeCtx({ currentHour: 23 }))).toBe('sleepy');
      expect(evaluate(incomeExpense(), incomeCtx({ currentHour: 22 }))).toBe('sleepy');
    });

    it('returns happy by default', () => {
      expect(evaluate(incomeExpense(), incomeCtx({ currentHour: 9 }))).toBe('happy');
      expect(evaluate(incomeExpense(), incomeCtx({ currentHour: 15 }))).toBe('happy');
    });
  });

  describe('negatives — these dimensions must NOT affect income emotion', () => {
    it('isFirstRecordToday does not route income to surprised', () => {
      const result = evaluate(incomeExpense(), incomeCtx({ isFirstRecordToday: true }));
      expect(result).toBe('happy');
      expect(result).not.toBe('surprised');
    });

    it('large amount does not route income to soft-sad', () => {
      const result = evaluate(incomeExpense({ amount: 10_000_000 }), incomeCtx());
      expect(result).toBe('happy');
      expect(result).not.toBe('soft-sad');
    });

    it('streak does not route income to excited', () => {
      const result = evaluate(incomeExpense(), incomeCtx({ currentStreak: 7 }));
      expect(result).toBe('happy');
      expect(result).not.toBe('excited');
    });

    it('surprised is never returned for income, regardless of context combination', () => {
      const probes: EmotionContext[] = [
        incomeCtx({ isFirstRecordToday: true, currentStreak: 0, currentHour: 9 }),
        incomeCtx({ isFirstRecordToday: true, currentStreak: 10, currentHour: 23 }),
        incomeCtx({ isFirstRecordToday: true, currentHour: 5 }),
      ];
      probes.forEach((c) => {
        expect(evaluate(incomeExpense(), c)).not.toBe('surprised');
      });
    });
  });

  describe('regression — spending chain unaffected', () => {
    it('first record today on spending still returns surprised', () => {
      const spendingExpense: Expense = { ...incomeExpense(), kind: 'spending', category: 'cafe' };
      expect(evaluate(spendingExpense, incomeCtx({ isFirstRecordToday: true }))).toBe('surprised');
    });

    it('spending large amount still returns soft-sad', () => {
      const spendingExpense: Expense = { ...incomeExpense(), kind: 'spending', category: 'cafe', amount: 60_000 };
      expect(evaluate(spendingExpense, incomeCtx())).toBe('soft-sad');
    });
  });
});
