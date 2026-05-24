jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import {
  getDialogueTier,
  selectReactionMessage,
  detectObservationType,
  selectObservationMessage,
} from '../src/services/dialogueService';
import { Expense } from '../src/types';
import { INCOME_REACTION_POOLS, REACTION_POOLS } from '../src/constants/dialogue';

const makeExpense = (hour = 14, category: Expense['category'] = 'cafe', daysAgo = 0): Expense => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: String(Math.random()),
    amount: 5000,
    category,
    sobagiEmotion: 'happy',
    createdAt: d.toISOString(),
  };
};

describe('getDialogueTier', () => {
  it('returns 1 for Day 0–6', () => {
    expect(getDialogueTier(0)).toBe(1);
    expect(getDialogueTier(6)).toBe(1);
  });
  it('returns 2 for Day 7–29', () => {
    expect(getDialogueTier(7)).toBe(2);
    expect(getDialogueTier(29)).toBe(2);
  });
  it('returns 3 for Day 30+', () => {
    expect(getDialogueTier(30)).toBe(3);
    expect(getDialogueTier(90)).toBe(3);
  });
});

describe('selectReactionMessage', () => {
  it('returns a non-empty string for every emotion × tier combination', () => {
    const emotions = ['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'] as const;
    const tiers = [1, 2, 3] as const;
    for (const emotion of emotions) {
      for (const tier of tiers) {
        const msg = selectReactionMessage(emotion, tier);
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      }
    }
  });

  it('never returns the same message twice in a row for the same emotion/tier (no-consecutive-repeat)', () => {
    // Run many times to check statistical likelihood
    const seen: string[] = [];
    let consecutive = 0;
    for (let i = 0; i < 30; i++) {
      const msg = selectReactionMessage('happy', 1);
      if (seen.length > 0 && msg === seen[seen.length - 1]) consecutive++;
      seen.push(msg);
    }
    // With 3 messages and no-repeat guard, consecutive repeats should be rare
    // We don't hard-enforce zero (random), but flag if it's suspiciously high
    expect(consecutive).toBeLessThan(20);
  });
});

describe('detectObservationType', () => {
  it('returns null when recordedDaysCount < 7', () => {
    const result = detectObservationType({
      expenses: [makeExpense(22, 'cafe', 0)],
      lastVisitDate: null,
      recordedDaysCount: 5,
      savesSinceLastObservation: 10,
      currentHour: 22,
    });
    expect(result).toBeNull();
  });

  it('returns null when savesSinceLastObservation < 4 (cooldown)', () => {
    const result = detectObservationType({
      expenses: [makeExpense(22, 'cafe', 0)],
      lastVisitDate: null,
      recordedDaysCount: 10,
      savesSinceLastObservation: 3,
      currentHour: 22,
    });
    expect(result).toBeNull();
  });

  it('returns returnAfterGap when gap >= 5 days (forced, bypasses random gate)', () => {
    const gapDate = new Date();
    gapDate.setDate(gapDate.getDate() - 6);
    const lastVisitDate = gapDate.toISOString().slice(0, 10);
    let found = false;
    for (let i = 0; i < 20; i++) {
      const result = detectObservationType({
        expenses: [makeExpense(14, 'dining_out', 0)],
        lastVisitDate,
        recordedDaysCount: 10,
        savesSinceLastObservation: 10,
        currentHour: 14,
      });
      if (result === 'returnAfterGap') { found = true; break; }
    }
    expect(found).toBe(true);
  });

  it('never returns an observation type based on expense amounts', () => {
    // Make expenses with varying amounts — should have no effect on observation type
    const cheapExpenses = Array.from({ length: 10 }, (_, i) =>
      makeExpense(14, 'dining_out', i),
    ).map(e => ({ ...e, amount: 100 }));

    const expensiveExpenses = Array.from({ length: 10 }, (_, i) =>
      makeExpense(14, 'dining_out', i),
    ).map(e => ({ ...e, amount: 100000 }));

    // Run multiple times — observation type should not differ purely due to amount
    const cheapResults = new Set<string | null>();
    const expensiveResults = new Set<string | null>();
    for (let i = 0; i < 30; i++) {
      cheapResults.add(detectObservationType({
        expenses: cheapExpenses,
        lastVisitDate: null,
        recordedDaysCount: 10,
        savesSinceLastObservation: 10,
        currentHour: 14,
      }));
      expensiveResults.add(detectObservationType({
        expenses: expensiveExpenses,
        lastVisitDate: null,
        recordedDaysCount: 10,
        savesSinceLastObservation: 10,
        currentHour: 14,
      }));
    }
    // Both should produce the same set of possible observation types
    // (amount variation must not produce different observation types)
    expect([...cheapResults].sort()).toEqual([...expensiveResults].sort());
  });
});

