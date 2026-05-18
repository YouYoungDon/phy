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
**Group completed:** Implicit accumulation — streak → 작은 식물 (S-path)

### What changed
- `src/constants/bagItems.ts` — BagItem gains optional `streakAffinity: { minStreak: number }`. `m6` 작은 식물 tagged with `{ minStreak: 7 }`. `RoomPlacement.placementPath` extended to include `'S'`.
- `src/services/roomPresenceService.ts` — new pure functions `computeRecordingStreak`, `pickStreakEligibleItems`, `selectStreakCandidate`. `checkForPlacement` evaluates the S-path after the P-path and before B/A. Per-item threshold (vs. cafe's global config) lets future streak items settle at their own pace.
- `src/services/__tests__/roomPresenceService.test.ts` — 17 new test cases covering the streak checklist (1:1 with the cafe polish pattern): grace day, 2-day gap collapse, multiple records same day, exclusion when already placed, minDays/minDaysInBag bypass.

### What's now working
- A 7-day consecutive recording streak silently brings the small plant (`m6`) into the room. The streak is forgiving — recording today extends it; missing today but having recorded yesterday keeps it alive; two days of silence collapse it.
- Trigger ordering inside `checkForPlacement`: auto-settle → pending-skip → category-pattern (P) → recording-streak (S) → emotion / return-gap (B/A) → drift relabel. Each path fires at most once per session.

### Fragile / surprising
- Trigger priority: P beats S beats B/A. Picked intentionally so a specific behavioural habit (cafe) wins over a general presence habit (streak) within the same session — feels more honest. Doc as you go if reordering is needed.
- The plant has `roomPresence.zones: ['창가', '방구석']` but we always use `zones[0]` for placement. Acceptable for proof-of-feel; if future items need zone-aware fallback (skipping an occupied zone), revisit.
- Paused work (`roomDecorationService` + `PLACED_ITEMS` key + `ROOM_SLOTS` integration in `index.tsx`) still untouched. Adding more triggers may reach the point where ignoring the paused state in `index.tsx` causes friction; flag if so.

### What the next agent must NOT do
- Don't expose `placementPath` ('P' / 'S' / etc.) in any UI — it's internal-only.
- Don't add another trigger in the same commit. Stabilize each before extending.
- Don't merge the paused decoration work without product owner sign-off.

### Next
Either: (a) stabilize the streak trigger on-device, watch for one more session, then move to the night-activity trigger; or (b) reconcile the paused `roomDecorationService` work with the implicit-accumulation direction.

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
