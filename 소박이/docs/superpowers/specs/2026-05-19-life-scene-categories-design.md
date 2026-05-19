# Life-Scene Categories — Design Spec

**Date:** 2026-05-19
**Status:** Approved (taxonomy locked by product owner)
**Branch target:** apps-in-toss-clean

---

## Goal

Replace the current 5-bucket expense taxonomy (`cafe / food / transport / shopping / other`) with a 12-category "life scene" taxonomy. Recording should feel like *"I'm recording what kind of day this was"* — not *"I'm classifying financial transactions."*

`no_spend` continues to exist as a separate daily-presence marker — not a normal category, not exposed in the picker.

## Philosophy

- Categories represent scenes and emotional context, not accounting buckets.
- Each category is room-presence-friendly — it can later seed a quiet object trace (e.g. `cafe → mug`, `hobby → ribbons`, `pet → cushion`, `travel → postcard`, `home_meal → kitchen traces`, `gift → wrapping traces`).
- Avoid corporate/accounting language in labels and copy.
- No nested categories, no budgeting features, no taxonomy depth — flat list only.
- The picker is a quiet selector, not a dashboard.

## Final Taxonomy

| Token | Emoji | Label | Scene |
|---|---|---|---|
| `cafe` | ☕ | 카페 | 카페 방문 |
| `home_meal` | 🍚 | 집밥 | 집에서 먹은 끼니, 장보기 |
| `dining_out` | 🍽️ | 외식 | 식당, 배달, 테이크아웃 |
| `transport` | 🚌 | 이동 | 교통수단 (토큰 유지, 라벨만 변경) |
| `living` | 🏠 | 생활 | 생필품, 잡화, 가벼운 일상 지출 |
| `gift` | 🎁 | 선물 | 누군가에게 주는 선물 |
| `hobby` | 🎀 | 취미 | 취미, 작은 자기 대접 |
| `pet` | 🐾 | 반려동물 | 사료, 간식, 미용 등 |
| `travel` | ✈️ | 여행 | 여행 관련 모든 것 |
| `health` | 💊 | 병원 | 진료, 약, 검진 |
| `event` | 💌 | 경조사 | 결혼식, 장례식, 답례 |
| `allowance` | 🫶 | 용돈 | 부모님 / 아이 / 누군가에게 드리는 돈 |

Separate marker (NOT in picker):
| Token | Emoji | Label |
|---|---|---|
| `no_spend` | 🌿 | 무지출 |

### Picker ordering

The picker is a single horizontal scroll. Order reflects daily-frequency clustering — the most-recorded scenes lead, with weekly/occasional scenes trailing.

1. `cafe`
2. `home_meal`
3. `dining_out`
4. `transport`
5. `living`
6. `hobby`
7. `gift`
8. `pet`
9. `travel`
10. `health`
11. `event`
12. `allowance`

Default selection on new record: `cafe` (matches current behaviour).

## Architecture — single source of truth

Today, three files duplicate `CATEGORY_LABELS`:
- `src/pages/reaction.tsx`
- `src/pages/stats.tsx`
- `src/components/expense/ExpenseCard.tsx`

Plus the picker list lives separately in `src/components/expense/CategorySelector.tsx`.

**New module:** `src/constants/categories.ts`

Exports:
```ts
export interface ExpenseCategoryMeta {
  key: ExpenseCategory;          // type-narrowed token
  label: string;                 // soft Korean label
  emoji: string;                 // single emoji
  inPicker: boolean;             // false for no_spend
}

export const CATEGORIES: readonly ExpenseCategoryMeta[];  // ordered list
export const CATEGORY_BY_TOKEN: Record<ExpenseCategory, ExpenseCategoryMeta>;
export const PICKER_CATEGORIES: readonly ExpenseCategoryMeta[]; // CATEGORIES.filter(c => c.inPicker)
```

