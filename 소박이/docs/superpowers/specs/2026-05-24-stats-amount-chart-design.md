# Stats Amount Chart — Design Spec

**Date:** 2026-05-24
**Status:** Approved
**Branch target:** apps-in-toss-clean

---

## Direction note (conscious reversal)

The 2026-05-22 "Stats evolution" landing **deliberately removed** the `MonthTrendGraph` amount bar chart and replaced it with the `MonthPresenceRow` dot trace, to pull the Stats screen away from "finance dashboard" energy toward "soft trace of presence." Its spec anti-patterns explicitly banned "Y-axis, tooltips, or tappable interaction on the presence row."

This spec **reverses that decision for the bottom graph specifically.** The product owner found the dot trace too low-visibility ("그냥 점 같다") and wants a readable amount chart back: horizontal = dates, vertical = amounts. The reversal is scoped to the Stats bottom graph; the broader "cozy companion, not finance app" identity still governs the rest of the app (room, reactions, dialogue, income records stay quiet).

Post-landing, the following must be updated to record the reversal:
- `SOBAGI_CURRENT_STATE.md` handoff
- A note on the 2026-05-22 stats-evolution spec's anti-pattern list (the Y-axis/tap ban is lifted for this chart)
- Memory `feedback_sobagi_restraint_over_visibility.md` (note the stats amount chart is an explicit exception)

## Goal

Replace the `MonthPresenceRow` dot trace at the bottom of the Stats tab with a readable monthly spending bar chart: one bar per day of the current view month, height proportional to that day's spending total, with a y-axis amount scale, weekly date labels, and tap-to-select wiring to the calendar above.

## Philosophy (for this surface)

- Readability first: the magnitude of each day's spending should be legible at a glance.
- The chart reads spending only — income is excluded (income stays a quiet, separate surface per sub-spec A).
- Tapping a bar connects the chart to detail (selects the day in the calendar + day card), making the chart a navigation aid, not just a picture.

## Section 1 — Component & data

### New component

`src/components/stats/MonthAmountChart.tsx` — a bar chart that replaces `MonthPresenceRow` in the same slot in `stats.tsx`. This is a revival and enhancement of the `MonthTrendGraph` component that existed before commit `84bb12b` (recover its bar-math + styles from git history as the starting point).

### Props

```ts
interface MonthAmountChartProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  daysInMonth: number;
  expensesByDate: Record<string, { total: number }>;
  todayStr: string;
  selectedDay: string;
  onSelectDay: (dateStr: string) => void;
}
```

### Data

- Bar value for a day = `expensesByDate[dateStr]?.total ?? 0`.
- `expensesByDate[d].total` is **already spending-only**: the memo in `stats.tsx` does `if (e.kind === 'income') continue;` and `no_spend` records carry amount 0. No new filtering needed — consume `total` directly.
- Scale reference `maxTotal` = the maximum daily `total` across the view month. If `maxTotal === 0` (empty/no-spend-only month), render the empty state (Section 4).
- `midTotal = maxTotal / 2` (rounded) for the middle y-axis label/gridline.

## Section 2 — Layout & readability

### Visual target

```
8만 ┤· · · · · █ · · · ·      ← max label + faint gridline
    │       █  █  █
4만 ┤· █ · █ █ ██ █ · ·       ← mid label + faint gridline
    │ █ █ █ █ ██ ███ █
 0  └─────────────────────    ← baseline gridline
     1    8   15   22  29     ← weekly date labels
```

### Y-axis

- Left column, fixed width (≈52px, from the old `Y_AXIS_W`).
- Three labels top→bottom: `maxTotal`, `midTotal`, `0`.
- Amounts use compact notation: `8만`, `4만`, `0` (a `fmtAmt(n)` helper — recover/adapt from the old `fmtAmt`). Compact, not full `80,000`.
- Three faint horizontal gridlines aligned to the three labels (top / mid / baseline).

### Bars

- Bar area height ≈72px (from old `TREND_BAR_MAX`).
- One bar column per day (`daysInMonth` columns), evenly distributed (`flex: 1` cells).
- Non-zero day height = `Math.max(Math.round((total / maxTotal) * BAR_MAX), MIN_BAR)` where `MIN_BAR` ≈ 8 — so a small-but-nonzero day still shows a visible stub.
- Zero day (no spending / no-spend-only / income-only) = baseline (no filled bar, or a 1px floor tick).

### X-axis date labels

- Weekly cadence: labels at days **1 / 8 / 15 / 22 / 29** (from old `TREND_LABEL_DAYS`). Days beyond the month's length simply don't render (e.g., a 28-day month omits 29).
- Labels muted, small (≈11px).

### Highlight states

