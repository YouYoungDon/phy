# Combined "함께 보기" Calendar Cell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Stats 함께 보기 calendar cell show one calm combined-movement number (spending + income, full comma) instead of `spending·🍃`, leaving 쓴 기록 and 들어온 기록 unchanged.

**Architecture:** Rewrite the `'both'` branch of the pure `selectCalendarCellContent` helper to return a combined `{ kind: 'amount', amount }`, drop the now-unused `amountWithIncome`/`incomeMarker` `CellDisplay` kinds, and remove the matching arms + dead styles from `DayAmountSlot` in stats.tsx.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess`), Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-25-combined-calendar-cell-design.md`

---

## File Structure

- `src/components/stats/calendarCell.helpers.ts` — trim `CellDisplay` union; rewrite `'both'` branch to combined total. `'income'`/`'spending'` branches and `formatCompactAmount` untouched.
- `__tests__/calendarCell.helpers.test.ts` — rewrite the `함께 보기 (both)` describe block; leave the other blocks intact.
- `src/pages/stats.tsx` — remove `incomeMarker` + `amountWithIncome` arms from `DayAmountSlot`; remove dead `dayAmountRow`/`dayAmountFlex`/`dayAmountLeaf` styles.

---

### Task 1: Combined total in the helper (TDD)

**Files:**
- Modify: `src/components/stats/calendarCell.helpers.ts:7-35`
- Test: `__tests__/calendarCell.helpers.test.ts:47-66`

- [ ] **Step 1: Rewrite the `함께 보기 (both)` test block**

In `__tests__/calendarCell.helpers.test.ts`, replace the entire `describe('selectCalendarCellContent — 함께 보기 (both)', ...)` block (lines 47-66) with:

```ts
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
```

