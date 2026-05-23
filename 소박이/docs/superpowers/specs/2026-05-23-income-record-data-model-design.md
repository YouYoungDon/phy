# Income Record Data Model — Design Spec (Sub-spec A)

**Date:** 2026-05-23
**Status:** Approved
**Branch target:** apps-in-toss-clean
**Parent context:** Photocard direction update introduces 3-way records (쓴 / 들어온 / 무지출). Decomposed into three sub-specs; this is **A**.

| Sub-spec | Scope | Status |
|---|---|---|
| **A (this doc)** | Data model + recording flow + safe interoperability | Approved — proceed to plan |
| B | Photocard 3-way layout redesign | Deferred |
| C | Emotional / system integration (dialogue, presence, pebble, etc.) | Deferred |

---

## Policy Reversal (explicit)

Sobagi previously locked: *"Do not add income tracking, salary tracking, or a 'money received' channel anywhere"* (2026-05-19 spec, `feedback_sobagi_allowance_giving_scene.md`, `SOBAGI_CURRENT_STATE.md`).

**This spec deliberately reverses that lock.** Sobagi now accepts **들어온 기록 (received-money)** as a first-class record kind, including salary. The reversal is narrow:

- The reversed scope is "income as a recordable life event," **not** "Sobagi as a budgeting / accounting tool."
- 결산 / 순이익 / 수익률 / 저축률 framing remains explicitly forbidden.
- `allowance` 🫶 stays as a **giving** scene (the original 2026-05-19 lock for that token specifically is preserved). A new, separate `received_allowance` 🤲 token represents the receiving direction.
- `gift` 🎁 similarly stays outgoing-only. New `received_gift` 💝 token for receiving.

Policy memos and `SOBAGI_CURRENT_STATE.md` will be re-written at the end of sub-spec A landing to reflect the narrower, current rule.

---

## Goal

Extend Sobagi's data model and recording flow so that **들어온 기록** (received-money) can be created, persisted, edited, and viewed without breaking any existing surface. Photocard and downstream system integration are deferred. After sub-spec A, a user can:

