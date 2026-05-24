# Sobagi — Income System Integration (Sub-spec C)

**Date:** 2026-05-24
**Status:** Draft — awaiting review
**Parent:** `docs/superpowers/specs/2026-05-23-income-record-data-model-design.md`
**Predecessors:**
- Sub-spec A landed 2026-05-23 (`a4f4287`) — income data model, kind toggle, stats split, hardcoded `sobagiEmotion = 'happy'` for income
- Sub-spec B landed 2026-05-24 (`13b3691`) — photocard 3-way layout, `todayHasSpending` gate on reaction handoff
**Successor:** none planned — sub-spec C closes the "income records" decomposition

---

## Section 1 — Why integrate

Sub-spec A introduced income records as a data shape; sub-spec B made the photocard handle them quietly. The remaining work is the **emotional/system layer**: emotion engine, dialogue, presence signals, ambient detectors, and lightweight observation copy.

The risk this spec defends against: as soon as income flows through Sobagi's emotional surfaces, the app starts behaving like a finance tracker (celebration on save, points/pebbles for incoming money, comparative dashboards) unless every touchpoint is explicitly tuned to read as **quiet presence**, not progression.

**Tone target for income records — all surfaces:**
- relief · warmth · calm support · "something came into the day"
- **never** winning · grinding · earning points · celebration · success · achievement · level-up

Sub-spec C is not a feature expansion. It is the work that makes income records *fail gracefully* against Sobagi's anti-finance posture.

---

## Section 2 — Decisions (resolved before drafting)

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Income emotion strategy | **Income subroutine over existing 5-emotion palette — 2-rule chain (late-night → 'sleepy', otherwise → 'happy')** | Avoids adding a new emotion (asset + pool surface). Income tone primarily lives in the dialogue branch; emotion is a quiet differentiator only on the universally observational late-night context. First-of-day **not** mapped to 'surprised' — the 'surprised' pool ("오늘 처음 들렀네요 ✨") reads as event/reward, contradicting "something warm entered the day" |
| D2 | Does amount drive income emotion? | **No** | Amount-magnitude branching (e.g., big salary → 'soft-sad') would read as finance commentary. Income emotion is context-driven (time only) — explicitly not first-of-day, not streak, not amount |
| D3 | Dialogue architecture | **Kind-gated sibling pool** (`INCOME_REACTION_POOLS`) parallel to `REACTION_POOLS` | Keeps spending pools untouched; income pool is selected via `kind === 'income'` branch in `selectReactionMessage` |
| D4 | Pebble grant on income save | **No** | Pebbles are the rest-TV reward currency. Granting them on income would teach "incoming money → progression fuel" — exactly the gameification drift `feedback_sobagi_decoupled_signals.md` warns against |
| D5 | MonthPresenceRow glyph for income-only days | **Same as spending (●)** | Income-only days read as "something was here" without categorization. Differentiating glyphs invites scanning the row as a categorized log — the opposite of the soft-trace intent |
| D6 | Found-item trigger / room-presence inclusion | **Income excluded** from spending-keyed triggers; included in activity-shape triggers | Most lifestyle detectors are spending-oriented by design (cafe pattern, night pattern, calm-day). T1 (first-record-after-gap) and T2 (first-of-month) fire on any record including income — they read "presence after gap", not "spending after gap" |
| D7 | `selectStatsObservation` income branch | **Add one quiet branch** at a specific recurrence threshold | Income observations stay observational ("들어온 일이 종종 있었어요 🍃"), never financial. Inserted below lifestyle texture, above streak fallback |
| D8 | Income `memoSuggestions` | **Deferred** to a follow-up sweep | Optional polish, no blocker. Income picker today shows no suggestions; behavior parity is acceptable |
| D9 | Allowance memory update | **Narrowed scope, not collapsed** | `feedback_sobagi_allowance_giving_scene.md` keeps `allowance` (용돈, giving) locked, while `received_allowance` (용돈 받음, incoming) is now a separate token with its own framing |

---

## Section 3 — Emotion engine (income subroutine)

### Current state

`src/services/emotionEngine.ts` evaluates **only spending-shaped expenses**: a 5-rule priority chain tuned for amount magnitude and time. The income path bypasses it: `record.tsx` hardcodes `sobagiEmotion = 'happy'` when `derivedKind === 'income'`. `recordNoSpend` also hardcodes `'happy'`.

### Target shape

