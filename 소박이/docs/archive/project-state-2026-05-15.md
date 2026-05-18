# Sobagi — Project State Document
**Date:** 2026-05-15
**Branch:** apps-in-toss-clean
**Status:** MVP feature-complete, emotional polish phase
**Previous doc:** docs/project-state-2026-05-14.md

This document is the authoritative reference for all development roles (Product/UX, Engineering, QA, Design). It reflects the actual current state of the codebase — not aspirational plans.

---

## 1. What Sobagi Is

Sobagi is a quiet companion space that slowly accumulates meaning as the user records their life.

At its core it is an emotional record, not a finance tracker. The user enters a spend, Sobagi reacts gently, and over time the room and bag acquire character. The product is about the feeling of having kept a record — not the analysis of that record.

Sobagi is patient. It does not demand attention. It does not push notifications or celebrate streaks loudly. It simply exists, and it changes — slowly, honestly — as the user shows up.

**What Sobagi is NOT:**
- A budgeting or savings app
- A personal finance dashboard
- A productivity or habit tracker
- A gamified reward loop
- A social or sharing platform
- A tool for financial insight, optimization, or behavioral change

---

## 2. Core Experience Loop

```
Record → Reaction → Accumulation → Gentle Change
```

1. **Record** — user notes a spend (amount, category, optional emotion + memo)
2. **Reaction** — Sobagi responds with an appropriate emotion and short message
3. **Accumulation** — a new day's data settles; `recordedDaysCount` grows
4. **Gentle Change** — over weeks, the room and bag slowly evolve

This loop should feel like tending to something small, not completing a task.

---

## 3. Implemented Features (Built and Working)

### HomeScreen (`src/pages/index.tsx`)

- Room background image (stage 1, loaded from jsDelivr CDN)
- Sobagi character with idle float animation (sinusoidal ±5px, 1800ms per half-cycle)
- Emotion-change spring pop (scale 0.85 → 1.0, damping 10, stiffness 120)
- Level chip (top-left): "Lv.N 소박이" in a semi-transparent dark pill
- Progress bar + "함께한 날 N / M" label (below chip)
- **Tap-to-talk:** tapping character area shows speech bubble with idle message, auto-hides after 3.5s with 220ms fade-in / 400ms fade-out
- 12 idle messages, no-consecutive-repeat guard
- DailySummary card at bottom: today's total + record count
- Three room prop icons: 📬 mailbox, 🚪 closet, 🎒 bag (tappable, open bottom sheets)
- BottomTabs: Home / Record / Stats

### Record Flow (`src/pages/record.tsx`)

- Amount entry: hero 44px display, separate text input below
- Category selector: cafe / food / transport / shopping / other (emoji chips)
- User emotion picker: 😊 좋아 / 😐 그냥 / 😔 속상 / 😤 억울 / 🥰 뿌듯 (optional, no `(선택)` label — known gap)
- Optional memo (60 char max)
- Date chips: horizontal scroll, 30 days back + today, auto-scrolled to today on mount
- Save guard: disabled until amount > 0
- On save: runs emotionEngine → sets emotion + message → persists → navigates to /reaction
- BottomTabs visible outside KeyboardAvoidingView so keyboard does not displace them
- Keyboard scroll: scrolls to top for amount focus, to memo field for memo focus

### Reaction Screen (`src/pages/reaction.tsx`)

- Emotion-specific soft title via `getReactionTitle(emotion)` switch:
  - surprised → "처음 들렀네요 ✨"
  - excited → "조용히 이어지고 있네요 🌿"
  - sleepy → "이 시간까지 기록했네요 🌙"
  - soft-sad → "오늘은 좀 특별한 날이었네요"
  - happy → "오늘도 다녀왔네요 🌿"
- Three floating hearts (❤️ 🧡 💛), staggered fade-rise animation
- SobagiReaction component: character + always-visible speech bubble
- Auto-dismisses after 3.5s; tapping anywhere dismisses immediately
- "화면을 탭하면 홈으로" hint text
- On close: `navigation.reset()` back to home root

### Stats / Calendar (`src/pages/stats.tsx`)

- Monthly calendar with month navigation (cannot advance past current month)
- Week-row grid (7 × `flex: 1` cells, no float rounding drift)
- Day/sat/sun color coding by column position
- Days with spending: tiny 9px olive amount chip
- Day selection: tapping a day shows its expense list
- **Content order (top to bottom):**
  1. Calendar
  2. Selected-day expense list (only shown when expenses exist)
  3. DayFeelingCard ("오늘의 소박한 하루")
  4. Settlement section (this week / month total / top category / streak)
  5. Monthly trend graph

