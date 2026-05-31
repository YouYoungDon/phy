# Add `investment_income` (🪙 투자수익) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `investment_income` (🪙 투자수익) as the sixth income category, positioned immediately after `received_allowance`, so it shows up in the record and stats pickers without any new UI wiring.

**Architecture:** One new member in the `ExpenseCategory` union, one new row in the `CATEGORIES` registry. Both pickers (`record.tsx:417`, `stats.tsx:428`) already iterate `INCOME_CATEGORIES` generically — the new entry appears automatically. No migration, no analytics, no per-category branching.

**Tech Stack:** React Native 0.84 / React 19 / TypeScript 5.8 (`noUnusedLocals` ON), Jest 29.

**Verification rhythm:** From `소박이/`, single test `npx jest <name>`; full gate `npx tsc --noEmit` (exit 0) + `npx jest` (whole suite green). All commands run from `소박이/`.

**Spec:** `docs/superpowers/specs/2026-05-28-investment-income-category-design.md`

---

## File Structure

- `src/types/index.ts` — append `| 'investment_income'` to the `ExpenseCategory` union (incoming-scenes block).
- `src/constants/categories.ts` — add one row to `CATEGORIES` immediately after `received_allowance`.
- `__tests__/categoryRegistry.test.ts` — bump the `INCOME_CATEGORIES.length` literal `5 → 6` and add a `kindForCategory('investment_income')` income-kind assertion.

---

## Task 1: Add `investment_income` token (TDD)

**Files:**
- Modify: `__tests__/categoryRegistry.test.ts` (count assertion ~line 42-45; income-kind block ~line 20-26)
- Modify: `src/types/index.ts` (after the `received_allowance` line in the union)
- Modify: `src/constants/categories.ts` (after the `received_allowance` row in `CATEGORIES`)

TDD is constrained by the type system: a `kindForCategory('investment_income')` assertion won't typecheck until the union has the member. So the order is: update only the count first (TS-safe failing test), add the type + row, then add the kind assertion.

- [ ] **Step 1: Write the failing test — bump the count assertion**

In `__tests__/categoryRegistry.test.ts`, find:

```ts
  it('INCOME_CATEGORIES contains exactly 5 income tokens', () => {
    expect(INCOME_CATEGORIES.length).toBe(5);
    expect(INCOME_CATEGORIES.every(c => c.kind === 'income')).toBe(true);
  });
```

Replace with:

```ts
  it('INCOME_CATEGORIES contains exactly 6 income tokens', () => {
    expect(INCOME_CATEGORIES.length).toBe(6);
    expect(INCOME_CATEGORIES.every(c => c.kind === 'income')).toBe(true);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest categoryRegistry`
Expected: FAIL — `Expected: 6, Received: 5` on the `INCOME_CATEGORIES` count assertion.

- [ ] **Step 3: Add the union member**

In `src/types/index.ts`, find the end of the incoming-scenes block:

```ts
  | 'received_allowance';
```

Replace with:

```ts
  | 'received_allowance'
  | 'investment_income';
```

- [ ] **Step 4: Add the registry row**

In `src/constants/categories.ts`, find the `received_allowance` row:

```ts
  { key: 'received_allowance',  label: '용돈 받음', emoji: '🤲',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
] as const;
```

Replace with (insert the new row, keep the closing `] as const;`):

```ts
  { key: 'received_allowance',  label: '용돈 받음', emoji: '🤲',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'investment_income',   label: '투자수익',  emoji: '🪙',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
] as const;
```

- [ ] **Step 5: Add the income-kind assertion for the new token**

In `__tests__/categoryRegistry.test.ts`, find:

```ts
  it('returns income for each income token', () => {
    expect(kindForCategory('salary')).toBe('income');
    expect(kindForCategory('bonus')).toBe('income');
    expect(kindForCategory('refund')).toBe('income');
    expect(kindForCategory('received_gift')).toBe('income');
    expect(kindForCategory('received_allowance')).toBe('income');
  });
```

Replace with:

```ts
  it('returns income for each income token', () => {
    expect(kindForCategory('salary')).toBe('income');
    expect(kindForCategory('bonus')).toBe('income');
    expect(kindForCategory('refund')).toBe('income');
    expect(kindForCategory('received_gift')).toBe('income');
    expect(kindForCategory('received_allowance')).toBe('income');
    expect(kindForCategory('investment_income')).toBe('income');
  });
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx jest categoryRegistry`
Expected: PASS — all `categoryRegistry` tests green; the count assertion reads 6, the new income-kind assertion resolves to `'income'`.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/constants/categories.ts __tests__/categoryRegistry.test.ts
git commit -m "feat(record): add 🪙 투자수익 income category"
```

---

## Task 2: Full-suite verification + anti-drift grep

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: exit 0. The new union member is referenced by the registry row; no `noUnusedLocals` issues anywhere.

- [ ] **Step 2: Run the whole test suite**

Run: `npx jest`
Expected: all suites pass — the prior count plus the updated `categoryRegistry` assertions; no regressions in record.tsx / stats.tsx / DailySummary / TodaySurface tests (those consume `INCOME_CATEGORIES` generically).

- [ ] **Step 3: Anti-drift / vocabulary grep on touched files**

Confirm no analytics/tracking/finance-dashboard vocabulary leaked into the new row. Run:

```bash
git grep -nE "수익률|순수익|차액|portfolio|dividend|return|capital|balance|tracking" -- src/types/index.ts src/constants/categories.ts __tests__/categoryRegistry.test.ts
```

Expected: no matches. The new row uses only `key`, `label`, `emoji`, `inPicker`, `kind`, `memoSuggestions` — no analytics/portfolio fields, no return-on-capital wording.

- [ ] **Step 4: Manual dogfood note (no code)**

On a run:
1. Open the record screen, choose 들어온 돈 (income) mode — confirm **🪙 투자수익** appears as the 6th card, immediately after **🤲 용돈 받음**, no visual difference in tile chrome.
2. Tap 🪙 투자수익, enter an amount, save — confirm the record persists, the home `TodaySurface` count line increments (no won amount line, since income doesn't count toward `spendingCount`), and the home `DailySummary` shows `소소한 기록 N건` only (no `오늘 쓴 기록` row, same as other income-only days).
3. Open stats → calendar → the day the new record was saved → confirm it shows in the day's records under 들어온 돈 grouping; edit it and confirm 🪙 투자수익 is selected and reachable in the edit picker too.

Observation only — no committed change.

---

## Self-Review

**Spec coverage:**
- Token added to union → Task 1 Step 3. ✓
- Registry row added with exact label / emoji / position → Task 1 Step 4. ✓
- `kindForCategory('investment_income') === 'income'` test added → Task 1 Step 5. ✓
- `INCOME_CATEGORIES.length` bumped 5 → 6 → Task 1 Step 1. ✓
- Both pickers pick up the new entry without UI changes → confirmed by Task 2 Step 4 manual dogfood (no code task needed, since `record.tsx:417` and `stats.tsx:428` iterate generically per the spec).
- No migration → no task touches storage, expense hydration, or migration code. ✓
- Philosophy guards (no income tracking, no breakdowns, DailySummary/TodaySurface unchanged) → no task modifies those files. ✓
- Anti-drift grep → Task 2 Step 3. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands. ✓

**Type consistency:** Token `investment_income` is identical in `ExpenseCategory` union (Task 1 Step 3), the registry row's `key` field (Task 1 Step 4), and the test assertion (Task 1 Step 5). Label `투자수익`, emoji `🪙`, `kind: 'income'`, `inPicker: true`, `memoSuggestions: []` match the spec verbatim. Consistent. ✓
