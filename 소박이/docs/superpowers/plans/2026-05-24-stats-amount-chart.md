# Stats Amount Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `MonthPresenceRow` dot trace at the bottom of the Stats tab with a readable monthly spending bar chart (x = days, y = amount), with a y-axis scale, weekly date labels, today/selected highlights, and tap-to-select wiring to the calendar.

**Architecture:** A new `MonthAmountChart` component revives and enhances the pre-`84bb12b` `MonthTrendGraph`. Pure scaling/formatting helpers live in a separate `.ts` file (no React Native imports) so they're unit-testable in isolation; the component consumes them. `stats.tsx` swaps `MonthPresenceRow` for `MonthAmountChart` and wires `selectedDay`/`setSelectedDay`. `expensesByDate.total` is already spending-only — consumed read-only.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-24-stats-amount-chart-design.md`

**Phasing:**
1. Baseline checks (Task 1)
2. Pure helpers + tests (Task 2)
3. Component (Task 3)
4. Wire into stats.tsx + delete MonthPresenceRow (Task 4)
5. Final verification + docs/memory handoff (Task 5)

**Commands** (run from `소박이/`):
- Single test: `npx jest __tests__/<file>.test.ts`
- Full suite: `npm test`
- Typecheck: `npm run typecheck`

**Shell note:** PowerShell on Windows. The repo lives under a Korean path (`소박이`). Prefer the PowerShell tool with absolute paths; `Set-Location 'C:\Users\toodo\workspace\phy'` before git, and `Set-Location 'C:\Users\toodo\workspace\phy\소박이'` before npm. For chaining use `;` (PowerShell) — `&&` is not valid in PS 5.1.

**Working tree note:** Expected clean before starting (last commits: `c62a0cc` TV change, `c00e526` this spec). If `git status` shows unexpected `M`, stop and ask.

**Direction note (re-read before committing):** This intentionally reverses the 2026-05-22 "no finance dashboard" decision for the Stats bottom graph only. Reintroducing y-axis amounts + tappable bars is the goal here, NOT an anti-pattern. The reversal is scoped to this chart; do not extend finance-dashboard styling to other screens.

---

## Task 1: Baseline checks

**Files:** none (verification only)

- [ ] **Step 1: Verify clean working tree**

Run from `C:\Users\toodo\workspace\phy`: `git status --short`
Expected: empty. If unexpected `M`/`??`, stop and surface.

- [ ] **Step 2: Record baseline HEAD**

Run: `git log --oneline -1`
Expected: `c00e526 docs: stats amount chart design spec ...`. Note the SHA as BASE_SHA.

- [ ] **Step 3: Typecheck baseline**

Run from `소박이/`: `npm run typecheck`
Record the actual result. Expected: clean (0 errors). Note: earlier in this project some runs showed 2 pre-existing `src/pages/_404.tsx` errors (TS2769 + TS7006) depending on environment. Whatever count appears now is the regression reference — every subsequent typecheck must not exceed it.

- [ ] **Step 4: Jest baseline**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Record the actual `Test Suites` / `Tests` totals (recent direct runs showed `17 passed` suites / `285 passed` tests). This is the regression reference; the only delta this plan introduces is the new helper test suite in Task 2.

- [ ] **Step 5: Note results**

```
BASE_SHA: <from step 2>
Typecheck baseline: <N> errors (<files>)
Jest baseline: <S> suites, <T> tests, all green
```

---

## Task 2: Pure helpers + tests

**Files:**
- Create: `소박이/src/components/stats/monthAmountChart.helpers.ts`
- Create: `소박이/__tests__/monthAmountChart.helpers.test.ts`

Pure logic, no React Native imports — so the test imports them without pulling in RN. TDD: tests first.

- [ ] **Step 1: Write the failing tests**

Create `소박이/__tests__/monthAmountChart.helpers.test.ts`:

