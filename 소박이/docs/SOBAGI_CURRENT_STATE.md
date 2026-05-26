# Sobagi — Current State

**Role:** Single operational source of truth. Describes what is currently true — not what was built, not what is planned.
**Update:** When system status changes. Not when code changes internally.

---

## Documentation Hierarchy

```
SOBAGI_PHILOSOPHY.md          — emotional anchor, tone rules, anti-patterns (rarely changes)
          ↓
SOBAGI_CURRENT_STATE.md       ← you are here
          ↓
SOBAGI_NEXT_PRIORITIES.md     — ordered work queue
          ↓
docs/superpowers/specs/       — approved design specs (reference after implementation)
docs/superpowers/plans/       — implementation plans (reference after completion)
          ↓
docs/archive/                 — dated snapshots, superseded plans (historical only)
          ↓
code                          — final truth of what runs
```

**Conflict resolution:** higher in the hierarchy wins.
If code contradicts this document, update this document.
If a plan contradicts PHILOSOPHY, stop and surface it to the product owner.
Archived docs are never authoritative — never use them to override current state.

---

## Update Rules

**Update when:**
- A system moves between status categories (planned → partial → complete)
- A new known issue is discovered, or an existing one is resolved
- Storage keys are added, removed, or renamed
- A handoff is written (replaces `## Latest Handoff`)

**Do NOT update when:**
- Code changed internally with no status change
- A system was refactored but still does the same thing
- You want to log what changed (use git history and commit messages for that)

**What does NOT belong here:**
- Feature specs → `docs/superpowers/specs/`
- Implementation plans → `docs/superpowers/plans/`
- Historical snapshots → `docs/archive/`
- Detailed design philosophy → `SOBAGI_PHILOSOPHY.md`
- Work queue ordering → `SOBAGI_NEXT_PRIORITIES.md`
- "As of date X" accumulation — this document has no date log, only current truth

**What to do with completed work:**
Summarize in one row of the System Status table. The detail lives in the spec/plan file and commit history. Do not expand this document with narrative summaries of what was done.

**What to do with outdated priorities:**
Strike through in SOBAGI_NEXT_PRIORITIES.md, then move to "Recently completed." Do not leave finished tasks as active in this document.

---

## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-25
**Group:** Bag "Discover & Keep" — functional loop + sync hardening + first-experience (Stage 5 polish deferred)

> **Discovery is not a reward queue. It is a gentle arrival queue.**

The bag was a passive day-unlock catalog and the room permanently scattered items (clutter). Now: an item that becomes available **arrives** in the room as a single tappable thing (one at a time); the user **picks it up** into the bag with a soft, item-specific line; the room stays clean; the bag is a **keepsake box** where tapping a kept item shows a quiet Sobagi note. The full `discover → keep → revisit` loop is functionally complete and sync-hardened. Stage 5 (animation/feel) is intentionally split out for a dedicated emotional-polish pass after device dogfooding.

### Model + wiring
- **Discovery model** (`src/services/discoveryService.ts`, pure + tested): `computeTimeArrivals` (minDays cadence preserved as an *arrival schedule*), `enqueueArrivals`, `keepItem` (queue→kept), `seedKeptForMigration` (unlocked+placed+found), `isFreshInstall` (no recorded days/placements/found), `keepsakeLineFor` (object line → desc → trinket findLine → default; for **revisiting** a kept item), `pickupLineFor` (**desc-first** → trinket findLine → `주웠어요 🌿`; for the **moment of picking up**, so lines are item-specific and never repeat). Storage: `KEPT_ITEM_IDS`, `DISCOVERY_QUEUE`, `DISCOVERY_MIGRATION_DONE`.
- **State source of truth** (`src/store/discoveryStore.ts`): `{queue, kept}` live in a Zustand store. `useAppInit` is the authoritative loader — it persists then **hydrates** the store; Home consumes it **reactively** and no longer reads those keys on its own mount. This fixes the init race where Home read the pre-arrival queue and a new discoverable only showed on the next launch. Pickup goes through the store's `keep` action (write-through to storage).
- **Init** (`src/hooks/useAppInit.ts`, `runDiscoveryInit`): **existing** user → migration seeds `kept` from everything owned (no re-discovery storm); **true fresh install** → empty keepsake bag, day-eligible items go into the room **queue** so the very first loop is arrival → notice → keep (not pre-filled inventory). Newly-eligible arrivals flow through the normal branch on later launches.
- **Room** (`src/pages/index.tsx`): renders the queue front as one tappable discoverable; tap → store `keep` + item-specific `pickupLineFor` line. The static `roomPlacements` render is gone; `checkForPlacement` (`roomPresenceService`) **enqueues** arrivals (category/streak/night/emotion early-bring preserved) instead of writing `ROOM_PLACEMENTS`; the `PendingPlacement` settle path is retired.
- **Bag** (`src/pages/index.tsx`): a single clean keepsake grid of kept items (no day-locked grid, no tabs, **no new-item dot**), bounded in a `ScrollView` as it grows; tap a kept item → its note via `keepsakeLineFor`. A pending found trinket is promoted to the keepsake collection and `PENDING_NEW_ITEM_ID` cleared **atomically on bag open**. Ambient object lines key off **kept** items.

### Direction
The room is a calm discovery surface, not a display shelf. Picking up is *keeping*, not *earning* — no counts, no completion grid, no rewards, no notification dot. The discovery queue length is never surfaced.

