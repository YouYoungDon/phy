# Sobagi — Current State

**Last updated:** 2026-05-17 (QA pass — Group F)
**Branch:** apps-in-toss-clean
**Replaces:** `docs/project-state-2026-05-15.md` (and all prior dated snapshots)

This document is the authoritative reference for all development roles. Update it when a system changes status. Do not update it just because internal code changed — only when a system's role or visibility changes.

For emotional philosophy and tone rules: see `docs/SOBAGI_PHILOSOPHY.md`.
For current work queue: see `docs/SOBAGI_NEXT_PRIORITIES.md`.
For collaboration protocol: see `docs/AGENT_WORKFLOW.md`.

---

## Latest Handoff

**Agent:** QA
**Date:** 2026-05-17
**Groups reviewed:** Group F (Photocard)

### What changed
- `docs/SOBAGI_CURRENT_STATE.md` — this document: stale partial/planned rows cleaned up; QA-2026-05-16 regressions confirmed fixed and removed; Group F QA findings added

### What's now working
- **All three QA-2026-05-16 critical regressions confirmed fixed:**
  - `atmosphereService` wired in `index.tsx` lines 219–228: time-of-day tint + warmth drift overlays, both `pointerEvents="none"` ✓
  - `returnAfterGap` fires correctly: `useAppInit.ts` stores previous visit date in module-level `prevVisitDate`; `record.tsx` reads it via `useState(() => getPrevVisitDate())` lazy initializer before init overwrites storage ✓
  - `reaction.tsx` title is now tier-aware: `getReactionTitle(emotion, tier)` has 3 tiers of copy ✓
- **Group F (Photocard) confirmed working:** dark modal, 1.8s white-overlay reveal, quote fade-in at t=1.8s, tap-anywhere-to-close, `"나중에 할게요"` dismiss, auto-dismiss paused while button is visible, tier-aware title on reaction screen

### What's fragile or surprising
- **Warmth color mismatch (fix required):** `index.tsx` uses `'#E8C070'` (golden amber) for warmth overlay; `PhotocardView.tsx` uses `'#C87941'` (burnt orange). The photocard atmosphere will not match the room at the moment of generation. Fix: `PhotocardView.tsx` line 76 — `'#C87941'` → `'#E8C070'`
- **Missing time-of-day label at card top:** Spec calls for date + time-of-day icon (아침☀️ / 낮🌤 / 저녁🌅 / 밤🌙) at the card's top edge. Implementation places only the date at the bottom context strip. Temporal context ("this was a 밤 record") is absent; the "snapshot of a moment" quality is weaker
- **Missing "Sobagi" signature:** Spec calls for a small muted "Sobagi" label between the quote panel and context strip. Not implemented. The card has no authorial voice anchor
- **Early tap dismissal during animation:** `photocardModal onPress={closePhotocard}` is active from t=0. A fast tap closes the modal before the card develops. The spec says the animation always plays fully. Consider an `isRevealing` state guard that disables `onPress` for the first 1.8s
- **Quote `fontStyle: italic`:** Combined with `"..."` quotation marks the quote reads as a formal caption. Recommend removing `fontStyle: 'italic'` from `quoteText` in `PhotocardView.tsx`
- **Missing spring settle (t=2.1–2.4s):** Spec calls for a 0.985 → 1.0 scale settle after the quote fades in. Not implemented. Minor — "imperceptible" per spec — but explicitly specified
- **Photocard button on every save, indefinitely:** By design. Worth monitoring as habituation/pressure risk at record 100+
- **CDN image load:** 1800ms white overlay covers typical load window; on very slow connections Sobagi may not appear after reveal. No placeholder — intentional per spec, but emotionally jarring if Sobagi is absent
- `"잘 기록해뒀어요"` (Tier 1 happy pool) — "잘" borderline against anti-pattern. Not yet fixed
- `"오늘도 수고했어요"` (IDLE_MESSAGES) — "수고했어요" evaluates effort. Not yet fixed
- Floating hearts on every reaction — charming on record #1, performative by record #30

