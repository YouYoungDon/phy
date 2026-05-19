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
**Date:** 2026-05-19
**Group completed:** Daily first-record loop + no-spend daily record + amount-based-reward decoupling + no-spend photocard composition

### What changed
- `src/types/index.ts` — `ExpenseCategory` extended with `'no_spend'`. New literal recognised everywhere `ExpenseCategory` is consumed.
- `src/services/expenseService.ts` — added `recordNoSpend()` which builds a `{amount: 0, category: 'no_spend', sobagiEmotion: 'happy', createdAt: now}` expense and delegates to `saveExpense` so all streak / recorded-day / persistence plumbing stays in one place. Inside `saveExpense`, the found-item eval is now invoked at the end of the function, gated by `isRealTimeRecord && todayExpenses.length === 0` (first real-time record of the day). Catch-up records for past dates do not eval.
- `src/hooks/useAppInit.ts` — removed the app-init `checkForFoundItem` call. App init still calls `promoteStaged`, so already-staged items continue to surface on the next-day open. Eval itself is now single-source: it fires exactly once per calendar day, tied to the first-record event.
- `src/pages/record.tsx` — "오늘은 무지출이에요" button at the top of `/record`, visible only when (a) no record today AND (b) the date chip is set to today. On tap: `recordNoSpend()` → `setEmotion('happy', '오늘은 조용히 머물렀네요 🌿')` → navigate to `/reaction`.
- `src/services/foundItemService.ts` — T3 trigger replaced. Old: `yesterdayExpenses.reduce(s, e => s + e.amount) < 15000`. New: `yesterdayExpenses.length === 1`. Activity-based ("yesterday was a quiet day, one record only") regardless of amount. Removes synchronized "low-spending → reward" signal across atmosphere / dayFeeling / found-item systems.
- `src/components/photocard/PhotocardView.tsx` — wrapped the `totalBlock` + its trailing divider in `{amount > 0 && (<>…</>)}`. Records block was already conditional on `visibleRecords.length > 0`. No-spend-only days now collapse both financial blocks, leaving date + mood asset + quote.
- `src/pages/reaction.tsx` — added `todaySpendingExpenses = todayExpenses.filter(e => e.category !== 'no_spend')`. `todayTotal` and `photocardRecords` derive from this filtered list. A no-spend-only day passes `amount=0` and `records=[]` into PhotocardView, which collapses both financial blocks per the rule above. Local `CATEGORY_LABELS` extended with `no_spend: '무지출'`.
- `src/pages/stats.tsx` — added `selectedSpendingExpenses` filter; the day-detail spending list, top-category, dayFeeling derivation, and `photocardRecords` all derive from it. Calendar cells where `data.total === 0` (no-spend-only days) now render `🌿` in the existing `dayAmount` slot instead of `"0"`. `CATEGORY_LABELS` extended with `no_spend: '무지출 🌿'`.
- `src/components/expense/ExpenseCard.tsx` — `CATEGORY_LABELS` extended with `no_spend: '🌿 무지출'`. The `/history` page renders no-spend records via this card, quietly distinguishable from spending.
- `__tests__/foundItemService.test.ts` — 3 new T3 cases pin the activity-based behavior: (1) fires for a single large-amount yesterday record, (2) fires for a no-spend yesterday, (3) does not fire for a multi-record yesterday.

### What's now working
- Daily first-record loop: spending record OR no-spend record (both qualify as "first meaningful record") triggers the found-item eval exactly once per calendar day. Subsequent same-day records do not re-trigger. Already-staged items continue to surface via `promoteStaged` on next-day app open.
- No-spend daily record: amount 0, category `'no_spend'`, counts toward streak + recordedDaysCount, can trigger the same quiet found-item flow as a normal first record. Surfaces silently in `/history` (with `🌿 무지출` card) and in the `/stats` calendar (as `🌿` marker in the day cell). Does not inflate spending totals (amount 0). Filtered out of all spending-analysis surfaces.
- T3 reacts to *shape of yesterday's presence* (one quiet touchpoint) — never to amount. The user cannot infer "spent less → got an item."
- No-spend day photocard collapses to a quiet emotional card. Mood asset + date + "🌱 오늘의 한 줄" + quote. No total block, no records block, no ₩0 line. Matches the philosophy rule (PHILOSOPHY → The Photocard → No-spend day composition).

### Fragile / surprising
- `useAppInit.checkForFoundItem` removal is structural. A user who recorded yesterday but doesn't record today gets no eval until their next record. Pre-existing semantic of "eval on every app open with the latest expenses snapshot" is gone on purpose — eval is now bound to the *act of recording*, not to *opening the app*. Don't restore the init-time eval; the once-per-day rule depends on saveExpense being the single source.
- T3 also fires when *yesterday was a no-spend day*. Single-record yesterday qualifies regardless of category. This is intentional — quiet presence is the signal, not the kind of presence.
- No-spend button uses `selectedDate === todayStr` as a guard so it never surfaces while the user is on a past-date catch-up chip. The "오늘은…" copy would mislead otherwise.
- The 🌿 calendar marker reuses the `dayAmount` Text style slot (same size, same selected-state styling). Calendar layout is unchanged; only the glyph swaps. If a future user has both spending and a no-spend record on the same day, total > 0 and the amount text wins — 🌿 is only for amount-0 days.
- Photocard financial blocks gate on `amount > 0`. The leading divider after the date header stays in both branches so the quote block keeps its soft separator. Don't move that divider into the conditional.
- No new STORAGE_KEYS. No migration concerns. No-spend lives inside the existing `EXPENSES` array.

### What the next agent must NOT do
- Don't re-introduce `checkForFoundItem` in `useAppInit`. The once-per-day "first record" semantics depend on saveExpense being the sole eval point.
- Don't change T3 back to an amount threshold. The decoupling fixes a synchronized low-spending signal across atmosphere / dayFeeling / triggers (PHILOSOPHY → Anti-Pattern List → "Synchronized restraint signaling").
- Don't render any "₩ 0" line on the photocard for no-spend-only days. The financial-block collapse is the composition.
- Don't add "saved money" / "successful no-spend" / "achievement" / "streak bonus" framing anywhere in the no-spend flow. Copy stays observational ("오늘은 조용히 머물렀네요 🌿").
- Don't add no-spend records into spending-analysis surfaces (top category, day-card spending list, photocard records block, monthly totals).

### Next
Quiet-bucket dayFeeling refinement landed. `linesFor('quiet')` in `dayFeelingService.ts` rewritten to time/presence-oriented copy with no financial implication (`'오늘은 잔잔하게 지나갔네요 🌿'` / `'천천히 흘러간 하루였어요 🍃'` / `'조용히 머무른 하루였네요 🌙'`). Threshold lowered from `< 10000` to `< 8000` to break exact equality with `CALM_DAILY_THRESHOLD` (atmosphere overlay) — synchronized thresholds would let users infer "low spending = reward state". A short rationale comment is inline at the threshold check.

Held: weekend leisure → cozy floor items trigger. User explicitly paused this and asked for a QA pass first; QA completed and the dayFeeling decoupling is its only material follow-up. Awaiting explicit unblock before opening the weekend trigger.

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
