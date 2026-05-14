# 소박이 MVP Design Spec

**Date:** 2026-05-11
**Status:** Approved
**Platform:** Apps in Toss (React Native, Granite)

---

## Overview

소박이 is a cozy emotional spending diary mini-app for Apps in Toss.

The core product is not financial management. It is an emotional feedback loop:

> Users record spending → Sobagi reacts emotionally → Users feel attached to the space.

The app centers on a tiny otter character named 소박이 who lives in a warm cozy room. She reacts to every expense entry with warmth and encouragement — never shame or blame.

**Core goal:** Users come back to see Sobagi, not to manage money.

---

## MVP Scope

### In Scope

- HomeScreen
- RecordScreen
- SobagiReactionScreen
- HistoryScreen
- StatsScreen
- Sobagi emotional reaction system (5 emotions)
- Simple automatic room progression (5 stages, based on record count)

### Out of Scope for MVP

- Room decoration editor / drag-and-drop furniture system
- Item shop / economy system
- Coins / gems / quest system (may exist as type placeholders only)
- Lottie animations (static PNG placeholders are sufficient)
- Complex statistics or charts

---

## Architecture: Emotion Engine Pattern

### Core Data Flow

```
[RecordScreen]
  User inputs: amount + category + emotion + memo (optional)
       ↓
  expenseService.save(expense)
       ↓
  expenseStore.addExpense(expense)         ← persisted to AppsInToss Storage
  emotionEngine.evaluate(expense, ctx)    ← pure function, no side effects
       ↓
  emotionStore.setEmotion(emotion, message)
  userStore.processRecordReward()         ← updates exp / level / streak / roomStage together
       ↓
[SobagiReactionScreen]  (full-screen transition)
  SobagiCharacter(emotion) + EmotionBubble(message)
  auto-returns after 2~3 seconds OR manual tap to close
       ↓
[HomeScreen]
  RoomBackground(roomStage)  ← subtly evolved
  SobagiCharacter(currentEmotion)  ← lingering emotion
```

---

## Emotion Engine

### EmotionContext

The `ctx` parameter is explicitly typed to keep `emotionEngine.evaluate` a pure function with no store access.

```ts
interface EmotionContext {
  isFirstRecordToday: boolean
  currentStreak: number
  currentHour: number       // 0–23, device local time
}
```

Callers (RecordScreen or expenseService) are responsible for constructing this context before invoking the engine.

### Type

```ts
type SobagiEmotion = 'happy' | 'excited' | 'cozy' | 'sleepy' | 'satisfied'
```

`sad` is excluded from MVP. Sobagi never blames the user.

### Evaluation Priority (pure function)

| Priority | Condition | Emotion |
|----------|-----------|---------|
| 1 | Today's first record | `satisfied` |
| 2 | Streak >= 3 days | `excited` |
| 3 | Late night (hour >= 22) | `sleepy` |
| 4 | Large amount (>= 50,000 KRW) | `cozy` — comforting, not judging |
| 5 | Small amount (< 5,000 KRW) | `happy` |
| 6 | Default | `happy` |

### Emotion Messages (examples)

| Emotion | Message |
|---------|---------|
| `satisfied` | "오늘도 잘 참았어요! 수고했어요!" |
| `excited` | "연속 기록 중이에요! 소박이도 신나요 ✨" |
| `sleepy` | "이 시간에도 기록하다니... 소박이도 졸려요 zzz" |
| `cozy` | "오늘도 잘했어요. 수고한 당신을 응원해요 🍵" |
| `happy` | "오늘도 잘 기록했어요!" |

---

## State (Zustand)

### expenseStore

```ts
interface Expense {
  id: string
  amount: number
  category: 'cafe' | 'food' | 'transport' | 'shopping' | 'other'
  emotion?: string      // user-selected emoji at record time
  memo?: string
  sobagiEmotion: SobagiEmotion
  createdAt: string     // ISO string
}

interface ExpenseStore {
  expenses: Expense[]
  addExpense: (expense: Expense) => void
  getTodayExpenses: () => Expense[]
}
```

