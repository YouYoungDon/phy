# Stats View-Mode Toggle + Readability + Amount Formatting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a quiet calendar view-mode toggle (쓴 기록 / 들어온 기록 / 함께 보기), widen the bottom chart for readability, and show live comma grouping in both amount inputs — without drifting into a finance dashboard.

**Architecture:** Two pure, unit-tested helpers carry the logic: `formatAmountInput` (display grouping, inverse of the existing `parseAmountInput`) and `selectCalendarCellContent` (mode × day-data → a `CellDisplay` descriptor). The screen renders from those. The toggle changes only the calendar cell amount/marker slot; default 쓴 기록 stays byte-identical (preserves the G2 dogfooding question). Chart polish is pure spacing.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29. Tests in `소박이/__tests__/*.test.ts` import from `../src/...`.

**Working directory for all commands:** `c:\Users\toodo\workspace\phy\소박이`
- Single test file: `npm test -- <name>` · Full: `npm test` · Typecheck: `npm run typecheck`

**Spec:** `docs/superpowers/specs/2026-05-24-stats-view-toggle-readability-design.md`

---

## Task 1: `formatAmountInput` shared formatter

**Files:**
- Modify: `소박이/src/utils/amount.ts`
- Modify: `소박이/__tests__/amount.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `소박이/__tests__/amount.test.ts` (it already imports from `../src/utils/amount`; add `formatAmountInput` to that import):

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- amount`
Expected: FAIL — `formatAmountInput is not a function` / not exported.

- [ ] **Step 3: Implement the formatter**

Append to `소박이/src/utils/amount.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- amount`
Expected: PASS (existing `parseAmountInput` cases + new `formatAmountInput` cases).

- [ ] **Step 5: Commit**

```bash
git add "소박이/src/utils/amount.ts" "소박이/__tests__/amount.test.ts"
git commit -m "feat(amount): shared formatAmountInput (comma grouping, inverse of parseAmountInput)"
```

---

## Task 2: `selectCalendarCellContent` pure helper

**Files:**
- Create: `소박이/src/components/stats/calendarCell.helpers.ts`
- Create: `소박이/__tests__/calendarCell.helpers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `소박이/__tests__/calendarCell.helpers.test.ts`:

```ts
import { selectCalendarCellContent } from '../src/components/stats/calendarCell.helpers';

// Day kinds expressed as { spendingTotal, incomeTotal, hasRecord }
const spend = { spendingTotal: 3200, incomeTotal: 0, hasRecord: true };
const incomeOnly = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const both = { spendingTotal: 3200, incomeTotal: 1200000, hasRecord: true };
const noSpend = { spendingTotal: 0, incomeTotal: 0, hasRecord: true };
const incomeNoSpend = { spendingTotal: 0, incomeTotal: 1200000, hasRecord: true };
const empty = { spendingTotal: 0, incomeTotal: 0, hasRecord: false };

