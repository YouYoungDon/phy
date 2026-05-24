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
**Group:** Photocard 3-way layout (sub-spec B of "Income records" decomposition)

### What changed
- **Helper extraction:** `PhotocardRecord` type and a new pure `groupByKind` function moved into `src/components/photocard/photocardGrouping.ts` (no React/RN imports, unit-testable in isolation). `PhotocardView.tsx` re-exports the type for backward-compat with existing callers
- **PhotocardView refactor:** `totalBlock` (`총 금액 ₩ X` at 18pt bold) removed entirely. Records render in up to 3 grouped sub-sections (쓴 기록 / 들어온 기록 / 무지출) via `groupByKind`. Each group gated on `.length > 0` — empty groups never render a header. Group labels are 9pt muted (`TEXT_MUTED`, letterSpacing 0.3), styled as quiet separators, not section titles
- **Slicing rule:** `VISIBLE_RECORDS = 3` cap applied across groups in order (spending → income → noSpend). `+ N개 더` overflow accounts for records hidden from any group
- **`amount` prop deprecated:** kept on `PhotocardViewProps` for backward compat, no longer destructured inside the component, no longer drives layout
- **reaction.tsx gate:** new `todayHasSpending = todayExpenses.some(e.kind !== 'income' && e.category !== 'no_spend')`. The button-reveal `useEffect` early-returns when `todayHasSpending === false`, so income-only and no-spend-only saves never expose the photocard handoff. Auto-dismiss timer (3500ms) still runs on the no-button path. Variable rename: `todaySpendingExpenses` → `photocardSourceRecords` (name now accurately reflects its filter behavior)
- **stats.tsx records source:** `photocardRecords` memo now derives from `selectedExpenses.filter((e) => e.category !== 'no_spend')` instead of `selectedSpendingExpenses`. The entry-point gate `selectedSpendingExpenses.length > 0` (around the `포토카드 생성` button) is unchanged — income-only days still hide the button
- **Tests:** new `__tests__/photocardGrouping.test.ts` covers 7 cases (empty, all-income, all-no_spend, defensive no_spend override when kind is mistakenly income, legacy-no-kind fallback, intra-group order preservation, fully mixed day)

### What's now working
- Spending-only photocard reads quieter: no aggregate `총 금액` block. The Sobagi quote at the bottom of the right panel is the loudest emotional element
- Mixed-day photocard (spending + income) shows `쓴 기록` group followed by `들어온 기록` group, with the sub-spec A amount-hide rule preserved (income `amount===0` rows skip the amount column)
- Income-only save on reaction screen: no photocard button reveals; auto-dismiss returns to home at 3500ms
- Income-only day in stats: no `포토카드 생성` button (unchanged from sub-spec A)
- No-spend-only day in stats: no `포토카드 생성` button (unchanged)

### Preserved (regression-confirmed)
- Left panel mood asset, time badge, reveal animation, modal overlay — all untouched
- `PhotocardMoodAsset` / `getPhotocardMoodAsset` / weather / spendingLevel paths unchanged
- Sub-spec A's per-record amount-hide rule (`r.kind !== 'income' || r.amount > 0`) preserved
- `selectedSpendingExpenses`, `expensesByDate.total` (income-excluded), `topCategoryThisMonth` — unchanged
- No storage keys added/removed; no migration
- `emotionEngine`, dialogue pools, pebble services, found-item, room-presence — all untouched

### Fragile or surprising
- The 무지출 group in `PhotocardView` is currently unreachable in practice (no-spend records can't coexist with spending records by the record-screen gate). The conditional path exists for forward compatibility and is covered by `groupByKind` tests
- `amount` prop on `PhotocardViewProps` is deprecated but accepted; callers still pass it. A follow-up commit can drop it once all caller sites are clean — not blocking
- `todayTotal` in `reaction.tsx` is still computed (feeds the deprecated `amount` prop). Removable in the same follow-up

### What the next agent must NOT do
- Lift the quote to the top of the right panel — that's deferred typography work outside sub-spec B scope
- Add per-group subtotals, income-vs-spending comparison framing, or "수입" UI text
- Reintroduce a `총 금액` block in any form
- Touch the left panel, mood asset resolver, or modal overlay
- Add storage migration; `kind` continues to be hydration-normalized

### No new storage keys
No storage keys were added, removed, or renamed.

### Next
Sub-spec C is **scoped and ready for engineering.** Spec: `docs/superpowers/specs/2026-05-24-income-system-integration-design.md`. Plan: `docs/superpowers/plans/2026-05-24-income-system-integration.md`. 9 tasks across emotion engine, dialogue pool, MonthPresenceRow, night-pattern detector, stats observation, and memory hygiene. Baseline for engineering: HEAD `13b3691`, 16 suites · 250 tests green.

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
| Stats screen evolution — 결산 block replaced by 3-group observation (cadence lines → top-scene chip → rotating observation); MonthTrendGraph → MonthPresenceRow; calendar amount color softened; `selectStatsObservation` 7-branch chain | `src/pages/stats.tsx`, `src/services/statsObservationService.ts`, `src/components/stats/MonthPresenceRow.tsx` |
| Income record data model (sub-spec A) — `RecordKind` type; 5 income category tokens; `kindForCategory` / `INCOME_CATEGORIES` / `GENERAL_SPENDING_CATEGORIES` registry helpers; `normalizeExpense` hydration; record screen kind toggle; photocard `kind?` interim patch; stats income section + filter exclusions; `ExpensePatch.kind` required | `src/types/index.ts`, `src/constants/categories.ts`, `src/services/expenseService.ts`, `src/hooks/useAppInit.ts`, `src/pages/record.tsx`, `src/pages/stats.tsx`, `src/pages/reaction.tsx`, `src/components/photocard/PhotocardView.tsx`, `src/store/expenseStore.ts` |

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
