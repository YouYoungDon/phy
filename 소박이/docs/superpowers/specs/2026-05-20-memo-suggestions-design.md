# Memo Suggestions + Wrapped Category Chips — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Branch target:** apps-in-toss-clean

---

## Goal

Help users describe what they recorded without typing from scratch. When a category is selected, show a small row of Korean memo hint chips below the (now-wrapped) category chip grid. Tapping a hint fills or appends to the memo field. Hints are quick suggestions, never required.

Also: stop hiding the 12 scene tokens behind horizontal scroll. Wrap them onto multiple lines so all scenes are visible at a glance.

## Philosophy

- Memo suggestions are *hints*, not a selection layer. No persistent selected state, no required tap, no analytics.
- Suggestions reach the data layer only as memo text. There is no subcategory, no second taxonomy, no extra storage.
- Scene tokens should feel immediately visible. The wrapped layout removes the "scroll to discover" friction of the horizontal layout.
- The Record screen stays calm. Adding both the wrap and the hint row must not crowd the form.

## Section 1 — Data model

**File:** `src/constants/categories.ts`

Add a `memoSuggestions: string[]` field to `ExpenseCategoryMeta`:

```ts
export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
}
```

Populate all 13 entries:

| Token | `memoSuggestions` |
|---|---|
| `cafe` | `['아메리카노', '라떼', '디저트', '테이크아웃', '브런치']` |
| `home_meal` | `['장보기', '반찬', '과일', '간식', '밀키트']` |
| `dining_out` | `['떡볶이', '제육', '돈까스', '국밥', '마라탕', '초밥', '햄버거']` |
| `transport` | `['지하철', '버스', '택시', '주유', '주차']` |
| `living` | `['세제', '휴지', '생필품', '다이소', '편의점']` |
| `gift` | `['생일선물', '꽃', '편지', '포장', '기프티콘']` |
| `hobby` | `['다꾸', '문구', '책', '영화', '전시', '게임']` |
| `pet` | `['사료', '간식', '미용', '장난감', '병원']` |
| `travel` | `['숙소', '기차', '비행기', '맛집', '기념품']` |
| `health` | `['약', '진료', '검진', '영양제', '치료']` |
| `event` | `['축의금', '부의금', '답례', '모임', '가족행사']` |
| `allowance` | `['부모님', '아이', '조카', '용돈', '챙김']` |
| `no_spend` | `[]` |

No emoji on suggestions — plain Korean text only.

The existing `CATEGORIES` array, `CATEGORY_BY_TOKEN`, `PICKER_CATEGORIES`, `formatCategoryWithEmoji`, and `formatCategoryLabel` remain unchanged in shape; they gain only the new field through the metadata addition.

## Section 2 — Wrapped category chips

**File:** `src/components/expense/CategorySelector.tsx`

Switch the chip row from horizontal `ScrollView` to a wrapped `View` so all 12 scene tokens are visible without scrolling.

Replace:
```tsx
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.row}
>
  {PICKER_CATEGORIES.map(...)}
</ScrollView>
```

With:
```tsx
<View style={styles.row}>
  {PICKER_CATEGORIES.map(...)}
</View>
```

Update `styles.row`:

```ts
row: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 10,
},
```

(`paddingVertical: 2` dropped — wrapped flex layout doesn't need it; chips' own padding handles tap area.)

Everything else in `CategorySelector.tsx` stays as it landed in the Record polish: `chip`, `chipSelected` (woodLight background + subtle shadow + elevation 1), `emoji`, `label`, `labelSelected` — all unchanged. The wrap layout naturally lands ~3–4 chips per row × 3 rows on typical mobile widths (375–414px). Chip widths stay natural; no forced equal-width grid.

The `ScrollView` import becomes unused — remove it from the import line. The `Pressable`, `Text`, `View`, `StyleSheet` imports stay.

## Section 3 — MemoSuggestions component

**New file:** `src/components/expense/MemoSuggestions.tsx`

### Component shape

```tsx
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { ExpenseCategory } from '../../types';
import { CATEGORY_BY_TOKEN } from '../../constants/categories';
import { COLORS } from '../../constants/colors';

const MEMO_MAX_LENGTH = 60;

interface MemoSuggestionsProps {
  category: ExpenseCategory;
  memo: string;
  onAppend: (next: string) => void;
}

export function MemoSuggestions({ category, memo, onAppend }: MemoSuggestionsProps) {
  if (category === 'no_spend') return null;

  const meta = CATEGORY_BY_TOKEN[category];
  const suggestions = meta?.memoSuggestions ?? [];
  if (suggestions.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {suggestions.map((s) => (
        <Pressable
          key={s}
          style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          onPress={() => onAppend(appendMemoSuggestion(memo, s))}
        >
          <Text style={styles.label}>{s}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

export function appendMemoSuggestion(memo: string, suggestion: string): string {
  const trimmed = memo.trim();
  if (trimmed === '') return suggestion;

  const tokens = trimmed.split(',').map((t) => t.trim());
  if (tokens.includes(suggestion)) return memo;

  const next = `${trimmed}, ${suggestion}`;
  if (next.length > MEMO_MAX_LENGTH) return memo;

  return next;
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    marginTop: 10,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipPressed: {
    opacity: 0.55,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
});
```

### `appendMemoSuggestion` rules (testable)

