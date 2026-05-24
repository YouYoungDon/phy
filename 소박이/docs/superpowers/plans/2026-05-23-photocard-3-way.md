# Photocard 3-Way Layout Implementation Plan (Sub-spec B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the photocard right panel so the Sobagi quote becomes the emotional hero, the `총 금액` block disappears, and records group by kind (쓴 / 들어온 / 무지출) with empty groups suppressed. Hide the photocard entry point on income-only days in both reaction and stats.

**Architecture:** Pure grouping helper extracted alongside `PhotocardRecord` into a non-React module so it can be tested without RN imports. `PhotocardView` consumes the helper, renders up to 3 conditional group sub-sections, and drops `totalBlock`. `reaction.tsx` gains a `todayHasSpending` gate around its photocard button reveal. Both callers now pass non-no_spend records (including income) so the 들어온 group can render on mixed days. The entry-point gate stays based on at-least-one-spending-record.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29.

**Spec:** `소박이/docs/superpowers/specs/2026-05-23-photocard-3-way-design.md`

**Phasing:**
1. Baseline checks (Task 1)
2. Pure helper + tests (Tasks 2–3)
3. PhotocardView refactor (Task 4)
4. Caller updates — reaction + stats (Tasks 5–6)
5. Final verification (Task 7)

**Commands used throughout** (run from `소박이/`):
- Single test file: `npx jest __tests__/<file>.test.ts`
- Full suite: `npm test`
- Typecheck: `npx tsc --noEmit`

**Working tree note:** Should be clean before starting (sub-spec A landed and pushed at `a4f4287`). If `git status` shows any `M` entries other than this plan/spec doc pair, stop and ask the human.

**Critical anti-patterns to avoid (re-read before every commit):**
- NO `수입 / 수입 총액` visible UI string anywhere; group label is **들어온** (matches existing stats.tsx wording).
- NO per-group monetary subtotal under any group label.
- NO `+` / `−` prefix on amounts; no green-vs-red coloring; no aligned columns that invite spending-vs-income mental arithmetic.
- NO new celebration animation, mood asset variant, or different reveal timing on an income-mixed photocard.
- NO quote position lift, no left panel changes, no mood resolver changes — these are explicitly deferred per spec §8.
- NO removal of the existing `(r.kind !== 'income' || r.amount > 0)` per-record amount-hide rule introduced in sub-spec A — keep it as-is.
- NO storage change; no new `STORAGE_KEYS`; no migration step.
- NO change to `recordNoSpend`, no change to `emotionEngine`, no change to dialogue pools or pebble services.

---

## Task 1: Baseline checks

**Files:** none (verification only)

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: empty output. If unrelated WIP exists, stop and surface to the human.

- [ ] **Step 2: Record baseline HEAD**

Run: `git log -1 --format='%H %s'`
Expected: `a4f4287... fix(income): close two QA deviations from sub-spec A` (or a later commit if more work landed). Note the SHA for the handoff note.

- [ ] **Step 3: Baseline test suite + typecheck**

Run:
```
npx tsc --noEmit
npm test
```
Expected: typecheck reports only the 2 pre-existing `_404.tsx` errors. Jest reports **15 suites · 243 tests · all passing**. If any new failure or new typecheck error exists, stop and surface to the human.

---

## Task 2: Extract `PhotocardRecord` type + create pure `groupByKind` helper

**Files:**
- `소박이/src/components/photocard/photocardGrouping.ts` (new)
- `소박이/src/components/photocard/PhotocardView.tsx` (modify: type import path)

- [ ] **Step 1: Create `photocardGrouping.ts`**

Place a single new file at `소박이/src/components/photocard/photocardGrouping.ts` containing:

