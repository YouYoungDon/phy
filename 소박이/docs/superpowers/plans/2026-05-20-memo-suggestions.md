# Memo Suggestions + Wrapped Category Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a horizontal row of memo hint chips below the (now-wrapped) category chip grid. Tapping a hint fills or appends to the memo field, respecting the 60-char cap and skipping duplicates. The 12 scene tokens become visible at once via wrap layout.

**Architecture:** Single new component + helper for memo merging. Static suggestion data lives in the existing `categories.ts` source of truth. No new storage, no taxonomy change, no service touches.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Jest 29.

**Spec:** `docs/superpowers/specs/2026-05-20-memo-suggestions-design.md`

---

## File Structure

**Create:**
- `src/components/expense/MemoSuggestions.tsx` — component + exported `appendMemoSuggestion` helper.
- `__tests__/memoSuggestions.test.ts` — pure-function tests for the helper.

**Modify:**
- `src/constants/categories.ts` — add `memoSuggestions: string[]` field to `ExpenseCategoryMeta`; populate all 13 entries.
- `src/components/expense/CategorySelector.tsx` — switch horizontal `ScrollView` → wrapped `View`; update `styles.row`.
- `src/pages/record.tsx` — add import; render `<MemoSuggestions />` inside the existing category section.
- `docs/SOBAGI_CURRENT_STATE.md`, `docs/SOBAGI_NEXT_PRIORITIES.md` — handoff (Task 5).

**Unchanged:** all services, hooks, stores, types, routes, the migration, and every other surface (reaction / photocard / stats / room / history).

---

## Task 1: Data — `memoSuggestions` field + 13 entries

**Files:**
- Modify: `src/constants/categories.ts`

- [ ] **Step 1: Add `memoSuggestions` to `ExpenseCategoryMeta` and populate every entry**

Edit `src/constants/categories.ts`. Update the `ExpenseCategoryMeta` interface:

```ts
export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
}
```

Update each entry in the `CATEGORIES` array to include its `memoSuggestions` value. The full replacement of the `CATEGORIES` constant:

```ts
export const CATEGORIES: readonly ExpenseCategoryMeta[] = [
  { key: 'cafe',       label: '카페',     emoji: '☕',  inPicker: true,  memoSuggestions: ['아메리카노', '라떼', '디저트', '테이크아웃', '브런치'] },
  { key: 'home_meal',  label: '집밥',     emoji: '🍚',  inPicker: true,  memoSuggestions: ['장보기', '반찬', '과일', '간식', '밀키트'] },
  { key: 'dining_out', label: '외식',     emoji: '🍽️', inPicker: true,  memoSuggestions: ['떡볶이', '제육', '돈까스', '국밥', '마라탕', '초밥', '햄버거'] },
  { key: 'transport',  label: '이동',     emoji: '🚌',  inPicker: true,  memoSuggestions: ['지하철', '버스', '택시', '주유', '주차'] },
  { key: 'living',     label: '생활',     emoji: '🏠',  inPicker: true,  memoSuggestions: ['세제', '휴지', '생필품', '다이소', '편의점'] },
  { key: 'hobby',      label: '취미',     emoji: '🎀',  inPicker: true,  memoSuggestions: ['다꾸', '문구', '책', '영화', '전시', '게임'] },
  { key: 'gift',       label: '선물',     emoji: '🎁',  inPicker: true,  memoSuggestions: ['생일선물', '꽃', '편지', '포장', '기프티콘'] },
  { key: 'pet',        label: '반려동물', emoji: '🐾',  inPicker: true,  memoSuggestions: ['사료', '간식', '미용', '장난감', '병원'] },
  { key: 'travel',     label: '여행',     emoji: '✈️', inPicker: true,  memoSuggestions: ['숙소', '기차', '비행기', '맛집', '기념품'] },
  { key: 'health',     label: '병원',     emoji: '💊',  inPicker: true,  memoSuggestions: ['약', '진료', '검진', '영양제', '치료'] },
  { key: 'event',      label: '경조사',   emoji: '💌',  inPicker: true,  memoSuggestions: ['축의금', '부의금', '답례', '모임', '가족행사'] },
  { key: 'allowance',  label: '용돈',     emoji: '🫶',  inPicker: true,  memoSuggestions: ['부모님', '아이', '조카', '용돈', '챙김'] },
  { key: 'no_spend',   label: '무지출',   emoji: '🌿',  inPicker: false, memoSuggestions: [] },
] as const;
```

