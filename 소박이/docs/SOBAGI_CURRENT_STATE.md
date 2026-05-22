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
**Date:** 2026-05-22
**Group completed:** 쉬어가기 TV — soft rewarded-ad system

### What changed
- `src/services/restService.ts` (new) — pure helpers (`computePebbleDelta` 5-20, `findCrossedLetterThresholds`, `getEffectiveRestsToday`, `canRest`) plus the `grantRest()` orchestrator. `grantRest` is the only writer of pebble state, `restsToday`, `lastRestDate`/`lastRestAt`, and rest-letter delivery; its block comment names the `userEarnedReward`-only caller contract.
- `src/hooks/useRestedAd.ts` (new) — wraps AppsInToss `loadFullScreenAd`/`showFullScreenAd` lifecycle. Returns `{ status, show(onReward) }`. The `onReward` callback fires exclusively in the `userEarnedReward` SDK event; `dismissed` and `failedToShow` never reach it. All 6 SDK callback paths are guarded with a `mountedRef` so post-unmount state writes are suppressed.
- `src/services/atmosphereService.ts` — gains `getRestWarmthOpacity(now, lastRestAtISO)` (linear fade `0.08 → 0` over 60 min) and constants `REST_WARMTH_MAX_OPACITY` / `REST_WARMTH_FADE_MINUTES`. Composes additively with the existing day-count warmth and calm overlays.
- `src/components/room/RestTV.tsx` (new) — presentational TV sprite using the `sobaki_tv.png` asset. 4-state opacity (`0.85 / 0.55 / 0.35 / 0.35` for available / loading / done / error). Returns `null` when `adStatus === 'unsupported'` — no fallback messaging. Daily-cap branch uses the `REST_DAILY_CAP` constant, not a magic number.
- `src/components/room/PebbleJar.tsx` (new) — presentational `🫙` sprite with 4 opacity+scale fill stages keyed off `pebbleCount` (0-9 / 10-49 / 50-199 / 200+).
- `src/components/room/RestPrompt.tsx` (new) — bottom-sheet body. Title `소박이랑 잠깐 쉬어갈까요? 📺` + body copy + `다음에` / `쉬어가기` buttons. Primary disabled until `adStatus === 'ready'`, with a `준비 중이에요 🌿` hint shown otherwise.
- `src/constants/restLetters.ts` (new) — 5 rest-themed letters keyed by `triggerPebbles` (30 / 100 / 250 / 500 / 1000).
- `src/constants/ads.ts` (new) — `REST_AD_GROUP_ID` (dev test ID for now; swap to production ID before release).
- `src/constants/assets.ts` — adds `ROOM_FURNITURE_URIS` export (currently `{ tv }`) for in-world furniture, separate from utility-icon overlays.
- `src/constants/storage.ts` — 4 new keys: `PEBBLE_COUNT`, `RESTS_TODAY`, `LAST_REST_DATE`, `LAST_REST_AT`.
- `src/types/index.ts` — `UserState` gains 4 fields: `pebbleCount: number`, `restsToday: number`, `lastRestDate: string | null`, `lastRestAt: string | null`.
- `src/store/userStore.ts` — 4 new initial values, 4 new primitive setters. `hydrate` semantics unchanged.
- `src/services/expenseService.ts` — `updatedUser` literal in `saveExpense` now includes the 4 new rest fields so persisted UserState stays complete.
- `src/hooks/useAppInit.ts` — hydrate call defaults the 4 new fields via `??` for legacy users predating them.
- `src/pages/index.tsx` — renders `<RestTV />` and `<PebbleJar />` in the room layer; manages a new `'rest'` sheet branch alongside `'mailbox'`/`'bag'`; merges `REST_LETTERS` into `LETTER_LOOKUP`; adds the new rest-warmth overlay; mixes `REST_IDLE_MESSAGES` into Sobagi's idle pool for 60 min after a watch; shows a post-watch bubble `소박이가 한 숨 돌렸어요 🌿  +N`. Three position constants `MAILBOX_POSITION`/`TV_POSITION`/`JAR_POSITION` — `TV_POSITION` is derived from `MAILBOX_POSITION + { x: 0.02, y: 0.16 }` so the two visually cluster on the room's left. Bag/mailbox utility-icon positions untouched.
- `__tests__/restService.test.ts` (new, 21 tests covering both pure helpers and `grantRest` orchestration).
- `__tests__/atmosphereService.test.ts` — 6 new tests for `getRestWarmthOpacity`.
- `__tests__/stores.test.ts` — 5 new tests for the userStore rest setters + hydrate.

