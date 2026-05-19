import { getDayFeeling } from '../src/services/dayFeelingService';
import { Expense } from '../src/types';

const make = (overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'category'>): Expense => ({
  createdAt: '2026-05-19T10:00:00',
  sobagiEmotion: 'happy',
  ...overrides,
});

describe('getDayFeeling — empty', () => {
  it('returns quiet for empty expenses', () => {
    expect(getDayFeeling([], '2026-05-19').type).toBe('quiet');
  });
});

describe('getDayFeeling — hard override', () => {
  it('returns hard when any record has 😔', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5000, category: 'cafe', userEmotion: '😔' })],
      '2026-05-19',
    );
    expect(r.type).toBe('hard');
  });

  it('returns hard when any record has 😤', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5000, category: 'cafe', userEmotion: '😤' })],
      '2026-05-19',
    );
    expect(r.type).toBe('hard');
  });
});

describe('getDayFeeling — caffeinated', () => {
  it('returns caffeinated when cafe count ≥ 2', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500, category: 'cafe' }),
        make({ id: '2', amount: 4500, category: 'cafe' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('caffeinated');
  });
});

describe('getDayFeeling — warm', () => {
  it('returns warm when home_meal + dining_out ≥ 2', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 9000,  category: 'home_meal' }),
        make({ id: '2', amount: 11000, category: 'dining_out' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });

  it('returns warm for cafe + home_meal combo', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500, category: 'cafe' }),
        make({ id: '2', amount: 9000, category: 'home_meal' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });

  it('returns warm for cafe + dining_out combo', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500,  category: 'cafe' }),
        make({ id: '2', amount: 11000, category: 'dining_out' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });
});

describe('getDayFeeling — sweet', () => {
  it('returns sweet for a small cafe purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 4500, category: 'cafe' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });

  it('returns sweet for a small home_meal purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5500, category: 'home_meal' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });

  it('returns sweet for a small dining_out purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5500, category: 'dining_out' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });
});

describe('getDayFeeling — selfcare', () => {
  it('returns selfcare when hobby is present and no earlier bucket fires', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 25000, category: 'hobby' })],
      '2026-05-19',
    );
    expect(r.type).toBe('selfcare');
  });
});

describe('getDayFeeling — active', () => {
  it('returns active when transport + ≥3 distinct categories', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 2500,  category: 'transport' }),
        make({ id: '2', amount: 12000, category: 'dining_out' }),
        make({ id: '3', amount: 18000, category: 'living' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('active');
  });
});

describe('getDayFeeling — quiet', () => {
  it('returns quiet when total < 8000 and no earlier bucket fires', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 7500, category: 'transport' })],
      '2026-05-19',
    );
    expect(r.type).toBe('quiet');
  });
});

describe('getDayFeeling — modest', () => {
  it('returns modest as fallback for an ordinary day', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 25000, category: 'living' })],
      '2026-05-19',
    );
    expect(r.type).toBe('modest');
  });
});