### DayFeelingCard ("오늘의 소박한 하루") (`src/components/stats/DayFeelingCard.tsx`)

- Renders for the currently selected calendar day
- Props: `{ dateStr, expenses, totalAmount }`
- 8 day-feeling buckets (see dayFeelingService below)
- Soft pastel background per bucket (no finance colors)
- SobagiEmotionFace at 56px as the emotional anchor
- Main line: 17px/600 weight, centered
- Up to 2 observation lines: 12px, muted, centered
- Total amount: 10px absolute bottom-right, textLight — very quiet
- Corner 🌿 decoration (absolute top-right, opacity 0.55)
- Date label: "N월 N일 요일" format
- Deterministic text via date-as-seed (same date always → same message)
- `minHeight: 200`

### dayFeelingService (`src/services/dayFeelingService.ts`)

Pure function: `getDayFeeling(expenses, dateStr) → DayFeelingResult`

Priority order of feeling detection:
1. **hard** — userEmotion is 😔 or 😤
2. **caffeinated** — cafe count ≥ 2
3. **warm** — food ≥ 2, or food ≥ 1 + cafe ≥ 1
4. **sweet** — any cafe/food expense < 6,000원
5. **selfcare** — shopping present
6. **active** — transport + ≥ 3 distinct categories
7. **quiet** — total < 10,000원 or no expenses
8. **modest** — fallback

Background colors: hard `#ECE9F2`, caffeinated/active `#ECF0E8`, warm/sweet `#F5EDE3`, selfcare `#F0EBF5`, quiet `#F2EFEB`, modest `#FAF6EE`

Each bucket has a pool of 3 main-line strings; `buildObservations()` adds up to 2 secondary observations from actual expense data, skipping categories already covered by the dominant bucket.

### Settlement Section (inside StatsScreen)

- This week total / month total as large numbers
- Top category chip: "이번 달은 X이 제일 많았어요"
- Streak line (guilt-free):
  - streak ≥ 3 → "요즘 자주 들르고 있네요 🌿"
  - streak ≥ 1 → "오늘도 잠깐 들렀네요 🍃"
  - streak 0 → "가끔씩 들러도 괜찮아요 🌿"

### Monthly Trend Graph (inside StatsScreen)

- Bar chart: one bar per day, bar height proportional to daily total
- Days with no data: 2px flat stub bar (appropriately humble)
- X-axis labels only at days 1, 8, 15, 22, 29
- Y-axis: max and midpoint monetary values
- Not interactive (tapping a bar does nothing — known gap)

### Emotion System

**emotionEngine.ts** — pure function:
```
isFirstRecordToday  → surprised
currentStreak ≥ 3   → excited
currentHour ≥ 22    → sleepy
amount ≥ 50,000     → soft-sad
default             → happy
```

**EMOTION_MESSAGES** (bubble text in reaction screen):
- surprised: "오늘 처음 들렀네요 ✨"
- excited: "따뜻한 하루 같았어요 🌿"
- sleepy: "이 시간에도 기록하다니... 소박이도 졸려요 zzz"
- soft-sad: "오늘은 꽤 큰 날이었네요 🌿"
- happy: "조용히 기록해뒀어요 🌿"

All messages are observational. No praise, no streak celebration, no judgment.

### Mailbox (`src/pages/index.tsx` — inline)

- 2 hardcoded letters with hardcoded dates ("5월 초", "5월 15일")
- Bottom sheet with spring-in / timing-out animation
- "새 편지" badge appears on individual letter cards when unread
- Soft orange `!` badge on mailbox icon when any letter unread
- All letters marked read when sheet opens
- Read state persisted to storage (`MAILBOX_READ_IDS`)

### Bag (`src/pages/index.tsx` — inline)

- 4 tabs: 장신구 / 재료 / 간식 / 장난감
- 4×4 grid per tab (16 total items across all tabs)
- **Gradual accumulation via `minDays` thresholds** (recordedDaysCount-gated):
  - Day 0 visible: 꽃잎 핀 (장신구), 찻잎 (재료), 버터 쿠키 (간식) — 3 items at start
  - Days 3–40: remaining 13 items appear gradually across all 4 tabs
  - 장난감 tab starts completely empty (first item at day 3)
