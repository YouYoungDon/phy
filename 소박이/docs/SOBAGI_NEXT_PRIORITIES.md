# Sobagi — Next Priorities

**Last updated:** 2026-05-18 (Engineering — streak → 작은 식물 trigger landed)
**Branch:** apps-in-toss-clean

This is the ordered work queue. Keep it short. Strike through completed items. Move done work to SOBAGI_CURRENT_STATE.md.

---

## Currently in progress

*(Nothing claimed. Next implicit trigger to consider: night activity → warm lamp.)*

---

## Up next (ordered by priority)

- [x] **Group E — Bag new-item dot** (Engineering)
  - `src/constants/storage.ts` — add `LAST_BAG_OPEN_DAYS: 'sobagi-last-bag-open-days'`
  - `src/pages/index.tsx` — load `LAST_BAG_OPEN_DAYS` from storage in the existing `useEffect`; compute `hasNewBagItem = BAG_ITEMS.some(item => item.minDays > lastBagOpenDays && item.minDays <= recordedDaysCount)`
  - On `openSheet('bag')`: save current `recordedDaysCount` to `LAST_BAG_OPEN_DAYS` and set `hasNewBagItem = false`
  - Replace `{pendingNewItemId !== null && <View style={styles.bagDot} />}` with `{(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.bagDot} />}`

- [x] **Group F — Photocard** (Engineering — large)
  - Production baseline: Tier 2. `src/components/photocard/PhotocardView.tsx` created. Modal overlay in `src/pages/reaction.tsx`. 1.8s white-reveal animation + quote fade-in. Auto-dismiss cancelled at 1000ms. No capture/save/share. Empty quote fallback: `"오늘의 기록이 조용히 남았어요."`. (2026-05-17)

---

## Backlog (ordered by impact)

- [ ] **Warmth color fix in PhotocardView** (one-line) — `PhotocardView.tsx` line 76: `'#C87941'` → `'#E8C070'`; card atmosphere must match HomeScreen room at same moment
- [ ] **Copy review: `"잘 기록해뒀어요"`** (Tier 1 happy pool) — replace "잘" with "조용히"; borderline praise anti-pattern
- [ ] **Copy review: `"오늘도 수고했어요"`** (IDLE_MESSAGES) — "수고했어요" evaluates effort; replace with observational alternative
- [ ] **Photocard: add time-of-day label at card top** — date (top-left) + time-of-day icon (아침☀️ / 낮🌤 / 저녁🌅 / 밤🌙, top-right); derives from `currentHour` already available in `reaction.tsx`; adds "snapshot of a moment" specificity
- [ ] **Photocard: add "Sobagi" signature** — small muted label between `quotePanel` and `contextStrip`; authorial anchor per spec
- [ ] **Photocard: guard early dismiss during animation** — add `isRevealing` state in `reaction.tsx`; disable `photocardModal onPress` for first 1800ms so the reveal animation always plays fully
- [ ] **Photocard: remove `fontStyle: italic` from quoteText** — italic + quotation marks reads as formal caption; Sobagi's voice should feel spoken, not typeset
- [ ] **Guard DayFeelingCard for future dates** — render only for `dateStr <= todayStr`
- [ ] **Softening settlement section** — large bold monetary totals compete with emotional tone; reduce weight, soften copy
- [ ] **Trend graph bars tappable** — tap a bar to select that day in calendar
- [ ] **`(선택)` label on emotion picker** — parity with memo field
- [ ] **Android keyboard behavior** — investigate whether save button is accessible
- [ ] **Floating hearts pacing** — charming on record #1, noise by record #30; reduce or remove after N records

---

## Paused (owner action needed)

- **Explicit slot decoration work** — `src/services/roomDecorationService.ts` (+ its test), `PLACED_ITEMS` storage key, `ROOM_SLOTS` / `loadPlacedItems` integration in `index.tsx`. Conflicts with the 2026-05-18 direction shift (PHILOSOPHY: "Implicit accumulation, never explicit decoration"). Files left untouched in the working tree; original author should confirm whether to delete or refactor into trigger-based path.

---

## Blocked on assets

- **Room stage 2+** — architecture ready (`getRoomStage()` written), blocked on image assets; one-line change in `constants/assets.ts` when art exists
- **Sobagi idle behaviors** — reading/napping/window variants; blocked on images

---

## Future implicit-accumulation triggers

Order TBD; each follows the same pattern: extend `roomPresenceService` with a new pure path, no UI changes. Stabilize each on-device before adding the next.

- Night activity → warm lamp
- Calm low-spending days → brighter room atmosphere
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
