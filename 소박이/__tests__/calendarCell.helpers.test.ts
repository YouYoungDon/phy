import { selectCalendarCellContent, formatCalendarAmount } from '../src/components/stats/calendarCell.helpers';

// Day kinds expressed as { spendingTotal, incomeTotal, hasRecord }
const spend = { spendingTotal: 3200, incomeTotal: 0, hasRecord: true };
const incomeOnly = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const both = { spendingTotal: 3200, incomeTotal: 1200000, hasRecord: true };
const noSpend = { spendingTotal: 0, incomeTotal: 0, hasRecord: true };
const incomeNoSpend = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const empty = { spendingTotal: 0, incomeTotal: 0, hasRecord: false };

describe('formatCalendarAmount — compact cell number', () => {
  it('keeps amounts under 10,000 as a full comma number', () => {
    expect(formatCalendarAmount(0)).toBe('0');
    expect(formatCalendarAmount(3200)).toBe('3,200');
    expect(formatCalendarAmount(9999)).toBe('9,999');
  });
  it('switches to 만 units at or above 10,000', () => {
    expect(formatCalendarAmount(10000)).toBe('1만');
    expect(formatCalendarAmount(34000)).toBe('3.4만');
    expect(formatCalendarAmount(1200000)).toBe('120만');
  });
  it('keeps at most one decimal and trims a trailing .0', () => {
    expect(formatCalendarAmount(15000)).toBe('1.5만');
    expect(formatCalendarAmount(100000)).toBe('10만');
    expect(formatCalendarAmount(1250000)).toBe('125만');
  });
  it('adds a comma to large 만 values', () => {
    expect(formatCalendarAmount(123000000)).toBe('12,300만');
  });
  it('formats the magnitude regardless of sign (cell prepends +/−)', () => {
    expect(formatCalendarAmount(-34000)).toBe('3.4만');
  });
});

describe('selectCalendarCellContent — 쓴 기록 (spending, default)', () => {
  it('spending day → amount(spending, blue −)', () => {
    expect(selectCalendarCellContent('spending', spend)).toEqual({ kind: 'amount', amount: 3200, flow: 'spending' });
  });
  it('income-only day → leaf (unchanged 🌿)', () => {
    expect(selectCalendarCellContent('spending', incomeOnly)).toEqual({ kind: 'leaf' });
  });
  it('spend+income day → amount(spending)', () => {
    expect(selectCalendarCellContent('spending', both)).toEqual({ kind: 'amount', amount: 3200, flow: 'spending' });
  });
  it('no-spend day → leaf', () => {
    expect(selectCalendarCellContent('spending', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('spending', empty)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 들어온 기록 (income)', () => {
  it('income day → amount(income, red +)', () => {
    expect(selectCalendarCellContent('income', incomeOnly)).toEqual({ kind: 'amount', amount: 1200000, flow: 'income' });
  });
  it('spend+income day → amount(income, full number)', () => {
    expect(selectCalendarCellContent('income', both)).toEqual({ kind: 'amount', amount: 1200000, flow: 'income' });
  });
  it('income+no-spend day → amount(income, full number)', () => {
    expect(selectCalendarCellContent('income', incomeNoSpend)).toEqual({ kind: 'amount', amount: 1200000, flow: 'income' });
  });
  it('spending-only day → blank', () => {
    expect(selectCalendarCellContent('income', spend)).toEqual({ kind: 'blank' });
  });
  it('no-spend day → blank', () => {
    expect(selectCalendarCellContent('income', noSpend)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 함께 보기 (both, separate +income / −spending)', () => {
  it('spend-only → both with income 0 (spending side only renders)', () => {
    expect(selectCalendarCellContent('both', spend)).toEqual({ kind: 'both', spending: 3200, income: 0 });
  });
  it('income-only → both with spending 0', () => {
    expect(selectCalendarCellContent('both', incomeOnly)).toEqual({ kind: 'both', spending: 0, income: 1200000 });
  });
  it('spend+income → both with each value kept separate (NOT summed)', () => {
    expect(selectCalendarCellContent('both', both)).toEqual({ kind: 'both', spending: 3200, income: 1200000 });
  });
  it('income+no-spend → both (spending 0, income shown)', () => {
    expect(selectCalendarCellContent('both', incomeNoSpend)).toEqual({ kind: 'both', spending: 0, income: 1200000 });
  });
  it('no-spend → leaf (no money movement)', () => {
    expect(selectCalendarCellContent('both', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('both', empty)).toEqual({ kind: 'blank' });
  });
});