- Items below threshold render as vacant cells (faint dot, opacity 0.38)
- Tapping an item shows its description in a card below the grid
- "소박이가 두고 간 것" section: renders found items as chips when any exist
- Tapping a found item shows its `findLine` description

### Found Item System (UI complete, trigger missing)

- `FINDABLE_ITEMS` constant: 8 items with emoji, name, and `findLine` text
- `foundItemIds` persisted to storage
- `pendingNewItemId` persisted to storage
- Amber dot on 🎒 icon when `pendingNewItemId !== null`
- Opening bag moves `pendingNewItemId` into `foundItemIds`
- **TRIGGER IS NOT IMPLEMENTED** — nothing in the codebase calls `storageService.save(STORAGE_KEYS.PENDING_NEW_ITEM_ID, ...)`. The entire found item flow is dark.

### Closet (Stub)

- Icon `🚪` opens a bottom sheet
- Content: "지금은 초록 스카프를 두르고 있어요. 다음엔 어떤 색이 좋을까요? 옷장은 천천히 채워지는 중이에요 🧣"
- This is placeholder content. No functional closet system exists.

### Progression System

- **Metric:** `recordedDaysCount` — distinct local calendar days with ≥ 1 expense
- **Level thresholds (cumulative days):** Lv.1: 0, Lv.2: 7, Lv.3: 20, Lv.4: 40, Lv.5: 70, Lv.6: 110, Lv.7: 160
- Level changes: level chip number updates, nothing else visible changes
- `roomStage` always returns 1 (hardcoded — stage 2+ assets do not exist)
- On every app init, `recordedDaysCount` is recomputed from expenses to prevent drift

---

## 4. Partially Implemented Systems

| System | What Exists | What's Missing |
|--------|-------------|----------------|
| Found item flow | Storage keys, UI display, FINDABLE_ITEMS content, bag dot notification | Any trigger that assigns a found item |
| Closet | Icon, sheet, placeholder text | Actual closet content or mechanic |
| Dialogue pools | EMOTION_MESSAGES (5 fixed strings, 1/emotion) | Message pools (3–5 per emotion), 13-context contextual system |
| Bag accumulation | minDays thresholds, vacant cell rendering | Items feel static per session — user must re-open bag on different days to notice change |

---

## 5. Planned Systems (Designed Only, Not Built)

### Contextual Dialogue (13-context system)
Full spec exists (prior session). Would replace the 5 fixed EMOTION_MESSAGES with context-aware pools:
- First ever record
- Returning after a gap (needs `lastVisitDate` storage)
- Quiet week (few categories)
- Late night
- Streak continuation
- etc.

Requires: `lastVisitDate` in storage, pool-based message selection, priority ordering.

### Time-of-Day Room Ambience
Five light zones by device hour (dawn/morning/afternoon/evening/night). Room tint shifts subtly. Sobagi's default emotion may lean toward the zone. No user config — just happens.

### Room Stage 2–5
`getRoomStage()` is written and waiting. Architecture is ready. Blocked on art assets. When stage 2 image exists, a one-line change in `constants/assets.ts` enables it.

### Sobagi Idle Behaviors
Sobagi reads, naps, looks toward window. Frame-based or looping animations triggered by time or time-since-interaction. Requires new image assets per idle state.

### Evening Reflection
After ~21:00, a short text fragment appears softly in the room. Auto-hides. Not a notification — just ambient text. No asset dependency; could be implemented now.

### Room Object Accumulation
Plant that grows, bookshelf that fills, coffee cups that accumulate near cafe records. Narrative artifacts, not UI elements. Changes happen between sessions, never during one.

### Year-End Recap
Single quiet screen. "이런 한 해였어요." Concept only.

### Seasonal Ambience
Room color temperature shifts by month. Deterministic rain some days (world property, same day for all users). Concept only.

---

## 6. Rejected / Explicitly Avoided Directions

These are not deferred — they have been reviewed and excluded.

- Budget limits, spending goals, savings targets
- Push notifications
- Streak anxiety framing ("N일 연속!", penalty for missing)
- "Well done" / "Great job" praise language
- Achievement badges, trophy rooms, rarity labels
- Finance dashboard summaries (budget vs actual, category percentages)
- Social sharing, leaderboards, comparison features
- Spending advice or behavioral nudges
- Gamified unlock announcements ("NEW ITEM UNLOCKED!")
- EXP point system (was previously tracked, was removed)
- Spending judgment in any form (including soft judgment like "많이 썼네요...")

