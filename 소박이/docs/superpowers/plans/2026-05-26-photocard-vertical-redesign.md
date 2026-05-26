# Photocard Vertical Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restack `PhotocardView` from a landscape left/right split into a vertical card — mood scene banner on top, the day's record (scenes, no totals) below — bigger and more comfortable to read.

**Architecture:** One presentational component change (`PhotocardView.tsx`) that propagates to both hosts (reaction modal, stats per-day modal). First extract the record-selection logic into a pure, tested helper (`selectVisibleRecords`), then flip the container `row`→`column` with new styles and a `TOP_ASPECT` banner. The mood resolver, grouping rules, and reveal animation are untouched. New landscape assets are a separate user deliverable; the CDN pin bump is the final, blocked task.

**Tech Stack:** React Native 0.84 · React 19 · TypeScript 5.8 (`noUnusedLocals` ON — unused imports are build errors) · Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-26-photocard-vertical-redesign-design.md`

---

## File Structure

- `src/components/photocard/photocardGrouping.ts` — add pure `selectVisibleRecords(records, limit)` (groups + caps + overflow). Already owns `groupByKind`/`showsAmount`; the selection logic belongs here too.
- `__tests__/photocardGrouping.test.ts` — tests for `selectVisibleRecords`.
- `src/components/photocard/PhotocardView.tsx` — consume the helper; bump `VISIBLE_RECORDS` 3→4; flip layout `row`→`column`; new styles + `TOP_ASPECT`; remove the fixed `CARD_HEIGHT` (card sizes to content).
- `src/constants/assets.ts` — (final, blocked task) CDN pin bump once the 10 landscape assets are uploaded.

No change: `photocardMoodService.ts`, `reaction.tsx`, `stats.tsx` (both already render the card centered in a modal with edge-pinned reveal overlays).

---

## Task 1: Extract pure `selectVisibleRecords` helper

**Files:**
- Modify: `src/components/photocard/photocardGrouping.ts`
- Test: `__tests__/photocardGrouping.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `selectVisibleRecords` to the existing import at the top of `__tests__/photocardGrouping.test.ts` (it currently imports from `'../src/components/photocard/photocardGrouping'`). Then append this block:

```ts
describe('selectVisibleRecords', () => {
  const rec = (over: Partial<PhotocardRecord> = {}): PhotocardRecord => ({ amount: 1000, ...over });

  it('takes across groups spending→income→noSpend up to the limit', () => {
    const records = [
      rec({ id: 's1' }), rec({ id: 's2' }),
      rec({ id: 'i1', kind: 'income' }),
      rec({ id: 'n1', category: 'no_spend', amount: 0 }),
    ];
    const v = selectVisibleRecords(records, 4);
    expect(v.spending.map((r) => r.id)).toEqual(['s1', 's2']);
    expect(v.income.map((r) => r.id)).toEqual(['i1']);
    expect(v.noSpend.map((r) => r.id)).toEqual(['n1']);
    expect(v.overflowCount).toBe(0);
  });

  it('caps at the limit and counts the rest as overflow', () => {
    const records = [
      rec({ id: 's1' }), rec({ id: 's2' }), rec({ id: 's3' }),
      rec({ id: 'i1', kind: 'income' }), rec({ id: 'i2', kind: 'income' }),
    ];
    const v = selectVisibleRecords(records, 4);
    expect(v.spending.map((r) => r.id)).toEqual(['s1', 's2', 's3']);
    expect(v.income.map((r) => r.id)).toEqual(['i1']);
    expect(v.overflowCount).toBe(1);
  });

  it('shows everything with no overflow when limit exceeds total', () => {
    const records = [rec({ id: 's1' }), rec({ id: 'i1', kind: 'income' })];
    const v = selectVisibleRecords(records, 4);
    expect(v.overflowCount).toBe(0);
    expect(v.spending.length + v.income.length + v.noSpend.length).toBe(2);
  });

  it('returns empty groups and zero overflow for no records', () => {
    expect(selectVisibleRecords([], 4)).toEqual({
      spending: [], income: [], noSpend: [], overflowCount: 0,
    });
  });
});
```

If the existing import line is `import { groupByKind, showsAmount, PhotocardRecord } from '../src/components/photocard/photocardGrouping';`, change it to add `selectVisibleRecords`. If `PhotocardRecord` isn't already imported there, add it too (the fixtures need it).

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd 소박이 && npx jest photocardGrouping.test.ts`
Expected: FAIL — `selectVisibleRecords is not a function` (or a TS/module error that the export is missing).

- [ ] **Step 3: Implement the helper**

Append to `src/components/photocard/photocardGrouping.ts`:

```ts
export interface VisibleRecords {
  spending: PhotocardRecord[];
  income: PhotocardRecord[];
  noSpend: PhotocardRecord[];
  overflowCount: number;
}

