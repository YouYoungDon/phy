# 소박이 Architecture Summary

## Overview

소박이 is an Apps-in-Toss mini-app (React Native, Granite SDK) for mindful daily expense recording. The core loop is: **record a spend → Sobagi reacts emotionally → feel good about tracking**.

## Data Flow

```
User taps Save
  → emotionEngine.evaluate(expense, ctx) → SobagiEmotion
  → setEmotion(emotion, message)         → emotionStore
  → saveExpense(expense)                 → expenseStore + userStore
                                         → AsyncStorage (fire-and-forget)
  → navigation.navigate('/reaction')
       → reads emotionStore
       → shows SobagiReaction (face + bubble)
       → setTimeout 3s → navigation.reset to '/'
```

## Emotion Engine

Pure function, no side effects:

```
Priority 1: isFirstRecordToday  → 'surprised'
Priority 2: currentStreak >= 3  → 'excited'
Priority 3: currentHour >= 22   → 'sleepy'
Priority 4: amount >= 50000     → 'soft-sad'
Default:                        → 'happy'
```

## State Management

Three Zustand stores, hydrated from AsyncStorage on first mount via `useAppInit`:

| Store | What it holds |
|-------|---------------|
| `emotionStore` | currentEmotion, currentMessage |
| `expenseStore` | expenses[], getTodayExpenses() |
| `userStore` | level, exp, streak, totalRecordCount, roomStage |

Room stage is derived from `totalRecordCount`: 1→5, 15→3, 30→4, 60→5.

## Navigation

Granite SDK routing — `createRoute(path)` in each page file, auto-registered via `require.context`. No central router config.

```
/           HomeScreen
/record     RecordScreen
/reaction   ReactionScreen
/stats      StatsScreen
```

BottomTabs navigates between `/`, `/record`, `/stats`. Reaction returns via `navigation.reset` (clears stack back to `/`).

## Sobagi Character Rendering

No image assets (Apps-in-Toss sandbox blocks local `require()`).

`SobagiEmotionFace` renders purely with React Native `View`:
- Eyes: oval `View` with `borderRadius`, size/shape varies per emotion
- Mouth: `overflow:hidden` parent + partial circle border child → curved arc
  - `SmileArc` = bottom half of circle = U shape
  - `FrownArc` = top half of circle = ∩ shape
- Cheeks, tears, zzz text: conditionally rendered per emotion

`SobagiCharacter` wraps the face with two `Animated.Value` layers:
- `scale` spring → pops on emotion change
- `idleY` loop → gentle float (±5px, 1.8s easing)

## Room Background

`RoomBackground` stage 1–5:
- Wall and floor colors shift slightly warmer each stage (~3–4 points per stage)
- Props added at thresholds: 🌱 stage2, 🪴+rug stage3, 📚 stage4, 🕯️ stage5
- Window: warm leafy glass (`#E5EFD8`), not cold blue

## Persistence

`storageService` wraps AsyncStorage with silent failure (warns in `__DEV__` only).  
`saveExpense` persists both expenses and user state synchronously after store update.  
`setEmotion` persists last emotion.  
On restart, `useAppInit` hydrates all three stores; unknown emotion strings fall back to `'happy'`.

## Constraints & Decisions

| Constraint | Decision |
|------------|----------|
| No local asset require() | View-based character + room |
| No SVG in RN Image | Border-trick arc rendering |
| Apps-in-Toss review | No external network calls, no background tasks |
| MVP scope | No economy, no quests, no social, no room editor |