### Deliberately deferred (NOT bugs)
- **Stage 5 — emotional polish pass** (own task): bob/glow timing, pickup feel, animation softness, queue-advance rhythm. Folds in the dead `bagTab*` styles and the now-unreferenced `LAST_BAG_OPEN_DAYS` storage key. (The legacy bag-dot machinery — `pendingNewItemId`/`hasNewBagItem` — has **already been removed**.)
- **Trinket → room-discovery unification** (future follow-up, not bundled): found trinkets (`f*`) still arrive via their legacy "두고 간 것" path straight into the bag; *displayed* in the keepsake grid (merged `kept ∪ found`) but don't yet appear as room discoverables.

### Preserved (regression-confirmed)
Ambient voice, save reactions, observations, DayFeeling, letters, pebbles/rest, the photocard. Room-presence selection helpers unchanged.

### Test count
**29 suites · 410 tests · all green.** `discoveryService.test.ts` (arrivals / enqueue / keep / migration-seed / `keepsakeLineFor` + `pickupLineFor` + `isFreshInstall`); `stores.test.ts` (`discoveryStore` hydrate/keep).

### Next
**Device dogfooding before stage 5, ideally from a fresh wipe:** whether the first arrival reads as *quietly discovered* vs *spawned*; room stays calm/clean; keepsake taps stay comforting vs repetitive; silence rhythm; whether pickup feels gentle, not reward-y. Spec `docs/superpowers/specs/2026-05-25-bag-discover-and-keep-design.md`, plan `docs/superpowers/plans/2026-05-25-bag-discover-and-keep.md`.

---

### Earlier handoff (Ambient dialogue system)

**Agent:** Engineering
**Date:** 2026-05-25
**Group:** Ambient dialogue system (home idle voice)

The home room's idle/tap-to-talk voice — previously a flat `IDLE_MESSAGES` array picked at random — is now a **context-driven ambient engine**. Tapping Sobagi resolves a line (or silence) from the room's current context: time of day, no-spend, accumulated familiarity, return-after-absence, placed objects, and atmosphere. Save-reaction pools, observation lines, and the DayFeeling card are unchanged (out of scope).

### What changed
- **Pools + tuning** (`src/constants/ambientDialogue.ts`): 8 categories — `baseline`, `timeOfDay` (sub-pooled by the same `getTimeOfDayBackgroundKey` buckets as the backgrounds, so voice matches lighting), `noSpend`, `accumulation`, `object` (lines keyed by bag item id; lamp `a6` evening/latenight-only), `atmosphere` (calm/rest), `return`, `rare`. `CATEGORY_WEIGHTS` (baseline/timeOfDay dominant) + `RARE_PROBABILITY 0.02`, `RETURN_GAP_DAYS 7`, `SILENCE_PROBABILITY 0.15`, `RECENT_RING_SIZE 7`.
- **Pure selector** (`src/services/ambientDialogueService.ts`): `selectAmbientLine(ctx, session, rng)` → return override → rare (unshown only) → silence → weighted category pick. Session anti-repeat ring + category-specific no-consecutive (`object`/`rare`/`return` never repeat). Injectable `rng`/`session` → fully unit-tested.
- **Silence allowance:** ~15% of normal taps produce **no line** — Sobagi just stays quiet. Never on the first tap of a session, never twice in a row; `return`/`rare` are never silenced. **This is intentional, not a bug.** Every tap still plays a small `tapPulse` scale-bounce so a silent tap reads as "noticed, being quiet," not unresponsive.
- **Wiring** (`src/pages/index.tsx`): `handleSobagiTap` builds the context from values already on screen (time bucket, recordedDays/streak, today no-spend via `todayTotal===0`, `roomPlacements` ids, `getPrevVisitDate()` gap, `calmOpacity>0`, rest-warmth) and renders the selection. Removed `IDLE_MESSAGES`/`REST_IDLE_MESSAGES`/`getIdleMessages`/`lastIndexRef` (REST lines now live in the `atmosphere` category).

### Direction
The room narrates its own atmosphere, never the user. Variety comes from contextual variation, not large pools (~4–6 lines/category). Return greetings never guilt ("just glad to see you," not "I was waiting"). Rare lines are a *change in the air*, not heightened emotion. A guardrail test scans every pool for banned income/achievement/coaching vocabulary.

### Preserved (regression-confirmed)
Save reactions (`REACTION_POOLS`/`INCOME_REACTION_POOLS`), observation lines (`detectObservationType`), DayFeeling card, the bubble component + 3.5s auto-hide, and all atmosphere overlays. No storage changes.

### No new storage keys

### Test count
**28 suites · 388 tests · all green.** New: `ambientDialogue.test.ts` (guardrail: banned-vocab / unique ids / no return-guilt), `ambientDialogueService.test.ts` (eligibility, lines-for-category incl. lamp gating, ring exclusion, weighted no-consecutive, return/rare/silence branches).

### Next
Device-test the voice across times of day / with objects placed / after a gap, and tune `SILENCE_PROBABILITY` / category weights by feel. Spec `docs/superpowers/specs/2026-05-25-ambient-dialogue-system-design.md`, plan `docs/superpowers/plans/2026-05-25-ambient-dialogue-system.md`.

---

### Earlier handoff (Time-of-day home backgrounds)

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Time-of-day home backgrounds

The static home-room background and the `getTimeOfDayTint` color wash were replaced by four time-of-day background paintings (morning / afternoon / evening / latenight), each already lit for its hour. The background now carries the time-of-day feeling the faint tint used to only hint at.