1. Create an income record from the existing record screen via a top-of-screen toggle.
2. See income records on the relevant date in Stats (read-only section under the spending list).
3. Edit / delete an income record using the existing edit sheet (with picker behavior derived from the record's kind).
4. Pass through the existing reaction screen after saving an income record without visible breakage.

## Philosophy

- **Categories are life scenes, not accounting buckets** — applies equally to income tokens. "월급" is a scene, not a financial entry.
- **Amount is supporting context** — required for spending (existing behavior), optional for income.
- **Income presence is not income value** — recording that 월급 came in is the event; the exact amount is secondary.
- **Quieter than spending** — income surfaces use muted tone, no totals, no counts, no progress framing.
- **Category is the source of truth** — `kind` is derived. Hydration auto-repairs malformed records rather than throwing.

---

## Section 1 — Architecture & data model

### Type extension

```ts
// src/types/index.ts

export type RecordKind = 'spending' | 'income';

export type ExpenseCategory =
  // existing spending tokens (unchanged)
  | 'cafe' | 'home_meal' | 'dining_out' | 'transport' | 'living'
  | 'gift' | 'hobby' | 'pet' | 'travel' | 'health' | 'event' | 'allowance' | 'no_spend'
  // new income tokens
  | 'salary' | 'bonus' | 'refund' | 'received_gift' | 'received_allowance';

export interface Expense {
  id: string;
  kind: RecordKind;             // NEW. Denormalized cache; source of truth is kindForCategory(category).
  amount: number;               // For income, 0 is a valid value (user entered nothing).
  category: ExpenseCategory;
  sobagiEmotion: SobagiEmotion;
  createdAt: string;
  userEmotion?: string;
  memo?: string;
}
```

### Source of truth

`kindForCategory(category)` (registry-backed lookup) is authoritative. The stored `kind` field is a denormalized convenience for render/query and may be omitted in legacy records or even contradict `category` in malformed data — neither breaks the system.

### Hydration normalization

At read time (`expenseService.load` or the equivalent expenseStore loader), every record runs through:

```ts
function normalizeExpense(raw: Partial<Expense> & { category: ExpenseCategory; amount: number; ... }): Expense {
  const derivedKind = kindForCategory(raw.category);
  return {
    ...raw,
    kind: derivedKind,          // overwrite stored kind with derived kind, always
  } as Expense;
}
```

Behavior:
- Missing `kind` (legacy record) → set to `kindForCategory(category)` (so legacy spending records become `kind: 'spending'`; if a malformed legacy record had `category: 'salary'` it would normalize to `kind: 'income'`).
- Mismatched `kind` (`{ kind: 'spending', category: 'salary' }` or vice versa) → silently corrected to the derived kind.
- No throw, no log noise, no rejection of records. Hydration is forgiving by design.

### Storage

- Storage key (`EXPENSES`) unchanged.
- No migration job. No schema version bump.
- Re-saved records persist explicit `kind`; never-re-saved legacy records keep working via lazy default at read time.
- The runtime behavior is identical whether a stored record contains `kind` or not.

---

## Section 2 — Income categories registry

### Five new income tokens

```ts
// src/constants/categories.ts — append to existing CATEGORIES array

{ key: 'salary',             label: '월급',      emoji: '💼', inPicker: true, kind: 'income', memoSuggestions: [] },
{ key: 'bonus',              label: '보너스',    emoji: '✨', inPicker: true, kind: 'income', memoSuggestions: [] },
{ key: 'refund',             label: '환급',      emoji: '🧾', inPicker: true, kind: 'income', memoSuggestions: [] },
{ key: 'received_gift',      label: '선물 받음', emoji: '💝', inPicker: true, kind: 'income', memoSuggestions: [] },
{ key: 'received_allowance', label: '용돈 받음', emoji: '🤲', inPicker: true, kind: 'income', memoSuggestions: [] },
```

`memoSuggestions` left empty for income tokens in sub-spec A — sub-spec C may add scene-appropriate suggestions if needed.

### Registry meta change

The existing `ExpenseCategoryMeta` interface gains `kind`:

```ts
export interface ExpenseCategoryMeta {
  key: ExpenseCategory;
  label: string;
  emoji: string;
  inPicker: boolean;
  memoSuggestions: string[];
  kind: RecordKind;              // NEW. Every existing entry: 'spending'. New entries: 'income'.
}
```

All existing spending entries (12 tokens + `no_spend`) gain `kind: 'spending'` in the same edit.

### Helpers

```ts
export const SPENDING_CATEGORIES         = CATEGORIES.filter(c => c.kind === 'spending');
export const GENERAL_SPENDING_CATEGORIES = SPENDING_CATEGORIES.filter(c => c.key !== 'no_spend');
export const INCOME_CATEGORIES           = CATEGORIES.filter(c => c.kind === 'income');

export function kindForCategory(c: ExpenseCategory): RecordKind {
  return CATEGORY_BY_TOKEN[c]?.kind ?? 'spending';
}
```

- `SPENDING_CATEGORIES` — full set (includes `no_spend`). Useful for analytics/filter contexts that care about "is this a spending record at all."
- `GENERAL_SPENDING_CATEGORIES` — picker-friendly subset (excludes `no_spend`). Length = 12.
- `INCOME_CATEGORIES` — the 5 income tokens.

**`PICKER_CATEGORIES` resolution:** The existing `PICKER_CATEGORIES = CATEGORIES.filter(c => c.inPicker)` becomes ambiguous after sub-spec A (it would mix spending + income). The implementation plan identifies every consumer of `PICKER_CATEGORIES` and migrates each to either `GENERAL_SPENDING_CATEGORIES` or `INCOME_CATEGORIES` as appropriate (the typical caller is `CategorySelector` consumed from `record.tsx`'s spending mode — that becomes `GENERAL_SPENDING_CATEGORIES`). After migration, `PICKER_CATEGORIES` is **removed** from the registry to prevent accidental future use. No transitional re-export.

### Icon disambiguation (preserves prior policy)

| Existing (outgoing) | New (incoming) | Distinction |
|---|---|---|
| `gift` 🎁 (선물 주기) | `received_gift` 💝 (선물 받음) | 🎁 = wrapped present (giving); 💝 = heart-gift (receiving) |
| `allowance` 🫶 (용돈 주기) | `received_allowance` 🤲 (용돈 받음) | 🫶 = hands-heart (giving); 🤲 = palms-up (receiving) |

Both pairs remain visually distinct in the picker grid.

---

## Section 3 — Recording flow (record.tsx)

### New state

```ts
const [recordKind, setRecordKind] = useState<RecordKind>('spending');
```

### Top-of-form toggle

```
┌─────────────────────────────┐
│  [ 쓴 기록 ]  [ 들어온 기록 ] │   ← segmented; active background = COLORS.oliveGreen
└─────────────────────────────┘
```

- Position: header 아래, date selector 위.
- Toggle styling reuses `dateChip` / `dateChipSelected` shape so the visual language matches existing chips.
- Tap behavior: `setRecordKind(next)`, `setCategory(...default for next pool)`, `setAmountText('')`. Toggle **resets category + amount** because the two modes use different pools and amount semantics.

### Picker swap

`<CategorySelector />` reads from one of two pools depending on `recordKind`:

| `recordKind` | Pool | Default category on enter |
|---|---|---|
| `'spending'` | `GENERAL_SPENDING_CATEGORIES` | `'cafe'` (existing default) |
| `'income'` | `INCOME_CATEGORIES` | `'salary'` |

The `CategorySelector` component takes a `categories` prop (or equivalent) so `record.tsx` can pass the swapped pool. Existing call site continues to work for `spending`.

### Amount input

- `recordKind === 'spending'` — existing behavior (placeholder `금액을 입력해요`, `canSave = amount > 0`).
- `recordKind === 'income'` — placeholder `금액 (선택)`, `canSave = !isSaving` (amount can be 0). Empty input parses to `amount = 0`.
- The existing `saveHelper` text (`지출이 없는 날은 무지출 기록을 사용할 수 있어요 🌿`) is **hidden** when `recordKind === 'income'`. The no_spend affordance and helper text apply only to spending.

### No-spend button

- Visible only when `recordKind === 'spending'`. Hidden under income mode (the no_spend semantic doesn't apply to income presence).

### Save path

```ts
const derivedKind = kindForCategory(category);    // authoritative, not from UI state
const sobagiEmotion = derivedKind === 'income'
  ? 'happy'                                       // sub-spec A: hardcode for income
  : evaluate({ id: '', amount, category, sobagiEmotion: 'happy', createdAt: '' }, ctx);

const expense: Expense = {
  id: Date.now().toString(),
  kind: derivedKind,
  amount,                                         // 0 allowed when income
  category,
  userEmotion,
  memo: memo.trim() || undefined,
  sobagiEmotion,
  createdAt,
};

await saveExpense(expense);
navigation.navigate('/reaction');
```

Important: `derivedKind = kindForCategory(category)` at save time — **not** `recordKind` from UI state. This is the same source-of-truth rule applied at write time as at read time. Guards against UI desync.

### Reaction screen entry

Income save flows through the existing `/reaction` route unchanged. The reaction screen reads `sobagiEmotion` from `useEmotionStore` and renders dialogue from `REACTION_POOLS[tier].happy` — the existing pool. Income-specific dialogue is deferred to sub-spec C.

---

## Section 4 — Reaction + emotion (minimal in A)

### Emotion resolution

`sobagiEmotion` for income records is hardcoded to `'happy'` at the record.tsx save site. The existing `emotionEngine.evaluate(...)` is **not** called for income records.

**Rationale:** `evaluate` is shaped around spending signals (amount magnitude, time-of-day relative to spending patterns, category atmosphere). Running it on income records risks misclassification — a 0-amount income would resolve to weird emotions, a large `salary` amount might trigger `surprised` (because the spending semantics interpret large amounts as shock).

Sub-spec C will:
- Move this branching into `emotionEngine` (single source of truth)
- Add income-aware nuance (e.g., 보너스 → 'excited'; 환급 → 'happy')

For sub-spec A, the simple hardcode is sufficient.

### Reaction screen behavior

Reaction screen and `useEmotionStore` are **not modified**. The screen renders Sobagi with the saved emotion and a dialogue line from the existing pool. For income, this means the user sees the happy Sobagi asset and a happy-tier dialogue line — a sensible default until sub-spec C tunes it.

### Photocard entry from reaction

The "포토카드 보기" button on the reaction screen remains visible after an income save. The photocard then opens with the just-created record. Without intervention, the photocard would render the income record's amount column as `₩ 0` when amount === 0 — visually broken. The **photocard interim patch** (Section 5) prevents this.

---

## Section 5 — Photocard interim patch + Stats interim interop

### Photocard interim patch (PhotocardView.tsx)

Smallest possible change to prevent visible breakage. Sub-spec B does the full redesign.

**Type extension:**
```ts
export type PhotocardRecord = {
  id?: string;
  category?: string;
  categoryLabel?: string;
  amount: number;
  memo?: string;
  kind?: RecordKind;             // NEW — optional for backward compat
};
```

**Render rule** (inside `recordRow` map):
```tsx
{(r.kind !== 'income' || r.amount > 0) && (
  <Text style={styles.recordAmount}>₩ {r.amount.toLocaleString('ko-KR')}</Text>
)}
```

Behavior:
- Spending records — amount column rendered as before.
- Income records with `amount > 0` — amount column rendered (e.g., "₩ 50,000").
- Income records with `amount === 0` — amount column omitted (no "₩ 0").

**Caller updates required** (mechanical):
- `소박이/src/pages/reaction.tsx` — when constructing the `records` prop for `<PhotocardView />`, include `kind: record.kind` for each record.
- `소박이/src/pages/stats.tsx` (day photocard) — when constructing the `records` prop, include `kind: r.kind` for each record. (Day photocard's `records` already filters to spending via `selectedSpendingExpenses` post-sub-spec-A, but propagating `kind` keeps the contract uniform and avoids surprising sub-spec B.)

Callers that don't pass `kind` continue to render their amount column unconditionally (backward-compatible — the field is optional).

**Total amount block:** Unchanged for sub-spec A. Existing `amount > 0 && (<>...</>)` guard already collapses the `totalBlock` when the day total is 0. Caller logic that computes the day total **must already** sum spending-only (existing `selectedSpendingExpenses` aggregator filters to spending-only after Section 5's filter change). Sub-spec B may restructure the totalBlock semantically; sub-spec A leaves it.

### Stats interim interop (stats.tsx)

**`selectedSpendingExpenses` filter — exclude income:**
```ts
// before:
e => e.category !== 'no_spend'
// after:
e => e.category !== 'no_spend' && e.kind !== 'income'
```

`selectedSpendingExpenses` continues to power:
- The day card's spending list (`<ExpenseList .../>`)
- Photocard entry button visibility (income-only days won't surface the photocard button — sub-spec B decides income photocard policy)
- Day-total amount computation
- Edit affordance for spending rows (existing)

**`topCategoryThisMonth` filter — exclude income:**

Same `kind !== 'income'` addition. Income tokens shouldn't appear in the top-scene chip because they're event-shaped (salary fires monthly), not scene-shaped (cafe fires daily).

**`weekVisitDays` / `monthVisitDays` — unchanged:**

Income days **do** count as presence. The semantic of presence is "the user visited / logged something," not "the user spent money." This was explicit in the brainstorming session.

**Income surface added:**

```ts
const selectedIncomeExpenses = useMemo(
  () => selectedExpenses.filter(e => e.kind === 'income'),
  [selectedExpenses],
);
```

Renders a small read-only section inside the day card, below the spending list:

```tsx
{selectedIncomeExpenses.length > 0 && (
  <View style={styles.incomeSection}>
    <Text style={styles.incomeSectionTitle}>들어온 기록</Text>
    {selectedIncomeExpenses.map(r => {
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

**Income section tone (locked into spec):**

The income section must read as "things that came into the day," not as a finance ledger.

| Acceptable | Forbidden |
|---|---|
| Small title `들어온 기록` (~14px, `COLORS.textMuted`) | Bold green amounts |
| Muted text, smaller than spending list | Word "수입" or "총 수입" |
| Optional amount (hide when 0) | Counts (`N개`) or totals |
| No totals, no counts | Summary framing ("이번 달 들어온 돈") |

Styles to add (concrete values; plan refines if needed):
- `incomeSection`: `{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border }` — a soft separator from the spending list above; no background color, no card chrome.
- `incomeSectionTitle`: `{ fontSize: 13, color: COLORS.textMuted, fontWeight: '500', marginBottom: 8 }`.
- `incomeRow`: `{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6 }`.
- `incomeIcon`: `{ fontSize: 16, width: 28, textAlign: 'center' }`.
- `incomeLabel`: `{ flex: 1, fontSize: 13, color: COLORS.text, marginLeft: 4 }`.
- `incomeAmount`: `{ fontSize: 12, color: COLORS.textMuted }` — explicitly **muted** (not `COLORS.text`), so amount recedes vs the spending list's amounts.

These are deliberately one notch quieter than the spending list's analogous styles, per the "income surfaces quieter than spending" rule.

### Edit sheet — income support

The existing edit sheet stays in shape. Two behavioral additions:

1. **Picker pool derivation:** `<CategorySelector />` inside the edit sheet uses pool derived from `editingExpense.kind`:
   - `'spending'` → `GENERAL_SPENDING_CATEGORIES`
   - `'income'` → `INCOME_CATEGORIES`

2. **Kind locked:** The kind toggle is **not** shown in the edit sheet. A user cannot switch a spending record to income (or vice versa) via edit. Rationale: kind transitions would require validation (e.g., what happens to amount/category when switching), feel finance-app-ish, and aren't needed for the recording use case.

3. **Save consistency:** `commitEdit` recomputes `derivedKind = kindForCategory(selectedCategory)` and writes that. Even though the picker pool is locked to the original kind, this ensures hydration / edit / save all follow the same normalization rule.

4. **Delete:** Unchanged. Kind-agnostic.

---

## Section 6 — Tests

### New test files (TDD targets)

#### `__tests__/categoryRegistry.test.ts`

```
- kindForCategory('cafe')               → 'spending'
- kindForCategory('no_spend')           → 'spending'
- kindForCategory('allowance')          → 'spending'
- kindForCategory('salary')             → 'income'
- kindForCategory('bonus')              → 'income'
- kindForCategory('refund')             → 'income'
- kindForCategory('received_gift')      → 'income'
- kindForCategory('received_allowance') → 'income'
- GENERAL_SPENDING_CATEGORIES does not contain 'no_spend'
- GENERAL_SPENDING_CATEGORIES.length === 12
- INCOME_CATEGORIES.length === 5
- INCOME_CATEGORIES every entry has kind === 'income'
```

#### `__tests__/expenseHydration.test.ts`

```
- normalizeExpense applied to a legacy spending record (no `kind` field)
    → returns record with kind: 'spending'

- normalizeExpense applied to a legacy record with category: 'salary' but no kind
    → returns record with kind: 'income' (derived)

- normalizeExpense applied to a malformed { kind: 'spending', category: 'salary' }
    → returns record with kind: 'income' (corrected)

- normalizeExpense applied to a malformed { kind: 'income', category: 'cafe' }
    → returns record with kind: 'spending' (corrected)

- normalizeExpense applied to a valid record { kind: 'spending', category: 'cafe' }
    → returns the same shape (no changes)

- normalizeExpense preserves id, amount, sobagiEmotion, createdAt, userEmotion, memo
```

### Existing test green-stay requirement

These suites must continue to pass without modification (except where their fixtures need a `kind` field added to keep the `Expense` type valid):

- `__tests__/statsObservationService.test.ts` (12 tests)
- `__tests__/letterService.test.ts`
- `__tests__/dayFeelingService.test.ts`
- `__tests__/foundItemService.test.ts`
- `__tests__/storageService.test.ts`
- Any other expense-touching suite

If a fixture object literal `{ id, amount, category, sobagiEmotion, createdAt }` no longer typechecks (missing `kind`), the fixture gets `kind: 'spending'` added — purely mechanical update.

---

## Section 7 — Scope boundary

### IN (sub-spec A)

- `Expense.kind`, `RecordKind`, hydration normalize
- 5 new income category tokens + registry meta `kind` field + helpers (`SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES`, `kindForCategory`)
- `record.tsx`: top-of-form toggle, picker swap, amount placeholder, no-spend hide, save path with derived kind, hardcoded `'happy'` for income
- `stats.tsx`: `selectedIncomeExpenses` memo, income section JSX (read-only, openEdit-tappable), filter additions to `selectedSpendingExpenses` and `topCategoryThisMonth`
- Edit sheet: picker pool derived from `editingExpense.kind`, kind locked, save uses `kindForCategory(selectedCategory)`
- PhotocardView interim patch: `PhotocardRecord.kind?`, amount column hide when `kind === 'income' && amount === 0`
- Tests: `categoryRegistry.test.ts`, `expenseHydration.test.ts`, plus fixture updates for green-stay

### OUT — Sub-spec B (Photocard 3-way layout)

- Photocard full redesign (3-group: 쓴 / 들어온 / 무지출)
- Reinterpretation or removal of the `총 금액` block
- Income-only-day photocard policy (enter point on stats)
- PhotocardMoodAsset / weather / spendingLevel interaction with income
- Photocard typography / spacing rework

### OUT — Sub-spec C (System integration)

- Income-aware `emotionEngine` branches (remove the sub-spec A hardcode)
- Income-specific dialogue pool / observation messages
- `selectStatsObservation` awareness of income patterns
- Calendar dot / glyph treatment of income days in `MonthPresenceRow`
- Pebble jar trigger on income save (yes / no?)
- Found-item / room-presence detectors reacting to income
- Updates to `feedback_sobagi_allowance_giving_scene.md` and `SOBAGI_CURRENT_STATE.md` to narrow the policy (sub-spec A landing should also flag this in the handoff)
- `memoSuggestions` for income tokens

---

## Section 8 — File-level scope

### Create

- `소박이/__tests__/categoryRegistry.test.ts`
- `소박이/__tests__/expenseHydration.test.ts`

### Modify

- `소박이/src/types/index.ts` — add `RecordKind`, 5 income tokens, `kind` field on `Expense`
- `소박이/src/constants/categories.ts` — add `kind` to meta interface; add `kind: 'spending'` to all existing entries; add 5 income entries; add `SPENDING_CATEGORIES`, `GENERAL_SPENDING_CATEGORIES`, `INCOME_CATEGORIES`, `kindForCategory` exports; reconcile `PICKER_CATEGORIES` if it's still consumed elsewhere
- `소박이/src/services/expenseService.ts` (or equivalent loader) — add `normalizeExpense` and apply at the read path (storage → in-memory)
- `소박이/src/pages/record.tsx` — toggle state + UI, picker swap, amount placeholder / save helper hide, save path with derived kind + income emotion hardcode
- `소박이/src/pages/stats.tsx` — `selectedIncomeExpenses` memo, income section JSX + styles, `selectedSpendingExpenses` filter `kind !== 'income'`, `topCategoryThisMonth` filter `kind !== 'income'`, edit sheet picker derivation, edit save uses `kindForCategory`
- `소박이/src/components/expense/CategorySelector.tsx` (verify it accepts a categories prop; if it hardcodes `PICKER_CATEGORIES`, lift to prop) — minimal change to support pool swap from `record.tsx` and from edit sheet
- `소박이/src/components/photocard/PhotocardView.tsx` — `PhotocardRecord.kind?` field, amount column hide rule
- `소박이/src/components/expense/ExpenseList.tsx` (or equivalent) — only if it currently renders amount unconditionally and is reused by the income section (decide during implementation; the income section may inline its own row rendering rather than reusing ExpenseList)

### Unchanged

- `recordNoSpend` flow (the no-spend marker path)
- `useUserStore` (level, streak, pebble counters)
- `useEmotionStore` (just receives different `sobagiEmotion` for income)
- `selectStatsObservation` / `MonthPresenceRow` / cadence-line memos in stats
- Reaction screen UI (`reaction.tsx`)
- `emotionEngine.evaluate` (kept; just not called on income)
- All atmosphere / room-presence / found-item / pebble services
- Storage keys, storage schema, useAppInit hydration shape (only the per-record normalize step is new)
- Dialogue pools

---

## Section 9 — Anti-patterns (out of scope for sub-spec A)

This pass must not:

- Introduce **"수입" / "income"** as visible UI copy. The user-facing string is **"들어온 기록"** consistently. Internal code uses `kind: 'income'` for type clarity, but no rendered text says "수입".
- Show **monthly income totals**, week-over-week income deltas, savings rate, or "이번 달 들어온 돈" framing.
- Add a **separate income screen** or a separate income tab. All income access lives behind the existing record screen toggle and the stats day card.
- **Compare** spending vs income visually (no "+50,000원 -20,000원" rows, no green-vs-red coloring).
- Treat income as **achievement** (no celebration animation on salary save, no streak boost for income days, no special emoji burst).
- Add income to the **pebble jar** (sub-spec C decides; for sub-spec A income saves earn zero pebbles).
- **Reframe `allowance`** as income, or move 🫶 to a received-money category. The original 2026-05-19 lock for the `allowance` token stays.
- **Migrate stored data** eagerly. Lazy normalize at read time only.

---

## Section 10 — Success criteria

After sub-spec A landing:

- A user can tap "들어온 기록" toggle on the record screen, choose 월급 / 보너스 / 환급 / 선물 받음 / 용돈 받음, optionally enter an amount, optionally enter memo, and save. The reaction screen plays a happy Sobagi.
- Income records persist across app restarts. Hydration normalizes any stored record's `kind` to the category-derived value at read time.
- Legacy records (saved before sub-spec A) load and render identically to before — they default to `kind: 'spending'`.
- A user navigating to Stats and tapping a date with an income record sees a `들어온 기록` section under the spending list, listing icon + label + optional amount.
- Tapping an income row opens the edit sheet, scoped to income categories (no spending categories visible), no kind toggle.
- Editing an income record and saving correctly persists the change. Hydration / save use the same `kindForCategory` rule.
- Deleting an income record removes it from storage and from the day card.
- Photocard from reaction or from stats day photocard does not render `"₩ 0"` for income records with amount === 0.
- Stats `topCategoryThisMonth` chip never shows an income token.
- `weekVisitDays` and `monthVisitDays` correctly count income days as presence.
- `selectStatsObservation` continues to return spending-pattern observations unchanged (income isn't visible to it yet — sub-spec C).
- Existing test suites stay green; new tests for `categoryRegistry` and `expenseHydration` pass; typecheck stays clean (2 pre-existing `_404.tsx` errors only).

---

## Open questions deferred to sub-spec B / C (recorded here for continuity)

- Should the photocard for an income-only day exist at all? If yes, what's its quote/asset behavior?
- Should `salary` save earn pebbles? Probably no — salary recording shouldn't reward; that re-creates the finance app feel. But sub-spec C decides.
- Should night-pattern detection ignore income records (a 19:00 salary record isn't a "night activity" pattern)?
- Should `MonthPresenceRow` differentiate income-only days from spending days visually? (Probably yes — a different glyph.)
- Memo suggestions for income tokens (e.g. `salary` → `['이번 달', '회사']`)?

These do not block sub-spec A.
