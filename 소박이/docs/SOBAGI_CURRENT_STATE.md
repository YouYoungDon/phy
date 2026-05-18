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
**Date:** 2026-05-18
**Group completed:** Photocard split-layout redesign + product direction shift to implicit accumulation

### What changed
- `src/components/photocard/PhotocardView.tsx` — full split-layout rewrite: left = pre-made mood asset (`photocard_1..10`), right = cream-paper summary (date / weekday / total / up to 3 record rows + "+ N개 더" / 오늘의 한 줄). Landscape ratio `CARD_HEIGHT = CARD_WIDTH * 0.667` (3:2). Old dynamic-room composition removed; legacy props kept as optional for backward compatibility.
- `src/services/photocardMoodService.ts` (new) — deterministic `getPhotocardMoodAsset({hour, weather?, emotion?, spendingLevel?})`. Strong-signal overrides then time-of-day fallback. Safe default `photocard_2`.
- `src/constants/assets.ts` — CDN SHA bumped to `94fdc8e`; `PhotocardMoodAsset` type + `PHOTOCARD_MOOD_URIS` map added. Remote filenames are `pothocard_*.png` (sic) — URL keeps the typo, TS identifier doesn't.
- `src/pages/reaction.tsx` + `src/pages/stats.tsx` — pass `records`, `weekdayLabel`, `timeLabel` (reaction only), `currentEmotion`. Date format moved to `YYYY.MM.DD`. Old room-scene props dropped.
- `docs/SOBAGI_PHILOSOPHY.md` — new subsection **"Implicit accumulation, never explicit decoration"** under Room Philosophy. Slot pickers, place-item buttons, drag-and-drop, furniture management, inventory-to-room flows, and unlock-messaging are now **explicitly rejected**, not deferred.

### What's now working
- Photocard renders as a shareable landscape card with a chosen mood asset on the left and the day's spending summary on the right. Modal flow, white-reveal animation, and quote fade-in are preserved. Three records visible; "+ N개 더" indicator for overflow; card height fixed; no scroll inside the card.
- Mood resolver is deterministic and uses all 10 assets across emotion + hour combinations.
- "오늘의 한 줄" slot uses Sobagi's existing tier-aware voice (emotion store message on reaction.tsx, `dayFeeling.mainLine` on stats.tsx) — no praise/evaluation copy.

### Fragile / surprising
- **PHILOSOPHY shift on 2026-05-18**: the room is now defined as implicit emotional accumulation, not decoration. Any future spec or in-flight code that lets the user choose what goes in the room is out of scope. Existing `roomPresenceService` (B/A/C paths) is the model — extend it, don't replace it.
- **Paused in-flight work, do not merge as-is:** `src/services/roomDecorationService.ts` (+ its `__tests__` file), the `PLACED_ITEMS` storage key, and the `ROOM_SLOTS` / `loadPlacedItems` integration in `src/pages/index.tsx` implement explicit slot decoration (`floor` / `desk` / `wall` / `shelf`). These conflict with the new direction. Files are left untouched in the working tree pending owner clarification; do not delete without confirming ownership, and do not merge into main UX.
- The mockup example copy `"오늘도 수고했어, 내일의 나는 더 잘하고 있을 거야"` was rejected as praise/evaluation. CURRENT_STATE's "Copy / tone" known issues already flagged `"오늘도 수고했어요"` for removal.
- The photocard now has a structured spending summary on the right panel. This sits in known tension with PHILOSOPHY's photocard section (*"What the photocard is not: A spending summary with emotional decoration"*). Shipped under explicit product direction on 2026-05-18; the photocard subsection of PHILOSOPHY has not been updated yet — flag for the product owner if/when that section needs to follow.

### What the next agent must NOT do
- Add any explicit decoration UI (slot pickers, place buttons, drag-and-drop). This is now permanently rejected per PHILOSOPHY.
- Reintroduce room placement prompts in any form.
- Modify the photocard flow, modal, or PhotocardView layout — the redesign is the current baseline.
- Merge the paused `roomDecorationService` work without product owner sign-off and a replacement direction.

### Next
First proof-of-feel for implicit accumulation: cafe-pattern trigger. Extend `roomPresenceService` (not `roomDecorationService`) with a category-based path so that frequent cafe records cause the mug (`s5` 머그컵) to quietly appear in the room. No UI changes, deterministic, testable.

### What changed
- `src/constants/bagItems.ts` — `BagItem` now carries optional `roomPresence`, `photocardAffinity`, `ambientAffinity`; `BAG_ITEMS` extended (담요/식물/엽서/머그컵 added); `ZONE_SLOTS` introduced. *(committed earlier in this branch)*
- `src/services/roomPresenceService.ts` — pure logic for B/A/C paths, drift, eligibility, auto-settle; `checkForPlacement` triggers on every app open, places directly when no prompt flag, defers via `PENDING_PLACEMENT` when `promptOnPlace: true`. **`confirmPlacement` and `deferPlacement` removed** as part of the reshape.
- `src/hooks/useAppInit.ts` — `checkForPlacement` wired after emotion compute, before emotion store hydrates (so the new item is part of the room the moment the home screen first renders).
- `src/pages/index.tsx` — `roomPlacements` loaded on mount and rendered as subtle emoji overlays inside `RoomBackground` (opacity 0.60, `pointerEvents="none"`, zone-positioned). **Placement prompt UI removed in this reshape pass.**
- `src/constants/storage.ts` — added `ROOM_PLACEMENTS`, `PENDING_PLACEMENT`.