```ts
import { fmtAmt, barHeightFor, selectMaxTotal } from '../src/components/stats/monthAmountChart.helpers';

describe('fmtAmt', () => {
  it('formats zero as "0"', () => {
    expect(fmtAmt(0)).toBe('0');
  });

  it('formats negative/invalid as "0"', () => {
    expect(fmtAmt(-100)).toBe('0');
  });

  it('formats >= 10000 in 만 units, dropping trailing .0', () => {
    expect(fmtAmt(10000)).toBe('1만');
    expect(fmtAmt(40000)).toBe('4만');
  });

  it('formats >= 10000 with one decimal when not whole 만', () => {
    expect(fmtAmt(72000)).toBe('7.2만');
    expect(fmtAmt(125000)).toBe('12.5만');
  });

  it('formats < 10000 in 천 units (nearest 천)', () => {
    expect(fmtAmt(8000)).toBe('8천');
    expect(fmtAmt(5400)).toBe('5천');
  });
});

describe('barHeightFor', () => {
  const BAR_MAX = 72;
  const MIN_BAR = 8;

  it('returns 0 for a zero-spending day (baseline, no bar)', () => {
    expect(barHeightFor(0, 80000, BAR_MAX, MIN_BAR)).toBe(0);
  });

  it('returns barMax for the max day', () => {
    expect(barHeightFor(80000, 80000, BAR_MAX, MIN_BAR)).toBe(BAR_MAX);
  });

  it('floors small non-zero days at minBar', () => {
    // 1000/80000 * 72 ≈ 0.9 → rounds to 1 → floored to MIN_BAR (8)
    expect(barHeightFor(1000, 80000, BAR_MAX, MIN_BAR)).toBe(MIN_BAR);
  });

  it('scales proportionally in between', () => {
    // 40000/80000 * 72 = 36
    expect(barHeightFor(40000, 80000, BAR_MAX, MIN_BAR)).toBe(36);
  });

  it('never exceeds barMax even if total > maxTotal', () => {
    expect(barHeightFor(120000, 80000, BAR_MAX, MIN_BAR)).toBe(BAR_MAX);
  });

  it('returns 0 when maxTotal is 0 (divide-by-zero guard)', () => {
    expect(barHeightFor(0, 0, BAR_MAX, MIN_BAR)).toBe(0);
    expect(barHeightFor(5000, 0, BAR_MAX, MIN_BAR)).toBe(0);
  });
});

describe('selectMaxTotal', () => {
  it('returns 0 for an empty month', () => {
    expect(selectMaxTotal({}, 2026, 4, 31)).toBe(0);
  });

  it('returns the max daily total within the month', () => {
    const byDate = {
      '2026-05-03': { total: 12000 },
      '2026-05-10': { total: 45000 },
      '2026-05-20': { total: 8000 },
    };
    expect(selectMaxTotal(byDate, 2026, 4, 31)).toBe(45000);
  });

  it('ignores dates outside the view month', () => {
    const byDate = {
      '2026-05-10': { total: 30000 },
      '2026-06-01': { total: 99000 }, // different month — must be ignored
    };
    expect(selectMaxTotal(byDate, 2026, 4, 31)).toBe(30000);
  });

  it('ignores days beyond daysInMonth', () => {
    const byDate = {
      '2026-02-28': { total: 20000 },
      '2026-02-29': { total: 50000 }, // 2026 Feb has 28 days — day 29 must be ignored
    };
    expect(selectMaxTotal(byDate, 2026, 1, 28)).toBe(20000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `소박이/`: `npx jest __tests__/monthAmountChart.helpers.test.ts`
Expected: import failure — module/exports don't exist yet.

- [ ] **Step 3: Implement the helpers**

Create `소박이/src/components/stats/monthAmountChart.helpers.ts`:

```ts
// Pure helpers for MonthAmountChart. No React Native imports — keep unit-testable.

/**
 * Compact amount label for the y-axis (only ever formats maxTotal, midTotal, 0).
 *   0            → "0"
 *   >= 10000     → 만 units, one decimal, trailing .0 dropped (40000 → "4만", 72000 → "7.2만")
 *   0 < n <10000 → nearest 천 (8000 → "8천", 5400 → "5천")
 */
export function fmtAmt(n: number): string {
  if (n <= 0) return '0';
  if (n >= 10000) return `${Math.round(n / 1000) / 10}만`;
  return `${Math.round(n / 1000)}천`;
}

/**
 * Pixel height of a day's spending bar.
 *   total <= 0       → 0 (baseline, the component renders a faint empty tick instead)
 *   maxTotal <= 0    → 0 (divide-by-zero guard)
 *   otherwise        → round(total/maxTotal * barMax), floored at minBar, capped at barMax
 */
export function barHeightFor(total: number, maxTotal: number, barMax: number, minBar: number): number {
  if (total <= 0 || maxTotal <= 0) return 0;
  const raw = Math.round((total / maxTotal) * barMax);
  return Math.min(Math.max(raw, minBar), barMax);
}

/**
 * Largest daily spending total within the view month. 0 if the month has no
 * spending (drives the empty-state branch). Only considers days 1..daysInMonth.
 */
