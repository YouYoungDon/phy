import { expenseLocalDate, getLocalDateString } from '../src/utils/date';

describe('expenseLocalDate', () => {
  it('prefers the stored localDate when present', () => {
    const e = { localDate: '2026-01-15', createdAt: '2026-01-20T10:00:00.000Z' };
    // Even though createdAt resolves to a different day, localDate wins.
    expect(expenseLocalDate(e)).toBe('2026-01-15');
  });

  it('falls back to createdAt-derived local date when localDate is absent', () => {
    const createdAt = '2026-01-20T10:00:00.000Z';
    const e = { createdAt };
    expect(expenseLocalDate(e)).toBe(getLocalDateString(new Date(createdAt)));
  });

  it('falls back when localDate is undefined explicitly', () => {
    const createdAt = '2026-03-02T08:30:00.000Z';
    const e = { localDate: undefined, createdAt };
    expect(expenseLocalDate(e)).toBe(getLocalDateString(new Date(createdAt)));
  });

  it('is behavior-preserving for a record whose localDate equals its derived date', () => {
    // This is the non-traveler invariant: localDate captured at creation in the
    // same tz that getLocalDateString uses, so the two are identical and the
    // helper is a no-op versus the old direct derivation.
    const createdAt = '2026-05-24T15:00:00.000Z';
    const derived = getLocalDateString(new Date(createdAt));
    const withLocal = { localDate: derived, createdAt };
    const withoutLocal = { createdAt };
    expect(expenseLocalDate(withLocal)).toBe(expenseLocalDate(withoutLocal));
  });

  it('keeps a past-dated record on its captured local date regardless of createdAt time', () => {
    // Retroactive no-spend / income: createdAt is anchored to noon local on the
    // chosen date, localDate is that date string. They agree.
    const e = { localDate: '2026-02-10', createdAt: '2026-02-10T03:00:00.000Z' };
    expect(expenseLocalDate(e)).toBe('2026-02-10');
  });
});
