# Sobagi Ambient Dialogue System — Design

**Date:** 2026-05-25
**Status:** Approved (design direction; engine = Approach B)
**Branch:** apps-in-toss-clean

## 1. Emotional-system design overview

The home room currently speaks through a flat `IDLE_MESSAGES` array (12 lines + a
few rest lines), picked by `Math.random()` with a single "don't repeat the last
index" guard. It has no awareness of time, mood, accumulated history, absence, or
the objects in the room. So it reads the same in the morning and at 2am, whether
you just returned after two weeks or tapped twice in a row.

This design replaces that single surface — **the room's ambient voice** (the
tap-to-talk speech bubble and ambient moments) — with a small, data-driven
**context engine**. The save-reaction pools (`REACTION_POOLS`/`INCOME_REACTION_POOLS`),
the observation lines (`detectObservationType`), and the per-day `DayFeeling` card
are **out of scope** and untouched.

The goal is **not** more lines. It is: *the feeling shifts subtly with time, mood,
and accumulated life pattern.* Variety comes from **contextual variation** — the
set of eligible lines changes with the hour, the objects in the room, and how long
you've been away — far more than from large pools. A handful of lines per category,
recombined by context, produces a lived-in voice that rarely repeats.

The room narrates **its own atmosphere**, never the user. No achievement, no
coaching, no productivity energy, no finance framing, no AI-assistant explanations,
no "great job" repetition, no over-comforting. Quiet, warm, lived-in.

## 2. Category structure

The engine is **Approach B: category buckets, two-stage pick.** Each category is a
named pool. A line is `{ id: string; text: string }`. `id` is stable (used by the
anti-repetition ring); `text` is what's shown.

| Category | Eligibility | Role |
|----------|-------------|------|
| `baseline` | always | time-neutral presence — the calm default |
| `timeOfDay` | always; sub-pool by `timeBucket` | morning / afternoon / evening / latenight tone |
| `noSpend` | `isNoSpendToday` | a quiet, nothing-bought day |
| `accumulation` | `recordedDaysCount ≥ 30` OR `streak ≥ 7` | the room growing familiar |
| `object` | room contains an item with lines | lived-in object traces (keyed by item id) |
| `atmosphere` | `calmActive` OR `restActive` | the room's current air (calm film / post-rest warmth) |
| `return` | `daysSinceLastVisit ≥ RETURN_GAP_DAYS` (7), not yet shown this session | no-guilt welcome back, once per return (§4) — **priority override** |
| `rare` | ~`RARE_PROBABILITY` roll, an unshown rare line exists | low-frequency flavor — **priority override** |

**Time buckets reuse `getTimeOfDayBackgroundKey(hour)`** (atmosphereService):
morning 5–12 / afternoon 12–17 / evening 17–21 / latenight else. The voice and the
visible lighting share the same cutoffs — Sobagi sounds like the room looks.

### Weighting strategy

`CATEGORY_WEIGHTS` is the calmness knob. Baseline + timeOfDay dominate; the rest are
gentle spices that only appear when their condition holds:

```
baseline 30 · timeOfDay 30 · object 14 · noSpend 15 · accumulation 12 · atmosphere 10
```

`return` and `rare` are **not** in the weighted pool — they are priority overrides
checked first (see §6 selection order). When only baseline + timeOfDay are eligible
(the common case), they split ~50/50; spices raise variety only in the contexts
where they're meaningful.

## 3. Example dialogue pools

Pools are intentionally modest (~4–6 lines). Real lines, Sobagi tone:

**baseline**
- `여기 있을게요`
- `천천히 해요`
- `같이 있을게요`
- `조용히 있어도 괜찮아요`
- `무슨 생각 하고 있어요?`
- `오늘도 들렀네요`

**timeOfDay.morning** — fresh air, slow start, sunlight
- `아침 공기가 맑아요 🌿`
- `천천히 시작해요`
- `햇살이 들어오고 있어요`
- `아침이에요. 잘 잤어요?`

