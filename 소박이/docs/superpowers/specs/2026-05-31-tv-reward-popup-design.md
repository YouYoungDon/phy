# TV Reward Popup (Daily Limit 3) — Design

**Date:** 2026-05-31
**Branch:** apps-in-toss-clean (or feature/tv-reward-popup if user prefers)
**Tone exception:** This design knowingly relaxes the locked "no
counts/badges-with-numbers" rule for this surface only (see [memory:
feedback_sobagi_categories_life_scenes]). Justification: the user explicitly
wrote guardrails distinguishing acceptable reward communication
("Explicitly use the word 리워드", "Make daily limit clear") from
disallowed game language ("보상 획득!", celebration animations, streaks,
progress bars, urgency). This is a scoped exception, comparable to the
🪙 투자수익 category exception.

## Goal

When the user taps the TV on the home screen, show a calm reward popup
before starting the ad. Make the reward clear, make the daily limit
clear, avoid surprise ad playback, keep the tone aligned with Sobagi.

## Source brief

The user provided a complete, well-formed brief on 2026-05-31. This spec
captures it verbatim plus implementation decisions made during scoping
review. The full brief is preserved at the bottom of this file for
traceability.

## Daily rules

- Maximum **3** rewarded ad views per day (was 2).
- Count increases only after a successfully completed ad
  (`userEarnedReward` SDK event — the existing trust boundary).
- Ad failures or interruptions do not increment count.
- Resets automatically on the next calendar day via the existing
  `getEffectiveRestsToday` daily-reset-aware helper (`lastRestDate`
  comparison with local date) — no new reset mechanism added.

## Reward magnitude

- **One pebble per completed watch.** `computePebbleDelta()` becomes
  the fixed constant `1`, matching the popup copy "조약돌 1개" exactly.
- `PEBBLE_MIN` / `PEBBLE_MAX` constants are removed (no longer
  meaningful) along with the random-range test.
- `REST_LETTERS` thresholds (30 / 100 / 250 / 500 / 1000) stay
  unchanged. Delivery rate slows in absolute time — `rest1` (30) is now
  ~10 days of full-cap rest watching; `rest5` (1000) is roughly a
  year. The rates are deliberately slower; rebalance is out of scope
  (user can revisit later if the cadence feels wrong).

## Popup states

The TV tap resolves to one of three popup states based on this
decision tree:

```
                      ┌─ effectiveRestsToday >= REST_DAILY_CAP (3) ?
                      │
                      ├─ YES → show "Daily limit reached" popup
                      │        (always, even if suppressed)
                      │
                      └─ NO  → suppressedForToday?
                              │
                              ├─ YES → silent no-op (TV stays visible)
                              │
                              └─ NO  → show "Reward" popup
```

