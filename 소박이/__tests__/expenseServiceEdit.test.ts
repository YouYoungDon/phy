jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn(),
}));
jest.mock('../src/services/foundItemService', () => ({
  checkForFoundItem: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { updateExpense, deleteExpense } from '../src/services/expenseService';
import { useExpenseStore } from '../src/store/expenseStore';
import { useUserStore } from '../src/store/userStore';
import { getLocalDateString } from '../src/utils/date';
import { Expense } from '../src/types';

const mockSave = storageService.save as jest.Mock;
const today = getLocalDateString(new Date());

const seed = (): Expense => ({
  id: 'e1',
  kind: 'spending',
  amount: 5000,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  localDate: today,
});

beforeEach(() => {
  useExpenseStore.setState({ expenses: [seed()] });
  useUserStore.setState({
    level: 1,
    streak: 1,
    totalRecordCount: 1,
    recordedDaysCount: 1,
    roomStage: 1,
    pebbleCount: 0,
    restsToday: 0,
    lastRestDate: null,
    lastRestAt: null,
  });
  mockSave.mockReset();
});

describe('updateExpense persistence', () => {
  it('applies the edit and returns true when the write succeeds', async () => {
    mockSave.mockResolvedValue(true);
    const ok = await updateExpense('e1', { amount: 9000, category: 'cafe', kind: 'spending' });
    expect(ok).toBe(true);
    expect(useExpenseStore.getState().expenses[0]?.amount).toBe(9000);
  });

  it('rolls the edit back and returns false when the write fails', async () => {
    mockSave.mockResolvedValue(false);
    const ok = await updateExpense('e1', { amount: 9000, category: 'home_meal', memo: 'x', kind: 'spending' });
    expect(ok).toBe(false);
    // The record must read exactly as before — no phantom edit.
    const e = useExpenseStore.getState().expenses[0];
    expect(e?.amount).toBe(5000);
    expect(e?.category).toBe('cafe');
    expect(e?.memo).toBeUndefined();
  });

  it('returns false for an unknown id without mutating state', async () => {
    mockSave.mockResolvedValue(true);
    const ok = await updateExpense('missing', { amount: 1, category: 'cafe', kind: 'spending' });
    expect(ok).toBe(false);
    expect(useExpenseStore.getState().expenses[0]?.amount).toBe(5000);
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('deleteExpense persistence', () => {
  it('removes the record and recomputes counters when the write succeeds', async () => {
    mockSave.mockResolvedValue(true);
    const ok = await deleteExpense('e1');
    expect(ok).toBe(true);
    expect(useExpenseStore.getState().expenses).toHaveLength(0);
    expect(useUserStore.getState().recordedDaysCount).toBe(0);
    expect(useUserStore.getState().totalRecordCount).toBe(0);
    expect(useUserStore.getState().streak).toBe(0);
  });

  it('restores the record and prior counters when the write fails', async () => {
    mockSave.mockResolvedValue(false);
    const ok = await deleteExpense('e1');
    expect(ok).toBe(false);
    // Record and derived counters must be exactly pre-delete — no phantom removal.
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
    expect(useExpenseStore.getState().expenses[0]?.id).toBe('e1');
    expect(useUserStore.getState().recordedDaysCount).toBe(1);
    expect(useUserStore.getState().totalRecordCount).toBe(1);
    expect(useUserStore.getState().streak).toBe(1);
  });

  it('returns false for an unknown id without mutating state', async () => {
    mockSave.mockResolvedValue(true);
    const ok = await deleteExpense('missing');
    expect(ok).toBe(false);
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
    expect(mockSave).not.toHaveBeenCalled();
  });
});
