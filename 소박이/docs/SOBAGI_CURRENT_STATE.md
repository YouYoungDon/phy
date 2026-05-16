# Sobagi — Current State

**Last updated:** 2026-05-16
**Branch:** apps-in-toss-clean
**Replaces:** `docs/project-state-2026-05-15.md` (and all prior dated snapshots)

This document is the authoritative reference for all development roles. Update it when a system changes status. Do not update it just because internal code changed — only when a system's role or visibility changes.

For emotional philosophy and tone rules: see `docs/SOBAGI_PHILOSOPHY.md`.
For current work queue: see `docs/SOBAGI_NEXT_PRIORITIES.md`.
For collaboration protocol: see `docs/AGENT_WORKFLOW.md`.

---

## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-16
**Groups completed:** A (Found item system), B (Atmosphere overlay)

### What changed
- `src/services/foundItemService.ts` — found item trigger system (T1 gap return, T2 new month, T3 quiet day, T4 small café); staged delivery model
- `src/constants/findableItems.ts` — 8 findable items with IDs `f1`–`f8`
- `src/hooks/useAppInit.ts` — calls `promoteStaged()` and `checkForFoundItem()` on app open
- `src/constants/storage.ts` — added `STAGED_ITEM_ID`, `LAST_VISIT_DATE`, `OBSERVATION_SAVE_COUNT` keys
- `src/services/atmosphereService.ts` — `getTimeOfDayTint(hour)` and `getWarmthOpacity(days)` pure functions
- `src/pages/index.tsx` — two stacked `pointerEvents="none"` atmosphere overlay Views inside RoomBackground; bottomFade dissolve; contact shadow; prop depth; level chip warmth; closet removed

### What's now working
- Found item system is live end-to-end: triggers fire, staged item promotes to pending on next app open day, amber dot on bag activates
- Atmosphere overlays render on HomeScreen; time-of-day tint shifts by hour; warmth drift grows with `recordedDaysCount`

### What's fragile or surprising
- `promoteStaged()` has an extra guard: returns early if a pending item already exists (even on a new day). This prevents double-queueing but means only one item can be in the pipeline at a time.
- Atmosphere computes `new Date().getHours()` once per render (not on a timer). Time zone shift during an open session will not update the tint until next re-render.
- Two pre-existing TypeScript errors in `_404.tsx` (unregistered route key) — not blocking, not introduced by this work.

### What the next agent should NOT do
- Do not modify `foundItemService.ts` or `findableItems.ts` — they are committed and tested
- Do not add animation to the atmosphere overlays — they must be static
- Do not remove `pointerEvents="none"` from any overlay View

### Next group
**Group C — Dialogue tier system.** Replaces 5 fixed `EMOTION_MESSAGES` with 3-tier message pools + soft observation layer. Touches `record.tsx`, `storage.ts`, `useAppInit.ts`, and creates two new files.

---

## System Status

### Fully implemented and working

| System | Location | Notes |
|---|---|---|
| HomeScreen room background | `src/pages/index.tsx` | Stage 1 CDN image; closet icon removed |
| Sobagi character (float + spring) | `src/components/SobagiCharacter.tsx` | ±5px float, emotion-change spring pop |
| Tap-to-talk speech bubble | `src/pages/index.tsx` | 12 idle messages, no-consecutive-repeat, 3.5s auto-hide |
| Level chip + progress bar | `src/pages/index.tsx` | Warmed to room palette |
| DailySummary card | `src/pages/index.tsx` | Today's total + record count |
| Record flow | `src/pages/record.tsx` | Amount, category, emotion picker, memo, date chips |
| Reaction screen | `src/pages/reaction.tsx` | Emotion title, floating hearts, auto-dismiss 3.5s |
| Stats / calendar | `src/pages/stats.tsx` | Monthly calendar, expense list, settlement, trend graph |
| DayFeelingCard | `src/components/stats/DayFeelingCard.tsx` | 8 buckets, deterministic text, observation lines |
| Mailbox (static) | `src/pages/index.tsx` | 2 hardcoded letters; read-state persisted |
| Bag + accumulation | `src/pages/index.tsx` | 16 items, minDays thresholds, vacant cells |
| Found item display | `src/pages/index.tsx` | "소박이가 두고 간 것" section in bag |
| Emotion engine | `src/services/emotionEngine.ts` | 5-rule priority chain → SobagiEmotion |
| Atmosphere overlay | `src/pages/index.tsx` + `src/services/atmosphereService.ts` | Time-of-day tint (5 zones) + warmth drift; both `pointerEvents="none"` |
| Found item trigger | `src/services/foundItemService.ts` | T1 gap return, T2 new month, T3 quiet day, T4 small café |
| summaryCard boundary dissolve | `src/pages/index.tsx` | 5-slice bottomFade; no hard border |

