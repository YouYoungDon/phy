# Add `investment_income` (투자수익) Income Category — Design

**Date:** 2026-05-28
**Status:** Approved (design); ready for implementation plan.

## Goal

Add **🪙 투자수익** as a sixth income category in the record-entry picker, positioned
immediately after **🤲 용돈 받음**, so users can record investment-related incoming money
as a discrete category.

## The change

| Token | Label | Emoji | Kind | Position |
|---|---|---|---|---|
| `investment_income` | 투자수익 | 🪙 | `income` | last in `INCOME_CATEGORIES` (after `received_allowance`) |

Resulting income picker (newest at bottom):

```
💼 월급        ✨ 보너스       🧾 환급
💝 선물 받음   🤲 용돈 받음    🪙 투자수익
```

## Decisions (resolved during brainstorming)

- **Wording = "투자수익"** (the literal term the user asked for). This is the first income
  category that is frankly finance-vocab (수익 = profit/return); the user deliberately
  revisited the "categories = life scenes, not financial taxonomy" line. Admissible
  because the addition is purely categorical — no new tracking, breakdowns, or
  dashboards (see §"Philosophy note" below).
- **Emoji = 🪙** (single coin). Matches the soft / relational pattern of the existing
  income emojis (💼 ✨ 🧾 💝 🤲) — no chart, no growth arrow, no dashboard energy. The
  literal alternative 💹 was considered and rejected for breaking that visual register.
- **Token key = `investment_income`** (snake_case English). Mirrors the relational-encoding
  pattern of `received_gift` / `received_allowance`. Not `investment` (too vague), not
  `investment_return` (수익 in everyday Korean ≈ income, not "return-on-capital").
- **`memoSuggestions = []`** matching every other income token's empty list.

## Why the implementation is small

Both pickers consume `INCOME_CATEGORIES` generically:

- `src/pages/record.tsx:417` — `categories={recordKind === 'income' ? INCOME_CATEGORIES : GENERAL_SPENDING_CATEGORIES}`
- `src/pages/stats.tsx:428` — same pattern in the edit flow

So a new entry in `INCOME_CATEGORIES` appears in both pickers automatically. No new UI
wiring, no migration, no per-category branching anywhere in the app.

## Files touched

- **`src/types/index.ts`** — append `| 'investment_income'` to the `ExpenseCategory` union
  in the "incoming scenes" block.
- **`src/constants/categories.ts`** — add one row to `CATEGORIES`, immediately after
  `received_allowance`:

  ```ts
  { key: 'investment_income', label: '투자수익', emoji: '🪙', inPicker: true, kind: 'income', memoSuggestions: [] },
  ```

- **`__tests__/categoryRegistry.test.ts`** — bump the literal `5` to `6` in the
  `INCOME_CATEGORIES.length` assertion, and add a `kindForCategory('investment_income')`
  check alongside the existing income-kind assertions.

## Testing

- Existing `categoryRegistry.test.ts` count test must be updated from 5 to 6.
- Add: `kindForCategory('investment_income')` resolves to `'income'`.
- No other tests need changes — every consumer iterates `INCOME_CATEGORIES` rather than
  hardcoding member tokens.

## Migration & compatibility

- **Forward-compatible, no migration.** The token is purely additive. Records pre-dating
  this commit cannot have `category === 'investment_income'` because it didn't exist.
- **Backward-compatible.** A user who rolls back to an earlier app version after recording
  with this token would have records hydrate with the unknown-token fallback — the
  registry's `kindForCategory` returns `'spending'` for unknown tokens. This is the
  pre-existing forgiving-hydration behavior; we are not changing it. The user is
  knowingly on a forward-moving branch, so this edge case is acceptable.

## Philosophy note (binding context)

The "categories = life scenes, not financial taxonomy" rule
([[feedback_sobagi_categories_life_scenes]]) and the "no income TRACKING (totals /
balance / savings / comparison) except the two scoped Stats places"
([[feedback_sobagi_allowance_giving_scene]]) both stand. This change does NOT relax them:

- **Investment income contributes to record count and (in the two scoped Stats places —
  monthly settlement line and 함께 보기 cell) to income totals.** Nothing else.
- **No new analytics, no new breakdowns, no per-category income drill-downs, no
  portfolio metrics, no portfolio/balance/asset surface.**
- **DailySummary and TodaySurface unchanged.** They count records (`recordCount`) and
  spending amount (`totalAmount`, `spendingCount > 0`) — neither surfaces income amounts.
  Investment income records add to `recordCount` like any other income token; they never
  inflate either surface's won figure.

What this change is: one new token in the registry. What it isn't: a portfolio tab, a
profit-tracking feature, or a wedge to add finance dashboards.

## Explicitly NOT doing

- No memo suggestions, no ambient `OBJECT_LINES`, no photocard hook, no atmosphere-service
  reaction (investment income behaves like any other income token).
- No emoji changes to 보너스 / 월급 / 환급 / 선물 받음 / 용돈 받음 — only the new row is added.
- No reshuffle of existing positions in `CATEGORIES`.
- No new picker grouping, nested categories, or sub-categories.
- No change to amount display rules anywhere (DailySummary / TodaySurface / stats summaries).
- No new tests beyond the two minimal additions in `categoryRegistry.test.ts`.