### What changed
- **Pure resolver** (`src/services/atmosphereService.ts`): new `getTimeOfDayBackgroundKey(hour)` → `morning` (5–12) / `afternoon` (12–17) / `evening` (17–21) / `latenight` (else, 21–5). `getTimeOfDayTint` and its tests removed; the `TimeOfDayTint` type is kept (still a `PhotocardView` prop, currently unused at any call site).
- **Asset map** (`src/constants/assets.ts`): CDN pin → `d940b2c`; new `ROOM_TIME_BACKGROUND_URIS` maps the four keys to `sobaki_stage_{morning,afternoon,evening,latenight}.png`. `ROOM_BACKGROUND_URIS` (old `room_stage1.png`) kept as an export but now unused everywhere — clean-up candidate.
- **Home wiring** (`src/pages/index.tsx`): resolves the current bucket's URI at render and passes it to `RoomBackground` for all stages; the tint-overlay `<View>` is removed. Warmth / rest-warmth / calm overlays + bottom fade unchanged.
- **Prefetch** (`src/hooks/useAppInit.ts`): now prefetches the current time-of-day background (one image, same cost as before) instead of `room_stage1`, so the home background still loads warm. Crossing a bucket boundary mid-session cold-loads once via the lazy fallback.

### Direction
Same single centered room, lit for the hour. No new objects / labels / controls; consistent with `project_sobagi_spatial_identity` + `feedback_sobagi_restraint_over_visibility`. Background resolves at render time (no timer) — matches how warmth/calm already recompute.

### Preserved (regression-confirmed)
All warmth/calm/rest atmosphere overlays + bottom fade, room placements, every non-home surface. No storage changes.

### No new storage keys

### Test count
**24 suites · 356 tests · all green.** `atmosphereService.test.ts` swaps the `getTimeOfDayTint` block for a `getTimeOfDayBackgroundKey` block (every bucket + each boundary hour).

### Next
Device-test the four backgrounds across the day. Same backlog (Rest-TV prod ad ID, photocard polish, Android keyboard, G1–G5 dogfooding calls). Optional: drop the now-unused `ROOM_BACKGROUND_URIS` export.

---

### Earlier handoff (Pre-dogfooding hardening pass)

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Pre-dogfooding hardening pass (record-system stabilization, 7 fixes)

A Codex QA pass found real integration gaps in the record→reaction→persistence path. This was stabilization, not feature work. Seven fixes landed; the headline is that **today-context leakage is eliminated** — reaction, photocard, first-record emotion, and streak excitement now follow the saved record's date, not "today".

### What changed
- **#1 Reaction/photocard follow the record date** (`emotionStore.ts`, `reaction.tsx`, `record.tsx`): `emotionStore` gains `lastRecordDate` (set at save, same pattern as `lastKind`). The reaction screen filters expenses by it (not `getTodayExpenses()`) for both the photocard records and the "has spending → show button" gate, and labels the photocard with that date. Time badge shows only for today saves. Today saves are byte-identical to before.
- **#2 Today-only emotional escalation** (`emotionEngine.ts`, `record.tsx`): new pure `buildEmotionContext`. Today → `{ isFirstRecordToday from today's non-income count, streak, now-hour }`. Past-date → `{ isFirstRecordToday:false, currentStreak:0, currentHour: record's hour }` — so a back-dated save can never resolve to `'surprised'` (welcome) or `'excited'` (streak). See `feedback_sobagi_temporal_escalation.md` + PHILOSOPHY "Emotional Escalation Belongs to Today".
- **#3 Income-intent guard** (`utils/recordValidation.ts` new, `record.tsx`): income amount stays optional, but a fully-default save (salary + 0 + no memo + no emotion) is blocked. Requires one intent signal — amount / memo / emotion / category≠salary. Disabled button + gentle hint. Not strict validation; see `feedback_sobagi_income_intent_guard.md` + PHILOSOPHY "Recording Intent Over Friction".
- **#4 Record screen reset on successful save** (`record.tsx`): `resetForm()` clears kind/amount/category/memo/date and the `isSavingRef` latch after a successful save — fixes stale-state-on-re-entry and a latent bug where a retained screen would block all future saves.
- **#5 Save-failure durability** (`expenseService.ts`, `record.tsx`): `saveExpense`/`recordNoSpend` return `boolean`. On EXPENSES-write failure the optimistic in-memory mutation is rolled back (so a retry can't duplicate) and the caller shows a gentle error + stays put instead of navigating to a reaction for a record that won't survive restart.
- **#6 Create/edit amount parity** (`stats.tsx`, `record.tsx`, `recordValidation.ts`): both paths share `parseAmountInput` + `amountValidForKind` (income ≥0, spending >0). Blank income edit now saves 0; blank spending edit shows a disabled button + hint instead of the old silent no-op.
- **#7 Strict amount parser** (`utils/amount.ts`): `parseAmountInput` strips commas + trims, then accepts only `^[0-9]+$` else 0. `123abc`/`1원`/`12.5`/`-3` → 0 (was lenient prefix-parse). Also closes the negative-income edge.

### Direction — two product principles
Both are now in PHILOSOPHY + operational memory: **(1)** emotional escalation belongs to today — past-date records are quiet catch-up, never false celebration; **(2)** recording intent over friction — income amount optional, but the lightest gate prevents accidental ghost records (never a validation wall).

### Preserved (regression-confirmed)
Today-save behavior (escalation, photocard, dialogue), monthly settlement line, calendar grid + cell totals, day-card income section + per-record amount hiding, no-spend / reaction / edit flows, hydration normalize (both kind directions), types, storage.

### No new storage keys

### Test count
**21 suites · 324 tests · all green.** New: `recordValidation.test.ts` (intent + amount-validity), `expenseServiceSave.test.ts` (boolean return + rollback + no-duplicate retry); extended `amount.test.ts` (strict pasted/junk cases) and `emotionEngine.test.ts` (`buildEmotionContext` today vs past-date).