Note: ordering matches the existing picker order. `no_spend` keeps `inPicker: false` and gets an empty `memoSuggestions` array.

Nothing else in `categories.ts` changes — `CATEGORY_BY_TOKEN`, `PICKER_CATEGORIES`, `formatCategoryWithEmoji`, and `formatCategoryLabel` all keep their current implementations.

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output. (If a downstream consumer somehow uses `ExpenseCategoryMeta` without `memoSuggestions`, TypeScript will surface it here — that's the goal.)

- [ ] **Step 3: Run the full test suite**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/constants/categories.ts && git commit -m "$(cat <<'EOF'
feat: add memoSuggestions to category metadata

Each scene category gets 5-7 plain Korean memo hint strings used later
by a MemoSuggestions component. no_spend gets an empty array since it
never renders in the picker. No taxonomy changes, no storage.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wrapped category chip layout

**Files:**
- Modify: `src/components/expense/CategorySelector.tsx`

- [ ] **Step 1: Switch horizontal ScrollView to wrapped View**

Edit `src/components/expense/CategorySelector.tsx`.

Update the imports — `ScrollView` is no longer needed:

```tsx
import React from 'react';
import { Text, Pressable, View, StyleSheet } from 'react-native';
import { ExpenseCategory } from '../../types';
import { PICKER_CATEGORIES } from '../../constants/categories';
import { COLORS } from '../../constants/colors';
```

(`ScrollView` removed; `View` added if not already present in the import list.)

Update the JSX — replace the `<ScrollView ...>` block with a wrapped `<View>`:

```tsx
export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <View style={styles.row}>
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
    </View>
  );
}
```

Update `styles.row` to enable wrap layout:

```ts
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
```

(`paddingVertical: 2` removed — wrapped flex layout doesn't need it; each chip's padding handles tap area.)

Everything else in the styles block stays exactly as it landed in the Record polish: `chip`, `chipSelected`, `emoji`, `label`, `labelSelected` are unchanged. Do not modify them.

- [ ] **Step 2: Typecheck**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output.

- [ ] **Step 3: Full test suite**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/components/expense/CategorySelector.tsx && git commit -m "$(cat <<'EOF'
style: wrap CategorySelector chips so all 12 scenes are visible at once

Replaces the horizontal ScrollView with a wrapped View. All 12 scene
tokens now lay out in ~3 rows on standard mobile widths. Natural chip
widths preserved (no forced grid). Chip styling unchanged from the
recent Record polish.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `MemoSuggestions` component + tests

**Files:**
- Create: `src/components/expense/MemoSuggestions.tsx`
- Create: `__tests__/memoSuggestions.test.ts`

- [ ] **Step 1: Write failing tests for the helper**

Create `__tests__/memoSuggestions.test.ts`:

```ts
import { appendMemoSuggestion } from '../src/components/expense/MemoSuggestions';

describe('appendMemoSuggestion', () => {
  it('returns the suggestion when memo is empty', () => {
    expect(appendMemoSuggestion('', '라떼')).toBe('라떼');
  });

  it('returns the suggestion when memo is whitespace only', () => {
    expect(appendMemoSuggestion('   ', '라떼')).toBe('라떼');
  });

  it('appends with ", " separator when memo has content', () => {
    expect(appendMemoSuggestion('아메리카노', '디저트')).toBe('아메리카노, 디저트');
  });

  it('trims trailing whitespace before appending', () => {
    expect(appendMemoSuggestion('라떼 ', '디저트')).toBe('라떼, 디저트');
  });

  it('returns original memo when suggestion is already present as a comma-separated token', () => {
    expect(appendMemoSuggestion('아메리카노, 디저트', '디저트')).toBe('아메리카노, 디저트');
  });

  it('returns original memo when appending would exceed 60 chars', () => {
    const long = '아'.repeat(58); // 58 chars
    // Appending ", 라떼" would push to 58 + 4 = 62 chars
    expect(appendMemoSuggestion(long, '라떼')).toBe(long);
  });

  it('allows append that lands exactly at 60 chars', () => {
    // Build a memo where memo.trim() + ', ' + '라떼' === 60 chars
    // '라떼' is 2 chars. ', ' is 2 chars. So memo needs to be 56 chars to land at 60.
    const memo = '아'.repeat(56);
    const result = appendMemoSuggestion(memo, '라떼');
    expect(result.length).toBe(60);
    expect(result).toBe(`${memo}, 라떼`);
  });
});
```

- [ ] **Step 2: Run failing tests**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest __tests__/memoSuggestions.test.ts
```

Expected: FAIL with `Cannot find module '../src/components/expense/MemoSuggestions'`.

- [ ] **Step 3: Implement the component + helper**

Create `src/components/expense/MemoSuggestions.tsx`:

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

/**
 * Pure. Returns the next memo string after merging a suggestion.
 * - Empty / whitespace-only memo → returns the suggestion.
 * - Suggestion already present as a comma-separated token → returns the original memo (no-op).
 * - Final string > MEMO_MAX_LENGTH (60) → returns the original memo (no-op).
 * - Otherwise → trimmed memo + ', ' + suggestion.
 */
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

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest __tests__/memoSuggestions.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Run the full test suite**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 6: Typecheck**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output.

- [ ] **Step 7: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/components/expense/MemoSuggestions.tsx __tests__/memoSuggestions.test.ts && git commit -m "$(cat <<'EOF'
feat: MemoSuggestions component + appendMemoSuggestion helper

Outlined-ghost horizontal chip row that reads suggestions from
CATEGORY_BY_TOKEN[category].memoSuggestions. Tap appends to memo with
", " separator, respects 60-char cap, skips duplicate tokens. Returns
null for no_spend or any category with an empty suggestion list. Pure
helper exported for unit testing — 7 tests covering empty/whitespace/
append/dedupe/length-cap/exact-fit/trailing-trim cases.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire `MemoSuggestions` into `record.tsx`

**Files:**
- Modify: `src/pages/record.tsx`

- [ ] **Step 1: Add the import**

Edit `src/pages/record.tsx`. Add to the existing import block (next to the `CategorySelector` import for proximity):

```tsx
import { MemoSuggestions } from '../components/expense/MemoSuggestions';
```

- [ ] **Step 2: Render the component inside the category section**

Find the category section (after Task 2 of the Record polish landing it looks like this):

```tsx
        {/* Category */}
        <View style={styles.section}>
          <CategorySelector selected={category} onSelect={setCategory} />
        </View>
```

Add the suggestion row inside the same `<View>`:

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

No new styles in `record.tsx`. No state changes. No handler changes. The `<MemoSuggestions>` component manages its own top margin (`marginTop: 10`).

- [ ] **Step 3: Typecheck**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output.

- [ ] **Step 4: Full test suite**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 5: Confirm scope (only record.tsx)**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git status --short
```

Expected: `M  src/pages/record.tsx` only.

- [ ] **Step 6: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/pages/record.tsx && git commit -m "$(cat <<'EOF'
feat: render MemoSuggestions below the category chip grid

One import, one JSX child inside the existing category section. No
state, no handlers, no styles changed. The component manages its own
top margin and renders nothing for no_spend.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Docs handoff

**Files:**
- Modify: `docs/SOBAGI_CURRENT_STATE.md`
- Modify: `docs/SOBAGI_NEXT_PRIORITIES.md`

- [ ] **Step 1: Replace the `## Latest Handoff` section in `SOBAGI_CURRENT_STATE.md`**

Find the existing `## Latest Handoff` block (it currently describes the Record screen polish landing dated 2026-05-20). Replace the entire block between `## Latest Handoff` and the next `---` separator with:

```markdown
## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-20
**Group completed:** Memo suggestions + wrapped category chips

### What changed
- `src/constants/categories.ts` — `ExpenseCategoryMeta` gains `memoSuggestions: string[]`. Each of the 12 scene tokens populated with 5-7 plain Korean hints; `no_spend` gets `[]`.
- `src/components/expense/CategorySelector.tsx` — chip row switches from horizontal `ScrollView` to a wrapped `View` (`flexDirection: 'row', flexWrap: 'wrap', gap: 10`). All 12 scenes visible at once on standard mobile widths.
- `src/components/expense/MemoSuggestions.tsx` (new) — outlined-ghost horizontal chip row below the category grid. Reads suggestions from `CATEGORY_BY_TOKEN[category].memoSuggestions`. Renders nothing for `no_spend` (explicit early return) or when the suggestion list is empty.
- `src/components/expense/MemoSuggestions.tsx` (also exports) — pure `appendMemoSuggestion(memo, suggestion)` helper. Fills empty memos, appends with `', '` separator, skips duplicate tokens, no-ops if the result would exceed 60 chars.
- `src/pages/record.tsx` — adds the import + renders `<MemoSuggestions category={category} memo={memo} onAppend={setMemo} />` inside the existing category section.
- `__tests__/memoSuggestions.test.ts` (new, 7 tests).

### What's now working
- Selecting any scene category surfaces 5-7 quick memo hints in a horizontal row below the chip grid. Tap to fill (empty memo) or append with `', '` (non-empty memo).
- Tapping the same suggestion twice never duplicates. Tapping when the memo is near full (would push past 60 chars) silently no-ops.
- Memo field stays freely editable — the user can type, delete, or mix tapped + typed content.
- All 12 scene tokens are visible at once via the wrap layout; no horizontal scroll on the chip row.
- `no_spend` surfaces only via the no-spend button on the Record screen and never renders suggestions.

### Fragile / surprising
- The exported `appendMemoSuggestion` helper is testable but never consumed by `record.tsx`. The component owns the merge internally; the export exists for unit tests. Don't refactor it to be called from the parent.
- `MEMO_MAX_LENGTH` (60) is defined in `MemoSuggestions.tsx` and mirrors the `maxLength={60}` already on the memo `TextInput` in `record.tsx`. If one changes, the other should too.
- Wrapped chip layout drops the previous `ScrollView` import from `CategorySelector.tsx`. Don't reintroduce horizontal scrolling for the chip row — the user-facing intent is "all scenes visible at once."
- The pressed-state on suggestion chips is `opacity: 0.55` only. There is intentionally no persistent selected state — suggestions are hints, not a selection layer.

### What the next agent must NOT do
- Don't store the tapped suggestion separately. The choice exists only as memo text.
- Don't add analytics on which suggestions are tapped.
- Don't add a subcategory taxonomy or any second axis on `ExpenseCategory`.
- Don't add user-editable suggestion lists (every user gets the same static list per category).
- Don't reintroduce a label heading above the chip row.
- Don't add a persistent selected state on suggestion chips.
- Don't change the memo `maxLength={60}` without also updating `MEMO_MAX_LENGTH` in `MemoSuggestions.tsx`.

### Next
Stats screen evolution remains the next major polish landing — tone review, rhythm summaries, small additive pattern-signal surface, visual density review. Held until product owner re-opens.
```

- [ ] **Step 2: Update `SOBAGI_NEXT_PRIORITIES.md`**

The current top line reads:
```
**Last updated:** 2026-05-20 (Engineering — record screen polish landed)
```

Replace with:
```
**Last updated:** 2026-05-20 (Engineering — memo suggestions + wrapped chips landed)
```

Add a new entry at the very top of `## Recently completed`:

```markdown
- [x] **Memo suggestions + wrapped category chips** — each scene category gains 5-7 plain Korean memo hints via `ExpenseCategoryMeta.memoSuggestions`. New `MemoSuggestions` component renders an outlined-ghost horizontal row below the chip grid; tap appends with `', '`, skips duplicates, respects the 60-char memo cap. `CategorySelector` switches from horizontal scroll to a wrapped layout so all 12 scenes are visible at once. `no_spend` renders no suggestions. 7 new tests on the pure `appendMemoSuggestion` helper. (2026-05-20)
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add docs/SOBAGI_CURRENT_STATE.md docs/SOBAGI_NEXT_PRIORITIES.md && git commit -m "$(cat <<'EOF'
docs: memo suggestions + wrapped chips handoff

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Visual QA (small phones)

After Task 5, before final review:

- [ ] Boot the app via `npx ait dev` on the smallest available device target (or a 375 CSS-px simulator).
- [ ] Open `/record`. Confirm:
  - All 12 wrapped category chips fit on screen without horizontal scroll.
  - The natural wrap lands ~3-4 chips per row × ~3 rows; longer labels (`반려동물`, `경조사`) remain readable.
  - Suggestion row sits immediately below the wrapped chip grid, scrolls horizontally without clipping.
  - The amount card sits ABOVE the category section. After the layout change, the amount card and memo input should both still be reachable on a single screen without excessive scroll.
  - Tapping a suggestion fills the memo input as expected; tapping a second suggestion appends with `, ` separator.
- [ ] If the combined density looks too crowded on small phones, the simplest remedy is reducing the category section's `marginBottom` in `record.tsx` from `24` to `16`. Only adjust if verified visually — no preemptive change.

If you adjust margin during QA, land it as a small follow-up commit (`style: tighten category section spacing on small phones`) — do NOT amend prior commits.

---

## Final verification

After Task 5 + visual QA:

- [ ] Full test suite: `cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService` — all green.
- [ ] Typecheck: `cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404"` — empty.
- [ ] Five focused commits total (one per task). No bundled changes.

The plan ships entirely as polish + new presentation surface — no taxonomy changes, no storage, no analytics, no service touches.