```ts
export function evaluate(expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (expense.kind === 'income') {
    return evaluateIncome(expense, ctx);
  }
  // Existing spending chain unchanged.
  if (ctx.isFirstRecordToday) return 'surprised';
  if (ctx.currentStreak >= 3) return 'excited';
  if (ctx.currentHour >= 22) return 'sleepy';
  if (expense.amount >= 50000) return 'soft-sad';
  if (expense.amount < 5000) return 'happy';
  return 'happy';
}

function evaluateIncome(_expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (ctx.currentHour >= 22) return 'sleepy';   // late-night save, presence-shape only
  return 'happy';                                // default quiet warmth
}
```

The chain is deliberately 2 rules, not 3. `sleepy` is kept because it reads as time-of-day observation ("이 시간에도 기록하다니..." / "늦은 시간에 왔네요 🌙") — a quiet "I saw you here at this hour" cue that pairs naturally with the warm income tone. The visual face change to a sleepy Sobagi on a late-night income save reinforces "late warmth," not "celebration."

**Excluded from income branch:**
- `'surprised'` — keyed on first-of-day; pool ("오늘 처음 들렀네요 ✨", "처음 오셨군요. 반가워요 🌿") is event-flavored. On an income save it would read as "something exciting was won," contradicting the target "something warm entered the day"
- `'excited'` — keyed on streak; reads as energetic / momentum, wrong tone for income
- `'soft-sad'` — keyed on big amount; would brand large salary records with the "그런 날도 있어요" big-amount tone, which is finance commentary

### Caller migration

- `record.tsx`: remove the `derivedKind === 'income' ? 'happy' : evaluate(...)` ternary. Always call `evaluate(expense, ctx)`. The kind branch is now inside the engine.
- `expenseService.recordNoSpend`: continues to set `sobagiEmotion: 'happy'` (no-spend is not income; it remains a spending-shaped daily-presence marker with a fixed emotion).

### Selector test surface

Three explicit unit tests cover the income branch:
1. `kind === 'income'` at hour 23 → `'sleepy'`
2. `kind === 'income'` at hour 14, first-of-day, large amount → `'happy'` (proves first-of-day and amount are not consulted)
3. `kind === 'income'` at hour 9 with `currentStreak === 7` → `'happy'` (proves streak is not consulted)

### What does not change

- `SobagiEmotion` union remains the existing 5 tokens. No new emotion added.
- `EMOTION_MESSAGES` (5-entry map) unchanged. The income-aware copy lives in dialogue, not in this map.
- `VALID_EMOTIONS` unchanged.
- Mood asset resolver (`PhotocardMoodAsset`) unchanged — income still maps onto the existing asset palette through whichever emotion `evaluateIncome` returns.

---

## Section 4 — Dialogue (income-aware reaction pool)

### Current state

`REACTION_POOLS` (`src/constants/dialogue.ts`) is indexed `[tier][emotion]` and tuned for spending records — copy references "기록해뒀어요" with spending-record framing.
`selectReactionMessage(emotion, tier)` picks one line at random.
Observation messages (`OBSERVATION_POOLS`) live separately and are kind-agnostic by design (behavioral texture only).

### Target shape

Add a sibling pool indexed by tier only — income is monolithic in tone, so per-emotion slicing inside the income pool would over-engineer the differentiation:

```ts
export const INCOME_REACTION_POOLS: Record<DialogueTier, [string, string, string]> = {
  1: [
    '조금 든든한 날이네요 🌿',
    '따뜻한 일이 들어왔어요 🍃',
    '오늘은 조금 안심되는 날이에요',
  ],
  2: [
    '들어온 날이 있네요 🌿',
    '오늘은 조금 든든한 하루였어요 🍃',
    '따뜻한 소식이 들어왔어요',
  ],
  3: [
    '들어온 날도 기억해둘게요 🌿',
    '오늘은 조금 든든했을 거예요 🍃',
    '이런 날도 있어요. 다 기억하고 있어요',
  ],
};
```

### Selector signature

```ts
export function selectReactionMessage(
  emotion: SobagiEmotion,
  tier: DialogueTier,
  kind: RecordKind = 'spending',
): string {
  if (kind === 'income') {
    const pool = INCOME_REACTION_POOLS[tier];
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }
  const pool = REACTION_POOLS[tier][emotion];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}
```

**Why kind-gated, not emotion-gated:**
Income emotion (per Section 3) is one of `sleepy | happy`. If we slotted income copy *inside* `REACTION_POOLS[tier][emotion]`, those two buckets would have to absorb both spending and income tone — they'd drift toward generic / kind-blind copy, weakening both surfaces. Kind-gating keeps each pool tonally coherent.