---

## 7. Emotional UX Philosophy

### Presence Without Pressure
The user should feel welcomed, not evaluated. Sobagi notices — it does not grade. The core tension is accumulation that feels authentic, not urgency that creates anxiety.

### Tone Rules
- Never say "well done," "great job," or equivalent in Korean ("잘했어요," "대단해요")
- Never call out streak numbers ("N일 연속")
- Never imply Sobagi is waiting sadly ("소박이가 기다리고 있어요" creates guilt)
- Prefer sensory/observational over evaluative ("이 시간에 기록하다니요" vs "열심히 했네요")
- Sobagi can be a little tired, wistful, or quiet — it doesn't have to be upbeat
- Messages should be 1–2 lines, never a paragraph
- Avoid exclamation marks in idle messages; occasional soft emoji is fine
- Avoid finance-adjacent vocabulary: "budget," "save," "limit," "goal"

### Accumulation Philosophy
The product succeeds when a user opens it after two weeks away and feels — without being told — that something has changed, and that it changed because they had been there before. Changes should feel discovered, not announced. The room evolves between visits. Items appear in the bag gradually. The user realizes the bag is fuller than it was, not because they were told it would be.

### The Reaction Moment
Recording should feel like leaving a quiet mark, not receiving a reward. The reaction screen exists to acknowledge the act without evaluating it. Celebration is appropriate on the first record — it becomes noise by the fifteenth. The current implementation still runs the floating hearts animation on every record (known long-term pacing issue).

---

## 8. Known Usability Issues (from 2026-05-15 review)

### Critical (affect emotional integrity)
- **Floating hearts on every record** — charming on record #1, performative by record #30. No mechanism to scale down celebration over time.
- **EMOTION_MESSAGES are 5 fixed strings** — by end of week 2, user has memorized all of Sobagi's responses. No variety mechanism.
- **Idle messages pool** — 12 messages. Frequent tappers will exhaust the pool within a few sessions.

### High Priority UX Gaps
- **Found item trigger missing** — the whole found-item system is built but dark. Nothing fires.
- **Emotion picker missing `(선택)` label** — memo shows "(선택)" but emotion does not, implying it might be required.
- **Closet shows a dead end** — the 🚪 icon leads to placeholder text. A tappable dead-end breaks trust. Should be hidden until there's content.
- **Trend graph bars not interactive** — tapping a bar does nothing; natural expectation is to jump to that day.
- **DayFeelingCard renders for future dates** — if user taps a future calendar date with no expenses, they see "잠잠하게 흘러간 하루예요" for a day that hasn't happened.
- **Mailbox letters have hardcoded dates** — "5월 초", "5월 15일". Users who start in July see out-of-time letters.
- **After reading 2 letters, mailbox becomes a dead feature** — no mechanism for new letters.

### Medium Priority UX Gaps
- **Android keyboard** — `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`: Android users get no keyboard avoidance. Save button may be covered.
- **DATE_OPTIONS in record.tsx is a module-level constant** — won't update if app is open past midnight. Edge case, acceptable for MVP.
- **No tappability affordance on Sobagi** — first-time users don't know the character is tappable.
- **Back button on RecordScreen hardcoded to '/'** — pressing back from Record always goes to Home, even if user came from Stats.
- **No entry animation on ReactionScreen** — transition from Record is an instant cut.
- **Progress bar starts empty for new users** — an empty bar implies "you need to fill this," which creates mild pressure.

### Long-Term Pacing Concerns
- **Nothing visibly accumulates after 2 weeks** — room is stage 1, bag changes only if opened on different days, letters are read. The product promises accumulation but delivers a number (recordedDaysCount) that has no visible consequence yet. This is the most urgent product risk.
- **Settlement section feels like a finance dashboard** — large bold monetary totals side-by-side. The section's tone is the furthest from the product's identity.
- **Stats screen information density** — calendar + expense list + DayFeelingCard + settlement + trend graph is genuinely dense for a "quiet reflection" screen.

---

## 9. Technical Architecture

### Stack
- React Native 0.84.0 (Hermes)
- React 19.2.3
- TypeScript 5.8.3 with `noUncheckedIndexedAccess: true`
- Zustand 5.x (state management, no middleware)
- Granite SDK (`@granite-js/react-native` 1.0.25) — Apps-in-Toss miniapp framework
- `@toss/tds-react-native` 2.0.3 (available but minimally used)