### Next
Same backlog as before (Rest-TV prod ad ID, photocard polish, Android keyboard, on-device chart x-label density) plus the G1–G5 record-type product calls (decide via dogfooding, not pre-emptive patches).

---

### Earlier handoff (Monthly settlement + readability)

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Monthly settlement line + Stats chart readability + income 0원 default

### What changed
- **Monthly settlement line** (`src/pages/stats.tsx`): a quiet line under the centered month label in the calendar card showing two separate totals — `쓴 돈 {지출 합계}원 · 들어온 돈 {수입 합계}원`. New `monthSettlement` memo sums the view month (income via `kind === 'income'`, spending otherwise; `no_spend` is amount 0 so harmless). Both totals always shown, including `0원`. No net / balance / 차액 — two independent numbers, body color, no card/border/heading.
- **Chart y-axis full numbers** (`src/components/stats/MonthAmountChart.tsx`): y-labels now `toLocaleString()` (e.g. `72,000`) instead of `fmtAmt` 만/천 compaction. `Y_AXIS_W` 52→60 with a `numberOfLines={1}` truncation guard for extreme values. `fmtAmt` deleted from the helpers and its 5 unit tests removed.
- **Chart x-axis all-day labels** (`src/components/stats/MonthAmountChart.tsx`): every day 1..N is labelled at fontSize 8 (was weekly 1/8/15/22/29). In-code note documents the sparse-label fallback if it reads too dense on-device.
- **Record income 0원 default** (`src/pages/record.tsx`): the income-mode amount hero now shows `0원` when empty (was blank). Amount parse extracted to a tested helper `src/utils/amount.ts` (`parseAmountInput` — always returns a number; blank/junk → 0, so a raw string can never reach `Expense.amount`). Income stays optional / 0-saveable; no validation pressure.

### Direction — scoped policy exception
The settlement line shows an **income total** for the first time. This is a deliberate, **scoped** reversal of the no-income-totals rule, limited to that one quiet line: still no balance / net / 순수익 / 차액 / comparison anywhere, and per-record display surfaces still hide `월급 0원` (stats income row + photocard). See `docs/superpowers/specs/2026-05-24-monthly-settlement-and-readability-design.md` and memory `feedback_sobagi_allowance_giving_scene.md`.

### Preserved (regression-confirmed)
Observation block (cadence lines + top-scene chip + observation line), calendar grid + daily cell totals (still spending-only), month nav/picker, day-card income section + photocard per-record amount-hiding (no `월급 0원`), no-spend / reaction / edit flows, income save/edit, types, storage.

### Known risk
All-day x-labels at 8px may read dense on small phones — fallback (sparse `1 / 5 / 10 / 15 / 20 / 25 / 30` or every-other) is documented in-code for an on-device tuning pass.

### No new storage keys

### Test count
**19 suites · 301 tests · all green.** (Net +1 over the 300 baseline: +6 new `amount` tests / +1 suite, −5 removed `fmtAmt` tests.)

### Next
Rest-TV production ad group ID swap; photocard small polish (time-of-day label / Sobagi signature / early-dismiss guard); Android keyboard verification; on-device chart x-label density check (apply sparse fallback if needed); two product items from the income-system handoff for review.

---

### Earlier handoff (Stats amount chart)

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Stats amount chart

### What changed (amount chart)
- **`MonthPresenceRow` → `MonthAmountChart`** (`src/components/stats/MonthAmountChart.tsx`): the bottom graph on the Stats screen became a spending bar chart. x = day of month; y = daily spending total. (y-axis labels later switched from `fmtAmt` compaction to full comma numbers — see Latest Handoff.) Today and selected-day bars highlighted. Tap-to-select wired to `selectedDay` / `setSelectedDay` in `stats.tsx`.
- **New helpers** (`src/components/stats/monthAmountChart.helpers.ts`): pure functions `barHeightFor`, `selectMaxTotal` (and originally `fmtAmt`, since removed) — no React, no SDK, no storage.
- **`MonthPresenceRow.tsx` deleted**: file removed; no references remain in `src/`.

### Direction (amount chart)
Conscious reversal of the 2026-05-22 stats-evolution "no Y-axis / no tappable presence row / bar trend graph gone" decision, scoped to the Stats bottom graph only. See amendment note in `docs/superpowers/specs/2026-05-22-stats-evolution-design.md`. The rest of the app identity (cozy companion, quiet income, no finance dashboard) is unchanged.

---

### Earlier handoff (stress-test hardening sweep — 9 fixes)

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Stress-test hardening sweep (9 fixes — robustness/overflow/race audit)