```typescript
import { RecordKind } from '../../types';

/**
 * Runtime shape passed into PhotocardView for each line item.
 * Independent of the storage Expense shape — `category` is optional
 * because some callers (test fixtures, future surfaces) may construct
 * synthetic records without a category token. Grouping uses both
 * `kind` and `category` defensively.
 */
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
  /**
   * Optional. When omitted, the amount column always renders (legacy
   * behavior). When set to 'income' and amount is 0, the amount column
   * is hidden — preserves sub-spec A's per-record amount-hide rule.
   */
  kind?: RecordKind;
};

export interface PhotocardGroups {
  spending: PhotocardRecord[];
  income: PhotocardRecord[];
  noSpend: PhotocardRecord[];
}

/**
 * Pure. Splits records into the three photocard groups.
 *
 * Rules (mirror sub-spec B design §4.1):
 *   - 무지출: category === 'no_spend' (regardless of kind)
 *   - 들어온: kind === 'income'
 *   - 쓴:    everything else
 *
 * Records without an explicit kind fall into 쓴 (legacy in-memory data
 * predating sub-spec A normalize). This is the spec's intended fallback.
 */
export function groupByKind(records: readonly PhotocardRecord[]): PhotocardGroups {
  const spending: PhotocardRecord[] = [];
  const income: PhotocardRecord[] = [];
  const noSpend: PhotocardRecord[] = [];
  for (const r of records) {
    if (r.category === 'no_spend') {
      noSpend.push(r);
    } else if (r.kind === 'income') {
      income.push(r);
    } else {
      spending.push(r);
    }
  }
  return { spending, income, noSpend };
}
```

The file must NOT import from `react`, `react-native`, or `PhotocardView.tsx`. Only `RecordKind` from `src/types`.

- [ ] **Step 2: Update `PhotocardView.tsx` to import `PhotocardRecord` from the new module**

In `소박이/src/components/photocard/PhotocardView.tsx`:
- Delete the local `export type PhotocardRecord = { ... }` block (currently around lines 16-30).
- Add `import { PhotocardRecord, groupByKind } from './photocardGrouping';` near the existing imports.
- Re-export the type for callers that already import it from `PhotocardView`:
  ```typescript
  export type { PhotocardRecord } from './photocardGrouping';
  ```
  This keeps `stats.tsx` and `reaction.tsx` working with their current `import { PhotocardView, PhotocardRecord } from '../components/photocard/PhotocardView'` pattern. No caller-side changes for this step.

- [ ] **Step 3: Verify typecheck stays clean**

Run: `npx tsc --noEmit`
Expected: still only the 2 pre-existing `_404.tsx` errors. No new errors introduced by the type move.

- [ ] **Step 4: Commit checkpoint**

```
git add 소박이/src/components/photocard/photocardGrouping.ts \
        소박이/src/components/photocard/PhotocardView.tsx
git commit -m "refactor(photocard): extract PhotocardRecord type and groupByKind helper"
```

Commit body: one line about why the extraction (so the grouping helper is testable without RN imports).

---

## Task 3: Write `photocardGrouping.test.ts`

**Files:** `소박이/__tests__/photocardGrouping.test.ts` (new)

- [ ] **Step 1: Create the test file**

Place at `소박이/__tests__/photocardGrouping.test.ts`:

```typescript
import { groupByKind, PhotocardRecord } from '../src/components/photocard/photocardGrouping';

const r = (over: Partial<PhotocardRecord> = {}): PhotocardRecord => ({
  amount: 1000,
  ...over,
});

describe('groupByKind', () => {
  it('returns three empty arrays for empty input', () => {
    const out = groupByKind([]);
    expect(out.spending).toEqual([]);
    expect(out.income).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('routes income records by kind', () => {
    const records = [
      r({ id: '1', kind: 'income', category: 'salary' }),
      r({ id: '2', kind: 'income', category: 'bonus' }),
    ];
    const out = groupByKind(records);
    expect(out.income).toHaveLength(2);
    expect(out.spending).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('routes no_spend records by category regardless of kind', () => {
    const records = [
      r({ id: '1', kind: 'spending', category: 'no_spend', amount: 0 }),
    ];
    const out = groupByKind(records);
    expect(out.noSpend).toHaveLength(1);
    expect(out.spending).toEqual([]);
    expect(out.income).toEqual([]);
  });

  it('treats no_spend as no_spend even if kind is mistakenly income', () => {
    // Defensive: if data is malformed (income kind on a no_spend category),
    // category-based routing wins because no_spend is a category-level concept.
    const records = [r({ kind: 'income', category: 'no_spend' })];
    expect(groupByKind(records).noSpend).toHaveLength(1);
    expect(groupByKind(records).income).toEqual([]);
  });

  it('routes records without explicit kind into spending (legacy fallback)', () => {
    // Records normalized at hydration always have kind; this case covers
    // in-memory synthetic records or pre-normalize paths.
    const records = [r({ id: '1', category: 'cafe' })];
    const out = groupByKind(records);
    expect(out.spending).toHaveLength(1);
    expect(out.income).toEqual([]);
    expect(out.noSpend).toEqual([]);
  });

  it('preserves input order within each group', () => {
    const records = [
      r({ id: 'a', category: 'cafe' }),
      r({ id: 'b', kind: 'income', category: 'salary' }),
      r({ id: 'c', category: 'home_meal' }),
      r({ id: 'd', kind: 'income', category: 'bonus' }),
    ];
    const out = groupByKind(records);
    expect(out.spending.map((x) => x.id)).toEqual(['a', 'c']);
    expect(out.income.map((x) => x.id)).toEqual(['b', 'd']);
  });

  it('handles a fully mixed day (spending + income + no_spend)', () => {
    // Note: in production the no_spend gate prevents coexistence with other
    // records on the same day, but the helper itself is data-shape neutral.
    const records = [
      r({ id: '1', category: 'cafe' }),
      r({ id: '2', kind: 'income', category: 'salary' }),
      r({ id: '3', kind: 'spending', category: 'no_spend', amount: 0 }),
    ];
    const out = groupByKind(records);
    expect(out.spending).toHaveLength(1);
    expect(out.income).toHaveLength(1);
    expect(out.noSpend).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the new test**

Run: `npx jest __tests__/photocardGrouping.test.ts`
Expected: 7 tests pass.

- [ ] **Step 3: Run full suite to confirm no regression**

Run: `npm test`
Expected: 16 suites · 250 tests · all passing. (243 baseline + 7 new.)

- [ ] **Step 4: Commit checkpoint**

```
git add 소박이/__tests__/photocardGrouping.test.ts
git commit -m "test(photocard): groupByKind unit tests (7 cases)"
```

---

## Task 4: Refactor `PhotocardView` right panel

**Files:** `소박이/src/components/photocard/PhotocardView.tsx`

- [ ] **Step 1: Mark `amount` prop as deprecated in JSDoc**

In the `PhotocardViewProps` interface, change the `amount` line to:

```typescript
/**
 * @deprecated Unused after sub-spec B. The `총 금액` block was removed;
 * per-record amounts live inside `records[].amount`. Accepted for
 * backward compatibility — callers can stop passing it in a follow-up.
 */
amount: number;
```

Do not change the type itself or the destructured parameter — keep `amount` accepted so the existing callers still typecheck. The prop is simply ignored by the render path after this task.

- [ ] **Step 2: Remove the `totalBlock` render**

Locate the JSX block (currently around lines 138-147):

```tsx
{amount > 0 && (
  <>
    <View style={styles.totalBlock}>
      <Text style={styles.totalLabel}>총 금액</Text>
      <Text style={styles.totalAmount}>₩ {amount.toLocaleString('ko-KR')}</Text>
    </View>

    <View style={styles.divider} />
  </>
)}
```

Delete this entire conditional. The first `divider` (after the date header) stays — it's the visual separator between the date and the records.

- [ ] **Step 3: Replace `recordsBlock` with grouped sub-sections**

Locate the current records JSX (around lines 149-174). Replace it with a grouped render that consumes `groupByKind`. After this change, the structure should be:

```tsx
const groups = groupByKind(visibleRecords);
// (compute groups from the already-sliced visibleRecords so overflow
// stays consistent with the prior VISIBLE_RECORDS cap)
```

Wait — overflow logic interacts with grouping. Before slicing, compute groups on the full `records` array; then either:
- (a) slice each group independently and recompute overflow as `records.length - (spending + income + noSpend).length`
- (b) keep a single overflow row at the bottom listing total hidden across all groups

Choice: **(a)**. Slice each group to fit `VISIBLE_RECORDS = 3` total across all groups, in this order: spending first, then income, then noSpend. Compute overflow as `Math.max(0, records.length - shownTotal)`. This keeps the existing "+ N개 더" affordance intact and predictable.

Concrete implementation:

```tsx
const allRecords = records ?? [];
const allGroups = groupByKind(allRecords);

