import { parseAmountInput, formatAmountInput } from '../src/utils/amount';

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

  // Hardening (pre-dogfooding QA #7): the old parseInt-prefix behavior was
  // lenient — "123abc" → 123, "1원" → 1, "-3" → -3. Strict parsing rejects any
  // input that isn't pure digits (after comma strip + trim) by normalizing to 0.
  it('rejects partial/trailing-junk values instead of prefix-parsing', () => {
    expect(parseAmountInput('123abc')).toBe(0);
    expect(parseAmountInput('12 34')).toBe(0);
    expect(parseAmountInput('1_000')).toBe(0);
  });

  it('rejects a trailing currency unit', () => {
    expect(parseAmountInput('1원')).toBe(0);
    expect(parseAmountInput('1,000원')).toBe(0);
  });

  it('rejects decimals (KRW amounts are integers)', () => {
    expect(parseAmountInput('12.5')).toBe(0);
  });

  it('rejects negatives (amount is never negative)', () => {
    expect(parseAmountInput('-3')).toBe(0);
    expect(parseAmountInput('-1,000')).toBe(0);
  });

  it('trims surrounding whitespace from an otherwise clean pasted value', () => {
    expect(parseAmountInput('  1234  ')).toBe(1234);
    expect(parseAmountInput(' 1,234 ')).toBe(1234);
  });
});

describe('formatAmountInput', () => {
  it('returns empty string for blank / no-digit input', () => {
    expect(formatAmountInput('')).toBe('');
    expect(formatAmountInput('abc')).toBe('');
  });

  it('groups thousands with commas', () => {
    expect(formatAmountInput('1234')).toBe('1,234');
    expect(formatAmountInput('1234567')).toBe('1,234,567');
  });

  it('keeps only digits', () => {
    expect(formatAmountInput('12a34')).toBe('1,234');
  });

  it('drops leading zeros but keeps a single zero', () => {
    expect(formatAmountInput('007')).toBe('7');
    expect(formatAmountInput('0')).toBe('0');
  });

  it('is idempotent on already-formatted input', () => {
    expect(formatAmountInput('1,234')).toBe('1,234');
  });

  it('round-trips through parseAmountInput', () => {
    expect(parseAmountInput(formatAmountInput('1234567'))).toBe(1234567);
  });
});
