# Stats View-Mode Toggle + Readability + Amount Formatting — Design Spec

**Date:** 2026-05-24
**Status:** Approved (pending spec review)
**Branch target:** apps-in-toss-clean

---

## Direction note

One connected Stats readability pass: a calendar **view-mode toggle** (쓴 기록 / 들어온 기록 / 함께 보기), a low-risk **chart width polish**, and **comma formatting** in both amount inputs. Goal: make Stats easier to read without drifting into a finance dashboard.

**The default 쓴 기록 mode is byte-identical to current behavior** (including the existing 🌿 on no-spend *and* income-only days). The toggle is additive/opt-in, so it does **not** pre-empt the G2 dogfooding question (whether an income day should look "empty" by default) — that stays observable in the default view. The 들어온 기록 view is the one place per-day income amounts appear on the calendar; it is opt-in and reachable only by tapping that pill.

## Part 1 — Calendar view-mode toggle

### Placement & state

Three pills in the **screen header**, right-aligned on the `소소한 기록` title line (the header becomes a row: left column = title + `이번 달을 조용히 돌아봐요` subtitle; right = pills). Not in the settlement line, not in the grid.

New state in `stats.tsx`: `const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>('spending')`. The toggle drives **only the calendar cell amount/marker slot**. The day number, today/selected highlight, month nav, settlement line, chart, and selected-day card are all unchanged.

### Data

Extend the `expensesByDate` `DayAccum` with `incomeTotal: number` (sum of `e.kind === 'income'` amounts for the day), filled in the same loop that currently accumulates `total` (spending). `total` stays spending-only exactly as today. No new memo.

### Pure helper (testable)

New `src/components/stats/calendarCell.helpers.ts`:

