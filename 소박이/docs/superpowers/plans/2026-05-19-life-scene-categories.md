# Life-Scene Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5-bucket accounting taxonomy with 12 life-scene categories (+ `no_spend` daily-presence marker), migrating existing records and updating downstream consumers (dayFeeling buckets, picker UI, label maps).

**Architecture:** Add new tokens to `ExpenseCategory` union additively first so the codebase stays compilable through the migration. Introduce one source of truth (`src/constants/categories.ts`) and a pure migration module. Wire migration into app init. Land legacy-token removal as the final cleanup task.

**Tech Stack:** TypeScript (strict, `noUncheckedIndexedAccess`), React Native 0.84, Jest 29, Zustand 5, AsyncStorage via `storageService`.

**Spec:** `docs/superpowers/specs/2026-05-19-life-scene-categories-design.md`

---

## File Structure

**Create:**
- `src/constants/categories.ts` — single source of truth for category metadata (key/label/emoji/inPicker), `CATEGORIES`, `CATEGORY_BY_TOKEN`, `PICKER_CATEGORIES`.
- `src/services/expenseMigration.ts` — pure `migrateExpenseCategories(expenses)` + IO wrapper `runExpenseCategoryMigration()`.
- `__tests__/expenseMigration.test.ts` — pure-function coverage of the legacy → new mapping.
- `__tests__/dayFeelingService.test.ts` — per-bucket coverage under the new taxonomy.

**Modify:**
- `src/types/index.ts` — `ExpenseCategory` union (additive in Task 1, cleanup in Task 7).
- `src/constants/storage.ts` — add `CATEGORY_MIGRATION_DONE` key.
- `src/components/expense/CategorySelector.tsx` — read picker list from `categories.ts`.
- `src/components/expense/ExpenseCard.tsx` — drop local label map.
- `src/pages/reaction.tsx` — drop local label map.
- `src/pages/stats.tsx` — drop local label maps; edit-picker iterates `PICKER_CATEGORIES` so it excludes `no_spend`.
- `src/services/dayFeelingService.ts` — bucket-trigger logic + `buildObservations` keys.
- `src/hooks/useAppInit.ts` — invoke `runExpenseCategoryMigration()` before storage hydrate.
- `docs/SOBAGI_CURRENT_STATE.md`, `docs/SOBAGI_NEXT_PRIORITIES.md` — handoff notes.

**Unchanged:** `roomPresenceService.ts`, `bagItems.ts`, `foundItemService.ts`, `expenseService.ts`, `record.tsx` (default `'cafe'` token survives).

---

## Task 1: Add new tokens additively + create `categories.ts`

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/constants/categories.ts`

- [ ] **Step 1: Extend `ExpenseCategory` union with new tokens (legacy kept temporarily)**

Edit `src/types/index.ts`. Replace the `ExpenseCategory` line:

```ts
export type ExpenseCategory =
  // life-scene tokens (final)
  | 'cafe'
  | 'home_meal'
  | 'dining_out'
  | 'transport'
  | 'living'
  | 'gift'
  | 'hobby'
  | 'pet'
  | 'travel'
  | 'health'
  | 'event'
  | 'allowance'
  | 'no_spend'
  // legacy tokens — removed in Task 7 after migration + consumer updates land
  | 'food'
  | 'shopping'
  | 'other';
```

- [ ] **Step 2: Create `src/constants/categories.ts`**

```ts
import { ExpenseCategory } from '../types';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
}

export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  { key: 'cafe',       label: '카페',     emoji: '☕',  inPicker: true },
  { key: 'home_meal',  label: '집밥',     emoji: '🍚',  inPicker: true },
  { key: 'dining_out', label: '외식',     emoji: '🍽️', inPicker: true },
  { key: 'transport',  label: '이동',     emoji: '🚌',  inPicker: true },
  { key: 'living',     label: '생활',     emoji: '🏠',  inPicker: true },
  { key: 'hobby',      label: '취미',     emoji: '🎀',  inPicker: true },
  { key: 'gift',       label: '선물',     emoji: '🎁',  inPicker: true },
  { key: 'pet',        label: '반려동물', emoji: '🐾',  inPicker: true },
  { key: 'travel',     label: '여행',     emoji: '✈️', inPicker: true },
  { key: 'health',     label: '병원',     emoji: '💊',  inPicker: true },
  { key: 'event',      label: '경조사',   emoji: '💌',  inPicker: true },
  { key: 'allowance',  label: '용돈',     emoji: '🫶',  inPicker: true },
  { key: 'no_spend',   label: '무지출',   emoji: '🌿',  inPicker: false },
] as const;

