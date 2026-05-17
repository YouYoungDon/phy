# Sobagi — Next Priorities

**Last updated:** 2026-05-17 (QA pass — Group F)
**Branch:** apps-in-toss-clean

This is the ordered work queue. Keep it short. Strike through completed items. Move done work to SOBAGI_CURRENT_STATE.md.

---

## Currently in progress

*(Nothing claimed — backlog copy reviews are next.)*

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

## Blocked on assets

- **Room stage 2+** — architecture ready (`getRoomStage()` written), blocked on image assets; one-line change in `constants/assets.ts` when art exists
- **Sobagi idle behaviors** — reading/napping/window variants; blocked on images
- **Room object accumulation** — plant, bookshelf, candle; architecture can be built now, sprites not yet commissioned

---

## Explicitly deferred / out of scope

See `SOBAGI_PHILOSOPHY.md` and `SOBAGI_CURRENT_STATE.md` for the full rejection list.

- Push notifications
- Social features
- Budget limits or savings goals
- Achievement badges
- Finance dashboard improvements

---

## Claiming work

Before starting a task, add your role in parentheses: `- [ ] Task name (Engineering)`.
After completing it, update `SOBAGI_CURRENT_STATE.md` and move this item to the "Recently completed" section below.

---

## Recently completed

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