### What the next agent should NOT do
- Do not add save/share/capture to the photocard — Tier 2 presentation is the product
- Do not add analytics data (time distribution %) to the card
- Do not add a card counter ("포토카드 N번째") or collection grid
- Do not add daily generation pressure copy ("오늘도 포토카드를 만들어봐요!")
- Do not animate generation with bounce-in, confetti, or fanfare

### Next group
**Immediate fix:** warmth color in `PhotocardView.tsx` line 76 — one-line change: `'#C87941'` → `'#E8C070'`. Then **copy reviews**: `"잘 기록해뒀어요"` → `"조용히 기록해뒀어요"` in `src/constants/dialogue.ts`; `"오늘도 수고했어요"` → observational alternative in `src/pages/index.tsx`. No major engineering groups remain in scope.

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
| Reaction screen | `src/pages/reaction.tsx` | Tier-aware title (3 tiers × 5 emotions), floating hearts; auto-dismiss paused when photocard button visible |
| Photocard (Group F) | `src/components/photocard/PhotocardView.tsx`, `src/pages/reaction.tsx` | Tier 2 baseline: 9:16 card, 1.8s white-reveal, quote fade-in; screenshot-first; no capture/save/share |
| Stats / calendar | `src/pages/stats.tsx` | Monthly calendar, expense list, settlement, trend graph |
| DayFeelingCard | `src/components/stats/DayFeelingCard.tsx` | 8 buckets, deterministic text, observation lines |
| Mailbox (dynamic) | `src/pages/index.tsx`, `src/services/letterService.ts`, `src/constants/letters.ts` | Dynamic delivery; personal milestone letters + seasonal world letters; `MAILBOX_DELIVERED_IDS` tracks delivery |
| Dialogue tier system | `src/constants/dialogue.ts`, `src/services/dialogueService.ts`, `src/pages/record.tsx` | 3-tier reaction pools; observation detection (4 types); `record.tsx` selects tier + observation; `reaction.tsx` title tier-aware |
| Bag + accumulation | `src/pages/index.tsx` | 16 items, minDays thresholds, vacant cells |
| Found item display | `src/pages/index.tsx` | "소박이가 두고 간 것" section in bag |
| Emotion engine | `src/services/emotionEngine.ts` | 5-rule priority chain → SobagiEmotion |
| Atmosphere overlay | `src/pages/index.tsx` + `src/services/atmosphereService.ts` | Time-of-day tint (5 zones) + warmth drift; both `pointerEvents="none"` |
| Found item trigger | `src/services/foundItemService.ts` | T1 gap return, T2 new month, T3 quiet day, T4 small café |
| summaryCard boundary dissolve | `src/pages/index.tsx` | 5-slice bottomFade; no hard border |

### Partially implemented

All previously partial systems are now complete. No items in this status.

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

### Group F QA findings (QA 2026-05-17)
- **Warmth color mismatch (fix required):** `index.tsx` uses `'#E8C070'` for warmth overlay; `PhotocardView.tsx` uses `'#C87941'`. At the same moment and same `recordedDaysCount`, the card will show a more saturated warm tone than the room. Fix: `PhotocardView.tsx` line 76, change `'#C87941'` → `'#E8C070'`.
- **Missing time-of-day label:** Spec shows date + time-of-day icon (아침☀️ / 낮🌤 / 저녁🌅 / 밤🌙) at the card's top edge. Implementation shows only date in the bottom strip. The "this was a 밤 record" temporal specificity is absent.
- **Missing "Sobagi" signature:** Spec shows a small muted "Sobagi" label between the quote panel and context strip. Not implemented. The card has no authorial voice anchor that connects it to the companion voice the user already knows.
- **Early tap dismissal during animation:** `onPress={closePhotocard}` is active from t=0 on the modal. A user who taps during the 1.8s reveal closes the modal before seeing the card. The spec explicitly states the animation always plays fully. Suggest: gate the `onPress` behind an `isRevealing` state that clears at t=1.8s.
- **Quote `fontStyle: italic`:** Combined with `"..."` quotation marks, the quote reads as a formal caption rather than Sobagi's voice. Recommend removing `fontStyle: 'italic'` from `quoteText` in `PhotocardView.tsx`.
- **Missing spring settle animation:** Spec calls for a 0.985 → 1.0 scale spring at t=2.1–2.4s after quote appears. Not implemented. Low impact ("imperceptible" per spec) but the weight-settling feeling is part of the photograph-developing metaphor.
- **Context strip: amount before categories:** Implementation renders `32,400원 · 카페 · 식비` (amount first). Spec shows categories left, amount right-aligned. The current ordering makes the financial figure the first thing read in the context strip.
- **No `numberOfLines` limit on quote text:** Dialogue system produces 1–2 line messages so this is low risk, but a very long unexpected string could compress or overflow the card layout. A defensive `numberOfLines={4}` on `quoteText` would prevent layout breaks.