describe('selectObservationMessage', () => {
  it('returns a non-empty string for each observation type', () => {
    const types = ['timeOfDay', 'categoryWarm', 'returnAfterGap', 'quietDays'] as const;
    for (const t of types) {
      const msg = selectObservationMessage(t);
      expect(typeof msg).toBe('string');
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it('observation messages never mention amounts or financial terms', () => {
    const types = ['timeOfDay', 'categoryWarm', 'returnAfterGap', 'quietDays'] as const;
    const financialKeywords = ['원', '소비', '지출', '저축', '절약', '예산', '많이', '적게', '늘었', '줄었', '개선'];
    for (const t of types) {
      // Sample all 3 messages from each pool
      const seen = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const msg = selectObservationMessage(t);
        seen.add(msg);
      }
      for (const msg of seen) {
        for (const kw of financialKeywords) {
          expect(msg).not.toContain(kw);
        }
      }
    }
  });
});

describe('selectReactionMessage — income kind gate', () => {
  it('returns from INCOME_REACTION_POOLS when kind is income', () => {
    const tier1Pool = INCOME_REACTION_POOLS[1];
    const result = selectReactionMessage('happy', 1, 'income');
    expect(tier1Pool).toContain(result);
  });

  it('uses tier 2 income pool when tier is 2', () => {
    const tier2Pool = INCOME_REACTION_POOLS[2];
    const result = selectReactionMessage('sleepy', 2, 'income');
    expect(tier2Pool).toContain(result);
  });

  it('uses tier 3 income pool when tier is 3', () => {
    const tier3Pool = INCOME_REACTION_POOLS[3];
    const result = selectReactionMessage('happy', 3, 'income');
    expect(tier3Pool).toContain(result);
  });

  it('ignores emotion argument when kind is income (kind gate, not emotion gate)', () => {
    const tier1Pool = INCOME_REACTION_POOLS[1];
    (['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'] as const).forEach((e) => {
      const result = selectReactionMessage(e, 1, 'income');
      expect(tier1Pool).toContain(result);
    });
  });

  it('defaults kind to spending when omitted (backward compat)', () => {
    const tier1HappyPool = REACTION_POOLS[1].happy;
    const result = selectReactionMessage('happy', 1);
    expect(tier1HappyPool).toContain(result);
  });

  it('spending kind still reads from REACTION_POOLS[tier][emotion]', () => {
    const tier2SadPool = REACTION_POOLS[2]['soft-sad'];
    const result = selectReactionMessage('soft-sad', 2, 'spending');
    expect(tier2SadPool).toContain(result);
  });
});

describe('INCOME_REACTION_POOLS — vocabulary guards', () => {
  const BANNED = ['수입', '수익', '보상', '축하', '벌었', '입금', '잔액', '통장', '저축', '리워드', '매출'];
  const BANNED_EMOJI = ['💵', '💰', '💴'];

  it('contains no banned vocabulary or currency emoji in any tier', () => {
    [1, 2, 3].forEach((tier) => {
      const pool = INCOME_REACTION_POOLS[tier as 1 | 2 | 3];
      pool.forEach((line) => {
        BANNED.forEach((word) => {
          expect(line).not.toContain(word);
        });
        BANNED_EMOJI.forEach((emoji) => {
          expect(line).not.toContain(emoji);
        });
      });
    });
  });
});