export const CATEGORY_BY_TOKEN: Record<ExpenseCategory, ExpenseCategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<ExpenseCategory, ExpenseCategoryMeta>;

export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.inPicker);

/**
 * "☕ 카페" — emoji-prefixed full label for in-list rendering (history card,
 * stats records list, monthly top line). Falls back to the raw token when an
 * unknown category sneaks through (shouldn't happen post-migration, but
 * stays defensive).
 */
export function formatCategoryWithEmoji(token: ExpenseCategory): string {
  const meta = CATEGORY_BY_TOKEN[token];
  return meta ? `${meta.emoji} ${meta.label}` : token;
}

/**
 * "카페" — bare label for the photocard records block where the design
 * already supplies its own visual context.
 */
export function formatCategoryLabel(token: ExpenseCategory): string {
  return CATEGORY_BY_TOKEN[token]?.label ?? token;
}
```

Note: legacy tokens (`food`, `shopping`, `other`) are deliberately absent from `CATEGORIES`. That means `CATEGORY_BY_TOKEN['food']` is `undefined` at runtime — consumers updated in Tasks 3–4 will resolve via the new tokens once migration has run. During this brief window, any unreachable legacy lookup falls back to the existing `?? e.category` patterns in consumer code.

- [ ] **Step 3: Typecheck**

Run from `소박이/`:

```bash
npx tsc --noEmit 2>&1 | grep -v "_404.tsx" | head -20
```

Expected: empty output (no new errors). The pre-existing `_404.tsx` errors remain and are filtered out.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/constants/categories.ts
git commit -m "feat: add life-scene category tokens + shared categories module"
```

---

## Task 2: Migration service + tests

**Files:**
- Create: `src/services/expenseMigration.ts`
- Create: `__tests__/expenseMigration.test.ts`
- Modify: `src/constants/storage.ts`

- [ ] **Step 1: Add the migration-done storage key**

Edit `src/constants/storage.ts`. Inside the `STORAGE_KEYS` object, add one new entry just before the closing brace:

```ts
  PENDING_PLACEMENT: 'sobagi-pending-placement',
  CATEGORY_MIGRATION_DONE: 'sobagi-category-migration-done',
} as const;
```

- [ ] **Step 2: Write failing tests**

Create `__tests__/expenseMigration.test.ts`:

```ts
import { migrateExpenseCategories } from '../src/services/expenseMigration';
import { Expense } from '../src/types';

// Build a fixture expense whose `category` may be a *legacy* token.
// We cast through `unknown` so this stays compilable after Task 7 removes
// legacy tokens from the ExpenseCategory union.
const legacy = (overrides: { id: string; amount: number; createdAt: string; category: string }): Expense =>
  ({ sobagiEmotion: 'happy', ...overrides }) as unknown as Expense;

const newToken = (overrides: { id: string; amount: number; createdAt: string; category: Expense['category'] }): Expense =>
  ({ sobagiEmotion: 'happy', ...overrides });

describe('migrateExpenseCategories', () => {
  it('returns the same array reference when nothing needs migration', () => {
    const input: Expense[] = [
      newToken({ id: '1', amount: 4000, createdAt: '2026-05-17T10:00:00', category: 'cafe' }),
      newToken({ id: '2', amount: 9000, createdAt: '2026-05-18T10:00:00', category: 'home_meal' }),
    ];
    expect(migrateExpenseCategories(input)).toBe(input);
  });

  it('returns an empty array unchanged', () => {
    const input: Expense[] = [];
    expect(migrateExpenseCategories(input)).toBe(input);
  });

  it('maps legacy food → dining_out', () => {
    const input = [legacy({ id: '1', amount: 12000, createdAt: '2026-05-10T10:00:00', category: 'food' })];
    const out = migrateExpenseCategories(input);
    expect(out[0]!.category).toBe('dining_out');
  });

  it('maps legacy shopping → living', () => {
    const input = [legacy({ id: '1', amount: 22000, createdAt: '2026-05-10T10:00:00', category: 'shopping' })];
    expect(migrateExpenseCategories(input)[0]!.category).toBe('living');
  });

  it('maps legacy other → living', () => {
    const input = [legacy({ id: '1', amount: 5000, createdAt: '2026-05-10T10:00:00', category: 'other' })];
    expect(migrateExpenseCategories(input)[0]!.category).toBe('living');
  });

  it('leaves cafe / transport / no_spend untouched', () => {
    const input: Expense[] = [
      newToken({ id: '1', amount: 4000, createdAt: '2026-05-10T10:00:00', category: 'cafe' }),
      newToken({ id: '2', amount: 1500, createdAt: '2026-05-11T10:00:00', category: 'transport' }),
      newToken({ id: '3', amount: 0,    createdAt: '2026-05-12T10:00:00', category: 'no_spend' }),
    ];
    const out = migrateExpenseCategories(input);
    expect(out.map((e) => e.category)).toEqual(['cafe', 'transport', 'no_spend']);
  });

  it('migrates a mixed array and preserves order', () => {
    const input: Expense[] = [
      legacy({ id: '1', amount: 4000,  createdAt: '2026-05-10T10:00:00', category: 'food' }),
      newToken({ id: '2', amount: 1500, createdAt: '2026-05-11T10:00:00', category: 'cafe' }),
      legacy({ id: '3', amount: 22000, createdAt: '2026-05-12T10:00:00', category: 'shopping' }),
      legacy({ id: '4', amount: 5000,  createdAt: '2026-05-13T10:00:00', category: 'other' }),
    ];
    expect(migrateExpenseCategories(input).map((e) => e.category))
      .toEqual(['dining_out', 'cafe', 'living', 'living']);
  });

  it('is idempotent — running twice equals running once', () => {
    const input: Expense[] = [
      legacy({ id: '1', amount: 4000, createdAt: '2026-05-10T10:00:00', category: 'food' }),
      legacy({ id: '2', amount: 9000, createdAt: '2026-05-11T10:00:00', category: 'shopping' }),
    ];
    const once = migrateExpenseCategories(input);
    const twice = migrateExpenseCategories(once);
    expect(twice).toBe(once);
    expect(twice.map((e) => e.category)).toEqual(['dining_out', 'living']);
  });

  it('preserves non-category fields on migrated records', () => {
    const input = [legacy({
      id: 'abc', amount: 7777, createdAt: '2026-05-10T10:00:00', category: 'food',
    })];
    const out = migrateExpenseCategories(input)[0]!;
    expect(out.id).toBe('abc');
    expect(out.amount).toBe(7777);
    expect(out.createdAt).toBe('2026-05-10T10:00:00');
    expect(out.sobagiEmotion).toBe('happy');
  });
});
```