/**
 * Pure. Groups records, then takes across groups in fixed order
 * (spending → income → noSpend) up to `limit` total rows. `overflowCount`
 * is how many records didn't make the visible cut from any group.
 */
export function selectVisibleRecords(
  records: readonly PhotocardRecord[],
  limit: number,
): VisibleRecords {
  const groups = groupByKind(records);
  let remaining = Math.max(0, limit);
  const take = (arr: readonly PhotocardRecord[]): PhotocardRecord[] => {
    const slice = arr.slice(0, remaining);
    remaining -= slice.length;
    return slice;
  };
  const spending = take(groups.spending);
  const income = take(groups.income);
  const noSpend = take(groups.noSpend);
  const shownTotal = spending.length + income.length + noSpend.length;
  const overflowCount = Math.max(0, records.length - shownTotal);
  return { spending, income, noSpend, overflowCount };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd 소박이 && npx jest photocardGrouping.test.ts`
Expected: PASS — all `selectVisibleRecords` tests green, existing `groupByKind`/`showsAmount` tests still green.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/components/photocard/photocardGrouping.ts 소박이/__tests__/photocardGrouping.test.ts
git commit -m "refactor(photocard): extract pure selectVisibleRecords helper"
```

---

## Task 2: Wire PhotocardView to the helper, bump cap to 4

**Files:**
- Modify: `src/components/photocard/PhotocardView.tsx`

This task is behavior-preserving except the visible-records cap (3→4). The layout stays landscape; the next task flips it.

- [ ] **Step 1: Update the import**

In `src/components/photocard/PhotocardView.tsx`, the current import is:

```ts
import { PhotocardRecord, groupByKind, showsAmount } from './photocardGrouping';
```

Change it to (drop `groupByKind` — it becomes unused after Step 3, and `noUnusedLocals` makes that a build error; add `selectVisibleRecords`):

```ts
import { PhotocardRecord, selectVisibleRecords, showsAmount } from './photocardGrouping';
```

- [ ] **Step 2: Bump the cap**

Change `const VISIBLE_RECORDS = 3;` to:

```ts
const VISIBLE_RECORDS = 4;
```

- [ ] **Step 3: Replace the inline selection block**

Replace this block (currently right after `const assetUri = ...`):

```ts
  // Group records by kind first, then slice across groups in order
  // (spending → income → noSpend) capped at VISIBLE_RECORDS total. Overflow
  // counts records that didn't make the visible cut from any group.
  const allRecords = records ?? [];
  const allGroups = groupByKind(allRecords);
  let remaining = VISIBLE_RECORDS;
  const take = <T,>(arr: readonly T[]): T[] => {
    const slice = arr.slice(0, Math.max(0, remaining));
    remaining -= slice.length;
    return slice;
  };
  const shownSpending = take(allGroups.spending);
  const shownIncome = take(allGroups.income);
  const shownNoSpend = take(allGroups.noSpend);
  const shownTotal = shownSpending.length + shownIncome.length + shownNoSpend.length;
  const overflowCount = Math.max(0, allRecords.length - shownTotal);
```

with:

```ts
  // Group + cap + overflow now live in the pure selectVisibleRecords helper.
  const {
    spending: shownSpending,
    income: shownIncome,
    noSpend: shownNoSpend,
    overflowCount,
  } = selectVisibleRecords(records ?? [], VISIBLE_RECORDS);
  const shownTotal = shownSpending.length + shownIncome.length + shownNoSpend.length;
```

- [ ] **Step 4: Verify typecheck + tests**

Run: `cd 소박이 && npx tsc --noEmit`
Expected: exit 0, no errors (confirms `groupByKind` is no longer referenced and nothing else broke).

Run: `cd 소박이 && npx jest`
Expected: all suites green.

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/components/photocard/PhotocardView.tsx
git commit -m "refactor(photocard): use selectVisibleRecords, raise cap to 4"
```

---

## Task 3: Flip the layout to vertical (mood banner on top, record below)

**Files:**
- Modify: `src/components/photocard/PhotocardView.tsx`

Presentational change. No new logic; verification is typecheck + existing suite + manual visual.

- [ ] **Step 1: Replace the dimension constants**

Replace:

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - 48;
export const CARD_HEIGHT = Math.round(CARD_WIDTH * 0.667);
```

with (card now sizes to content; the top banner is a fixed 3:2 height):

```ts
const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const CARD_WIDTH = SCREEN_WIDTH - 48;
// Top mood banner aspect — 3:2 landscape. Single knob for framing the art.
const TOP_ASPECT = 0.667;
const TOP_IMAGE_HEIGHT = Math.round(CARD_WIDTH * TOP_ASPECT);
```

(`CARD_HEIGHT` is removed — it had no external consumers and the vertical card sizes to its content.)

- [ ] **Step 2: Replace the JSX return body**

Replace the entire `return ( ... );` block (the `<View style={styles.card}>` … `</View>` tree) with:

```tsx
  return (
    <View style={styles.card}>
      {/* TOP — mood scene banner, full width. Image fills via cover; tiny time
          badge sits top-right if provided. */}
      <View style={styles.topPanel}>
        <Image source={{ uri: assetUri }} style={styles.topImage} resizeMode="cover" />
        {timeLabel ? (
          <View style={styles.timeBadge} pointerEvents="none">
            <Text style={styles.timeBadgeText}>{timeLabel}</Text>
          </View>
        ) : null}
      </View>

      {/* BOTTOM — the day's record on cream paper. */}
      <View style={styles.bottomPanel}>
        <View style={styles.headerBlock}>
          <Text style={styles.dateHeader}>{dateStr}</Text>
          {weekdayLabel ? (
            <Text style={styles.weekdaySub}>{weekdayLabel} · 오늘의 기록</Text>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* Records grouped by kind. Group labels are quiet separators, not
            section titles. No per-group subtotals; no aggregate total block —
            the Sobagi quote carries the emotional weight. */}
        {shownTotal > 0 && (
          <View style={styles.recordsBlock}>
            {shownSpending.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupLabel}>쓴 기록</Text>
                {shownSpending.map(renderRecordRow)}
              </View>
            )}
            {shownIncome.length > 0 && (
              <View style={styles.groupSection}>
                <Text style={styles.groupLabel}>들어온 기록</Text>
                {shownIncome.map(renderRecordRow)}
              </View>
            )}
            {shownNoSpend.length > 0 && (
              // No group label: the 🌿 무지출 row is self-describing and never
              // coexists with 쓴/들어온 groups (callers pass it alone).
              <View style={styles.groupSection}>
                {shownNoSpend.map(renderRecordRow)}
              </View>
            )}
            {overflowCount > 0 && (
              <Text style={styles.overflowText}>+ {overflowCount}개 더</Text>
            )}
          </View>
        )}

        <View style={styles.noteBlock}>
          <Text style={styles.noteHeading}>🌱 오늘의 한 줄</Text>
          <Animated.View style={{ opacity: quoteOpacity }}>
            <Text style={styles.noteText}>{displayQuote}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
```

(Note: `renderRecordRow` is unchanged — it still keeps `recordLine` at `numberOfLines={1}`, so long memos ellipsize cleanly.)

- [ ] **Step 3: Replace the StyleSheet**

Replace the entire `const styles = StyleSheet.create({ ... });` block with the following. The colors/badge are preserved; `row`/`leftPanel`/`leftImage`/`rightPanel`/`spacer` are gone (replaced by `topPanel`/`topImage`/`bottomPanel`); fonts and spacing are bumped up for the roomier full-width vertical card (this is the "더 크게, 더 편안하게" win):

```ts
const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: PAPER_BG,
  },

  // ─── Top — full-width mood banner, fixed 3:2 height ─────────────────────────
  topPanel: {
    width: '100%',
    height: TOP_IMAGE_HEIGHT,
    overflow: 'hidden',
    backgroundColor: PAPER_BG_SOFT,
  },
  topImage: {
    width: '100%',
    height: '100%',
  },
  timeBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(250, 246, 238, 0.82)',
  },
  timeBadgeText: {
    fontSize: 10,
    color: TEXT_DARK,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ─── Bottom — the day's record, full width ──────────────────────────────────
  bottomPanel: {
    backgroundColor: PAPER_BG,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
  },
  headerBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: TEXT_DARK,
    letterSpacing: 0.4,
  },
  weekdaySub: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
  },
  divider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 10,
  },
  recordsBlock: {
    gap: 0,
  },
  groupSection: {
    marginTop: 10,
  },
  groupLabel: {
    fontSize: 11,
    color: TEXT_MUTED,
    letterSpacing: 0.3,
    marginBottom: 6,
    fontWeight: '500',
  },
  recordDivider: {
    height: 1,
    backgroundColor: DIVIDER,
    marginVertical: 7,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordIcon: {
    fontSize: 15,
    width: 20,
    textAlign: 'center',
  },
  recordLine: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  recordAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: TEXT_DARK,
    letterSpacing: 0.2,
  },
  overflowText: {
    fontSize: 11,
    color: TEXT_MUTED,
    marginTop: 8,
    textAlign: 'right',
  },
  noteBlock: {
    backgroundColor: PAPER_BG_SOFT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
  },
  noteHeading: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  noteText: {
    fontSize: 14,
    color: TEXT_DARK,
    lineHeight: 19,
    letterSpacing: 0.2,
  },
});
```

- [ ] **Step 4: Verify typecheck + tests**

Run: `cd 소박이 && npx tsc --noEmit`
Expected: exit 0. (If it reports an unused `CARD_HEIGHT` or a missing style, fix per the messages — all referenced styles above are defined.)

Run: `cd 소박이 && npx jest`
Expected: all suites green (presentational change; logic tests unaffected).

- [ ] **Step 5: Commit**

```bash
git add 소박이/src/components/photocard/PhotocardView.tsx
git commit -m "feat(photocard): vertical layout - mood banner on top, record below"
```

---

## Task 4: Verify in both hosts + final checks

**Files:** none (verification only; commit only if a tweak is needed).

- [ ] **Step 1: Manual visual check — reaction modal**

In the running app (`npm run dev`), save a record with spending to reach the reaction screen, tap `포토카드 생성`, and confirm:
- The card is vertical: mood banner on top, date + records + 🌱 quote below.
- The card is centered and fully on-screen; its top does not collide with the `✕` close hint (top:52/right:20).
- A long memo ellipsizes on one line (no wrap/overflow).

- [ ] **Step 2: Manual visual check — stats per-day modal**

Open Stats, tap a day with records to open the per-day photocard. Confirm the same vertical layout renders, and check the three content shapes:
- a **mixed** day (spending + income): both 쓴 기록 / 들어온 기록 groups show.
- an **income-only** day is filtered upstream (never reaches the card) — confirm no regression.
- a **no-spend** day: the 🌿 무지출 row shows with no group label.

- [ ] **Step 3: Full verification**

Run: `cd 소박이 && npx tsc --noEmit` → exit 0
Run: `cd 소박이 && npx jest` → all suites green
Run anti-pattern grep (no banned finance/reward vocabulary introduced):

Use Grep on `소박이/src/components/photocard/` for: `수입|수익|보상|축하|벌었|입금|잔액|통장|저축|잘했|대단|성공|완료|화이팅|파이팅|순수익|차액`
Expected: no matches.

- [ ] **Step 4: Commit any tweaks**

If Steps 1–2 required spacing/size adjustments:

```bash
git add 소박이/src/components/photocard/PhotocardView.tsx
git commit -m "polish(photocard): vertical layout spacing tweaks from device check"
```

If no tweaks were needed, skip this step.

---

## Task 5: CDN pin bump for landscape assets (BLOCKED on asset deliverable)

**Do not start until the user has uploaded the 10 new landscape (~3:2) photocard scenes** to the `sobaki` repo `assets/` folder. Until then, the banner shows a cropped band of the current portrait asset — expected and acceptable on the dev branch.

**Files:**
- Modify: `src/constants/assets.ts`

- [ ] **Step 1: Bump the CDN pin**

In `src/constants/assets.ts`, update the `CDN` constant's commit SHA to the new commit that contains the landscape `pothocard_*.png` uploads:

```ts
const CDN = 'https://cdn.jsdelivr.net/gh/YouYoungDon/sobaki@<NEW_SHA>/assets';
```

Replace `<NEW_SHA>` with the full commit SHA the user provides after uploading. No other change — `PHOTOCARD_MOOD_URIS` filenames and `getPhotocardMoodAsset` are unchanged.

- [ ] **Step 2: Verify the new assets load**

Run: `cd 소박이 && npx tsc --noEmit` → exit 0
In the app, open a photocard and confirm the banner now shows the landscape scene framed correctly (Sobagi in frame, no hard crop).

- [ ] **Step 3: Commit**

```bash
git add 소박이/src/constants/assets.ts
git commit -m "chore(assets): bump CDN pin to landscape photocard scenes"
```

---

## Notes for the executor

- **TypeScript is strict:** `noUnusedLocals` is ON — an unused import (e.g. leaving `groupByKind` in Task 2) is a build **error** (exit 2), not a warning. Remove imports as they become orphaned.
- **PowerShell here-strings break on inner double-quotes** — the commit messages above use single-line `-m` with no `"` inside, intentionally. Keep it that way.
- **`jest` exit 255** with an early stream cutoff (e.g. `| head`) is a broken-pipe artifact, not a failure — re-run without the cutoff to confirm green.
- **Do not** add income totals, income breakdowns, category spending tables, finance drill-downs, or a camera/capture button — all out of scope per the spec and locked philosophy.
