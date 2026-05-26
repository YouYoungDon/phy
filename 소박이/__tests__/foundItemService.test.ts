// __tests__/foundItemService.test.ts
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { checkForFoundItem, promoteStaged } from '../src/services/foundItemService';
import { Expense } from '../src/types';
import { getLocalDateString } from '../src/utils/date';

const mockLoad = storageService.load as jest.MockedFunction<typeof storageService.load>;

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1',
  amount: 4500,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
});

describe('checkForFoundItem', () => {
  it('does nothing if pending item already exists', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-pending-item-id') return 'f1';
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if staged item already exists', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if recordedDaysCount is below grace period (< 3)', async () => {
    await checkForFoundItem([makeExpense()], 2);
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('stages a re-find when all 8 are already found and a trigger fires', async () => {
    // "New first, repeats later": once every trinket has been discovered, the pool
    // opens up to owned ones so a gentle re-find can happen. makeExpense() is a small
    // cafe purchase (T4 trigger); no cooldown is set, so staging proceeds.
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });

  it('prefers an undiscovered trinket while some remain', async () => {
    // f1..f7 found, only f8 undiscovered: the staged id must be f8 (deterministic —
    // the pool is the single-item [f8], so randomness cannot pick anything else).
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).toHaveBeenCalledWith('sobagi-staged-item-id', 'f8');
  });

  it('stages an item when trigger fires and no cooldown is active', async () => {
    // T4 trigger: small cafe purchase under 6,000
    const smallCafe = makeExpense({ amount: 4500, category: 'cafe' });
    await checkForFoundItem([smallCafe], 5);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });

  it('T3 fires when yesterday had exactly one record, regardless of amount', async () => {
    // Activity-based trigger: shape of presence (one record) is what matters.
    // Amount is large here on purpose — a low-amount rule would miss this.
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const today = new Date().toISOString();
    const yesterdayBigPurchase = makeExpense({
      id: '1', amount: 80000, category: 'living', createdAt: yesterday,
    });
    // Today record so the "recentExpenses.length === 0" early-return doesn't fire.
    // Use shopping (not cafe/food) and a non-small amount so T4 can't fire and
    // we're testing T3 in isolation.
    const todayMid = makeExpense({
      id: '2', amount: 25000, category: 'living', createdAt: today,
    });
    await checkForFoundItem([yesterdayBigPurchase, todayMid], 10);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });

  it('T3 also fires when yesterday was a no-spend day (single record, amount 0)', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const today = new Date().toISOString();
    const yesterdayNoSpend = makeExpense({
      id: '1', amount: 0, category: 'no_spend', createdAt: yesterday,
    });
    const todayMid = makeExpense({
      id: '2', amount: 25000, category: 'living', createdAt: today,
    });
    await checkForFoundItem([yesterdayNoSpend, todayMid], 10);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });

  it('T3 does NOT fire when yesterday had multiple records', async () => {
    // Multi-record yesterday is not "quiet presence"; T3 must not catch it.
    // Today records are mid-amount shopping so T1/T2/T4 cannot fire either.
    const yesterday = new Date(Date.now() - 86400000).toISOString();
    const today = new Date().toISOString();
    const yesterday1 = makeExpense({
      id: '1', amount: 25000, category: 'living', createdAt: yesterday,
    });
    const yesterday2 = makeExpense({
      id: '2', amount: 30000, category: 'living', createdAt: yesterday,
    });
    const todayMid = makeExpense({
      id: '3', amount: 25000, category: 'living', createdAt: today,
    });
    await checkForFoundItem([yesterday1, yesterday2, todayMid], 10);
    expect(storageService.save).not.toHaveBeenCalledWith(
      'sobagi-staged-item-id',
      expect.any(String),
    );
  });
});

describe('promoteStaged', () => {
  it('does nothing if no staged item exists', async () => {
    await promoteStaged();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if lastItemDate is today', async () => {
    const today = getLocalDateString(new Date());
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      if (key === 'sobagi-last-item-date') return today;
      return null;
    });
    await promoteStaged();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('promotes staged to pending when called on a new day', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-staged-item-id') return 'f1';
      if (key === 'sobagi-last-item-date') return '2020-01-01';
      return null;
    });
    await promoteStaged();
    expect(storageService.save).toHaveBeenCalledWith('sobagi-pending-item-id', 'f1');
    expect(storageService.save).toHaveBeenCalledWith('sobagi-staged-item-id', null);
  });
});
