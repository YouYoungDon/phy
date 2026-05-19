jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import { migrateExpenseCategories } from '../src/services/expenseMigration';
import { Expense } from '../src/types';

// Build a fixture expense whose `category` may be a *legacy* token.
// We cast through `unknown` so this stays compilable after Task 7 removes
// legacy tokens from the ExpenseCategory union.
const legacy = (overrides: { id: string; amount: number; createdAt: string; category: string }): Expense =>
  ({ sobagiEmotion: 'happy', ...overrides }) as unknown as Expense;

const newToken = (overrides: { id: string; amount: number; createdAt: string; category: Expense['category'] }): Expense =>
  ({ sobagiEmotion: 'happy', ...overrides });

describe('migrateExpenseCategories', () => {
  it('returns the same array reference when nothing needs migration', () => {
    const input: Expense[] = [
      newToken({ id: '1', amount: 4000, createdAt: '2026-05-17T10:00:00', category: 'cafe' }),
      newToken({ id: '2', amount: 9000, createdAt: '2026-05-18T10:00:00', category: 'home_meal' }),
    ];
    expect(migrateExpenseCategories(input)).toBe(input);
  });

  it('returns an empty array unchanged', () => {
    const input: Expense[] = [];
    expect(migrateExpenseCategories(input)).toBe(input);
  });

  it('maps legacy food → dining_out', () => {
    const input = [legacy({ id: '1', amount: 12000, createdAt: '2026-05-10T10:00:00', category: 'food' })];
    const out = migrateExpenseCategories(input);
    expect(out[0]!.category).toBe('dining_out');
  });

  it('maps legacy shopping → living', () => {
    const input = [legacy({ id: '1', amount: 22000, createdAt: '2026-05-10T10:00:00', category: 'shopping' })];
    expect(migrateExpenseCategories(input)[0]!.category).toBe('living');
  });

  it('maps legacy other → living', () => {
    const input = [legacy({ id: '1', amount: 5000, createdAt: '2026-05-10T10:00:00', category: 'other' })];
    expect(migrateExpenseCategories(input)[0]!.category).toBe('living');
  });

  it('leaves cafe / transport / no_spend untouched', () => {
    const input: Expense[] = [
      newToken({ id: '1', amount: 4000, createdAt: '2026-05-10T10:00:00', category: 'cafe' }),
      newToken({ id: '2', amount: 1500, createdAt: '2026-05-11T10:00:00', category: 'transport' }),
      newToken({ id: '3', amount: 0,    createdAt: '2026-05-12T10:00:00', category: 'no_spend' }),
    ];
    const out = migrateExpenseCategories(input);
    expect(out.map((e) => e.category)).toEqual(['cafe', 'transport', 'no_spend']);
  });

  it('migrates a mixed array and preserves order', () => {
    const input: Expense[] = [
      legacy({ id: '1', amount: 4000,  createdAt: '2026-05-10T10:00:00', category: 'food' }),
      newToken({ id: '2', amount: 1500, createdAt: '2026-05-11T10:00:00', category: 'cafe' }),
      legacy({ id: '3', amount: 22000, createdAt: '2026-05-12T10:00:00', category: 'shopping' }),
      legacy({ id: '4', amount: 5000,  createdAt: '2026-05-13T10:00:00', category: 'other' }),
    ];
    expect(migrateExpenseCategories(input).map((e) => e.category))
      .toEqual(['dining_out', 'cafe', 'living', 'living']);
  });

  it('is idempotent — running twice equals running once', () => {
    const input: Expense[] = [
      legacy({ id: '1', amount: 4000, createdAt: '2026-05-10T10:00:00', category: 'food' }),
      legacy({ id: '2', amount: 9000, createdAt: '2026-05-11T10:00:00', category: 'shopping' }),
    ];
    const once = migrateExpenseCategories(input);
    const twice = migrateExpenseCategories(once);
    expect(twice).toBe(once);
    expect(twice.map((e) => e.category)).toEqual(['dining_out', 'living']);
  });

  it('preserves non-category fields on migrated records', () => {
    const input = [legacy({
      id: 'abc', amount: 7777, createdAt: '2026-05-10T10:00:00', category: 'food',
    })];
    const out = migrateExpenseCategories(input)[0]!;
    expect(out.id).toBe('abc');
    expect(out.amount).toBe(7777);
    expect(out.createdAt).toBe('2026-05-10T10:00:00');
    expect(out.sobagiEmotion).toBe('happy');
  });
});
