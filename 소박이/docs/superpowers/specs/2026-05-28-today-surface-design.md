# Home `TodaySurface` — "Today Quietly Exists Here" — Design

**Date:** 2026-05-28
**Status:** Approved (design); ready for implementation plan.

## Goal

Add a small, soft, semi-transparent **today overlay** to the upper-right of the home screen
so first entry feels gently oriented toward today and its records — *"today has already
started gathering here"* — without dashboard, CTA, or finance-dashboard energy.

## What this is — and what it is NOT

This **IS** a quiet overlay that acknowledges today exists in the room.

This is **NOT** a daily mission, KPI panel, productivity widget, or finance dashboard. No
badges, no progress bars, no checkmarks, no bright CTA colors, no bordered card.

## Decisions (resolved during brainstorming)

- **Coexists with `DailySummary`.** The user chose to keep the bottom DailySummary; the
  upper-right surface must visually feel *distinctly softer* than DailySummary so they
  don't read as the same widget twice. Differentiation is purely visual (overlay vs. card)
  and tonal (the upper-right floats; DailySummary sits in a cream panel).
- **4-line content per the brief:** date, "오늘의 기록" label, amount, count.
- **Tap → `/record`.** Action-oriented: today's state shown; tap invites you to add to it.
- **Empty state — date + label only.** Surface always renders on home; amount and count
  lines drop out gracefully.

## Placement

Position absolute, **`top: 48`, `right: 16`** — mirrors the level card (`top: 48`,
`left: 16`). Text right-aligned within the container.

Spatial reasoning: on a ~350px wide screen the level card occupies ~180px on the left
(minWidth 160 + paddingHorizontal 14); the today surface gets the remaining ~170px on
the right — plenty for four short lines. No collision with:

- the centered character/bubble (mid-screen, vertically below),
- the utility stack at `top: 118, left: 16` (different column),
- the floor discoverable at `top: ~62%, right: 10%` (well below).

## Visual treatment — "handwritten on the room glass"

**No card, no border, no background.** Just text floating on the painted room, with a
soft drop shadow so it survives all four time-of-day backgrounds (morning / afternoon /
evening / latenight). Cream tone (warmWhite-family) at varied opacity per line; the date
is faintest, the amount the most visible, but none reaches full opacity. No bright color,
no bold weight, right-aligned.

```
                                     5월 26일
                                    오늘의 기록
                                       12,400원
                                       2개의 기록
```

Style values:

```ts
todaySurface: { position: 'absolute', top: 48, right: 16, alignItems: 'flex-end' }
todayDate:    { fontSize: 11, color: 'rgba(255,253,248,0.72)', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginBottom: 1 }
todayLabel:   { fontSize: 13, color: 'rgba(255,253,248,0.85)', textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginBottom: 2 }
todayAmount:  { fontSize: 15, fontWeight: '500', color: 'rgba(255,253,248,0.92)', textShadowColor: 'rgba(0,0,0,0.30)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, marginBottom: 1 }
todayCount:   { fontSize: 11, color: 'rgba(255,253,248,0.72)', textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }
```

Press feedback: a brief opacity dip on the container (≈0.6 while pressed). No background
color change, no scale animation, no border highlight. Discoverable, not button-like.

## Line rules — quiet about zero

The surface always renders on home; lines drop out gracefully:

| State                                                    | Lines shown                        |
|----------------------------------------------------------|------------------------------------|
| 0 records today                                          | date + label                       |
| Records but no spending (income / no-spend records only) | date + label + count               |
| At least one spending record                             | date + label + amount + count      |

The amount line follows **DailySummary's exact rule** (`spendingCount > 0`) so the two
surfaces stay consistent — no `0원` ever displayed on either.

`spendingCount` continues to mean: records where `kind !== 'income'` AND
`category !== 'no_spend'` (same derivation as today on home, no new logic).

