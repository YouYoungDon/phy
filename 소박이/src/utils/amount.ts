// Parse a free-text amount field into an integer. Strips thousands separators
// and surrounding whitespace, then accepts the value ONLY if what remains is
// pure digits. Anything else — blanks, junk, partial values like "123abc" or
// "1원", decimals, or a leading "-" — normalizes to 0 rather than parseInt's
// lenient prefix-parse. This keeps a clean numeric amount in Expense.amount
// (never a raw string, never negative) and is the single shared parser for
// both the create flow (record.tsx) and the edit sheet (stats.tsx).
export function parseAmountInput(text: string): number {
  const cleaned = text.replace(/,/g, '').trim();
  if (!/^[0-9]+$/.test(cleaned)) return 0;
  return parseInt(cleaned, 10);
}

// Display formatter for amount inputs: keeps only digits, drops leading zeros,
// and groups thousands with commas. The display inverse of parseAmountInput
// (which strips commas back out before validating digits-only). Empty / no-digit
// input → '' so the placeholder shows. Pure; shared by create + edit. Uses a
// grouping regex (not toLocaleString) so it's deterministic under the test
// runner regardless of ICU availability.
export function formatAmountInput(text: string): string {
  const digits = text.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
  if (digits === '') return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
