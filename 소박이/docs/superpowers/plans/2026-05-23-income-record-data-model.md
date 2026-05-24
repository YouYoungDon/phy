# Income Record Data Model Implementation Plan (Sub-spec A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend Sobagi's data model so that 들어온 기록 (received-money) can be recorded, persisted, edited, and surfaced without breaking any existing spending/no-spend behavior.

**Architecture:** Type extension (`Expense.kind` as denormalized cache; `category` is source of truth via `kindForCategory()`). Registry gains `kind` per token + helpers (`SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES`). Hydration normalizes legacy/malformed records at read time. Record screen gains a kind toggle; stats screen gains a quiet income section + filter updates. Photocard interim patch hides `₩ 0` for amount=0 income records.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29.

**Spec:** `소박이/docs/superpowers/specs/2026-05-23-income-record-data-model-design.md`

**Phasing:**
1. Baseline checks (Task 1)
2. Type + registry foundation (Tasks 2–4)
3. Hydration normalization (Task 5)
4. CategorySelector parameterization + record screen flow (Tasks 6–7)
5. Photocard interim patch + caller updates (Task 8)
6. Stats interim interop + income surface + edit sheet (Tasks 9–11)
7. Final verification (Task 12)

**Commands used throughout** (run from `소박이/`):
- Single test file: `npx jest __tests__/<file>.test.ts`
- Full suite: `npm test`
- Typecheck: `npm run typecheck`

**Working tree note:** No unrelated WIP is expected. If `git status` shows any `M` entries before starting, stop and ask the human.

**Critical anti-pattern to avoid (re-read before every commit):**
- NO visible UI string "수입" (use "들어온 기록" consistently)
- NO totals, counts, or "이번 달 들어온 돈" framing on the income section
- NO income summary on photocard (the interim patch only hides `₩ 0`, nothing more)
- NO modification to existing spending save/reaction/edit/no-spend behavior
- NO storage-key migration; no eager batch transform of stored records
- NO change to `allowance` token (it stays giving-direction; receiving is the separate new `received_allowance`)
- NO income-related changes to `selectStatsObservation`, `MonthPresenceRow`, `emotionEngine`, pebble services, found-item services, dialogue pools (all deferred to sub-spec C)

---

## Task 1: Baseline checks

**Files:** none (verification only)

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: empty output. If unrelated WIP exists, stop and surface to the human.

- [ ] **Step 2: Record baseline HEAD**

Run: `git log --oneline -1`
Expected: `d718484 docs: income record data model design spec (sub-spec A)` (or whichever spec commit is the current HEAD). Note this SHA — BASE_SHA for the implementation.

- [ ] **Step 3: Run typecheck baseline**

Run from `소박이/`: `npm run typecheck 2>&1 | Select-Object -Last 8`
Expected: only the two pre-existing `src/pages/_404.tsx` errors (TS2769 + TS7006). Pre-existing and unrelated to this work — must continue to be the only errors at every subsequent typecheck.

- [ ] **Step 4: Run Jest baseline**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: `Test Suites: 13 passed, 13 total | Tests: 229 passed, 229 total`. If any suite fails, stop and surface to the human.

- [ ] **Step 5: Note results**

```
Baseline HEAD: <paste from step 2>
Pre-existing typecheck errors: 2 (both _404.tsx)
Jest baseline: 13 suites, 229 tests, all green
```

These are the regression-detection reference for every subsequent task.

---

## Task 2: Type foundation — `RecordKind`, income tokens, `Expense.kind`

**Files:**
- Modify: `소박이/src/types/index.ts`

- [ ] **Step 1: Add `RecordKind`, extend `ExpenseCategory` union, add `kind?` to `Expense`**

Replace the entire `소박이/src/types/index.ts` with:

```ts
export type SobagiEmotion = 'happy' | 'excited' | 'surprised' | 'sleepy' | 'soft-sad';

/**
 * Distinguishes outgoing-money records (spending) from incoming-money records
 * (income). The authoritative source of truth is `kindForCategory(category)`
 * from the registry. `Expense.kind` is a denormalized cache for fast filtering
 * and may be absent in legacy records — hydration repairs missing or
 * mismatched values at read time.
 */
export type RecordKind = 'spending' | 'income';

export type ExpenseCategory =
  // outgoing scenes
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
  // incoming scenes (new in sub-spec A)
  | 'salary'
  | 'bonus'
  | 'refund'
  | 'received_gift'
  | 'received_allowance';

export interface Expense {
  id: string;
  /**
   * Denormalized convenience cache. Authoritative source is
   * `kindForCategory(category)` from the registry. Optional because legacy
   * records pre-dating sub-spec A do not have this field; hydration fills it
   * in at read time. New records (post sub-spec A) always set this explicitly.
   */
  kind?: RecordKind;
  amount: number;
  category: ExpenseCategory;
  userEmotion?: string;
  memo?: string;
  sobagiEmotion: SobagiEmotion;
  createdAt: string;
}

export interface UserState {
  level: number;
  streak: number;
  totalRecordCount: number;
  recordedDaysCount: number;
  roomStage: 1 | 2 | 3 | 4 | 5;
  pebbleCount: number;
  restsToday: number;
  lastRestDate: string | null;
  lastRestAt: string | null;
}

export interface EmotionContext {
  isFirstRecordToday: boolean;
  currentStreak: number;
  currentHour: number;
}
```

- [ ] **Step 2: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors. Because `kind` is optional, no existing construction site fails to typecheck.

- [ ] **Step 3: Commit**

```
git add 소박이/src/types/index.ts
git commit -m "feat(types): add RecordKind and 5 income tokens"
```

---

## Task 3: Registry — `kind` on `ExpenseCategoryMeta` + income entries

**Files:**
- Modify: `소박이/src/constants/categories.ts`

This task adds the `kind` field to the meta interface and to every existing entry in the same edit (so typecheck remains clean), plus appends the 5 new income entries. Helpers and `PICKER_CATEGORIES` migration come in Task 4.

- [ ] **Step 1: Update `ExpenseCategoryMeta` and `CATEGORIES`**

Replace `소박이/src/constants/categories.ts` with:

