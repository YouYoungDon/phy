# Monthly Settlement + Stats Readability — Design Spec

**Date:** 2026-05-24
**Status:** Approved (pending spec review)
**Branch target:** apps-in-toss-clean

---

## Direction note (scoped policy exception)

This spec introduces a **monthly settlement line** (쓴 돈 / 들어온 돈 as two separate totals) at the top of the Stats calendar. Showing an **income total** is a deliberate, **scoped** reversal of the 2026-05-19 "no income totals/balance" policy — limited to this one quiet monthly line. It is **not** a general re-opening of income tracking:

- Two separate totals only — **no net, no balance, no 차액(수지)**.
- Everywhere else, the income-quiet rules still hold: no "수입 총액 / 순수익 / 잔액" framing on any other surface.

Post-landing, record the exception in:
- `SOBAGI_CURRENT_STATE.md` handoff
- Memory `feedback_sobagi_decoupled_signals.md` (or `feedback_sobagi_allowance_giving_scene.md`) — note the Stats monthly settlement line is an explicit, scoped exception to the no-income-totals rule.

## Goal

Four scoped changes to Stats + Record, all in service of "make the ledger readable" without drifting into dashboard energy:

1. A quiet **monthly settlement line** (쓴 돈 / 들어온 돈) under the centered month label in the calendar card.
2. The amount chart's **x-axis labels** become readable across the whole month (attempt all days 1–31).
3. The amount chart's **y-axis** shows full comma numbers instead of 만/천 compaction.
4. The Record screen's **income amount** shows a visible `0원` default instead of blank.

## Philosophy / guardrails (apply throughout)

- **Quiet over dashboard.** The settlement line and chart must stay soft — muted labels, body-weight numbers, no bold green emphasis, no headline framing. If a change starts to feel like a finance dashboard, pull it back.
- **Income stays quiet except the one settlement total.** The settlement line may total income; nothing else gains income-total/balance framing.
- **No validation pressure on income.** Income amount stays optional and 0-saveable everywhere.

## Section 1 — Monthly settlement line

### Placement

Inside `calendarCard` in `src/pages/stats.tsx`, **between** the month-nav row (`‹ 2026년 5월 ›`, which opens the month picker) and the weekday row (`dowRow`). It sits directly under the centered month label, matching the requested location.

```
┌─ calendarCard ─────────────────────────────────┐
│              ‹    2026년 5월    ›               │  ← monthNav (unchanged)
│      쓴 돈 236,500원   ·   들어온 돈 1,200,000원    │  ← NEW settlement line
│      일   월   화   수   목   금   토            │  ← dowRow (unchanged)
│      ... calendar grid (unchanged) ...          │
└──────────────────────────────────────────────────┘
```

### Data

New memo `monthSettlement` over `expenses`, filtered to the view month (`${viewYear}-${MM}` prefix on `expenseLocalDate(e)`):

- `spending` = sum of `e.amount` for records where `e.kind !== 'income'`. `no_spend` carries amount 0, so including it is harmless.
- `income` = sum of `e.amount` for records where `e.kind === 'income'`.
- Returns `{ spending, income }`. No net/difference computed or stored.

### Rendering

A single centered row with two muted totals separated by a `·`:

- `쓴 돈 {spending.toLocaleString()}원` · `들어온 돈 {income.toLocaleString()}원`
- Labels in `COLORS.textMuted`; numbers in `COLORS.text` (body weight, **not** olive/green emphasis); ~12–13px.
- **Always show both**, including `0원`. In a settlement (monthly total) context, `들어온 돈 0원` is legitimate — this is distinct from the per-record display rule (Section 4). A month with no spending shows `쓴 돈 0원` the same way.
- If the single row is too wide on narrow phones, it may wrap; keep it visually quiet either way. Do not add a card, border, or heading around it — it's one soft line inside the existing calendar card.

### Unchanged

- The observation block below the calendar (`이번 주/달 다녀갔어요` cadence + top-scene chip + observation line) stays exactly as is. The settlement line is **added**, not a replacement for it.
- Calendar grid, daily cell totals (still spending-only), month nav, month picker.

## Section 2 — Chart x-axis labels

In `src/components/stats/MonthAmountChart.tsx`:

- **Primary:** label **every** day `1…daysInMonth` (remove the `LABEL_DAYS` set gate), at a smaller font (~8px) so all numbers fit. This directly serves the "show all dates" request.
- **Fallback (documented, not auto):** if on-device the all-days labels overlap or read as noisy, fall back to every-other days, or a sparse set `1 / 5 / 10 / 15 / 20 / 25 / 30`. The fallback is a manual tuning step after dogfooding, not branching logic in the component.
- Labels stay muted (`COLORS.textLight`), single line, centered under each bar column. **Do not** let the dense labels turn the chart dashboard-like — small and quiet is the target.