**timeOfDay.afternoon** — warmth, quiet flow, small pauses
- `나른한 오후예요 🍃`
- `잠깐 쉬어가요`
- `오후 햇살이 따뜻해요`
- `조용한 한낮이에요`

**timeOfDay.evening** — lights on, calm after the day
- `불을 켤 시간이네요`
- `하루가 저물어가요 🌆`
- `저녁 공기가 차분해요`
- `이제 좀 쉬어도 돼요`

**timeOfDay.latenight** — soft companionship, safe quiet, "still awake?"
- `아직 안 잤네요 🌙`
- `밤이 고요해요`
- `여기 같이 있을게요`
- `늦었어요. 너무 무리하지 말아요`

**noSpend**
- `오늘은 조용한 하루였네 🌿`
- `아무것도 사지 않은 날도 좋아요`
- `가만히 지나간 하루예요`

**accumulation**
- `이 방이 조금씩 익숙해지고 있어요`
- `요즘 자주 와줘서 좋아요 🌿`
- `어느새 익숙한 풍경이 됐어요`

**return** — no guilt, ever. Never `오랜만이네` / `왜 안 왔어`. The feeling is *"just glad to see you again,"* **not** *"I was remembering / waiting for you"* — so avoid lines that imply Sobagi was counting the days or holding the spot (e.g. `여기 그대로 있었어요`).
- `다시 와줘서 반가워요 🌿`
- `천천히 다시 시작해요`
- `다시 만나서 좋아요 🍃`

**atmosphere** (calmActive)
- `오늘 방이 조금 따뜻한 것 같아요`
- `공기가 포근해요 🌿`
- `방 안이 차분해요`

**atmosphere** (restActive) — folds in the current `REST_IDLE_MESSAGES`
- `잠깐 쉬다 왔어요 🌿`
- `좋은 채널이었어요 📺`
- `따뜻한 기운이 남아있어요`

**object** — keyed by placed item id; lived-in traces, not collectibles. Object dialogue must feel **observational**, never ownership/collection-oriented (⭕ `오늘 물 줬어 🌱` · ❌ `화분을 잘 키우고 있네!`) — the room notices the object's presence, it does not praise the user for having it:
- `m6` 작은 식물 🪴 → `오늘 물 줬어요 🌱` · `식물이 조금 자란 것 같아요 🪴`
- `a6` 따뜻한 램프 🪔 *(evening/lateNight only)* → `밤엔 이 불빛이 좋더라고요 🪔` · `램프를 켜뒀어요`
- `s5` 머그컵 🫖 → `따뜻한 거 마시고 싶네요 🫖` · `두 손이 따뜻해져요`
- `m5` 담요 🧣 → `담요가 포근해요 🧣`
- `a3` 달 반지 🌙 → `달 반지가 반짝여요 🌙`
- `m3` 꿀병 🍯 → `꿀 한 숟갈 먹었어요 🍯`
- `s3` 따뜻한 커피 ☕ → `커피 향이 좋아요 ☕`
- `t4` 작은 곰 🧸 → `곰 인형이랑 있어요 🧸`

**rare** (~2%) — incidental, no fanfare, identical bubble
- `창밖 바람 소리가 좋아요`
- `먼지 한 톨이 햇빛에 떠다녀요`
- `어디선가 좋은 냄새가 나요`
- `시계 초침 소리가 들려요`
- `오늘은 시간이 천천히 가는 것 같아요`

## 4. Anti-repetition logic

Three layers, ordered by how much work they do:

1. **Contextual eligibility (primary).** The eligible category set shifts with hour,
   placed objects, no-spend status, accumulation, and absence — so consecutive taps
   in different contexts naturally differ. This is the brief's "variation over
   brute-force lists," and it carries most of the load.
2. **Recent-id ring (session).** `session.recentIds` holds the last
   `RECENT_RING_SIZE` (7) shown line ids. The selector excludes any line whose id is
   in the ring. If every line in the chosen category is in the ring, that category is
   dropped from the eligible set for this pick (falling back to others / baseline).
   The ring lives in a `useRef` in `index.tsx` and is **passed into** the pure
   selector, which returns the chosen id; the caller appends it (capped at 7, oldest
   shifted out). Resets on app relaunch (per the approved session-memory decision).