The existing `adState.status === 'unsupported' | 'error'` short-circuit
bubble messages stay as-is. They run BEFORE the suppress check —
infrastructure feedback always wins over user preference (otherwise a
user who checked the box wouldn't know the ad system is down).

### State 1: Reward popup (0/3, 1/3, 2/3, not suppressed)

```
잠시 쉬어갈까요?

광고를 보고 리워드를 받을 수 있어요.

리워드
조약돌 1개

오늘 본 횟수 1/3      ← shows current effectiveRestsToday/3

[ 광고 보고 리워드 받기 ]    ← primary, disabled until adState.status === 'ready'
[ 괜찮아요 ]                  ← secondary, closes sheet

☑ 오늘 하루 더 이상 보지 않기  ← checkbox
```

**Checkbox semantics:**
- Local state within the popup component.
- Persists only when the user presses either button (primary or
  secondary). Closing the sheet without pressing a button does NOT
  persist the checkbox state — closing is treated as "neither agree
  nor disagree."
- When persisted: `SUPPRESS_REST_POPUP_DATE` = today's local date string.
- Confirmed by the user.

**Primary button behavior:**
- Same as today: closeSheet → adState.show → on `userEarnedReward` →
  grantRest → quiet bubble "소박이가 한 숨 돌렸어요 🌿" (unchanged).
- If checkbox was checked, the suppress flag is also persisted just
  before the ad shows.

### State 2: Daily limit reached (3/3)

```
오늘은 받을 수 있는 리워드를 모두 받았어요 🌿

내일 다시 찾아와 주세요.

[ 닫기 ]
```

Replaces the current "오늘은 충분히 쉬었어요 🌿" inline bubble with a
dedicated popup. This is informational and overrides the suppress
flag — when the user has hit the cap, they should see WHY tapping the
TV does nothing, not be left guessing.

### State 3: Suppressed today (silent no-op)

When `effectiveRestsToday < REST_DAILY_CAP` AND the suppress flag is
set to today, tapping the TV does **nothing visible** — no popup, no
bubble. TV remains visually unchanged. This honors the user's explicit
"오늘 하루 더 이상 보지 않기" choice without nagging them.

Rationale for silent rather than a bubble: a bubble would say
"안 보기로 했어요" or similar, which still notifies the user every tap
— defeats the suppress intent. The user can still get to the popup
the next calendar day.

## Storage

New key in `STORAGE_KEYS`:

- `SUPPRESS_REST_POPUP_DATE: 'sobagi-suppress-rest-popup-date'`
  - Value type: `string | null` (date string in `YYYY-MM-DD` local
    format, or `null` if never suppressed).
  - Reset semantics: never explicitly reset; daily expiry comes from
    the comparison `suppressDate === todayStr`. A stale date is treated
    as not suppressed.

No `UserState` field added. Following the same separation used for
`LAST_REST_DATE` / `LAST_REST_AT` (separate keys, not in the USER blob),
which keeps the suppress flag local to the rest subsystem and avoids
USER blob migrations.

## Constants and helpers (restService.ts)

```ts
export const REST_DAILY_CAP = 3;          // was 2
export const PEBBLE_PER_REST = 1;         // new — replaces computePebbleDelta range

// computePebbleDelta returns 1 unconditionally
export function computePebbleDelta(): number {
  return PEBBLE_PER_REST;
}

// New: pure helper mirroring getEffectiveRestsToday's daily-reset shape.
export function isSuppressedForToday(
  suppressDate: string | null,
  todayStr: string,
): boolean {
  return suppressDate !== null && suppressDate === todayStr;
}
```

PEBBLE_MIN / PEBBLE_MAX are removed. The corresponding test that
asserts `computePebbleDelta` is in `[5,20]` is replaced with one that
asserts it equals 1.

`grantRest()` body is unchanged — it already uses `computePebbleDelta()`,
so reward-shape changes are confined to one function.

## Component

**Replace** the current [RestPrompt.tsx](../../../src/components/room/RestPrompt.tsx)
with a new component file that handles all three states internally.
Keep the same import path so [index.tsx:24](../../../src/pages/index.tsx#L24)
doesn't need to change.

Component signature:

```ts
interface RestPromptProps {
  state: 'reward' | 'daily-limit-reached';   // state 3 is handled by NOT rendering the sheet
  adStatus: RestAdStatus;
  watchesToday: number;                       // effectiveRestsToday, for X/3 display
  dailyCap: number;                           // REST_DAILY_CAP, for X/Y display
  onConfirm: (suppressToday: boolean) => void; // suppressToday from checkbox
  onCancel: (suppressToday: boolean) => void;
  onDismiss: () => void;                       // daily-limit-reached '닫기'
}
```

The home screen owns the decision of WHICH state to render — the
component just renders it. This keeps storage logic out of the
component (testable separately from RN).

## Wiring in `pages/index.tsx`

Replace the existing TV `onPress` body (lines 397-422):

```ts
onPress={() => {
  // Infrastructure short-circuits run first — user should always know
  // if the ad system can't serve, even if they suppressed for today.
  if (adState.status === 'unsupported') {
    showBubble('아직 준비 중이에요 🌿'); return;
  }
  if (adState.status === 'error') {
    showBubble('지금은 조용한 채널이 없어요 🌿'); return;
  }

  // Daily cap takes precedence over the suppress flag (informational).
  if (effectiveRestsToday >= REST_DAILY_CAP) {
    setRestSheetState('daily-limit-reached');
    openSheet('rest');
    return;
  }

  // Suppressed today → silent no-op.
  if (isSuppressedForToday(suppressRestPopupDate, todayStr)) {
    return;
  }

  setRestSheetState('reward');
  openSheet('rest');
}}
```

`suppressRestPopupDate` and `restSheetState` are new local states in
the page. `suppressRestPopupDate` is hydrated from `SUPPRESS_REST_POPUP_DATE`
on init via the same pattern existing rest fields use in `useAppInit`.

## Tests

### Unit (restService.test.ts updates)

- Replace "computePebbleDelta returns 5–20" → `computePebbleDelta returns 1`.
- Remove `PEBBLE_MIN`/`PEBBLE_MAX` export assertions.
- Update `REST_DAILY_CAP` test: 2 → 3.
- Update `canRest` boundary tests: cap is now 3, so rests=2 should
  still allow rest; rests=3 should block.
- Update `grantRest` 5-20 range test → exact +1 assertion.
- Update the rest1 letter-crossing test: starting pebbleCount must
  be 29 (was 25), since delta is now fixed 1 and we want to cross 30.

### Unit (new — isSuppressedForToday)

- `null` suppressDate → false
- stale suppressDate → false
- matching suppressDate → true

### Integration (kept out of scope for this spec)

The RN component render tests are not part of this spec — the existing
codebase doesn't snapshot or render-test RestPrompt and the brief
doesn't require it. Manual smoke verification at 0/3, 1/3, 2/3, 3/3,
and the suppress checkbox covers the brief's "verification" list.

## Verification (from brief)

- 0/3 → reward popup shows, primary button enabled when adState ready
- 1/3 → reward popup shows, "오늘 본 횟수 1/3"
- 2/3 → reward popup shows, "오늘 본 횟수 2/3"
- 3/3 → daily-limit-reached popup shows; no reward popup
- Checkbox checked + primary or secondary pressed → next tap same day
  is silent (no popup, no bubble)
- Next calendar day → suppress flag stale → reward popup shows again,
  count resets to 0/3
- `npx tsc --noEmit` clean
- `npx jest` green (existing 433 tests stay green; restService.test.ts
  updates land in the same commit as the source change)

## Out of scope (deliberate)

- Rebalancing REST_LETTERS thresholds — see "Reward magnitude" above.
- Surface count anywhere else (homescreen badge, jar, etc.). The brief
  said "Show progress consistently wherever the TV reward flow appears"
  — the TV reward flow appears in exactly one place (the popup), so
  that requirement is satisfied by the popup itself.
- Storing suppress flag inside the USER blob.
- Animation polish, custom checkbox visuals — use a simple Pressable +
  ☑/☐ glyph swap, matching the existing low-chrome aesthetic.
- Ad-watch retry / fallback flows beyond the existing `error` /
  `unsupported` bubble.

## Brief (verbatim, for traceability)

> TV Reward Popup (Daily Limit 3)
>
> Goal:
> When the user taps the TV on the home screen, show a calm reward
> popup before starting the ad.
>
> Purpose:
> - Make the reward clear
> - Make the daily limit clear
> - Avoid surprise ad playback
> - Keep the tone aligned with Sobagi
>
> [… full brief content reproduced in the conversation message
> dated 2026-05-31; see git log for the message thread that
> produced this spec.]

## Risk

Low. Reward magnitude change (5–20 → 1) is the largest mechanical
shift but it doesn't break any user-facing surface — pebble count
isn't displayed. Rest letter thresholds get slower; documented as
deliberate.

The popup behavior change is additive and well-bounded — the existing
TV → grantRest pipeline (`userEarnedReward` is the only writer of rest
state) stays intact.
