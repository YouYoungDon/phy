import {
  selectAmbientLine, eligibleCategories, linesForCategory,
  pickLine, pickWeightedCategory, AmbientContext, AmbientSession,
} from '../src/services/ambientDialogueService';
import {
  BASELINE_LINES, TIME_OF_DAY_LINES, OBJECT_LINES, RARE_LINES, RETURN_LINES, AmbientLine,
} from '../src/constants/ambientDialogue';

// Deterministic rng: yields the given values in order, repeating the last.
function seq(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)] ?? 0;
}

const baseCtx: AmbientContext = {
  timeBucket: 'morning',
  recordedDaysCount: 3,
  streak: 1,
  isNoSpendToday: false,
  placedItemIds: [],
  daysSinceLastVisit: 0,
  calmActive: false,
  restActive: false,
};
const freshSession = (): AmbientSession => ({ recentIds: [], returnGreetingShown: false, lastWasSilence: false });

describe('eligibleCategories', () => {
  it('always includes baseline + timeOfDay', () => {
    expect(eligibleCategories(baseCtx)).toEqual(expect.arrayContaining(['baseline', 'timeOfDay']));
  });
  it('adds noSpend only when isNoSpendToday', () => {
    expect(eligibleCategories(baseCtx)).not.toContain('noSpend');
    expect(eligibleCategories({ ...baseCtx, isNoSpendToday: true })).toContain('noSpend');
  });
  it('adds accumulation at >=30 days OR >=7 streak (boundary)', () => {
    expect(eligibleCategories({ ...baseCtx, recordedDaysCount: 29, streak: 6 })).not.toContain('accumulation');
    expect(eligibleCategories({ ...baseCtx, recordedDaysCount: 30 })).toContain('accumulation');
    expect(eligibleCategories({ ...baseCtx, streak: 7 })).toContain('accumulation');
  });
  it('adds atmosphere when calm or rest active', () => {
    expect(eligibleCategories({ ...baseCtx, calmActive: true })).toContain('atmosphere');
    expect(eligibleCategories({ ...baseCtx, restActive: true })).toContain('atmosphere');
  });
  it('adds object only when a placed item has lines', () => {
    expect(eligibleCategories({ ...baseCtx, placedItemIds: ['t1'] })).not.toContain('object'); // t1 has no lines
    expect(eligibleCategories({ ...baseCtx, placedItemIds: ['m6'] })).toContain('object');
  });
});

describe('linesForCategory', () => {
  it('resolves the timeOfDay sub-pool by bucket', () => {
    expect(linesForCategory({ ...baseCtx, timeBucket: 'evening' }, 'timeOfDay'))
      .toEqual(TIME_OF_DAY_LINES.evening);
  });
  it('object lines only for placed items', () => {
    const lines = linesForCategory({ ...baseCtx, placedItemIds: ['m6'] }, 'object');
    expect(lines).toEqual(OBJECT_LINES.m6);
  });
  it('lamp (a6) lines suppressed outside evening/latenight', () => {
    expect(linesForCategory({ ...baseCtx, timeBucket: 'morning', placedItemIds: ['a6'] }, 'object')).toEqual([]);
    expect(linesForCategory({ ...baseCtx, timeBucket: 'evening', placedItemIds: ['a6'] }, 'object')).toEqual(OBJECT_LINES.a6);
    expect(linesForCategory({ ...baseCtx, timeBucket: 'latenight', placedItemIds: ['a6'] }, 'object')).toEqual(OBJECT_LINES.a6);
  });
  it('atmosphere prefers rest lines when restActive', () => {
    const rest = linesForCategory({ ...baseCtx, restActive: true }, 'atmosphere');
    expect(rest[0]?.id).toMatch(/^rest-/);
    const calm = linesForCategory({ ...baseCtx, calmActive: true }, 'atmosphere');
    expect(calm[0]?.id).toMatch(/^calm-/);
  });
});

