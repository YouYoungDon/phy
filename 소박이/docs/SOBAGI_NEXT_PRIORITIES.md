# Sobagi — Next Priorities

**Last updated:** 2026-05-24 (Design — sub-spec C spec + plan ready for engineering)
**Branch:** apps-in-toss-clean

This is the ordered work queue. Keep it short. Strike through completed items. Move done work to SOBAGI_CURRENT_STATE.md.

---

## Currently in progress

*(Nothing claimed.)*

---

## Up next (ordered by priority)

- [x] ~~**Photocard 3-way redesign (sub-spec B)**~~ — landed 2026-05-24. Spec at `docs/superpowers/specs/2026-05-23-photocard-3-way-design.md`, plan at `docs/superpowers/plans/2026-05-23-photocard-3-way.md`. See `SOBAGI_CURRENT_STATE.md` for handoff and `Recently completed` below for commit list.
- [ ] **Income record system integration (sub-spec C)** — **READY FOR ENGINEERING.** Spec at `docs/superpowers/specs/2026-05-24-income-system-integration-design.md`, plan at `docs/superpowers/plans/2026-05-24-income-system-integration.md`. 9 tasks; baseline HEAD `13b3691`. Key decisions locked: 2-rule `evaluateIncome` (hour ≥ 22 → `'sleepy'`, else → `'happy'`; amount/streak/first-of-day explicitly ignored, with negative tests); `INCOME_REACTION_POOLS` kind-gated; no pebble grants on income; no new emotion token; `MonthPresenceRow` income-only days render `●`; `hasNightPattern` filters income; `selectStatsObservation` gains one quiet income branch at ≥ 2 income days in 30. Memory file `feedback_sobagi_allowance_giving_scene.md` narrowing is Task 8 (controller, in plan).

---

## Backlog (ordered by impact)

- [ ] **Rest-TV: swap dev ad group ID for production** — `src/constants/ads.ts` exports `REST_AD_GROUP_ID = 'ait.dev.43daa14da3ae487b'` (the AppsInToss dev test ID). Before release, replace with the production rewarded ad group ID issued in the AppsInToss console. One-line change.
- [ ] **Rest-TV: rare ambient item delivery at 500/1500/3000 pebbles** — hook exists in `restService.grantRest` as a TODO marker; item pool and delivery shape need a separate spec. Out of scope of the initial rest-TV landing.
- [ ] **Rest-TV: on-device visual QA on small phones** — verify TV+mailbox cluster, jar fill stages, and post-watch bubble all read calmly on iPhone SE-class widths. Code-level dimensional QA passed; live-device check pending.
- [ ] **Photocard: add time-of-day label at card top** — date (top-left) + time-of-day icon (아침☀️ / 낮🌤 / 저녁🌅 / 밤🌙, top-right); derives from `currentHour` already available in `reaction.tsx`; adds "snapshot of a moment" specificity
- [ ] **Photocard: add "Sobagi" signature** — small muted label between `quotePanel` and `contextStrip`; authorial anchor per spec
- [ ] **Photocard: guard early dismiss during animation** — add `isRevealing` state in `reaction.tsx`; disable `photocardModal onPress` for first 1800ms so the reveal animation always plays fully
- [ ] **Android keyboard behavior** — investigate whether save button is accessible
- [ ] **Floating hearts pacing** — charming on record #1, noise by record #30; reduce or remove after N records

---

## Blocked on assets

- **Room stage 2+** — architecture ready (`getRoomStage()` written), blocked on image assets; one-line change in `constants/assets.ts` when art exists
- **Sobagi idle behaviors** — reading/napping/window variants; blocked on images

---

## Future implicit-accumulation triggers

Each follows the same pattern: pure functions first, safety tests, then minimal integration. Stabilize each on-device before adding the next.

- Weekend leisure spending → cozy floor items

---

## Explicitly deferred / out of scope

See `SOBAGI_PHILOSOPHY.md` and `SOBAGI_CURRENT_STATE.md` for the full rejection list.

- Push notifications
- Social features
- Budget limits or savings goals
- Achievement badges
- Finance dashboard improvements
- Slot pickers / drag-and-drop / explicit decoration UI

---

## Claiming work

Before starting a task, add your role in parentheses: `- [ ] Task name (Engineering)`.
After completing it, update `SOBAGI_CURRENT_STATE.md` and move this item to the "Recently completed" section below.

---

## Recently completed

