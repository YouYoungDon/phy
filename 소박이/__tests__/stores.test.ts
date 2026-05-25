jest.mock('../src/services/storageService', () => ({
  save: jest.fn().mockResolvedValue(undefined),
}));

import { useEmotionStore } from '../src/store/emotionStore';
import { useExpenseStore } from '../src/store/expenseStore';
import { useUserStore, getLevel, getNextThreshold } from '../src/store/userStore';
import { useDiscoveryStore } from '../src/store/discoveryStore';
import { Expense } from '../src/types';

const mockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1',
  amount: 4500,
  category: 'cafe',
  sobagiEmotion: 'happy',
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('emotionStore', () => {
  it('setEmotion updates currentEmotion and currentMessage', () => {
    useEmotionStore.getState().setEmotion('excited', '신나요!');
    const { currentEmotion, currentMessage } = useEmotionStore.getState();
    expect(currentEmotion).toBe('excited');
    expect(currentMessage).toBe('신나요!');
  });
});

describe('expenseStore', () => {
  beforeEach(() => useExpenseStore.setState({ expenses: [] }));

  it('addExpense appends to expenses', () => {
    const expense = mockExpense();
    useExpenseStore.getState().addExpense(expense);
    expect(useExpenseStore.getState().expenses).toHaveLength(1);
  });

  it('getTodayExpenses returns only today records', () => {
    const today = mockExpense({ createdAt: new Date().toISOString() });
    const old = mockExpense({ id: '2', createdAt: '2020-01-01T00:00:00.000Z' });
    useExpenseStore.getState().hydrate([today, old]);
    expect(useExpenseStore.getState().getTodayExpenses()).toHaveLength(1);
  });
});

describe('userStore — level thresholds', () => {
  it('getLevel returns 1 at 0 days', () => {
    expect(getLevel(0)).toBe(1);
  });

  it('getLevel returns 1 at 6 days (below Lv.2 threshold)', () => {
    expect(getLevel(6)).toBe(1);
  });

  it('getLevel returns 2 at exactly 7 days', () => {
    expect(getLevel(7)).toBe(2);
  });

  it('getLevel returns 3 at exactly 20 days', () => {
    expect(getLevel(20)).toBe(3);
  });

  it('getLevel returns 7 at 160+ days', () => {
    expect(getLevel(160)).toBe(7);
    expect(getLevel(999)).toBe(7);
  });

  it('getNextThreshold shows 7 when at 0 recorded days', () => {
    expect(getNextThreshold(0)).toBe(7);
  });

  it('getNextThreshold shows 20 when at Lv.2 (7 days)', () => {
    expect(getNextThreshold(7)).toBe(20);
  });
});

describe('userStore — incrementRecordedDays', () => {
  beforeEach(() =>
    useUserStore.setState({
      level: 1, streak: 0, totalRecordCount: 0, recordedDaysCount: 0, roomStage: 1,
    })
  );

  it('incrementRecordedDays increments recordedDaysCount', () => {
    useUserStore.getState().incrementRecordedDays();
    expect(useUserStore.getState().recordedDaysCount).toBe(1);
  });

  it('reaches Lv.2 at 7 recorded days', () => {
    useUserStore.setState({ recordedDaysCount: 6 });
    useUserStore.getState().incrementRecordedDays();
    expect(useUserStore.getState().level).toBe(2);
  });

  it('reaches Lv.3 at 20 recorded days', () => {
    useUserStore.setState({ recordedDaysCount: 19 });
    useUserStore.getState().incrementRecordedDays();
    expect(useUserStore.getState().level).toBe(3);
  });

  it('roomStage stays 1 regardless of level (no stage assets yet)', () => {
    useUserStore.setState({ recordedDaysCount: 159 });
    useUserStore.getState().incrementRecordedDays();
    expect(useUserStore.getState().level).toBe(7);
    expect(useUserStore.getState().roomStage).toBe(1);
  });
});

describe('discoveryStore', () => {
  beforeEach(() => useDiscoveryStore.setState({ queue: [], kept: [] }));

  it('hydrate populates queue and kept as the single source of truth', () => {
    useDiscoveryStore.getState().hydrate({ queue: ['m6', 'a3'], kept: ['s5'] });
    expect(useDiscoveryStore.getState().queue).toEqual(['m6', 'a3']);
    expect(useDiscoveryStore.getState().kept).toEqual(['s5']);
  });

  it('keep moves an item from the queue front into kept', () => {
    useDiscoveryStore.setState({ queue: ['m6', 'a3'], kept: [] });
    useDiscoveryStore.getState().keep('m6');
    expect(useDiscoveryStore.getState().queue).toEqual(['a3']);
    expect(useDiscoveryStore.getState().kept).toEqual(['m6']);
  });

  it('keep does not duplicate an already-kept item', () => {
    useDiscoveryStore.setState({ queue: ['m6'], kept: ['m6'] });
    useDiscoveryStore.getState().keep('m6');
    expect(useDiscoveryStore.getState().kept).toEqual(['m6']);
    expect(useDiscoveryStore.getState().queue).toEqual([]);
  });
});

describe('userStore — rest fields', () => {
  beforeEach(() => {
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
  });

  it('setPebbleCount writes the new value', () => {
    useUserStore.getState().setPebbleCount(42);
    expect(useUserStore.getState().pebbleCount).toBe(42);
  });

  it('setRestsToday writes the new value', () => {
    useUserStore.getState().setRestsToday(1);
    expect(useUserStore.getState().restsToday).toBe(1);
  });

  it('setLastRestDate writes the new value', () => {
    useUserStore.getState().setLastRestDate('2026-05-21');
    expect(useUserStore.getState().lastRestDate).toBe('2026-05-21');
  });

  it('setLastRestAt writes the new value', () => {
    useUserStore.getState().setLastRestAt('2026-05-21T12:00:00Z');
    expect(useUserStore.getState().lastRestAt).toBe('2026-05-21T12:00:00Z');
  });

  it('hydrate populates rest fields from a UserState', () => {
    useUserStore.getState().hydrate({
      level: 2,
      streak: 3,
      totalRecordCount: 10,
      recordedDaysCount: 7,
      roomStage: 1,
      pebbleCount: 55,
      restsToday: 1,
      lastRestDate: '2026-05-21',
      lastRestAt: '2026-05-21T12:00:00Z',
    });
    expect(useUserStore.getState().pebbleCount).toBe(55);
    expect(useUserStore.getState().restsToday).toBe(1);
    expect(useUserStore.getState().lastRestDate).toBe('2026-05-21');
    expect(useUserStore.getState().lastRestAt).toBe('2026-05-21T12:00:00Z');
  });
});