describe('pickLine', () => {
  it('excludes recently shown ids', () => {
    const pool: AmbientLine[] = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
    expect(pickLine(pool, ['a'], seq(0))?.id).toBe('b');
  });
  it('falls back to the full pool when all are recent', () => {
    const pool: AmbientLine[] = [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }];
    expect(pickLine(pool, ['a', 'b'], seq(0))?.id).toBe('a');
  });
});

describe('pickWeightedCategory', () => {
  it('never returns a STRONG_NO_CONSECUTIVE lastCategory', () => {
    const ctx = { ...baseCtx, placedItemIds: ['m6'] };
    const cats = eligibleCategories(ctx); // includes 'object'
    for (let r = 0; r < 1; r += 0.05) {
      expect(pickWeightedCategory(ctx, cats, [], 'object', seq(r))).not.toBe('object');
    }
  });
  it('allows a non-strong lastCategory (timeOfDay) to repeat', () => {
    const cats = eligibleCategories(baseCtx);
    const got = pickWeightedCategory(baseCtx, cats, [], 'timeOfDay', seq(0.99));
    expect(['baseline', 'timeOfDay']).toContain(got);
  });
});

describe('selectAmbientLine — return override', () => {
  it('forces a return greeting at the gap threshold, once', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const sel = selectAmbientLine(ctx, freshSession(), seq(0));
    expect(sel).toMatchObject({ kind: 'line', category: 'return', isReturnGreeting: true });
    expect(sel.kind === 'line' && RETURN_LINES.some((l) => l.id === sel.line.id)).toBe(true);
  });
  it('does not greet again once returnGreetingShown', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const sel = selectAmbientLine(ctx, { recentIds: [], returnGreetingShown: true, lastWasSilence: false }, seq(0.99, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('return');
  });
  it('does not greet below the threshold', () => {
    const sel = selectAmbientLine({ ...baseCtx, daysSinceLastVisit: 6 }, freshSession(), seq(0.99, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('return');
  });
});

describe('selectAmbientLine — rare override', () => {
  it('emits a rare line when the roll hits and an unshown rare exists', () => {
    const sel = selectAmbientLine(baseCtx, freshSession(), seq(0.001, 0));
    expect(sel).toMatchObject({ kind: 'line', category: 'rare' });
  });
  it('suppresses rare when all rare ids are in the ring', () => {
    const session: AmbientSession = { recentIds: RARE_LINES.map((l) => l.id), returnGreetingShown: false, lastWasSilence: false };
    const sel = selectAmbientLine(baseCtx, session, seq(0.001, 0.99, 0, 0));
    expect(sel.kind === 'line' && sel.category).not.toBe('rare');
  });
});

describe('selectAmbientLine — silence', () => {
  it('stays silent on the normal path when the roll hits', () => {
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: false };
    expect(selectAmbientLine(baseCtx, session, seq(0.99, 0.0))).toEqual({ kind: 'silence' });
  });
  it('never silences the first utterance (empty ring)', () => {
    const sel = selectAmbientLine(baseCtx, freshSession(), seq(0.99, 0.0, 0, 0));
    expect(sel.kind).toBe('line');
  });
  it('never silences twice in a row', () => {
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: true };
    const sel = selectAmbientLine(baseCtx, session, seq(0.99, 0.0, 0, 0));
    expect(sel.kind).toBe('line');
  });
  it('return and rare are never silenced', () => {
    const ctx = { ...baseCtx, daysSinceLastVisit: 7 };
    const session: AmbientSession = { recentIds: ['base-1'], returnGreetingShown: false, lastWasSilence: false };
    expect(selectAmbientLine(ctx, session, seq(0)).kind).toBe('line'); // return wins before silence roll
  });
});

describe('selectAmbientLine — weighted normal path', () => {
  it('returns a line from an eligible pool (morning → baseline or morning)', () => {
    const session: AmbientSession = { recentIds: ['x'], returnGreetingShown: false, lastWasSilence: true };
    const sel = selectAmbientLine(baseCtx, session, seq(0.99, 0, 0));
    const eligibleIds = [...BASELINE_LINES, ...TIME_OF_DAY_LINES.morning].map((l) => l.id);
    expect(sel.kind === 'line' && eligibleIds.includes(sel.line.id)).toBe(true);
  });
});