- [x] **Photocard 3-way layout (sub-spec B)** — `PhotocardRecord` type + pure `groupByKind` helper extracted to `photocardGrouping.ts` (no RN imports, unit-testable). `PhotocardView` right panel restructured: `totalBlock` (`총 금액 ₩ X` at 18pt bold) removed entirely; records render in up to 3 grouped sub-sections (쓴 기록 / 들어온 기록 / 무지출) with 9pt muted group labels; `VISIBLE_RECORDS = 3` cap applied across groups in order (spending → income → noSpend); `amount` prop deprecated, no longer destructured. `reaction.tsx` new `todayHasSpending` gate suppresses photocard button on income-only / no-spend-only saves (auto-dismiss still runs); `todaySpendingExpenses` renamed to `photocardSourceRecords`. `stats.tsx` photocard records source switched to `selectedExpenses.filter(no_spend)` so income flows into PhotocardView; entry-point gate `selectedSpendingExpenses.length > 0` unchanged. 7 new groupByKind tests (250 total). No storage changes; no emotion-engine / dialogue / pebble service touches. Commits `fb2d020` → `422bbb4`. (2026-05-24)
- [x] **Income record data model (sub-spec A)** — `RecordKind` type; 5 income category tokens (`salary`, `bonus`, `refund`, `received_gift`, `received_allowance`); `kindForCategory` / `INCOME_CATEGORIES` / `GENERAL_SPENDING_CATEGORIES` helpers; `PICKER_CATEGORIES` removed; `normalizeExpense` hydration at read path; record screen kind toggle + picker swap + optional amount; photocard `kind?` interim patch; stats income section + spending/top-category filter exclusions; `ExpensePatch.kind` required. 7 new categoryRegistry + 7 expenseHydration tests (243 total). No new storage keys. (2026-05-23)
- [x] **Stats screen evolution** — 결산 block replaced by 3-group observation surface (cadence lines → top-scene chip → single rotating observation from `selectStatsObservation`). `MonthTrendGraph` removed; `MonthPresenceRow` (single-row presence-dot trace) added. Calendar amount color softened from `oliveGreen` → `textMuted`. New service `statsObservationService.ts` (7-branch priority chain). 12 new tests. No new storage keys. All preserved: calendar grid, month nav, edit/delete sheet, photocard entry, selected-day list. (2026-05-23)
- [x] **Small-win backlog sweep** — `(선택)` label parity on emotion picker (`record.tsx`), `letterService` seasonal-window test fix (pre-stage `seasonal-may-2026` in the dedup tests — 11/11 pass), two copy reviews: `"잘 기록해뒀어요" → "여기 남겨뒀어요"` (dialogue Tier 1 happy) and `"오늘도 수고했어요" → "오늘도 들렀네요"` (IDLE_MESSAGES). Verified stale (already addressed in earlier work): PhotocardView warmth color, photocard italic removal, DayFeelingCard future-date guard (no longer rendered). Commits `5d0bf88` / `f7aa61f` / `493c762`. (2026-05-22)
- [x] **쉬어가기 TV — soft rewarded-ad system** — small TV sprite in the room paired with a pebble jar that fills across 4 stages. Watching a rewarded ad grants 5-20 pebbles (`computePebbleDelta`), nudges room warmth for 60 min (`getRestWarmthOpacity` linear fade), refreshes Sobagi's idle line pool, and at hidden pebble thresholds (30/100/250/500/1000) delivers a soft letter into the existing mailbox. `grantRest()` is the sole writer of pebble state — invoked exclusively from `useRestedAd.show`'s `userEarnedReward` callback; `dismissed` and `failedToShow` grant nothing. 2-per-day cap normalized via `effectiveRestsToday` (no separate daily-reset job). When `loadFullScreenAd.isSupported()` is false, the TV sprite never renders — no fallback messaging. 15 implementation tasks across 6 phases, 32 new tests (atmosphereService, restService, stores). Commits `2554b89` → `2b9321d`. (2026-05-22)
- [x] **Retrospective no-spend records** — `recordNoSpend(createdAt)` accepts ISO timestamp from caller; `canNoSpend` relaxed to `selectedDate <= todayStr && no record on that date`. Past dates use copy `이날은 조용히 지나갔어요 🌿` (button) and `조용히 지나간 하루였네요 🌙` (reaction); today's copy unchanged. `saveExpense.isRealTimeRecord` already handles past-date semantics — streak/found-item eval skip retroactive records. (2026-05-20)
- [x] **0원 save-helper** — when amount is 0 and `canNoSpend` is true, a quiet line below the disabled save button reads `지출이 없는 날은 무지출 기록을 사용할 수 있어요 🌿`. Save logic unchanged. (2026-05-20)
- [x] **Memo suggestions + wrapped category chips** — each scene category gains 5-7 plain Korean memo hints via `ExpenseCategoryMeta.memoSuggestions`. New `MemoSuggestions` component renders an outlined-ghost horizontal row below the chip grid; tap appends with `', '`, skips duplicates, respects the 60-char memo cap. `CategorySelector` switches from horizontal scroll to a wrapped layout so all 12 scenes are visible at once. `no_spend` renders no suggestions. 7 new tests on the pure `appendMemoSuggestion` helper. (2026-05-20)
- [x] **Record screen polish** — `CategorySelector` selected chip moves to `woodLight` with subtle shadow + slight breathing-room bumps; `src/pages/record.tsx` removes the `카테고리` label, drops `소비` from the memo placeholder, and recedes the no-spend button from card-peer to a quiet centered prompt with a 🌿 hint. Reaction loop audited only — restraint preserved, no functional edits. (2026-05-20)
- [x] **Post-taxonomy QA polish** — `PhotocardView.tsx` reads icons from canonical `CATEGORY_BY_TOKEN` (legacy local map removed; all 12 new tokens now resolve their emoji instead of falling back to `·`); settlement chip dropped the hardcoded 이 particle (now joined with `·`, particle-free); `dialogueService.test.ts` legacy `'food'` fixtures → `'dining_out'` (typecheck clean); record screen subtitle `"오늘의 소비를 기록해요 ✏️"` → `"오늘을 기록해요 ✏️"`. Commit `6924d8e`. (2026-05-20)
- [x] **Life-scene category taxonomy** — `ExpenseCategory` rewritten as 12 scene categories + `no_spend` marker. New `src/constants/categories.ts` is the single source of truth (label/emoji/inPicker). `src/services/expenseMigration.ts` remaps legacy `food → dining_out`, `shopping → living`, `other → living` once per install via `STORAGE_KEYS.CATEGORY_MIGRATION_DONE`. `dayFeelingService` buckets updated (`warm` reads `home_meal + dining_out`; `selfcare` keys on `hobby`). `foundItemService.T4` and `dialogueService.categoryWarm` migrated in tandem. Consumers (CategorySelector, ExpenseCard, reaction, stats) deduplicated against the shared module. 9 + 14 new tests. (2026-05-19)
- [x] **dayFeeling — `quiet` bucket decoupled from calm-atmosphere** — `dayFeelingService.ts` lines rewritten with time/presence-oriented copy (no financial implication); threshold lowered from `< 10000` to `< 8000` so the quiet dayFeeling and the calm-atmosphere overlay no longer share a boundary. Inline comment explains the decoupling intent. No new tests required (no `dayFeelingService.test.ts` exists). (2026-05-19)
- [x] **Implicit accumulation — 차분한 저소비 일 → 분위기 밝아짐 (calm atmosphere)** — `atmosphereService` extended with `computeCalmDayCount` and `getCalmAtmosphereOpacity`. Calm day = recorded daily total < 10,000 KRW (strict, days with no records don't count). Graduated opacity per calm day (0.005 step, capped at 0.04). Warm-white overlay `#FFF5E6` rendered in `index.tsx` between warmth and bottom-fade. Pure-function, no UI surface, no metrics shown, no storage state. 13 new tests. (2026-05-18)
- [x] **Implicit accumulation — 야간 활동 → 따뜻한 램프 (L-path)** — `BagItem.nightAffinity: boolean`; new item `a6` 따뜻한 램프 in 장신구. `isNightHour` (midnight-wrapping), `hasNightPattern` (3 records / 3 distinct nights / 14 days, recurrence-gated, daytime records ignored), `pickNightEligibleItems`, `selectNightCandidate`. Global `NIGHT_TRIGGER` (19–04). L-path slotted in `checkForPlacement` between S and B/A. 22 new tests including startHour/endHour boundary, midnight wrap, daytime mix. (2026-05-18)
- [x] **Paused `roomDecorationService` removed** — Files (`roomDecorationService.ts` + test) deleted; `PLACED_ITEMS` storage key reverted; `index.tsx` integration (import, state, mount-effect load, parallel render block) reverted. PHILOSOPHY gets a historical note explaining the removal. Single source of truth for placement is now `roomPresenceService` (zones B/A/C/P/S). (2026-05-18)
- [x] **Implicit accumulation — streak → 작은 식물 (S-path)** — `BagItem.streakAffinity: { minStreak }`; m6 식물 tagged at 7. `computeRecordingStreak` (forgiving: today or yesterday, 2-day gap collapses). `pickStreakEligibleItems`, `selectStreakCandidate`. S-path slotted into `checkForPlacement` between P-path and B/A. 17 new tests, including grace-day and gap-collapse. Per-item threshold so future streak items settle at their own pace. (2026-05-18)
- [x] **Implicit accumulation — cafe → 머그컵 (P-path) + polish** — `BagItem.categoryAffinity`; m5 머그컵 tagged with `['cafe']`. `hasCategoryPattern` (recurrence-gated: minCount records across minDistinctDays distinct days within windowDays; cafe = 3/3/14). `pickCategoryEligibleItems`, `selectCategoryCandidate`. P-path slotted into `checkForPlacement` before B/A. Spec comment near P-path documents the rationale ("quiet traces of repeated behaviour, not rewards"). 20 tests including boundary cases. (2026-05-18)
- [x] **Photocard split-layout redesign** — `PhotocardView.tsx` rewritten with horizontal split: left pre-made mood asset (`photocard_1..10`) via deterministic `getPhotocardMoodAsset` resolver, right cream-paper summary (date / weekday / total / up to 3 records + "+ N개 더" / 오늘의 한 줄). Landscape 3:2 ratio. New `photocardMoodService.ts`. `reaction.tsx` + `stats.tsx` rewired. CDN SHA bumped to `94fdc8e` for the `pothocard_*.png` (sic) assets. (2026-05-18)
- [x] **Room presence — Stage 5: photocard emoji overlay** — placed items whose `photocardAffinity` matches current emotion rendered behind the composition; superseded by the 2026-05-18 split-layout redesign. (2026-05-17)
- [x] **Room presence — Stages 1–4 (silent reshape)** — `bagItems.ts` (extended BagItem type, 4 new items, ZONE_SLOTS), `roomPresenceService.ts` (B/A/C path selection, drift, eligibility, auto-settle), `useAppInit.ts` wired, `index.tsx` renders placed items as subtle ambient emoji. Original Stage 4 placement prompt removed mid-stream — surfaced as Discovery Principle violation, replaced with silent between-session placement. `confirmPlacement`/`deferPlacement` removed from service. Spec/plan files are stale on the prompt point — CURRENT_STATE wins. (2026-05-17)
- [x] **Group F — Photocard** — `PhotocardView.tsx`; reaction.tsx modal overlay; 1.8s white-reveal + quote fade-in; auto-dismiss paused at 1000ms; Tier 2 baseline (no capture/save/share); empty-quote fallback (2026-05-17)
- [x] **Group E — Bag new-item dot** — `LAST_BAG_OPEN_DAYS` storage key; `hasNewBagItem` computed on init from flat BAG_ITEMS; cleared + persisted on `openSheet('bag')`; dot shows on either pending found item or newly unlocked bag item (2026-05-17)
- [x] **Group D — Dynamic mailbox** — `letters.ts` (personal + seasonal letter content), `letterService.ts` (delivery by threshold + calendar window), `useAppInit.ts` wired, `index.tsx` dynamic rendering via `LETTER_LOOKUP`; `MAILBOX_DELIVERED_IDS` persists delivery state (2026-05-16)
- [x] **Group B Hotfix — Wire atmosphere overlays** — `getTimeOfDayTint` + `getWarmthOpacity` overlay Views added to `index.tsx` inside RoomBackground; both `pointerEvents="none"` (2026-05-16)
- [x] **Group C Hotfix — Fix `returnAfterGap` detection** — module-level `prevVisitDate` in `useAppInit.ts`, exported as `getPrevVisitDate()`; `record.tsx` reads via `useState` lazy initializer (synchronous, race-free) (2026-05-16)
- [x] **Group C Hotfix — Fix `reaction.tsx` title tiers** — `getReactionTitle()` now takes `tier: 1 | 2 | 3`; tier-3 copy is shorter, more intimate; `recordedDaysCount` from userStore (2026-05-16)
- [x] **Group C — Dialogue tier system** — `dialogue.ts` (3-tier pools + observation pools), `dialogueService.ts` (tier selection, observation detection), `record.tsx` wired (2026-05-16)
- [x] **Group A — Found item service** — `foundItemService.ts`, `findableItems.ts`, `useAppInit.ts` wired (2026-05-16)
- [x] **Group B — Atmosphere overlay** — `atmosphereService.ts` pure functions implemented and tested (2026-05-16)
- [x] **HomeScreen atmosphere polish** — closet icon removed, level chip warmed, Sobagi contact shadow, prop depth differentiation, summaryCard boundary dissolved (2026-05-16)
- [x] **DayFeelingCard** — dayFeelingService, 8 feeling buckets, deterministic text, observation lines (2026-05-15)
- [x] **Stats screen** — calendar, expense list, settlement section, monthly trend graph (2026-05-15)
- [x] **Found item UI** — storage keys, display in bag, bag dot notification (trigger was missing, now implemented in Group A)
