# Monthly Settlement + Stats Readability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet monthly settlement line (쓴 돈 / 들어온 돈) to the Stats calendar, make the amount chart readable (all-day x-labels + full-comma y-labels), and give the Record income input a visible `0원` default — without drifting toward a finance dashboard.

**Architecture:** Five sequential tasks. Task 1 (Record income amount) lands first and is fully verified before any Stats work. The amount parse is extracted into a tiny pure helper (`src/utils/amount.ts`) so the "always numeric, never a raw string" guarantee is unit-tested. Settlement totals are an inline memo in `stats.tsx` (matching the existing `monthVisitDays` / `topCategoryThisMonth` memo style). Chart changes are display-only edits to `MonthAmountChart.tsx` + helper cleanup.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29. Tests in `소박이/__tests__/*.test.ts` import from `../src/...`.

**Working directory for all commands:** `c:\Users\toodo\workspace\phy\소박이`
- Run a single test file: `npm test -- <name>` (e.g. `npm test -- amount`)
- Run full suite: `npm test`
- Typecheck: `npm run typecheck`

**Spec:** `docs/superpowers/specs/2026-05-24-monthly-settlement-and-readability-design.md`

---

## Task 1: Record income amount normalization + visible `0원` default

**Goal:** In 들어온 기록 mode the amount hero shows `0원` by default (not blank), income stays optional / 0-saveable, and a numeric amount is *always* stored (never a raw string). Extract the parse into a tested helper.

**Files:**
- Create: `소박이/src/utils/amount.ts`
- Create: `소박이/__tests__/amount.test.ts`
- Modify: `소박이/src/pages/record.tsx` (amount derivation ~line 134; amount hero ~lines 326–330)

- [ ] **Step 1: Write the failing test**

Create `소박이/__tests__/amount.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- amount`
Expected: FAIL — `Cannot find module '../src/utils/amount'`.

- [ ] **Step 3: Write the minimal implementation**

Create `소박이/src/utils/amount.ts`:

```ts
// Parse a free-text amount field into an integer. Strips thousands
// separators; blank or non-numeric input becomes 0 so a numeric amount is
// always stored in Expense.amount (never a raw string). Mirrors the legacy
// inline parse that lived in record.tsx.
export function parseAmountInput(text: string): number {
  const parsed = parseInt(text.replace(/,/g, ''), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- amount`
Expected: PASS (6 tests).

- [ ] **Step 5: Wire the helper into `record.tsx`**

Add the import alongside the other util imports near the top of `소박이/src/pages/record.tsx` (the file already imports from `../utils/date` and `../utils/id`):

```ts
import { parseAmountInput } from '../utils/amount';
```

Replace the inline parse (currently `const amount = parseInt(amountText.replace(/,/g, ''), 10) || 0;`, ~line 134) with:

```ts
const amount = parseAmountInput(amountText);
```

- [ ] **Step 6: Make the `0원` default visible in income mode**

In the amount hero (`소박이/src/pages/record.tsx`, ~lines 326–330), the current text is:

```tsx
<Text style={styles.amountDisplay}>
  {amount > 0
    ? `${amount.toLocaleString()}원`
    : recordKind === 'income' ? '' : '0원'}
</Text>
```

Replace it with (both modes now show `0원` when amount is 0):

```tsx
<Text style={styles.amountDisplay}>
  {amount > 0 ? `${amount.toLocaleString()}원` : '0원'}
</Text>
```

Do **not** change anything else in the hero: the `TextInput` `placeholder={recordKind === 'income' ? '금액 (선택)' : '금액을 입력해요'}` stays (income optionality is still signaled).

- [ ] **Step 7: Verify the guardrails by reading the surrounding code (no edits expected)**

Confirm each — these must already hold after Steps 5–6; if any fails, the change is wrong:
- Switching to 들어온 기록: `handleToggleKind('income')` sets `amountText` to `''` → `amount === 0` → hero renders `0원` (visible default). ✓
- Income optional: `canSave` for income is `!isSaving` (line ~135) — unchanged. ✓
- Blank income saves numeric 0: `amount` comes from `parseAmountInput('')` → `0`, stored in the `expense` object's `amount`. ✓
- `"0"` income saves numeric 0: `parseAmountInput('0')` → `0`. ✓
- Positive income saves the parsed amount: `parseAmountInput('30000')` → `30000`. ✓
- No raw blank string can be stored: `parseAmountInput` return type is `number`. ✓
- Income → spending reset: `handleToggleKind('spending')` resets `amountText=''`, `category='cafe'`; spending `canSave` requires `amount > 0` (line ~137) — original spending behavior restored. ✓
- No-spend flow unchanged: `handleNoSpend` / `canNoSpend` untouched. ✓
- Spending amount validation unchanged: spending `canSave` is still `amount > 0 && !isSaving`. ✓