All four consuming files (`CategorySelector`, `reaction.tsx`, `stats.tsx`, `ExpenseCard.tsx`) replace their local `CATEGORY_LABELS` constants with imports from `categories.ts`. No more duplication.

This is scope-limited cleanup of code we're already touching — not unrelated refactoring.

## Type Changes

`src/types/index.ts`:

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

Old tokens (`food`, `shopping`, `other`) are removed from the union. They live on only as input keys in the migration table below.

## Backward Compatibility — Migration Table

Existing user records persist in storage under old tokens. A one-time, idempotent migration runs at app init.

| Old token | New token | Reason |
|---|---|---|
| `cafe` | `cafe` | identity |
| `food` | `dining_out` | restaurant/takeout dominates real-world food spending |
| `transport` | `transport` | identity (label-only rename) |
| `shopping` | `living` | general daily-life shopping fits 생활 best |
| `other` | `living` | generic catch-all → daily living |
| `no_spend` | `no_spend` | identity |

Migration is best-effort: a 2-month-old "shopping" record cannot be re-tagged perfectly. Users can correct individual records via the existing edit flow if they care.

### Migration module

`src/services/expenseMigration.ts`

```ts
const LEGACY_CATEGORY_MAP: Record<string, ExpenseCategory> = {
  food: 'dining_out',
  shopping: 'living',
  other: 'living',
  // new tokens map to themselves implicitly — function passes through
};

// Pure: returns transformed array if any record changed, else returns input.
export function migrateExpenseCategories(expenses: Expense[]): Expense[];

// IO wrapper: load → migrate → save (only if changed). Idempotent.
export async function runExpenseCategoryMigration(): Promise<void>;
```

Called once from `useAppInit` before any consumer reads expenses.

A `STORAGE_KEYS.CATEGORY_MIGRATION_DONE` boolean flag is stored so the migration only runs once per install. If a user reinstalls or the flag is cleared, re-running is safe (pure mapping; tokens that already match the new union pass through).

## Downstream Impact

### `dayFeelingService.ts`

Bucket-trigger logic is keyed on token names. Surgical updates:

| Bucket | Old logic | New logic |
|---|---|---|
| `caffeinated` | `cafe ≥ 2` | unchanged |
| `warm` | `food ≥ 2` OR `food + cafe ≥ 1+1` | `(home_meal + dining_out) ≥ 2` OR `(home_meal OR dining_out ≥ 1) + (cafe ≥ 1)` |
| `sweet` | small (`<6000`) cafe/food | small (`<6000`) `cafe`/`home_meal`/`dining_out` |
| `selfcare` | `shopping` present | `hobby` present — 취미 is the new "small treat to self" |
| `active` | `transport` + ≥3 distinct | unchanged |
| `quiet` | `total < 8000` | unchanged |
| `hard` | user emotion override | unchanged |

`buildObservations` keys (cafeCount / foodCount / `transport` / `shopping`) update the same way:
- `foodCount` → `homeMealCount + diningOutCount`
- shopping observation (`'뭔가 사기도 했어요 🛍️'`) → hobby observation (`'좋아하는 일에 시간을 썼어요 🎀'`)

### `roomPresenceService.ts` / `bagItems.ts`

`CATEGORY_TRIGGERS.cafe` (3 records / 3 distinct days / 14 days → mug) — **unchanged**. The `cafe` token survives the rename.

`bagItems.m5 머그컵.categoryAffinity: ['cafe']` — **unchanged**.

Future room-presence triggers (`hobby → ribbons`, `pet → cushion`, etc.) are out of scope for this spec. They become trivial to add once the new tokens exist.

### `photocard` components

`reaction.tsx` and `stats.tsx` already filter `no_spend` out of `photocardRecords`. With the new taxonomy, every other token is a normal scene — no filter changes needed. The photocard's `CATEGORY_LABELS` local map gets replaced by the new shared source.

### `record.tsx` / `CategorySelector.tsx`

