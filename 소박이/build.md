# Sobagi BUILD RULES

## Project

Sobagi is a cozy emotional spending diary app built for Apps in Toss.

The app is NOT a financial/productivity app.

It should feel like:
- cozy
- warm
- soft
- emotional
- diary-like

Avoid:
- cold finance UI
- dark fintech feeling
- overly technical layouts

---

# Stack

- React Native
- Granite
- @apps-in-toss/framework
- Zustand
- TDS components

Use Apps in Toss standards only.

Do NOT use:
- AsyncStorage
- custom navigation libraries
- heavy animation libraries

---

# Core Principle

The main purpose is:
"Users come back to see Sobagi."

Not:
"Users manage money efficiently."

---

# MVP Screens

1. HomeScreen
2. RecordScreen
3. HistoryScreen
4. StatsScreen

---

# Folder Structure

```text
src/
 ├── components/
 ├── screens/
 ├── store/
 ├── hooks/
 ├── services/
 ├── constants/
 ├── types/
 └── assets/
```

---

# State

## userState

```ts
{
  level: number
  exp: number
  streak: number
  totalSpend: number
}
```

## expenseState

```ts
{
  id: string
  amount: number
  category: string
  emotion: string
  memo?: string
  createdAt: string
}
```

---

# Storage

Use Apps in Toss Storage only.

Keys:
- sobagi-user
- sobagi-expenses
- sobagi-room

---

# UX Rules

- Input should take less than 3 seconds.
- Immediate emotional feedback after saving.
- Never blame the user for spending.
- Emotional comfort is more important than analytics.

---

# Sobagi Character

Sobagi is:
- a tiny otter
- soft and warm
- emotionally supportive
- never judgmental

Sobagi reacts after every expense entry.

Examples:
- sleepy
- happy
- cozy
- tired
- excited

---

# Visual Direction

Use:
- cream colors
- olive green
- wood tones
- watercolor texture
- soft shadows
- cozy room atmosphere

Avoid:
- sharp UI
- fintech visuals
- strong contrast
- corporate feeling