export function selectMaxTotal(
  expensesByDate: Record<string, { total: number }>,
  viewYear: number,
  viewMonth: number,
  daysInMonth: number,
): number {
  let max = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = expensesByDate[dateStr]?.total ?? 0;
    if (total > max) max = total;
  }
  return max;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/monthAmountChart.helpers.test.ts`
Expected: all tests pass (5 fmtAmt + 6 barHeightFor + 4 selectMaxTotal = 15 tests).

- [ ] **Step 5: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: same as baseline (no new errors).

- [ ] **Step 6: Commit**

Run from `C:\Users\toodo\workspace\phy`:
```
git add "소박이/src/components/stats/monthAmountChart.helpers.ts" "소박이/__tests__/monthAmountChart.helpers.test.ts"
git commit -m "feat(stats): pure helpers for month amount chart (fmtAmt, barHeightFor, selectMaxTotal)"
```

---

## Task 3: `MonthAmountChart` component

**Files:**
- Create: `소박이/src/components/stats/MonthAmountChart.tsx`

Presentational + interactive. Consumes the Task 2 helpers. Not imported anywhere yet (wired in Task 4), so it must typecheck on its own.

- [ ] **Step 1: Create the component**

Create `소박이/src/components/stats/MonthAmountChart.tsx`:

```tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { COLORS } from '../../constants/colors';
import { fmtAmt, barHeightFor, selectMaxTotal } from './monthAmountChart.helpers';

const BAR_MAX = 72;
const MIN_BAR = 8;
const Y_AXIS_W = 52;
// Weekly date labels — readable for a month without crowding.
const LABEL_DAYS = new Set([1, 8, 15, 22, 29]);

interface MonthAmountChartProps {
  viewYear: number;
  viewMonth: number; // 0-indexed
  daysInMonth: number;
  expensesByDate: Record<string, { total: number }>;
  todayStr: string;
  selectedDay: string;
  onSelectDay: (dateStr: string) => void;
}