### Emotional integrity issues
- **Floating hearts on every record** — charming on record #1, performative by record #30. No mechanism to scale down. Known long-term pacing issue.
- **`"잘 기록해뒀어요"` in Tier 1 happy pool** — "잘" is borderline against the "잘했어요" anti-pattern. Consider replacing with a fully neutral alternative such as "조용히 기록해뒀어요" (already in EMOTION_MESSAGES).
- **`"오늘도 수고했어요"` in IDLE_MESSAGES** — "수고했어요" evaluates the user's effort rather than observing alongside them. Borderline; flag for copy review.

### UX gaps
- **DayFeelingCard renders for future dates** — should guard `dateStr <= todayStr`; currently shows "잠잠하게 흘러간 하루" for days that haven't happened
- **Emotion picker missing `(선택)` label** — memo shows "(선택)" but emotion does not, implying it might be required
- **Trend graph bars not interactive** — natural expectation is to tap a bar and select that day

### Technical / architectural
- **Pre-existing TS errors in `_404.tsx`** — unregistered route key `/_404` in `router.gen.ts`; not blocking; not introduced recently
- **DATE_OPTIONS in record.tsx is module-level** — won't update if app is open past midnight; edge case, acceptable for MVP
- **Android keyboard** — `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`: Android save button may be covered

### Long-term tone concerns
- **Settlement section feels like finance dashboard** — large bold monetary totals (fontSize:18, fontWeight:'700') + top category chip + streak-based text = three financial data signals in one card; design tension with emotional identity; medium-term redesign needed
- **Stats screen density** — calendar + expense list + DayFeelingCard + settlement + trend graph is genuinely dense for a "quiet reflection" screen
- **Level chip and progress bar** — level chip and bar together feel HUD-like; the progress bar especially ("you need to fill this") creates mild pressure for new users; `함께한 날 {count} / {threshold}` makes the goal explicit
- **Dialogue tier transitions are hard thresholds** — tone shifts abruptly at day 7 and day 30; a user who records on both sides of a threshold will notice the change on consecutive days. Not fixable without blending, but worth flagging as a 90-day experience risk.

### Edge cases (QA 2026-05-16)
- **Backdated records skew observation detection** — saving multiple backdated records in one session can falsely trigger `categoryWarm` or `timeOfDay` (the detection window looks at the past 7 days of records, not at when saves happened). Low frequency, acceptable for now.
- **T2 (new-month trigger) fires at exactly `recordedDaysCount = 3`** — GRACE_DAYS is 3, so if the user's 3rd recorded day happens to be the 1st of a month, both the grace period end and new-month trigger coincide. A found item appears very early. Not a bug, but the 3-day grace is the absolute minimum; any earlier would feel intrusive.
- **DayFeelingCard renders for current incomplete day** — if the user opens stats at 8am, DayFeelingCard assesses a day still in progress. Sobagi's observation about a "잠잠한 하루" is premature. The existing guard for `dateStr <= todayStr` needs implementation; the fix is already in the backlog.
- **Bag tab resets to 장신구 on every open** — even if the user was last browsing 장난감, next open returns to the first tab. Low friction but worth noting.

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

## Photocard Design Specification

**Finalized:** 2026-05-17. This spec is the authoritative reference for Group F implementation.

### What the photocard is

An optional emotional snapshot of a day. The user generates it, keeps it if they want it, shares it if it feels right. It is not a reward, not a daily task, and not a collection mechanic.

