# Sobagi — Next Priorities

**Last updated:** 2026-05-16
**Branch:** apps-in-toss-clean

This is the ordered work queue. Keep it short. Strike through completed items. Move done work to SOBAGI_CURRENT_STATE.md.

---

## Currently in progress

- [ ] **Group C — Dialogue tier system** (Engineering)
  - `src/constants/dialogue.ts` — 3-tier message pools
  - `src/services/dialogueService.ts` — tier selection + observation detection
  - `src/pages/record.tsx` — wire tiered messages into save flow
  - `src/hooks/useAppInit.ts` — save `lastVisitDate`

---

## Up next

- [ ] **Group D — Dynamic mailbox** (Engineering)
  - `src/constants/letters.ts` — personal + seasonal letter content
  - Letter delivery logic in `useAppInit.ts`
  - Replace hardcoded `LETTERS` array in `index.tsx`

- [ ] **Group E — Bag new-item dot** (Engineering)
  - Add `LAST_BAG_OPEN_DAYS` storage key
  - Show amber dot when new `minDays` items available since last bag open

---

## Backlog (ordered by impact)

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

- [x] **Group A — Found item service** — `foundItemService.ts`, `findableItems.ts`, `useAppInit.ts` wired, 8 tests passing (2026-05-16)
- [x] **Group B — Atmosphere overlay** — `atmosphereService.ts`, HomeScreen overlays, 14 tests passing (2026-05-16)
- [x] **HomeScreen atmosphere polish** — closet icon removed, level chip warmed, Sobagi contact shadow, prop depth differentiation, summaryCard boundary dissolved (2026-05-16)
- [x] **DayFeelingCard** — dayFeelingService, 8 feeling buckets, deterministic text, observation lines (2026-05-15)
- [x] **Stats screen** — calendar, expense list, settlement section, monthly trend graph (2026-05-15)
- [x] **Found item UI** — storage keys, display in bag, bag dot notification (trigger was missing, now implemented in Group A)