3. **Category-specific no-consecutive rule.** `object`, `rare`, and `return`
   (`STRONG_NO_CONSECUTIVE`) must **never** appear twice in a row — back-to-back object
   or rare lines break the lived-in feel. `baseline`, `timeOfDay`, `noSpend`,
   `accumulation`, and `atmosphere` **may** repeat consecutively; that reads naturally
   (two quiet morning lines in a row is fine). The selector checks `session.lastCategory`
   and excludes a strong-no-consecutive category if it was the previous one.

**Return greeting — once per return, no new storage.** `session.returnGreetingShown`
prevents a repeat within the session. Across relaunches it's also naturally
once-per-day: after the first visit of the day, `useAppInit` writes
`LAST_VISIT_DATE = today`, so on any later launch that day `getPrevVisitDate()`
yields today and `daysSinceLastVisit` collapses to 0 → the greeting is no longer
eligible. Net effect: the welcome fires **once per return**, the first time you come
back after a `RETURN_GAP_DAYS`+ gap. No new storage key needed.

### Silence allowance

Sobagi does not always speak. **Sometimes a tap produces no line at all** — the room
just stays quiet (a soft blink / breathing idle). Silence makes each spoken line feel
more valued; constant chatter cheapens the voice.

- `SILENCE_PROBABILITY ≈ 0.15`, rolled in the **normal path only** — after the
  `return` and `rare` checks. A return greeting or a rare line is never silenced
  (those are meaningful/scarce moments).
- **Never two silences in a row** (`session.lastWasSilence`) — a second tap after
  silence always speaks, so it never reads as an unresponsive/broken tap.
- **The first utterance of a session always speaks** (suppressed when `recentIds` is
  empty) — a good first impression, never "I tapped and nothing happened."
- On silence the bubble is simply not shown. The tap is still acknowledged
  non-verbally (the existing Sobagi spring-pop / a soft blink) so the moment reads as
  *"Sobagi noticed, and is just being quiet"* — not a dead tap.

## 5. Rarity strategy

A single probability, `RARE_PROBABILITY ≈ 0.02`, rolled **before** the weighted pick.
If it hits *and* an unshown rare line exists, a rare line is emitted; otherwise the
normal weighted pick proceeds. There is **no** counter, streak, badge, SSR/gacha
framing, excitement copy, or visual difference — the bubble, timing, and tone are
identical to any other line. The "oh, I've never seen this one" feeling comes purely
from low probability against a small rare pool, encountered incidentally over weeks.
No reward tone.

**A rare line is a change in the air (공기 변화), not a change in emotional intensity.**
It is **not** more special, **not** longer, **not** more moving than an ordinary line —
just a slightly different texture (다른 결). A rare line that tries to be a "big
moment" is a design failure; the rarity is in *frequency*, never in *weight*.

## 6. Implementation architecture proposal

Project pattern: pure, unit-tested logic in `.ts` (no RN imports), then a thin wire-in.