### Routing
- `createRoute(path, options)` defines screens
- `useNavigation()` for navigation
- No React Navigation — Granite's own router
- Registered routes: `/`, `/record`, `/reaction`, `/stats`
- `/_404` has a pre-existing TypeScript error (unregistered route type) — not blocking

### Storage
- `Storage` from `@apps-in-toss/framework` (not AsyncStorage)
- `storageService.ts` wraps it: JSON serialize/deserialize, silent catch in production
- Fire-and-forget persistence: stores updated in memory first, then persisted async

### Storage Keys
```
sobagi-user            → UserState
sobagi-expenses        → Expense[]
sobagi-last-emotion    → SobagiEmotion (key only)
sobagi-mailbox-read-ids → string[]
sobagi-found-item-ids   → string[]
sobagi-pending-item-id  → string | null
sobagi-last-item-date   → string (defined but not yet used)
```

### Stores (Zustand)
| Store | State | Key Actions |
|-------|-------|-------------|
| `useEmotionStore` | `currentEmotion`, `currentMessage` | `setEmotion(emotion, message)` |
| `useExpenseStore` | `expenses[]` | `addExpense`, `getTodayExpenses`, `hydrate` |
| `useUserStore` | `level`, `streak`, `totalRecordCount`, `recordedDaysCount`, `roomStage` | `incrementRecordedDays`, `setStreak`, `hydrate` |

### Services
| Service | Responsibility |
|---------|----------------|
| `storageService.ts` | Thin storage wrapper, JSON encode/decode |
| `expenseService.ts` | Orchestrates save: streak, isNewDay, store updates, fire-and-forget persist |
| `emotionEngine.ts` | Pure function: evaluate(expense, ctx) → SobagiEmotion |
| `dayFeelingService.ts` | Pure function: getDayFeeling(expenses, dateStr) → DayFeelingResult |

### Key TypeScript Patterns
- `noUncheckedIndexedAccess` requires `?? fallback` on all array/Record index access
- Switch statements preferred over `Record<K, V>` lookups to avoid the undefined issue
- Non-empty tuple types `[T, ...T[]]` to guarantee `arr[0]` is defined

### Date Handling
All date logic goes through `src/utils/date.ts`:
- `getLocalDateString(date)` → `YYYY-MM-DD` in device local time
- `localDateToISOString(dateStr)` → ISO string anchored at local noon (for past-date expenses)

Past-date records use noon-anchored ISO strings to survive timezone offsets. Streak logic is guarded — only real-time (today-dated) first-of-day records advance the streak.

### Assets
- All images on jsDelivr CDN, pinned to specific git commit SHA
- `constants/assets.ts`: `ROOM_BACKGROUND_URIS`, `SOBAGI_IMAGE_URIS`, `SOBAGI_DEFAULT_URI`
- All maps are `Partial<Record<...>>` — fallback pattern required everywhere
- Current images: room_stage1.png, sobaki.png, sobaki_happy.png, sobaki_excited.png, sobaki_surprised.png, sobaki_sleepy.png, sobaki_sad.png

### Build / Cache
- `npm run dev` → Granite dev server
- `npm run build` → `ait build` produces `.ait` artifact
- `npm run clean` → deletes Metro transform cache + Haste file index from OS temp directory (prevents SHA-1 errors after adding new files)
- `npm test` → Jest, 3 suites, 26 tests (passing)
- `npm run typecheck` → `tsc --noEmit`

---

## 10. Progression Structure

### Metric: recordedDaysCount
Number of distinct local calendar days with at least one expense. Computed fresh from the full expense array on every app init.

### Level Thresholds
| Level | Days Required | Real-Time Meaning |
|-------|--------------|-------------------|
| Lv.1 | 0 | Day one |
| Lv.2 | 7 | One week |
| Lv.3 | 20 | Three weeks |
| Lv.4 | 40 | Six weeks |
| Lv.5 | 70 | ~2.5 months |
| Lv.6 | 110 | ~4 months |
| Lv.7 | 160 | ~5.5 months |

Thresholds are deliberately slow — no reward for binging, only for consistent long-term presence.

### What Progression Drives (Currently)
- Level number displayed in chip
- Progress bar fill (toward next threshold)
- Bag item visibility (`minDays` thresholds gate 13 of 16 items)