- [ ] **Step 8: Typecheck and run the full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all suites pass (includes the new `amount` suite).

- [ ] **Step 9: Commit**

```bash
git add "소박이/src/utils/amount.ts" "소박이/__tests__/amount.test.ts" "소박이/src/pages/record.tsx"
git commit -m "fix(record): visible 0원 income default + tested amount normalization"
```

---

## Task 2: Monthly settlement line (쓴 돈 / 들어온 돈)

**Goal:** A quiet two-total line under the centered month label inside the calendar card. Two independent totals, no net/balance.

**Files:**
- Modify: `소박이/src/pages/stats.tsx` (add memo ~after line 230; render between monthNav and dowRow ~line 396; add styles ~near `monthLabel` styles)

- [ ] **Step 1: Add the `monthSettlement` memo**

In `소박이/src/pages/stats.tsx`, right after the `monthVisitDays` memo (ends ~line 230), add:

```tsx
  // Two independent monthly totals for the settlement line: spending and
  // income. Deliberately NO net/balance/차액 — this is the one scoped
  // exception to the no-income-totals rule (see the monthly-settlement spec).
  // no_spend carries amount 0, so it's harmless in the spending sum.
  const monthSettlement = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    let spending = 0;
    let income = 0;
    for (const e of expenses) {
      if (!expenseLocalDate(e).startsWith(prefix)) continue;
      if (e.kind === 'income') income += e.amount;
      else spending += e.amount;
    }
    return { spending, income };
  }, [expenses, viewYear, viewMonth]);
```

- [ ] **Step 2: Render the settlement line**

In the calendar card, the month-nav `View` closes at ~line 396 (`</View>` after the `nextMonth` Pressable) and the weekday row (`<View style={styles.dowRow}>`) begins at ~line 398. Insert the settlement line **between** them:

```tsx
          <View style={styles.monthTotalRow}>
            <Text style={styles.monthTotalLabel}>쓴 돈</Text>
            <Text style={styles.monthTotalValue}>{monthSettlement.spending.toLocaleString()}원</Text>
            <Text style={styles.monthTotalSep}>·</Text>
            <Text style={styles.monthTotalLabel}>들어온 돈</Text>
            <Text style={styles.monthTotalValue}>{monthSettlement.income.toLocaleString()}원</Text>
          </View>
```

- [ ] **Step 3: Add the styles**

In the `StyleSheet.create({ ... })` block, add near the `monthLabel` style (~line 755):

```tsx
  monthTotalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 12,
  },
  monthTotalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  monthTotalValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
  },
  monthTotalSep: {
    fontSize: 12,
    color: COLORS.textLight,
  },
```

(No bold, no olive/green on the value — body color only. No card/border/heading around the row.)

- [ ] **Step 4: Typecheck and run the full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all suites pass (no behavioral test added; settlement is an inline memo consistent with the existing `topCategoryThisMonth` / `monthVisitDays` memos).

- [ ] **Step 5: Commit**

```bash
git add "소박이/src/pages/stats.tsx"
git commit -m "feat(stats): quiet monthly settlement line (쓴 돈 / 들어온 돈)"
```

---

## Task 3: Chart y-axis full-comma labels + `fmtAmt` cleanup

**Goal:** Y-axis shows full comma numbers (`72,000`) instead of `7.2만`. Widen the y-axis minimally and truncate extreme values rather than making the chart heavy. `fmtAmt` becomes unused → delete it and its tests.

**Files:**
- Modify: `소박이/src/components/stats/MonthAmountChart.tsx` (import ~line 4; y-labels ~lines 58–60; `Y_AXIS_W` ~line 8; `yLabel` style ~line 139)
- Modify: `소박이/src/components/stats/monthAmountChart.helpers.ts` (delete `fmtAmt`, ~lines 3–13)
- Modify: `소박이/__tests__/monthAmountChart.helpers.test.ts` (drop `fmtAmt` import + `describe('fmtAmt', …)` block)

- [ ] **Step 1: Switch the y-axis labels to full comma numbers**

In `소박이/src/components/stats/MonthAmountChart.tsx`, the three y-labels (~lines 57–61) currently read:

```tsx
<Text style={styles.yLabel}>{hasAnySpending ? fmtAmt(maxTotal) : ''}</Text>
<Text style={styles.yLabel}>{hasAnySpending ? fmtAmt(midTotal) : ''}</Text>
<Text style={styles.yLabel}>0</Text>
```

