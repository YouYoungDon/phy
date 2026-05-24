import { groupByKind, showsAmount, PhotocardRecord } from '../src/components/photocard/photocardGrouping';

const r = (over: Partial<PhotocardRecord> = {}): PhotocardRecord => ({
  amount: 1000,
  ...over,
});

describe('groupByKind', () => {
  it('returns three empty arrays for empty input', () => {
    const out = groupByKind([]);
    expect(out.spending).toEqual([]);
    expect(out.income).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('routes income records by kind', () => {
    const records = [
      r({ id: '1', kind: 'income', category: 'salary' }),
      r({ id: '2', kind: 'income', category: 'bonus' }),
    ];
    const out = groupByKind(records);
    expect(out.income).toHaveLength(2);
    expect(out.spending).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('routes no_spend records by category regardless of kind', () => {
    const records = [
      r({ id: '1', kind: 'spending', category: 'no_spend', amount: 0 }),
    ];
    const out = groupByKind(records);
    expect(out.noSpend).toHaveLength(1);
    expect(out.spending).toEqual([]);
    expect(out.income).toEqual([]);
  });

  it('treats no_spend as no_spend even if kind is mistakenly income', () => {
    // Defensive: if data is malformed (income kind on a no_spend category),
    // category-based routing wins because no_spend is a category-level concept.
    const records = [r({ kind: 'income', category: 'no_spend' })];
    expect(groupByKind(records).noSpend).toHaveLength(1);
    expect(groupByKind(records).income).toEqual([]);
  });

  it('routes records without explicit kind into spending (legacy fallback)', () => {
    // Records normalized at hydration always have kind; this case covers
    // in-memory synthetic records or pre-normalize paths.
    const records = [r({ id: '1', category: 'cafe' })];
    const out = groupByKind(records);
    expect(out.spending).toHaveLength(1);
    expect(out.income).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('preserves input order within each group', () => {
    const records = [
      r({ id: 'a', category: 'cafe' }),
      r({ id: 'b', kind: 'income', category: 'salary' }),
      r({ id: 'c', category: 'home_meal' }),
      r({ id: 'd', kind: 'income', category: 'bonus' }),
    ];
    const out = groupByKind(records);
    expect(out.spending.map((x) => x.id)).toEqual(['a', 'c']);
    expect(out.income.map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('handles a fully mixed day (spending + income + no_spend)', () => {
    // Note: in production the no_spend gate prevents coexistence with other
    // records on the same day, but the helper itself is data-shape neutral.
    const records = [
      r({ id: '1', category: 'cafe' }),
      r({ id: '2', kind: 'income', category: 'salary' }),
      r({ id: '3', kind: 'spending', category: 'no_spend', amount: 0 }),
    ];
    const out = groupByKind(records);
    expect(out.spending).toHaveLength(1);
    expect(out.income).toHaveLength(1);
    expect(out.noSpend).toHaveLength(1);
  });
});

describe('showsAmount', () => {
  it('never shows an amount for a no_spend record (presence marker, no ₩0)', () => {
    expect(showsAmount(r({ category: 'no_spend', kind: 'spending', amount: 0 }))).toBe(false);
    // Even a non-zero/mis-kinded no_spend stays amountless — category wins.
    expect(showsAmount(r({ category: 'no_spend', kind: 'income', amount: 9999 }))).toBe(false);
  });

  it('hides the amount for an income record of 0 (per-record amount-hide)', () => {
    expect(showsAmount(r({ category: 'salary', kind: 'income', amount: 0 }))).toBe(false);
  });

  it('shows the amount for an income record above 0', () => {
    expect(showsAmount(r({ category: 'salary', kind: 'income', amount: 3000000 }))).toBe(true);
  });

  it('shows the amount for spending and legacy (kind-less) records', () => {
    expect(showsAmount(r({ category: 'cafe', kind: 'spending', amount: 5000 }))).toBe(true);
    expect(showsAmount(r({ category: 'cafe', amount: 5000 }))).toBe(true);
  });
});
