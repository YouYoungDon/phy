import { parseAmountInput } from '../src/utils/amount';

describe('parseAmountInput', () => {
  it('returns 0 for a blank string (never stores a raw string)', () => {
    expect(parseAmountInput('')).toBe(0);
  });

  it('returns 0 for "0"', () => {
    expect(parseAmountInput('0')).toBe(0);
  });

  it('parses a plain integer', () => {
    expect(parseAmountInput('1234')).toBe(1234);
  });

  it('strips thousands separators', () => {
    expect(parseAmountInput('1,234')).toBe(1234);
    expect(parseAmountInput('12,345,678')).toBe(12345678);
  });

  it('returns 0 for non-numeric junk', () => {
    expect(parseAmountInput('abc')).toBe(0);
  });

  it('always returns a number type', () => {
    expect(typeof parseAmountInput('')).toBe('number');
    expect(typeof parseAmountInput('abc')).toBe('number');
  });
});
