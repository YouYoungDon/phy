import {
  computeTimeArrivals, enqueueArrivals, keepItem, seedKeptForMigration, keepsakeLineFor,
} from '../src/services/discoveryService';
import { ALL_BAG_ITEMS } from '../src/constants/bagItems';
import { OBJECT_LINES } from '../src/constants/ambientDialogue';
import { FINDABLE_ITEMS } from '../src/constants/findableItems';

const day0Ids = ALL_BAG_ITEMS.filter((i) => i.minDays === 0).map((i) => i.id);

describe('computeTimeArrivals', () => {
  it('returns items whose minDays <= recordedDaysCount, not already kept/queued', () => {
    const arrivals = computeTimeArrivals(0, [], []);
    expect(arrivals.sort()).toEqual(day0Ids.sort());
  });
  it('excludes kept and queued ids', () => {
    const [first, ...rest] = day0Ids;
    const arrivals = computeTimeArrivals(0, [first!], rest.slice(0, 1));
    expect(arrivals).not.toContain(first);
    expect(arrivals).not.toContain(rest[0]);
  });
  it('includes an item exactly at its minDays boundary', () => {
    const item = ALL_BAG_ITEMS.find((i) => i.minDays === 7);
    expect(computeTimeArrivals(7, [], [])).toContain(item!.id);
    expect(computeTimeArrivals(6, [], [])).not.toContain(item!.id);
  });
});

describe('enqueueArrivals', () => {
  it('appends new ids, de-duplicated, order preserved', () => {
    expect(enqueueArrivals(['a'], ['b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
  });
});

describe('keepItem', () => {
  it('moves an id from queue to kept', () => {
    expect(keepItem('b', ['a', 'b', 'c'], ['x'])).toEqual({ queue: ['a', 'c'], kept: ['x', 'b'] });
  });
  it('is idempotent if already kept', () => {
    expect(keepItem('x', ['x'], ['x'])).toEqual({ queue: [], kept: ['x'] });
  });
});

describe('seedKeptForMigration', () => {
  it('unions unlocked-by-days + placed + found, de-duplicated', () => {
    const seeded = seedKeptForMigration(7, ['placed1'], ['found1']);
    expect(seeded).toEqual(expect.arrayContaining(['placed1', 'found1']));
    for (const i of ALL_BAG_ITEMS.filter((x) => x.minDays <= 7)) {
      expect(seeded).toContain(i.id);
    }
    expect(new Set(seeded).size).toBe(seeded.length);
  });
});

describe('keepsakeLineFor', () => {
  const first = () => 0; // deterministic rng → first line of a pool

  it('uses an object line when the item has one', () => {
    expect(keepsakeLineFor('m6', first)).toBe(OBJECT_LINES.m6![0]!.text);
  });
  it('falls back to a catalog item desc', () => {
    const a1 = ALL_BAG_ITEMS.find((i) => i.id === 'a1')!;
    expect(keepsakeLineFor('a1', first)).toBe(a1.desc);
  });
  it('falls back to a trinket findLine', () => {
    const f1 = FINDABLE_ITEMS.find((f) => f.id === 'f1')!;
    expect(keepsakeLineFor('f1', first)).toBe(f1.findLine);
  });
  it('returns a gentle default for an unknown id', () => {
    expect(keepsakeLineFor('zzz', first)).toBe('여기 잘 간직하고 있어요 🌿');
  });
});