| Input memo | Suggestion | Output |
|---|---|---|
| `''` | `'라떼'` | `'라떼'` |
| `'   '` (whitespace only) | `'라떼'` | `'라떼'` |
| `'아메리카노'` | `'디저트'` | `'아메리카노, 디저트'` |
| `'아메리카노, 디저트'` | `'디저트'` (duplicate) | `'아메리카노, 디저트'` (no-op) |
| 58-char memo | suggestion that would push past 60 | original memo (no-op) |
| `'라떼 '` (trailing space) | `'디저트'` | `'라떼, 디저트'` |

### Component rules

- Returns `null` when `category === 'no_spend'` (explicit early return; defensive even though `no_spend.memoSuggestions === []` would also short-circuit).
- Returns `null` when the resolved suggestions list is empty.
- Horizontal `ScrollView` matching the date-chip row rhythm in `record.tsx`.
- Pressed state is `opacity: 0.55` only — no persistent selected state.
- The component is unaware of `setMemo`; it calls `onAppend(next)` with the already-merged string.

### Tests

**New file:** `__tests__/memoSuggestions.test.ts`

Unit tests for the pure helper `appendMemoSuggestion`. Six cases at minimum:

1. Empty memo → returns suggestion
2. Whitespace-only memo → returns suggestion
3. Non-empty memo, new suggestion → comma+space appended
4. Duplicate (already in comma-separated tokens) → original memo unchanged
5. Would exceed `MEMO_MAX_LENGTH` (60) → original memo unchanged
6. Trailing whitespace on memo → trimmed before append

No component-level tests required (presentation-only, no behavior beyond the helper).

## Section 4 — record.tsx wiring

**File:** `src/pages/record.tsx`

### Imports

Add to the existing import block:

```ts
import { MemoSuggestions } from '../components/expense/MemoSuggestions';
```

### Placement

Inside the existing category section, immediately under `<CategorySelector />`:

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

The section wrapper's existing `marginBottom: 24` provides breathing room between the suggestion row and the emotion section below. No new style needed in `record.tsx`. No new state. No handler changes.

### Visual breathing room

`MemoSuggestions` is responsible for its own top margin (`marginTop: 10` on the ScrollView container — already in the Section 3 code block) so the suggestion row sits cleanly under the wrapped category chips. The parent does not manage that gap.

### No keyboard behavior change

Tapping a suggestion only calls `setMemo(next)`. The memo `TextInput` re-renders showing the new value. No focus change, no keyboard open/close. If the user wants to keep typing after a tap, they tap into the memo field as usual.

## Section 5 — Visual QA

After implementation, manually verify on small-phone widths (≤375 CSS px, e.g. iPhone SE):

- Wrapped 12 category chips fit in 3 rows (4-4-4 or similar) without overflow.
- Suggestion row immediately below stays scrollable and doesn't break layout.
- Amount card sits ABOVE the category section; it should not be pushed off-screen.
- Memo input remains reachable below the emotion row without excessive scroll.

If the combined density of (wrapped chips + suggestion row) pushes the form too far down on small phones, the simplest remedy is reducing the category section's `marginBottom: 24` to 16 — but only if visually verified. No preemptive adjustment.

## File-level scope

**Create:**
- `src/components/expense/MemoSuggestions.tsx` — component + `appendMemoSuggestion` helper
- `__tests__/memoSuggestions.test.ts` — helper tests

**Modify:**
- `src/constants/categories.ts` — `memoSuggestions: string[]` field on `ExpenseCategoryMeta`; populate 13 entries
- `src/components/expense/CategorySelector.tsx` — `ScrollView` → wrapped `View`; `styles.row` gains `flexDirection / flexWrap`
- `src/pages/record.tsx` — import + render `<MemoSuggestions />` inside the category section

**Unchanged:**
- `ExpenseCategory` union, taxonomy, migration
- Storage keys, services, hooks, stores, types
- `record.tsx` state, handlers (`handleSave`, `handleNoSpend`), no-spend visibility gate
- Reaction screen, photocard, stats, room presence, day feeling
- `formatCategoryWithEmoji`, `formatCategoryLabel`, `PICKER_CATEGORIES` shape
- All other Record screen surfaces (date chips, amount card, emotion chips, memo input, save button)

## Anti-patterns (out of scope)

This pass must NOT introduce:

- A subcategory taxonomy or any second axis on `ExpenseCategory`
- Storing the suggestion choice separately from the memo text
- Analytics on which suggestions are tapped
- Suggestion sorting by frequency, recency, or popularity
- User-editable suggestion lists
- A persistent selected state on suggestion chips
- Required suggestion taps (memo must remain free-typeable)
- Removing the existing memo input or its `maxLength={60}`
- Reaction loop / photocard / stats / room-presence changes
- Tone shifts on `기록하기`, `오늘을 기록해요 ✏️`, `한마디 (선택)`, `기분은 어때요?`, `저장하기`

## Success criteria

- All 12 scene tokens visible at once (wrap layout) with natural chip widths; longer labels (`반려동물`, `경조사`) remain readable.
- Selecting a category surfaces a horizontal row of 5–7 suggestion hints below the chip grid.
- Selecting `no_spend`-mode (which happens via the no-spend button, not the picker) never renders suggestions.
- Tapping a suggestion fills (if memo empty) or appends with `', '` (if not), respecting the 60-char cap and skipping duplicates.
- The memo field stays freely editable. The user can type, delete, or mix tapped + typed content with no restriction.
- Typecheck passes; new tests for `appendMemoSuggestion` pass; full suite stays green.
- The Record screen still feels calm on small phones — verify before declaring done.