### Caller migration

- `reaction.tsx`: pass `expense.kind` (read from the latest expense) into `selectReactionMessage`.
- All existing call sites that pass only `(emotion, tier)` keep working — `kind` defaults to `'spending'`.

### Tier examples (full set)

**Tier 1 (Day 0–6):**
```
조금 든든한 날이네요 🌿
따뜻한 일이 들어왔어요 🍃
오늘은 조금 안심되는 날이에요
```

**Tier 2 (Day 7–29):**
```
들어온 날이 있네요 🌿
오늘은 조금 든든한 하루였어요 🍃
따뜻한 소식이 들어왔어요
```

**Tier 3 (Day 30+):**
```
들어온 날도 기억해둘게요 🌿
오늘은 조금 든든했을 거예요 🍃
이런 날도 있어요. 다 기억하고 있어요
```

### Blacklist (must NOT appear anywhere in INCOME_REACTION_POOLS or related copy)

- 돈 벌었어요 / 돈이 들어왔어요 / 입금 / 수익 / 수입 / 매출
- 보상 / 리워드 / 축하 / 잘했어요 / 성공
- 잔액 / 통장 / 저축 / 모았어요
- 다음 달도 / 이번 달 목표 (planning/comparison)
- Numeric framing of any kind ("X원 들어왔어요" — banned)

---

## Section 5 — Pebble jar policy on income save

**Decision: income records grant NO pebbles.**

### Why

Pebbles are the rest-TV reward currency. They accumulate from watching rewarded ads (a deliberately low-stakes loop) and trigger threshold-based letter deliveries. If income saves also granted pebbles, two failure modes appear:

1. **Income-as-progression-fuel:** users would notice "save income → jar fills faster," teaching the system that incoming money produces room rewards. This is the explicit anti-pattern in `feedback_sobagi_decoupled_signals.md`.
2. **Signal collision:** pebbles already encode "you took a quiet break." Adding a second source (income) blurs what the jar means, weakening both signals.

### Implementation

- `restService.grantRest` is the **sole writer** of pebble state (per the 쉬어가기 TV spec). It is invoked exclusively from `useRestedAd.show`'s `userEarnedReward` callback.
- `expenseService.saveExpense` does NOT touch pebble state today. We **do not add a code path** that would change that.
- This decision is a non-action: no code touches the pebble service in sub-spec C.

The spec note exists to ensure a future engineer reviewing "should income drop a pebble?" reads this section first and stops.

---

## Section 6 — MonthPresenceRow glyph

**Decision: income-only days render `●`, identical to spending days.**

### Current glyph table (in `MonthPresenceRow.tsx`)

| Condition | Glyph |
|---|---|
| no record | `·` (low-opacity middle dot) |
| no-spend only | `🌿` |
| any spending | `●` |
| today, no record | `○` |

### After sub-spec C

| Condition | Glyph |
|---|---|
| no record | `·` (unchanged) |
| no-spend only | `🌿` (unchanged) |
| **any record with amount > 0 (spending or income)** | `●` |
| today, no record | `○` (unchanged) |

### Why same glyph

- The row is a **soft trace of presence**, not a categorized log. Adding an income-only glyph teaches users to scan the row by kind — that's a finance dashboard pattern.
- The current `glyphFor` already uses `data.total > 0` as the spending discriminator. After sub-spec A, `expensesByDate[date].total` excludes income (sub-spec A QA fix). To pick up income, the row must read a different signal.

### Implementation sketch

Two options exist; the design defers the exact path to implementation:

**Option A — extend `DayCellData`:** add `hasRecord: boolean` to the row's data shape. `stats.tsx` populates it as "any expense exists on this date." Row renders `●` when `hasRecord && total === 0` is false → `●` when there's any record, including income-only.

**Option B — recompute in row:** pass the raw `selectedExpenses`-style data down. Heavier; rejected unless A turns out infeasible.

**Recommended: Option A.** Smallest extension to the existing prop shape, no recomputation in the leaf component.

**Mixed days** (spending + income): unchanged — `total > 0` already triggers `●`.

---

## Section 7 — Room-presence and lifestyle detectors

Income records participate in **presence-shape** triggers but **not lifestyle-pattern** triggers.

### Triggers reviewed

