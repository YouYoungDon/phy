# Sobagi — Project State Document
**Date:** 2026-05-14  
**Branch:** apps-in-toss-clean  
**Status:** Active development, MVP feature-complete, polish phase

---

## 1. Current Product Identity

### What Sobagi Is

Sobagi is a cozy companion space that quietly evolves as the user records their life.

At its core, Sobagi is an emotional record — not a finance tracker. The user enters a spend, Sobagi reacts gently, and over time the room accumulates warmth and character. The product is about the feeling of having kept a record, not the analysis of that record.

Sobagi is patient. It does not demand attention. It does not push notifications or celebrate streaks loudly. It simply exists, and it changes — slowly, honestly — as the user shows up.

### What Sobagi Is NOT

- Not a budgeting or savings app
- Not a personal finance dashboard
- Not a productivity or habit tracker
- Not a gamified reward loop
- Not a social or sharing platform
- Not a tool for financial insight, analysis, or optimization

These are all valid products. Sobagi is none of them. Any feature that pulls toward those directions is out of scope.

### Emotional / Product Philosophy

The central design tension in Sobagi is: **presence without pressure**.

The user should feel welcomed when they open the app. They should feel like something small but real happened when they record. They should feel, over many weeks, that Sobagi has become theirs — without ever having been told to keep using it.

This is achieved through accumulation rather than urgency. The room changes between visits, not because the user did something correctly, but because time passed and they kept coming back. Sobagi rewards consistency, not frequency.

### Core Experience Loop

```
Record → Reaction → Accumulation → Gentle Change
```

1. **Record** — user notes a spend (amount, category, optional emotion + memo)
2. **Reaction** — Sobagi responds with an appropriate emotion and short message
3. **Accumulation** — the act of recording is counted; a new day's data settles into the room
4. **Gentle Change** — over recorded days, the room subtly evolves; Sobagi grows alongside the user

This loop should feel like tending to something small, not completing a task.

### Tone Principles

- Never judgmental. Sobagi never says spending was bad or good.
- Softly observational. Sobagi notices, doesn't evaluate.
- Low-pressure. Dialogue is short, soft, and ends naturally.
- Occasional warmth over constant positivity. Not every line is happy.
- Never transactional. No "complete X to earn Y" framing.
- Authentic accumulation. Changes in the room should feel earned, not unlocked.

---

## 2. Current Implemented Features

### HomeScreen

- Room background image (stage 1, loaded from CDN)
- Sobagi character with idle float animation (gentle up/down loop)
- Emotion-change spring pop animation when emotion changes
- Level chip (top-left): "Lv.N 소박이"
- Progress bar (below chip): thin olive bar + "함께한 날 N / M" label
- Tap-to-talk: tapping Sobagi or character area shows a speech bubble with a soft idle message, auto-hidden after 3.5s with fade in/out
- Daily summary card at bottom: today's total spend, record count
- BottomTabs: Home / Record / Stats

### Record Flow

- Amount entry (numeric, large hero display)
- Category selector: cafe / food / transport / shopping / other
- User emotion picker: 😊 좋아 / 😐 그냥 / 😔 속상 / 😤 억울 / 🥰 뿌듯 (optional)
- Optional memo (60 char max)
- Past-date recording: horizontal scrollable date chips, oldest→today order, auto-scrolled to today, up to 30 days back
- Save guard: disabled until amount > 0
- On save: runs emotionEngine, sets Sobagi emotion + message, persists expense + user state, navigates to /reaction
- BottomTabs remain visible below KeyboardAvoidingView

### Reaction Flow

- SobagiReaction component: character + emotion bubble always visible (not tap-to-show)
- Shows the just-evaluated Sobagi emotion and corresponding message
- Bubble message reflects recording context (first today, streak, hour, amount)

### Stats / Calendar

