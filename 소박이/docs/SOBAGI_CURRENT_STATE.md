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
**Date:** 2026-05-20
**Group completed:** Record screen polish (chip warmth, tone copy, quiet no-spend)

### What changed
- `src/components/expense/CategorySelector.tsx` — selected chip background `oliveGreen → woodLight`, selected label `white → text`, paddings `16/10 → 18/12`, row `gap 8 → 10`, emoji `20 → 22`, dropped the `oliveDark` border override on selected, added a subtle shadow (iOS) + `elevation: 1` (Android) on the selected chip.
- `src/pages/record.tsx` — removed the `카테고리` `<Text>` label above the chip row (no replacement heading); memo placeholder `"오늘 소비에 대한 한마디..." → "오늘에 대한 한마디..."`; no-spend label gains a `🌿` hint; no-spend button styles recede to transparent / borderless / tighter padding.

### What's now working
- The category chip row reads with warmer, less-stamped selected state. Wood now signals "scene-tagged" while olive remains the primary-action color (save CTA, date chips, emotion chips).
- The Record screen reads cleaner: no `카테고리` accounting label, no `소비` framing in the placeholder.
- The no-spend button no longer competes visually with the amount card; it sits as a quiet centered prompt above the form, only when `!hasRecordToday && !isSaving && selectedDate === todayStr`.

### Fragile / surprising
- The reaction loop is structurally correct and was intentionally NOT modified. Findings documented in the spec (Section 4) as known trade-offs:
  - No in-flight visual besides dimmed save button. AsyncStorage saves typically <100ms. Adding a spinner would push the screen toward app-form energy.
  - No-spend button doesn't dim when `isSaving` flips; it relies on `canNoSpend` gating the handler. Sub-1-frame race window, acceptable.
  - `evaluate` builds a transient partial expense object for emotion evaluation; the stand-in never reaches storage.

### What the next agent must NOT do
- Don't reintroduce a label above the chip row. The chip emojis lead the section.
- Don't add a loading spinner or progress UI to save / no-spend. The restraint is intentional.
- Don't add a border or card chrome back to the no-spend button.
- Don't shift category chip selected back to olive — wood is intentional differentiation from primary-action surfaces.
- Don't change the no-spend visibility gate or the no-spend services.

### Next
Stats screen evolution (separate spec, follow-up landing): tone review, rhythm summaries, small additive pattern-signal surface, visual density review.

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