| Trigger | Reads what | Income inclusion? |
|---|---|---|
| **T1 — first record after gap (found-item)** | Any record after ≥3-day absence | **Include** — income counts as "presence after gap" |
| **T2 — first record of month (found-item)** | Any record on day 1 of a month | **Include** — income counts as monthly first |
| **T3 — yesterday was one quiet touchpoint (found-item)** | `yesterdayExpenses.length === 1` (activity-shape, post-decoupling) | **Include in count** — a single income save yesterday still satisfies "one touchpoint" |
| **T4 — small everyday purchase pattern (found-item)** | Spending-shape categories (cafe / home_meal / etc.) | **Exclude** — by category; income tokens aren't in the pool |
| **Cafe pattern (P-path, room-presence + statsObservation)** | `hasCategoryPattern(expenses, 'cafe', ...)` | **Exclude** — category-keyed |
| **Night pattern (L-path, room-presence + statsObservation)** | Records in 19–04 window | **Exclude income from the count** — see below |
| **Calm-day count (atmosphere + statsObservation)** | Daily total < 8,000 KRW, days with no records don't count | **Exclude** — `total` already excludes income post-A; preserve this |
| **Streak** | Days with any record | **Already includes** — streak is `recordedDaysCount`, kind-agnostic |

### Why exclude income from the night pattern

The L-path's emotional payload is "warm lamp item appears because Sobagi noticed you record late at night." If income records (a salary deposit timestamp landing at 02:00, for instance) count toward the night pattern, the trigger fires on financial system events rather than the user's actual late-night presence. Filter the night-pattern input to `kind !== 'income'` for the same reason cafe pattern is category-gated.

### Why include income in T1/T2/T3

These triggers read **shape of presence** (gaps, first-of-month, single-touchpoint quietness), not behavioral categories. An income save after a 5-day absence is just as much "the user came back" as a spending save. Excluding it would mean a user who only records income in a given week never trips a found-item — that punishes a legitimate use shape.

### Implementation surface

- `roomPresenceService.hasNightPattern`: filter input expenses to `kind !== 'income'`. Existing callers (`roomPresenceService.checkForPlacement`, `statsObservationService`) pass the full expense array — the filter lives inside the pattern function.
- `hasCategoryPattern`: no change. Income categories never appear in cafe/etc. category arguments.
- T1/T2/T3 in `foundItemService`: no change. They already read all expenses including income.
- `computeCalmDayCount` (`atmosphereService`): no change. It reads daily totals which already exclude income per sub-spec A.

---

## Section 8 — Stats observation (selectStatsObservation)

**Decision: add ONE quiet income-aware branch to the priority chain.**

### Current chain

```
1. cafe pattern detected     → "요즘 카페에 자주 들렀네요 ☕"
2. night pattern detected    → "밤에도 종종 기록했네요 🌙"
3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
4. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
5. streak >= 3               → "꾸준히 들르고 있어요 🌿"
6. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
7. default                   → "가끔씩 들러도 괜찮아요 🌿"
```

### Target chain

Insert income branch after calm-day, before streak tiers — lifestyle texture still wins, but income presence outranks streak-fallback texture:

```
1. cafe pattern              → "요즘 카페에 자주 들렀네요 ☕"
2. night pattern             → "밤에도 종종 기록했네요 🌙"
3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
4. income-day count >= N     → "들어온 일이 종종 있었어요 🍃"   ← NEW
5. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
6. streak >= 3               → "꾸준히 들르고 있어요 🌿"
7. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
8. default                   → "가끔씩 들러도 괜찮아요 🌿"
```

### Detection rule

```ts
const INCOME_OBSERVATION_THRESHOLD = 2; // 2 income days in last 30 — modest signal
const INCOME_OBSERVATION_WINDOW_DAYS = 30;

function computeIncomeDayCount(expenses: Expense[], today: string): number {
  const cutoff = ... // today - 30 days
  const incomeDays = new Set(
    expenses
      .filter(e => e.kind === 'income')
      .filter(e => getLocalDateString(new Date(e.createdAt)) >= cutoff)
      .map(e => getLocalDateString(new Date(e.createdAt)))
  );
  return incomeDays.size;
}
```

**Threshold rationale:** `>= 2` distinct income days in 30 days is a recurrence signal (not a one-off save). Below 2, fall through to streak. The number is conservative — observational lines should describe a *recurring* texture, not single events.

### Copy options (one only, chosen at implementation)

- `들어온 일이 종종 있었어요 🍃`
- `따뜻한 일이 들어온 날이 있었어요 🌿`
- `조금 든든한 날이 자주 있었어요 🍃`

**Recommended: `들어온 일이 종종 있었어요 🍃`** — most observational, least financial. "들어온 일" deliberately ambiguous (could be money, could be anything).