### Partially implemented

| System | What exists | What's missing |
|---|---|---|
| Dialogue pools | 5 fixed `EMOTION_MESSAGES` (1 per emotion) | 3-tier pools (3 strings/emotion × 3 tiers); soft observation layer — Group C |
| Mailbox letters | 2 hardcoded letters with hardcoded dates | Dynamic delivery system; personal milestone letters; seasonal world letters — Group D |
| Bag new-item dot | Dot fires for `pendingNewItemId` only | Dot for new `minDays` items available since last bag open — Group E |

### Planned (designed, not built)

| System | Spec | Blocked on |
|---|---|---|
| Room stage 2–5 | Architecture ready; `getRoomStage()` written | Image assets; one-line change in `constants/assets.ts` when art exists |
| Room object accumulation | `docs/superpowers/specs/2026-05-16-sobagi-long-term-progression-design.md` §6 | Sprite assets (plant, bookshelf, candle) |
| Sobagi idle behaviors | Concept only | Image assets |
| Seasonal room ambience | Concept only | Design + assets |
| Year-end recap | Concept only | — |

### Explicitly rejected

- Push notifications
- Streak anxiety framing ("N일 연속!")
- Achievement badges / trophy rooms
- Budget limits, savings goals, spending targets
- Social sharing, leaderboards, comparison
- Spending advice or behavioral nudges
- Gamified unlock announcements
- EXP point system (was built, was removed)
- Finance dashboard summaries

---

## Storage Keys

```
sobagi-user                  → UserState
sobagi-expenses              → Expense[]
sobagi-last-emotion          → SobagiEmotion
sobagi-mailbox-read-ids      → string[]
sobagi-found-item-ids        → string[]
sobagi-pending-item-id       → string | null
sobagi-last-item-date        → string (YYYY-MM-DD)
sobagi-staged-item-id        → string | null
sobagi-last-visit-date       → string (YYYY-MM-DD) — used by dialogueService gap detection
sobagi-observation-save-count → number — cooldown tracking for observation messages
```

Keys added by Group D: `sobagi-mailbox-delivered-ids → string[]`
Keys added by Group E: `sobagi-last-bag-open-days → number`

---

## Known Issues

### Emotional integrity issues
- **Floating hearts on every record** — charming on record #1, performative by record #30. No mechanism to scale down. Known long-term pacing issue.
- **EMOTION_MESSAGES are 5 fixed strings** — user has memorized all responses by end of week 2. Group C fixes this.

### UX gaps
- **DayFeelingCard renders for future dates** — should guard `dateStr <= todayStr`; currently shows "잠잠하게 흘러간 하루" for days that haven't happened
- **Emotion picker missing `(선택)` label** — memo shows "(선택)" but emotion does not, implying it might be required
- **Trend graph bars not interactive** — natural expectation is to tap a bar and select that day
- **Mailbox letters have hardcoded dates** — "5월 초", "5월 15일"; out-of-time for users starting in later months. Group D fixes this.
- **After reading 2 letters, mailbox becomes a dead feature** — Group D fixes this.

### Technical / architectural
- **Pre-existing TS errors in `_404.tsx`** — unregistered route key `/_404` in `router.gen.ts`; not blocking; not introduced recently
- **DATE_OPTIONS in record.tsx is module-level** — won't update if app is open past midnight; edge case, acceptable for MVP
- **Android keyboard** — `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`: Android save button may be covered

### Long-term tone concerns
- **Settlement section feels like finance dashboard** — large bold monetary totals; design tension with emotional identity; medium-term redesign needed
- **Stats screen density** — calendar + expense list + DayFeelingCard + settlement + trend graph is genuinely dense for a "quiet reflection" screen
- **Level chip and progress bar** — level chip and bar together feel HUD-like; the progress bar especially ("you need to fill this") creates mild pressure for new users

