import { fmtAmt, barHeightFor, selectMaxTotal } from '../src/components/stats/monthAmountChart.helpers';

describe('fmtAmt', () => {
  it('formats zero as "0"', () => {
    expect(fmtAmt(0)).toBe('0');
  });

  it('formats negative/invalid as "0"', () => {
    expect(fmtAmt(-100)).toBe('0');
  });

  it('formats >= 10000 in 만 units, dropping trailing .0', () => {
    expect(fmtAmt(10000)).toBe('1만');
    expect(fmtAmt(40000)).toBe('4만');
  });

  it('formats >= 10000 with one decimal when not whole 만', () => {
    expect(fmtAmt(72000)).toBe('7.2만');
    expect(fmtAmt(125000)).toBe('12.5만');
  });

  it('formats < 10000 in 천 units (nearest 천)', () => {
    expect(fmtAmt(8000)).toBe('8천');
    expect(fmtAmt(5400)).toBe('5천');
  });
});

describe('barHeightFor', () => {
  const BAR_MAX = 72;
  const MIN_BAR = 8;

  it('returns 0 for a zero-spending day (baseline, no bar)', () => {
    expect(barHeightFor(0, 80000, BAR_MAX, MIN_BAR)).toBe(0);
  });

  it('returns barMax for the max day', () => {
    expect(barHeightFor(80000, 80000, BAR_MAX, MIN_BAR)).toBe(BAR_MAX);
  });

  it('floors small non-zero days at minBar', () => {
    // 1000/80000 * 72 ≈ 0.9 → rounds to 1 → floored to MIN_BAR (8)
    expect(barHeightFor(1000, 80000, BAR_MAX, MIN_BAR)).toBe(MIN_BAR);
  });

  it('scales proportionally in between', () => {
    // 40000/80000 * 72 = 36
    expect(barHeightFor(40000, 80000, BAR_MAX, MIN_BAR)).toBe(36);
  });

  it('never exceeds barMax even if total > maxTotal', () => {
    expect(barHeightFor(120000, 80000, BAR_MAX, MIN_BAR)).toBe(BAR_MAX);
  });

  it('returns 0 when maxTotal is 0 (divide-by-zero guard)', () => {
    expect(barHeightFor(0, 0, BAR_MAX, MIN_BAR)).toBe(0);
    expect(barHeightFor(5000, 0, BAR_MAX, MIN_BAR)).toBe(0);
  });
});

describe('selectMaxTotal', () => {
  it('returns 0 for an empty month', () => {
    expect(selectMaxTotal({}, 2026, 4, 31)).toBe(0);
  });

  it('returns the max daily total within the month', () => {
    const byDate = {
      '2026-05-03': { total: 12000 },
      '2026-05-10': { total: 45000 },
      '2026-05-20': { total: 8000 },
    };
    expect(selectMaxTotal(byDate, 2026, 4, 31)).toBe(45000);
  });

  it('ignores dates outside the view month', () => {
    const byDate = {
      '2026-05-10': { total: 30000 },
      '2026-06-01': { total: 99000 }, // different month — must be ignored
    };
    expect(selectMaxTotal(byDate, 2026, 4, 31)).toBe(30000);
  });

  it('ignores days beyond daysInMonth', () => {
    const byDate = {
      '2026-02-28': { total: 20000 },
      '2026-02-29': { total: 50000 }, // 2026 Feb has 28 days — day 29 must be ignored
    };
    expect(selectMaxTotal(byDate, 2026, 1, 28)).toBe(20000);
  });
});