```ts
import { ExpenseCategory, RecordKind } from '../types';

export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
  kind: RecordKind;
}

export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  // ─── Spending (outgoing) ────────────────────────────────────────────────
  { key: 'cafe',                label: '카페',      emoji: '☕',   inPicker: true,  kind: 'spending', memoSuggestions: ['아메리카노', '라떼', '디저트', '테이크아웃', '브런치'] },
  { key: 'home_meal',           label: '집밥',      emoji: '🍚',   inPicker: true,  kind: 'spending', memoSuggestions: ['장보기', '반찬', '과일', '간식', '밀키트'] },
  { key: 'dining_out',          label: '외식',      emoji: '🍽️',  inPicker: true,  kind: 'spending', memoSuggestions: ['떡볶이', '제육', '돈까스', '국밥', '마라탕', '초밥', '햄버거'] },
  { key: 'transport',           label: '이동',      emoji: '🚌',   inPicker: true,  kind: 'spending', memoSuggestions: ['지하철', '버스', '택시', '주유', '주차'] },
  { key: 'living',              label: '생활',      emoji: '🏠',   inPicker: true,  kind: 'spending', memoSuggestions: ['세제', '휴지', '생필품', '다이소', '편의점'] },
  { key: 'hobby',               label: '취미',      emoji: '🎀',   inPicker: true,  kind: 'spending', memoSuggestions: ['다꾸', '문구', '책', '영화', '전시', '게임'] },
  { key: 'gift',                label: '선물',      emoji: '🎁',   inPicker: true,  kind: 'spending', memoSuggestions: ['생일선물', '꽃', '편지', '포장', '기프티콘'] },
  { key: 'pet',                 label: '반려동물',  emoji: '🐾',   inPicker: true,  kind: 'spending', memoSuggestions: ['사료', '간식', '미용', '장난감', '병원'] },
  { key: 'travel',              label: '여행',      emoji: '✈️',  inPicker: true,  kind: 'spending', memoSuggestions: ['숙소', '기차', '비행기', '맛집', '기념품'] },
  { key: 'health',              label: '병원',      emoji: '💊',   inPicker: true,  kind: 'spending', memoSuggestions: ['약', '진료', '검진', '영양제', '치료'] },
  { key: 'event',               label: '경조사',    emoji: '💌',   inPicker: true,  kind: 'spending', memoSuggestions: ['축의금', '부의금', '답례', '모임', '가족행사'] },
  { key: 'allowance',           label: '용돈',      emoji: '🫶',   inPicker: true,  kind: 'spending', memoSuggestions: ['부모님', '아이', '조카', '용돈', '챙김'] },
  { key: 'no_spend',            label: '무지출',    emoji: '🌿',   inPicker: false, kind: 'spending', memoSuggestions: [] },

  // ─── Income (incoming) — new in sub-spec A ──────────────────────────────
  { key: 'salary',              label: '월급',      emoji: '💼',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'bonus',               label: '보너스',    emoji: '✨',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'refund',              label: '환급',      emoji: '🧾',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'received_gift',       label: '선물 받음', emoji: '💝',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
  { key: 'received_allowance',  label: '용돈 받음', emoji: '🤲',   inPicker: true,  kind: 'income',   memoSuggestions: [] },
] as const;

export const CATEGORY_BY_TOKEN: Record<ExpenseCategory, ExpenseCategoryMeta> =
  Object.fromEntries(CATEGORIES.map((c) => [c.key, c])) as Record<ExpenseCategory, ExpenseCategoryMeta>;

export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.inPicker);

/**
 * "☕ 카페" — emoji-prefixed full label for in-list rendering (history card,
 * stats records list, monthly top line).
 */
export function formatCategoryWithEmoji(token: ExpenseCategory): string {
  const meta = CATEGORY_BY_TOKEN[token];
  return `${meta.emoji} ${meta.label}`;
}

/**
 * "카페" — bare label for the photocard records block where the design
 * already supplies its own visual context.
 */
export function formatCategoryLabel(token: ExpenseCategory): string {
  return CATEGORY_BY_TOKEN[token].label;
}
```

- [ ] **Step 2: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors. New entries don't break anything (they're additive); `PICKER_CATEGORIES` still works (income tokens have `inPicker: true` so they appear in it — Task 4 fixes this).

- [ ] **Step 3: Commit**

```
git add 소박이/src/constants/categories.ts
git commit -m "feat(categories): add kind field + 5 income category tokens"
```

---

## Task 4: Registry — `kindForCategory`, helpers, remove `PICKER_CATEGORIES`

**Files:**
- Modify: `소박이/src/constants/categories.ts`
- Modify: `소박이/src/components/expense/CategorySelector.tsx`
- Create: `소박이/__tests__/categoryRegistry.test.ts`

TDD pair: tests first, then helpers + migrate consumers + remove `PICKER_CATEGORIES`.

- [ ] **Step 1: Write the failing tests**

Create `소박이/__tests__/categoryRegistry.test.ts`:

```ts
import {
  kindForCategory,
  SPENDING_CATEGORIES,
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
} from '../src/constants/categories';

describe('kindForCategory', () => {
  it('returns spending for general spending tokens', () => {
    expect(kindForCategory('cafe')).toBe('spending');
    expect(kindForCategory('home_meal')).toBe('spending');
    expect(kindForCategory('transport')).toBe('spending');
    expect(kindForCategory('allowance')).toBe('spending');
  });

  it('returns spending for the no_spend marker', () => {
    expect(kindForCategory('no_spend')).toBe('spending');
  });

  it('returns income for each income token', () => {
    expect(kindForCategory('salary')).toBe('income');
    expect(kindForCategory('bonus')).toBe('income');
    expect(kindForCategory('refund')).toBe('income');
    expect(kindForCategory('received_gift')).toBe('income');
    expect(kindForCategory('received_allowance')).toBe('income');
  });
});

describe('category registry partitions', () => {
  it('SPENDING_CATEGORIES contains all 13 spending tokens including no_spend', () => {
    expect(SPENDING_CATEGORIES.length).toBe(13);
    expect(SPENDING_CATEGORIES.every(c => c.kind === 'spending')).toBe(true);
    expect(SPENDING_CATEGORIES.some(c => c.key === 'no_spend')).toBe(true);
  });

  it('GENERAL_SPENDING_CATEGORIES excludes no_spend', () => {
    expect(GENERAL_SPENDING_CATEGORIES.length).toBe(12);
    expect(GENERAL_SPENDING_CATEGORIES.every(c => c.kind === 'spending')).toBe(true);
    expect(GENERAL_SPENDING_CATEGORIES.some(c => c.key === 'no_spend')).toBe(false);
  });

  it('INCOME_CATEGORIES contains exactly 5 income tokens', () => {
    expect(INCOME_CATEGORIES.length).toBe(5);
    expect(INCOME_CATEGORIES.every(c => c.kind === 'income')).toBe(true);
  });

  it('income tokens use distinct icons from outgoing counterparts', () => {
    const gift = SPENDING_CATEGORIES.find(c => c.key === 'gift');
    const receivedGift = INCOME_CATEGORIES.find(c => c.key === 'received_gift');
    expect(gift?.emoji).toBe('🎁');
    expect(receivedGift?.emoji).toBe('💝');
    expect(gift?.emoji).not.toBe(receivedGift?.emoji);

    const allowance = SPENDING_CATEGORIES.find(c => c.key === 'allowance');
    const receivedAllowance = INCOME_CATEGORIES.find(c => c.key === 'received_allowance');
    expect(allowance?.emoji).toBe('🫶');
    expect(receivedAllowance?.emoji).toBe('🤲');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `소박이/`: `npx jest __tests__/categoryRegistry.test.ts`
Expected: file fails to import — `kindForCategory`, `SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES` not exported yet.

- [ ] **Step 3: Add helpers to `categories.ts`, remove `PICKER_CATEGORIES`**

In `소박이/src/constants/categories.ts`, REPLACE the `PICKER_CATEGORIES` export with helpers. Find:

```ts
export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.inPicker);
```

Replace with:

```ts
export const SPENDING_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.kind === 'spending');

