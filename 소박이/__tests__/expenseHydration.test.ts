jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import { normalizeExpense } from '../src/services/expenseService';
import { Expense } from '../src/types';

function baseExpense(): Omit<Expense, 'kind'> {
  return {
    id: '1',
    amount: 5000,
    category: 'cafe',
    sobagiEmotion: 'happy',
    createdAt: '2026-05-23T10:00:00',
    memo: 'latte',
  };
}

describe('normalizeExpense', () => {
  it('sets kind to spending when kind is missing on a spending record', () => {
    const raw = baseExpense();
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
  });

  it('sets kind to income when category is salary and kind is missing', () => {
    const raw = { ...baseExpense(), category: 'salary' as const };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
  });

  it('corrects mismatched kind: spending+salary → income', () => {
    const raw: Expense = { ...baseExpense(), kind: 'spending', category: 'salary' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
  });

  it('corrects mismatched kind: income+cafe → spending', () => {
    const raw: Expense = { ...baseExpense(), kind: 'income', category: 'cafe' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
  });

  it('keeps a valid spending record unchanged', () => {
    const raw: Expense = { ...baseExpense(), kind: 'spending', category: 'cafe' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
    expect(result.category).toBe('cafe');
    expect(result.id).toBe('1');
    expect(result.amount).toBe(5000);
    expect(result.sobagiEmotion).toBe('happy');
    expect(result.memo).toBe('latte');
  });

  it('keeps a valid income record unchanged', () => {
    const raw: Expense = { ...baseExpense(), kind: 'income', category: 'salary' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
    expect(result.category).toBe('salary');
  });

  it('preserves all other fields (id, amount, sobagiEmotion, createdAt, userEmotion, memo)', () => {
    const raw: Expense = {
      id: 'preserved-id',
      amount: 12345,
      category: 'bonus',
      sobagiEmotion: 'excited',
      createdAt: '2026-05-23T15:30:00',
      userEmotion: '🥰',
      memo: 'preserved memo',
    };
    const result = normalizeExpense(raw);
    expect(result.id).toBe('preserved-id');
    expect(result.amount).toBe(12345);
    expect(result.sobagiEmotion).toBe('excited');
    expect(result.createdAt).toBe('2026-05-23T15:30:00');
    expect(result.userEmotion).toBe('🥰');
    expect(result.memo).toBe('preserved memo');
    expect(result.kind).toBe('income');
  });
});