### emotionStore

```ts
interface EmotionStore {
  currentEmotion: SobagiEmotion
  currentMessage: string
  setEmotion: (emotion: SobagiEmotion, message: string) => void
}
```

### userStore

```ts
interface UserStore {
  level: number
  exp: number
  streak: number
  totalRecordCount: number
  roomStage: number       // 1–5, derived from totalRecordCount
  processRecordReward: () => void  // updates exp, level, streak, roomStage together
}
```

### Room Stage Progression

roomStage is derived automatically from `totalRecordCount`.

| Stage | Records | Room Atmosphere |
|-------|---------|----------------|
| 1 | 0–4 | Basic room, warm soft lighting |
| 2 | 5–14 | A small plant appears |
| 3 | 15–29 | More props, warmer lighting |
| 4 | 30–59 | Full cozy atmosphere |
| 5 | 60+ | Sobagi's perfect room |

No user interaction required. Room evolves automatically.

---

## Storage

Use `Storage` from `@apps-in-toss/framework`. AsyncStorage is not permitted in AppsInToss.

| Key | Contents |
|-----|----------|
| `sobagi-user` | UserState (level, exp, streak, totalRecordCount, roomStage) |
| `sobagi-expenses` | Expense[] |
| `sobagi-last-emotion` | Last `SobagiEmotion` string — persisted after every reaction |

### Emotion Persistence on App Launch

On launch, `emotionStore` is initialized as follows:

1. Read `sobagi-last-emotion` from Storage
2. If a valid `SobagiEmotion` value is found, restore it as `currentEmotion`
3. Fallback to `'happy'` if the key is missing or invalid

This makes the app feel emotionally continuous — Sobagi remembers how she was feeling when the user left.

### Error Handling

- **Production:** fail softly — the Zustand store already holds the state in memory so the session continues normally. Do not show a scary error to the user.
- **Development:** `console.warn('[storageService] setItem failed:', error)` — errors must be traceable, not silently swallowed.

---

## File Structure (Granite)

Granite uses file-based routing. Pages live in `pages/`, everything else in `src/`.

```
pages/
  index.tsx           ← HomeScreen         Route: '/'
  record.tsx          ← RecordScreen       Route: '/record'
  reaction.tsx        ← SobagiReactionScreen  Route: '/reaction'
  history.tsx         ← HistoryScreen      Route: '/history'
  stats.tsx           ← StatsScreen        Route: '/stats'

src/
  components/
    sobagi/
      SobagiCharacter.tsx    ← emotion + size + animated props
      EmotionBubble.tsx      ← message prop → speech bubble
      SobagiReaction.tsx     ← SobagiCharacter + EmotionBubble combined
    room/
      RoomBackground.tsx     ← roomStage prop → background image
    expense/
      ExpenseCard.tsx        ← single expense display
      CategorySelector.tsx   ← category picker UI
    common/
      QuickRecordButton.tsx  ← FAB on HomeScreen
      DailySummary.tsx       ← today's total + count
  store/
    expenseStore.ts
    emotionStore.ts
    userStore.ts
  services/
    emotionEngine.ts         ← pure function, no dependencies
    expenseService.ts        ← save/load, Storage integration
    storageService.ts        ← AppsInToss Storage wrapper
  types/
    index.ts                 ← SobagiEmotion, Expense, UserState
  assets/
    sobagi/                  ← placeholder PNGs per emotion
    room/                    ← room background images per stage
```

---

## Navigation (Granite)

Use `@granite-js/react-native`: `createRoute` + `useNavigation`.

```ts
// pages/record.tsx
export const Route = createRoute('/record', {
  validateParams: (params) => params,
  component: RecordScreen,
})
```