export const GENERAL_SPENDING_CATEGORIES: readonly ExpenseCategoryMeta[] =
  SPENDING_CATEGORIES.filter((c) => c.key !== 'no_spend');

export const INCOME_CATEGORIES: readonly ExpenseCategoryMeta[] =
  CATEGORIES.filter((c) => c.kind === 'income');

export function kindForCategory(c: ExpenseCategory): RecordKind {
  return CATEGORY_BY_TOKEN[c]?.kind ?? 'spending';
}
```

- [ ] **Step 4: Migrate `CategorySelector` to the new helper**

`CategorySelector` currently imports `PICKER_CATEGORIES` and uses it directly. Migrate it to receive categories via prop with a sensible default, so callers can swap pools later (sub-spec A's record screen toggle + edit sheet picker swap).

Replace `소박이/src/components/expense/CategorySelector.tsx` with:

```ts
import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { ExpenseCategoryMeta, GENERAL_SPENDING_CATEGORIES } from '../../constants/categories';
import { COLORS } from '../../constants/colors';

interface CategorySelectorProps {
  selected: ExpenseCategory;
  onSelect: (category: ExpenseCategory) => void;
  categories?: readonly ExpenseCategoryMeta[];
}

export function CategorySelector({
  selected,
  onSelect,
  categories = GENERAL_SPENDING_CATEGORIES,
}: CategorySelectorProps) {
  return (
    <View style={styles.row}>
      {categories.map((c) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipSelected: {
    backgroundColor: COLORS.woodLight,
    shadowColor: COLORS.wood,
    shadowOpacity: 0.10,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  labelSelected: {
    color: COLORS.text,
  },
});
```

- [ ] **Step 5: Find and migrate any other consumers of `PICKER_CATEGORIES`**

Run:
```
Select-String -Pattern "PICKER_CATEGORIES" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```
Expected: zero matches (since `CategorySelector` was the only consumer and we migrated it).

If matches are found, migrate each to `GENERAL_SPENDING_CATEGORIES` (most likely correct given the spending-only assumption of the previous behavior).

- [ ] **Step 6: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 7: Run the new tests**

Run from `소박이/`: `npx jest __tests__/categoryRegistry.test.ts`
Expected: all tests pass.

- [ ] **Step 8: Run the full Jest suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: 14 suites, 236 tests (229 baseline + 7 new categoryRegistry tests). All green.

- [ ] **Step 9: Commit**

```
git add 소박이/src/constants/categories.ts 소박이/src/components/expense/CategorySelector.tsx 소박이/__tests__/categoryRegistry.test.ts
git commit -m "feat(categories): kindForCategory + SPENDING/INCOME helpers, remove PICKER_CATEGORIES"
```

---

## Task 5: Hydration normalization

**Files:**
- Modify: `소박이/src/services/expenseService.ts`
- Modify: `소박이/src/hooks/useAppInit.ts`
- Create: `소박이/__tests__/expenseHydration.test.ts`

TDD pair: tests first, then `normalizeExpense` + wire into the read path in `useAppInit`.

- [ ] **Step 1: Write the failing tests**

Create `소박이/__tests__/expenseHydration.test.ts`:

```ts
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import { normalizeExpense } from '../src/services/expenseService';
import { Expense } from '../src/types';

function baseExpense(): Omit<Expense, 'kind'> {
  return {
    id: '1',
    amount: 5000,
    category: 'cafe',
    sobagiEmotion: 'happy',
    createdAt: '2026-05-23T10:00:00',
    memo: 'latte',
  };
}

describe('normalizeExpense', () => {
  it('sets kind to spending when kind is missing on a spending record', () => {
    const raw = baseExpense();
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
  });

  it('sets kind to income when category is salary and kind is missing', () => {
    const raw = { ...baseExpense(), category: 'salary' as const };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
  });

  it('corrects mismatched kind: spending+salary → income', () => {
    const raw: Expense = { ...baseExpense(), kind: 'spending', category: 'salary' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
  });

  it('corrects mismatched kind: income+cafe → spending', () => {
    const raw: Expense = { ...baseExpense(), kind: 'income', category: 'cafe' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
  });

  it('keeps a valid spending record unchanged', () => {
    const raw: Expense = { ...baseExpense(), kind: 'spending', category: 'cafe' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('spending');
    expect(result.category).toBe('cafe');
    expect(result.id).toBe('1');
    expect(result.amount).toBe(5000);
    expect(result.sobagiEmotion).toBe('happy');
    expect(result.memo).toBe('latte');
  });

  it('keeps a valid income record unchanged', () => {
    const raw: Expense = { ...baseExpense(), kind: 'income', category: 'salary' };
    const result = normalizeExpense(raw);
    expect(result.kind).toBe('income');
    expect(result.category).toBe('salary');
  });

  it('preserves all other fields (id, amount, sobagiEmotion, createdAt, userEmotion, memo)', () => {
    const raw: Expense = {
      id: 'preserved-id',
      amount: 12345,
      category: 'bonus',
      sobagiEmotion: 'excited',
      createdAt: '2026-05-23T15:30:00',
      userEmotion: '🥰',
      memo: 'preserved memo',
    };
    const result = normalizeExpense(raw);
    expect(result.id).toBe('preserved-id');
    expect(result.amount).toBe(12345);
    expect(result.sobagiEmotion).toBe('excited');
    expect(result.createdAt).toBe('2026-05-23T15:30:00');
    expect(result.userEmotion).toBe('🥰');
    expect(result.memo).toBe('preserved memo');
    expect(result.kind).toBe('income');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `소박이/`: `npx jest __tests__/expenseHydration.test.ts`
Expected: file fails to import — `normalizeExpense` not exported.

- [ ] **Step 3: Implement `normalizeExpense` in `expenseService.ts`**

In `소박이/src/services/expenseService.ts`, add the import for `kindForCategory` and the new export. At the top of the file, after existing imports, add:

```ts
import { kindForCategory } from '../constants/categories';
```

Then at the bottom of the file (after `deleteExpense`), add:

```ts
/**
 * Hydration normalization. Applied at read time only — does NOT mutate
 * storage. Ensures `expense.kind` always reflects the category-derived
 * truth, regardless of what was stored. Forgiving: missing kind → derived,
 * mismatched kind → corrected, no throw.
 */
export function normalizeExpense(raw: Expense): Expense {
  const derivedKind = kindForCategory(raw.category);
  return {
    ...raw,
    kind: derivedKind,
  };
}
```

- [ ] **Step 4: Run the hydration tests**

Run from `소박이/`: `npx jest __tests__/expenseHydration.test.ts`
Expected: all 7 tests pass.

- [ ] **Step 5: Apply `normalizeExpense` at the read path in `useAppInit.ts`**

In `소박이/src/hooks/useAppInit.ts`, find the import line for storageService and add `normalizeExpense`:

Find:
```ts
import * as storageService from '../services/storageService';
import { runExpenseCategoryMigration } from '../services/expenseMigration';
```

Add immediately after:
```ts
import { normalizeExpense } from '../services/expenseService';
```

Then find the line that hydrates the expense store:

```ts
        if (expenses) useExpenseStore.getState().hydrate(expenses);
```

Replace with:

```ts
        const normalized = expenses ? expenses.map(normalizeExpense) : null;
        if (normalized) useExpenseStore.getState().hydrate(normalized);
```

And also update the line that uses `expenses` directly for downstream computations to use `normalized` where appropriate. Find:

```ts
        const recomputedDays = expenses ? computeRecordedDaysCount(expenses) : 0;
```

Replace with:

```ts
        const recomputedDays = normalized ? computeRecordedDaysCount(normalized) : 0;
```

And find:

```ts
        await checkForPlacement(emotion, recomputedDays, prevVisitDate, expenses ?? []);
```

Replace with:

```ts
        await checkForPlacement(emotion, recomputedDays, prevVisitDate, normalized ?? []);
```

- [ ] **Step 6: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 7: Run the full suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: 15 suites, 243 tests (229 baseline + 7 categoryRegistry + 7 expenseHydration). All green.

- [ ] **Step 8: Commit**

```
git add 소박이/src/services/expenseService.ts 소박이/src/hooks/useAppInit.ts 소박이/__tests__/expenseHydration.test.ts
git commit -m "feat(expense): normalizeExpense hydration applied at app init read path"
```

---

## Task 6: Reaction screen — pass `kind` through to PhotocardView

**Files:**
- Modify: `소박이/src/components/photocard/PhotocardView.tsx`
- Modify: `소박이/src/pages/reaction.tsx`

This task lands the photocard interim patch (Section 5 of spec) plus the reaction-screen caller update. Stats-screen caller update is in Task 8.

- [ ] **Step 1: Extend `PhotocardRecord` with optional `kind`, add hide rule**

In `소박이/src/components/photocard/PhotocardView.tsx`:

Find the imports block and add `RecordKind` to the import from `../../types`:

```ts
import { SobagiEmotion, ExpenseCategory } from '../../types';
```

Replace with:

```ts
import { SobagiEmotion, ExpenseCategory, RecordKind } from '../../types';
```

Find the `PhotocardRecord` type:

```ts
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
};
```

Replace with:

```ts
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
  /**
   * Optional. When omitted, the amount column always renders (legacy
   * behavior). When set to 'income' and amount is 0, the amount column
   * is hidden to avoid rendering "₩ 0" for an income record with no
   * amount entered.
   */
  kind?: RecordKind;
};
```

Find the `recordRow` rendering block:

```tsx
                    <View style={styles.recordRow}>
                      <Text style={styles.recordIcon}>{icon}</Text>
                      <Text style={styles.recordLine} numberOfLines={1}>{lineText}</Text>
                      <Text style={styles.recordAmount}>₩ {r.amount.toLocaleString('ko-KR')}</Text>
                    </View>
```

Replace with:

```tsx
                    <View style={styles.recordRow}>
                      <Text style={styles.recordIcon}>{icon}</Text>
                      <Text style={styles.recordLine} numberOfLines={1}>{lineText}</Text>
                      {(r.kind !== 'income' || r.amount > 0) && (
                        <Text style={styles.recordAmount}>₩ {r.amount.toLocaleString('ko-KR')}</Text>
                      )}
                    </View>
```

- [ ] **Step 2: Update `reaction.tsx` to pass `kind` per record**

In `소박이/src/pages/reaction.tsx`, find:

```tsx
  const photocardRecords: PhotocardRecord[] = todaySpendingExpenses.map((e) => ({
    id: e.id,
    category: e.category,
    categoryLabel: formatCategoryLabel(e.category),
    amount: e.amount,
    memo: e.memo,
  }));
```

Replace with:

```tsx
  const photocardRecords: PhotocardRecord[] = todaySpendingExpenses.map((e) => ({
    id: e.id,
    category: e.category,
    categoryLabel: formatCategoryLabel(e.category),
    amount: e.amount,
    memo: e.memo,
    kind: e.kind,
  }));
```

Note: `todaySpendingExpenses` is filtered with `e.category !== 'no_spend'` only — it does NOT currently exclude income. After Task 9, income records won't reach the reaction screen's photocard records because the reaction screen filters by category, not by kind. The `kind` field on each record is for forward-compat with sub-spec B and for cases where an income record might accidentally pass the spending filter.

- [ ] **Step 3: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 4: Run the full suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: green, count unchanged from Task 5.

- [ ] **Step 5: Commit**

```
git add 소박이/src/components/photocard/PhotocardView.tsx 소박이/src/pages/reaction.tsx
git commit -m "feat(photocard): hide amount when kind=income && amount=0; pass kind from reaction"
```

---

## Task 7: Record screen — toggle + picker swap + save path

**Files:**
- Modify: `소박이/src/pages/record.tsx`

The largest single-task change. Adds the `recordKind` state, the segmented toggle UI, picker pool swap, amount placeholder change, no-spend / save-helper hiding, and the save-path branch with hardcoded income emotion.

- [ ] **Step 1: Add imports**

In `소박이/src/pages/record.tsx`, find the import block. Add:

```ts
import { RecordKind, ExpenseCategory, EmotionContext } from '../types';
import {
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
  kindForCategory,
} from '../constants/categories';
```

Note: `ExpenseCategory` and `EmotionContext` are already imported — just ensure `RecordKind` is added to the existing line. Existing line:

```ts
import { ExpenseCategory, EmotionContext } from '../types';
```

Replace with:

```ts
import { ExpenseCategory, EmotionContext, RecordKind } from '../types';
```

And add (separately):

```ts
import {
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
  kindForCategory,
} from '../constants/categories';
```

- [ ] **Step 2: Add `recordKind` state and toggle handler**

Find the existing state declarations near the top of `RecordScreen()`:

```ts
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('cafe');
  const [userEmotion, setUserEmotion] = useState<string | undefined>(undefined);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
```

Replace with:

```ts
  const [recordKind, setRecordKind] = useState<RecordKind>('spending');
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('cafe');
  const [userEmotion, setUserEmotion] = useState<string | undefined>(undefined);
  const [memo, setMemo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr);
```

And add immediately after the state block:

```ts
  const handleToggleKind = (nextKind: RecordKind) => {
    if (nextKind === recordKind) return;
    setRecordKind(nextKind);
    setAmountText('');
    setCategory(nextKind === 'income' ? 'salary' : 'cafe');
    setUserEmotion(undefined);
    setMemo('');
  };
```

- [ ] **Step 3: Update `canSave` and `canNoSpend` to be kind-aware**

Find:

```ts
  const amount = parseInt(amountText.replace(/,/g, ''), 10) || 0;
  const canSave = amount > 0 && !isSaving;
```

Replace with:

```ts
  const amount = parseInt(amountText.replace(/,/g, ''), 10) || 0;
  const canSave = recordKind === 'income'
    ? !isSaving
    : amount > 0 && !isSaving;
```

Find:

```ts
  const canNoSpend =
    !hasRecordOnSelectedDate && !isSaving && selectedDate <= todayStr;
```

Replace with:

```ts
  const canNoSpend =
    recordKind === 'spending' &&
    !hasRecordOnSelectedDate &&
    !isSaving &&
    selectedDate <= todayStr;
```

- [ ] **Step 4: Update `handleSave` to derive kind from category and use hardcoded emotion for income**

Find:

```ts
  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const ctx: EmotionContext = {
      isFirstRecordToday: getTodayExpenses().length === 0,
      currentStreak: streak,
      currentHour: new Date().getHours(),
    };

    const sobagiEmotion = evaluate(
      { id: '', amount, category, sobagiEmotion: 'happy', createdAt: '' },
      ctx,
    );

    const createdAt = selectedDate === todayStr
      ? new Date().toISOString()
      : localDateToISOString(selectedDate);

    const expense = {
      id: Date.now().toString(),
      amount,
      category,
      userEmotion,
      memo: memo.trim() || undefined,
      sobagiEmotion,
      createdAt,
    };
```

Replace with:

```ts
  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);
    const ctx: EmotionContext = {
      isFirstRecordToday: getTodayExpenses().length === 0,
      currentStreak: streak,
      currentHour: new Date().getHours(),
    };

    // Source of truth: category determines kind, not the UI toggle state.
    // Guards against the toggle and category being momentarily out of sync.
    const derivedKind = kindForCategory(category);

    // Income records skip the spending-shaped emotion resolver (which is
    // tuned around amount magnitude and category atmosphere). Sub-spec C
    // will move this branching into emotionEngine and add income-aware
    // nuance. For sub-spec A, a flat 'happy' is sufficient.
    const sobagiEmotion = derivedKind === 'income'
      ? 'happy'
      : evaluate(
          { id: '', amount, category, sobagiEmotion: 'happy', createdAt: '' },
          ctx,
        );

    const createdAt = selectedDate === todayStr
      ? new Date().toISOString()
      : localDateToISOString(selectedDate);

    const expense = {
      id: Date.now().toString(),
      kind: derivedKind,
      amount,
      category,
      userEmotion,
      memo: memo.trim() || undefined,
      sobagiEmotion,
      createdAt,
    };
```

The rest of `handleSave` (observation message branch, `setEmotion`, `await saveExpense(expense)`, navigation) stays unchanged.

- [ ] **Step 5: Add toggle UI to JSX**

Find the page subtitle line:

```tsx
        <Text style={styles.pageSubtitle}>오늘을 기록해요 ✏️</Text>
```

Add immediately below (before the date selector):

```tsx
        <Text style={styles.pageSubtitle}>오늘을 기록해요 ✏️</Text>

        {/* Kind toggle — segmented; resets category/amount on switch */}
        <View style={styles.kindToggleRow}>
          <Pressable
            style={[styles.kindToggleChip, recordKind === 'spending' && styles.kindToggleChipSelected]}
            onPress={() => handleToggleKind('spending')}
          >
            <Text style={[styles.kindToggleLabel, recordKind === 'spending' && styles.kindToggleLabelSelected]}>
              쓴 기록
            </Text>
          </Pressable>
          <Pressable
            style={[styles.kindToggleChip, recordKind === 'income' && styles.kindToggleChipSelected]}
            onPress={() => handleToggleKind('income')}
          >
            <Text style={[styles.kindToggleLabel, recordKind === 'income' && styles.kindToggleLabelSelected]}>
              들어온 기록
            </Text>
          </Pressable>
        </View>
```

- [ ] **Step 6: Update the amount display + input placeholder, swap CategorySelector pool, hide save helper for income**

Find the amount card block:

```tsx
        {/* Amount hero */}
        <Pressable style={styles.amountCard} onPress={() => amountInputRef.current?.focus()}>
          <Text style={styles.amountDisplay}>
            {amount > 0 ? `${amount.toLocaleString()}원` : '0원'}
          </Text>
          <TextInput
            ref={amountInputRef}
            style={styles.amountInput}
            value={amountText}
            onChangeText={setAmountText}
            placeholder="금액을 입력해요"
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
            maxLength={10}
            onFocus={() => { focusedFieldRef.current = 'amount'; }}
          />
        </Pressable>
```

Replace with:

```tsx
        {/* Amount hero */}
        <Pressable style={styles.amountCard} onPress={() => amountInputRef.current?.focus()}>
          <Text style={styles.amountDisplay}>
            {amount > 0
              ? `${amount.toLocaleString()}원`
              : recordKind === 'income' ? '' : '0원'}
          </Text>
          <TextInput
            ref={amountInputRef}
            style={styles.amountInput}
            value={amountText}
            onChangeText={setAmountText}
            placeholder={recordKind === 'income' ? '금액 (선택)' : '금액을 입력해요'}
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
            maxLength={10}
            onFocus={() => { focusedFieldRef.current = 'amount'; }}
          />
        </Pressable>
```

Find the category section:

```tsx
        {/* Category */}
        <View style={styles.section}>
          <CategorySelector selected={category} onSelect={setCategory} />
          <MemoSuggestions
            category={category}
            memo={memo}
            onAppend={setMemo}
          />
        </View>
```

Replace with:

```tsx
        {/* Category */}
        <View style={styles.section}>
          <CategorySelector
            selected={category}
            onSelect={setCategory}
            categories={recordKind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES}
          />
          <MemoSuggestions
            category={category}
            memo={memo}
            onAppend={setMemo}
          />
        </View>
```

Find the save-helper conditional at the bottom:

```tsx
          {amount === 0 && canNoSpend && (
            <Text style={styles.saveHelper}>
              지출이 없는 날은 무지출 기록을 사용할 수 있어요 🌿
            </Text>
          )}
```

Replace with:

```tsx
          {recordKind === 'spending' && amount === 0 && canNoSpend && (
            <Text style={styles.saveHelper}>
              지출이 없는 날은 무지출 기록을 사용할 수 있어요 🌿
            </Text>
          )}
```

- [ ] **Step 7: Add toggle styles**

In the `StyleSheet.create({ ... })` block, after the `dateChipLabelSelected` style, add:

```ts
  kindToggleRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 16,
  },
  kindToggleChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
  },
  kindToggleChipSelected: {
    backgroundColor: COLORS.oliveGreen,
  },
  kindToggleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  kindToggleLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
```

- [ ] **Step 8: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 9: Run the full suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: green, count unchanged.

- [ ] **Step 10: Commit**

```
git add 소박이/src/pages/record.tsx
git commit -m "feat(record): kind toggle, income picker swap, save path with derived kind"
```

---

## Task 8: Stats — spending-only filters (exclude income from existing surfaces)

**Files:**
- Modify: `소박이/src/pages/stats.tsx`

Adds `&& e.kind !== 'income'` to `selectedSpendingExpenses` and to the `topCategoryThisMonth` computation. Photocard caller in stats.tsx (the day photocard) also gets the `kind` field added per record.

- [ ] **Step 1: Read the relevant sections of `stats.tsx`**

Open `소박이/src/pages/stats.tsx`. Find:

1. The `selectedSpendingExpenses` memo. Its filter currently uses `e.category !== 'no_spend'`.
2. The `topCategoryThisMonth` memo. Its filter iterates over month expenses and skips `e.category === 'no_spend'`.
3. The day-photocard caller (where the photocard modal is opened with the day's records). Look for `<PhotocardView` inside stats.tsx and find where its `records` prop is constructed (likely via a `.map` similar to reaction.tsx's `photocardRecords`).

- [ ] **Step 2: Update `selectedSpendingExpenses` filter**

Find:

```ts
  const selectedSpendingExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.category !== 'no_spend'),
    [selectedExpenses],
  );
```

(Note: the actual existing code may be slightly differently formatted — find the equivalent.)

Replace with:

```ts
  const selectedSpendingExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.category !== 'no_spend' && e.kind !== 'income'),
    [selectedExpenses],
  );
```

- [ ] **Step 3: Update `topCategoryThisMonth` filter**

Find the `topCategoryThisMonth` memo. It contains a loop over month expenses with a guard like `if (e.category === 'no_spend') continue;`. Add an income guard immediately after.

Find a block similar to:

```ts
    for (const e of monthExpenses) {
      if (e.category === 'no_spend') continue;
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
```

Replace with:

```ts
    for (const e of monthExpenses) {
      if (e.category === 'no_spend') continue;
      if (e.kind === 'income') continue;
      counts[e.category] = (counts[e.category] ?? 0) + 1;
    }
```

If the code structure differs (e.g., uses `.filter().reduce()`), apply the equivalent: add `e.kind !== 'income'` to the inclusion condition.

- [ ] **Step 4: Pass `kind` to the day-photocard `records` prop**

Find the `.map` in stats.tsx that constructs `PhotocardRecord[]` for the day photocard (similar to reaction.tsx's `photocardRecords`). Add `kind: r.kind` to each mapped object.

Example — if the existing code looks like:

```tsx
  records={selectedSpendingExpenses.map((r) => ({
    id: r.id,
    category: r.category,
    categoryLabel: formatCategoryLabel(r.category),
    amount: r.amount,
    memo: r.memo,
  }))}
```

Replace with:

```tsx
  records={selectedSpendingExpenses.map((r) => ({
    id: r.id,
    category: r.category,
    categoryLabel: formatCategoryLabel(r.category),
    amount: r.amount,
    memo: r.memo,
    kind: r.kind,
  }))}
```

Because `selectedSpendingExpenses` already excludes income after Step 2, the `kind` field here will always be `'spending'` (or undefined for legacy records). Still pass it for contract uniformity.

- [ ] **Step 5: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 6: Commit**

```
git add 소박이/src/pages/stats.tsx
git commit -m "feat(stats): exclude income from selectedSpendingExpenses and topCategoryThisMonth"
```

---

## Task 9: Stats — income surface section

**Files:**
- Modify: `소박이/src/pages/stats.tsx`

Adds `selectedIncomeExpenses` memo, the `incomeSection` JSX rendered below the spending list inside the selected-day card, and the corresponding styles.

- [ ] **Step 1: Add imports**

In `소박이/src/pages/stats.tsx`, find the imports block. Ensure these are present (add if missing):

```ts
import { CATEGORY_BY_TOKEN } from '../constants/categories';
```

(`CATEGORY_BY_TOKEN` is likely already imported. If so, skip.)

- [ ] **Step 2: Add `selectedIncomeExpenses` memo**

Find the `selectedSpendingExpenses` memo (modified in Task 8). Add immediately after it:

```ts
  const selectedIncomeExpenses = useMemo(
    () => selectedExpenses.filter((e) => e.kind === 'income'),
    [selectedExpenses],
  );
```

- [ ] **Step 3: Render the income section JSX**

Find the selected-day card block (where `<ExpenseList .../>` and the photocard entry button live). After the spending list block and before the photocard entry button (or at a location that places the income section visually below the spending list, above the photocard button), insert:

```tsx
        {selectedIncomeExpenses.length > 0 && (
          <View style={styles.incomeSection}>
            <Text style={styles.incomeSectionTitle}>들어온 기록</Text>
            {selectedIncomeExpenses.map((r) => {
              const cat = CATEGORY_BY_TOKEN[r.category];
              return (
                <Pressable key={r.id} style={styles.incomeRow} onPress={() => openEdit(r)}>
                  <Text style={styles.incomeIcon}>{cat?.emoji ?? '·'}</Text>
                  <Text style={styles.incomeLabel}>{cat?.label ?? r.category}</Text>
                  {r.amount > 0 && (
                    <Text style={styles.incomeAmount}>{r.amount.toLocaleString()}원</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
```

Note: `openEdit(r)` reuses the existing edit-sheet handler. Task 10 updates the edit sheet's picker to derive its pool from `editingExpense.kind`.

- [ ] **Step 4: Add styles**

In the `StyleSheet.create({ ... })` block at the bottom of `stats.tsx`, add:

```ts
  incomeSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  incomeSectionTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 8,
  },
  incomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  incomeIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
  },
  incomeLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    marginLeft: 4,
  },
  incomeAmount: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
```

- [ ] **Step 5: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 6: Verify no totals/counts language sneaked in**

Run:
```
Select-String -Pattern "수입|이번 달 들어온|들어온 돈|총 수입|합계|N개" -Path "소박이\src\pages\stats.tsx"
```
Expected: zero matches. (If a legitimate use case appears, escalate — this grep is the anti-pattern tripwire.)

- [ ] **Step 7: Commit**

```
git add 소박이/src/pages/stats.tsx
git commit -m "feat(stats): quiet income section in selected-day card"
```

---

## Task 10: Stats — edit sheet picker derivation + `commitEdit` kind consistency

**Files:**
- Modify: `소박이/src/store/expenseStore.ts`
- Modify: `소박이/src/services/expenseService.ts`
- Modify: `소박이/src/pages/stats.tsx`

The edit sheet must:
1. Show the picker pool matching `editingExpense.kind` (no kind toggle visible).
2. On save, re-derive kind via `kindForCategory(selectedCategory)` and persist it through `updateExpense`.

- [ ] **Step 1: Extend `ExpensePatch` to carry `kind`**

In `소박이/src/store/expenseStore.ts`, find:

```ts
import { create } from 'zustand';
import { Expense, ExpenseCategory } from '../types';
import { getLocalDateString } from '../utils/date';

interface ExpensePatch {
  amount: number;
  category: ExpenseCategory;
  memo?: string;
}
```

Replace with:

```ts
import { create } from 'zustand';
import { Expense, ExpenseCategory, RecordKind } from '../types';
import { getLocalDateString } from '../utils/date';

interface ExpensePatch {
  amount: number;
  category: ExpenseCategory;
  memo?: string;
  kind: RecordKind;
}
```

Find the `updateExpense` action:

```ts
  updateExpense: (id, patch) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, amount: patch.amount, category: patch.category, memo: patch.memo } : e,
      ),
    })),
```

Replace with:

```ts
  updateExpense: (id, patch) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id
          ? { ...e, amount: patch.amount, category: patch.category, memo: patch.memo, kind: patch.kind }
          : e,
      ),
    })),
```

- [ ] **Step 1b: Update the service-layer `updateExpense` patch type**

`expenseService.ts` exports a `updateExpense` wrapper that calls the store action and persists to storage. Its patch type must also accept `kind`.

In `소박이/src/services/expenseService.ts`, find:

```ts
export function updateExpense(
  id: string,
  patch: { amount: number; category: ExpenseCategory; memo?: string },
): void {
  useExpenseStore.getState().updateExpense(id, patch);
  void storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
}
```

Replace with:

```ts
export function updateExpense(
  id: string,
  patch: { amount: number; category: ExpenseCategory; memo?: string; kind: RecordKind },
): void {
  useExpenseStore.getState().updateExpense(id, patch);
  void storageService.save(STORAGE_KEYS.EXPENSES, useExpenseStore.getState().expenses);
}
```

Ensure `RecordKind` is imported in `expenseService.ts`. Find:

```ts
import { Expense, ExpenseCategory, UserState } from '../types';
```

Replace with:

```ts
import { Expense, ExpenseCategory, UserState, RecordKind } from '../types';
```

- [ ] **Step 1c: Grep for all callers of `updateExpense`**

Run:
```
Select-String -Pattern "updateExpense\(" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```

Expected: matches are confined to `stats.tsx` (the edit-sheet `commitEdit` handler), plus the definitions in `expenseService.ts` and `expenseStore.ts`. If there are any other callers, each must be updated in this task to pass `kind` per the new patch contract.

- [ ] **Step 2: Update `CategorySelector` usage in stats.tsx edit sheet**

In `소박이/src/pages/stats.tsx`, find the `CategorySelector` invocation inside the edit sheet (the bottom-sheet block with `editingExpense`, `editAmount`, `editCategory`, `editMemo` state). Likely shape:

```tsx
              <CategorySelector
                selected={editCategory}
                onSelect={setEditCategory}
              />
```

Add the `categories` prop derived from the editing expense's kind. First find or add the imports:

```ts
import {
  GENERAL_SPENDING_CATEGORIES,
  INCOME_CATEGORIES,
  kindForCategory,
} from '../constants/categories';
```

(`kindForCategory` may already be imported. Check the import block; add any missing.)

Then in `StatsScreen()`, near `editingExpense` state, add a derived value:

```ts
  const editingExpensePool = useMemo(() => {
    if (!editingExpense) return GENERAL_SPENDING_CATEGORIES;
    return editingExpense.kind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES;
  }, [editingExpense]);
```

Replace the `CategorySelector` invocation:

```tsx
              <CategorySelector
                selected={editCategory}
                onSelect={setEditCategory}
                categories={editingExpensePool}
              />
```

- [ ] **Step 3: Update `commitEdit` to pass `kind` through the patch**

Find the `commitEdit` handler. Likely shape:

```ts
  const commitEdit = useCallback(() => {
    if (!editingExpense) return;
    updateExpense(editingExpense.id, {
      amount: editAmount,
      category: editCategory,
      memo: editMemo.trim() || undefined,
    });
    closeEdit();
  }, [editingExpense, editAmount, editCategory, editMemo]);
```

Replace with:

```ts
  const commitEdit = useCallback(() => {
    if (!editingExpense) return;
    updateExpense(editingExpense.id, {
      amount: editAmount,
      category: editCategory,
      memo: editMemo.trim() || undefined,
      kind: kindForCategory(editCategory),
    });
    closeEdit();
  }, [editingExpense, editAmount, editCategory, editMemo]);
```

If the existing code does not destructure `updateExpense` from the store, adjust the invocation accordingly while preserving the new `kind` field.

- [ ] **Step 4: Typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: only the 2 pre-existing `_404.tsx` errors.

- [ ] **Step 5: Run the full suite**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: green, count unchanged.

- [ ] **Step 6: Commit**

```
git add 소박이/src/store/expenseStore.ts 소박이/src/pages/stats.tsx
git commit -m "feat(stats): edit sheet picker derives from kind; commitEdit persists derived kind"
```

---

## Task 11: Verify income save → reaction → stats flow

**Files:** none (verification only)

Final regression checkpoint before docs. No new code; trace through the file paths and run final assertions.

- [ ] **Step 1: Full typecheck**

Run from `소박이/`: `npm run typecheck`
Expected: 2 pre-existing `_404.tsx` errors only.

- [ ] **Step 2: Full Jest**

Run from `소박이/`: `npm test 2>&1 | Select-Object -Last 6`
Expected: `Test Suites: 15 passed, 15 total | Tests: 243 passed, 243 total` (229 baseline + 7 categoryRegistry + 7 expenseHydration). Exact match.

- [ ] **Step 3: Anti-pattern greps across `src/` tree**

Each MUST return zero or only-comment matches:

```
Select-String -Pattern "수입 총액|순수익|net profit|이번 달 들어온 돈|총 수입" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```
Expected: zero matches.

```
Select-String -Pattern "PICKER_CATEGORIES" -Path "소박이\src\**\*.ts","소박이\src\**\*.tsx" -Recurse
```
Expected: zero matches (was removed in Task 4).

- [ ] **Step 4: Preservation greps (must still match)**

```
Select-String -Pattern "recordNoSpend|no_spend|hasRecordOnSelectedDate" -Path "소박이\src\pages\record.tsx"
```
Expected: matches present — no-spend flow preserved.

```
Select-String -Pattern "openEdit|commitEdit|commitDelete" -Path "소박이\src\pages\stats.tsx"
```
Expected: matches present — edit sheet handlers preserved.

```
Select-String -Pattern "selectStatsObservation|MonthPresenceRow" -Path "소박이\src\pages\stats.tsx"
```
Expected: matches present — sub-spec C surfaces untouched.

- [ ] **Step 5: Trace through code-level "happy path"**

Read the following sections of the changed files and confirm code matches expectations:

1. `record.tsx` — toggle handler resets state correctly; `derivedKind = kindForCategory(category)`; income save sets `sobagiEmotion = 'happy'`; expense object includes `kind: derivedKind`.
2. `useAppInit.ts` — hydrate path uses `expenses.map(normalizeExpense)`; downstream calls use `normalized`.
3. `expenseService.ts` — `normalizeExpense` exported; no other changes to `saveExpense` / `recordNoSpend` / `updateExpense` / `deleteExpense`.
4. `categories.ts` — `kindForCategory`, `SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES` exported; `PICKER_CATEGORIES` removed.
5. `CategorySelector.tsx` — `categories` prop accepted with default `GENERAL_SPENDING_CATEGORIES`.
6. `PhotocardView.tsx` — `PhotocardRecord.kind?` field; amount column hide rule.
7. `reaction.tsx` — `photocardRecords` mapping includes `kind: e.kind`.
8. `stats.tsx` — `selectedSpendingExpenses` filter excludes income; `selectedIncomeExpenses` exists; income section JSX renders; edit sheet picker derived from `editingExpensePool`; `commitEdit` passes `kind` in patch.
9. `expenseStore.ts` — `ExpensePatch.kind: RecordKind` required; `updateExpense` writes `kind`.

- [ ] **Step 6: Optional — update `SOBAGI_CURRENT_STATE.md`**

If the docs convention applies (it has at every recent landing), update:

- `소박이/docs/SOBAGI_CURRENT_STATE.md` — replace the Latest Handoff with the sub-spec A summary; add a row to the System Status table (`Income record data model — sub-spec A` complete; sub-spec B and C pending).
- `소박이/docs/SOBAGI_NEXT_PRIORITIES.md` — add "Photocard 3-way redesign (sub-spec B)" and "System integration for income (sub-spec C)" as the top two items.

Commit as a separate commit:

```
git add 소박이/docs/SOBAGI_CURRENT_STATE.md 소박이/docs/SOBAGI_NEXT_PRIORITIES.md
git commit -m "docs: income record data model sub-spec A landing"
```

- [ ] **Step 7: Optional — update memory note**

`feedback_sobagi_allowance_giving_scene.md` previously locked "do not add income tracking." That lock has been narrowed by this landing. The memory should be updated to reflect:

- `allowance` 🫶 stays giving-direction (unchanged)
- `gift` 🎁 stays giving-direction (unchanged)
- `received_allowance` 🤲 and `received_gift` 💝 are the new receiving counterparts (separate tokens)
- The broader "no income tracking" rule is replaced with: "Income is recordable as a life event; do not add finance dashboard / budgeting / accounting framing."

This is the kind of memory update that should happen as part of the sub-spec A landing handoff. Not a code change; just a memory note refresh.

---

## Verification matrix (cross-reference with spec success criteria)

| Spec criterion | Verified by |
|---|---|
| `RecordKind` + `Expense.kind` defined; `ExpenseCategory` extended with 5 income tokens | Task 2 (types) |
| Registry has `kind` on every entry; income entries present with correct icons | Task 3 |
| `kindForCategory`, `SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES` exported; `PICKER_CATEGORIES` removed | Task 4 + Task 11 Step 3 grep |
| `normalizeExpense` corrects missing/mismatched `kind`; applied at app init read path | Task 5 |
| `CategorySelector` accepts `categories` prop; default = `GENERAL_SPENDING_CATEGORIES` | Task 4 Step 4 |
| Record screen has kind toggle; resets category/amount on switch | Task 7 Step 2 + Step 5 |
| Income amount optional (canSave = !isSaving for income) | Task 7 Step 3 |
| Income save sets sobagiEmotion = 'happy'; `derivedKind = kindForCategory(category)` | Task 7 Step 4 |
| No-spend button + saveHelper hidden under income mode | Task 7 Step 3 + Step 6 |
| PhotocardView hides `₩ 0` for income amount=0 records | Task 6 Step 1 |
| reaction.tsx photocard caller passes `kind` | Task 6 Step 2 |
| stats.tsx day-photocard caller passes `kind` | Task 8 Step 4 |
| `selectedSpendingExpenses` excludes income | Task 8 Step 2 |
| `topCategoryThisMonth` excludes income | Task 8 Step 3 |
| `selectedIncomeExpenses` + income section JSX renders read-only list with optional amount | Task 9 |
| Income row taps open existing edit sheet | Task 9 Step 3 + Task 10 |
| Edit sheet picker pool derived from `editingExpense.kind`; kind toggle not shown | Task 10 Step 2 |
| `commitEdit` re-derives kind via `kindForCategory(selectedCategory)` and persists it | Task 10 Step 3 |
| `updateExpense` (store) writes `kind` | Task 10 Step 1 |
| New tests: categoryRegistry + expenseHydration; existing suites stay green | Tasks 4, 5, 11 |
| No spending-only assumptions left in shared helpers | Task 4 (helpers explicit) + Task 11 trace |
| No "수입 총액 / 순수익 / balance" framing | Task 9 Step 6 grep + Task 11 Step 3 grep |
| No accidental change to no-spend marker flow | Task 7 Step 3 (canNoSpend gated on spending mode) + Task 11 Step 4 grep |
| No accidental change to existing spending save/reaction/edit | Task 11 Step 5 code-level trace |