export function MonthAmountChart({
  viewYear,
  viewMonth,
  daysInMonth,
  expensesByDate,
  todayStr,
  selectedDay,
  onSelectDay,
}: MonthAmountChartProps) {
  const days = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        dateStr,
        total: expensesByDate[dateStr]?.total ?? 0,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDay,
        isFuture: dateStr > todayStr,
      };
    });
  }, [viewYear, viewMonth, daysInMonth, expensesByDate, todayStr, selectedDay]);

  const maxTotal = useMemo(
    () => selectMaxTotal(expensesByDate, viewYear, viewMonth, daysInMonth),
    [expensesByDate, viewYear, viewMonth, daysInMonth],
  );
  const midTotal = Math.round(maxTotal / 2);
  const hasAnySpending = maxTotal > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>이달의 흐름</Text>
      <View style={styles.wrapper}>
        <View style={styles.yAxis}>
          <Text style={styles.yLabel}>{hasAnySpending ? fmtAmt(maxTotal) : ''}</Text>
          <Text style={styles.yLabel}>{hasAnySpending ? fmtAmt(midTotal) : ''}</Text>
          <Text style={styles.yLabel}>0</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={styles.barArea}>
            <View style={[styles.guideLine, { top: 0 }]} />
            <View style={[styles.guideLine, { top: BAR_MAX / 2 }]} />
            <View style={[styles.guideLine, { bottom: 0 }]} />

            <View style={styles.barsRow}>
              {days.map(({ day, dateStr, total, isToday, isSelected, isFuture }) => {
                const h = barHeightFor(total, maxTotal, BAR_MAX, MIN_BAR);
                const hasData = h > 0;
                return (
                  <Pressable
                    key={day}
                    style={styles.barColumn}
                    onPress={isFuture ? undefined : () => onSelectDay(dateStr)}
                    disabled={isFuture}
                    hitSlop={4}
                  >
                    <View
                      style={[
                        styles.bar,
                        hasData ? { height: h } : styles.barEmptyTick,
                        hasData && styles.barFilled,
                        isToday && !isSelected && styles.barToday,
                        isSelected && styles.barSelected,
                        isFuture && styles.barFuture,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.xRow}>
            {days.map(({ day }) => (
              <View key={day} style={styles.xCell}>
                <Text style={styles.xLabel}>{LABEL_DAYS.has(day) ? String(day) : ''}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.warmWhite,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 14,
    marginTop: 16,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  wrapper: {
    flexDirection: 'row',
    gap: 6,
  },
  yAxis: {
    width: Y_AXIS_W,
    height: BAR_MAX,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'right',
  },
  barArea: {
    height: BAR_MAX,
    position: 'relative',
  },
  guideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COLORS.border,
    opacity: 0.6,
  },
  barsRow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1.5,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barFilled: {
    backgroundColor: COLORS.oliveGreen,
    opacity: 0.55,
  },
  barEmptyTick: {
    height: 2,
    backgroundColor: COLORS.border,
    borderRadius: 2,
  },
  barToday: {
    opacity: 0.9,
    borderWidth: 1,
    borderColor: COLORS.oliveDark,
  },
  barSelected: {
    backgroundColor: COLORS.oliveDark,
    opacity: 1,
  },
  barFuture: {
    opacity: 0.25,
  },
  xRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  xCell: {
    flex: 1,
    alignItems: 'center',
  },
  xLabel: {
    fontSize: 9,
    color: COLORS.textLight,
    textAlign: 'center',
    height: 13,
    lineHeight: 13,
  },
});
```

- [ ] **Step 2: Verify COLORS keys exist**

Run:
```
Select-String -Pattern "warmWhite|oliveDark|oliveGreen|textLight|textMuted|wood\b|border" -Path "소박이\src\constants\colors.ts"
```
Expected: all of `warmWhite`, `oliveDark`, `oliveGreen`, `textLight`, `textMuted`, `wood`, `border` are present. If any is missing, stop and surface (do NOT invent a color).

- [ ] **Step 3: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: same as baseline. The new file isn't imported yet, so it must typecheck standalone. Note `expensesByDate` prop is `Record<string, { total: number }>` — `stats.tsx` passes a `Record<string, DayAccum>` where `DayAccum` has `total: number` plus extra fields; structural typing makes that assignable (the old `MonthTrendGraph` used the same prop type).

- [ ] **Step 4: Commit**

Run from `C:\Users\toodo\workspace\phy`:
```
git add "소박이/src/components/stats/MonthAmountChart.tsx"
git commit -m "feat(stats): MonthAmountChart component (bars, y-axis, tap-to-select, today/selected highlight)"
```

---

## Task 4: Wire into `stats.tsx`, delete `MonthPresenceRow`

**Files:**
- Modify: `소박이/src/pages/stats.tsx`
- Delete: `소박이/src/components/stats/MonthPresenceRow.tsx`

- [ ] **Step 1: Swap the import**

In `소박이/src/pages/stats.tsx`, find:

```ts
import { MonthPresenceRow } from '../components/stats/MonthPresenceRow';
```

Replace with:

```ts
import { MonthAmountChart } from '../components/stats/MonthAmountChart';
```

- [ ] **Step 2: Swap the render**

Find the `<MonthPresenceRow ... />` usage. It looks like:

```tsx
        <MonthPresenceRow
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
          todayStr={todayStr}
        />
```

Replace with:

```tsx
        <MonthAmountChart
          viewYear={viewYear}
          viewMonth={viewMonth}
          daysInMonth={daysInMonth}
          expensesByDate={expensesByDate}
          todayStr={todayStr}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
        />
```

`selectedDay` and `setSelectedDay` already exist in `StatsScreen()` (the `useState<string>(todayStr)` at the top). No new state needed.

- [ ] **Step 3: Delete `MonthPresenceRow.tsx`**

Run from `C:\Users\toodo\workspace\phy`:
```
Remove-Item "소박이\src\components\stats\MonthPresenceRow.tsx" -Force
```

- [ ] **Step 4: Confirm no dead references to MonthPresenceRow**

Run:
```
Select-String -Pattern "MonthPresenceRow" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```
Expected: zero matches.

Also confirm no test referenced it:
```
Select-String -Pattern "MonthPresenceRow" -Path "소박이\__tests__\**\*.ts" -Recurse
```
Expected: zero matches (there was no MonthPresenceRow test).

- [ ] **Step 5: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: same as baseline.

- [ ] **Step 6: Full Jest**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: baseline suites + 1 (the new helpers suite); baseline tests + 15. All green.

- [ ] **Step 7: Commit**

Run from `C:\Users\toodo\workspace\phy`:
```
git add "소박이/src/pages/stats.tsx" "소박이/src/components/stats/MonthPresenceRow.tsx"
git commit -m "feat(stats): swap dot trace for MonthAmountChart; remove MonthPresenceRow"
```

---

## Task 5: Final verification + docs/memory handoff

**Files:**
- Modify: `소박이/docs/SOBAGI_CURRENT_STATE.md`
- Modify: `소박이/docs/superpowers/specs/2026-05-22-stats-evolution-design.md` (anti-pattern note)

- [ ] **Step 1: Full typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: same as baseline (no new errors).

- [ ] **Step 2: Full Jest**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: baseline + 1 suite / + 15 tests, all green.

- [ ] **Step 3: Anti-pattern / preservation greps**

```
Select-String -Pattern "MonthPresenceRow" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```
Expected: zero matches.

```
Select-String -Pattern "selectStatsObservation|cadenceLine|settlementChip|selectedIncomeExpenses|openEdit" -Path "소박이\src\pages\stats.tsx"
```
Expected: matches present — observation block, income section, and edit flow all preserved.

- [ ] **Step 4: Code-level trace**

Read the swapped region of `stats.tsx` and confirm:
- `<MonthAmountChart>` receives all 7 props including `selectedDay={selectedDay}` and `onSelectDay={setSelectedDay}`.
- The observation block (cadence lines + top-scene chip + observation line) still renders above the chart, unchanged.
- The day card, income section, photocard entry, edit sheet are untouched.

- [ ] **Step 5: Update `SOBAGI_CURRENT_STATE.md`**

Read the file. Replace the "Latest Handoff" section with a Stats amount chart summary:

- Agent: Engineering; Date: 2026-05-24; Group: Stats amount chart
- What changed: `MonthPresenceRow` dot trace replaced by `MonthAmountChart` bar chart (x=day, y=daily spending total, y-axis `max/mid/0` compact labels + faint gridlines, weekly date labels 1/8/15/22/29, today/selected highlight, tap-to-select wired to `selectedDay`). New pure helpers `monthAmountChart.helpers.ts` (`fmtAmt`/`barHeightFor`/`selectMaxTotal`) + 15 unit tests. `MonthPresenceRow.tsx` deleted.
- Direction: **conscious reversal** of the 2026-05-22 stats-evolution "no finance dashboard / no y-axis / no tappable" decision, scoped to the Stats bottom graph only. Rest of app identity unchanged.
- What's working: bottom graph is a readable spending bar chart; tapping a bar selects that day (calendar + day card update). Income excluded from bars (spending-only `total`).
- Preserved: observation block, income section, day card, photocard entry, edit sheet, calendar, month nav/picker.
- No new storage keys.

Add a row to the System Status table for the Stats amount chart if the table format applies.

- [ ] **Step 6: Note the reversal on the stats-evolution spec**

In `소박이/docs/superpowers/specs/2026-05-22-stats-evolution-design.md`, add a short note at the top of the "Anti-patterns (out of scope)" section (or near the presence-dot section):

```
> **2026-05-24 amendment:** The "no Y-axis / no tappable presence row / bar trend graph gone" constraints were intentionally reversed for the Stats bottom graph by the 2026-05-24 Stats Amount Chart spec. The presence-dot row was replaced with a readable spending bar chart (x=day, y=amount) with tap-to-select. This amendment applies ONLY to the bottom graph; the rest of the stats-evolution direction (no 결산 totals block, single observation line, spending-only) still stands.
```

- [ ] **Step 7: Commit docs**

Run from `C:\Users\toodo\workspace\phy`:
```
git add "소박이/docs/SOBAGI_CURRENT_STATE.md" "소박이/docs/superpowers/specs/2026-05-22-stats-evolution-design.md"
git commit -m "docs: stats amount chart landing handoff + stats-evolution anti-pattern amendment"
```

- [ ] **Step 8: Memory update (controller, not a code commit)**

After the landing, the controller updates the memory note `feedback_sobagi_restraint_over_visibility.md` to record that the Stats amount chart is an explicit, product-owner-approved exception to "restraint over visibility" — the dot trace was judged too subtle and replaced with a readable bar chart. (This is a memory-file edit, not part of the code commits.)

---

## Verification matrix (cross-reference with spec success criteria)

| Spec criterion | Verified by |
|---|---|
| Readable bar chart: bar per day, height by spending total | Task 3 component + Task 2 `barHeightFor` |
| Y-axis `max/mid/0` compact labels + faint gridlines | Task 3 (yAxis + guideLines) + Task 2 `fmtAmt` |
| Weekly date labels 1/8/15/22/29 | Task 3 (`LABEL_DAYS`) |
| Tap bar → selects that day (calendar + day card update) | Task 4 (`onSelectDay={setSelectedDay}`) |
| Today + selected bars visually distinct | Task 3 (`barToday` / `barSelected`, selected wins) |
| Income-only / no-spend / future days = baseline | Task 3 (future faint+disabled) + spending-only `total` |
| Empty month = quiet empty axis, no divide-by-zero | Task 3 (`hasAnySpending` blanks labels) + Task 2 guards |
| `MonthPresenceRow` removed, no dead refs | Task 4 Step 3-4 + Task 5 Step 3 grep |
| Typecheck clean, new helper tests pass, suite green | Task 1 baseline + Tasks 2, 4, 5 |
| Direction reversal documented | Task 5 Steps 5-6-8 |
