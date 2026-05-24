# Stats Screen Evolution — Design Spec

**Date:** 2026-05-22
**Status:** Approved
**Branch target:** apps-in-toss-clean

---

## Goal

Pull the Stats screen further away from "finance dashboard" energy and toward "soft trace of presence." The `결산` (settlement) section dissolves into three quiet observation lines, the bar-chart trend graph becomes a single-row presence-dot trace, calendar amounts recede visually, and a new single rotating observation line surfaces lifestyle patterns that the room-presence system already detects. No new monetary metrics, no progress framing, no achievement language.

## Philosophy

- Stats is a place to look back, not a dashboard to evaluate.
- Sobagi notices texture (cafe / night / calm) before cadence (streak count).
- "Numbers" are present when they help orient — they never lead.
- A single observation line beats stacked tag chips: one quiet noticing, not a tag panel.
- The presence-dot row is a soft trace of the month, not a precise chart.

## Section 1 — Architecture & data

### New files

- `src/services/statsObservationService.ts` — pure `selectStatsObservation(expenses, streak, today)` that returns ONE observation string from a 7-branch priority chain. No React, no SDK, no storage. Composes existing detectors from `roomPresenceService` and `atmosphereService`.
- `src/components/stats/MonthPresenceRow.tsx` — presence-dot row component, replaces the `MonthTrendGraph` block previously inlined in `stats.tsx`.
- `__tests__/statsObservationService.test.ts` — one test per priority branch.

### Modified files

- `src/pages/stats.tsx`:
  - Delete the in-file `MonthTrendGraph` sub-component and its `trendStyles` block plus the `TREND_BAR_MAX` / `Y_AXIS_W` / `TREND_LABEL_DAYS` constants.
  - Render `<MonthPresenceRow />` where the trend graph was.
  - Rewrite the settlement section: remove the `결산` title, the two large monetary totals, and the standalone streak row. Insert presence-cadence lines (with empty-state branches), keep a reworded top-scene chip, and add the single observation line from `selectStatsObservation`.
  - Soften the `dayAmount` color on calendar cells (single property change — see Section 4).
  - Compute `weekVisitDays` and `monthVisitDays` (distinct local-date days with any record in the relevant window).

### Priority chain inside `selectStatsObservation`

```
1. cafe pattern detected     → "요즘 카페에 자주 들렀네요 ☕"
2. night pattern detected    → "밤에도 종종 기록했네요 🌙"
3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
4. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
5. streak >= 3               → "꾸준히 들르고 있어요 🌿"
6. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
7. default                   → "가끔씩 들러도 괜찮아요 🌿"
```

Lifestyle observations (cafe / night / calm) win over consistency signals (streak). The streak branches still exist but only fire when no texture pattern matches.

### Pattern detectors

The service consumes existing pure detectors — does not duplicate detection logic:

- **Cafe pattern:** `hasCategoryPattern(expenses, ['cafe'], { minCount: 3, minDistinctDays: 3, windowDays: 14 })` — recurrence-gated, 3 records across 3 distinct days within 14 days.
- **Night pattern:** `hasNightPattern(expenses, { startHour: 19, endHour: 4, minCount: 3, minDistinctNights: 3, windowDays: 14 })` — already documented globally as `NIGHT_TRIGGER` (19–04).
- **Calm-day count:** `computeCalmDayCount(expenses, today)` from `atmosphereService`. Threshold for surfacing as observation: `>= 4` within the existing 14-day window.

If any of these signatures need adjustment for stats-screen use (e.g., a different window), the detector stays untouched and `selectStatsObservation` wraps the call with the appropriate parameters.

### Absorbed surfaces

The previous standalone streak text (`'요즘 자주 들르고 있네요 🌿'` / `'오늘도 잠깐 들렀네요 🍃'` / `'가끔씩 들러도 괜찮아요 🌿'`) is **absorbed into the priority chain**. There are no two competing observation surfaces — only one.

## Section 2 — Observation block (replaces `결산` section)

### Title

None. The block opens directly into observation lines. No replacement heading is introduced where `결산` was.

### Layout

Three groups, top-to-bottom, with ~12px vertical spacing. No background card, no border.

**Group 1 — Presence cadence (1–2 lines):**

Logic:

```ts
function buildCadenceLines(weekVisitDays: number, monthVisitDays: number): string[] {
  if (monthVisitDays === 0) {
    return ['이번 달은 아직 비어있어요 🌿'];  // single line, observation block collapses
  }
  if (weekVisitDays === 0) {
    return [
      '이번 주는 아직 비어있어요 🌿',
      `이번 달은 ${monthVisitDays}일 다녀갔어요`,
    ];
  }
  return [
    `이번 주엔 ${weekVisitDays}번 들렀어요`,
    `이번 달은 ${monthVisitDays}일 다녀갔어요`,
  ];
}
```

