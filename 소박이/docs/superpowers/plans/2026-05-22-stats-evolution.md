# Stats Screen Evolution — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Soften the Stats screen — replace the `결산` section with three quiet observation lines, swap the bar trend graph for a single-row presence-dot trace, recede calendar amount text, and add one rotating observation that picks lifestyle patterns (cafe / night / calm-days) before falling back to streak tiers.

**Architecture:** Pure logic (`selectStatsObservation`) lands first and is unit-tested. UI extraction (`MonthPresenceRow`) lands second as an isolated presentational component with no interactivity. `stats.tsx` cleanup and rewiring lands last in one careful pass, with regression guardrails verified afterward. The room-presence pattern detectors are consumed read-only — no detector logic is duplicated.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-22-stats-evolution-design.md`

**Phasing:**
1. Baseline checks (Task 1)
2. Pure logic + tests (Tasks 2–3)
3. UI extraction (Task 4)
4. stats.tsx cleanup + rewire (Tasks 5–7)
5. Regression guardrails + final verification (Task 8)

**Commands used throughout** (run from `소박이/`):
- Single test file: `npx jest __tests__/<file>.test.ts`
- Full suite: `npm test`
- Typecheck: `npm run typecheck`

**Working tree note:** No unrelated WIP is expected. If `git status` shows any `M` entries before starting, stop and ask the human.

**Critical anti-pattern to avoid (re-read before every commit):** This pass MUST NOT reintroduce any monetary analytics — no `weeklyTotal`, no `monthlyTotal`, no average daily spend, no week-over-week delta, no category-spending breakdown, no `결산` heading, no bold finance-style headers. If a task seems to require one of these to make a test pass, stop and escalate.

---

## Task 1: Baseline checks

**Files:** none (verification only)

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: empty output (no `M`, no `??` lines). If unrelated WIP exists, stop and surface to the human.

- [ ] **Step 2: Record baseline HEAD**

Run: `git log --oneline -1`
Expected: most recent commit on `apps-in-toss-clean` (e.g. `a5352c4 docs: stats screen evolution design spec`). Note this SHA — it's the BASE_SHA for the implementation.

- [ ] **Step 3: Run typecheck baseline**

Run from `소박이/`: `npm run typecheck 2>&1 | Select-Object -Last 8`
Expected: only the two pre-existing `src/pages/_404.tsx` errors (TS2769 + TS7006). Note these are pre-existing and unrelated to this work — they must continue to be the only errors at every subsequent typecheck.

- [ ] **Step 4: Run Jest baseline**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: all suites pass with the result `Tests: X passed`. If any suite fails, stop and surface to the human — failing tests must be investigated before proceeding.

If a suite that LOOKS unrelated fails (e.g. `letterService` had two failures earlier in the session), confirm by running `git log --oneline 156f51c..HEAD -- 소박이/__tests__/<suite>.test.ts` to see whether this implementation chain has touched it. The 2026-05-22 `f7aa61f` commit pinned the letterService seasonal test, so all suites should be green now. Any failure on this baseline is a new regression.

- [ ] **Step 5: Note results in your scratch notes**

Pre-existing typecheck errors: 2 (both `_404.tsx`)
Pre-existing Jest failures: 0 (all green as of `f7aa61f`)
Baseline HEAD: <paste from step 2>

These three values are the regression-detection reference for every subsequent task.

---

## Task 2: `selectStatsObservation` priority chain + tests

**Files:**
- Create: `소박이/src/services/statsObservationService.ts`
- Test: `소박이/__tests__/statsObservationService.test.ts`

The pure-logic core. No React, no SDK, no storage. Composes existing detectors from `roomPresenceService` and `atmosphereService` without duplicating their logic.

- [ ] **Step 1: Write the failing tests**

Create `소박이/__tests__/statsObservationService.test.ts`:

```ts
import { Expense } from '../src/types';
import { selectStatsObservation } from '../src/services/statsObservationService';