### What Progression Does NOT Drive (Yet)
- Room visual changes (blocked on stage 2+ assets)
- New letters in mailbox
- Found item assignments
- Any dialogue context

---

## 11. Bag / Mailbox / Found Item Systems

### Bag — Accumulation Schedule
Items appear based on `recordedDaysCount`. The user is never told items are coming; they should notice the bag has changed.

| Day | New Item | Tab |
|-----|----------|-----|
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

Hidden items render as vacant cells (opacity 0.38, small dot). No unlock animation, no announcement.

### Mailbox — Current State
- 2 letters, hardcoded content and dates
- After initial read, permanently inert
- No mechanism for new letters
- Letter dates will feel out-of-time for users starting in later months

### Found Item System — Current State
- 8 findable items defined in `FINDABLE_ITEMS`
- Storage, display logic, and bag section are all built
- **Trigger does not exist** — no code path sets `PENDING_NEW_ITEM_ID`
- `LAST_ITEM_DATE` storage key exists but is unused

---

## 12. Stats + DayFeelingCard

### Screen Flow (as of 2026-05-15)
```
Header ("소소한 기록 / 이번 달을 조용히 돌아봐요")
  ↓
Calendar (monthly grid, navigable backward)
  ↓
Selected-day expense list (only when expenses exist)
  ↓
DayFeelingCard (always shown for selected day)
  ↓
Settlement section (totals + streak line)
  ↓
Monthly trend graph
```

### DayFeelingCard — Known Edge Case
The card always renders for whatever day is selected. If the user selects a future date with no expenses, they see the "quiet" feeling text for a day that hasn't happened. Fix: guard rendering for `dateStr <= todayStr`.

### Settlement Section — Known Tension
The large bold monetary totals (weekly + monthly) are the most finance-dashboard-feeling element in the app. They conflict with the emotional tone established by the rest of the screen. This section needs softening in the medium term.

---

## 13. Visual Tone Rules

### Color Palette (src/constants/colors.ts)
- cream `#FAF6EE` — primary background
- warmWhite `#FFFDF8` — card surfaces
- oliveGreen `#6B7C4A` — primary accent, selected states
- oliveDark `#4A5C2F` — primary buttons
- wood `#8B6F47` — shadow reference color
- text `#3D3020` — body text
- textMuted `#8C7B6B` — secondary text
- textLight `#B5A898` — tertiary, very quiet info
- surface `#F2EBE0` — chip / inactive cell backgrounds
- card `#FFFCF5` — card background
- border `#E8DDD0` — dividers