(`both` fixture is `{ spendingTotal: 3200, incomeTotal: 1200000, hasRecord: true }`, so combined = 1,203,200. The other fixtures are already defined at the top of the file and are unchanged.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd 소박이; npm test -- calendarCell 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS|amountWithIncome|incomeMarker|Expected"`
Expected: FAIL — the spend+income and income-only cases still return `amountWithIncome`/`incomeMarker`, not the combined `amount`.

- [ ] **Step 3: Trim the `CellDisplay` union**

In `src/components/stats/calendarCell.helpers.ts`, replace the `CellDisplay` type (lines 7-12) with:

```ts
export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                              // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number; compact?: boolean };  // spending (쓴 기록), compact income (들어온 기록), or combined movement (함께)
```

- [ ] **Step 4: Rewrite the `'both'` branch**

Replace the `if (mode === 'both') { ... }` block (lines 23-31) with:

```ts
  if (mode === 'both') {
    // 함께 보기 — one calm combined-movement number (spending + income, full
    // comma). NOT net/balance: the absolute sum of "how much moved today".
    // No-spend-only (combined 0) stays 🌿; no record stays blank.
    if (!d.hasRecord) return { kind: 'blank' };
    const combined = d.spendingTotal + d.incomeTotal;
    return combined > 0 ? { kind: 'amount', amount: combined } : { kind: 'leaf' };
  }
```

Also update the top-of-file comment block if it enumerates the removed kinds (lines 1-4): drop any mention of `amountWithIncome`/`incomeMarker`. Leave the `'income'` and `'spending'` branches exactly as they are.

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd 소박이; npm test -- calendarCell 2>&1 | Select-String -Pattern "Tests:|FAIL|PASS"`
Expected: PASS — all calendarCell.helpers describe blocks green (spending, income, both, formatCompactAmount).

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/components/stats/calendarCell.helpers.ts 소박이/__tests__/calendarCell.helpers.test.ts
git commit -m "refactor(stats): combined daily-movement total for 함께 보기 cell"
```

---

### Task 2: Simplify `DayAmountSlot` + remove dead styles

**Files:**
- Modify: `src/pages/stats.tsx:75-97` (DayAmountSlot), `src/pages/stats.tsx:1114-1128` (styles)

- [ ] **Step 1: Remove the `incomeMarker` and `amountWithIncome` arms**

In `src/pages/stats.tsx`, replace the `switch (cell.kind)` body in `DayAmountSlot` (lines 75-97) with:

```tsx
  switch (cell.kind) {
    case 'blank':
      return <View style={styles.dayAmountPlaceholder} />;
    case 'leaf':
      return <Text style={textStyle} numberOfLines={1}>🌿</Text>;
    case 'amount':
      return (
        <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
          {cell.compact ? formatCompactAmount(cell.amount) : cell.amount.toLocaleString('ko-KR')}
        </Text>
      );
  }
```

- [ ] **Step 2: Remove the now-dead styles**

In the `StyleSheet.create({ ... })` block, delete the `dayAmountRow`, `dayAmountFlex`, and `dayAmountLeaf` entries (lines 1114-1128):

```ts
  dayAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 12,
    maxWidth: '100%',
  },
  dayAmountFlex: {
    flexShrink: 1,
  },
  dayAmountLeaf: {
    fontSize: 9,
    marginLeft: 1,
    color: COLORS.textMuted,
  },
```

Leave `dayAmount`, `dayAmountSelected`, and `dayAmountPlaceholder` (still used).

- [ ] **Step 3: Typecheck**

Run: `cd 소박이; npm run typecheck 2>&1 | Select-String -Pattern "error TS|stats.tsx"`
Expected: no errors. (Confirms the trimmed `CellDisplay` union has no dangling references and the removed styles aren't used elsewhere.)

- [ ] **Step 4: Grep to confirm no stale references**

Run: `cd 소박이; Get-Content src/pages/stats.tsx | Select-String -Pattern "amountWithIncome|incomeMarker|dayAmountRow|dayAmountFlex|dayAmountLeaf|·🍃"`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/pages/stats.tsx
git commit -m "refactor(stats): simplify DayAmountSlot for combined cell, drop dead styles"
```

---

### Task 3: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `cd 소박이; npm run typecheck`
Expected: exits 0.

- [ ] **Step 2: Full Jest suite**

Run: `cd 소박이; npm test -- --no-cache 2>&1 | Select-String -Pattern "Tests:|Test Suites:|FAIL"`
Expected: all suites pass, no `FAIL`.

- [ ] **Step 3: Anti-pattern grep (no finance-dashboard language)**

Run: `cd 소박이; Get-ChildItem -Recurse src -Include *.ts,*.tsx | Select-String -Pattern "순수익|잔액|차액|순이익|net|balance|profit"`
Expected: only benign hits (network/URL identifiers, guard comments) — no new net/balance/profit framing in the calendar cell path.

- [ ] **Step 4: No commit** (verification only).

---

## Self-Review

**1. Spec coverage:**
- 함께 보기 combined total (spending + income, full comma) → Task 1 Step 4. ✓
- No 🍃 / compact / signs / colors in 함께 → Task 1 (amount, no compact) + Task 2 (marker arm removed). ✓
- 쓴 기록 / 들어온 기록 unchanged → Task 1 leaves those branches; `amount`/`leaf`/`blank` render arms unchanged. ✓
- No-spend-only → leaf; no record → blank (unchanged) → Task 1 Step 4 + test Step 1. ✓
- Remove dead kinds + styles → Task 1 Step 3, Task 2 Steps 1-2. ✓
- Tests: combined calc, comma formatting (via render), mode-specific rendering, no-spend unchanged → Task 1 Step 1 + Task 3. ✓
- typecheck + Jest + anti-pattern grep → Task 3. ✓

**2. Placeholder scan:** No TBD/TODO/"handle edge cases". Every code step shows full code. ✓

**3. Type consistency:** `CellDisplay` trimmed to `blank|leaf|amount` in Task 1 Step 3; `DayAmountSlot` switch in Task 2 Step 1 handles exactly those three; tests assert only `amount`/`leaf`/`blank`. `combined`, `spendingTotal`, `incomeTotal` names match the helper's existing parameter shape. ✓