- `weekVisitDays`: distinct local-date days with ANY record (spending OR no-spend) in the current week (Sun–Sat, matching the calendar's DOW row order).
- `monthVisitDays`: same count for the current calendar month.
- Numbers inline within the sentence — not separately bolded. Font ~14–15px, color `COLORS.text`, regular weight.

**Group 2 — Top-scene chip:**

The chip stays in shape (reuses `settlementChip` styling). Copy changes from `이번 달은 [카페] · 가장 자주 기록했어요` to:

```
[카페] · 가장 자주 기록한 장면
```

Only renders when at least one spending record exists in the current month. The category-counting logic (`for-loop excluding no_spend`) stays unchanged.

**Group 3 — Single observation line:**

```
{selectStatsObservation(expenses, streak, today)}
```

Rendered with the same muted-text styling the current standalone streak line uses (~13px, `COLORS.textMuted`, no card chrome).

### Empty-month behavior

When `monthVisitDays === 0`, only Group 1 renders — and it's the single-line variant. Top-scene chip hides (no top category), single observation line hides (avoids noise on a blank month).

### Visual sketch

Full block, month with records:
```
─────────────────────────
이번 주엔 4번 들렀어요
이번 달은 12일 다녀갔어요

[ 카페 · 가장 자주 기록한 장면 ]

요즘 카페에 자주 들렀네요 ☕
─────────────────────────
```

Empty week, populated month:
```
─────────────────────────
이번 주는 아직 비어있어요 🌿
이번 달은 3일 다녀갔어요

[ 카페 · 가장 자주 기록한 장면 ]

가끔씩 들러도 괜찮아요 🌿
─────────────────────────
```

Empty month:
```
─────────────────────────
이번 달은 아직 비어있어요 🌿
─────────────────────────
```

## Section 3 — Presence dots (replaces `이달의 흐름` bar chart)

### Component shape

```tsx
interface MonthPresenceRowProps {
  viewYear: number;
  viewMonth: number;
  daysInMonth: number;
  expensesByDate: Record<string, { total: number; count: number }>;
  todayStr: string;
}
```

Returns a single short row of glyphs, one per day. No y-axis, no bars, no card chrome around the row beyond minimal vertical padding.

### Glyph table

| Day state | Glyph | Color |
|---|---|---|
| No record | `·` (middle dot, U+00B7) | `COLORS.textLight` |
| No-spend record (only) | `🌿` | (emoji) |
| Any spending record | `●` (filled circle) | `COLORS.textMuted` |
| Today, no record yet (current month view only) | `○` (hollow circle) | `COLORS.text` |
| Future day | `·` | low-opacity `COLORS.textLight` |

When `data.total > 0` the day is a spending day → `●`. When `data` exists but `total === 0` it's a no-spend-only day → `🌿`. Mixed days (spending + no-spend) resolve via `total > 0` → `●` (the spending dominates the glyph since spending exists).

### Day-number labels

Above the glyph row, render numeric labels at days **1 / 10 / 20 / 30** (when these exist in the month). The presence row reads as a soft trace, not a precise chart — sparser labels suit that. Labels use `COLORS.textMuted`, ~11px, `fontWeight: '500'`.

For months with 28/29/30 days, the `30` label simply omits if the month has fewer than 30 days. No label shifts to compensate — the row reads cleanly with the 1/10/20 labels alone.

### Layout sketch

```
1            10           20           30
●  ·  ●  ·  ·  🌿 ●  ·  ●  ·  ·  ●  ·  🌿  ●  ·  ·  ●  ·  ·  ·  ●  ●  ·  🌿 ·  ·  ●  ·  ●
```

- 28–31 glyph cells laid out with `flexDirection: 'row'`, each cell `flex: 1` so width distributes evenly.
- Single-row block, ~32px tall total (label row + glyph row).
- No title, no card border. Vertical separation from the observation block above comes from the existing `settlementSection`'s margin.

### Today indicator

When viewing the current month and today has no record yet, today's cell renders `○`. As soon as today gets a record (spending OR no-spend), it switches to `●` / `🌿` like any other day. This is the only "look at me" treatment in the row — and it stays subtle.

### No interactivity

Glyphs are non-tappable. The backlog item *"Trend graph bars tappable — tap a bar to select that day in calendar"* stays deferred. The dots may become tappable in a later landing; this spec keeps them pure-display.

## Section 4 — Calendar density + copy

### Calendar amount text

The current `dayAmount` style is `{ fontSize: 9, color: COLORS.oliveGreen, marginTop: 1, height: 12, lineHeight: 12 }` and `dayAmountSelected: { color: 'rgba(255,255,255,0.85)' }`. Size and weight are already restrained — the loudness comes from `oliveGreen`, which is the brand selection color and reads as "this number matters."

The softening is a single property change:

| Property | Current | New |
|---|---|---|
| `dayAmount.color` | `COLORS.oliveGreen` | `COLORS.textMuted` |

`fontSize`, `marginTop`, `height`, `lineHeight`, and `dayAmountSelected.color` remain unchanged. The amount stays readable as an at-a-glance reference, but the date number reads first when scanning the calendar. `🌿` on no-spend days stays at the same size and renders normally.

### Copy nudges

| Surface | Current | New |
|---|---|---|
| Top-scene chip | `이번 달은 [카페] · 가장 자주 기록했어요` | `[카페] · 가장 자주 기록한 장면` |
| Pattern observation | three-tier streak text | 7-branch chain from Section 1 |

Header (`소소한 기록` / `이번 달을 조용히 돌아봐요`) — unchanged.

## File-level scope

### Create

- `src/services/statsObservationService.ts`
- `src/components/stats/MonthPresenceRow.tsx`
- `__tests__/statsObservationService.test.ts` (7 tests, one per priority branch)

### Modify

- `src/pages/stats.tsx`:
  - Delete the in-file `MonthTrendGraph` component and its `trendStyles` block
  - Delete the `TREND_BAR_MAX`, `Y_AXIS_W`, `TREND_LABEL_DAYS` constants
  - Render `<MonthPresenceRow />` in the same slot
  - Rewrite the `settlementSection` block: remove the `결산` title, the two `settlementRow` totals + `settlementDivider`, the standalone `streakRow`. Insert presence-cadence text lines, keep the top-scene chip with reworded copy, add the single observation line.
  - Delete now-orphan `weeklyTotal` and `monthlyTotal` `useMemo` blocks (they were the only consumers of the deleted totals). `topCategoryThisMonth` stays (the chip still uses it).
  - Delete unused styles: `settlementTitle`, `settlementRow`, `settlementLabel`, `settlementValue`, `settlementDivider`, `streakRow`. The `settlementSection` and `settlementChip` / `settlementChipText` styles stay — they wrap the new observation block.
  - Compute `weekVisitDays` and `monthVisitDays`
  - Update the `dayAmount.color` as in Section 4

### Unchanged

- Calendar grid logic, month nav, month picker (already shipped 2026-05-22)
- Selected-day expense list, photocard entry button, edit sheet, edit/delete handlers
- `expensesByDate` memo, `selectedExpenses` / `selectedSpendingExpenses` memos
- `useExpenseStore` / `useUserStore` selectors
- Bag / mailbox / record / reaction screens
- Room-presence pattern detectors themselves (consumed read-only)
- All storage keys, all `Expense` / `UserState` types
- Header copy

## Anti-patterns (out of scope)

This pass must NOT introduce:

- A new monetary metric of any kind (average daily spend, week-over-week delta, year-over-year, projected spend)
- A category-spending pie / donut / bar breakdown
- Achievement / milestone celebration on Stats
- Y-axis, tooltips, or tappable interaction on the presence row
- A replacement bold heading where `결산` was
- Multiple stacked observation lines — exactly one observation at a time
- Per-pattern chip rows ("카페 자주", "차분한 날", "밤에도") — explicitly rejected in brainstorming
- Analytics on which observation fired
- "You spent N% more than last week" framing or any comparative monetary language

## Success criteria

- `결산` title and the two bold monetary totals are gone from the screen.
- The block flows as: presence cadence (1 or 2 lines) → top-scene chip → single observation line. No section title above.
- When `monthVisitDays === 0`, only the single line `이번 달은 아직 비어있어요 🌿` renders. Chip and observation hide.
- When `weekVisitDays === 0` but `monthVisitDays > 0`, two lines: `이번 주는 아직 비어있어요 🌿` then `이번 달은 N일 다녀갔어요`.
- The pattern observation always picks the strongest texture pattern first (cafe / night / calm) before falling back to streak tiers.
- The bar trend graph is gone. A single short dot row shows the month's presence; labels appear only at days 1 / 10 / 20 / 30.
- Calendar cells still show amounts on spending days, but those amounts visually recede — the date number reads first.
- The standalone streak line is removed from the screen.
- Selected-day expense list and photocard entry behavior unchanged.
- Edit sheet (tap a record to edit) unchanged.
- Calendar selection, month nav, month picker unchanged.
- Typecheck stays clean; new `statsObservationService` tests pass; full Jest suite stays green.