### Out of bounds for this section

- Per-income-category observations ("월급 받은 날" / "환급된 날") — too granular, reads as ledger commentary.
- Income amount commentary — banned regardless.
- "Today" / "yesterday" comparison — banned.

---

## Section 9 — Allowance policy memo update

The `feedback_sobagi_allowance_giving_scene.md` memory file currently locks `allowance` (용돈) as a giving scene and broadly bans "income tracking" anywhere in Sobagi. Sub-spec A introduced `received_allowance` (용돈 받음) as a distinct income token, which technically contradicts the memo's blanket ban.

### Update needed

The memo should be **narrowed**, not collapsed. After sub-spec C:

- **`allowance` (🫶 용돈)** — still a giving scene. Outgoing only. Copy must never reframe it as incoming. Emoji locked to 🫶.
- **`received_allowance` (🤲 용돈 받음)** — incoming scene, distinct token. Reads as "money given to me by someone." Tone follows the income family (든든한 / 따뜻한 / 안심되는), not the original giving frame.

The two are deliberately not merged: a single 용돈 token would force the UI to ask "incoming or outgoing?" every save, which is finance-form behavior.

### Memo file edits (controller responsibility, not in code)

Update `feedback_sobagi_allowance_giving_scene.md`:

- **Keep:** the lock on `allowance` as giving-only, the 🫶 emoji constraint, the ban on "income tracking" in the *salary/budgeting* sense.
- **Add:** a section noting `received_allowance` is the legitimate incoming counterpart, with its own framing (`feedback_sobagi_decoupled_signals.md` siblings apply).
- **Clarify:** the original ban targeted gameified income tracking (totals, comparison, budgeting). Sub-specs A/B/C added income as a quiet observational shape — not as tracking infrastructure.

This is documentation hygiene; no code consequences.

---

## Section 10 — Optional memoSuggestions for income (deferred)

Income categories today have empty `memoSuggestions: []`. The picker therefore shows no hint chips for income records.

### Why defer

- The spending picker's memo hints are tactile / domain-specific ("아메리카노", "주차"). Income equivalents are harder to write without drifting into finance vocabulary ("이번 달 월급", "환급 받음" — borderline).
- Live behavior parity is fine: no chips = quieter picker. There's no broken UX path.
- A sweep can add chips later as a small-win polish, with copy review.

### Recommended draft (NOT included in sub-spec C — reference only)

```
salary             → ['이번 달', '회사', '월급', '11월']
bonus              → ['연말', '성과', '특별', '명절']
refund             → ['돌아온 돈', '잊고 있었던 것', '세금', '카드']
received_gift      → ['생일', '명절', '축하', '응원']
received_allowance → ['부모님', '용돈', '챙겨주신', '명절']
```

Any future implementer must:
- Avoid "보너스 두둑하게", "수익", "벌이", "수입" framing
- Avoid amount hints ("백만 원" / "x만 원")
- Keep entries concrete and atmospheric (scene words), not categorical

---

## Section 11 — Anti-patterns (sub-spec C scope)

These are explicitly out of scope and must not be introduced as side effects:

| Anti-pattern | Why banned |
|---|---|
| Income totals (월 합계 / 연 합계) anywhere | Would frame income as accountable balance |
| Net balance ("이번 달 +₩X / -₩Y") | Profit/loss framing |
| Savings / profit / 저축 messaging | Optimization loop |
| "수입" / "보상" / "축하" UI text | Banned vocabulary (gameified) |
| Income growth metrics (월 대비 +N%) | Investment framing |
| Income-specific celebration animation / sound / haptic | "Achievement" tone |
| Pebble grant on income save | See Section 5 |
| New "income" tab anywhere | Reframes app as finance tool |
| MonthPresenceRow income-specific glyph differentiation | See Section 6 |
| Income observations naming amounts | "X원이 들어왔던 날" — banned |
| Asset/emoji that reads as currency (💵 / 💰 / 💴) anywhere new | Reinforces money-centric identity |
| Per-category income observation ("월급 받은 날 N번") | Ledger framing |
| Streak/badge bound to income recording cadence | Reward loop |

---

## Section 12 — File touchpoints (preview, not commitment)

The implementation plan will produce the authoritative task list. This is a reading map for reviewers.