- [ ] **Step 3: Run failing tests**

```bash
npx jest __tests__/expenseMigration.test.ts
```

Expected: FAIL with "Cannot find module '../src/services/expenseMigration'".

- [ ] **Step 4: Implement the migration service**

Create `src/services/expenseMigration.ts`:

```ts
import { Expense, ExpenseCategory } from '../types';
import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';

// Legacy tokens that may still exist in stored Expense records. Mapped to
// the closest life-scene token. See spec:
// docs/superpowers/specs/2026-05-19-life-scene-categories-design.md
const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  food: 'dining_out',
  shopping: 'living',
  other: 'living',
};

/**
 * Pure. Returns a new array (with remapped categories) when any record is
 * legacy-tagged, otherwise returns the input by reference. Idempotent.
 */
export function migrateExpenseCategories(expenses: Expense[]): Expense[] {
  let changed = false;
  const next = expenses.map((e) => {
    const remapped = LEGACY_CATEGORY_MAP[e.category as string];
    if (remapped !== undefined) {
      changed = true;
      return { ...e, category: remapped };
    }
    return e;
  });
  return changed ? next : expenses;
}

/**
 * Runs migration once per install. Idempotent — safe to call repeatedly.
 * Awaits before any consumer reads STORAGE_KEYS.EXPENSES.
 */
export async function runExpenseCategoryMigration(): Promise<void> {
  const done = await storageService.load<boolean>(STORAGE_KEYS.CATEGORY_MIGRATION_DONE);
  if (done === true) return;

  const expenses = await storageService.load<Expense[]>(STORAGE_KEYS.EXPENSES);
  if (expenses && expenses.length > 0) {
    const migrated = migrateExpenseCategories(expenses);
    if (migrated !== expenses) {
      await storageService.save(STORAGE_KEYS.EXPENSES, migrated);
    }
  }
  await storageService.save(STORAGE_KEYS.CATEGORY_MIGRATION_DONE, true);
}
```

- [ ] **Step 5: Verify tests pass**

```bash
npx jest __tests__/expenseMigration.test.ts
```

Expected: 9 tests passed.

- [ ] **Step 6: Commit**

```bash
git add src/constants/storage.ts src/services/expenseMigration.ts __tests__/expenseMigration.test.ts
git commit -m "feat: expense category migration service + tests"
```

---

## Task 3: Update `CategorySelector` to use `PICKER_CATEGORIES`