### What changed (stress-test sweep)
- **Bug A — delete recompute** (`expenseService.deleteExpense`, `userStore`): deleting a record now recomputes `recordedDaysCount`, `streak`, and `totalRecordCount` from the remaining expenses + persists. Previously deletion left level/tier/streak inflated until the next app init. New `setRecordedDaysCount` / `setTotalRecordCount` store actions.
- **Bug B — calendar amount overflow** (`stats.tsx`): `dayAmount` cell clamped to `numberOfLines={1}` + tail ellipsis so max-input totals (9,999,999,999) can't wrap and bloat the grid.
- **Bug C — double-save race** (`record.tsx`): `isSavingRef` synchronous guard on `handleSave`/`handleNoSpend` prevents a fast double-tap from slipping a second save past the async `isSaving` state.
- **Bug D — income row UX** (`stats.tsx`): income rows in the day card gained a divider between rows + a chevron, matching the spending list's edit affordance.
- **Edge E — id collisions** (`utils/id.ts`): `generateExpenseId()` (timestamp + 6 random base36) replaces `Date.now().toString()` so same-ms saves can't collide.
- **Edge F — storage durability** (`storageService`): `save` retries a transient write failure once and returns a success boolean; `saveExpense` awaits the EXPENSES/USER writes instead of fire-and-forget. Serialization failures aren't retried.
- **Edge G — foreground refresh** (`useAppInit`): an `AppState` 'active' listener refreshes the visit-date anchor when the app returns from background across a day boundary (the one-time init won't re-run). Does not re-trigger found-item/placement/letter logic.
- **Edge H — timezone stability** (`Expense.localDate` + `expenseLocalDate` helper): records capture their local calendar date at creation; all 27 day-grouping read sites route through the helper (prefers `localDate`, falls back to `createdAt`-derived for legacy). Behavior-preserving for non-travelers; stabilizes a record's day across tz changes.
- **Edge I — midnight race** (`emotionStore.lastKind`): the reaction title's kind is carried on the emotion store at save time rather than re-derived from `getTodayExpenses()`, so a midnight rollover between save and reaction render can't mis-resolve it.

### Test count
**17 suites · 285 tests · all green.** (+5 expenseLocalDate, +3 storageService over the post-QA sweep's 277.)

---

### Earlier handoff (sub-spec C post-QA polish sweep — 5 fixes)

### What changed (post-C sweep)
- **Bug fix — calm-day income contamination** (`src/services/atmosphereService.ts`): `computeCalmDayCount` now filters `kind === 'income'` before computing daily totals. Previously, a large salary deposit could push a low-spending day above the 10,000 KRW calm threshold, and an income-only day with no spending could falsely count as calm. Affected two surfaces: `getCalmAtmosphereOpacity` (HomeScreen brightening) and `selectStatsObservation`'s calm branch. +4 regression tests covering the contamination paths.
- **Bug fix — edit sheet rejected amount=0 income** (`src/pages/stats.tsx`): `commitEdit`'s `parsed <= 0` guard silently rejected income records edited to amount 0, even though the save flow explicitly allows this (income's `금액 (선택)` affordance). Spending edits still require a positive amount.
- **Bug fix — `isFirstRecordToday` consumed by income** (`src/pages/record.tsx`): A salary deposit logged at 10am was consuming the 'surprised' welcome slot from the user's first spending touchpoint later that day. `isFirstRecordToday` now filters `kind !== 'income'`. No-spend records still count toward the slot since they're deliberate presence check-ins.
- **Polish — `getReactionTitle` kind-aware** (`src/pages/reaction.tsx`): Title surface above Sobagi now branches on the latest record's kind. Income titles use a separate 3-tier track (`오늘은 든든한 날이에요 🌿` / `들어온 날이네요 🍃` / `들어왔네요 🍃`) with wording distinct from `INCOME_REACTION_POOLS`, so title + bubble complement rather than duplicate. New `latestKind` derivation reads the last record from `getTodayExpenses()`.
- **Polish — income row userEmotion display** (`src/pages/stats.tsx`): Income picker already accepted `userEmotion` but the saved value was never surfaced. Income rows in the stats day card now show the emoji between label and amount, matching the spending list's emotion column. Existing income records with saved emotions start showing immediately.

### Test count
**16 suites · 277 tests · all green.** (+4 from the calm-day income regression tests.)

---

### Earlier handoff (sub-spec C landing)

**Group:** Income system integration (sub-spec C — closes the "Income records" decomposition A→B→C)

### What changed
- **Emotion engine** (`src/services/emotionEngine.ts`): new private `evaluateIncome` subroutine. 2-rule chain: `currentHour >= 22` → `'sleepy'`, else → `'happy'`. `evaluate()` routes `kind === 'income'` through it as the first branch. Spending chain (5 rules) unchanged.
- **Caller migration** (`src/pages/record.tsx`): removed the `derivedKind === 'income' ? 'happy' : evaluate(...)` ternary. `evaluate(...)` is now called unconditionally with `kind: derivedKind` in the synthetic expense argument. The engine is the single source of truth for emotion resolution.
- **Dialogue** (`src/constants/dialogue.ts`, `src/services/dialogueService.ts`): new `INCOME_REACTION_POOLS` indexed by tier only (3 tiers × 3 lines). `selectReactionMessage(emotion, tier, kind = 'spending')` — third param defaulted to `'spending'` for backward compat. Income calls return from the income pool; emotion is ignored on income (kind-gated, not emotion-gated). `REACTION_POOLS` and `OBSERVATION_POOLS` untouched. Vocabulary guard test sweeps all 14 spec-banned terms × 9 income lines.
- **Caller migration** (`src/pages/record.tsx`): `selectReactionMessage(sobagiEmotion, tier, derivedKind)` now passes the third arg explicitly.
- **MonthPresenceRow** (`src/components/stats/MonthPresenceRow.tsx`, `src/pages/stats.tsx`): `DayCellData` extended with `hasRecord: boolean` and `hasOnlyNoSpend: boolean`. `glyphFor` checks `hasOnlyNoSpend` first (→ `🌿`), then `hasRecord` (→ `●`). Income-only days now render `●`. `stats.tsx` accumulator (`expensesByDate`) populates both new fields BEFORE the `kind === 'income' continue`, so income counts as presence but not toward day total. Per-day reducer type extracted to named `DayAccum`.
- **Night pattern detector** (`src/services/roomPresenceService.ts`): `hasNightPattern` now filters `kind !== 'income'` at the function entry so income timestamps (e.g., late-night salary deposit notifications) don't impersonate user late-night presence. Parameter name preserved; only internal reference renamed.
- **Stats observation** (`src/services/statsObservationService.ts`): new helper `computeIncomeDayCount` (counts distinct income days in trailing 30, using a `Set<string>`). New branch in `selectStatsObservation` at position 4 (after calm-day, before streak ≥ 7): when `>= 2` income days in last 30 → returns `'들어온 일이 종종 있었어요 🍃'`. Lifestyle texture (cafe / night / calm) still wins. Multiple income records on the same day count as 1.
- **Tests**: +23 across `__tests__/emotionEngine.test.ts` (8), `__tests__/dialogueService.test.ts` (7), `src/services/__tests__/roomPresenceService.test.ts` (2), `__tests__/statsObservationService.test.ts` (6). Includes explicit negative tests proving income emotion ignores `isFirstRecordToday`, `amount`, `currentStreak`, and that `'surprised'` is never returned for income across any context combination. Final count: 16 suites / 273 tests, all green. (Later sweeps brought this to 17 suites / 285 — see top handoff.)
- **Memory**: `feedback_sobagi_allowance_giving_scene.md` narrowed (controller task). The 2026-05-19 blanket ban on "income tracking" was clarified to target *gameified* tracking only (totals, balance, savings, comparison framing) — sub-specs A/B/C added income as a quiet observational shape, which is permitted.

### What's now working
- Income save at any hour resolves through `evaluateIncome` with warmth tone, never event/celebration tone.
- Dialogue for income is kind-gated and tonally coherent across all tier × emotion combinations.
- Stats screen surfaces income as quiet recurrence (`들어온 일이 종종 있었어요 🍃`), never as number or comparison.
- MonthPresenceRow reads income-only days as presence (`●`) without categorizing them as a financial event.
- Night pattern stays anchored to user behavior, not system-generated income timestamps.

### Preserved (regression-confirmed)
- `SobagiEmotion` union — unchanged 5 tokens (`'happy' | 'excited' | 'surprised' | 'sleepy' | 'soft-sad'`).
- `EMOTION_MESSAGES`, `VALID_EMOTIONS`, mood asset resolver — untouched.
- `expenseService.recordNoSpend` — still emits `'happy'`.
- `restService` / pebble jar / rest letters — untouched. No new code path writes pebble state.
- `foundItemService` T1/T2/T3/T4 — kind-agnostic presence-shape triggers preserved (T1/T2/T3 count income as presence; T4 is category-gated).
- `hasCategoryPattern` (cafe), `computeCalmDayCount` (atmosphere) — kept spending-keyed.
- Photocard components — sub-spec B baseline untouched.
- Storage keys, schema, hydration shape — no additions, no migrations.

### Surfaced for product review (not landed)
- **Tier 2/3 income dialogue copy differentiation**: code-quality review of Task 3 noted that tier 2's first line ("들어온 날이 있네요") reads flat, and tier 3 recycles "든든" framing from tier 1, weakening the tier progression. Copy review pass recommended.
- **Calendar (🌿) vs MonthPresenceRow (●) visual mismatch on income-only days**: spec keeps the calendar grid out of sub-spec C scope (Section 15) — calendar still uses `data.total === 0` discriminator, so an income-only day shows `🌿` on the calendar while `●` on the presence row. May be intentional (two semantic axes — spend amount vs visit shape) but worth a product call before considering it final.

### What the next agent must NOT do
- Add a new `SobagiEmotion` token (`'calm'` / `'relief'` / `'warm'` / etc.).
- Re-route income to `'surprised'` on first-of-day, or any context-combination-routed event tone.
- Grant pebbles on any income code path.
- Introduce income totals, net balance, or comparison framing anywhere.
- Add a differentiated MonthPresenceRow glyph for income.
- Touch `hasCategoryPattern`, `computeCalmDayCount`, or T4 to "include" income — they are spending-keyed by design.
- Re-introduce the `derivedKind === 'income' ? 'happy' : evaluate(...)` ternary in `record.tsx`.
- Add per-category income observations to `selectStatsObservation`.

### No new storage keys
No storage keys were added, removed, or renamed.

### Next
The "Income records" decomposition (A → B → C) is complete. Backlog items in `SOBAGI_NEXT_PRIORITIES.md` resume normal priority order: rest-TV production ad ID swap, photocard small polish (time-of-day label / Sobagi signature / early-dismiss guard), Android keyboard verification, two product items above for review.

---

## System Status

### Fully implemented

| System | Location |
|---|---|
| HomeScreen room (time-of-day backgrounds) + atmosphere overlays | `src/pages/index.tsx`, `src/services/atmosphereService.ts`, `src/constants/assets.ts` |
| Sobagi character (float + spring pop) | `src/components/SobagiCharacter.tsx` |
| Tap-to-talk ambient voice (context engine: time/no-spend/accumulation/return/object/atmosphere/rare + silence) | `src/pages/index.tsx`, `src/services/ambientDialogueService.ts`, `src/constants/ambientDialogue.ts` |
| Level chip + progress bar | `src/pages/index.tsx` |
| DailySummary card | `src/pages/index.tsx` |
| Record flow (amount, category, emotion, memo, date chips) | `src/pages/record.tsx` |
| No-spend daily record ("오늘은 무지출이에요" → 0-amount, category `no_spend`) | `src/pages/record.tsx`, `src/services/expenseService.ts` (`recordNoSpend`) |
| Emotion engine (5-rule priority chain) | `src/services/emotionEngine.ts` |
| Dialogue tier system (3 tiers × 5 emotions + 4 observation types) | `src/constants/dialogue.ts`, `src/services/dialogueService.ts` |
| Reaction screen (tier-aware title, floating hearts, photocard button) | `src/pages/reaction.tsx` |
| Photocard — **vertical** card (landscape mood scene banner on top via `getPhotocardMoodAsset`, the day's record below; `selectVisibleRecords` caps visible rows at 4 + overflow; scene-centered — grouped records + 🌱 quote, no totals/breakdowns); 3:2 landscape mood assets | `src/components/photocard/PhotocardView.tsx`, `src/components/photocard/photocardGrouping.ts`, `src/services/photocardMoodService.ts` |
| Stats / calendar + trend graph | `src/pages/stats.tsx` |
| Per-day photocard entry point in stats | `src/pages/stats.tsx` |
| DayFeelingCard (8 buckets, observational) | `src/components/stats/DayFeelingCard.tsx`, `src/services/dayFeelingService.ts` |
| Mailbox (dynamic: milestone + seasonal letters) | `src/services/letterService.ts`, `src/constants/letters.ts` |
| Bag "Discover & Keep" (`{queue,kept}` in `discoveryStore`, hydrated by `useAppInit`, consumed reactively by Home; room shows one tappable arrival from the queue; tap → kept via store `keep` + item-specific `pickupLineFor`; bag = keepsake grid of kept items, `ScrollView`-bounded; tap a keepsake → note via `keepsakeLineFor`; fresh install starts empty + arrives in-room, existing user migrates owned→kept; minDays = arrival schedule) | `src/services/discoveryService.ts`, `src/store/discoveryStore.ts`, `src/hooks/useAppInit.ts`, `src/pages/index.tsx`, `src/constants/bagItems.ts` |
| Found item system (4 triggers, T3 activity-based not amount-based, eval on first-of-day saveExpense, staged delivery via app-init promote) — trinkets still use the legacy bag-appear path (pending promoted + cleared atomically on bag open); *displayed* in the keepsake grid (unification = future follow-up) | `src/services/foundItemService.ts`, `src/services/expenseService.ts`, `src/hooks/useAppInit.ts`, `src/constants/findableItems.ts` |
| Room presence — selection now **enqueues** a discovery (category/streak/night/emotion early-bring); no longer writes `ROOM_PLACEMENTS`; `PendingPlacement` settle path retired | `src/services/roomPresenceService.ts`, `src/hooks/useAppInit.ts`, `src/pages/index.tsx` |
| summaryCard boundary dissolve | `src/pages/index.tsx` |
| Memo suggestions (5-7 hints per category, append with `', '`, 60-char cap) | `src/components/expense/MemoSuggestions.tsx`, `src/constants/categories.ts` |
| Wrapped category chip layout (all 12 scene tokens visible at once) | `src/components/expense/CategorySelector.tsx` |
| Retrospective no-spend records (past dates, copy adapts to today vs past) | `src/pages/record.tsx`, `src/services/expenseService.ts` |
| Save-helper for 0원 amount (gentle pointer to no-spend flow) | `src/pages/record.tsx` |
| 쉬어가기 TV — soft rewarded-ad system (5-20 pebble grant, 60-min warmth fade, rest letters at 30/100/250/500/1000 thresholds, jar with 4 fill stages, 2-per-day cap, daily reset via `effectiveRestsToday`) | `src/services/restService.ts`, `src/hooks/useRestedAd.ts`, `src/components/room/RestTV.tsx`, `src/components/room/PebbleJar.tsx`, `src/components/room/RestPrompt.tsx`, `src/constants/restLetters.ts`, `src/constants/ads.ts`, `src/pages/index.tsx` |
| Stats screen evolution — 결산 block replaced by 3-group observation (cadence lines → top-scene chip → rotating observation); monthly settlement line under the month label (`쓴 돈` / `들어온 돈`, two separate totals, scoped income-total exception); MonthTrendGraph → MonthPresenceRow → MonthAmountChart (bar chart, x=day all-day labels, y=spending full-comma labels, tap-to-select; `fmtAmt` removed); calendar amount color softened; `selectStatsObservation` 7-branch chain | `src/pages/stats.tsx`, `src/services/statsObservationService.ts`, `src/components/stats/MonthAmountChart.tsx`, `src/components/stats/monthAmountChart.helpers.ts` |
| Income record system (sub-specs A/B/C) — `RecordKind` type; 5 income category tokens; `kindForCategory` / `INCOME_CATEGORIES` / `GENERAL_SPENDING_CATEGORIES` helpers; `normalizeExpense` hydration; record screen kind toggle; photocard 3-way grouped layout (쓴 기록 / 들어온 기록 / 무지출, `totalBlock` removed); `todayHasSpending` gate on reaction screen; `evaluateIncome` 2-rule subroutine (hour ≥ 22 → `'sleepy'`, else → `'happy'`); `INCOME_REACTION_POOLS` kind-gated dialogue (3 tiers × 3 lines); `MonthPresenceRow` income-only days render `●`; `hasNightPattern` filters income timestamps; `selectStatsObservation` income branch (`들어온 일이 종종 있었어요 🍃` at ≥ 2 income days in 30) | `src/types/index.ts`, `src/constants/categories.ts`, `src/constants/dialogue.ts`, `src/services/expenseService.ts`, `src/services/emotionEngine.ts`, `src/services/dialogueService.ts`, `src/services/roomPresenceService.ts`, `src/services/statsObservationService.ts`, `src/hooks/useAppInit.ts`, `src/pages/record.tsx`, `src/pages/stats.tsx`, `src/pages/reaction.tsx`, `src/components/photocard/PhotocardView.tsx`, `src/components/photocard/photocardGrouping.ts`, `src/components/stats/MonthPresenceRow.tsx`, `src/store/expenseStore.ts` |

### Planned (designed, not built)

| System | Blocked on |
|---|---|
| Room stage 2–5 | Image assets; one-line change in `constants/assets.ts` |
| Sobagi idle behaviors | Image assets |
| Seasonal room ambience | Design + assets |
| Year-end recap | — |
| Implicit accumulation triggers (cafe pattern, streak, night activity, calm low-spend days, weekend leisure) | Next: cafe → mug as proof-of-feel |

### Explicitly rejected

Push notifications · streak anxiety framing · achievement badges · budget limits / savings goals ·
social sharing / leaderboards · spending advice / behavioral nudges · gamified unlock announcements ·
EXP point system · finance dashboard summaries · slot pickers · drag-and-drop room decoration ·
furniture management UI · inventory-to-room transfer flows · "you unlocked X for your room" messaging

---

## Storage Keys

All keys defined in `src/constants/storage.ts`.

```
sobagi-user                    → UserState
sobagi-expenses                → Expense[]
sobagi-last-emotion            → SobagiEmotion
sobagi-mailbox-read-ids        → string[]
sobagi-mailbox-delivered-ids   → string[]
sobagi-found-item-ids          → string[]
sobagi-pending-item-id         → string | null
sobagi-staged-item-id          → string | null
sobagi-last-item-date          → string (YYYY-MM-DD)  cooldown for found item staging
sobagi-last-bag-open-days      → number               LEGACY — drove the removed bag dot; now unreferenced (Stage-5 cleanup)
sobagi-last-visit-date         → string (YYYY-MM-DD)  gap detection
sobagi-observation-save-count  → number               cooldown for observation messages
sobagi-room-placements         → RoomPlacement[]      LEGACY — migrated into kept, no longer rendered/written
sobagi-pending-placement       → PendingPlacement|null LEGACY — settle path retired (Discover & Keep)
sobagi-category-migration-done → boolean  one-time flag for legacy category migration
sobagi-kept-item-ids           → string[]              keepsake bag contents (discovered & picked up)
sobagi-discovery-queue         → string[]              arrived-but-not-yet-kept; index 0 shows in room
sobagi-discovery-migration-done→ boolean               one-time Discover & Keep migration guard
sobagi-pebble-count            → number               accumulates forever (rest TV reward)
sobagi-rests-today             → number               0-2, normalized via effectiveRestsToday
sobagi-last-rest-date          → string (YYYY-MM-DD)  day-rollover anchor for rests-today
sobagi-last-rest-at            → ISO string           drives 60-min rest-warmth fade
```

---

## Known Issues

### Long-term pacing
- Floating hearts on every record — charming at #1, performative by #30
- Dialogue tier transitions are hard thresholds — tone shifts abruptly at day 7 and day 30

### Technical
- Android keyboard behavior in record.tsx unverified

---

## Architecture Reference

**Stack:** React Native 0.84 · React 19 · TypeScript 5.8 (`noUncheckedIndexedAccess: true`) · Zustand 5 · Granite SDK 1.0.25

**Stores:** `useEmotionStore` (emotion, message) · `useExpenseStore` (expenses[]) · `useUserStore` (level, streak, recordedDaysCount, roomStage) · `useDiscoveryStore` (discovery queue, kept)

**Services:** `storageService` · `expenseService` · `emotionEngine` · `dayFeelingService` · `foundItemService` · `atmosphereService` · `dialogueService` · `letterService`

**Routes:** `/` · `/record` · `/reaction` · `/stats`

**Build:** `npm run dev` / `npm run build` / `npm run clean` / `npm test` / `npm run typecheck`

**Assets:** jsDelivr CDN, pinned to git SHA. All maps `Partial<Record<...>>` — fallback required everywhere.

For full architecture: see `docs/ARCHITECTURE.md`.

---

## Progression Reference

**Metric:** `recordedDaysCount` — distinct local calendar days with ≥ 1 expense. Recomputed from full expense array on every app init.

| Level | Days | Progression anchor |
|---|---|---|
| Lv.1 | 0 | Day one |
| Lv.2 | 7 | Dialogue tier 2; first found item fires; warmth first perceptible |
| Lv.3 | 20 | — |
| Lv.4 | 40 | — |
| Lv.5 | 70 | — |
| Lv.6 | 110 | Warmth noticeable |
| Lv.7 | 160 | — |

Dialogue tier 3 activates at day 30. Warmth ceiling (0.06 opacity) at day 90.
Thresholds are slow — no reward for binging, only for consistent presence.

---

## Bag Accumulation Schedule

| Day | Item | Tab |
|---|---|---|
| 0 | 꽃잎 핀 🌸 | 장신구 |
| 0 | 찻잎 🍃 | 재료 |
| 0 | 버터 쿠키 🍪 | 간식 |
| 3 | 요요 🪀 | 장난감 |
| 5 | 잎새 브로치 🌿 | 장신구 |
| 7 | 도토리 🌰 | 재료 |
| 10 | 쑥 경단 🍡 | 간식 |
| 12 | 작은 풍선 🎈 | 장난감 |
| 14 | 달 반지 🌙 | 장신구 |
| 18 | 꿀병 🍯 | 재료 |
| 20 | 따뜻한 커피 ☕ | 간식 |
| 22 | 팽이 🌀 | 장난감 |
| 25 | 작은 리본 🎀 | 장신구 |
| 32 | 나뭇조각 🪵 | 재료 |
| 35 | 작은 빵 🍞 | 간식 |
| 40 | 작은 곰 🧸 | 장난감 |

Under "Discover & Keep", `minDays` is the **arrival schedule**: when an item becomes eligible it joins the discovery queue and appears in the room to be found & kept (not a greyed catalog cell). Pattern triggers (cafe/streak/night) can bring specific items earlier. The bag shows only what's been picked up.

---

*Update this document when system status changes. Do not use it as a log.*