| File | Change kind | Section |
|---|---|---|
| `src/services/emotionEngine.ts` | Add `evaluateIncome` branch | 3 |
| `src/pages/record.tsx` | Remove `derivedKind === 'income' ? 'happy' : evaluate(...)` ternary | 3 |
| `src/constants/dialogue.ts` | Add `INCOME_REACTION_POOLS` | 4 |
| `src/services/dialogueService.ts` | Add `kind` param to `selectReactionMessage` | 4 |
| `src/pages/reaction.tsx` | Pass `expense.kind` to `selectReactionMessage` | 4 |
| `src/components/stats/MonthPresenceRow.tsx` | Extend `DayCellData`, update `glyphFor` | 6 |
| `src/pages/stats.tsx` | Compute and pass `hasRecord` per day | 6 |
| `src/services/roomPresenceService.ts` | `hasNightPattern` filters income out | 7 |
| `src/services/statsObservationService.ts` | Add income-day branch + `computeIncomeDayCount` | 8 |
| `feedback_sobagi_allowance_giving_scene.md` (memory) | Narrow scope, add `received_allowance` clause | 9 |

### Untouched (regression-confirmed perimeter)

- `src/services/expenseService.ts` (`recordNoSpend` keeps `'happy'`)
- `src/services/restService.ts` (pebble service)
- `src/services/foundItemService.ts` (T1/T2/T3 already kind-agnostic by reading any expense)
- `src/services/atmosphereService.ts` (`computeCalmDayCount` already income-excluded via `total`)
- `src/components/photocard/*` (sub-spec B baseline)
- Storage keys — none added, none removed
- `SobagiEmotion` type — unchanged 5-token union

---

## Section 13 — Open questions deferred to implementation

These are intentionally not pre-decided; the implementation plan or PR review can settle them.

| Q | Default if not asked |
|---|---|
| Income-day observation copy variant (3 options in §8) | Pick `들어온 일이 종종 있었어요 🍃` |
| `INCOME_REACTION_POOLS` Tier 2/3 specific wording | Drafts in §4 are the starting point; copy review during implementation |
| Whether `MonthPresenceRow` extension uses `hasRecord` boolean vs total-aware union | `hasRecord: boolean` per §6 Option A |
| Whether `selectReactionMessage` `kind` param is required or defaulted | Defaulted to `'spending'` for backward compat with existing test fixtures |

---

## Section 14 — Acceptance criteria

The implementation passes sub-spec C if:

1. **Emotion engine:** income records resolve via `evaluateIncome` (2-rule chain: late-night → `'sleepy'`, otherwise → `'happy'`; no amount, first-of-day, or streak sensitivity). `record.tsx` calls `evaluate` unconditionally. `recordNoSpend` still emits `'happy'`.
2. **Dialogue:** income saves on `reaction.tsx` show a line from `INCOME_REACTION_POOLS[tier]`, not from `REACTION_POOLS[tier][emotion]`. Existing spending reactions unchanged.
3. **Pebble jar:** no code path grants pebbles on income save. `restService.grantRest` remains called only from `useRestedAd`.
4. **MonthPresenceRow:** income-only days render `●`. Mixed and spending-only days render `●` (unchanged). No-spend-only renders `🌿`. Empty renders `·`. Today-empty renders `○`.
5. **Detectors:** `hasNightPattern` excludes income from its count. Cafe pattern, calm-day, T4 unchanged (already category- or amount-gated). T1/T2/T3 count income as presence.
6. **Stats observation:** income-day branch fires at `>= 2` income days in 30. Below threshold, falls through to streak chain.
7. **Anti-pattern grep clean:** `수입` / `보상` / `축하` / `벌었` / `수익` / `리워드` not added to UI surfaces or copy.
8. **Memory hygiene:** `feedback_sobagi_allowance_giving_scene.md` updated to narrow scope (controller task, tracked in NEXT_PRIORITIES).
9. **No storage keys added, removed, or renamed.**
10. **Tests:** unit coverage for `evaluateIncome` (3 cases), `selectReactionMessage` income gate, `computeIncomeDayCount`, `hasNightPattern` with income mixed in. Targeted, not exhaustive.

---

## Section 15 — Out of scope

- Year-end recap (deferred)
- Income picker memo suggestions (deferred — §10)
- Income asset / Sobagi face refresh
- Photocard income-specific copy on the right panel (sub-spec B is the baseline; income rows already render in `들어온 기록` group)
- New emotion in `SobagiEmotion`
- New storage keys
- Touching `restService` / pebble math
- Calendar (`stats.tsx` calendar grid) income glyph — only `MonthPresenceRow` is in scope; the calendar itself reads via existing data without an income marker

---

*End of design.*
