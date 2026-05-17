// __tests__/foundItemService.test.ts
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { checkForFoundItem, promoteStaged } from '../src/services/foundItemService';
import { Expense } from '../src/types';

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

  it('does nothing if all 8 items already found', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-found-item-ids')
        return ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8'];
      return null;
    });
    await checkForFoundItem([makeExpense()], 10);
    expect(storageService.save).not.toHaveBeenCalled();
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
});

describe('promoteStaged', () => {
  it('does nothing if no staged item exists', async () => {
    await promoteStaged();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does nothing if lastItemDate is today', async () => {
    const today = new Date().toISOString().slice(0, 10);
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
