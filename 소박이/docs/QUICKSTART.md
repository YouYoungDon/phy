# 소박이 Quick-Start Dev Guide

## Prerequisites

- Node.js 18+
- `ait` CLI installed globally (`npm i -g @apps-in-toss/cli`)
- Toss developer account with sandbox access

## Setup

```bash
cd 소박이
npm install
```

## Dev Server

```bash
npm run dev
# granite dev — starts Metro bundler + hot reload
# Open Toss app → Developer menu → connect to local IP
```

## Test

```bash
npm test               # run all tests (jest)
npm run typecheck      # TypeScript check (tsc --noEmit)
```

## Build

```bash
npm run build          # ait build → outputs pockeksobak.ait
```

Artifact: `pockeksobak.ait` in project root.  
Upload via Toss Developer Center → Mini-App → Upload Build.

## Project Structure

```
src/
  _app.tsx               # App container (cream bg, prevents white flash)
  require.context.ts     # Granite page auto-registration

  pages/
    index.tsx            # HomeScreen — room + Sobagi + DailySummary
    record.tsx           # RecordScreen — expense entry form
    reaction.tsx         # ReactionScreen — post-save emotion feedback
    stats.tsx            # StatsScreen — weekly summary
    _404.tsx             # Fallback (SDK registration known issue)

  components/
    common/
      BottomTabs.tsx     # Tab bar (Home / Record / Stats)
      DailySummary.tsx   # Today's total + record count
    sobagi/
      SobagiCharacter.tsx      # Animated wrapper (float + spring)
      SobagiEmotionFace.tsx    # View-based face per emotion (5 states)
      SobagiReaction.tsx       # Character + bubble for reaction screen
      EmotionBubble.tsx        # Speech bubble component
    room/
      RoomBackground.tsx       # Room stage 1–5 (wall/floor/window/props)
    expense/
      CategorySelector.tsx     # Category chip picker
      ExpenseCard.tsx          # Single expense list item

  services/
    emotionEngine.ts     # Pure function: evaluate(expense, ctx) → SobagiEmotion
    expenseService.ts    # saveExpense: streak logic + store update + persist
    storageService.ts    # AsyncStorage wrapper (save/load, __DEV__ errors only)

  store/
    emotionStore.ts      # currentEmotion + currentMessage
    expenseStore.ts      # expenses[] + getTodayExpenses()
    userStore.ts         # level / exp / streak / totalRecordCount / roomStage

  hooks/
    useAppInit.ts        # Hydrates all stores from storage on mount

  constants/
    colors.ts            # COLORS — cream/olive/wood palette
    emotion.ts           # EMOTION_MESSAGES + VALID_EMOTIONS
    storage.ts           # STORAGE_KEYS

  types/index.ts         # SobagiEmotion | ExpenseCategory | Expense | UserState | EmotionContext
```

## Key Constraints

- **No local `require()` for assets** — Apps in Toss sandbox blocks it. Use data URIs or remote URLs.
- **Granite routing** — pages auto-registered via `require.context`. `createRoute('/')` in each page file.
- **Storage** — `@granite-js/native` AsyncStorage. Fire-and-forget; stores update in memory first.