```ts
export type CalendarViewMode = 'spending' | 'income' | 'both';

export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }                              // 🌿 quiet / no-spend day
  | { kind: 'amount'; amount: number }            // numeric (spending in 쓴 기록, income in 들어온 기록)
  | { kind: 'amountWithIncome'; amount: number }  // 함께: spending amount + 🍃 marker
  | { kind: 'incomeMarker' };                     // 함께: income-only → 🍃

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

### Cell-rendering matrix (the contract the helper encodes)

| Day kind | 쓴 기록 (default) | 들어온 기록 | 함께 보기 |
|---|---|---|---|
| spending | `3,200` | *(blank)* | `3,200` |
| income-only | 🌿 *(unchanged)* | `1,200,000` | 🍃 |
| spend + income | `3,200` | `1,200,000` | `3,200·🍃` |
| no-spend | 🌿 | *(blank)* | 🌿 |
| income + no-spend | 🌿 | `1,200,000` | 🍃 |
| no record | *(blank)* | *(blank)* | *(blank)* |

### Rendering

In the calendar cell, replace the inline `data.total === 0 ? 🌿 : amount` block with a switch on `selectCalendarCellContent(calendarViewMode, { spendingTotal: data?.total ?? 0, incomeTotal: data?.incomeTotal ?? 0, hasRecord: !!data })`:
- `blank` → existing `dayAmountPlaceholder` spacer.
- `leaf` → `🌿` (existing `dayAmount` style).
- `amount` → `{amount.toLocaleString('ko-KR')}` with `numberOfLines={1} ellipsizeMode="tail"` (existing treatment).
- `incomeMarker` → `🍃` (existing `dayAmount` style).
- `amountWithIncome` → spending amount followed by a small trailing `🍃` marker; `numberOfLines={1}`. The 🍃 is a fixed suffix (a tiny Text), so truncation eats the number's tail, never the marker.

Selected-day cells keep the existing `dayAmountSelected` color treatment for all numeric/leaf states.

### Tone & guardrails

- Pills: muted olive, low-contrast, ~11–12px, rounded; **active state lightly tinted only** (e.g. soft `surface`/`oliveGreen` wash) — **not** a hard iOS segmented control, no heavy border/shadow.
- 🍃 is the established income-family leaf (non-monetary). No 💰/💵.
- **No** net / balance / 차액 / 순수익, **no** +/− signs, **no** red/green comparison colors, no "financial outcome" framing. 함께 보기 communicates *which kinds of records existed*, not a calculation.

### Known constraint (flagged, not solved)

Income daily amounts (esp. salary) are larger than daily spend and will ellipsize in a ~50px cell, the same way large spending totals already do. Full value is in the day card. Acceptable for this pass.

## Part 2 — Chart readability polish

In `src/components/stats/MonthAmountChart.tsx`, widen the bar area by trimming edges, not by adding weight:

- `Y_AXIS_W` 60 → **48** (full-comma `72,000`-class labels still fit; `numberOfLines={1}` already guards rare 7-digit values via ellipsis).
- card `paddingHorizontal` 16 → **12**.
- wrapper `gap` 6 → **4**.

Net: bar area ~+10% per column on a 360px phone; content shifts left as a side effect. No heavier styling, no new elements.

**All-31 x-labels stay** for this pass (per owner decision). The documented in-code sparse fallback (`1 / 5 / 10 / 15 / 20 / 25 / 30`) is retained as a comment. **Honest note carried into the spec:** the width gain mitigates but does not eliminate 2-digit label crowding (~8px/label); sparse would read materially cleaner and remains a one-line flip after on-device judgment.

## Part 3 — Amount comma formatting (both inputs)

### Shared formatter

Add to `src/utils/amount.ts`, alongside `parseAmountInput`:

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

### Wiring

- **Stats edit sheet** (`stats.tsx`): `onChangeText={(t) => setEditAmount(formatAmountInput(t))}`; pre-format on `openEdit` → `setEditAmount(formatAmountInput(String(expense.amount)))`. The edit amount `TextInput` has no `maxLength` today — leave it; the formatter caps nothing and `parseAmountInput` strips commas before validating.
- **Record create** (`record.tsx`): `onChangeText={(t) => setAmountText(formatAmountInput(t))}`. The create input currently has `maxLength={10}` (10 raw digits); commas push a 10-digit value to 13 chars, so **raise `maxLength` 10 → 13** to preserve the 9,999,999,999 ceiling after grouping.

### Round-trip & guardrails (must hold)

- `Expense.amount` is still derived only via `parseAmountInput` (create: `const amount = parseAmountInput(amountText)`; edit: `commitEdit` already parses) → **stored value stays a clean non-negative integer; no raw formatted string is ever stored.**
- Blank income remains 0-saveable **only when the income intent guard is satisfied** (`incomeRecordHasIntent` in `recordValidation.ts`) — formatting is display-only and does not touch that gate.
- Spending validation unchanged (`amountValidForKind` → spending must be > 0).
- The create hero (`amount > 0 ? '{…}원' : '0원'`) and income optionality are unchanged — `amount` still comes from the parser, not the formatted string.

## Scope

### Changed
- `src/pages/stats.tsx` — header toggle row + `calendarViewMode` state + styles; `incomeTotal` on `DayAccum`; cell renderer via `selectCalendarCellContent`; edit amount input formatting.
- `src/components/stats/calendarCell.helpers.ts` — **new** pure helper + types.
- `src/components/stats/MonthAmountChart.tsx` — `Y_AXIS_W`/padding/gap polish.
- `src/utils/amount.ts` — add `formatAmountInput`.
- `src/pages/record.tsx` — create amount input formatting + `maxLength` 10→13.
- `__tests__/calendarCell.helpers.test.ts` — **new**.
- `__tests__/amount.test.ts` — add `formatAmountInput` cases.

### Unchanged
- Settlement line, selected-day card, photocard, observation block, month nav/picker, chart bar logic/data (spending-only), edit validity/delete, hydration, types, storage, all income save/reaction flows.

## Testing

- `formatAmountInput`: `''`→`''`, `'1234'`→`'1,234'`, `'1234567'`→`'1,234,567'`, `'12a34'`→`'1,234'`, `'0'`→`'0'`, `'007'`→`'7'`, `'1,234'`→`'1,234'` (idempotent round-trip with `parseAmountInput`).
- `selectCalendarCellContent`: cover the full matrix above — for each of the 3 modes × the day kinds (spending / income-only / spend+income / no-spend / income+no-spend / no-record). Assert exact `CellDisplay` discriminants.
- Round-trip: `parseAmountInput(formatAmountInput('1234567')) === 1234567`.
- The toggle UI, cell JSX, and chart spacing are verified by code review + on-device dogfooding (consistent with the codebase's no-component-snapshot approach).

## Anti-patterns (out of scope)

- No net / balance / 차액 / 순수익 / income-vs-spending comparison anywhere; the toggle never computes a combined figure.
- No +/− signs, no red/green, no "money performance" framing.
- No hard segmented-control styling; pills stay quiet.
- 함께 보기 never shows a second amount column — income presence is the 🍃 marker only.
- No change to default 쓴 기록 behavior (preserves the G2 dogfooding question).
- No raw formatted string stored in `Expense.amount`; no change to income intent guard or spending validation.
- Chart stays spending-only and unchanged except the width polish; x-axis stays all-31 (sparse fallback documented, not applied).

## Success criteria

- A quiet 3-pill toggle sits on the `소소한 기록` title line; default 쓴 기록 renders exactly as today.
- 들어온 기록 shows per-day income only (off-kind days blank); 함께 보기 shows `3,200·🍃`-style cells; matrix matches the table.
- Chart bar area is visibly wider with full-comma y-labels intact and no heavier look; all-31 labels retained.
- Both amount inputs show live comma grouping; stored `Expense.amount` is always a clean integer; income/spending validity rules unchanged.
- New pure-helper unit tests pass; typecheck clean; full Jest green; anti-pattern grep clean.
