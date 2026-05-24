import { selectCalendarCellContent, formatCompactAmount } from '../src/components/stats/calendarCell.helpers';

// Day kinds expressed as { spendingTotal, incomeTotal, hasRecord }
const spend = { spendingTotal: 3200, incomeTotal: 0, hasRecord: true };
const incomeOnly = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const both = { spendingTotal: 3200, incomeTotal: 1200000, hasRecord: true };
const noSpend = { spendingTotal: 0, incomeTotal: 0, hasRecord: true };
const incomeNoSpend = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const empty = { spendingTotal: 0, incomeTotal: 0, hasRecord: false };

describe('selectCalendarCellContent — 쓴 기록 (spending, default)', () => {
  it('spending day → amount(spending)', () => {
    expect(selectCalendarCellContent('spending', spend)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('income-only day → leaf (unchanged 🌿)', () => {
    expect(selectCalendarCellContent('spending', incomeOnly)).toEqual({ kind: 'leaf' });
  });
  it('spend+income day → amount(spending)', () => {
    expect(selectCalendarCellContent('spending', both)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('no-spend day → leaf', () => {
    expect(selectCalendarCellContent('spending', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('spending', empty)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 들어온 기록 (income)', () => {
  it('income day → amount(income)', () => {
    expect(selectCalendarCellContent('income', incomeOnly)).toEqual({ kind: 'amount', amount: 1200000, compact: true });
  });
  it('spend+income day → amount(income)', () => {
    expect(selectCalendarCellContent('income', both)).toEqual({ kind: 'amount', amount: 1200000, compact: true });
  });
  it('income+no-spend day → amount(income)', () => {
    expect(selectCalendarCellContent('income', incomeNoSpend)).toEqual({ kind: 'amount', amount: 1200000, compact: true });
  });
  it('spending-only day → blank', () => {
    expect(selectCalendarCellContent('income', spend)).toEqual({ kind: 'blank' });
  });
  it('no-spend day → blank', () => {
    expect(selectCalendarCellContent('income', noSpend)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 함께 보기 (both)', () => {
  it('spend-only → combined amount (= spending)', () => {
    expect(selectCalendarCellContent('both', spend)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('income-only → combined amount (= income, full number)', () => {
    expect(selectCalendarCellContent('both', incomeOnly)).toEqual({ kind: 'amount', amount: 1200000 });
  });
  it('spend+income → combined amount (spending + income)', () => {
    expect(selectCalendarCellContent('both', both)).toEqual({ kind: 'amount', amount: 1203200 });
  });
  it('income+no-spend → combined amount (= income)', () => {
    expect(selectCalendarCellContent('both', incomeNoSpend)).toEqual({ kind: 'amount', amount: 1200000 });
  });
  it('no-spend → leaf (combined 0, unchanged)', () => {
    expect(selectCalendarCellContent('both', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('both', empty)).toEqual({ kind: 'blank' });
  });
});

describe('formatCompactAmount', () => {
  it('compacts to 만 units, dropping a whole-number decimal', () => {
    expect(formatCompactAmount(3000000)).toBe('300만');
    expect(formatCompactAmount(1200000)).toBe('120만');
    expect(formatCompactAmount(10000)).toBe('1만');
  });
  it('keeps one decimal when not a whole 만', () => {
    expect(formatCompactAmount(72000)).toBe('7.2만');
    expect(formatCompactAmount(1250000)).toBe('125만');
  });
  it('shows values below 10,000 as-is', () => {
    expect(formatCompactAmount(7200)).toBe('7200');
  });
});