---

## Technical Architecture

### Stack
- React Native 0.84.0 (Hermes)
- React 19.2.3
- TypeScript 5.8.3, `noUncheckedIndexedAccess: true`
- Zustand 5.x (no middleware)
- Granite SDK `@granite-js/react-native` 1.0.25
- `@toss/tds-react-native` 2.0.3 (minimally used)

### Routing
- `createRoute(path, options)` per screen
- `useNavigation()` for navigation
- No React Navigation — Granite's own router
- Routes: `/`, `/record`, `/reaction`, `/stats`

### Stores
| Store | State |
|---|---|
| `useEmotionStore` | `currentEmotion`, `currentMessage` |
| `useExpenseStore` | `expenses[]` |
| `useUserStore` | `level`, `streak`, `totalRecordCount`, `recordedDaysCount`, `roomStage` |

### Services
| Service | Responsibility |
|---|---|
| `storageService.ts` | Thin storage wrapper, JSON encode/decode |
| `expenseService.ts` | Orchestrates save: streak, isNewDay, store updates |
| `emotionEngine.ts` | Pure: evaluate(expense, ctx) → SobagiEmotion |
| `dayFeelingService.ts` | Pure: getDayFeeling(expenses, dateStr) → DayFeelingResult |
| `foundItemService.ts` | Trigger check + staged delivery on app open |
| `atmosphereService.ts` | Pure: getTimeOfDayTint(hour), getWarmthOpacity(days) |

### Key TypeScript patterns
- `noUncheckedIndexedAccess` requires `?? fallback` on all array/Record access
- Switch preferred over `Record<K, V>` lookups for the above reason
- Non-empty tuple types `[T, ...T[]]` guarantee `arr[0]` is defined
- All `Partial<Record<...>>` maps require fallback everywhere

### Date handling
All date logic via `src/utils/date.ts`:
- `getLocalDateString(date)` → `YYYY-MM-DD` in device local time
- `localDateToISOString(dateStr)` → ISO string anchored at local noon

### Assets
- All images on jsDelivr CDN, pinned to specific git commit SHA
- `constants/assets.ts`: `ROOM_BACKGROUND_URIS`, `SOBAGI_IMAGE_URIS`, `SOBAGI_DEFAULT_URI`
- All maps `Partial<Record<...>>` — fallback required everywhere
- Current images: room_stage1.png, sobaki.png, sobaki_happy.png, sobaki_excited.png, sobaki_surprised.png, sobaki_sleepy.png, sobaki_sad.png

### Build commands
```
npm run dev        → Granite dev server
npm run build      → ait build → .ait artifact
npm run clean      → delete Metro cache + Haste index (fixes SHA-1 errors after new files)
npm test           → Jest (currently 48 tests, 5 suites)
npm run typecheck  → tsc --noEmit
```

---

## Progression Structure

**Metric:** `recordedDaysCount` — distinct local calendar days with ≥ 1 expense. Recomputed fresh from expense array on every app init.

**Level thresholds:**

| Level | Days | Real-time meaning |
|---|---|---|
| Lv.1 | 0 | Day one |
| Lv.2 | 7 | One week |
| Lv.3 | 20 | Three weeks |
| Lv.4 | 40 | Six weeks |
| Lv.5 | 70 | ~2.5 months |
| Lv.6 | 110 | ~4 months |
| Lv.7 | 160 | ~5.5 months |

Thresholds are slow — no reward for binging, only for consistent presence.

**Progression anchor points (from long-term design):**

| Anchor | Threshold | What changes |
|---|---|---|
| First week | `recordedDaysCount ≥ 7` | Dialogue tier 2 activates; first found item fires; warmth drift perceptible |
| One month | `recordedDaysCount ≥ 30` | Dialogue tier 3 activates; warmth drift noticeable |
| Long while | `recordedDaysCount ≥ 90` | Warmth drift at ceiling (0.06 opacity); deepest dialogue tier |

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

---

*Update this document when systems change status. The "Latest Handoff" section is replaced by each completing agent.*