**Never use:** blues, high-saturation reds, notification greens, financial greens (#00A86B, etc.)

### Animation Rules
- Idle float: sinusoidal ±5px, 1800ms per half-cycle, loops
- Emotion change: spring scale 0.85 → 1.0, damping 10, stiffness 120
- Bubble fade-in: 220ms (attentive)
- Bubble fade-out: 400ms (like a sigh)
- Auto-hide: 3500ms
- Sheet spring-in: tension 60, friction 11
- Sheet slide-out: 210ms timing

### Typography
- Small type, generous padding
- Section labels: 11–13px, textMuted
- Body text: 13–14px
- Amount displays: 18–44px depending on context
- Always prefer weight over size for emphasis

### Component Tone
- No badge counts on BottomTabs
- No notification dots except the soft amber bag dot and soft mailbox badge
- The mailbox `!` badge is orange — a known tension with the gentle tone (medium-term fix)
- Progress bar fill is olive; track is white at 20% opacity
- Level chip background is rgba(0,0,0,0.32) — works for current dark room, may need adjustment for lighter stages

---

## 14. Anti-Patterns to Avoid

These are recurring risks. Any new feature should be checked against this list.

| Anti-pattern | Why It Hurts |
|-------------|--------------|
| Praise language ("잘했어요", "대단해요") | Turns recording into a performance; users feel they're doing it for Sobagi's approval |
| Streak number calls ("N일 연속") | Creates anxiety about breaking the chain; users feel obligated |
| "Waiting" language ("기다리고 있어요") | Implies absence guilt; Sobagi should never feel disappointed |
| Finance dashboard patterns | Competes with the emotional identity; users feel like they're in a budget app |
| Gamified unlock announcements | Breaks the "quiet accumulation" feeling; discovery should be silent |
| Persistent speech bubbles | Makes the UI feel noisy; Sobagi should only speak when asked |
| Celebration on every record | Correct for record #1; noise by record #30; no mechanism to scale down |
| Badge counts on navigation tabs | Standard app anxiety pattern |
| All items visible from day one | Destroys the accumulation promise before it begins |
| Empty states framed as failure | "Nothing recorded" should never feel like a failure |

---

## 15. Dialogue Philosophy

### Current System (MVP, Rule-Based)
Five emotions → five observational messages. Post-record only.

### Target System (Designed, Not Built)
13 contextual states with message pools (3–5 per state), priority-ordered. States include:
- First-ever record
- First record today
- Streak continuation (without calling out the number)
- Returning after a gap (needs `lastVisitDate` in storage)
- Late night record
- Quiet week
- Big-spend day (softer than current 50k threshold)
- etc.

### Idle Message Philosophy
Sobagi speaks when approached (tapped), not proactively. Short, soft, 1–2 lines. No exclamation marks in idle messages. No repetition (no-consecutive-repeat guard). Can be slightly tired, wistful, or curious — doesn't have to be upbeat.

Current 12 idle messages will feel thin by week 3 of daily use.

---

## 16. Immediate Polish Priorities

In priority order:

1. **Guard DayFeelingCard for future dates** — only render for today or past
2. **Add found item trigger** — even a simple mechanism (e.g., first record of each week, or every 7 `recordedDaysCount`) to make the bag system live
3. **Hide closet icon** — until closet has real content, it creates a dead-end
4. **Add `(선택)` to emotion picker label** — parity with memo section
5. **Softening settlement section numbers** — reduce font size/weight; de-emphasize as financial summary
6. **Emotion message pools** — even 2–3 strings per emotion would significantly reduce repetition
7. **Make trend graph bars tappable** — tap a bar to select that day in the calendar
8. **Android keyboard behavior** — investigate whether save button is accessible on Android

---

## 17. Long-Term Roadmap

### Near-Term (meaningful without new assets)
- Found item trigger implementation
- Contextual dialogue pools (13 contexts, multiple strings each)
- `lastVisitDate` in storage → enables "returning after gap" dialogue
- Evening reflection text fragment (no assets required)
- New mailbox letters tied to level thresholds (Lv.2, Lv.3)
- Trend graph bar tap → day selection

### Medium-Term (requires design or assets)
- Time-of-day room tint overlay (5 zones)
- Sobagi idle behavior variants (3–4 new images: reading, napping, window)
- Settle section redesign (less finance-dashboard)
- Closet: first real content (1–2 outfit options with soft descriptions)

### Long-Term (requires art and significant dev)
- Room stage 2–5 background assets → one-line change in `getRoomStage()` enables it
- Room object accumulation (plant, bookshelf, cafe cups)
- Seasonal room ambience
- Deterministic weather overlay
- Year-end recap screen

---

## 18. Major Lessons Learned

### On Tone
The difference between "잘 기록했어요" and "조용히 기록해뒀어요" feels small in isolation but accumulates into a fundamentally different emotional register over weeks of use. Every line of copy should be checked against the question: "Does this evaluate the user, or observe alongside them?"

### On Accumulation
A system that promises "things will change over time" must actually deliver visible change within the first 2 weeks, or users will stop believing it. The bag now gates items by day, but the room still doesn't change. Room stage 2 is the most leveraged single asset investment available.

### On Gamification Creep
Systems that are not gamified in isolation (level chip, progress bar, streak counter) combine into something that feels like a game if they're all visible at once. Any new system should be evaluated for its cumulative effect, not just its isolated intent.

### On Absence Framing
"Sobagi is waiting for you" and "N days in a row!" are two sides of the same psychological mechanism: they make the user's absence a problem. Sobagi's emotional contract is that returning should feel easy and warm, not like catching up. Any language about absence or continuity must be audited against this.

### On Settlement / Financial Data
Users of a cozy companion app will tolerate seeing their data — they just shouldn't feel like they're in a spreadsheet. The issue isn't the data existing; it's the framing. Large bold numbers without emotional context feel like accounting. The same data at smaller weight, under softer copy, feels like reflection.

---

*This document reflects the state of Sobagi as of 2026-05-15, after the emotional polish pass. Update it when design decisions change or systems move from one status category to another. Do not update it just because code changed — update it when the system's role or status changes.*