### Core experience flow: Generate → Reveal → Keep

```
1. User finishes recording → lands on reaction screen
2. Reaction screen shows Sobagi's emotional response (current behavior)
3. Below the reaction content: quiet "포토카드 생성" button (secondary style, not primary CTA)
4. "나중에 할게요" link exits the reaction screen normally
5. User taps "포토카드 생성" → reaction screen transitions to generation modal
6. Generation modal: card develops slowly from white-washed to full image (~1.8s)
7. Card is fully revealed: Sobagi in room atmosphere + emotional quote
8. Quote text fades in gently (0.3s after card is visible)
9. Card settles with a soft spring (0.3s) — modal is now fully interactive
10. User screenshots it naturally, or taps X to close
```

**Production baseline (confirmed 2026-05-17):** Tier 2 — presentation only. `react-native-view-shot` (RNViewShot) is absent from the Toss host native bridge. No save button. No share button. Screenshot sharing is the intended user behavior.

### Entry point and auto-dismiss behavior

The reaction screen currently auto-dismisses in 3.5s. When the photocard button is visible, this changes:
- Auto-dismiss is **paused** as soon as the photocard button renders
- User must actively navigate away ("나중에 할게요" or back button)
- This prevents the generation option from disappearing before the user notices it
- Do NOT increase the auto-dismiss timer — pause it entirely when photocard is present

### Modal behavior

The generation modal is a full-screen overlay (not a navigation route). It sits on top of the reaction screen. Close button (X) in the top-right corner dismisses it and returns to the reaction screen, then auto-dismiss resumes.

Inside the modal:
- **Generating state:** white-to-image cross-fade animation (see below), no other chrome
- **Revealed state:** card centered vertically; X button top-right; no buttons below the card
- No navigation chrome, no header, no title
- The card is positioned to fill most of the screen — sized and framed for natural screenshotting

### Generation animation philosophy

The card develops like a photograph — not like a loading screen, not like a reward chest, not like content unlocking.

**Sequence:**
1. A cream-white rectangle appears at card dimensions (portrait, 9:16 ratio within the modal)
2. Over 1.8 seconds: the actual card image cross-fades in from beneath the white wash. Not an opacity fade (which would show the modal background through the card). A white overlay that decreases in opacity from 1.0 → 0.0.
3. After the image is fully visible (t=1.8s): the quote text fades in (opacity 0 → 1, duration 0.3s)
4. After the quote is visible (t=2.1s): a single very soft spring — card scales from 0.985 → 1.0, imperceptible but adds a sense of weight settling
5. At t=2.4s: animation complete — modal is fully interactive (X button active)

**Rules:**
- No progress bar, spinner, or percentage counter
- No celebratory bounce, particle burst, or confetti
- No "완성!" headline
- Total generation time: ~2.4 seconds
- Animation is always capability-agnostic — it plays fully regardless of device speed or platform

### Card composition (9:16 portrait)

```
┌─────────────────────────────────────┐
│ 2026.05.16              밤 🌙       │  ← small, top edge, muted
│                                     │
│                                     │
│         ┌─────────────────┐         │
│         │  Room background │         │  ~60% of card height
│         │  with atmosphere │         │
│         │  + Sobagi pose   │         │
│         └─────────────────┘         │
│                                     │
│  "오늘도 조용히                       │
│   마음이 쌓였어요."                   │  ← large centered, 2 lines max
│                                     │
│             Sobagi                  │  ← small signature, muted
│                                     │
│  12건 기록 · 카페 · 식비 · 교통       │  ← tiny, muted
│                      ₩32,400        │  ← tiny, muted, right-aligned
└─────────────────────────────────────┘
```

**Composition hierarchy (what engineering must preserve):**
1. **Dominant (60% of card area):** Room background image with atmosphere tint at generation time
2. **Primary text (large, centered, cream-on-dark or dark-on-light):** Emotional quote from `currentMessage` in emotionStore — the same line Sobagi just said on the reaction screen
3. **Signature (small, muted):** "Sobagi" — not Sobagi 소박이, just Sobagi
4. **Context (tiny, bottom, muted):** record count + categories + amount. All in the same small font. Amount is right-aligned, not on its own line of emphasis.
5. **Decorative (corner, very small):** Date and time-of-day label + icon (아침☀️ / 낮🌤 / 저녁🌅 / 밤🌙)