`recordCount` is the full `todayExpenses.length` — includes income and no-spend records,
so the count says "you left N marks on today" regardless of kind.

## Interaction

Wrap the entire surface in a `Pressable`. `onPress` calls
`navigation.navigate('/record')`. No long-press, no swipe.

`/record` already exists (the quick-record entry screen). No new params, no new routes.

## Component shape

`src/components/home/TodaySurface.tsx` — pure presentational:

```ts
interface TodaySurfaceProps {
  todayDate: Date;
  totalAmount: number;
  recordCount: number;
  spendingCount: number;
  onPress: () => void;
}
```

Mirrors `DailySummary`'s prop shape. Holds no state of its own. The component decides
which lines to render based on the props (per the line-rules table).

## Date helper

`src/utils/date.ts` — add a tiny pure helper:

```ts
export function formatKoreanMonthDay(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
```

Trivially testable: mid-month, day 1, day 31, month boundary.

## Wiring in `index.tsx`

Inside `RoomBackground`, alongside the existing `header` / `characterArea` / `utilityStack`
blocks, render:

```tsx
<TodaySurface
  todayDate={new Date()}
  totalAmount={todayTotal}
  recordCount={todayExpenses.length}
  spendingCount={todaySpendingRecords.length}
  onPress={() => navigation.navigate('/record')}
/>
```

All four values are **already derived in `HomeScreen`** — no new state, no new memo, no
new selector. The home screen needs to import `useNavigation` from `@granite-js/react-native`
(already used by `record.tsx` and `BottomTabs`) so it can pass the navigate callback.

## Files touched

- **Create:** `src/components/home/TodaySurface.tsx`.
- **Modify:** `src/utils/date.ts` — append `formatKoreanMonthDay`.
- **Modify:** `src/pages/index.tsx` — import `useNavigation` + `TodaySurface`, render the
  surface inside `RoomBackground`. **No new state, no new memo.**

## Testing

- `__tests__/expenseLocalDate.test.ts` (or wherever the date util tests live) — add a
  small `describe('formatKoreanMonthDay')` block:
  - mid-month → `"5월 26일"`
  - day 1 → `"5월 1일"`
  - last day of a 31-day month → e.g. `"7월 31일"`
  - January → `"1월 …"`
- `TodaySurface` itself is presentational; no unit test beyond the helper. Behavior is
  verified by `npx tsc --noEmit` exit 0, the full Jest suite staying green, and on-device
  eyeballing.

## Philosophy check

- **No finance vocab.** "오늘의 기록" / "N개의 기록" — never "지출" / "소비".
- **No income TRACKING.** Income records contribute to `recordCount` (they're observational
  marks), but no income amount is surfaced. The amount line is spending-only via
  `spendingCount > 0`, identical to DailySummary. Consistent with [[feedback_sobagi_allowance_giving_scene]].
- **No CTA color, no badge, no progress, no checkmark.** ✓
- **No bordered card** — soft drop shadow only. ✓
- **Room stays primary.** Cream low-opacity text on the painted room; no opaque background.
- **Sobagi stays the emotional center.** Surface lives in the upper-right corner, opposite
  Sobagi (centered). No competition for attention.
- **Doesn't pull from discoveries/letters.** Discoverable arrives at `right: ~10%, top: 62%`;
  the today surface is way above (`top: 48`) and out of its way. The mailbox / bag utility
  icons stay on the left. Letters/discoveries remain the affective focal points.

## Explicitly NOT doing

- No new storage. No new state in `HomeScreen`. No new memo or selector.
- No replacement of `DailySummary` (deliberately kept).
- No 지출 / 소비 wording, no income amount surfaced, no streak / level / progress info.
- No animation (no fade-in on first render, no breathing). It's an overlay, not an arrival.
- No tooltip / no long-press menu / no per-record drill-down from this surface.
- No re-targeting tap to `/stats` or `/history` (decision: `/record`).