Replace with full comma numbers + single-line truncation guard:

```tsx
<Text style={styles.yLabel} numberOfLines={1}>{hasAnySpending ? maxTotal.toLocaleString() : ''}</Text>
<Text style={styles.yLabel} numberOfLines={1}>{hasAnySpending ? midTotal.toLocaleString() : ''}</Text>
<Text style={styles.yLabel} numberOfLines={1}>0</Text>
```

- [ ] **Step 2: Update the import (drop `fmtAmt`)**

Change line 4 from:

```ts
import { fmtAmt, barHeightFor, selectMaxTotal } from './monthAmountChart.helpers';
```

to:

```ts
import { barHeightFor, selectMaxTotal } from './monthAmountChart.helpers';
```

- [ ] **Step 3: Apply the layout guard (widen minimally, keep type muted)**

Change `Y_AXIS_W` (~line 8) from `52` to `60` — enough for `1,200,000`-class values without making the chart heavy:

```ts
const Y_AXIS_W = 60;
```

Leave `yLabel` (`fontSize: 9`, `color: COLORS.textLight`) as is — it's already small and muted. The `numberOfLines={1}` added in Step 1 truncates any extreme value (e.g. 8-digit) rather than wrapping and breaking the row height. (Per spec: prefer small muted type + truncation over a wide, heavy axis.)

- [ ] **Step 4: Delete `fmtAmt` from the helpers**

In `소박이/src/components/stats/monthAmountChart.helpers.ts`, delete the entire `fmtAmt` doc-comment + function (lines 3–13), leaving `barHeightFor` and `selectMaxTotal` intact. The file's top comment (`// Pure helpers for MonthAmountChart…`) stays.

- [ ] **Step 5: Remove the `fmtAmt` tests**

In `소박이/__tests__/monthAmountChart.helpers.test.ts`:
- Change the import (line 1) from `import { fmtAmt, barHeightFor, selectMaxTotal } from …` to `import { barHeightFor, selectMaxTotal } from '../src/components/stats/monthAmountChart.helpers';`
- Delete the entire `describe('fmtAmt', () => { … });` block (lines 3–26).

Keep the `barHeightFor` (6 tests) and `selectMaxTotal` (4 tests) blocks unchanged.

- [ ] **Step 6: Verify `fmtAmt` is truly unused before relying on the delete**

Run a repo-wide search to confirm no other reference exists:

Run: `npm test -- monthAmountChart` then grep — use the Grep tool for `fmtAmt` across `소박이/src` and `소박이/__tests__`.
Expected: zero matches after Steps 2/4/5. (If any other file still imports `fmtAmt`, stop and re-evaluate — do not delete it.)

- [ ] **Step 7: Typecheck and run the full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all suites pass; the `monthAmountChart.helpers` suite now has 10 tests (6 + 4).

- [ ] **Step 8: Commit**

```bash
git add "소박이/src/components/stats/MonthAmountChart.tsx" "소박이/src/components/stats/monthAmountChart.helpers.ts" "소박이/__tests__/monthAmountChart.helpers.test.ts"
git commit -m "feat(stats): full-comma y-axis labels; remove unused fmtAmt"
```

---

## Task 4: Chart x-axis all-day labels

**Goal:** Label every day 1…N at a small font (per the "show all dates" request), with a documented fallback if too dense. Keep it quiet, not dashboard-like.

**Files:**
- Modify: `소박이/src/components/stats/MonthAmountChart.tsx` (`LABEL_DAYS` const ~line 10; x-row render ~lines 97–103; `xLabel` style ~line 206)

- [ ] **Step 1: Remove the `LABEL_DAYS` gate and label every day**

In `소박이/src/components/stats/MonthAmountChart.tsx`, delete the `LABEL_DAYS` constant (~lines 9–10):

```ts
// Weekly date labels — readable for a month without crowding.
const LABEL_DAYS = new Set([1, 8, 15, 22, 29]);
```

Replace the x-row render (~lines 97–103) — currently:

```tsx
<View style={styles.xRow}>
  {days.map(({ day }) => (
    <View key={day} style={styles.xCell}>
      <Text style={styles.xLabel}>{LABEL_DAYS.has(day) ? String(day) : ''}</Text>
    </View>
  ))}
</View>
```

with (label every day; add the fallback note as a comment):

