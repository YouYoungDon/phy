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