### What's now working
- Tapping the TV sprite (when `effectiveRestsToday < 2` and `adStatus === 'ready'`) opens the rest prompt. Confirming kicks off the rewarded ad. Watching to completion grants 5-20 pebbles, refreshes Sobagi's idle line pool for 60 min, fades a warm overlay across the room, and at hidden pebble thresholds delivers a soft letter into the existing mailbox.
- Dismissing the ad without earning the reward grants nothing — no pebbles, no warmth, no `restsToday` increment.
- The TV opacity reflects 4 states (available / loading / done-for-today / error). Tap on a done-for-today TV shows `오늘은 충분히 쉬었어요 🌿`; tap on an error TV shows `지금은 조용한 채널이 없어요 🌿`.
- The jar opacity steps through 4 fill stages as pebbles accumulate. Tap shows `조약돌 N개` for 2 seconds.
- Day rollover is handled lazily — `canRest`/`getEffectiveRestsToday` always normalize against today, so a user who watched twice yesterday sees a fresh available TV today without a separate reset job.
- On environments where the SDK reports `isSupported() === false`, `<RestTV />` returns `null` — the TV is simply not in the room. No fallback prompt, no apology message.
- The mailbox renders rest letters identically to personal/seasonal letters — same red-dot indicator, same expand/collapse, same card layout. Zero UI changes to the mailbox sheet itself.

### Fragile / surprising
- `grantRest()` is the only writer of pebble/rest state. There must be exactly ONE call site in `src/pages/index.tsx` (inside `RestPrompt.onConfirm` → `adState.show(onReward)`). Future engineers MUST NOT add a second call site (debug menus, "test pebble grant" buttons, etc.). The block comment on `grantRest` documents the contract; reviewers enforce it.
- The SDK's `event.data.unitAmount` is intentionally ignored — pebbles are always 5-20 from our own RNG inside `computePebbleDelta`. The SDK event is the trust signal that a watch completed, nothing more.
- The warmth overlay reads `getRestWarmthOpacity(new Date(), lastRestAt)` fresh on every render — pure function returning 0-0.08, no state churn. Don't memoize without measuring.
- The 5 rest letters use the existing `MAILBOX_DELIVERED_IDS` storage key for delivery state. There is NO separate "rest letters delivered" key — they mix into the same dedupe set.
- `lastRestDate` is the `YYYY-MM-DD` of the last rest; `lastRestAt` is the ISO timestamp of the same event. They're separate so the daily-cap check can use string compare while the warmth fade can use millisecond math. Both update atomically in `grantRest()`.
- The TV anchors to a `MAILBOX_POSITION = { x: 0.12, y: 0.29 }` constant. The mailbox utility icon itself stays pixel-positioned in the existing utility stack — the constant exists only as a source of truth for room-layer fixtures that anchor below it. If the utility stack ever moves, update `MAILBOX_POSITION` to match.
- Rest progression is intentionally independent from `streak`, `level`, `roomStage`, and `recordedDaysCount`. `grantRest` writes only the 4 rest fields. Don't link them later — the philosophy is "pebbles never gate progression."
- TODO marker in `restService.ts:grantRest`: when `pebbleCount` crosses 500/1500/3000 the system should deliver a rare ambient item to the room. Hook exists, item pool and delivery shape are not defined yet.

### What the next agent must NOT do
- Don't add a second `grantRest()` call site. Don't import `grantRest` outside `index.tsx`.
- Don't grant pebbles on the SDK's `dismissed` or `failedToShow` events. The hook already filters; don't relax.
- Don't add a fallback prompt or banner when `adStatus === 'unsupported'`. The TV is silently absent — by design.
- Don't add a pebble-spending UI of any kind. Pebbles accumulate forever; that's the entire affordance.
- Don't add push notifications for "rest available today" or "letter waiting." The TV sprite is the only signal.
- Don't add streak rewards, multipliers, or "watch 2 today for bonus" framing. Hard cap of 2 per day, no extra surface.
- Don't link rest to `streak`/`level`/`roomStage`/`recordedDaysCount`. The four rest fields are isolated state.
- Don't trust `event.data.unitAmount` from the SDK. Pebble grant size is owned by `computePebbleDelta`.
- Don't change the trust boundary by inlining `grantRest` into `useRestedAd`. The hook must remain business-logic-free.

### Pre-existing test failures (unchanged)
- `__tests__/letterService.test.ts` — 2 cases ("does not re-deliver" / "does not call save if nothing new") fail at HEAD. Confirmed present at the rest-TV base commit `156f51c` before any task touched the tree. Not introduced by this work — a seasonal-letter window now overlaps the test's pinned `2026-05-16` date.

### Next
Stats screen evolution remains the next major polish landing — tone review, rhythm summaries, small additive pattern-signal surface, visual density review. Held until product owner re-opens. Rest-TV follow-ups (rare-item delivery at 500/1500/3000 pebbles, on-device small-phone visual QA, swap dev `REST_AD_GROUP_ID` for production ID before release) tracked in `SOBAGI_NEXT_PRIORITIES.md`.

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