**What does NOT appear on the card:**
- Time distribution percentages (아침 25% 낮 50%…) — analytics feel, violates design identity
- Emotional assessment labels ("따뜻한 하루였네요") — redundant with the quote, can feel evaluative
- Streak count, level, record number
- Any "Sobagi" app logo or badge

### Quote source

The quote is `currentMessage` from `useEmotionStore`. This is already set during the record save flow — it's the line the dialogue system selected for this save. No new computation required. The photocard simply reflects what Sobagi already said.

### Room atmosphere on the card

The card background uses:
- The room stage 1 background image (same as HomeScreen)
- `getTimeOfDayTint(hour)` applied at generation time as a tinted overlay (same logic as HomeScreen atmosphere)
- `getWarmthOpacity(recordedDaysCount)` warmth overlay (same logic)

The card's atmosphere matches the room as it actually looks at the moment of generation — the user is keeping a snapshot of today's room.

### Daily generation rules

- Available after at least one expense is saved today
- No limit on how many times per day the user can generate (regeneration is free)
- Regeneration is silent — no confirmation, no "are you sure?" dialog
- Regeneration replaces the card view in place; no new animation needed if the card data hasn't changed

### Regeneration behavior

Free and quiet. Because the card quote comes from the most recent save's message (stored in emotionStore), regenerating after a second save that day will show a different quote. This is the intended behavior — the card reflects the latest record, not a locked daily state.

If the user generates, shares, then saves another record and generates again: new card, new quote, same room. This is fine.

### Archival and sharing

The app has no in-app archive. No gallery, no collection view, no grid of past cards.

**Screenshot sharing is the production baseline behavior.** The card fills the modal cleanly — minimal chrome, generous margins, portrait composition — so the act of screenshotting it is natural and frictionless. The user screenshots from the OS level; the app does not need to facilitate this.

A future save-to-device path remains possible if the Toss host app adds `react-native-view-shot` native bridge support in a future version. The architecture will admit this without restructuring.

### Technical implementation notes

**Confirmed unavailable (2026-05-17 runtime probe):** `react-native-view-shot` — RNViewShot native bridge is absent from the Toss host app. No image capture, no `saveBase64Data` flow, no save button in MVP.

**Not used:** `@react-native-camera-roll/camera-roll`, `Share.share()`, `Linking.canOpenURL()`, Instagram deep-links. None of these appear in the Group F implementation.

**Card rendering:** Standard on-screen React Native View. No off-screen capture needed. The card renders in-place inside the modal.

**Modal implementation:** `position: 'absolute'`, full-screen overlay inside the reaction screen component tree — not a new route. Card data from stores (`useEmotionStore`, `useUserStore`). No route params needed.

**No new storage keys.** Generation is stateless.

**Platform timing:** Animation is time-based. If the cross-fade takes slightly longer on a slower device, that is fine. Never abort or jump to the revealed state.

### Production baseline

**Tier 2 — Presentation only.** This is not a degraded state. This is the product.

The card appearing is the complete emotional experience. The generation animation is the complete generation experience. Screenshot sharing is a natural, frictionless, OS-level behavior that requires nothing from the app. No save button, no share button, no error states, no fallback UI of any kind.

The implementation should be designed with this truth at its center, not as a subset of a more capable system.

### Anti-gamification checklist for Group F

Before shipping, verify every line:
- [ ] No card counter visible anywhere ("포토카드 3번째")
- [ ] No daily generation prompt in HomeScreen or notification
- [ ] No collection grid or gallery showing completion state
- [ ] Amount is smaller than the quote — never equal or larger
- [ ] Generation animation has no confetti, bounce, or celebratory fanfare
- [ ] Photocard button on reaction screen is secondary style — not the primary CTA
- [ ] "나중에 할게요" dismissal is always one tap, no friction

---

*Update this document when systems change status. The "Latest Handoff" section is replaced by each completing agent.*