**Files:**
- Modify: `src/components/expense/CategorySelector.tsx`

- [ ] **Step 1: Replace the hardcoded list with the shared module**

Rewrite `src/components/expense/CategorySelector.tsx`:

```tsx
import React from 'react';
import { Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { PICKER_CATEGORIES } from '../../constants/categories';
import { COLORS } from '../../constants/colors';

interface CategorySelectorProps {
  selected: ExpenseCategory;
  onSelect: (category: ExpenseCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {PICKER_CATEGORIES.map((c) => (
        <Pressable
          key={c.key}
          style={[styles.chip, selected === c.key && styles.chipSelected]}
          onPress={() => onSelect(c.key)}
        >
          <Text style={styles.emoji}>{c.emoji}</Text>
          <Text style={[styles.label, selected === c.key && styles.labelSelected]}>
            {c.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.oliveGreen,
    borderColor: COLORS.oliveDark,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelSelected: {
    color: '#fff',
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v "_404.tsx" | head -10
```

Expected: empty output.

- [ ] **Step 3: Commit**

```bash
git add src/components/expense/CategorySelector.tsx
git commit -m "refactor: CategorySelector reads from shared categories module"
```

---

## Task 4: Consolidate `CATEGORY_LABELS` in consumers

**Files:**
- Modify: `src/components/expense/ExpenseCard.tsx`
- Modify: `src/pages/reaction.tsx`
- Modify: `src/pages/stats.tsx`

- [ ] **Step 1: Update `ExpenseCard.tsx`**

In `src/components/expense/ExpenseCard.tsx`:

Replace the import block (lines 1–4) and the local `CATEGORY_LABELS` constant (lines 6–13) with:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Expense } from '../../types';
import { COLORS } from '../../constants/colors';
import { formatCategoryWithEmoji } from '../../constants/categories';
```

Then change the render line that uses `CATEGORY_LABELS`:

```tsx
// before
<Text style={styles.category}>{CATEGORY_LABELS[expense.category]}</Text>

// after
<Text style={styles.category}>{formatCategoryWithEmoji(expense.category)}</Text>
```

- [ ] **Step 2: Update `reaction.tsx`**

In `src/pages/reaction.tsx`:

Remove the local `CATEGORY_LABELS` constant (the `const CATEGORY_LABELS: Record<string, string> = { … };` block around line 19–26).

Add to the imports near the top:

```tsx
import { formatCategoryLabel } from '../constants/categories';
```

Replace the usage near line 128:

```tsx
// before
categoryLabel: CATEGORY_LABELS[e.category] ?? e.category,

// after
categoryLabel: formatCategoryLabel(e.category),
```

- [ ] **Step 3: Update `stats.tsx`**

In `src/pages/stats.tsx`:

Remove both local maps — `CATEGORY_LABELS` (around line 19–26) and `PHOTOCARD_CATEGORY_LABELS` (around line 28–34).

Add to imports near the top:

```tsx
import { PICKER_CATEGORIES, formatCategoryWithEmoji, formatCategoryLabel } from '../constants/categories';
```

Replace the three usage sites:

```tsx
// 1) records list rendering — was:
//    <Text style={styles.recordCategory}>{CATEGORY_LABELS[e.category]}</Text>
// becomes:
<Text style={styles.recordCategory}>{formatCategoryWithEmoji(e.category)}</Text>

// 2) photocard records — was:
//    categoryLabel: PHOTOCARD_CATEGORY_LABELS[e.category] ?? e.category,
// becomes:
categoryLabel: formatCategoryLabel(e.category),