### What's now working
- Items appear in the room silently between sessions. A user who records an expense, closes the app, and returns later finds the matching object already part of the room.
- `promptOnPlace: true` items (담요, 식물, 머그컵, 작은 곰) are routed through pending → auto-settle, which gives them a 3–5 day "courtship" delay before appearing. The user never sees a prompt — the delay simply becomes part of the discovery feel.
- B/A/C path selection, drift phase, photocardAffinity field are all in place and tested.

### Fragile / surprising
- **The original Stage 4 placement prompt was a Discovery Principle violation** ("담요, 침대 옆에 놔둘까요? 응 / 나중에"). It was implemented per the spec, surfaced during this session as in conflict with PHILOSOPHY's *"Changes happen between sessions, never during one"*, and removed. The underlying pending/settle plumbing was kept and now functions as a silent delay instead of a UI gate.
- `confirmPlacement` and `deferPlacement` are gone from the service — no caller exists now that the prompt is gone. Do not reintroduce without revisiting PHILOSOPHY.
- The plan and spec at `docs/superpowers/plans/2026-05-17-room-presence.md` and `docs/superpowers/specs/2026-05-17-room-presence-design.md` still describe the prompt-based flow. They are now stale on that point. CURRENT_STATE wins per hierarchy.
- Pre-existing photocard issues from previous handoff (warmth color, early dismiss, italic quote) are still open — none of them were touched here.

### What the next agent must NOT do
- Reintroduce any in-session UI prompt for placement, however gentle. Sobagi must not narrate the placement.
- Add "new item appeared" toasts, dots, badges, or animations tied to room placement.
- Roll back the room presence system entirely — the data model and silent placement are emotionally correct; only the foregrounding UI was wrong.
- Add drag-and-drop, manual placement, or any item-management surface in the room.

### Next
Stage 5 — photocard emoji overlay. `PhotocardView.tsx` should accept `placedItems` + `currentEmotion`, filter by `photocardAffinity`, render one randomly-selected emoji at its zone position with reduced opacity, no label, no animation. `reaction.tsx` passes the props. Subtler than the home-screen rendering by design.

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
| Emotion engine (5-rule priority chain) | `src/services/emotionEngine.ts` |
| Dialogue tier system (3 tiers × 5 emotions + 4 observation types) | `src/constants/dialogue.ts`, `src/services/dialogueService.ts` |
| Reaction screen (tier-aware title, floating hearts, photocard button) | `src/pages/reaction.tsx` |
| Photocard — split-layout landscape (mood asset + spending summary) | `src/components/photocard/PhotocardView.tsx`, `src/services/photocardMoodService.ts` |
| Stats / calendar + trend graph | `src/pages/stats.tsx` |
| Per-day photocard entry point in stats | `src/pages/stats.tsx` |
| DayFeelingCard (8 buckets, observational) | `src/components/stats/DayFeelingCard.tsx`, `src/services/dayFeelingService.ts` |
| Mailbox (dynamic: milestone + seasonal letters) | `src/services/letterService.ts`, `src/constants/letters.ts` |
| Bag accumulation (20 items across 4 tabs, minDays thresholds) | `src/constants/bagItems.ts`, `src/pages/index.tsx` |
| Found item system (4 triggers, staged delivery) | `src/services/foundItemService.ts`, `src/constants/findableItems.ts` |
| Bag new-item amber dot | `src/pages/index.tsx`, `src/constants/storage.ts` |
| Room presence — silent ambient placement (B/A/C paths, drift, auto-settle) | `src/services/roomPresenceService.ts`, `src/hooks/useAppInit.ts`, `src/pages/index.tsx` |
| summaryCard boundary dissolve | `src/pages/index.tsx` |

### Planned (designed, not built)

| System | Blocked on |
|---|---|
| Room stage 2–5 | Image assets; one-line change in `constants/assets.ts` |
| Sobagi idle behaviors | Image assets |
| Seasonal room ambience | Design + assets |
| Year-end recap | — |
| Implicit accumulation triggers (cafe pattern, streak, night activity, calm low-spend days, weekend leisure) | Next: cafe → mug as proof-of-feel |

### Paused (in-flight, conflicts with current direction)

| Work | Conflict | Owner action needed |
|---|---|---|
| `src/services/roomDecorationService.ts` + tests | Explicit slot decoration (`floor`/`desk`/`wall`/`shelf` + `placeItem`/`unplaceItem`) — rejected by PHILOSOPHY 2026-05-18 | Confirm whether to delete or refactor into trigger-based path |
| `PLACED_ITEMS` storage key | Backs the paused service | Remove after service is resolved |
| `ROOM_SLOTS` / `loadPlacedItems` wiring in `index.tsx` | Loads the paused state | Strip after service is resolved |

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
```

---

## Known Issues

### Fix required
- **Warmth color mismatch** — `PhotocardView.tsx` line 76: `'#C87941'` → `'#E8C070'`
- **DayFeelingCard future dates** — renders for dates > today; guard `dateStr <= todayStr`
- **Photocard early dismiss** — `onPress` is live from t=0; needs `isRevealing` guard for first 1.8s

### Copy / tone
- `"잘 기록해뒀어요"` (Tier 1 happy pool) — "잘" borderline against evaluation anti-pattern
- `"오늘도 수고했어요"` (IDLE_MESSAGES) — "수고했어요" evaluates effort; replace with observational

### UX gaps
- Emotion picker missing `(선택)` label
- Trend graph bars not tappable
- Photocard quote `fontStyle: italic` reads as formal caption; recommend removing

### Long-term pacing
- Floating hearts on every record — charming at #1, performative by #30
- Dialogue tier transitions are hard thresholds — tone shifts abruptly at day 7 and day 30
- Settlement section bold monetary totals compete with emotional identity

### Technical
- Pre-existing TS error in `_404.tsx` — not blocking, not recently introduced
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
