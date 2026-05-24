// Parse a free-text amount field into an integer. Strips thousands
// separators; blank or non-numeric input becomes 0 so a numeric amount is
// always stored in Expense.amount (never a raw string). Mirrors the legacy
// inline parse that lived in record.tsx.
export function parseAmountInput(text: string): number {
  const parsed = parseInt(text.replace(/,/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
