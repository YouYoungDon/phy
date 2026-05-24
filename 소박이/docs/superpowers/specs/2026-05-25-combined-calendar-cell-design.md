# Combined "함께 보기" Calendar Cell — Design

**Date:** 2026-05-25
**Status:** Approved (user-authored direction)
**Branch:** apps-in-toss-clean

## Goal

Change the Stats calendar's **함께 보기** view so each day cell shows a single quiet
combined-movement number (spending + income, full comma-formatted) instead of the
current `spending·🍃` composite. 쓴 기록 and 들어온 기록 modes are unchanged.

## Why

The current 함께 보기 cell renders the spending amount plus a `·🍃` income marker
(e.g. `3,200·🍃`). In practice this:
- reads inconsistently — "함께 보기" sounds like a combined view, but it shows only
  the spending number with a marker;
- crowds the tiny calendar cell with the marker;
- mixes formatting between modes;
- truncates awkwardly on large values (`1,2…·🍃`).

Product direction: **함께 보기 = total daily movement as one calm number.** Not net
income, not a balance — just "how much moved today," shown quietly.

## Behavior (the only change is 함께 보기)

| Mode | Day shape | Cell shows |
|------|-----------|------------|
| 쓴 기록 (spending) | spending day | spending amount, full comma (**unchanged**) |
| 쓴 기록 | income-only / no-spend | 🌿 (**unchanged**) |
| 쓴 기록 | no record | blank (**unchanged**) |
| 들어온 기록 (income) | income day | compact 만 income (e.g. `300만`) (**unchanged**) |
| 들어온 기록 | spending-only / no-spend | blank (**unchanged**) |
| **함께 보기 (both)** | **spending and/or income** | **combined `spending + income`, full comma** |
| **함께 보기** | **no-spend-only** | **🌿 (unchanged)** |
| **함께 보기** | **no record** | **blank (unchanged)** |

Combined examples (함께 보기):
- spending 3,200, income 0 → `3,200`
- spending 0, income 1,200,000 → `1,200,000`
- spending 3,200, income 1,200,000 → `1,203,200`
- no-spend-only (both 0, has record) → `🌿`

### Formatting rules (함께 보기)
- Full thousand separators (`toLocaleString('ko-KR')`).
- **No** compact `만` formatting (compact stays in 들어온 기록 only).
- **No** `🍃` marker, **no** `+`/`-` signs, **no** arrows.
- **No** net / balance / 차액 / 순수익 / profit framing or language.
- **No** red/blue gain-loss colors — same muted `dayAmount` style as the other modes.

### Interpretation
The combined number is the **absolute sum of movement**, not net income. A day with
spending 3,200 and income 1,200,000 shows `1,203,200` ("this much moved"), never a
netted figure. This keeps the calm "quiet view of daily life movement" tone — not an
asset tracker.

## Architecture / Components

### `src/components/stats/calendarCell.helpers.ts`

`CellDisplay` loses the two composite kinds — after this change nothing renders them:

```ts
export type CellDisplay =
  | { kind: 'blank' }
  | { kind: 'leaf' }
  | { kind: 'amount'; amount: number; compact?: boolean };
```

(`amountWithIncome` and `incomeMarker` are removed.)

`selectCalendarCellContent` 'both' branch becomes a combined total:

```ts
if (mode === 'both') {
  if (!d.hasRecord) return { kind: 'blank' };
  const combined = d.spendingTotal + d.incomeTotal;
  return combined > 0 ? { kind: 'amount', amount: combined } : { kind: 'leaf' };
}
```

The `'income'` and `'spending'` branches are untouched (byte-identical).

### `src/pages/stats.tsx` — `DayAmountSlot`

Remove the `case 'incomeMarker'` and `case 'amountWithIncome'` arms. The remaining
switch handles `blank` / `leaf` / `amount` (exhaustive over the trimmed union). The
`amount` arm already renders `compact ? formatCompactAmount : toLocaleString('ko-KR')`,
so the combined total (no `compact`) gets full commas with the existing
`numberOfLines={1} ellipsizeMode="tail"` truncation guard.

Remove the now-dead styles `dayAmountRow`, `dayAmountFlex`, `dayAmountLeaf` (only the
`amountWithIncome` arm referenced them). `formatCompactAmount` stays (들어온 기록 uses it).

## Cell readability

- 함께 보기 cells drop the `·🍃` suffix → ~2 fewer glyphs and no mixed icon/number row.
- One coherent number per cell instead of an amount+marker composite.
- Large combined values still truncate via `ellipsizeMode="tail"`, but without the
  trailing marker eating width, so the visible digits are the leading (most
  significant) ones.

## Out of Scope (YAGNI)

- No change to 쓴 기록 or 들어온 기록 behavior or formatting.
- No change to the monthly settlement line, the day card, or the chart.
- No new compact threshold for 함께 (full commas as specified).
- No net/balance concept anywhere.

## Testing

`__tests__/calendarCell.helpers.test.ts` — rewrite the **함께 보기 (both)** describe block:
- spend-only → `{ kind: 'amount', amount: 3200 }` (combined 3200)
- income-only → `{ kind: 'amount', amount: 1200000 }` (combined, full — was incomeMarker)
- spend+income → `{ kind: 'amount', amount: 1203200 }` (combined — was amountWithIncome)
- income+no-spend → `{ kind: 'amount', amount: 1200000 }`
- no-spend → `{ kind: 'leaf' }` (combined 0, **unchanged**)
- no record → `{ kind: 'blank' }` (**unchanged**)

Leave the 쓴 기록 / 들어온 기록 describe blocks and `formatCompactAmount` block intact
(they assert the unchanged behavior).

## Verification Checklist

- [ ] `npm run typecheck` clean (no dangling `amountWithIncome`/`incomeMarker` refs)
- [ ] full Jest green (updated 함께 tests pass; spending/income/compact blocks untouched)
- [ ] anti-pattern grep clean: `순수익|잔액|차액|순이익|net|balance|profit`
- [ ] no `dayAmountRow`/`dayAmountFlex`/`dayAmountLeaf`/`🍃` left in stats.tsx cell render
- [ ] manual: 함께 reads as one number; 쓴/들어온 unchanged; no finance-app feel