## Section 3 — Chart y-axis full numbers

In `MonthAmountChart.tsx`:

- Replace the compact `fmtAmt(maxTotal)` / `fmtAmt(midTotal)` labels with full comma numbers: `maxTotal.toLocaleString()`, `midTotal.toLocaleString()`. The baseline label stays `0`.
- **Layout guard:** widen `Y_AXIS_W` only as much as needed for large values (e.g. `1,200,000`). Prefer **smaller, muted** y-label typography (drop the y-label font a touch, keep `COLORS.textLight`) over widening the axis enough to make the chart feel heavy. The bars remain the visual focus.
- `fmtAmt` is no longer used after this change. **Delete `fmtAmt`** from `monthAmountChart.helpers.ts` and **remove its unit tests** from `__tests__/monthAmountChart.helpers.test.ts`. `barHeightFor` and `selectMaxTotal` (and their tests) stay.

## Section 4 — Record income `0원` default

In `src/pages/record.tsx`, the amount hero (around line 326–330):

- Current: in income mode with `amount === 0`, the hero renders `''` (blank). Change it so `amount === 0` renders `0원` in **both** modes (i.e. drop the `recordKind === 'income' ? '' :` branch).
- **Scope it carefully — preserve all of:**
  - Income amount stays **optional**.
  - Empty input still **saves as 0** (no change to `canSave`, which for income is `!isSaving`).
  - **No validation pressure** — no required-field error, no blocking.
  - The input placeholder stays `금액 (선택)` (income) so optionality is still signaled.
- **Distinction to hold:** the `0원` default is for the **input hero only**. Other **display surfaces must still avoid awkward `월급 0원`**:
  - Stats day-card income section (`r.amount > 0 && <Text>…원`) — unchanged; still hides the amount when 0.
  - `PhotocardView` income line (`r.kind !== 'income' || r.amount > 0`) — unchanged; still hides the amount when 0.

## Section 5 — Scope

### Changed

- **Modify** `src/pages/stats.tsx`: add `monthSettlement` memo + settlement-line render + styles.
- **Modify** `src/components/stats/MonthAmountChart.tsx`: all-day x-labels (~8px), full-number y-labels, y-axis width/typography guard.
- **Modify** `src/components/stats/monthAmountChart.helpers.ts`: delete `fmtAmt`.
- **Modify** `__tests__/monthAmountChart.helpers.test.ts`: remove `fmtAmt` tests (keep `barHeightFor`, `selectMaxTotal`).
- **Modify** `src/pages/record.tsx`: `0원` default in income mode (display-only).

### Unchanged

- Observation block, calendar grid, daily totals (spending-only), month nav/picker.
- Income save/edit flow, reaction flow, `canSave`/`canNoSpend` logic.
- `PhotocardView` and Stats income-section per-record amount-hiding (no `월급 0원`).
- Types, storage, categories, services.

## Section 6 — Testing

- `monthAmountChart.helpers.test.ts`: drop the 5 `fmtAmt` cases; keep the `barHeightFor` (6) and `selectMaxTotal` (4) cases. The helper file no longer exports `fmtAmt`.
- The settlement memo math is simple summation inline in `stats.tsx`. If a pure helper is extracted for it, add focused tests (sum spending excludes income; sum income; empty month → `{0,0}`); otherwise it's covered by the existing screen behavior + code review. Keep it inline unless extraction is clearly cleaner.
- Full suite + typecheck stay green. No new snapshot tests (consistent with the codebase's component-test approach).

## Anti-patterns (out of scope)

- No net / balance / 차액 / 순수익 anywhere — the settlement is two independent totals.
- No income-total or balance framing on any surface other than the one settlement line.
- No bold green amounts, no card/heading/border wrapping the settlement line, no "수입"/"지출" accounting words (use 쓴 돈 / 들어온 돈).
- No per-bar amount labels, tooltips, long-press, or zoom on the chart (unchanged from the amount-chart spec).
- No making income required, no validation error, no `월급 0원` on display surfaces.
- No change to calendar daily totals (stay spending-only).

## Success criteria

- A quiet `쓴 돈 … · 들어온 돈 …` line sits under the month label, full comma numbers, muted, both totals always shown (incl. 0원).
- The chart shows all-day x-labels at ~8px (with a documented every-other / sparse fallback if too dense), and full comma y-labels, without feeling like a dashboard.
- `fmtAmt` and its tests are removed; `barHeightFor`/`selectMaxTotal` tests still pass.
- Record income mode shows `0원` by default while income stays optional, 0-saveable, and free of validation pressure; display surfaces still avoid `월급 0원`.
- Typecheck clean; full Jest suite green.
