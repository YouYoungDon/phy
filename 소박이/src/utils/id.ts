// Generates a collision-resistant id for in-app records (Expense, etc.).
// Combines millisecond timestamp with 6 random base36 chars. Two saves in the
// same ms (possible under a fast double-tap that beats the synchronous
// `isSavingRef` guard, or under race-y test fixtures) still yield distinct
// ids — base36^6 ≈ 2.1B combinations.
//
// Not cryptographically random. Not a UUID. Suitable only for local app
// records that never leave the device, where the goal is collision avoidance,
// not unforgeability.
export function generateExpenseId(): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${ts}-${rand}`;
}
