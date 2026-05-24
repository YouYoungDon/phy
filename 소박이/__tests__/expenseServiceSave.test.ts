jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
}));
jest.mock('../src/services/foundItemService', () => ({
  checkForFoundItem: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { saveExpense } from '../src/services/expenseService';
import { useExpenseStore } from '../src/store/expenseStore';
import { useUserStore } from '../src/store/userStore';
import { getLocalDateString } from '../src/utils/date';
import { Expense } from '../src/types';

const mockSave = storageService.save as jest.Mock;

const today = getLocalDateString(new Date());

const expense = (): Expense => ({
  id: 'x1',
  kind: 'spending',
  amount: 5000,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  localDate: today,
});

beforeEach(() => {
  useExpenseStore.setState({ expenses: [] });
  useUserStore.setState({
    level: 1,
    streak: 0,
    totalRecordCount: 0,
    recordedDaysCount: 0,
    roomStage: 1,
    pebbleCount: 0,
    restsToday: 0,
    lastRestDate: null,
    lastRestAt: null,
  });
  mockSave.mockReset();
});

describe('saveExpense durability (pre-dogfooding QA #5)', () => {
  it('returns true and keeps the record + derived counts when writes succeed', async () => {
    mockSave.mockResolvedValue(true);
    const ok = await saveExpense(expense());
    expect(ok).toBe(true);
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
    expect(useUserStore.getState().totalRecordCount).toBe(1);
    expect(useUserStore.getState().recordedDaysCount).toBe(1);
  });

  it('returns false and rolls back the optimistic mutation when the EXPENSES write fails', async () => {
    mockSave.mockResolvedValue(false);
    const ok = await saveExpense(expense());
    expect(ok).toBe(false);
    // In-memory must match (empty) storage so a retry cannot duplicate.
    expect(useExpenseStore.getState().expenses).toHaveLength(0);
    expect(useUserStore.getState().totalRecordCount).toBe(0);
    expect(useUserStore.getState().recordedDaysCount).toBe(0);
    expect(useUserStore.getState().streak).toBe(0);
  });

  it('a clean retry after a failed save produces exactly one record (no duplicate)', async () => {
    mockSave.mockResolvedValueOnce(false); // first attempt fails (rolled back)
    const first = await saveExpense(expense());
    expect(first).toBe(false);
    mockSave.mockResolvedValue(true); // retry succeeds
    const second = await saveExpense(expense());
    expect(second).toBe(true);
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
    expect(useUserStore.getState().totalRecordCount).toBe(1);
  });
});
