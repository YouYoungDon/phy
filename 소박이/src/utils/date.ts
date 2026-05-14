// Returns 'YYYY-MM-DD' in device local timezone.
// Never use toISOString() for date grouping — it returns UTC.
export function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Builds an ISO string anchored to noon local time for a YYYY-MM-DD string.
// Use for past-date expenses so getLocalDateString always resolves to the chosen date.
export function localDateToISOString(localDateStr: string): string {
  const parts = localDateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  return new Date(y, m - 1, d, 12, 0, 0).toISOString();
}