- **Today's bar** (when viewing the current month and `dateStr === todayStr`): subtle outline/tint to orient the user.
- **Selected day's bar** (`dateStr === selectedDay`): stronger fill (brand olive) — clearly distinct from the default bar color so the user sees which day the day-card below corresponds to.
- Default bars: muted fill. Empty bars: very faint.
- Precedence when a bar is both today and selected: selected styling wins (it's the stronger signal).

## Section 3 — Interaction

- Each bar column is a `Pressable` → `onSelectDay(dateStr)`.
- In `stats.tsx`, `onSelectDay={setSelectedDay}` — tapping a bar updates `selectedDay`, which already drives the calendar selection highlight and the day card (spending list + income section) below. No new state needed; reuse `selectedDay` / `setSelectedDay`.
- **Future days** (dateStr > todayStr) within the current view month: non-tappable and rendered faint, consistent with the calendar's future-day tap guard. Past months have no future days.
- The chart does not open sheets or modals; its only side effect is selecting a day.

## Section 4 — Empty / edge states

- **Empty month** (`maxTotal === 0`, i.e., no spending anywhere in the month): render the axis frame with a single `0` baseline label and no filled bars. No separate message — the observation block above already shows `이번 달은 아직 비어있어요 🌿` for empty months. The chart stays quietly empty.
- **No-spend-only or income-only days:** `total === 0` → baseline, no bar. The chart is spending-magnitude only; presence of those records shows in the calendar (🌿) and day card, not here.
- **Single non-zero day:** that bar renders full height; all others baseline. `midTotal` label still shows half of it.
- **Division safety:** never divide by zero — the `maxTotal === 0` branch short-circuits before any `total / maxTotal`.

## Section 5 — Scope

### Changed

- **Create** `src/components/stats/MonthAmountChart.tsx` (revived + enhanced `MonthTrendGraph`).
- **Modify** `src/pages/stats.tsx`:
  - Remove the `MonthPresenceRow` import + render.
  - Import and render `<MonthAmountChart>` in the same slot, passing `selectedDay` and `onSelectDay={setSelectedDay}`.
- **Delete** `src/components/stats/MonthPresenceRow.tsx` (no longer used).

### Unchanged

- Calendar grid, month navigation, month picker.
- Observation block (cadence lines + top-scene chip + observation line) — stays above the chart.
- Day card (spending list + income section), photocard entry, edit/delete sheet.
- `expensesByDate` memo — already provides spending-only `total`; consumed read-only.
- `selectStatsObservation`, income surfaces, all sub-spec A work.
- Storage, types.

## Section 6 — Testing

The bar-scaling and label math is pure and unit-testable. Extract pure helpers and test them:

- `barHeightFor(total, maxTotal, barMax, minBar)`:
  - `total === 0` → `0` (baseline, no bar)
  - `total === maxTotal` → `barMax`
  - small non-zero total → at least `minBar`
  - never exceeds `barMax`
- `fmtAmt(n)` compact formatter (pinned rule):
  - `n === 0` → `'0'`
  - `n >= 10000` → `만` units with up to one decimal, trailing `.0` dropped: `40000` → `'4만'`, `72000` → `'7.2만'`, `125000` → `'12.5만'`
  - `0 < n < 10000` → nearest 천: `${Math.round(n / 1000)}천` → `8000` → `'8천'`, `5400` → `'5천'`
  - (The y-axis only ever formats `maxTotal`, `midTotal`, and `0`, so this is low-volume formatting.)
- `selectMaxTotal(expensesByDate, viewYear, viewMonth, daysInMonth)` → max daily total in the month (0 for empty month).

The component's rendering (highlight states, tap wiring) is verified by code review + on-device dogfooding, not snapshot tests (consistent with the codebase's existing approach — `MonthPresenceRow` and `MonthTrendGraph` had no render tests).

## Anti-patterns (out of scope)

- No income in the bars (spending-only — income has its own quiet surface).
- No net/balance/profit framing, no "이번 달 총 N원" headline on the chart.
- No per-bar amount labels (rejected for clutter — y-axis scale is the readability mechanism).
- No tooltips, no long-press menus, no zoom/pan. Tap = select day, nothing more.
- No animation beyond what the existing screen already does (no bar-grow spring, no celebratory motion).

## Success criteria

- The Stats bottom graph shows a readable bar chart: one bar per day of the current month, height by spending total, y-axis with `max / mid / 0` compact labels + faint gridlines, weekly date labels (1/8/15/22/29).
- Tapping a bar selects that day — the calendar highlight and the day card below update accordingly.
- Today's bar and the selected bar are visually distinct from default bars.
- Income-only / no-spend-only / future days render as baseline (no misleading bar).
- Empty month renders a quiet empty axis (no crash, no divide-by-zero).
- `MonthPresenceRow` is removed; no dead references remain.
- Typecheck clean; new pure-helper unit tests pass; full suite stays green.
