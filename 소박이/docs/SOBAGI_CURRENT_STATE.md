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
**Group completed:** Life-scene category taxonomy (12 categories + `no_spend` marker)

### What changed
- `src/types/index.ts` — `ExpenseCategory` rewritten as a 13-token union (12 scene categories + `no_spend`). Legacy tokens `food / shopping / other` removed.
- `src/constants/categories.ts` (new) — single source of truth for category metadata. Exports `CATEGORIES` (full list, ordered), `CATEGORY_BY_TOKEN: Partial<Record<>>` (lookup), `PICKER_CATEGORIES` (excludes `no_spend`), and two formatting helpers: `formatCategoryWithEmoji(token)` ("☕ 카페" — used in history card / stats records / monthly top) and `formatCategoryLabel(token)` ("카페" — bare label for photocard records).
- `src/services/expenseMigration.ts` (new) — pure `migrateExpenseCategories(expenses)` plus an IO wrapper `runExpenseCategoryMigration()` that is gated by `STORAGE_KEYS.CATEGORY_MIGRATION_DONE` and runs once per install before `useAppInit` hydrates expenses. Idempotent.
- `src/constants/storage.ts` — added `CATEGORY_MIGRATION_DONE` storage key.
- `src/components/expense/CategorySelector.tsx` — reads `PICKER_CATEGORIES`; no longer hardcodes the chip list.
- `src/components/expense/ExpenseCard.tsx`, `src/pages/reaction.tsx`, `src/pages/stats.tsx` — local `CATEGORY_LABELS` (and `PHOTOCARD_CATEGORY_LABELS` in stats) removed; all three consume the shared module's helpers. The stats records list and monthly top line now render "emoji label" (was "label emoji") — small unification for one shared helper. The stats edit picker iterates `PICKER_CATEGORIES` so `no_spend` is no longer selectable when editing a spending record.
- `src/services/dayFeelingService.ts` — bucket-trigger logic and `buildObservations` updated for the new taxonomy. `warm` now reads `home_meal + dining_out`; `sweet` includes `home_meal / dining_out`; `selfcare` keys on `hobby`. `caffeinated / active / quiet / modest / hard` unchanged in shape.
- `src/services/foundItemService.ts` — T4 trigger (small everyday purchase under 6,000 KRW) migrated from `cafe || food` to `cafe || home_meal || dining_out`. Discovered while preparing the union cleanup; behavior preserved.
- `src/services/dialogueService.ts` — `categoryWarm` filter migrated from `cafe || food` to `cafe || home_meal || dining_out`. Same shape preservation.
- `src/services/__tests__/roomPresenceService.test.ts` — fixtures' "non-cafe category" examples migrated from `'food'` to `'dining_out'`.
- `src/hooks/useAppInit.ts` — `runExpenseCategoryMigration()` awaits before the parallel storage load so hydrate consumes migrated data.
- `__tests__/expenseMigration.test.ts` (new, 9 tests), `__tests__/dayFeelingService.test.ts` (new, 14 tests).

### What's now working
- Recording surfaces the 12 life-scene chips in the picker; ordering is cafe → home_meal → dining_out → transport → living → hobby → gift → pet → travel → health → event → allowance.
- Existing stored expenses with legacy tokens (`food / shopping / other`) are remapped on first app launch: `food → dining_out`, `shopping → living`, `other → living`. Cafe / transport / no_spend pass through. After migration completes once, the flag prevents re-running.
- DayFeeling buckets react to the new tokens; old `shopping`-keyed `selfcare` is now keyed on `hobby`. The food-trigger logic in `foundItemService.T4` and `dialogueService.categoryWarm` was updated in tandem so behavior is preserved under the new taxonomy.
- All pages that show category labels (history card, reaction screen, stats list, photocard, monthly top, edit picker) read from one shared module.

### Fragile / surprising
- The `allowance` 🫶 glyph is Unicode 14 (2021). On very old Android builds the emoji may fall back to tofu. Document if it surfaces in user feedback; do not swap unilaterally.
- Migration writes back to `STORAGE_KEYS.EXPENSES` only when at least one record was remapped, then always sets the `CATEGORY_MIGRATION_DONE` flag. If you ever need to re-run the migration for a single user (debug path), clear the flag — the function is safe to re-run on already-migrated data (no-op return).
- `CATEGORY_BY_TOKEN` is typed `Partial<Record<>>` rather than full `Record<>` because legacy tokens used to share the union and the type stayed truthful. With the union now clean, this could be tightened to a full `Record<>` in a follow-up, but it doesn't matter functionally — both formatters already guard against undefined.
- Stats' edit picker now skips `no_spend` — editing a spending record cannot convert it into the no-spend marker. This is the correct behavior; do not "fix" it by adding `no_spend` to `PICKER_CATEGORIES`.
- `roomPresenceService` `CATEGORY_TRIGGERS.cafe` and `bagItems.m5 머그컵.categoryAffinity: ['cafe']` are unchanged. The cafe token survives the rename, so the mug pattern keeps working.
- DayFeeling `selfcare` main-line pool still uses "뭔가 산 / 작은 선물 / 나를 챙긴" language inherited from the `shopping`-keyed era. The trigger is now `hobby` (취미) — the observation line (`'좋아하는 일에 시간을 썼어요 🎀'`) matches, but the main pool reads slightly off-tone for the new trigger. Copy refresh is a future concern, not a code fault.

### What the next agent must NOT do
- Don't reintroduce a hardcoded `CATEGORY_LABELS` map in any consumer. Always read from `src/constants/categories.ts`.
- Don't treat `no_spend` as a normal expense category. It's a separate daily-presence marker. The picker excludes it; downstream filters that strip it (`reaction.tsx` / `stats.tsx` photocard records, spending totals, top-category) stay as they are.
- Don't reframe `allowance` as income. 용돈 is a giving scene (parents / kids / someone). Copy and downstream consumers must not invert this.
- Don't add nested categories, subcategory pickers, or budget UI. The taxonomy is flat by design.
- Don't change `dayFeeling`'s `selfcare` back to keying on legacy `shopping` — that token no longer exists.

### Next
Held: weekend leisure → cozy floor items implicit trigger (paused earlier). Future room-presence triggers for new tokens (`hobby → ribbons`, `pet → cushion`, `travel → postcard`, `home_meal → kitchen traces`, `gift → wrapping traces`) are out of scope for this landing but become trivial to add now that the tokens exist.

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