`CategorySelector` becomes a thin component over `PICKER_CATEGORIES`. The "오늘은 무지출이에요" button (separate from the picker) keeps its current placement — `no_spend` stays a daily-presence button, not a chip.

Default-selected category in `record.tsx` stays `cafe`.

### `expenseStore.ts`

Type alias change only; no logic changes.

## UI Notes

- Picker stays horizontal-scrollable. 12 chips fit comfortably with current chip width (`paddingHorizontal: 16`).
- Emoji + label pairing unchanged. Soft, readable.
- `🫶` (allowance) is Unicode 14 (2021). Renders on iOS 14.5+, Android 12+. Older Android may fall back to tofu — acceptable given current user base. Document in known-issues if it surfaces.

## Testing

- New: `__tests__/expenseMigration.test.ts` — pure function tests:
  - Old `food` → `dining_out`
  - Old `shopping` → `living`
  - Old `other` → `living`
  - New tokens pass through unchanged
  - `no_spend` passes through unchanged
  - Empty array returns empty array (same reference acceptable)
  - Idempotent: migrating already-migrated data is a no-op
- `__tests__/dayFeelingService.test.ts` (new file) — one test per bucket trigger under the new taxonomy: `caffeinated`, `warm` (both `(home_meal + dining_out) ≥ 2` and combo path), `sweet` (small cafe/home_meal/dining_out), `selfcare` (hobby present), `active`, `quiet`, `hard`. Required given the bucket logic is rewritten.
- Manual QA: record one of each category, verify picker scroll, photocard rendering, stats list rendering, history card label.

## Anti-patterns (out of scope)

Per philosophy notes — these must NOT be introduced by this work:
- Nested categories or subcategory pickers
- Budgeting features
- Per-category spending limits or warnings
- Achievement/streak framing tied to categories
- Treating `no_spend` as a normal expense type
- "You spent X on Y this month" summaries beyond what stats already shows
- Corporate/accounting copy ("지출 항목", "분류" — keep "기록")

## Out of scope for this spec

- Room-presence triggers for the new tokens (`hobby → ribbons`, `pet → cushion`, etc.) — separate spec when designed
- Adding new `BagItem`s tied to the new tokens — same
- dayFeeling bucket expansion (e.g. a `playful` bucket for hobby-heavy days) — same
- Custom user-defined categories — explicitly rejected
- Photocard mood mapping by new category — separate, when art exists

---

## File-level scope

**Create:**
- `src/constants/categories.ts`
- `src/services/expenseMigration.ts`
- `__tests__/expenseMigration.test.ts`

**Modify:**
- `src/types/index.ts` — `ExpenseCategory` union
- `src/constants/storage.ts` — add `CATEGORY_MIGRATION_DONE` key
- `src/components/expense/CategorySelector.tsx` — read from `categories.ts`
- `src/components/expense/ExpenseCard.tsx` — read from `categories.ts`
- `src/pages/reaction.tsx` — remove local `CATEGORY_LABELS`, import from `categories.ts`
- `src/pages/stats.tsx` — same
- `src/services/dayFeelingService.ts` — bucket-trigger updates per table above
- `src/hooks/useAppInit.ts` — call `runExpenseCategoryMigration()` once per session

**Unchanged:**
- `src/services/roomPresenceService.ts` (`CATEGORY_TRIGGERS.cafe` survives)
- `src/constants/bagItems.ts` (`m5 머그컵.categoryAffinity: ['cafe']` survives)
- `src/services/foundItemService.ts` (no category-keyed logic)

---

## Success criteria

- Recording a new expense shows the 12 life-scene chips, ordered as listed.
- Old records migrate cleanly on first launch and never re-migrate after.
- Stats / photocard / history all render the new emoji + label.
- `dayFeeling` buckets still fire — `caffeinated` / `quiet` / `warm` / `selfcare` work under new tokens.
- The string `식비` / `쇼핑` / `기타` / `교통` does not appear in user-visible copy anywhere except migrated record edit history (if any).
- No new financial language is introduced anywhere in the UI.