```tsx
{/* Label every day 1..N (per the "show all dates" request) at a small font.
    Fallback if this reads too dense/noisy on-device: label only a sparse set
    — e.g. new Set([1, 5, 10, 15, 20, 25, 30]) — or every other day. This is a
    manual tuning step after dogfooding, not branching logic here. */}
<View style={styles.xRow}>
  {days.map(({ day }) => (
    <View key={day} style={styles.xCell}>
      <Text style={styles.xLabel} numberOfLines={1}>{day}</Text>
    </View>
  ))}
</View>
```

- [ ] **Step 2: Shrink the x-label font for density**

In the `xLabel` style (~lines 206–212), change `fontSize: 9` to `fontSize: 8` (and keep `color: COLORS.textLight`, `textAlign: 'center'`). Keep `height`/`lineHeight` as is (13). This keeps all-day labels legible without crowding into a dashboard look.

- [ ] **Step 3: Typecheck and run the full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all suites pass (no test change; `LABEL_DAYS` was never exported/tested).

- [ ] **Step 4: Commit**

```bash
git add "소박이/src/components/stats/MonthAmountChart.tsx"
git commit -m "feat(stats): label all month days on the chart x-axis (~8px, with fallback note)"
```

---

## Task 5: Docs + memory note for the scoped policy exception

**Goal:** Record that the Stats monthly settlement line is a deliberate, scoped exception to the no-income-totals rule, so future work doesn't treat it as a precedent or accidentally revert it.

**Files:**
- Modify: `소박이/docs/SOBAGI_CURRENT_STATE.md`
- Modify: `C:\Users\toodo\.claude\projects\c--Users-toodo-workspace-phy\memory\feedback_sobagi_allowance_giving_scene.md`

- [ ] **Step 1: Update the state doc**

Open `소박이/docs/SOBAGI_CURRENT_STATE.md`, read it, and add a dated entry under the most recent/Stats-related section noting:
- A quiet monthly settlement line (쓴 돈 / 들어온 돈, two separate totals, no net/balance) now sits under the month label in the Stats calendar.
- This is a **scoped** exception to the no-income-totals policy — limited to that one line; no balance/net/순수익 anywhere else.
- The chart now shows all-day x-labels (~8px, fallback to sparse if too dense) and full-comma y-labels; `fmtAmt` removed.
- Record income input shows a visible `0원` default (input-only); display surfaces still hide `월급 0원`.

Match the file's existing heading/format style — do not restructure it.

- [ ] **Step 2: Update the memory feedback file**

Open `C:\Users\toodo\.claude\projects\c--Users-toodo-workspace-phy\memory\feedback_sobagi_allowance_giving_scene.md` and append a short, dated note in the body (keep the frontmatter intact):

> **Scoped exception (2026-05-24 — Stats monthly settlement):** The product owner approved a single quiet settlement line in the Stats calendar showing 쓴 돈 (지출 합계) and 들어온 돈 (수입 합계) as two separate monthly totals. This is the one place an income *total* is shown. The broader ban on income tracking (balance, 순수익, 차액, savings/comparison framing) still stands everywhere else, and the per-record display rule (hide `월급 0원`) is unchanged. Not a precedent for re-opening income tracking.

Confirm `MEMORY.md`'s one-line pointer for that file still reads accurately; if the description no longer fits, update only that one line. Do not add a new index entry (the file already exists).

- [ ] **Step 3: Commit**

```bash
git add "소박이/docs/SOBAGI_CURRENT_STATE.md"
git commit -m "docs: record scoped income-total exception (Stats monthly settlement)"
```

(The memory file lives outside the repo and is not committed.)

---

## Final review (after all tasks)

Dispatch a final code reviewer over the whole change set, then verify the four spec-driven focus areas explicitly:

1. **Income amount normalization** — `parseAmountInput` always returns a number; blank/`"0"`/junk → 0; positive parses; used in `record.tsx`.
2. **No regression to sub-spec A/B/C display rules** — Stats day-card income section (`r.amount > 0 && …`) and `PhotocardView` income line (`r.kind !== 'income' || r.amount > 0`) still hide the amount when 0 (no `월급 0원`). No-spend flow, reaction flow, edit sheet unchanged.
3. **No finance-dashboard language** — settlement is two totals only (쓴 돈 / 들어온 돈), no net/balance/차액/순수익/수입/지출 wording; no card/heading around the line; chart has no per-bar labels/tooltips.
4. **Mobile density risk in chart labels** — all-day x-labels at 8px is the primary; the fallback (sparse set / every-other) is documented in-code for an on-device tuning pass.

Then: `npm run typecheck` clean + `npm test` fully green, and use superpowers:finishing-a-development-branch.
