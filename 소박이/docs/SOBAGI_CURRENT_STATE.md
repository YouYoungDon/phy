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
**Date:** 2026-05-24
**Group:** Stats amount chart

### What changed
- **`MonthPresenceRow` → `MonthAmountChart`** (`src/components/stats/MonthAmountChart.tsx`): the bottom graph on the Stats screen is now a spending bar chart. x = day of month; y = daily spending total. y-axis compact labels (`max` / `mid` / `0`) formatted via `fmtAmt` (e.g. `12만`, `5천`) with 3 faint gridlines. Weekly date labels at days 1 / 8 / 15 / 22 / 29. Today and selected-day bars highlighted. Tap-to-select wired to `selectedDay` / `setSelectedDay` in `stats.tsx`.
- **New helpers** (`src/components/stats/monthAmountChart.helpers.ts`): pure functions `fmtAmt`, `barHeightFor`, `selectMaxTotal` — no React, no SDK, no storage.
- **New tests** (`__tests__/monthAmountChart.helpers.test.ts`): 15 unit tests covering `fmtAmt` (zero / sub-1000 / thousands / ten-thousands / hundred-thousands / millions / boundary), `barHeightFor` (zero-max / proportion / clamp / full-height), `selectMaxTotal` (empty / all-zero / normal / spending-only).
- **`MonthPresenceRow.tsx` deleted**: file removed; no references remain in `src/`.

### Direction
Conscious reversal of the 2026-05-22 stats-evolution "no Y-axis / no tappable presence row / bar trend graph gone" decision, scoped to the Stats bottom graph only. See amendment note in `docs/superpowers/specs/2026-05-22-stats-evolution-design.md`. The rest of the app identity (cozy companion, quiet income, no finance dashboard) is unchanged.

### What's working
- The bottom graph is a readable spending bar chart; tapping a bar selects that day (calendar highlight + day card update).
- Income excluded from bars (spending-only `total`).

### Preserved (regression-confirmed)
Observation block (cadence lines + top-scene chip + observation line), day card (spending list + income section), photocard entry, edit/delete sheet, calendar grid, month nav/picker.

### No new storage keys

### Test count
**18 suites · 300 tests · all green.** (+1 suite, +15 tests over the stress-test sweep's 285.)

### Next
Rest-TV production ad group ID swap; photocard small polish (time-of-day label / Sobagi signature / early-dismiss guard); Android keyboard verification; two product items from the income-system handoff for review.

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
| HomeScreen room + atmosphere overlays | `src/pages/index.tsx`, `src/services/atmosphereService.ts` |
| Sobagi character (float + spring pop) | `src/components/SobagiCharacter.tsx` |
| Tap-to-talk speech bubble (12 idle messages) | `src/pages/index.tsx` |
| Level chip + progress bar | `src/pages/index.tsx` |
| DailySummary card | `src/pages/index.tsx` |
| Record flow (amount, category, emotion, memo, date chips) | `src/pages/record.tsx` |
| No-spend daily record ("오늘은 무지출이에요" → 0-amount, category `no_spend`) | `src/pages/record.tsx`, `src/services/expenseService.ts` (`recordNoSpend`) |
| Emotion engine (5-rule priority chain) | `src/services/emotionEngine.ts` |
| Dialogue tier system (3 tiers × 5 emotions + 4 observation types) | `src/constants/dialogue.ts`, `src/services/dialogueService.ts` |
| Reaction screen (tier-aware title, floating hearts, photocard button) | `src/pages/reaction.tsx` |
| Photocard — split-layout landscape (mood asset + spending summary) | `src/components/photocard/PhotocardView.tsx`, `src/services/photocardMoodService.ts` |
| Stats / calendar + trend graph | `src/pages/stats.tsx` |
| Per-day photocard entry point in stats | `src/pages/stats.tsx` |
| DayFeelingCard (8 buckets, observational) | `src/components/stats/DayFeelingCard.tsx`, `src/services/dayFeelingService.ts` |
| Mailbox (dynamic: milestone + seasonal letters) | `src/services/letterService.ts`, `src/constants/letters.ts` |
| Bag accumulation (21 items across 4 tabs, minDays thresholds) | `src/constants/bagItems.ts`, `src/pages/index.tsx` |
| Found item system (4 triggers, T3 activity-based not amount-based, eval on first-of-day saveExpense, staged delivery via app-init promote) | `src/services/foundItemService.ts`, `src/services/expenseService.ts`, `src/hooks/useAppInit.ts`, `src/constants/findableItems.ts` |
| Bag new-item amber dot | `src/pages/index.tsx`, `src/constants/storage.ts` |
| Room presence — silent ambient placement (B/A/C paths, drift, auto-settle) | `src/services/roomPresenceService.ts`, `src/hooks/useAppInit.ts`, `src/pages/index.tsx` |
| summaryCard boundary dissolve | `src/pages/index.tsx` |
| Memo suggestions (5-7 hints per category, append with `', '`, 60-char cap) | `src/components/expense/MemoSuggestions.tsx`, `src/constants/categories.ts` |
| Wrapped category chip layout (all 12 scene tokens visible at once) | `src/components/expense/CategorySelector.tsx` |
| Retrospective no-spend records (past dates, copy adapts to today vs past) | `src/pages/record.tsx`, `src/services/expenseService.ts` |
| Save-helper for 0원 amount (gentle pointer to no-spend flow) | `src/pages/record.tsx` |
| 쉬어가기 TV — soft rewarded-ad system (5-20 pebble grant, 60-min warmth fade, rest letters at 30/100/250/500/1000 thresholds, jar with 4 fill stages, 2-per-day cap, daily reset via `effectiveRestsToday`) | `src/services/restService.ts`, `src/hooks/useRestedAd.ts`, `src/components/room/RestTV.tsx`, `src/components/room/PebbleJar.tsx`, `src/components/room/RestPrompt.tsx`, `src/constants/restLetters.ts`, `src/constants/ads.ts`, `src/pages/index.tsx` |
| Stats screen evolution — 결산 block replaced by 3-group observation (cadence lines → top-scene chip → rotating observation); MonthTrendGraph → MonthPresenceRow → MonthAmountChart (bar chart, x=day, y=spending, tap-to-select); calendar amount color softened; `selectStatsObservation` 7-branch chain | `src/pages/stats.tsx`, `src/services/statsObservationService.ts`, `src/components/stats/MonthAmountChart.tsx`, `src/components/stats/monthAmountChart.helpers.ts` |
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
sobagi-last-bag-open-days      → number               for new-item dot
sobagi-last-visit-date         → string (YYYY-MM-DD)  gap detection
sobagi-observation-save-count  → number               cooldown for observation messages
sobagi-room-placements         → RoomPlacement[]      items currently in the room
sobagi-pending-placement       → PendingPlacement|null delayed placement (silent settle)
sobagi-category-migration-done → boolean  one-time flag for legacy category migration
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

**Stores:** `useEmotionStore` (emotion, message) · `useExpenseStore` (expenses[]) · `useUserStore` (level, streak, recordedDaysCount, roomStage)

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

Hidden items render as vacant cells (opacity 0.38, dot). No unlock animation, no announcement.

---

*Update this document when system status changes. Do not use it as a log.*