// Slice across groups in order: spending → income → noSpend, capped at VISIBLE_RECORDS total.
let remaining = VISIBLE_RECORDS;
const take = <T,>(arr: readonly T[]) => {
  const slice = arr.slice(0, remaining);
  remaining -= slice.length;
  return slice;
};
const shownSpending = take(allGroups.spending);
const shownIncome = take(allGroups.income);
const shownNoSpend = take(allGroups.noSpend);
const shownTotal = shownSpending.length + shownIncome.length + shownNoSpend.length;
const overflowCount = Math.max(0, allRecords.length - shownTotal);
```

Then render up to three group sections, each gated on its sliced array length:

```tsx
{(shownSpending.length > 0 || shownIncome.length > 0 || shownNoSpend.length > 0) && (
  <View style={styles.recordsBlock}>
    {shownSpending.length > 0 && (
      <View style={styles.groupSection}>
        <Text style={styles.groupLabel}>쓴 기록</Text>
        {shownSpending.map((r, idx) => renderRecordRow(r, idx))}
      </View>
    )}
    {shownIncome.length > 0 && (
      <View style={styles.groupSection}>
        <Text style={styles.groupLabel}>들어온 기록</Text>
        {shownIncome.map((r, idx) => renderRecordRow(r, idx))}
      </View>
    )}
    {shownNoSpend.length > 0 && (
      <View style={styles.groupSection}>
        <Text style={styles.groupLabel}>무지출</Text>
        {shownNoSpend.map((r, idx) => renderRecordRow(r, idx))}
      </View>
    )}
    {overflowCount > 0 && (
      <Text style={styles.overflowText}>+ {overflowCount}개 더</Text>
    )}
  </View>
)}
```

The `renderRecordRow(r, idx)` function should be an inline closure or local component that wraps the existing row JSX (icon + label · memo + kind-aware amount). Idx is used only for the leading `recordDivider` — when grouped, the divider rule should be "first row in any group has no preceding divider; subsequent rows in the same group do." Inside each group's `.map((r, idx) => ...)`, use `idx > 0` for the divider, same as before.

- [ ] **Step 4: Add the `groupSection` and `groupLabel` styles**

Inside the `styles` `StyleSheet.create({ ... })` block, add:

```typescript
groupSection: {
  marginTop: 6,
},
groupLabel: {
  fontSize: 9,
  color: TEXT_MUTED,
  letterSpacing: 0.3,
  marginBottom: 4,
  fontWeight: '500',
},
```

The 9pt muted treatment matches `weekdaySub` and `totalLabel` (which we just removed). `marginTop: 6` on the section provides quiet visual separation; `marginBottom: 4` on the label gives the label a small breathing space above the first row.

Remove the now-unused `totalBlock`, `totalLabel`, and `totalAmount` styles. (Keep `recordsBlock`, `recordDivider`, `recordRow`, `recordIcon`, `recordLine`, `recordAmount`, `overflowText` — all still used.)

- [ ] **Step 5: Run typecheck + tests**

Run:
```
npx tsc --noEmit
npm test
```
Expected: typecheck clean (still only `_404.tsx`). Jest 16 suites · 250 tests · all passing.

- [ ] **Step 6: Commit checkpoint**

```
git add 소박이/src/components/photocard/PhotocardView.tsx
git commit -m "feat(photocard): remove 총 금액 block, group records by kind"
```

Commit body: 2–3 lines on what changed (totalBlock removal, group sections, slicing rule).

---

## Task 5: Gate `reaction.tsx` photocard button on `todayHasSpending`

**Files:** `소박이/src/pages/reaction.tsx`

- [ ] **Step 1: Compute `todayHasSpending`**

In the component body, near the existing `todayExpenses` / `todaySpendingExpenses` definitions (currently around lines 110-112), add:

```typescript
const todayHasSpending = todayExpenses.some(
  (e) => e.kind !== 'income' && e.category !== 'no_spend',
);
```

Place this right after `const todayExpenses = getTodayExpenses();` and before the `todaySpendingExpenses` definition.

- [ ] **Step 2: Switch the records-source filter**

Replace the current `todaySpendingExpenses` definition (which only excludes `no_spend`) with a non-no_spend filter that still includes income, so the 들어온 group can render on mixed days:

```typescript
const photocardSourceRecords = todayExpenses.filter(
  (e) => e.category !== 'no_spend',
);
```

Where the existing code currently builds `photocardRecords`, change the source from `todaySpendingExpenses` to `photocardSourceRecords`:

```typescript
const photocardRecords: PhotocardRecord[] = photocardSourceRecords.map((e) => ({
  id: e.id,
  category: e.category,
  categoryLabel: formatCategoryLabel(e.category),
  amount: e.amount,
  memo: e.memo,
  kind: e.kind,
}));
```

The variable `todaySpendingExpenses` can be deleted if it has no other consumers (verify with a quick grep). The variable `todayTotal` is also no longer needed for the photocard `amount` prop (since `amount` is deprecated), but the `<PhotocardView amount={todayTotal} ... />` call should still pass *something* numeric for backward compat — passing `0` is fine, or keep `todayTotal` and pass it through (it's just unused). Prefer: leave `todayTotal` computed and pass it (less churn, no behavior change either way).

- [ ] **Step 3: Gate the button reveal effect on `todayHasSpending`**

Locate the `useEffect` that schedules the photocard button reveal at 1000ms (currently around lines 146-168). Wrap the button-reveal scheduling in a `todayHasSpending` check:

```typescript
useEffect(() => {
  // Auto-dismiss at 3500ms — runs regardless of whether the button appears.
  autoTimerRef.current = setTimeout(handleClose, 3500);

  if (!todayHasSpending) {
    // Income-only or no-spend-only save — no photocard handoff this session.
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }

  // Show photocard button at 1000ms and cancel the auto-dismiss
  const btnTimer = setTimeout(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setPhotocardBtnVisible(true);
    Animated.timing(photocardBtnAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, 1000);

  return () => {
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    clearTimeout(btnTimer);
  };
}, [handleClose, todayHasSpending]);
```

Key change: the auto-dismiss timer always runs, but the button-reveal timer is only scheduled when `todayHasSpending === true`. The dependency array gains `todayHasSpending`.

- [ ] **Step 4: Manual sanity check (read-only)**

Trace mentally:
- Today has spending → `todayHasSpending = true` → button schedules and reveals at 1000ms. Tap → photocard with grouped records. ✓
- Today has only income → `todayHasSpending = false` → button never shown; auto-dismiss at 3500ms returns to home. ✓
- Today has only no_spend → `todayHasSpending = false` → same as above. ✓
- Today has spending + income → `todayHasSpending = true` → button shows; tap → photocard with 쓴 + 들어온 groups. ✓

- [ ] **Step 5: Run typecheck + tests**

Run:
```
npx tsc --noEmit
npm test
```
Expected: clean. No new errors. 250/250 tests.

- [ ] **Step 6: Commit checkpoint**

```
git add 소박이/src/pages/reaction.tsx
git commit -m "feat(photocard): suppress button on income-only saves; pass full records to PhotocardView"
```

---

## Task 6: Update `stats.tsx` photocard records source

**Files:** `소박이/src/pages/stats.tsx`

- [ ] **Step 1: Switch the records source for the day photocard**

Locate the `photocardRecords` memo (around lines 250-260). Change the source from `selectedSpendingExpenses` to a new `selectedExpenses.filter((e) => e.category !== 'no_spend')` so the 들어온 group can render:

```typescript
const photocardRecords: PhotocardRecord[] = useMemo(
  () => selectedExpenses
    .filter((e) => e.category !== 'no_spend')
    .map((e) => ({
      id: e.id,
      category: e.category,
      categoryLabel: formatCategoryLabel(e.category),
      amount: e.amount,
      memo: e.memo,
      kind: e.kind,
    })),
  [selectedExpenses],
);
```

- [ ] **Step 2: Confirm entry-point gate is unchanged**

The `포토카드 생성` button gate at the current `{selectedSpendingExpenses.length > 0 && ...}` block (around line 471) **stays as-is**. This is the income-only-day-hidden invariant from spec §5.1.

Do not change this gate. If a day has no spending records, the button does not render even if income exists. This is the design decision D2 from the spec.

- [ ] **Step 3: Manual sanity check**

Trace mentally:
- Selected day has spending only → button shows; photocard renders 쓴 group only. ✓
- Selected day has income only → `selectedSpendingExpenses.length === 0` → no button. ✓
- Selected day has no_spend only → no button. ✓
- Selected day has spending + income → button shows; photocard renders 쓴 + 들어온 groups. ✓

- [ ] **Step 4: Run typecheck + tests**

Run:
```
npx tsc --noEmit
npm test
```
Expected: clean. 250/250 tests.

- [ ] **Step 5: Commit checkpoint**

```
git add 소박이/src/pages/stats.tsx
git commit -m "feat(photocard): stats day photocard renders 쓴 + 들어온 groups on mixed days"
```

---

## Task 7: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 2: Full Jest suite**

Run: `npm test`
Expected: **16 suites · 250 tests · all passing.** (15 baseline + 1 new for photocardGrouping.)

- [ ] **Step 3: Anti-pattern grep**

Run from `소박이/`:
```
grep -RnE '수입 총액|순수익|손익|net income|profit|incomeTotal|totalIncome|sumIncome|incomeSum' src
```
Expected: no matches.

Also confirm no new strings introduced:
```
grep -RnE '수입' src
```
Expected: no matches. (`들어온` is the user-facing copy; `income` is internal-only.)

- [ ] **Step 4: Manual trace — spending-only photocard unchanged shape**

Mentally trace a day with two spending records (e.g., a cafe and a 집밥):
- PhotocardView is called with `records = [cafe, home_meal]`, `amount` is now irrelevant.
- `groupByKind` returns `{ spending: [cafe, home_meal], income: [], noSpend: [] }`.
- Render: 쓴 기록 label + 2 rows. No 들어온, no 무지출 sections rendered. Quote block at the bottom unchanged.
- No `총 금액` block. The right panel reads quieter overall.

- [ ] **Step 5: Manual trace — mixed-day photocard**

Mentally trace a day with cafe + salary:
- `groupByKind` returns `{ spending: [cafe], income: [salary], noSpend: [] }`.
- Render: 쓴 기록 + cafe row, 들어온 기록 + salary row (amount hidden if 0 per sub-spec A rule). No 무지출 section. Quote at the bottom.
- No total, no subtotal, no comparison.

- [ ] **Step 6: Manual trace — income-only reaction screen**

Mentally trace recording an income on a day with no prior records:
- Reaction screen renders title + hearts + Sobagi message.
- `todayHasSpending = false`.
- Photocard button never reveals; `화면을 탭하면 홈으로` hint stays visible.
- At 3500ms, auto-dismiss returns to home. ✓

- [ ] **Step 7: Write the handoff note**

Update `소박이/docs/SOBAGI_CURRENT_STATE.md`:
- Replace the `## Latest Handoff` section with sub-spec B's landing note.
- Use the format from `AGENT_WORKFLOW.md §4`: Agent / Date / Group completed / What changed / What's now working / Fragile or surprising / Next.
- "Next" should reference sub-spec C.

Update `소박이/docs/SOBAGI_NEXT_PRIORITIES.md`:
- Strike through "Photocard 3-way redesign (sub-spec B)" line.
- Add a `Recently completed` entry with date, summary, and commit SHA list.

- [ ] **Step 8: Final commit + push**

If a docs-only commit is needed for the handoff note, add it as a separate commit:
```
git add 소박이/docs/SOBAGI_CURRENT_STATE.md 소박이/docs/SOBAGI_NEXT_PRIORITIES.md
git commit -m "docs: sub-spec B (photocard 3-way) handoff"
```

Then push:
```
git push
```

- [ ] **Step 9: Confirm push and clean working tree**

Run: `git status`
Expected: clean. `git log origin/apps-in-toss-clean..HEAD` empty.

---

## Out of scope (per spec §8)

The following are valid future work but **must not** land in sub-spec B:

- Quote position lift to the top of the right panel (full 65% rule alignment).
- Mood asset overhaul for income (sub-spec C).
- `PhotocardMoodAsset` / `weather` / `spendingLevel` interaction with income.
- Per-group typography refinement beyond the 9pt muted group label.
- Allowing the photocard to render for income-only days.
- Removal of the `amount` prop from `PhotocardView` (deprecated but kept for backcompat).

If implementation reveals a need for any of the above, surface it in the handoff note rather than expanding scope.

---

## Commit shape summary

Expected commits on this branch after the plan completes, in order:

1. `refactor(photocard): extract PhotocardRecord type and groupByKind helper`
2. `test(photocard): groupByKind unit tests (7 cases)`
3. `feat(photocard): remove 총 금액 block, group records by kind`
4. `feat(photocard): suppress button on income-only saves; pass full records to PhotocardView`
5. `feat(photocard): stats day photocard renders 쓴 + 들어온 groups on mixed days`
6. `docs: sub-spec B (photocard 3-way) handoff`

Six commits total. All small, atomic, with clear scope. Each except the last leaves the test suite green; the docs commit doesn't touch code.

If a step requires combining or splitting differently during execution, that's fine — the principle is one logical change per commit, with verification between each.
