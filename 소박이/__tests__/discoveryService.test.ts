import {
  computeTimeArrivals, enqueueArrivals, keepItem, seedKeptForMigration,
} from '../src/services/discoveryService';
import { ALL_BAG_ITEMS } from '../src/constants/bagItems';

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