### `src/constants/ambientDialogue.ts`
- `type AmbientCategory = 'baseline' | 'timeOfDay' | 'noSpend' | 'accumulation' | 'object' | 'atmosphere' | 'return' | 'rare'`
- `type AmbientLine = { id: string; text: string }`
- `type TimeBucket = 'morning' | 'afternoon' | 'evening' | 'latenight'` (re-exported from the resolver's key type)
- Pools: `BASELINE_LINES`, `TIME_OF_DAY_LINES: Record<TimeBucket, AmbientLine[]>`, `NO_SPEND_LINES`, `ACCUMULATION_LINES`, `RETURN_LINES`, `CALM_LINES`, `REST_LINES`, `RARE_LINES`, and `OBJECT_LINES: Record<string /*itemId*/, AmbientLine[]>`.
- `EVENING_ONLY_OBJECTS = new Set(['a6'])` (lamp).
- `CATEGORY_WEIGHTS: Record<Exclude<AmbientCategory,'return'|'rare'>, number>`.
- `RARE_PROBABILITY = 0.02`, `RETURN_GAP_DAYS = 7`, `SILENCE_PROBABILITY = 0.15`, `RECENT_RING_SIZE = 7`, `ACCUMULATION_MIN_DAYS = 30`, `ACCUMULATION_MIN_STREAK = 7`.
- `STRONG_NO_CONSECUTIVE: Set<AmbientCategory> = new Set(['object', 'rare', 'return'])` — these never appear twice in a row; `baseline` / `timeOfDay` / `noSpend` / `accumulation` / `atmosphere` may repeat (natural).
- Every line `id` is unique and stable.

### `src/services/ambientDialogueService.ts` (pure)
```ts
export type AmbientContext = {
  timeBucket: TimeBucket;
  recordedDaysCount: number;
  streak: number;
  isNoSpendToday: boolean;
  placedItemIds: string[];
  daysSinceLastVisit: number;   // 0 if visited today / first ever
  calmActive: boolean;
  restActive: boolean;
};

export type AmbientSession = {
  recentIds: string[];
  returnGreetingShown: boolean;
  lastCategory?: AmbientCategory;
  lastWasSilence: boolean;
};

export type AmbientSelection =
  | { kind: 'line'; line: AmbientLine; category: AmbientCategory; isReturnGreeting: boolean }
  | { kind: 'silence' };

export function selectAmbientLine(
  ctx: AmbientContext,
  session: AmbientSession,
  rng: () => number = Math.random,
): AmbientSelection;
```
Selection order inside `selectAmbientLine`:
1. **return** — if `ctx.daysSinceLastVisit >= RETURN_GAP_DAYS && !session.returnGreetingShown`, pick a `RETURN_LINES` line (ring-excluded) → `{ kind: 'line', isReturnGreeting: true }`. Bypasses silence.
2. **rare** — else if `rng() < RARE_PROBABILITY` and an unshown `RARE_LINES` line exists, emit it. Bypasses silence.
3. **silence** — else if `recentIds` is non-empty (not the session's first utterance) and `!session.lastWasSilence` and `rng() < SILENCE_PROBABILITY` → `{ kind: 'silence' }`.
4. **weighted** — else compute `eligibleCategories(ctx)`, weighted-pick a category by `CATEGORY_WEIGHTS` (excluding `session.lastCategory` when it's in `STRONG_NO_CONSECUTIVE`), then pick a line in it excluding `recentIds`; if a category is exhausted by the ring, drop and re-pick; ultimate fallback is `baseline`.

Helpers (all pure, exported for tests): `eligibleCategories(ctx)`, `linesForCategory(ctx, category)` (resolves timeOfDay sub-pool, object lines for placed items honoring `EVENING_ONLY_OBJECTS`, calm vs rest for atmosphere), `pickWeighted(cats, rng, lastCategory)`, `pickLine(pool, recentIds, rng)`.

`rng` and `session` are injected → deterministic tests.

### Wiring — `src/pages/index.tsx`
- `const ambientSessionRef = useRef<AmbientSession>({ recentIds: [], returnGreetingShown: false, lastWasSilence: false })`.
- In `handleSobagiTap`, build `AmbientContext` from values already at hand:
  - `timeBucket = getTimeOfDayBackgroundKey(new Date().getHours())`
  - `recordedDaysCount`, `streak` from `useUserStore`
  - `isNoSpendToday` = today has a record AND today's spending total is 0 (from `todayExpenses`)
  - `placedItemIds = roomPlacements.map(p => p.itemId)`
  - `daysSinceLastVisit` = calendar days between today and `getPrevVisitDate()` (0 if null/today)
  - `calmActive = calmOpacity > 0`, `restActive = getRestWarmthOpacity(new Date(), lastRestAt) > 0`
- Call `const sel = selectAmbientLine(ctx, ambientSessionRef.current)`, then branch:
  - `sel.kind === 'silence'` → do **not** show the bubble; still play the tap's spring-pop / soft blink so the tap is acknowledged. Set `lastWasSilence = true`; leave `recentIds`/`lastCategory` unchanged.
  - `sel.kind === 'line'` → set the bubble to `sel.line.text`; push `sel.line.id` into `recentIds` (cap `RECENT_RING_SIZE`); set `returnGreetingShown` if `sel.isReturnGreeting`; set `lastCategory = sel.category`; set `lastWasSilence = false`.
- Remove `IDLE_MESSAGES` / `REST_IDLE_MESSAGES` / `getIdleMessages` (REST lines now live in the `atmosphere` category, gated by `restActive`). The 3.5s auto-hide and bubble component are unchanged.

### Testing — `__tests__/ambientDialogueService.test.ts`
- return override fires at the gap threshold (≥7) and only once per session; bypasses silence.
- rare fires when `rng < p` and an unshown rare exists; suppressed when the ring covers the rare pool; bypasses silence.
- **silence** fires when `recentIds` is non-empty, `!lastWasSilence`, and the silence roll hits; suppressed on the first utterance (`recentIds` empty) and immediately after a silence; return/rare are never silenced.
- **no-consecutive:** `object` / `rare` / `return` never follow themselves (seeded so the same category would otherwise repeat → assert it's excluded); `baseline` / `timeOfDay` are allowed to repeat.
- object lines appear only when the item id is placed; lamp (`a6`) only in evening/latenight.
- `noSpend` / `accumulation` eligibility gates (boundary: 29 vs 30 days, streak 6 vs 7).
- timeOfDay resolves the correct sub-pool per bucket.
- anti-repeat: a line whose id is in `recentIds` is never returned; an exhausted category is dropped.
- weighted pick is deterministic under a seeded `rng`.
- **Guardrail test:** scan every pool line for banned substrings (`수입|수익|보상|축하|벌었|입금|잔액|통장|저축|잘했|대단|성공|완료|화이팅|파이팅`) — must find none.

No new storage keys. No RN imports in the service/constants.

## 7. Future expansion ideas

- **Persisted memory:** swap the in-memory ring for a stored one (one storage key) without changing `selectAmbientLine`'s signature — `session` is already injected.
- **Seasonal / weather categories:** add a category + pool + one eligibility clause; weights stay the calmness knob.
- **More object lines:** add an `OBJECT_LINES[itemId]` entry as new items get room presence; no selector change.
- **Tier-aware tone:** optionally fold `getDialogueTier(recordedDaysCount)` into baseline/timeOfDay tone later (Tier 1 careful → Tier 3 intimate), mirroring the reaction pools.
- **Beyond tap:** the same selector can power an ambient moment on first open of the day, or a periodic idle utterance, since it's a pure function of context + session.

## Tone guardrails (binding)

Never generate: achievement / self-improvement / productivity / financial-success
framing; "great job" repetition; therapy-style over-comforting; AI-assistant
explanations; long explanations; high-energy reactions; excessive positivity. Rare
lines carry zero reward tone. The room narrates atmosphere, not the user. Aligns
with `SOBAGI_PHILOSOPHY.md`, `feedback_sobagi_restraint_over_visibility`,
`feedback_sobagi_reduce_density_not_structure`, and the income-language ban in
`feedback_sobagi_allowance_giving_scene`.

## Out of scope (YAGNI)

- Save-reaction pools, observation lines, DayFeeling card — untouched.
- No new storage key (session memory only).
- No persisted rare cooldown, no per-tier tone, no weather/seasonal — listed as future.
- No change to the bubble component, its timing, or the tap interaction itself.

## Verification checklist

- [ ] `npm run typecheck` clean
- [ ] full Jest green incl. the new service tests + guardrail scan
- [ ] anti-pattern grep clean (`순수익|잔액|차액|net|balance|profit` and the §6 banned set)
- [ ] no `IDLE_MESSAGES`/`getIdleMessages` references left in `index.tsx`
- [ ] manual: tap repeatedly at different hours / with objects placed / after a gap — voice varies and never guilts on return; sometimes Sobagi stays quiet (no bubble) yet the tap still feels acknowledged, and never two silences in a row