// Helper: build a spending expense at a specific local-date and hour.
function expense(dateStr: string, hour: number, category: Expense['category'] = 'cafe', amount = 5000): Expense {
  // Use a stable ISO string anchored at local midnight + hour offset.
  // The detectors only read year/month/day and hour, so any timezone-stable
  // representation works.
  const iso = `${dateStr}T${String(hour).padStart(2, '0')}:00:00`;
  return {
    id: `${dateStr}-${hour}-${category}`,
    amount,
    category,
    sobagiEmotion: 'happy',
    createdAt: iso,
  };
}

// 14 distinct cafe days inside the 14-day window (≥3 records, ≥3 distinct days).
function cafePatternExpenses(today: string): Expense[] {
  // 3 cafe records on 3 different days inside the last 14 days, daytime hours.
  const todayD = new Date(today + 'T12:00:00');
  return [-1, -3, -5].map((offset) => {
    const d = new Date(todayD);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    return expense(dateStr, 14, 'cafe');
  });
}

function nightPatternExpenses(today: string): Expense[] {
  // 3 night-hour records on 3 different days inside the window (hours 19–04).
  const todayD = new Date(today + 'T12:00:00');
  return [-1, -3, -5].map((offset) => {
    const d = new Date(todayD);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);
    return expense(dateStr, 22, 'home_meal');
  });
}

function calmDayExpenses(today: string, dayCount: number): Expense[] {
  // dayCount calm days: a single small record per day, under the 10,000 threshold.
  const todayD = new Date(today + 'T12:00:00');
  const out: Expense[] = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(todayD);
    d.setDate(d.getDate() - (i + 1));
    const dateStr = d.toISOString().slice(0, 10);
    out.push(expense(dateStr, 12, 'home_meal', 2000));
  }
  return out;
}

const TODAY = '2026-05-22';

