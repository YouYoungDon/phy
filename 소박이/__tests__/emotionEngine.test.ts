import { evaluate, buildEmotionContext } from '../src/services/emotionEngine';
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

describe('buildEmotionContext — date-context (pre-dogfooding QA #1/#2)', () => {
  describe('today (real-time) save uses today context', () => {
    it('first non-income record today → isFirstRecordToday true', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: true,
        todayNonIncomeRecordCount: 0,
        streak: 5,
        nowHour: 14,
        recordHour: 14,
      });
      expect(ctx).toEqual({ isFirstRecordToday: true, currentStreak: 5, currentHour: 14 });
    });

    it('later record today → isFirstRecordToday false, keeps streak + now hour', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: true,
        todayNonIncomeRecordCount: 2,
        streak: 5,
        nowHour: 23,
        recordHour: 23,
      });
      expect(ctx).toEqual({ isFirstRecordToday: false, currentStreak: 5, currentHour: 23 });
    });

    it('today first record still drives the surprised welcome through evaluate', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: true,
        todayNonIncomeRecordCount: 0,
        streak: 0,
        nowHour: 10,
        recordHour: 10,
      });
      const spending: Expense = { ...baseExpense(3000), kind: 'spending' };
      expect(evaluate(spending, ctx)).toBe('surprised');
    });
  });

  describe('past-date (back-dated) save is quiet', () => {
    it('never first-record-today, never borrows streak, uses the record hour', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: false,
        todayNonIncomeRecordCount: 0, // today is empty, but this is a past save
        streak: 9,
        nowHour: 10,
        recordHour: 12, // back-dated records anchor to noon
      });
      expect(ctx).toEqual({ isFirstRecordToday: false, currentStreak: 0, currentHour: 12 });
    });

    it('a past-date spending save does NOT resolve to surprised', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: false,
        todayNonIncomeRecordCount: 0,
        streak: 0,
        nowHour: 10,
        recordHour: 12,
      });
      const spending: Expense = { ...baseExpense(3000), kind: 'spending' };
      expect(evaluate(spending, ctx)).not.toBe('surprised');
      expect(evaluate(spending, ctx)).toBe('happy');
    });

    it('a past-date save with a high today-streak does NOT resolve to excited', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: false,
        todayNonIncomeRecordCount: 0,
        streak: 9,
        nowHour: 10,
        recordHour: 12,
      });
      const spending: Expense = { ...baseExpense(3000), kind: 'spending' };
      expect(evaluate(spending, ctx)).not.toBe('excited');
    });

    it('a large past-date spending still reflects the record (soft-sad)', () => {
      const ctx = buildEmotionContext({
        isSelectedDateToday: false,
        todayNonIncomeRecordCount: 0,
        streak: 0,
        nowHour: 10,
        recordHour: 12,
      });
      const spending: Expense = { ...baseExpense(60_000), kind: 'spending' };
      expect(evaluate(spending, ctx)).toBe('soft-sad');
    });
  });
});