describe('selectCalendarCellContent — 쓴 기록 (spending, default)', () => {
  it('spending day → amount(spending)', () => {
    expect(selectCalendarCellContent('spending', spend)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('income-only day → leaf (unchanged 🌿)', () => {
    expect(selectCalendarCellContent('spending', incomeOnly)).toEqual({ kind: 'leaf' });
  });
  it('spend+income day → amount(spending)', () => {
    expect(selectCalendarCellContent('spending', both)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('no-spend day → leaf', () => {
    expect(selectCalendarCellContent('spending', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('spending', empty)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 들어온 기록 (income)', () => {
  it('income day → amount(income)', () => {
    expect(selectCalendarCellContent('income', incomeOnly)).toEqual({ kind: 'amount', amount: 1200000 });
  });
  it('spend+income day → amount(income)', () => {
    expect(selectCalendarCellContent('income', both)).toEqual({ kind: 'amount', amount: 1200000 });
  });
  it('income+no-spend day → amount(income)', () => {
    expect(selectCalendarCellContent('income', incomeNoSpend)).toEqual({ kind: 'amount', amount: 1200000 });
  });
  it('spending-only day → blank', () => {
    expect(selectCalendarCellContent('income', spend)).toEqual({ kind: 'blank' });
  });
  it('no-spend day → blank', () => {
    expect(selectCalendarCellContent('income', noSpend)).toEqual({ kind: 'blank' });
  });
});

describe('selectCalendarCellContent — 함께 보기 (both)', () => {
  it('spend-only → amount(spending)', () => {
    expect(selectCalendarCellContent('both', spend)).toEqual({ kind: 'amount', amount: 3200 });
  });
  it('income-only → incomeMarker (🍃)', () => {
    expect(selectCalendarCellContent('both', incomeOnly)).toEqual({ kind: 'incomeMarker' });
  });
  it('spend+income → amountWithIncome(spending)', () => {
    expect(selectCalendarCellContent('both', both)).toEqual({ kind: 'amountWithIncome', amount: 3200 });
  });
  it('income+no-spend → incomeMarker', () => {
    expect(selectCalendarCellContent('both', incomeNoSpend)).toEqual({ kind: 'incomeMarker' });
  });
  it('no-spend → leaf', () => {
    expect(selectCalendarCellContent('both', noSpend)).toEqual({ kind: 'leaf' });
  });
  it('no record → blank', () => {
    expect(selectCalendarCellContent('both', empty)).toEqual({ kind: 'blank' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendarCell`
Expected: FAIL — cannot find module `calendarCell.helpers`.

- [ ] **Step 3: Implement the helper**

Create `소박이/src/components/stats/calendarCell.helpers.ts`:

```ts
// Pure helper for the Stats calendar cell amount/marker slot. Maps the active
// view mode + a day's spending/income shape to a render descriptor. No React,
// no SDK — unit-testable. The 'spending' branch reproduces the pre-toggle
// behavior byte-for-byte (income-only & no-spend days → 🌿).
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                              // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number }            // spending in 쓴 기록, income in 들어온 기록
  | { kind: 'amountWithIncome'; amount: number }  // 함께: spending amount + 🍃 marker
  | { kind: 'incomeMarker' };                     // 함께: income existed, no spending → 🍃

export function selectCalendarCellContent(
  mode: CalendarViewMode,
  d: { spendingTotal: number; incomeTotal: number; hasRecord: boolean },
): CellDisplay {
  if (mode === 'income') {
    return d.incomeTotal > 0 ? { kind: 'amount', amount: d.incomeTotal } : { kind: 'blank' };
  }
  if (mode === 'both') {
    if (!d.hasRecord) return { kind: 'blank' };
    if (d.spendingTotal > 0) {
      return d.incomeTotal > 0
        ? { kind: 'amountWithIncome', amount: d.spendingTotal }
        : { kind: 'amount', amount: d.spendingTotal };
    }
    return d.incomeTotal > 0 ? { kind: 'incomeMarker' } : { kind: 'leaf' };
  }
  // 'spending' (default) — byte-identical to current behavior
  if (!d.hasRecord) return { kind: 'blank' };
  return d.spendingTotal === 0 ? { kind: 'leaf' } : { kind: 'amount', amount: d.spendingTotal };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendarCell`
Expected: PASS (16 cases).

- [ ] **Step 5: Commit**

```bash
git add "소박이/src/components/stats/calendarCell.helpers.ts" "소박이/__tests__/calendarCell.helpers.test.ts"
git commit -m "feat(stats): pure selectCalendarCellContent helper (view-mode cell matrix)"
```

---

## Task 3: Comma formatting in both amount inputs

**Files:**
- Modify: `소박이/src/pages/stats.tsx` (edit sheet amount input ~lines 597–606; `openEdit` ~line 353)
- Modify: `소박이/src/pages/record.tsx` (create amount input)

- [ ] **Step 1: Wire the edit sheet (stats.tsx)**

Add `formatAmountInput` to the existing amount import (currently `import { parseAmountInput } from '../utils/amount';`):

```ts
import { parseAmountInput, formatAmountInput } from '../utils/amount';
```

In `openEdit`, pre-format the seeded value — change:

```ts
setEditAmount(String(expense.amount));
```
to:
```ts
setEditAmount(formatAmountInput(String(expense.amount)));
```

In the edit amount `TextInput`, change `onChangeText={setEditAmount}` to:

```tsx
onChangeText={(t) => setEditAmount(formatAmountInput(t))}
```

(Leave `keyboardType`, `placeholder="0"`, and the absence of `maxLength` as-is. `commitEdit` and `editCanSave` already call `parseAmountInput(editAmount)`, which strips commas before validating — no logic change.)

- [ ] **Step 2: Wire the record create input (record.tsx)**

Add the import alongside the existing `import { parseAmountInput } from '../utils/amount';`:

```ts
import { parseAmountInput, formatAmountInput } from '../utils/amount';
```

In the create amount `TextInput`, change `onChangeText={setAmountText}` to:

```tsx
onChangeText={(t) => setAmountText(formatAmountInput(t))}
```

and raise the digit ceiling for the added commas — change `maxLength={10}` to:

```tsx
maxLength={13}
```

(`const amount = parseAmountInput(amountText)` is unchanged — it strips commas, so the stored amount, the `0원` hero, the income intent guard, and spending validity are all unaffected.)

- [ ] **Step 3: Typecheck + full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all green (no test change; behavior is display-only and parser-backed).

- [ ] **Step 4: Manual round-trip reasoning (no code)**

Confirm by reading: create with `1,234` → `parseAmountInput('1,234')` = 1234 stored; edit seeded from `72000` shows `72,000`, saved → 72000; blank income still parses to 0 and saves only when `incomeRecordHasIntent` holds; blank/`0` spending → disabled save (`amountValidForKind('spending',0)` false). No raw formatted string is stored.

- [ ] **Step 5: Commit**

```bash
git add "소박이/src/pages/stats.tsx" "소박이/src/pages/record.tsx"
git commit -m "feat(amount): live comma grouping in stats edit + record create inputs"
```

---

## Task 4: Calendar view-mode toggle (data, state, header pills, cell render)

**Files:**
- Modify: `소박이/src/pages/stats.tsx` (imports; `DayAccum` + `expensesByDate`; new state; header; cell render; styles)

- [ ] **Step 1: Import the helper + types**

Add to the stats imports:

```ts
import { selectCalendarCellContent, CalendarViewMode, CellDisplay } from '../components/stats/calendarCell.helpers';
```

Add a module-level constant near `DAY_LABELS`:

```ts
const CALENDAR_VIEW_MODES: { mode: CalendarViewMode; label: string }[] = [
  { mode: 'spending', label: '쓴 기록' },
  { mode: 'income', label: '들어온 기록' },
  { mode: 'both', label: '함께 보기' },
];
```

- [ ] **Step 2: Add `incomeTotal` to `DayAccum` + the accumulator**

In the `DayAccum` type add `incomeTotal: number;`. In the `expensesByDate` memo, initialize it and accumulate income before the existing `continue`:

```ts
  type DayAccum = {
    total: number;
    count: number;
    categories: ExpenseCategory[];
    hasRecord: boolean;
    hasOnlyNoSpend: boolean;
    incomeTotal: number;
  };

  const expensesByDate = useMemo(() => {
    const map: Record<string, DayAccum> = {};
    for (const e of expenses) {
      const d = expenseLocalDate(e);
      if (!map[d]) map[d] = { total: 0, count: 0, categories: [], hasRecord: false, hasOnlyNoSpend: true, incomeTotal: 0 };
      map[d].hasRecord = true;
      if (e.category !== 'no_spend') map[d].hasOnlyNoSpend = false;
      if (e.kind === 'income') { map[d].incomeTotal += e.amount; continue; }
      map[d].total += e.amount;
      map[d].count += 1;
      map[d].categories.push(e.category);
    }
    return map;
  }, [expenses]);
```

(`MonthAmountChart`'s prop type is `Record<string, { total: number }>` — the extra field is structurally compatible; no chart change.)

- [ ] **Step 3: Add the view-mode state**

Next to the other `useState` calls in `StatsScreen`:

```ts
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('spending');
```

- [ ] **Step 4: Add a module-level cell renderer**

Add near the `ExpenseList` function (module scope, uses module-level `styles`):

```tsx
function DayAmountSlot({ cell, isSelected }: { cell: CellDisplay; isSelected: boolean }) {
  const textStyle = [styles.dayAmount, isSelected && styles.dayAmountSelected];
  switch (cell.kind) {
    case 'blank':
      return <View style={styles.dayAmountPlaceholder} />;
    case 'leaf':
      return <Text style={textStyle} numberOfLines={1}>🌿</Text>;
    case 'incomeMarker':
      return <Text style={textStyle} numberOfLines={1}>🍃</Text>;
    case 'amount':
      return (
        <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
          {cell.amount.toLocaleString('ko-KR')}
        </Text>
      );
    case 'amountWithIncome':
      return (
        <View style={styles.dayAmountRow}>
          <Text style={[...textStyle, styles.dayAmountFlex]} numberOfLines={1} ellipsizeMode="tail">
            {cell.amount.toLocaleString('ko-KR')}
          </Text>
          <Text style={[styles.dayAmountLeaf, isSelected && styles.dayAmountSelected]}>·🍃</Text>
        </View>
      );
  }
}
```

- [ ] **Step 5: Replace the inline cell amount block**

In the calendar cell, replace the current `{data ? ( data.total === 0 ? <🌿> : <amount> ) : <placeholder/> }` block with:

```tsx
                      <DayAmountSlot
                        cell={selectCalendarCellContent(calendarViewMode, {
                          spendingTotal: data?.total ?? 0,
                          incomeTotal: data?.incomeTotal ?? 0,
                          hasRecord: !!data,
                        })}
                        isSelected={isSelected}
                      />
```

- [ ] **Step 6: Restructure the header to add the toggle**

Replace the header block:

```tsx
      <View style={styles.header}>
        <Text style={styles.headerTitle}>소소한 기록</Text>
        <Text style={styles.headerSub}>이번 달을 조용히 돌아봐요</Text>
      </View>
```

with:

```tsx
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTitleCol}>
            <Text style={styles.headerTitle}>소소한 기록</Text>
            <Text style={styles.headerSub}>이번 달을 조용히 돌아봐요</Text>
          </View>
          <View style={styles.viewToggle}>
            {CALENDAR_VIEW_MODES.map(({ mode, label }) => (
              <Pressable
                key={mode}
                style={[styles.viewPill, calendarViewMode === mode && styles.viewPillActive]}
                onPress={() => setCalendarViewMode(mode)}
                hitSlop={4}
              >
                <Text style={[styles.viewPillText, calendarViewMode === mode && styles.viewPillTextActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
```

- [ ] **Step 7: Add styles**

Add to the `StyleSheet.create({ ... })` block (place the header styles near the existing `headerTitle`/`headerSub`, the dayAmount styles near existing `dayAmount`):

```ts
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleCol: {
    flex: 1,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
    flexShrink: 0,
  },
  viewPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  viewPillActive: {
    backgroundColor: COLORS.surface,
  },
  viewPillText: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  viewPillTextActive: {
    color: COLORS.oliveDark,
    fontWeight: '600',
  },
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

- [ ] **Step 8: Typecheck + full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all green (toggle/cell are render-only; logic is covered by the Task 2 helper tests).

- [ ] **Step 9: Commit**

```bash
git add "소박이/src/pages/stats.tsx"
git commit -m "feat(stats): calendar view-mode toggle (쓴 기록 / 들어온 기록 / 함께 보기)"
```

---

## Task 5: Chart width polish

**Files:**
- Modify: `소박이/src/components/stats/MonthAmountChart.tsx` (`Y_AXIS_W` ~line 8; `card.paddingHorizontal` ~line 117; `wrapper.gap` ~line 134)

- [ ] **Step 1: Apply the spacing changes**

- `const Y_AXIS_W = 60;` → `const Y_AXIS_W = 48;`
- In `styles.card`, `paddingHorizontal: 16` → `paddingHorizontal: 12`.
- In `styles.wrapper`, `gap: 6` → `gap: 4`.

Leave the all-31 x-label rendering and its sparse-fallback comment unchanged.

- [ ] **Step 2: Typecheck + full suite**

Run: `npm run typecheck` — Expected: no errors.
Run: `npm test` — Expected: all green (no test change).

- [ ] **Step 3: Commit**

```bash
git add "소박이/src/components/stats/MonthAmountChart.tsx"
git commit -m "polish(stats): widen chart bar area (y-axis 48, tighter padding/gap)"
```

---

## Final verification (after all tasks)

- `npm run typecheck` clean.
- `npm test` fully green (new `formatAmountInput` + `selectCalendarCellContent` suites included).
- **Round-trip check:** spending edit with commas → numeric; income edit with commas → numeric; create with commas → numeric; reload preserves numbers.
- **Anti-pattern grep stays clean** (`순수익|잔액|차액|순이익|수입총액|net|balance|profit` — only the existing benign comment/URL/variable hits).
- **Small-phone chart readability check** (on-device): confirm the wider bar area reads better; note honestly whether the all-31 labels should flip to the documented sparse set.
- Use superpowers:finishing-a-development-branch when done.