Navigation pattern:
- `navigation.navigate('/record')` — open RecordScreen
- `navigation.navigate('/reaction')` — after save
- `navigation.canGoBack()` check before `navigation.goBack()`
- `CommonActions.reset` to clear history when returning to Home after reaction

---

## Screen Designs

### HomeScreen (`/`)

- Full-screen `RoomBackground(roomStage)` as backdrop
- `SobagiCharacter(currentEmotion)` centered in the room
- `DailySummary` — today's record count and total (light, top area)
- `QuickRecordButton` — floating action button → `/record`
- No bottom tab bar in MVP (single entry point is sufficient)

### RecordScreen (`/record`)

- Large amount input (numpad style)
- Category selector: 카페 / 식비 / 교통 / 쇼핑 / 기타
- Emotion selector: 5 emoji options (optional)
- Memo input (optional, single line)
- Save button — disabled when amount <= 0, no harsh validation message
- RecordScreen orchestrates the save flow only. Emotion calculation and storage happen inside services/stores.

### SobagiReactionScreen (`/reaction`)

- Full-screen warm background
- Large `SobagiCharacter(emotion)` with subtle animation
- `EmotionBubble(message)` — Sobagi's warm words
- Auto-returns to HomeScreen after 2–3 seconds
- Manual tap anywhere on screen also closes and returns

### HistoryScreen (`/history`)

- Records grouped by local calendar date (`YYYY-MM-DD`, device local timezone)
- Each group header shows the date in a warm, diary-like format (e.g. "5월 11일")
- Each card: category icon + amount + Sobagi emotion of that record
- Simple, breathable layout — not a financial dashboard
- Timezone rule: always use device local time to determine the date boundary. Never UTC.

### StatsScreen (`/stats`)

- This week's total spend
- Most frequent category
- Current streak (consecutive recording days)
- Sobagi's comment card — warm tone, same emotional register as emotionEngine messages
- No charts, no fintech-style layout

---

## Component Contracts

All components are purely presentational — they receive props only and do not access stores directly.

```ts
// SobagiCharacter
interface SobagiCharacterProps {
  emotion: SobagiEmotion
  size?: 'small' | 'medium' | 'large'
  animated?: boolean
}

// RoomBackground
interface RoomBackgroundProps {
  stage: 1 | 2 | 3 | 4 | 5
}

// EmotionBubble
interface EmotionBubbleProps {
  message: string
}

// ExpenseCard
interface ExpenseCardProps {
  expense: Expense
}

// DailySummary
// Feels like a soft diary note, not a banking dashboard.
// Keep it small and warm — no large cards, no bold financial styling.
interface DailySummaryProps {
  totalAmount: number
  recordCount: number
}
```

Asset paths are centralized — swapping a PNG for a Lottie file later requires changes only in the component, not in consumers.

---

## TDS & AppsInToss Compliance

- Package: `@toss/tds-react-native` (framework >= 1.0.0)
- Wrap app root with `TDSProvider`
- Use TDS `Button`, `TextButton`, `Toast` where applicable
- Navigation: `@granite-js/react-native` only
- Storage: `@apps-in-toss/framework` `Storage` only — AsyncStorage is forbidden
- No custom navigation libraries
- No heavy animation libraries

---

## Design Tone

- Colors: cream backgrounds, olive green accents, warm wood tones
- Typography: rounded, soft, readable
- Avoid: sharp UI, fintech density, heavy charts, corporate feel
- Animation: subtle bounce/float only — lightweight, fast, responsive
- Sobagi never blames the user. Even large spending gets comfort, not judgment.

---

## Success Criteria

The MVP is successful when:

1. A user can record an expense in under 10 seconds.
2. Sobagi reacts immediately after saving with a warm, fitting emotion.
3. The room feels subtly alive and evolves naturally over time.
4. The app feels emotionally warm on first launch, with no expenses recorded yet.
5. No user ever feels shamed or blamed for their spending.
