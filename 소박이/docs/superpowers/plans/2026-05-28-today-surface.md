# Home `TodaySurface` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a soft semi-transparent upper-right "today" overlay to the home screen that quietly acknowledges today's records and taps through to `/record`.

**Architecture:** A pure presentational `TodaySurface` component (props mirror `DailySummary`'s) renders four cream-tone text lines on top of the room with a soft drop shadow — no card, no border. A tiny `formatKoreanMonthDay` helper in `utils/date.ts` formats the date string. The home screen wires the surface in with values it already derives; tapping navigates via `useNavigation` to `/record`. No new state, no new storage, no migration.

**Tech Stack:** React Native 0.84 / React 19 / TypeScript 5.8 (`noUnusedLocals` ON — unused imports are build errors), Jest 29, `@granite-js/react-native` (`useNavigation`).

**Verification rhythm:** From `소박이/`, single test `npx jest <name>`; full gate `npx tsc --noEmit` (exit 0) + `npx jest` (whole suite green). All commands run from `소박이/`.

**Spec:** `docs/superpowers/specs/2026-05-28-today-surface-design.md`

---

## File Structure

- `src/utils/date.ts` — append a pure `formatKoreanMonthDay(date: Date): string`. Already the home of `getLocalDateString` / `localDateToISOString` / `expenseLocalDate`.
- `src/components/home/TodaySurface.tsx` (NEW directory `components/home/`) — pure presentational overlay. One clear responsibility: render the upper-right today text block.
- `src/pages/index.tsx` — extend the existing `createRoute` import with `useNavigation`, add the `TodaySurface` import, call `useNavigation()` inside `HomeScreen`, and render `<TodaySurface ... />` between the header level card and the centered character area.
- `__tests__/expenseLocalDate.test.ts` — host the new `formatKoreanMonthDay` describe block (this file is the date-utils test file; co-locating keeps the helpers' tests together).

---

## Task 1: `formatKoreanMonthDay` pure helper

**Files:**
- Modify: `src/utils/date.ts` (append at end of file, after `expenseLocalDate`)
- Test: `__tests__/expenseLocalDate.test.ts`

- [ ] **Step 1: Write the failing tests**

In `__tests__/expenseLocalDate.test.ts`, extend the existing import on line 1:

```ts
import { expenseLocalDate, getLocalDateString, formatKoreanMonthDay } from '../src/utils/date';
```

Append this `describe` block to the end of the file:

```ts
describe('formatKoreanMonthDay', () => {
  it('formats a mid-month date', () => {
    // Date months are 0-indexed: month 4 = May.
    expect(formatKoreanMonthDay(new Date(2026, 4, 26))).toBe('5월 26일');
  });
  it('formats day 1', () => {
    expect(formatKoreanMonthDay(new Date(2026, 4, 1))).toBe('5월 1일');
  });
  it('formats the last day of a 31-day month', () => {
    expect(formatKoreanMonthDay(new Date(2026, 6, 31))).toBe('7월 31일');
  });
  it('formats January (single-digit month)', () => {
    expect(formatKoreanMonthDay(new Date(2026, 0, 5))).toBe('1월 5일');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest expenseLocalDate`
Expected: FAIL — `formatKoreanMonthDay is not a function` (or a TS/import error).

- [ ] **Step 3: Implement the helper**

Append to the end of `src/utils/date.ts`:

```ts
// Korean-format short date — "5월 26일" — for the home today-surface overlay. Plain
// non-padded numbers (no leading zeros), matching how Korean dates are written in
// everyday memo / handwritten contexts. Pure: no locale config, no Intl.
export function formatKoreanMonthDay(date: Date): string {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest expenseLocalDate`
Expected: PASS — all `expenseLocalDate` + `formatKoreanMonthDay` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/date.ts __tests__/expenseLocalDate.test.ts
git commit -m "feat(utils): add formatKoreanMonthDay for the today surface"
```

---

## Task 2: `TodaySurface` component

**Files:**
- Create: `src/components/home/TodaySurface.tsx` (new directory `components/home/`)

This task creates the presentational component. No unit tests beyond the helper from Task 1 — behavior is verified by `tsc` + the home wiring in Task 3.

- [ ] **Step 1: Create the component file with full implementation**

Write `src/components/home/TodaySurface.tsx` with this exact content:

```tsx
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { formatKoreanMonthDay } from '../../utils/date';

interface TodaySurfaceProps {
  todayDate: Date;
  totalAmount: number;
  recordCount: number;
  // Records where kind !== 'income' AND category !== 'no_spend'. Same definition the
  // home + DailySummary already use — when 0, the amount line is hidden so income-only
  // / no-spend-only days never display "0원".
  spendingCount: number;
  onPress: () => void;
}

// A soft semi-transparent "today" overlay floating in the home's upper-right corner —
// mirrors the level card on the left (top: 48). No card, no border, no CTA: cream-tone
// text with a soft drop shadow so it survives all four time-of-day backgrounds
// (morning / afternoon / evening / latenight). Quiet about zero — when today has no
// records, only the date + the "오늘의 기록" label render; the amount line follows
// DailySummary's spendingCount > 0 rule so no ₩0 is ever displayed.
export function TodaySurface({
  todayDate,
  totalAmount,
  recordCount,
  spendingCount,
  onPress,
}: TodaySurfaceProps) {
  const showAmount = spendingCount > 0;
  const showCount = recordCount > 0;
  return (
    <Pressable
      style={({ pressed }) => [styles.todaySurface, pressed && styles.todaySurfacePressed]}
      onPress={onPress}
    >
      <Text style={styles.todayDate}>{formatKoreanMonthDay(todayDate)}</Text>
      <Text style={styles.todayLabel}>오늘의 기록</Text>
      {showAmount && (
        <Text style={styles.todayAmount}>{totalAmount.toLocaleString()}원</Text>
      )}
      {showCount && (
        <Text style={styles.todayCount}>{recordCount}개의 기록</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  todaySurface: {
    position: 'absolute',
    top: 48,
    right: 16,
    alignItems: 'flex-end',
  },
  // Press feedback: brief opacity dip on the whole container. No color change, no scale,
  // no border highlight — discoverable, not button-like.
  todaySurfacePressed: {
    opacity: 0.6,
  },
  todayDate: {
    fontSize: 11,
    color: 'rgba(255,253,248,0.72)',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  todayLabel: {
    fontSize: 13,
    color: 'rgba(255,253,248,0.85)',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 2,
  },
  todayAmount: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,253,248,0.92)',
    textShadowColor: 'rgba(0,0,0,0.30)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 1,
  },
  todayCount: {
    fontSize: 11,
    color: 'rgba(255,253,248,0.72)',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. The new file compiles; no errors elsewhere.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/TodaySurface.tsx
git commit -m "feat(home): add TodaySurface presentational component"
```

---

## Task 3: Wire `TodaySurface` into the home screen

**Files:**
- Modify: `src/pages/index.tsx` — `createRoute` import (~line 3); add `TodaySurface` import (after `DailySummary` import ~line 7); add `useNavigation()` call inside `HomeScreen` (right after `function HomeScreen() {`); render the surface between the header block and the character area (~line 332).

UI wiring with no unit tests; verified by `tsc` + the full Jest suite in Task 4.

- [ ] **Step 1: Add `useNavigation` to the Granite import**

The current line 3 reads:

```ts
import { createRoute } from '@granite-js/react-native';
```

Replace with:

```ts
import { createRoute, useNavigation } from '@granite-js/react-native';
```

- [ ] **Step 2: Add the `TodaySurface` import**

Find the existing line (around line 7):

```ts
import { DailySummary } from '../components/common/DailySummary';
```

Immediately AFTER it, add:

```ts
import { TodaySurface } from '../components/home/TodaySurface';
```

- [ ] **Step 3: Call `useNavigation()` at the top of `HomeScreen`**

Find the start of `HomeScreen` and the first selector (around line 59-60):

```ts
function HomeScreen() {
  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
```

Replace with:

```ts
function HomeScreen() {
  const navigation = useNavigation();
  const currentEmotion = useEmotionStore((s) => s.currentEmotion);
```

- [ ] **Step 4: Render the surface between the header and the character area**

Find this three-line block (the header block's closing `</View>` followed by the character area opening):

```tsx
            </View>

            <TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
```

Replace with (insert the `<TodaySurface ... />` between them, using values already derived in `HomeScreen`):

```tsx
            </View>

            <TodaySurface
              todayDate={new Date()}
              totalAmount={todayTotal}
              recordCount={todayExpenses.length}
              spendingCount={todaySpendingRecords.length}
              onPress={() => navigation.navigate('/record')}
            />

            <TouchableOpacity style={styles.characterArea} onPress={handleSobagiTap} activeOpacity={1}>
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. `useNavigation`, `TodaySurface`, and `navigation` are all used; no `noUnusedLocals` errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat(home): wire TodaySurface into upper-right of room"
```

---

## Task 4: Full verification + philosophy/anti-drift grep

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Run the whole test suite**

Run: `npx jest`
Expected: all suites pass — the prior count plus 4 new `formatKoreanMonthDay` tests; no regressions.

- [ ] **Step 3: Anti-drift / vocabulary grep on touched files**

Confirm rejected wording and mechanics did NOT leak into the new code. Run:

```bash
git grep -nE "지출|소비|순수익|차액|dashboard|KPI|mission|progress|badge|checkmark" -- src/components/home/TodaySurface.tsx src/utils/date.ts src/pages/index.tsx
```

Expected: no matches in `src/components/home/TodaySurface.tsx` or `src/utils/date.ts`. Pre-existing unrelated matches in `src/pages/index.tsx` (e.g. the level card's `progressTrack` / `progressFill` / `progressLabel` styles) are acceptable — they are not in the new today-surface wiring.

- [ ] **Step 4: Manual dogfood note (no code)**

Open the app on the home screen. Confirm visually:
1. Upper-right corner shows `<5월 D일>` + `오늘의 기록`, even on a fresh day with zero records.
2. After one income-only or no-spend record, a `N개의 기록` line appears (no `0원` line).
3. After a spending record, both the won amount and the count appear; the four lines feel like a quiet handwritten memo, not a panel.
4. The surface is legible on the morning / afternoon / evening / latenight backgrounds (the cream tone + soft drop shadow should survive all four; if any one disappears, the opacity ladder needs tuning — flag, do not patch in this pass).
5. Tapping anywhere on the four lines navigates to `/record` with a brief opacity dip while pressed (no color change, no scale).
6. DailySummary at the bottom is unchanged.

Observation only — no committed change.

---

## Self-Review

**Spec coverage:**
- Placement `top:48 right:16`, mirrors level card → Task 2 style `todaySurface`. ✓
- 4-line content (date / "오늘의 기록" / amount / count) → Task 2 component JSX. ✓
- Line rules (amount when `spendingCount > 0`, count when `recordCount > 0`, date+label always) → Task 2 `showAmount` / `showCount` derivations. ✓
- Cream-tone text + soft drop shadow, no card/border → Task 2 styles. ✓
- Press feedback = opacity dip (no color/scale) → Task 2 `todaySurfacePressed`. ✓
- Tap → `/record` via `useNavigation` → Task 3 Steps 1, 3, 4. ✓
- Props mirror DailySummary's shape → Task 2 `TodaySurfaceProps`. ✓
- `formatKoreanMonthDay` pure helper in `utils/date.ts` → Task 1 Step 3. ✓
- Tests for the helper (4 cases per spec) → Task 1 Step 1. ✓
- No new state / no new storage / no new memo in `HomeScreen` → Task 3 only adds `useNavigation()` and the render; reuses `todayTotal` / `todayExpenses.length` / `todaySpendingRecords.length`. ✓
- DailySummary preserved → no task modifies it. ✓
- Philosophy guards (no 지출/소비, no income amount, no CTA color/badge/progress) → Task 4 Step 3 grep. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands. ✓

**Type consistency:** `formatKoreanMonthDay(date: Date): string` — defined Task 1 Step 3, imported Task 2 Step 1, called as `formatKoreanMonthDay(todayDate)` inside the component. `TodaySurface` props (`todayDate`/`totalAmount`/`recordCount`/`spendingCount`/`onPress`) — defined Task 2 Step 1, used Task 3 Step 4. `useNavigation()` returns an object with `.navigate(path)` — Task 3 Step 4 calls `navigation.navigate('/record')`, matching the pattern in `record.tsx` line 74 / 305. Consistent. ✓