// 3) "이번 달은 X이 제일 많았어요" line — was:
//    이번 달은 {CATEGORY_LABELS[topCategoryThisMonth]}이 제일 많았어요
// becomes:
이번 달은 {formatCategoryWithEmoji(topCategoryThisMonth)}이 제일 많았어요
```

Note: this standardizes the records-list and monthly-top format to "emoji label" (matching the history card), where the previous stats list used "label emoji". This is an intentional small unification — both directions read fine and one shared helper is worth more than the layout preference.

For the edit picker (around line 543), replace the iteration. The edit picker must exclude `no_spend` (editing converts records — you can't switch a real expense into a no-spend marker):

```tsx
// before
{(Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((cat) => (
  <Pressable
    key={cat}
    style={[styles.editCatPill, editCategory === cat && styles.editCatPillActive]}
    onPress={() => setEditCategory(cat)}
  >
    <Text style={[styles.editCatPillText, editCategory === cat && styles.editCatPillTextActive]}>
      {CATEGORY_LABELS[cat]}
    </Text>
  </Pressable>
))}

// after
{PICKER_CATEGORIES.map((c) => (
  <Pressable
    key={c.key}
    style={[styles.editCatPill, editCategory === c.key && styles.editCatPillActive]}
    onPress={() => setEditCategory(c.key)}
  >
    <Text style={[styles.editCatPillText, editCategory === c.key && styles.editCatPillTextActive]}>
      {c.label} {c.emoji}
    </Text>
  </Pressable>
))}
```

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v "_404.tsx" | head -20
```

Expected: empty output.

- [ ] **Step 5: Commit**

```bash
git add src/components/expense/ExpenseCard.tsx src/pages/reaction.tsx src/pages/stats.tsx
git commit -m "refactor: consume shared categories module in card / reaction / stats"
```

---

## Task 5: Update `dayFeelingService` bucket logic + tests

**Files:**
- Modify: `src/services/dayFeelingService.ts`
- Create: `__tests__/dayFeelingService.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/dayFeelingService.test.ts`:

```ts
import { getDayFeeling } from '../src/services/dayFeelingService';
import { Expense } from '../src/types';

const make = (overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'category'>): Expense => ({
  createdAt: '2026-05-19T10:00:00',
  sobagiEmotion: 'happy',
  ...overrides,
});

describe('getDayFeeling — empty', () => {
  it('returns quiet for empty expenses', () => {
    expect(getDayFeeling([], '2026-05-19').type).toBe('quiet');
  });
});

describe('getDayFeeling — hard override', () => {
  it('returns hard when any record has 😔', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5000, category: 'cafe', userEmotion: '😔' })],
      '2026-05-19',
    );
    expect(r.type).toBe('hard');
  });

  it('returns hard when any record has 😤', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5000, category: 'cafe', userEmotion: '😤' })],
      '2026-05-19',
    );
    expect(r.type).toBe('hard');
  });
});

describe('getDayFeeling — caffeinated', () => {
  it('returns caffeinated when cafe count ≥ 2', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500, category: 'cafe' }),
        make({ id: '2', amount: 4500, category: 'cafe' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('caffeinated');
  });
});

describe('getDayFeeling — warm', () => {
  it('returns warm when home_meal + dining_out ≥ 2', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 9000,  category: 'home_meal' }),
        make({ id: '2', amount: 11000, category: 'dining_out' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });

  it('returns warm for cafe + home_meal combo', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500, category: 'cafe' }),
        make({ id: '2', amount: 9000, category: 'home_meal' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });

  it('returns warm for cafe + dining_out combo', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 4500,  category: 'cafe' }),
        make({ id: '2', amount: 11000, category: 'dining_out' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('warm');
  });
});

describe('getDayFeeling — sweet', () => {
  it('returns sweet for a small cafe purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 4500, category: 'cafe' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });

  it('returns sweet for a small home_meal purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5500, category: 'home_meal' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });

  it('returns sweet for a small dining_out purchase', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 5500, category: 'dining_out' })],
      '2026-05-19',
    );
    expect(r.type).toBe('sweet');
  });
});

describe('getDayFeeling — selfcare', () => {
  it('returns selfcare when hobby is present and no earlier bucket fires', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 25000, category: 'hobby' })],
      '2026-05-19',
    );
    expect(r.type).toBe('selfcare');
  });
});

describe('getDayFeeling — active', () => {
  it('returns active when transport + ≥3 distinct categories', () => {
    const r = getDayFeeling(
      [
        make({ id: '1', amount: 2500,  category: 'transport' }),
        make({ id: '2', amount: 12000, category: 'dining_out' }),
        make({ id: '3', amount: 18000, category: 'living' }),
      ],
      '2026-05-19',
    );
    expect(r.type).toBe('active');
  });
});

describe('getDayFeeling — quiet', () => {
  it('returns quiet when total < 8000 and no earlier bucket fires', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 7500, category: 'transport' })],
      '2026-05-19',
    );
    expect(r.type).toBe('quiet');
  });
});

describe('getDayFeeling — modest', () => {
  it('returns modest as fallback for an ordinary day', () => {
    const r = getDayFeeling(
      [make({ id: '1', amount: 25000, category: 'living' })],
      '2026-05-19',
    );
    expect(r.type).toBe('modest');
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
npx jest __tests__/dayFeelingService.test.ts
```

Expected: most cases fail (e.g. warm/sweet/selfcare assertions don't match old logic).

- [ ] **Step 3: Update `dayFeelingService.ts` bucket logic**

Edit `src/services/dayFeelingService.ts`. Replace the body of `getDayFeeling` (from the `if (expenses.length === 0)` line through the closing brace) plus the `buildObservations` helper.

New `buildObservations` (replace existing function body):

```ts
function buildObservations(expenses: Expense[], dominant: DayFeelingType): string[] {
  const cats = expenses.map((e) => e.category);
  const cafeCount = cats.filter((c) => c === 'cafe').length;
  const mealCount = cats.filter((c) => c === 'home_meal' || c === 'dining_out').length;
  const obs: string[] = [];

  if (dominant !== 'caffeinated' && cafeCount > 0) {
    obs.push(cafeCount >= 2 ? '카페를 두 번 들렀어요 ☕' : '카페를 들렀어요 ☕');
  }
  if (dominant !== 'warm' && mealCount > 0) {
    obs.push(mealCount >= 2 ? '따뜻한 음식을 두 번 먹었어요 🍚' : '따뜻한 음식도 먹었네요 🍲');
  }
  if (cats.includes('transport') && dominant !== 'active') {
    obs.push('잠깐 이동도 했어요 🚌');
  }
  if (cats.includes('hobby') && dominant !== 'selfcare') {
    obs.push('좋아하는 일에 시간을 썼어요 🎀');
  }

  return obs.slice(0, 2);
}
```

New `getDayFeeling` body — replace from `if (expenses.length === 0)` through the end of the function:

```ts
  if (expenses.length === 0) return make('quiet', []);

  const cats = expenses.map((e) => e.category);
  const emotions = expenses.flatMap((e) => (e.userEmotion ? [e.userEmotion] : []));

  // Priority 1: emotional honesty override
  if (emotions.some((em) => em === '😔' || em === '😤')) return make('hard');

  // Priority 2: caffeinated (cafe ≥ 2)
  if (cats.filter((c) => c === 'cafe').length >= 2) return make('caffeinated');

  // Priority 3: warm (home_meal + dining_out ≥ 2, or any meal + cafe combo)
  const mealCount = cats.filter((c) => c === 'home_meal' || c === 'dining_out').length;
  const cafeCount = cats.filter((c) => c === 'cafe').length;
  if (mealCount >= 2 || (mealCount >= 1 && cafeCount >= 1)) return make('warm');

  // Priority 4: sweet (small cafe/home_meal/dining_out purchase under 6,000)
  if (expenses.some((e) =>
    (e.category === 'cafe' || e.category === 'home_meal' || e.category === 'dining_out') && e.amount < 6000
  )) {
    return make('sweet');
  }

  // Priority 5: selfcare (hobby present — closest scene to "small treat to self")
  if (cats.includes('hobby')) return make('selfcare');

  // Priority 6: active (transport + 3+ distinct categories)
  if (cats.includes('transport') && new Set(cats).size >= 3) return make('active');

  // Priority 7: quiet (very low total)
  // Threshold intentionally decoupled from calm-atmosphere's 10,000.
  // Synchronized thresholds would let users infer "low spending = reward state".
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  if (total < 8000) return make('quiet');

  // Fallback
  return make('modest');
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/dayFeelingService.test.ts
```

Expected: all 14 tests pass.

- [ ] **Step 5: Run the full test suite to check for regressions (excluding pre-existing failures)**

```bash
npx jest --testPathIgnorePatterns letterService
```

Expected: all suites pass.

- [ ] **Step 6: Commit**

```bash
git add src/services/dayFeelingService.ts __tests__/dayFeelingService.test.ts
git commit -m "feat: dayFeeling bucket logic + observations on new taxonomy"
```

---

## Task 6: Wire migration into `useAppInit`

**Files:**
- Modify: `src/hooks/useAppInit.ts`

- [ ] **Step 1: Import and invoke the migration before storage hydrate**

Edit `src/hooks/useAppInit.ts`.

Add to the existing import block at the top:

```ts
import { runExpenseCategoryMigration } from '../services/expenseMigration';
```

Inside the `loadStored` async function, the very first line of the `try` block should call the migration before any `storageService.load<Expense[]>` reads. Replace the start of the try block:

```ts
    async function loadStored() {
      try {
        await runExpenseCategoryMigration();

        const [userData, expenses, lastEmotionRaw] = await Promise.all([
          storageService.load<UserState>(STORAGE_KEYS.USER),
          storageService.load<Expense[]>(STORAGE_KEYS.EXPENSES),
          storageService.load<string>(STORAGE_KEYS.LAST_EMOTION),
        ]);
```

The migration awaits storage twice (read flag + maybe write data) before the parallel hydrate load fires. This is intentional — hydrate must read the migrated data, not pre-migration data.

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v "_404.tsx" | head -10
```

Expected: empty output.

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --testPathIgnorePatterns letterService
```

Expected: all suites pass (no test file depends on `useAppInit` directly).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAppInit.ts
git commit -m "feat: run category migration before storage hydrate on app init"
```

---

## Task 7: Drop legacy tokens from `ExpenseCategory` union

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Remove the legacy tokens**

Edit `src/types/index.ts`. The union loses its `food / shopping / other` lines:

```ts
export type ExpenseCategory =
  | 'cafe'
  | 'home_meal'
  | 'dining_out'
  | 'transport'
  | 'living'
  | 'gift'
  | 'hobby'
  | 'pet'
  | 'travel'
  | 'health'
  | 'event'
  | 'allowance'
  | 'no_spend';
```

- [ ] **Step 2: Typecheck — confirm nothing else holds legacy-token literals**

```bash
npx tsc --noEmit 2>&1 | grep -v "_404.tsx"
```

Expected: empty output. If any new errors surface, they are real bugs — a literal `'food'` / `'shopping'` / `'other'` left somewhere outside the migration module. Fix them before committing.

(The migration module already accesses old tokens via `as string` and via `Record<string, ExpenseCategory>`, so it stays type-clean. The test file uses `as unknown as Expense` for legacy fixtures, so it stays type-clean too.)

- [ ] **Step 3: Run the full test suite one more time**

```bash
npx jest --testPathIgnorePatterns letterService
```

Expected: all suites pass.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "chore: drop legacy expense category tokens from union"
```

---

## Task 8: Update operational docs

**Files:**
- Modify: `docs/SOBAGI_CURRENT_STATE.md`
- Modify: `docs/SOBAGI_NEXT_PRIORITIES.md`

- [ ] **Step 1: Replace the `## Latest Handoff` section in `SOBAGI_CURRENT_STATE.md`**

Replace the entire current `## Latest Handoff` block with:

```markdown
## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-19
**Group completed:** Life-scene category taxonomy (12 categories + `no_spend` marker)

### What changed
- `src/types/index.ts` — `ExpenseCategory` rewritten as a 13-token union (12 scene categories + `no_spend`). Legacy tokens `food / shopping / other` removed.
- `src/constants/categories.ts` (new) — single source of truth for category metadata. Exports `CATEGORIES` (full list, ordered), `CATEGORY_BY_TOKEN` (lookup map), `PICKER_CATEGORIES` (CATEGORIES with `inPicker: true` — excludes `no_spend`), and two formatting helpers: `formatCategoryWithEmoji(token)` ("☕ 카페" — used in history card / stats records / monthly top) and `formatCategoryLabel(token)` ("카페" — bare label for photocard records).
- `src/services/expenseMigration.ts` (new) — pure `migrateExpenseCategories(expenses)` plus an IO wrapper `runExpenseCategoryMigration()` that is gated by `STORAGE_KEYS.CATEGORY_MIGRATION_DONE` and runs once per install before `useAppInit` hydrates expenses. Idempotent.
- `src/constants/storage.ts` — added `CATEGORY_MIGRATION_DONE` storage key.
- `src/components/expense/CategorySelector.tsx` — reads `PICKER_CATEGORIES`; no longer hardcodes the chip list.
- `src/components/expense/ExpenseCard.tsx`, `src/pages/reaction.tsx`, `src/pages/stats.tsx` — local `CATEGORY_LABELS` (and `PHOTOCARD_CATEGORY_LABELS` in stats) removed; all three consume the shared module's helpers. The stats records list and monthly top line now render "emoji label" (was "label emoji") — small unification for one shared helper. The stats edit picker iterates `PICKER_CATEGORIES` so `no_spend` is no longer selectable when editing a spending record.
- `src/services/dayFeelingService.ts` — bucket-trigger logic and `buildObservations` updated for the new taxonomy. `warm` now reads `home_meal + dining_out`; `sweet` includes `home_meal / dining_out`; `selfcare` keys on `hobby`. `caffeinated / active / quiet / modest / hard` unchanged in shape.
- `src/hooks/useAppInit.ts` — `runExpenseCategoryMigration()` awaits before the parallel storage load so hydrate consumes migrated data.
- `__tests__/expenseMigration.test.ts` (new), `__tests__/dayFeelingService.test.ts` (new).

### What's now working
- Recording surfaces the 12 life-scene chips in the picker; ordering is cafe → home_meal → dining_out → transport → living → hobby → gift → pet → travel → health → event → allowance.
- Existing stored expenses with legacy tokens (`food / shopping / other`) are remapped on first app launch: `food → dining_out`, `shopping → living`, `other → living`. Cafe / transport / no_spend pass through. After migration completes once, the flag prevents re-running.
- DayFeeling buckets react to the new tokens; old `shopping`-keyed `selfcare` is now keyed on `hobby`.
- All pages that show category labels (history card, reaction screen, stats list, photocard, monthly top, edit picker) read from one shared module.

### Fragile / surprising
- The `allowance` 🫶 glyph is Unicode 14 (2021). On very old Android builds the emoji may fall back to tofu. Document if it surfaces in user feedback; do not swap unilaterally.
- Migration writes back to `STORAGE_KEYS.EXPENSES` only when at least one record was remapped, then always sets the `CATEGORY_MIGRATION_DONE` flag. If you ever need to re-run the migration for a single user (debug path), clear the flag — the function is safe to re-run on already-migrated data (no-op return).
- Stats' edit picker now skips `no_spend` — editing a spending record cannot convert it into the no-spend marker. This is the correct behavior; do not "fix" it by adding `no_spend` to `PICKER_CATEGORIES`.
- `roomPresenceService` `CATEGORY_TRIGGERS.cafe` and `bagItems.m5 머그컵.categoryAffinity: ['cafe']` are unchanged. The cafe token survives the rename, so the mug pattern keeps working.

### What the next agent must NOT do
- Don't reintroduce a hardcoded `CATEGORY_LABELS` map in any consumer. Always read from `src/constants/categories.ts`.
- Don't treat `no_spend` as a normal expense category. It's a separate daily-presence marker. The picker excludes it; downstream filters that strip it (`reaction.tsx` / `stats.tsx` photocard records, spending totals, top-category) stay as they are.
- Don't reframe `allowance` as income. 용돈 is a giving scene (parents / kids / someone). Copy and downstream consumers must not invert this.
- Don't add nested categories, subcategory pickers, or budget UI. The taxonomy is flat by design.
- Don't change `dayFeeling`'s `selfcare` back to keying on legacy `shopping` — that token no longer exists.

### Next
Held: weekend leisure → cozy floor items implicit trigger (paused earlier). Future room-presence triggers for new tokens (`hobby → ribbons`, `pet → cushion`, `travel → postcard`, `home_meal → kitchen traces`, `gift → wrapping traces`) are out of scope for this landing but become trivial to add now that the tokens exist.
```

Also update the `## Storage Keys` block to include the new key:

```
sobagi-category-migration-done → boolean  one-time flag for legacy category migration
```

- [ ] **Step 2: Update `SOBAGI_NEXT_PRIORITIES.md`**

Update the header date:

```markdown
**Last updated:** 2026-05-19 (Engineering — life-scene category taxonomy landed)
```

Add a new entry at the top of `## Recently completed`:

```markdown
- [x] **Life-scene category taxonomy** — `ExpenseCategory` rewritten as 12 scene categories + `no_spend` marker. New `src/constants/categories.ts` is the single source of truth (label/emoji/inPicker). `src/services/expenseMigration.ts` remaps legacy `food → dining_out`, `shopping → living`, `other → living` once per install via `STORAGE_KEYS.CATEGORY_MIGRATION_DONE`. `dayFeelingService` buckets updated (`warm` reads `home_meal + dining_out`; `selfcare` keys on `hobby`). Consumers (CategorySelector, ExpenseCard, reaction, stats) deduplicated against the shared module. 9 + 14 new tests. (2026-05-19)
```

- [ ] **Step 3: Commit**

```bash
git add docs/SOBAGI_CURRENT_STATE.md docs/SOBAGI_NEXT_PRIORITIES.md
git commit -m "docs: life-scene category taxonomy handoff + storage key"
```

---

## Verification — final manual QA

After Task 8, before final review:

- [ ] Run the full test suite: `npx jest --testPathIgnorePatterns letterService` — all green.
- [ ] Run typecheck: `npx tsc --noEmit 2>&1 | grep -v "_404.tsx"` — empty.
- [ ] Build still works: `npx ait dev` boots without taxonomy-related errors (visual smoke test of the picker — 12 chips, scroll smooth, default `cafe` selected).
- [ ] On a clean install: record one of each category, verify they appear correctly in history (`/history`), stats day-detail list, photocard.
- [ ] On a device with legacy data: app launches, expenses still render (now under remapped tokens), monthly top-category line reads correctly.

If any check fails, fix-forward — do not revert. The plan's tasks are atomic; a fix on top of the last task is safer than rewinding the union flip.