describe('selectStatsObservation', () => {
  it('returns cafe observation when cafe pattern is present', () => {
    const expenses = cafePatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('returns night observation when only night pattern is present', () => {
    const expenses = nightPatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('밤에도 종종 기록했네요 🌙');
  });

  it('prefers cafe over night when both match', () => {
    const expenses = [...cafePatternExpenses(TODAY), ...nightPatternExpenses(TODAY)];
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('returns calm observation when ≥4 calm days and no cafe/night pattern', () => {
    const expenses = calmDayExpenses(TODAY, 4);
    const result = selectStatsObservation(expenses, 0, TODAY);
    expect(result).toBe('차분한 날이 자주 있었어요 🍃');
  });

  it('does not fire calm observation when calm-day count is 3', () => {
    const expenses = calmDayExpenses(TODAY, 3);
    const result = selectStatsObservation(expenses, 0, TODAY);
    // Falls through to streak tiers; streak is 0 → default
    expect(result).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('returns long-streak observation when streak >= 7 and no texture patterns', () => {
    const result = selectStatsObservation([], 7, TODAY);
    expect(result).toBe('요즘 자주 들르고 있어요 🌿');
  });

  it('returns medium-streak observation when streak >= 3', () => {
    const result = selectStatsObservation([], 3, TODAY);
    expect(result).toBe('꾸준히 들르고 있어요 🌿');
  });

  it('returns short-streak observation when streak >= 1', () => {
    const result = selectStatsObservation([], 1, TODAY);
    expect(result).toBe('오늘도 잠깐 들렀네요 🍃');
  });

  it('returns default observation when streak is 0 and no patterns', () => {
    const result = selectStatsObservation([], 0, TODAY);
    expect(result).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('cafe pattern beats long streak (texture wins over consistency)', () => {
    const expenses = cafePatternExpenses(TODAY);
    const result = selectStatsObservation(expenses, 30, TODAY);
    expect(result).toBe('요즘 카페에 자주 들렀네요 ☕');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `소박이/`: `npx jest __tests__/statsObservationService.test.ts`
Expected: file fails to import (`Cannot find module ...statsObservationService`).

- [ ] **Step 3: Implement `selectStatsObservation`**

Create `소박이/src/services/statsObservationService.ts`:

```ts
import { Expense } from '../types';
import {
  hasCategoryPattern,
  hasNightPattern,
  type CategoryPatternOpts,
  type NightPatternOpts,
} from './roomPresenceService';
import { computeCalmDayCount } from './atmosphereService';

// ─── Stats observation — single rotating line ───────────────────────────────
//
// Picks ONE observation string from a priority chain. Lifestyle texture
// (cafe / night / calm) wins over consistency signals (streak tiers). The
// streak fallback absorbs what used to be a separate streak surface — there
// is no other observation line elsewhere on the Stats screen.

// Mirrors the cafe trigger used in roomPresenceService.checkForPlacement (P-path).
const CAFE_PATTERN_OPTS: CategoryPatternOpts = {
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
};

// Mirrors the NIGHT_TRIGGER defined in roomPresenceService (L-path).
const NIGHT_PATTERN_OPTS: NightPatternOpts = {
  startHour: 19,
  endHour: 4,
  minCount: 3,
  minDistinctDays: 3,
  windowDays: 14,
};

const CALM_OBSERVATION_THRESHOLD = 4;

/**
 * Pure. Returns ONE observation string for the Stats screen. Priority:
 *   1. cafe pattern detected     → "요즘 카페에 자주 들렀네요 ☕"
 *   2. night pattern detected    → "밤에도 종종 기록했네요 🌙"
 *   3. calm-day count >= 4       → "차분한 날이 자주 있었어요 🍃"
 *   4. streak >= 7               → "요즘 자주 들르고 있어요 🌿"
 *   5. streak >= 3               → "꾸준히 들르고 있어요 🌿"
 *   6. streak >= 1               → "오늘도 잠깐 들렀네요 🍃"
 *   7. default                   → "가끔씩 들러도 괜찮아요 🌿"
 *
 * `today` is a YYYY-MM-DD local-date string (matches `getLocalDateString`).
 */
export function selectStatsObservation(
  expenses: Expense[],
  streak: number,
  today: string,
): string {
  if (hasCategoryPattern(expenses, 'cafe', CAFE_PATTERN_OPTS, today)) {
    return '요즘 카페에 자주 들렀네요 ☕';
  }
  if (hasNightPattern(expenses, NIGHT_PATTERN_OPTS, today)) {
    return '밤에도 종종 기록했네요 🌙';
  }
  if (computeCalmDayCount(expenses, today) >= CALM_OBSERVATION_THRESHOLD) {
    return '차분한 날이 자주 있었어요 🍃';
  }
  if (streak >= 7) return '요즘 자주 들르고 있어요 🌿';
  if (streak >= 3) return '꾸준히 들르고 있어요 🌿';
  if (streak >= 1) return '오늘도 잠깐 들렀네요 🍃';
  return '가끔씩 들러도 괜찮아요 🌿';
}
```

- [ ] **Step 4: Verify CategoryPatternOpts and NightPatternOpts are exported**

Run: `Select-String -Pattern "export interface (CategoryPatternOpts|NightPatternOpts)" -Path "소박이\src\services\roomPresenceService.ts"`
Expected: both types are exported (they already are — lines 110 and 285 per the spec exploration). If not exported, edit `roomPresenceService.ts` to add `export` to the two interfaces — this is a benign mechanical change. Re-run the test.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/statsObservationService.test.ts`
Expected: all 10 tests pass.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 7: Commit**

```
cd ..
git add 소박이/src/services/statsObservationService.ts 소박이/__tests__/statsObservationService.test.ts
git commit -m "feat: selectStatsObservation priority chain for stats screen"
```

---

## Task 3: Verify Task 2 against the full suite

**Files:** none (verification only)

A small dedicated checkpoint between pure-logic and UI work — confirms nothing in the full suite regressed.

- [ ] **Step 1: Run the full Jest suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: all suites pass, including the new `statsObservationService.test.ts`. The count should be exactly `(baseline) + 10` tests.

- [ ] **Step 2: Run typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

If either check shows a new failure, stop and investigate before proceeding.

---

## Task 4: Extract `MonthPresenceRow` component (no interactivity)

**Files:**
- Create: `소박이/src/components/stats/MonthPresenceRow.tsx`

Pure presentational. Receives the data it needs as props; no store reads, no SDK, no tap handlers.

- [ ] **Step 1: Create the component**

Create `소박이/src/components/stats/MonthPresenceRow.tsx`:

```ts
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

interface DayCellData {
  total: number;
}

interface MonthPresenceRowProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  daysInMonth: number;
  expensesByDate: Record<string, DayCellData>;
  todayStr: string;
}

// Days where the numeric label renders above the glyph row.
// Sparse on purpose — the row reads as a soft trace, not a precise chart.
const LABEL_DAYS = [1, 10, 20, 30];

// Glyph table:
//   no record           → · (low-opacity middle dot)
//   no-spend only       → 🌿 (matches calendar leaf semantic)
//   any spending        → ●
//   today, no record    → ○ (only on current-month view)
//   mixed (spend + no-spend) → ● (spending dominates because total > 0)
function glyphFor(
  data: DayCellData | undefined,
  isToday: boolean,
  isFuture: boolean,
): { char: string; muted: boolean } {
  if (data) {
    if (data.total > 0) return { char: '●', muted: false };
    return { char: '🌿', muted: false };
  }
  if (isToday) return { char: '○', muted: false };
  return { char: '·', muted: isFuture };
}

export function MonthPresenceRow({
  viewYear,
  viewMonth,
  daysInMonth,
  expensesByDate,
  todayStr,
}: MonthPresenceRowProps) {
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        dateStr,
        data: expensesByDate[dateStr],
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
      };
    });
  }, [viewYear, viewMonth, daysInMonth, expensesByDate, todayStr]);

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        {days.map(({ day }) => (
          <View key={day} style={styles.cell}>
            <Text style={styles.label}>
              {LABEL_DAYS.includes(day) ? String(day) : ''}
            </Text>
          </View>
        ))}
      </View>
      <View style={styles.glyphRow}>
        {days.map(({ day, data, isToday, isFuture }) => {
          const { char, muted } = glyphFor(data, isToday, isFuture);
          return (
            <View key={day} style={styles.cell}>
              <Text
                style={[
                  styles.glyph,
                  muted && styles.glyphMuted,
                ]}
              >
                {char}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  labelRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  glyphRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textMuted,
    height: 14,
    lineHeight: 14,
  },
  glyph: {
    fontSize: 14,
    color: COLORS.textMuted,
    height: 18,
    lineHeight: 18,
    textAlign: 'center',
  },
  glyphMuted: {
    color: COLORS.textLight,
    opacity: 0.5,
  },
});
```

- [ ] **Step 2: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors. The new file is not imported anywhere yet, so it must typecheck on its own merits.

- [ ] **Step 3: Commit**

```
cd ..
git add 소박이/src/components/stats/MonthPresenceRow.tsx
git commit -m "feat: MonthPresenceRow presentational component"
```

---

## Task 5: stats.tsx — delete trend graph + orphan memos

**Files:**
- Modify: `소박이/src/pages/stats.tsx`

This task ONLY deletes — no insertion of new code. The next task wires `MonthPresenceRow` in. Splitting deletion and insertion makes the regression check easier.

- [ ] **Step 1: Read the relevant sections of stats.tsx**

Find and confirm these landmark sections exist:
- Lines ~35–115: `MonthTrendGraph` component and helpers (`TREND_BAR_MAX`, `Y_AXIS_W`, `TREND_LABEL_DAYS`, `MonthTrendGraph` itself, `trendStyles` block which appears later in the styles section).
- Lines ~257–280: `weeklyTotal` + `monthlyTotal` `useMemo` blocks.
- Lines ~497–520: the `settlementSection` JSX (currently containing `결산` title, two totals, top-scene chip, standalone `streakRow`).
- Lines ~531–537: the existing `<MonthTrendGraph ... />` JSX call.

- [ ] **Step 2: Delete `MonthTrendGraph` component + constants**

Remove from `stats.tsx`:

1. Delete the constants:
   ```ts
   const TREND_BAR_MAX = 72;
   const Y_AXIS_W = 52;
   const TREND_LABEL_DAYS = new Set([1, 8, 15, 22, 29]);
   ```
2. Delete the `interface TrendGraphProps` declaration.
3. Delete the entire `function MonthTrendGraph(...)` component.
4. Delete the `trendStyles` `StyleSheet.create(...)` block (it lives separately in the file).
5. Delete the `<MonthTrendGraph ... />` JSX call (currently the last block inside the main ScrollView).

- [ ] **Step 3: Delete orphan `weeklyTotal` and `monthlyTotal` memos**

Remove the two `useMemo` declarations:

```ts
const weeklyTotal = useMemo(() => { ... }, [...]);
const monthlyTotal = useMemo(() => { ... }, [...]);
```

`topCategoryThisMonth` MUST stay (the chip still uses it in Task 6).

- [ ] **Step 4: Typecheck — expect targeted errors only**

Run from `소박이/`: `npm run typecheck`
Expected: pre-existing `_404.tsx` errors PLUS new errors in `stats.tsx` for any references to the now-deleted symbols. Specifically there will be references in the settlement section to `weeklyTotal` and `monthlyTotal` — these resolve in Task 6.

Note: this task is the only one in the chain that intentionally leaves typecheck dirty. Confirm the errors are ONLY about the deleted symbols. If unrelated errors appear, stop.

- [ ] **Step 5: Commit (typecheck-dirty)**

```
cd ..
git add 소박이/src/pages/stats.tsx
git commit -m "refactor(stats): delete MonthTrendGraph + orphan total memos"
```

The next commit (Task 6) closes the dirty-typecheck window.

---

## Task 6: stats.tsx — rewrite the settlement block

**Files:**
- Modify: `소박이/src/pages/stats.tsx`

Replaces the `결산` block with the three observation groups defined in the spec. Closes the typecheck errors from Task 5.

- [ ] **Step 1: Add imports**

Near the top of `stats.tsx` (after the existing imports), add:

```ts
import { selectStatsObservation } from '../services/statsObservationService';
import { MonthPresenceRow } from '../components/stats/MonthPresenceRow';
```

- [ ] **Step 2: Add presence-cadence computations**

Inside `StatsScreen()`, near the other `useMemo` blocks (after `topCategoryThisMonth`), add:

```ts
  // Distinct local-date days with ANY record (spending OR no-spend) in the
  // current calendar week (Sun–Sat) anchored on `today`.
  const weekVisitDays = useMemo(() => {
    const t = new Date(todayStr + 'T12:00:00');
    const weekStart = new Date(t);
    weekStart.setDate(t.getDate() - t.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Saturday
    const startStr = getLocalDateString(weekStart);
    const endStr = getLocalDateString(weekEnd);
    const days = new Set<string>();
    for (const e of expenses) {
      const d = getLocalDateString(new Date(e.createdAt));
      if (d >= startStr && d <= endStr) days.add(d);
    }
    return days.size;
  }, [expenses, todayStr]);

  // Distinct local-date days with ANY record in the current view month.
  const monthVisitDays = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const days = new Set<string>();
    for (const e of expenses) {
      const d = getLocalDateString(new Date(e.createdAt));
      if (d.startsWith(prefix)) days.add(d);
    }
    return days.size;
  }, [expenses, viewYear, viewMonth]);
```

- [ ] **Step 3: Build the cadence-line strings**

Also inside `StatsScreen()`, immediately after the two `useMemo`s from Step 2, add:

```ts
  const cadenceLines: string[] = useMemo(() => {
    if (monthVisitDays === 0) {
      return ['이번 달은 아직 비어있어요 🌿'];
    }
    if (weekVisitDays === 0) {
      return [
        '이번 주는 아직 비어있어요 🌿',
        `이번 달은 ${monthVisitDays}일 다녀갔어요`,
      ];
    }
    return [
      `이번 주엔 ${weekVisitDays}번 들렀어요`,
      `이번 달은 ${monthVisitDays}일 다녀갔어요`,
    ];
  }, [weekVisitDays, monthVisitDays]);

  const observation = useMemo(
    () => selectStatsObservation(expenses, streak, todayStr),
    [expenses, streak, todayStr],
  );
```

- [ ] **Step 4: Replace the settlement JSX**

Find the existing block inside the `<ScrollView>`:

```tsx
        {/* Settlement */}
        <View style={styles.settlementSection}>
          <Text style={styles.settlementTitle}>결산</Text>
          <View style={styles.settlementRow}>
            <View style={styles.settlementItem}>
              <Text style={styles.settlementLabel}>이번 주</Text>
              <Text style={styles.settlementValue}>{weeklyTotal.toLocaleString()}원</Text>
            </View>
            <View style={styles.settlementDivider} />
            <View style={styles.settlementItem}>
              <Text style={styles.settlementLabel}>{viewMonth + 1}월 전체</Text>
              <Text style={styles.settlementValue}>{monthlyTotal.toLocaleString()}원</Text>
            </View>
          </View>

          {topCategoryThisMonth && (
            <View style={styles.settlementChip}>
              <Text style={styles.settlementChipText}>
                이번 달은 {formatCategoryWithEmoji(topCategoryThisMonth)} · 가장 자주 기록했어요
              </Text>
            </View>
          )}

          <View style={styles.streakRow}>
            <Text style={styles.streakText}>
              {streak >= 3
                ? '요즘 자주 들르고 있네요 🌿'
                : streak >= 1
                  ? '오늘도 잠깐 들렀네요 🍃'
                  : '가끔씩 들러도 괜찮아요 🌿'}
            </Text>
          </View>
        </View>
```

Replace with:

```tsx
        {/* Observation block — replaces 결산. No title; three groups flow. */}
        <View style={styles.settlementSection}>
          {cadenceLines.map((line) => (
            <Text key={line} style={styles.cadenceLine}>{line}</Text>
          ))}

          {monthVisitDays > 0 && topCategoryThisMonth && (
            <View style={styles.settlementChip}>
              <Text style={styles.settlementChipText}>
                {formatCategoryWithEmoji(topCategoryThisMonth)} · 가장 자주 기록한 장면
              </Text>
            </View>
          )}

          {monthVisitDays > 0 && (
            <Text style={styles.observationLine}>{observation}</Text>
          )}
        </View>
```

Note the empty-month behavior: when `monthVisitDays === 0`, only the single cadence line renders. The chip and observation hide because both are guarded on `monthVisitDays > 0`.

- [ ] **Step 5: Replace `<MonthTrendGraph .../>` JSX with `<MonthPresenceRow .../>`**

Just below the closing `</View>` of the settlement block, the file previously rendered:

```tsx
        {/* Trend graph */}
        <MonthTrendGraph
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
        />
```

Replace with:

```tsx
        {/* Month presence row — soft trace of this month, not a chart */}
        <MonthPresenceRow
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
          todayStr={todayStr}
        />
```

If Task 5 already removed the `<MonthTrendGraph>` JSX call but didn't insert a replacement, the slot may be empty — insert the `<MonthPresenceRow>` block in the same position.

- [ ] **Step 6: Add new styles, delete old ones**

In the `StyleSheet.create({ ... })` block:

ADD:
```ts
  cadenceLine: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 2,
  },
  observationLine: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
  },
```

DELETE (all references to these styles are removed in Step 4):
```ts
  settlementTitle: { ... },
  settlementRow: { ... },
  settlementItem: { ... },
  settlementLabel: { ... },
  settlementValue: { ... },
  settlementDivider: { ... },
  streakRow: { ... },
  streakText: { ... },
```

Confirm via grep that none of these style names remain referenced before deleting: `Select-String -Pattern "styles\.(settlementTitle|settlementRow|settlementItem|settlementLabel|settlementValue|settlementDivider|streakRow|streakText)\b" -Path "소박이\src\pages\stats.tsx"` should return zero matches after the JSX edit in Step 4.

`settlementSection`, `settlementChip`, and `settlementChipText` STAY — they wrap and style the new observation block.

- [ ] **Step 7: Soften the calendar amount color**

Find:
```ts
  dayAmount: { fontSize: 9, color: COLORS.oliveGreen, marginTop: 1, height: 12, lineHeight: 12 },
```

Replace with:
```ts
  dayAmount: { fontSize: 9, color: COLORS.textMuted, marginTop: 1, height: 12, lineHeight: 12 },
```

ONLY the color changes. `dayAmountSelected` (which renders selected-cell amounts in `rgba(255,255,255,0.85)`) stays as-is.

- [ ] **Step 8: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: ONLY the 2 pre-existing `_404.tsx` errors. The Task 5 dirty-window closes here.

- [ ] **Step 9: Commit**

```
cd ..
git add 소박이/src/pages/stats.tsx
git commit -m "feat: observation block replaces 결산, MonthPresenceRow replaces trend graph"
```

---

## Task 7: Verify the rewrite

**Files:** none (verification only)

A focused checkpoint after the largest single-task change in the plan.

- [ ] **Step 1: Run typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: 2 pre-existing `_404.tsx` errors only.

- [ ] **Step 2: Run the full Jest suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: same baseline count + 10 new statsObservation tests. All green.

- [ ] **Step 3: Grep for accidental monetary analytics reintroduction**

Run these greps and confirm ZERO matches (PowerShell `Select-String` returns nothing when no matches):

```
Select-String -Pattern "weeklyTotal|monthlyTotal" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "결산" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "MonthTrendGraph|TREND_BAR_MAX|TREND_LABEL_DAYS|trendStyles" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "settlementTitle|settlementValue|settlementLabel|settlementRow|settlementDivider|streakRow|streakText" -Path "소박이\src\pages\stats.tsx"
```

Each MUST return zero matches. If any returns matches, stop and clean up.

- [ ] **Step 4: Confirm what's preserved**

These greps MUST still find matches (verifying we did NOT accidentally delete regression-sensitive surfaces):

```
Select-String -Pattern "openEdit|commitEdit|commitDelete|editingExpense" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "ExpenseList|selectedSpendingExpenses|photocardEntry" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "openMonthPicker|prevMonth|nextMonth|showMonthPicker" -Path "소박이\src\pages\stats.tsx"
Select-String -Pattern "topCategoryThisMonth|settlementChip" -Path "소박이\src\pages\stats.tsx"
```

Each MUST return matches. If any returns zero, restore the affected surface.

---

## Task 8: Final regression guardrails + commit

**Files:** none (verification only); optional doc updates as a separate commit

The full-screen sanity pass — confirms every surface that should NOT have changed still works as before.

- [ ] **Step 1: Trace through each regression-guardrail surface in `stats.tsx`**

Read these regions of `stats.tsx` and confirm the code-level behavior matches the spec's "Unchanged" list:

1. **Calendar grid:** the `calendarWeeks.map((week, wi) => ...)` block still renders 6 rows × 7 cells; each cell uses `styles.cell`, `styles.cellSelected`, `styles.cellToday`; future cells are non-tappable; selection sets `selectedDay`; the leaf glyph 🌿 still renders on no-spend days. ONLY the amount color changed.

2. **Month navigation:** `prevMonth` / `nextMonth` handlers unchanged; the month-picker modal (commit `f8cfabc`, 2026-05-22) is untouched.

3. **Selected-day expense list:** `<ExpenseList expenses={selectedSpendingExpenses} onPress={openEdit} />` block unchanged; `selectedSpendingExpenses` filter unchanged (`!= 'no_spend'`); the day card title + total still render with the existing styles.

4. **Photocard entry button:** the conditional `{selectedSpendingExpenses.length > 0 && (<Pressable style={styles.photocardEntryBtn} onPress={openDayPhotocard}>...)}` unchanged.

5. **Edit/delete sheet:** the entire bottom-sheet block (animated translateY, keyboard listeners, `openEdit`/`closeEdit`/`commitEdit`/`commitDelete` callbacks, `editingExpense` state, `editAmount`/`editCategory`/`editMemo` state) is unchanged.

6. **Day photocard modal:** `showDayPhotocard` state + `<DayPhotocardOverlay>` JSX unchanged.

If any of these has been touched, document the change. If the touch was unintentional, revert it.

- [ ] **Step 2: Run the full Jest suite one more time**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: same green result as the start of Task 7.

- [ ] **Step 3: Run typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: 2 pre-existing `_404.tsx` errors only.

- [ ] **Step 4: Verify no analytics reintroduction across the whole src tree**

```
Select-String -Pattern "weeklyTotal|monthlyTotal" -Path "소박이\src\**\*.tsx","소박이\src\**\*.ts" -Recurse
```

Expected: zero matches anywhere in `src/`. (The patterns may legitimately exist in test files or specs — limit the grep to `src/` to be safe.)

- [ ] **Step 5: Optional — update SOBAGI_CURRENT_STATE + SOBAGI_NEXT_PRIORITIES**

If the docs convention applies (it has at every recent landing), update:

- `소박이/docs/SOBAGI_CURRENT_STATE.md` — replace the Latest Handoff with the Stats Evolution summary; add a row to the System Status table; no new storage keys.
- `소박이/docs/SOBAGI_NEXT_PRIORITIES.md` — move "Stats screen evolution" out of the "next major polish landing" and into Recently completed.

If this is a separate commit, message: `docs: stats evolution landing handoff`.

- [ ] **Step 6: Final commit (if Step 5 was performed)**

```
cd ..
git add 소박이/docs/SOBAGI_CURRENT_STATE.md 소박이/docs/SOBAGI_NEXT_PRIORITIES.md
git commit -m "docs: stats evolution landing handoff"
```

---

## Verification matrix (cross-reference with spec success criteria)

| Spec criterion | Verified by |
|---|---|
| `결산` title + bold monetary totals gone | Task 6 Step 4 (JSX delete) + Task 7 Step 3 grep |
| Three groups flow under photocard entry | Task 6 Step 4 (JSX rewrite) |
| Empty month → single line `이번 달은 아직 비어있어요 🌿` | Task 6 Step 3 (`cadenceLines` logic) + Step 4 (chip/observation guards) |
| Empty week, populated month → two lines | Task 6 Step 3 (`cadenceLines` second branch) |
| Pattern observation prioritizes texture over streak | Task 2 priority chain + tests |
| Bar trend graph gone, dot row in its place | Task 5 (delete) + Task 6 Step 5 (insert) |
| Calendar amounts recede but stay legible | Task 6 Step 7 (color change only) |
| Standalone streak line removed | Task 6 Step 4 (JSX delete) + Task 7 Step 3 grep |
| Calendar selection/list/edit/month-nav/photocard unchanged | Task 8 Step 1 (regression trace) + Task 7 Step 4 (positive greps) |
| Typecheck clean, new tests pass, full suite green | Task 1 baseline + Tasks 3, 7, 8 |
| No analytics reintroduction | Task 7 Step 3 + Task 8 Step 4 |