- Monthly calendar view with month navigation (‹ ›, can't go past current month)
- Week-row grid rendering (7 × `flex: 1` cells per row, no float rounding drift)
- Day/sat/sun color coding by position within week row
- Days with spending show a tiny amount chip (e.g., "37k")
- Selected day shows a summary card with Sobagi comment
- Settlement section: this-week total, month total, top category, streak (phrased softly)

### Emotion System

**emotionEngine.ts** — pure function, rule-based:
- First record today → `surprised`
- Streak ≥ 3 days → `excited`
- Hour ≥ 22 → `sleepy`
- Amount ≥ 50,000 → `soft-sad`
- Default → `happy`

**EmotionContext** feeds in: `isFirstRecordToday`, `currentStreak`, `currentHour`.

**Emotions:** `happy | excited | surprised | sleepy | soft-sad`

Each has a CDN-hosted character image and a corresponding message in `EMOTION_MESSAGES`.

### Dialogue System Status

The current implementation is **first-pass, rule-based**:
- Post-record reaction messages: 5 fixed strings in `EMOTION_MESSAGES`, one per emotion
- HomeScreen idle messages: 12 soft general messages in a pool, randomly selected on tap (no consecutive repetition), fade in/out, auto-hidden

A full contextual dialogue design (13 context types, message pools, priority ordering) was spec'd in a prior session but **not yet implemented**. The current system works and feels appropriate for MVP.

### Progression System

- **Metric:** `recordedDaysCount` — count of distinct local dates that have ≥ 1 expense
- **Level thresholds (cumulative recorded days):**
  - Lv.1: 0 days
  - Lv.2: 7 days
  - Lv.3: 20 days
  - Lv.4: 40 days
  - Lv.5: 70 days
  - Lv.6: 110 days
  - Lv.7: 160 days
- **roomStage:** hardcoded to `1` until stage 2–5 assets exist
- **exp field:** removed entirely from codebase and types
- On every app init, `recordedDaysCount` is recomputed from the full expense array (prevents drift from any historical bugs)

### Past-Date Recording

- Up to 30 days in the past
- `createdAt` for past dates uses `localDateToISOString(dateStr)` — anchors to noon local time
- This guarantees `getLocalDateString(new Date(createdAt)) === dateStr` regardless of timezone offset
- Streak logic is guarded: only real-time (today-dated) records on the first record of the day advance the streak
- `isNewDay` check happens **before** adding the expense — prevents double-counting `recordedDaysCount`

### BottomTabs / Navigation

- Three tabs: / (home), /record, /stats
- Each screen renders BottomTabs with its `activeRoute` prop
- RecordScreen: tabs rendered outside KeyboardAvoidingView so keyboard doesn't push tabs up

### Persistence / Storage

- **API:** `@apps-in-toss/framework` `Storage.getItem` / `Storage.setItem`
- **Wrapper:** `storageService.ts` — JSON serialize/deserialize, dev-mode error warnings, silent catch in production
- **Keys:** `STORAGE_KEYS.USER`, `STORAGE_KEYS.EXPENSES`, `STORAGE_KEYS.LAST_EMOTION`
- Persistence is fire-and-forget (stores updated in memory first, then persisted async)
- On hydration: `userData.recordedDaysCount` is always overwritten by live recomputation from expenses

### Asset / Image Architecture

- All images hosted on jsDelivr CDN
- URL pinned to specific git commit SHA: `github.com/YouYoungDon/sobaki@<sha>/assets/`
- Assets referenced via `ROOM_BACKGROUND_URIS`, `SOBAGI_IMAGE_URIS`, `SOBAGI_DEFAULT_URI` in `constants/assets.ts`
- All maps are `Partial<Record<...>>` — fallback pattern required at every usage site
- Current assets: `room_stage1.png`, `sobaki.png`, `sobaki_happy.png`, `sobaki_excited.png`, `sobaki_surprised.png`, `sobaki_sleepy.png`, `sobaki_sad.png`

### Sandbox / Build Status

- Runs inside Apps-in-Toss (Toss miniapp) sandbox via Granite SDK (`@granite-js/react-native`)
- `createRoute` defines screens; `useNavigation` for navigation
- `Storage` from framework replaces AsyncStorage
- Dev-mode sandbox: `__DEV__` available, storage may behave differently
- TypeScript configured with `noUncheckedIndexedAccess` — all array/record index access requires explicit `undefined` guards
- Known pre-existing TS error in `_404.tsx` (unregistered route type) — not blocking, not introduced by current work
- Test suite: 3 suites, 26 tests passing (Jest)

---

## 3. Current Technical Architecture

### Stores (Zustand)

| Store | State | Key Actions |
|-------|-------|-------------|
| `useEmotionStore` | `currentEmotion`, `currentMessage` | `setEmotion(emotion, message)` — also persists emotion key to storage |
| `useExpenseStore` | `expenses[]` | `addExpense`, `getTodayExpenses`, `hydrate` |
| `useUserStore` | `level`, `streak`, `totalRecordCount`, `recordedDaysCount`, `roomStage` | `incrementRecordedDays`, `incrementTotalRecordCount`, `setStreak`, `hydrate` |

All stores: in-memory Zustand, no middleware. Persistence is handled externally via `storageService`.

### Services

| Service | Responsibility |
|---------|---------------|
| `storageService.ts` | Thin wrapper around framework Storage; JSON encode/decode; silent error handling |
| `expenseService.ts` | Orchestrates save: streak logic, isNewDay check, store updates, fire-and-forget persistence |
| `emotionEngine.ts` | Pure function: `evaluate(expense, ctx) → SobagiEmotion`. No side effects. |

### Progression Data Model

```
recordedDaysCount = new Set(expenses.map(e => getLocalDateString(new Date(e.createdAt)))).size
level = getLevel(recordedDaysCount)   // lookup against LEVEL_THRESHOLDS
roomStage = getRoomStage(recordedDaysCount)  // returns 1 always (until assets exist)
```

`getLevel` and `getNextThreshold` are exported pure functions — tested directly.

### Local Date Handling

All date logic goes through `utils/date.ts`:

- `getLocalDateString(date: Date): string` — returns `YYYY-MM-DD` in device local time. Never uses `toISOString().slice(0,10)` (which is UTC).
- `localDateToISOString(localDateStr: string): string` — converts a local date string back to an ISO string anchored at noon local time. Used for past-date expense `createdAt`.

This pair is the single contract for all date operations. No raw `toISOString()` slicing anywhere.

### Emotion / Message Flow

```
RecordScreen
  → emotionEngine.evaluate(expense, ctx)
  → useEmotionStore.setEmotion(emotion, message)  [sets state + persists emotion key]
  → navigate('/reaction')

/reaction screen
  → reads currentEmotion from emotionStore
  → SobagiReaction renders character + bubble always-visible

HomeScreen
  → reads currentEmotion for character image
  → tap on character area → picks from IDLE_MESSAGES pool → fade-in bubble → auto-hide 3.5s
```

### Screen Structure

```
/           → HomeScreen (index.tsx)
/record     → RecordScreen (record.tsx)
/reaction   → ReactionScreen (reaction.tsx)
/stats      → StatsScreen (stats.tsx)
/_404       → 404 page (pre-existing type error, not blocking)
```

### Known SDK Constraints

- No `AsyncStorage` — must use `Storage` from `@apps-in-toss/framework`
- Route registration via `createRoute` — all routes must be registered in framework config
- `noUncheckedIndexedAccess` TS config requires defensive array/record access throughout
- Image loading: no bundled assets — all images are remote URIs (CDN)
- No React Navigation — uses Granite's `useNavigation` / `navigate()`

---

## 4. Current Visual Direction

### Room Philosophy

The room is Sobagi's world, and by extension, the user's world. It should feel lived-in, cozy, and slightly warm — not sterile, not decorated aggressively. Think: a small apartment at dusk, soft lamp light, a window with the outside barely visible.

The room evolves slowly. Changes should feel discovered, not announced. The user opens the app after a few weeks and notices something is slightly different — a new object in the corner, a warmer light. They didn't unlock it. It just appeared, quietly.

### Sobagi Character Philosophy

Sobagi is small and round. It doesn't have sharp edges or dramatic expressions. It occupies the center of the room with a gentle idle float — just enough motion to feel alive, not enough to be distracting.

Sobagi reacts when spoken to (tapped) or when something happens (new record). Outside of that, Sobagi exists quietly. The idle animation is the default state, and it's enough.

### Atmosphere Principles

- Warm over cool (cream, olive, wood — no blues or grays)
- Soft shadows and low elevation
- Small type, generous padding
- Minimal UI chrome — the room is the interface
- Animations are slow and smooth (1800ms idle float, 220ms bubble fade-in, 400ms fade-out)

### What Should Remain Subtle

- Level chip and progress bar: present but unobtrusive (small, top-left, light opacity on progress label)
- Daily summary card: functional info without dashboardy feel
- Category and emotion chips: compact, not crowded
- Speech bubble: only appears on tap, fades away — never persistent

### UI / Animation Rules

- Idle float: sinusoidal, ±5px, 1800ms per half-cycle, loops forever
- Emotion change: spring pop (scale 0.85 → 1.0, damping 10, stiffness 120)
- Bubble fade-in: 220ms (feels quick and attentive)
- Bubble fade-out: 400ms (feels like a sigh, not a cut)
- Auto-hide: 3500ms after bubble appears
- No back-to-back same message in idle pool

### Anti-Patterns to Avoid

- Persistent speech bubbles (makes the UI feel noisy)
- Badge counts or notification dots on BottomTabs
- Celebrating daily streaks with confetti or fireworks
- "X days in a row!" copy that creates streak anxiety
- Progress percentage displayed numerically (use days count instead)
- Any animation that draws the eye away from the room/character
- Bold, high-contrast UI chrome that competes with the room

---

## 5. Current Progression Philosophy

### Recorded Days vs Transaction Count

The progression metric is `recordedDaysCount`: the number of distinct local calendar days on which the user has recorded at least one expense. This is a **qualitative measure** (did you show up today?) not a **quantitative measure** (how many times did you record?).

This means:
- Recording 10 times in one day counts exactly the same as recording once
- A quiet day still counts if the user recorded anything at all
- The focus is on consistency of presence, not volume of activity

Transaction count (`totalRecordCount`) is tracked separately for reference but drives nothing in the current UI.

### Room Evolution

The room changes in response to `recordedDaysCount`, not transactions. Changes should feel like the passage of time has left traces — not like achievements being unlocked.

Currently, all room stages map to stage 1 (assets don't exist yet). When stage 2+ assets are created, `getRoomStage` will map day ranges to stages. The design intent is that stage transitions feel atmospheric — a new season, a different light quality, a new object — not a level-up screen.

### Level System Direction

Levels exist as a lightweight framing for the user's relationship with Sobagi, not as a core game mechanic. "Lv.3 소박이" is a friendly label, not a rank. The level chip is present but small.

Level thresholds are deliberately slow and generous — reaching Lv.2 requires a week of showing up, Lv.7 requires roughly five months. This is intentional. The system doesn't reward binging. It rewards quiet, long-term presence.

### What Should NOT Become Gamified

- Daily targets or quotas
- Penalty for missing days (no streak loss UI)
- Competitive or shareable metrics
- Spending challenges ("don't spend over X this week")
- Achievement badges or trophy systems
- Any form of "you're falling behind" messaging

---

## 6. Current Dialogue Philosophy

### Contextual Dialogue (Reaction Screen)

Post-record messages are chosen by `emotionEngine.evaluate()`. The current system is rule-based: first record today, streak, hour, amount. Five possible emotions, five fixed messages.

These messages are soft and companion-like, but they're **not yet contextual in the full design sense** — a 13-context system was designed (covering states like first-ever record, returning after a gap, quiet week, etc.) but not implemented.

For now, the five reaction messages cover the most common post-record moments well enough for MVP.

### Quiet Companion Behavior (HomeScreen)

By default, Sobagi is silent. No persistent bubble. The character exists in the room, breathing gently through its idle float animation.

This silence is intentional. The room should feel like it can breathe.

### Tap-to-Talk Behavior

When the user taps Sobagi (or the character area), a speech bubble fades in with a short idle message. It auto-hides after 3.5 seconds.

Key properties of this interaction:
- The bubble is never the same message twice in a row
- It fades in quickly (attentive) and fades out slowly (relaxed)
- Tapping again shows a new message and resets the timer
- There is no cooldown — but the message pool and no-repeat guard prevent spam feeling

The tap-to-talk model reinforces the "approaching a quiet companion" feeling. Sobagi doesn't talk at you. It responds when you reach out.

### Emotional Pacing

Dialogue should follow a natural rhythm:
- **Short:** 1–2 lines, never a paragraph
- **Quiet:** avoid exclamation marks in idle messages (a soft emoji at the end is fine)
- **Unhurried:** messages don't arrive before the user is ready
- **Non-evaluative:** messages observe or share, never grade

### Message Tone Rules

- Never say "well done" or "great job"
- Avoid finance-adjacent language ("budget", "spending limit", "save", "goal")
- Prefer sensory over evaluative ("조용한 밤이네요" vs "오늘도 열심히!")
- Seasonal and time-of-day references add texture ("차 한잔 하고 싶어요 ☕")
- Sobagi can be a little tired, wistful, or wondering — it doesn't have to be upbeat

---

## 7. Known Bugs / Constraints

### Remaining `_404.tsx` Issue

`_404.tsx` has a pre-existing TypeScript error: `'/_404'` is not assignable to `keyof RegisterScreenInput`. This is a Granite SDK routing type issue — the 404 route is not registered in the framework's screen type registry. It does not block building or running, and was not introduced by current work. Fix requires either registering `/_404` as a proper route or removing the page.

### Current Technical Debt

- `emotionEngine.ts` is very simple (5 rules, no pools, no weighting). The full contextual dialogue design is ready but unimplemented.
- `SobagiReaction.tsx` uses `visible={true}` as a static prop — fine for now, but will need a controlled transition if the reaction screen ever gets animated entry/exit.
- `EMOTION_MESSAGES` messages are fixed strings, not pools. Any tone-of-voice updates require editing the constant directly.
- No `lastVisitDate` tracking in storage — needed for "returning after gap" dialogue context when implemented.

### Asset Limitations

- All images are remote (jsDelivr CDN). First load requires network; no offline asset bundle.
- CDN URL is pinned to a specific commit SHA — any new assets require a new commit + URL update in `constants/assets.ts`.
- Stage 2–5 room backgrounds do not exist. `getRoomStage()` returns `1` unconditionally until they do.
- No idle-state Sobagi variant images (reading, napping, looking outside) — all idle states use the standard emotion images.
- No seasonal or time-of-day room overlay assets.

### Future Stage Asset Dependency

The entire room progression system is blocked on asset creation. `getRoomStage` is written and waiting — it just always returns 1. The moment stage 2 assets exist, a one-line change enables stage transitions. The architecture is ready; the art is not.

### UX Concerns Observed

- The progress bar label ("함께한 날 N / M") is at 10px / 75% white opacity — readable on the room background but could be hard to see on lighter room stages if introduced later.
- Date chips in RecordScreen are generated at module load time. DATE_OPTIONS is a module-level constant — if the app stays open past midnight, the "오늘" chip won't update. Acceptable for MVP, but a known edge case.
- The stats screen calendar has not been tested on-device since the week-row rewrite. Float-based grid alignment is fixed in code, but visual verification pending.

---

## 8. Future Planned Systems (Concept Level Only)

### Time-of-Day Ambience

The room tint and light quality shift subtly based on the device's local hour. Five zones: dawn (5–7), morning (7–12), afternoon (12–17), evening (17–21), night (21–5). Each zone applies a soft color overlay to the room (warm amber at dawn, cooler at noon, deep amber at evening, deep indigo at night). Sobagi's default emotion may also lean softly toward the zone (sleepy before dawn, alert in morning, wistful at night).

No user configuration. It just happens, invisibly, like light through a window.

### Weather / Seasonal Ambience

Season derived deterministically from device date (four seasons by month). Optional light rain overlay on some days, determined by a deterministic hash of the current date (so it "rains" the same day for all users — it's a world property, not a random event). Seasonal color temperature of the room shifts subtly across the year.

### Sobagi Idle Behaviors

Sobagi doesn't just float. Over time, it does small things when the user isn't actively interacting: appears to be reading, napping, looking toward the window, stretching. These are frame-based or simple looping animations, triggered by time-of-day or time-since-last-interaction. Requires new image assets per state.

### Room Evolution (Stage 2–5)

As `recordedDaysCount` accumulates past thresholds, the room changes:
- New objects appear (a plant that grows, a bookshelf that fills)
- Lighting warms
- Small details accumulate that reward close attention

Changes happen between sessions, never during one. The user opens the app and something is slightly different. No announcement. No fanfare.

### Evening Reflection

After a certain hour (configurable, default ~21:00), a short text fragment appears quietly in the room — not a notification, just a line of text that appears softly in a corner of the screen. Something like "오늘 하루 어땠어요?" or a seasonal phrase. Auto-hidden after a few seconds. A gentle end-of-day acknowledgment.

### Subtle Environmental Storytelling

Small, non-interactive environmental objects accumulate meaning over time: the number of coffee cups on the windowsill grows with cafe records, a small plant grows with streak days, a book appears after a long quiet period. These are narrative artifacts, not UI elements. They tell a story of the user's life without stating it.

---

## 9. Priority Roadmap

### Immediate Polish (Now)

- [ ] Verify stats calendar visually on device (week-row rewrite unverified)
- [ ] Verify tap-to-talk bubble timing and fade feel correct on device
- [ ] Consider adding a subtle visual affordance on the character that it's tappable (very subtle — maybe a faint ripple or a single-frame breath on first load)
- [ ] Progress bar visibility check on lighter room stage backgrounds (future-proofing)

### Short-Term MVP Improvements (Next 2–4 weeks)

- [ ] Implement contextual dialogue pools (replacing fixed `EMOTION_MESSAGES` strings with pools for each emotion, with priority ordering based on context)
- [ ] Add `lastVisitDate` to user storage — enables "returning after gap" context
- [ ] Resolve `_404.tsx` TS error (register route or remove page)
- [ ] On-device verification of RecordScreen past-date edge case (midnight rollover)
- [ ] Reaction screen: animated entry (slide or fade in) for more emotional weight

### Medium-Term Emotional Systems (1–3 months)

- [ ] Time-of-day room tint overlay (requires overlay assets or React Native color filter approach)
- [ ] Sobagi idle behavior variants (requires new image assets per state)
- [ ] Evening reflection text fragment (soft implementation, no asset dependency)
- [ ] Stats screen: month-over-month comparison view (optional, only if it serves the "gentle reflection" purpose, not analysis)

### Long-Term World / Life Systems (3+ months)

- [ ] Room stage 2–5 background assets + `getRoomStage` implementation
- [ ] Room object accumulation system (plant growth, bookshelf, etc.)
- [ ] Seasonal ambience (room color temperature by month)
- [ ] Weather overlay (deterministic rain system)
- [ ] Environmental storytelling objects (cafe cups, plant tied to records)
- [ ] Possibly: year-end recap as a single quiet screen ("이런 한 해였어요")

---

## 10. Final Strategic Summary

**What Sobagi is becoming:**

Sobagi is becoming a small, warm world where the act of recording your life leaves quiet traces.

It is not trying to change behavior. It is not trying to teach financial discipline. It is trying to make showing up feel worth it — not because of a reward, but because something real accumulates there. A room that feels more like yours. A character that knows, in some small way, that you were here.

The product succeeds when a user opens it after two weeks away and feels, without being told, that something has changed — and that it changed because they had been there before.

Everything in Sobagi should serve that feeling.

---

*This document reflects the state of the project as of 2026-05-14. It is a living record of design decisions, implemented systems, and intended direction. Update it when direction changes, not just when code changes.*
