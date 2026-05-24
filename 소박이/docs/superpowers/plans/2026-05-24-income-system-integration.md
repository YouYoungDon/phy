# Income System Integration Implementation Plan (Sub-spec C)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire income records into the emotion engine, dialogue pool, stats observation chain, MonthPresenceRow, and night-pattern detector — all in a way that keeps the system tonally quiet and explicitly non-financial. Remove sub-spec A's hardcoded `'happy'` ternary in `record.tsx` and replace it with a 2-rule `evaluateIncome` subroutine inside the engine. Add a sibling `INCOME_REACTION_POOLS` and kind-gate the selector. Surface income-only days as `●` in MonthPresenceRow. Add ONE quiet income observation line to `selectStatsObservation`. Filter income out of `hasNightPattern`.

**Architecture:** No new emotion token. No new storage keys. No pebble interaction. No restService touches. No new asset. All differentiation is achieved by (a) a kind-gated dialogue pool, (b) a 2-rule income emotion subroutine that only consults time-of-day, and (c) presence-shape inclusion (T1/T2/T3) vs lifestyle-pattern exclusion (cafe, night, calm-day, T4) for triggers.

**Tech Stack:** React Native 0.84, TypeScript 5.8 (`noUncheckedIndexedAccess: true`), Zustand 5, Jest 29.

**Spec:** `소박이/docs/superpowers/specs/2026-05-24-income-system-integration-design.md`

**Phasing:**
1. Baseline checks (Task 1)
2. Emotion engine income subroutine + negative tests (Task 2)
3. Dialogue pool + kind-gated selector + tests (Task 3)
4. Caller migration — record.tsx, reaction.tsx (Task 4)
5. MonthPresenceRow income visibility (Task 5)
6. Night pattern income filter (Task 6)
7. Stats observation income branch (Task 7)
8. Allowance memory narrowing (Task 8 — memory file, not code)
9. Final verification + handoff (Task 9)

**Commands used throughout** (run from `소박이/`):
- Single test file: `npx jest __tests__/<file>.test.ts`
- Full suite: `npm test`
- Typecheck: `npx tsc --noEmit`

**Working tree note:** Should be clean before starting (sub-spec B landed at `13b3691`). If `git status` shows any `M` entries other than this plan/spec doc pair, stop and ask the human.

---

## Critical boundaries (re-read before every commit)

These are the explicit guardrails carried over from the spec — violations are blockers, not nits.

- **No new emotion token.** `SobagiEmotion` stays `'happy' | 'excited' | 'surprised' | 'sleepy' | 'soft-sad'`. Do not add `'calm'` / `'relief'` / `'warm'` / anything else.
- **Income emotion: 2 rules only.** `evaluateIncome` consults `currentHour` only. It must NOT consult `isFirstRecordToday`, `currentStreak`, `expense.amount`, or `expense.category`.
- **`'surprised'` must never be returned for income.** Add an explicit negative test.
- **Amount must not drive income emotion.** Add an explicit negative test that toggles amount across `evaluateIncome` and asserts the same return.
- **Streak must not drive income emotion.** Add an explicit negative test that toggles streak and asserts the same return.
- **First-of-day must not drive income emotion.** Add an explicit negative test that toggles `isFirstRecordToday` and asserts the same return.
- **`restService` is untouched.** No new file touches it. No pebble grant added to `expenseService.saveExpense`, no pebble grant added to any income code path. Verify with grep at end.
- **No income totals, balance, profit, savings, or comparison framing** anywhere — UI, copy, observation lines.
- **MonthPresenceRow income-only days render `●`** — same as spending. No new glyph variant, no income-specific color, no currency emoji.
- **Income dialogue is kind-gated, not emotion-only-gated.** `INCOME_REACTION_POOLS` is indexed by tier (not by emotion). `selectReactionMessage` takes a new `kind` param and branches before reading the spending pool.
- **Detectors stay spending-oriented where they already are:** `hasCategoryPattern` (cafe), `computeCalmDayCount` (atmosphere), T4 (small-purchase pattern) must not start counting income records. `hasNightPattern` newly filters out `kind === 'income'`. T1 / T2 / T3 already read all records (kind-agnostic presence shape) — leave them alone.
- **No storage change; no new `STORAGE_KEYS`; no migration step.**
- **No changes to:** `expenseService.recordNoSpend` (keeps `'happy'`), `foundItemService`, `atmosphereService`, photocard components (sub-spec B baseline), `SobagiEmotion` union, `EMOTION_MESSAGES`, mood asset resolver.
- **Banned vocabulary in any new copy:** 수입 · 수익 · 매출 · 보상 · 리워드 · 축하 · 잘했어요 · 성공 · 잔액 · 통장 · 저축 · 모았어요 · 벌었 · 입금. Banned emoji in any new copy: 💵 💰 💴.

---

## Task 1: Baseline checks

**Files:** none (verification only)

- [ ] **Step 1: Verify clean working tree**

Run: `git status --short`
Expected: empty output, except optionally the plan/spec pair (`docs/superpowers/specs/2026-05-24-income-system-integration-design.md`, `docs/superpowers/plans/2026-05-24-income-system-integration.md`). If unrelated WIP exists, stop and surface to the human.

- [ ] **Step 2: Record baseline HEAD**

Run: `git log -1 --format='%H %s'`
Expected: `13b3691... docs: sub-spec B (photocard 3-way) handoff` (or a later commit if more work landed). Note the SHA for the handoff note.

- [ ] **Step 3: Baseline test suite + typecheck**

Run:
```
npx tsc --noEmit
npm test
```
Expected: typecheck reports only the 2 pre-existing `_404.tsx` errors (KI-001, not blocking). Jest reports **16 suites · 250 tests · all passing**. If any new failure or new typecheck error exists, stop and surface to the human.

---

## Task 2: Emotion engine — `evaluateIncome` subroutine + negative tests

**Files:**
- `소박이/src/services/emotionEngine.ts` (modify)
- `소박이/__tests__/emotionEngine.test.ts` (modify or create — check if exists first)

- [ ] **Step 1: Add `evaluateIncome` and route from `evaluate`**

Open `소박이/src/services/emotionEngine.ts`. The current file is 10 lines. Replace it with:

```typescript
import { Expense, EmotionContext, SobagiEmotion } from '../types';

export function evaluate(expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (expense.kind === 'income') {
    return evaluateIncome(expense, ctx);
  }
  // Spending chain — unchanged.
  if (ctx.isFirstRecordToday) return 'surprised';
  if (ctx.currentStreak >= 3) return 'excited';
  if (ctx.currentHour >= 22) return 'sleepy';
  if (expense.amount >= 50000) return 'soft-sad';
  if (expense.amount < 5000) return 'happy';
  return 'happy';
}

// Income emotion subroutine — intentionally 2 rules.
// Consults `currentHour` only. Must NOT consult amount, streak, isFirstRecordToday,
// or category. First-of-day on an income save would route to the 'surprised' pool
// ("처음 들렀네요 ✨") which reads as event/reward — contradicts the
// "something warm entered the day" tone target. See sub-spec C §3.
function evaluateIncome(_expense: Expense, ctx: EmotionContext): SobagiEmotion {
  if (ctx.currentHour >= 22) return 'sleepy';
  return 'happy';
}
```

Note: the leading underscore on `_expense` is intentional — it signals the parameter is structurally part of the signature (matches `evaluate`) but the function body does not consult it. Do NOT delete the parameter; future readers should see that amount/category are explicitly available and explicitly ignored.

- [ ] **Step 2: Check whether `emotionEngine.test.ts` exists**

Run: `Glob "__tests__/emotionEngine.test.ts"` from `소박이/`.

If it exists, read it first to see current structure and append the new income tests to the existing suite. If it does not exist, create a new file.

- [ ] **Step 3: Write the income test suite**

The income tests have one positive (sleepy at 23h, happy elsewhere) and four explicit negatives that prove the rejected dimensions are not consulted. Use this skeleton:

```typescript
import { evaluate } from '../src/services/emotionEngine';
import { Expense, EmotionContext } from '../src/types';

const incomeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: 't1',
  kind: 'income',
  amount: 1_000_000,
  category: 'salary',
  sobagiEmotion: 'happy', // not consulted by evaluate
  createdAt: '2026-05-24T14:00:00.000Z',
  ...overrides,
});

const ctx = (overrides: Partial<EmotionContext> = {}): EmotionContext => ({
  currentHour: 14,
  currentStreak: 0,
  isFirstRecordToday: false,
  ...overrides,
});

describe('evaluate — income subroutine', () => {
  describe('positive', () => {
    it('returns sleepy when hour >= 22', () => {
      expect(evaluate(incomeExpense(), ctx({ currentHour: 23 }))).toBe('sleepy');
      expect(evaluate(incomeExpense(), ctx({ currentHour: 22 }))).toBe('sleepy');
    });

    it('returns happy by default', () => {
      expect(evaluate(incomeExpense(), ctx({ currentHour: 9 }))).toBe('happy');
      expect(evaluate(incomeExpense(), ctx({ currentHour: 15 }))).toBe('happy');
    });
  });

  describe('negatives — these dimensions must NOT affect income emotion', () => {
    it('isFirstRecordToday does not route income to surprised', () => {
      const result = evaluate(incomeExpense(), ctx({ isFirstRecordToday: true }));
      expect(result).toBe('happy');
      expect(result).not.toBe('surprised');
    });

    it('large amount does not route income to soft-sad', () => {
      const result = evaluate(incomeExpense({ amount: 10_000_000 }), ctx());
      expect(result).toBe('happy');
      expect(result).not.toBe('soft-sad');
    });

    it('streak does not route income to excited', () => {
      const result = evaluate(incomeExpense(), ctx({ currentStreak: 7 }));
      expect(result).toBe('happy');
      expect(result).not.toBe('excited');
    });

    it('surprised is never returned for income, regardless of context combination', () => {
      const probes: EmotionContext[] = [
        ctx({ isFirstRecordToday: true, currentStreak: 0, currentHour: 9 }),
        ctx({ isFirstRecordToday: true, currentStreak: 10, currentHour: 23 }),
        ctx({ isFirstRecordToday: true, currentHour: 5 }),
      ];
      probes.forEach((c) => {
        expect(evaluate(incomeExpense(), c)).not.toBe('surprised');
      });
    });
  });

  describe('regression — spending chain unaffected', () => {
    it('first record today on spending still returns surprised', () => {
      const spendingExpense: Expense = { ...incomeExpense(), kind: 'spending', category: 'cafe' };
      expect(evaluate(spendingExpense, ctx({ isFirstRecordToday: true }))).toBe('surprised');
    });

    it('spending large amount still returns soft-sad', () => {
      const spendingExpense: Expense = { ...incomeExpense(), kind: 'spending', category: 'cafe', amount: 60_000 };
      expect(evaluate(spendingExpense, ctx())).toBe('soft-sad');
    });
  });
});
```

The expected `EmotionContext` shape matches `src/types/index.ts`. Read that file first if any field type is unclear.

- [ ] **Step 4: Run typecheck + new test**

```
npx tsc --noEmit
npx jest __tests__/emotionEngine.test.ts
```
Typecheck must remain clean. Income suite must show ≥ 6 new tests, all passing.

- [ ] **Step 5: Commit checkpoint**

```
git add 소박이/src/services/emotionEngine.ts 소박이/__tests__/emotionEngine.test.ts
git commit -m "feat(emotion): add evaluateIncome subroutine (sleepy at night, else happy)"
```

Commit body: 2–3 lines noting "2-rule chain, deliberately ignores amount/streak/first-of-day; negative tests prove rejected dimensions."

---

## Task 3: Dialogue — `INCOME_REACTION_POOLS` + kind-gated selector

**Files:**
- `소박이/src/constants/dialogue.ts` (modify)
- `소박이/src/services/dialogueService.ts` (modify)
- `소박이/__tests__/dialogueService.test.ts` (modify — check first)

- [ ] **Step 1: Add `INCOME_REACTION_POOLS` to dialogue constants**

Open `소박이/src/constants/dialogue.ts`. Below the existing `REACTION_POOLS` block, before `OBSERVATION_POOLS`, add:

```typescript
// Income-aware reaction pool. Selected when expense.kind === 'income'.
// Indexed by tier ONLY (not by emotion) because the income emotion subroutine
// returns at most 2 emotions (happy | sleepy) and they share the same tonal
// register — slicing the pool further would force tonally-thin sub-pools.
// Tone target: relief / warmth / "something warm entered the day".
// Banned vocabulary: 수입, 수익, 보상, 축하, 벌었, 입금, 잔액, 통장. See sub-spec C §4.
export const INCOME_REACTION_POOLS: Record<DialogueTier, [string, string, string]> = {
  1: [
    '조금 든든한 날이네요 🌿',
    '따뜻한 일이 들어왔어요 🍃',
    '오늘은 조금 안심되는 날이에요',
  ],
  2: [
    '들어온 날이 있네요 🌿',
    '오늘은 조금 든든한 하루였어요 🍃',
    '따뜻한 소식이 들어왔어요',
  ],
  3: [
    '들어온 날도 기억해둘게요 🌿',
    '오늘은 조금 든든했을 거예요 🍃',
    '이런 날도 있어요. 다 기억하고 있어요',
  ],
};
```

- [ ] **Step 2: Update `selectReactionMessage` signature**

Open `소박이/src/services/dialogueService.ts`. Locate the existing function:

```typescript
export function selectReactionMessage(emotion: SobagiEmotion, tier: DialogueTier): string {
  const pool = REACTION_POOLS[tier][emotion];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}
```

Replace with:

```typescript
export function selectReactionMessage(
  emotion: SobagiEmotion,
  tier: DialogueTier,
  kind: RecordKind = 'spending',
): string {
  if (kind === 'income') {
    const pool = INCOME_REACTION_POOLS[tier];
    return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
  }
  const pool = REACTION_POOLS[tier][emotion];
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}
```

Update the imports at the top: add `INCOME_REACTION_POOLS` to the dialogue import and add `RecordKind` to the types import:

```typescript
import { SobagiEmotion, Expense, RecordKind } from '../types';
import { DialogueTier, REACTION_POOLS, INCOME_REACTION_POOLS, OBSERVATION_POOLS } from '../constants/dialogue';
```

The default `kind = 'spending'` keeps all existing callers and tests working untouched.

- [ ] **Step 3: Add tests to `dialogueService.test.ts`**

Read the file first to find its structure. Append a new `describe` block:

```typescript
describe('selectReactionMessage — income kind gate', () => {
  it('returns from INCOME_REACTION_POOLS when kind is income', () => {
    const tier1Pool = INCOME_REACTION_POOLS[1];
    const result = selectReactionMessage('happy', 1, 'income');
    expect(tier1Pool).toContain(result);
  });

  it('uses tier 2 income pool when tier is 2', () => {
    const tier2Pool = INCOME_REACTION_POOLS[2];
    const result = selectReactionMessage('sleepy', 2, 'income');
    expect(tier2Pool).toContain(result);
  });

  it('uses tier 3 income pool when tier is 3', () => {
    const tier3Pool = INCOME_REACTION_POOLS[3];
    const result = selectReactionMessage('happy', 3, 'income');
    expect(tier3Pool).toContain(result);
  });

  it('ignores emotion argument when kind is income (kind gate, not emotion gate)', () => {
    // All 5 emotions must yield a string from the same tier-1 income pool.
    const tier1Pool = INCOME_REACTION_POOLS[1];
    (['happy', 'excited', 'surprised', 'sleepy', 'soft-sad'] as const).forEach((e) => {
      const result = selectReactionMessage(e, 1, 'income');
      expect(tier1Pool).toContain(result);
    });
  });

  it('defaults kind to spending when omitted (backward compat)', () => {
    const tier1HappyPool = REACTION_POOLS[1].happy;
    const result = selectReactionMessage('happy', 1);
    expect(tier1HappyPool).toContain(result);
  });

  it('spending kind still reads from REACTION_POOLS[tier][emotion]', () => {
    const tier2SadPool = REACTION_POOLS[2]['soft-sad'];
    const result = selectReactionMessage('soft-sad', 2, 'spending');
    expect(tier2SadPool).toContain(result);
  });
});

describe('INCOME_REACTION_POOLS — vocabulary guards', () => {
  const BANNED = ['수입', '수익', '보상', '축하', '벌었', '입금', '잔액', '통장', '저축', '리워드', '매출'];
  const BANNED_EMOJI = ['💵', '💰', '💴'];

  it('contains no banned vocabulary in any tier', () => {
    [1, 2, 3].forEach((tier) => {
      const pool = INCOME_REACTION_POOLS[tier as 1 | 2 | 3];
      pool.forEach((line) => {
        BANNED.forEach((word) => {
          expect(line).not.toContain(word);
        });
        BANNED_EMOJI.forEach((emoji) => {
          expect(line).not.toContain(emoji);
        });
      });
    });
  });
});
```

Update the test file's imports to include `INCOME_REACTION_POOLS` and `REACTION_POOLS` from `../src/constants/dialogue`.

- [ ] **Step 4: Run typecheck + tests**

```
npx tsc --noEmit
npx jest __tests__/dialogueService.test.ts
```
Both clean. The new income suite should show ≥ 7 tests.

- [ ] **Step 5: Commit checkpoint**

```
git add 소박이/src/constants/dialogue.ts 소박이/src/services/dialogueService.ts 소박이/__tests__/dialogueService.test.ts
git commit -m "feat(dialogue): add INCOME_REACTION_POOLS, kind-gate selectReactionMessage"
```

---

## Task 4: Caller migration — record.tsx, reaction.tsx

**Files:**
- `소박이/src/pages/record.tsx` (modify — remove income ternary)
- `소박이/src/pages/reaction.tsx` (modify — pass kind to selectReactionMessage)

- [ ] **Step 1: Remove the `record.tsx` income ternary**

Read `소박이/src/pages/record.tsx` around lines 175–185 (locate via the comment `// Income records skip the spending-shaped emotion resolver`).

Current shape:
```typescript
const sobagiEmotion = derivedKind === 'income'
  ? 'happy'
  : evaluate(
      // ...spending args
    );
```

Replace with the unconditional engine call. The exact shape depends on how `evaluate` is called for spending — read the file and preserve the call site shape. After this change:

```typescript
const sobagiEmotion = evaluate(
  { ...spendingShapedExpenseArgs, kind: derivedKind },
  ctx,
);
```

The engine now branches internally on `kind`. Remove the explanatory comment block above the ternary (the rationale now lives in `emotionEngine.ts` and the spec).

- [ ] **Step 2: Update `reaction.tsx` to pass `kind` into `selectReactionMessage`**

Open `소박이/src/pages/reaction.tsx`. Locate the call to `selectReactionMessage` (search for the import or call site).

The reaction screen renders for the most recently saved expense. Find the latest expense reference (likely from the store or route params). The latest expense's `kind` should be passed as the third argument:

```typescript
const latestKind: RecordKind = latestExpense?.kind ?? 'spending';
const reactionMessage = selectReactionMessage(emotion, tier, latestKind);
```

If the file already destructures `latestExpense` for other reasons, reuse that. If not, add a single destructure line. Import `RecordKind` from `../types` if not already imported.

- [ ] **Step 3: Run typecheck + full suite**

```
npx tsc --noEmit
npm test
```
Both clean. No new failures. The `emotionEngine.test.ts` and `dialogueService.test.ts` suites from Tasks 2–3 must still pass.

- [ ] **Step 4: Spec compliance grep**

Run from `소박이/`:
```
git grep -n "derivedKind === 'income'" src/
git grep -n "'income' ? 'happy'" src/
git grep -n "kind === 'income' ? 'happy'" src/
```
Expected: no matches in `src/`. (Comments referencing the historic behavior in spec/plan docs are fine.) If any code match remains, the migration is incomplete.

- [ ] **Step 5: Commit checkpoint**

```
git add 소박이/src/pages/record.tsx 소박이/src/pages/reaction.tsx
git commit -m "refactor(income): route emotion through engine, pass kind to dialogue"
```

---

## Task 5: MonthPresenceRow — income-only days render `●`

**Files:**
- `소박이/src/components/stats/MonthPresenceRow.tsx` (modify)
- `소박이/src/pages/stats.tsx` (modify — populate new field)

- [ ] **Step 1: Extend `DayCellData` shape**

Open `소박이/src/components/stats/MonthPresenceRow.tsx`. Change the `DayCellData` interface from:

```typescript
interface DayCellData {
  total: number;
}
```

to:

```typescript
interface DayCellData {
  total: number;
  /**
   * True if the day has any expense record at all (spending, income, or no-spend).
   * Distinct from `total > 0` because income excluded from total (per sub-spec A),
   * but income-only days should still render the spending glyph (●) per sub-spec C §6.
   */
  hasRecord: boolean;
}
```

- [ ] **Step 2: Update `glyphFor`**

Current `glyphFor` (line 27–38):
```typescript
function glyphFor(
  data: DayCellData | undefined,
  isToday: boolean,
  isFuture: boolean,
): { char: string; muted: boolean } {
  if (data) {
    if (data.total > 0) return { char: '●', muted: false };
    return { char: '🌿', muted: false };
  }
  if (isToday) return { char: '○', muted: false };
  return { char: '·', muted: isFuture };
}
```

Replace with:
```typescript
function glyphFor(
  data: DayCellData | undefined,
  isToday: boolean,
  isFuture: boolean,
): { char: string; muted: boolean } {
  if (data) {
    // any record with amount > 0 (spending or income-only with amount) → ●
    // record exists but total === 0 and amount-shaped income too → ●
    // record exists with no spending and no income amount → 🌿 (no-spend day)
    if (data.total > 0) return { char: '●', muted: false };
    if (data.hasRecord) return { char: '●', muted: false }; // income-only day
    return { char: '🌿', muted: false };
  }
  if (isToday) return { char: '○', muted: false };
  return { char: '·', muted: isFuture };
}
```

Wait — the comment is confusing. Re-read the spec §6. `hasRecord` covers "any expense exists." Income-only with amount → `data.hasRecord === true && data.total === 0` → `●`. No-spend-only → `data.hasRecord === true && data.total === 0` too. We need to distinguish them.

Re-think: the prior shape only had `total`. The prior rule was "data exists at all" ⇒ either `●` (if total > 0) or `🌿` (if total === 0, treating as no-spend). Now there are three sub-cases when `data` exists:
1. Has spending OR has income-with-amount → `●`
2. Has only no_spend records → `🌿`
3. Has only income-with-amount-0 records → ??

Case 3 is exotic (income save with amount left blank). Per sub-spec A, income amount is optional. An income record with amount === 0 should still produce `●` because something *was* recorded.

So the discriminator we actually want is: "do all non-amount records here look like no-spend?"

Simplest path: `stats.tsx` populates a second boolean, `hasOnlyNoSpend`. Then:

```typescript
interface DayCellData {
  total: number;
  hasRecord: boolean;
  hasOnlyNoSpend: boolean;
}

function glyphFor(...) {
  if (data) {
    if (data.hasOnlyNoSpend) return { char: '🌿', muted: false };
    if (data.hasRecord) return { char: '●', muted: false };
    // unreachable when data exists, but fallback for safety:
    return { char: '·', muted: isFuture };
  }
  if (isToday) return { char: '○', muted: false };
  return { char: '·', muted: isFuture };
}
```

This is cleaner. `hasOnlyNoSpend` is a positive predicate computed at the data source.

Use the three-field shape above for the actual implementation. Update both the interface and `glyphFor` accordingly.

- [ ] **Step 3: Populate the new fields in `stats.tsx`**

Open `소박이/src/pages/stats.tsx`. Locate the `expensesByDate` accumulator (per the sub-spec A QA fix, it has the `if (e.kind === 'income') continue;` guard for `total`).

Find where the per-date `total` is set; alongside it, populate `hasRecord: true` for every iteration that touches the date, and track `hasOnlyNoSpend` (initially true; flip to false on any non-`no_spend` record).

Concretely, the accumulator likely looks like:
```typescript
for (const e of expenses) {
  const dateKey = getLocalDateString(new Date(e.createdAt));
  if (!byDate[dateKey]) byDate[dateKey] = { total: 0 };
  if (e.kind === 'income') continue;
  byDate[dateKey].total += e.amount;
}
```

Refactor to:
```typescript
for (const e of expenses) {
  const dateKey = getLocalDateString(new Date(e.createdAt));
  if (!byDate[dateKey]) byDate[dateKey] = { total: 0, hasRecord: false, hasOnlyNoSpend: true };
  byDate[dateKey].hasRecord = true;
  if (e.category !== 'no_spend') byDate[dateKey].hasOnlyNoSpend = false;
  if (e.kind === 'income') continue;
  byDate[dateKey].total += e.amount;
}
```

Note the ordering carefully: `hasRecord = true` and the `hasOnlyNoSpend` flip happen BEFORE the income-`continue` because we want income records to count toward presence but not total.

- [ ] **Step 4: Manual reasoning — verify glyph table**

Build the truth table mentally:

| Day shape | hasRecord | hasOnlyNoSpend | total | Glyph |
|---|---|---|---|---|
| spending only | true | false | > 0 | ● |
| income-only (with amount) | true | false | 0 | ● |
| income-only (amount 0) | true | false | 0 | ● |
| no-spend only | true | true | 0 | 🌿 |
| spending + no-spend | true | false | > 0 | ● |
| spending + income | true | false | > 0 | ● |
| income + no-spend | true | false | 0 | ● |
| nothing | undefined | — | — | · (or ○ today) |

All rows correct.

- [ ] **Step 5: Run typecheck + tests**

```
npx tsc --noEmit
npm test
```

If `MonthPresenceRow` lacks a test file, no new tests are required for Task 5 (the behavior is exercised by the integration in `stats.tsx`). The truth table above is the design check.

- [ ] **Step 6: Commit checkpoint**

```
git add 소박이/src/components/stats/MonthPresenceRow.tsx 소박이/src/pages/stats.tsx
git commit -m "feat(stats): income-only days render ● in MonthPresenceRow"
```

---

## Task 6: Night pattern detector — filter income out

**Files:**
- `소박이/src/services/roomPresenceService.ts` (modify — `hasNightPattern`)
- existing `roomPresenceService.test.ts` (modify — add income-filter regression test)

- [ ] **Step 1: Locate `hasNightPattern`**

Open `소박이/src/services/roomPresenceService.ts`. Find the `hasNightPattern` function (referenced by `statsObservationService.ts`).

- [ ] **Step 2: Add the income filter**

At the top of the function body (before any of the existing filtering), add:

```typescript
const spendingExpenses = expenses.filter((e) => e.kind !== 'income');
```

Then use `spendingExpenses` for all subsequent reads inside the function. Do not rename the parameter — only the internal alias changes.

Inline comment above the filter:
```typescript
// Night pattern reads user-presence at night. Income records (e.g., salary deposits
// timestamped late) are system events, not late-night user activity. Sub-spec C §7.
```

- [ ] **Step 3: Add a regression test**

Read `소박이/__tests__/roomPresenceService.test.ts` (or whichever file covers `hasNightPattern`). Append:

```typescript
describe('hasNightPattern — income filter (sub-spec C §7)', () => {
  it('does not count income records toward the night pattern', () => {
    const today = '2026-05-24';
    const incomeOnlyNights: Expense[] = [
      // Three late-night income saves across three distinct nights — would trigger
      // the pattern if income counted, but must NOT trigger after the §7 filter.
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-22T22:30:00.000Z' }),
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-23T23:10:00.000Z' }),
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-24T22:45:00.000Z' }),
    ];
    expect(hasNightPattern(incomeOnlyNights, NIGHT_OPTS, today)).toBe(false);
  });

  it('still fires when spending records satisfy the pattern', () => {
    const today = '2026-05-24';
    const spendingNights: Expense[] = [
      makeExpense({ kind: 'spending', category: 'cafe',     createdAt: '2026-05-22T22:30:00.000Z' }),
      makeExpense({ kind: 'spending', category: 'home_meal', createdAt: '2026-05-23T23:10:00.000Z' }),
      makeExpense({ kind: 'spending', category: 'cafe',     createdAt: '2026-05-24T22:45:00.000Z' }),
    ];
    expect(hasNightPattern(spendingNights, NIGHT_OPTS, today)).toBe(true);
  });
});
```

`makeExpense` and `NIGHT_OPTS` should follow the existing test file's helper conventions — read those first and adapt the shape.

- [ ] **Step 4: Run typecheck + tests**

```
npx tsc --noEmit
npx jest __tests__/roomPresenceService.test.ts
```
Both clean. Two new tests added.

- [ ] **Step 5: Confirm other detectors untouched**

Grep for accidental scope creep:
```
git diff 소박이/src/services/roomPresenceService.ts
```
Expected: only `hasNightPattern` changes. `hasCategoryPattern`, T1/T2/T3 logic, `checkForPlacement` — all untouched.

- [ ] **Step 6: Commit checkpoint**

```
git add 소박이/src/services/roomPresenceService.ts 소박이/__tests__/roomPresenceService.test.ts
git commit -m "fix(presence): exclude income from hasNightPattern"
```

---

## Task 7: Stats observation — income-day branch

**Files:**
- `소박이/src/services/statsObservationService.ts` (modify)
- `소박이/__tests__/statsObservationService.test.ts` (modify)

- [ ] **Step 1: Add `computeIncomeDayCount` helper**

Open `소박이/src/services/statsObservationService.ts`. Add (after the existing constants, before `selectStatsObservation`):

```typescript
const INCOME_OBSERVATION_THRESHOLD = 2;
const INCOME_OBSERVATION_WINDOW_DAYS = 30;

function computeIncomeDayCount(expenses: Expense[], today: string): number {
  const cutoffDate = new Date(today + 'T12:00:00');
  cutoffDate.setDate(cutoffDate.getDate() - INCOME_OBSERVATION_WINDOW_DAYS + 1);
  const cutoff = getLocalDateString(cutoffDate);

  const incomeDays = new Set<string>();
  for (const e of expenses) {
    if (e.kind !== 'income') continue;
    const day = getLocalDateString(new Date(e.createdAt));
    if (day < cutoff || day > today) continue;
    incomeDays.add(day);
  }
  return incomeDays.size;
}
```

Update the imports at the top — add `getLocalDateString` from `../utils/date` if not already imported.

- [ ] **Step 2: Insert the income branch into `selectStatsObservation`**

Current chain (positions 1–7). Insert the income branch at position 4, between calm-day and streak >= 7:

```typescript
export function selectStatsObservation(
  expenses: Expense[],
  streak: number,
  today: string,
): string {
  if (hasCategoryPattern(expenses, 'cafe', CAFE_PATTERN_OPTS, today)) {
    return '요즘 카페에 자주 들렀네요 ☕';
  }
  if (hasNightPattern(expenses, NIGHT_PATTERN_OPTS, today)) {
    return '밤에도 종종 기록했네요 🌙';
  }
  if (computeCalmDayCount(expenses, today) >= CALM_OBSERVATION_THRESHOLD) {
    return '차분한 날이 자주 있었어요 🍃';
  }
  if (computeIncomeDayCount(expenses, today) >= INCOME_OBSERVATION_THRESHOLD) {
    return '들어온 일이 종종 있었어요 🍃';
  }
  if (streak >= 7) return '요즘 자주 들르고 있어요 🌿';
  if (streak >= 3) return '꾸준히 들르고 있어요 🌿';
  if (streak >= 1) return '오늘도 잠깐 들렀네요 🍃';
  return '가끔씩 들러도 괜찮아요 🌿';
}
```

Also update the JSDoc priority list at the top of the function to include the new branch at position 4.

- [ ] **Step 3: Add tests**

Append to the existing `statsObservationService.test.ts`:

```typescript
describe('selectStatsObservation — income branch', () => {
  const today = '2026-05-24';

  it('fires when there are at least 2 income days within 30 days', () => {
    const expenses: Expense[] = [
      makeExpense({ kind: 'income', category: 'salary',  createdAt: '2026-05-01T09:00:00.000Z' }),
      makeExpense({ kind: 'income', category: 'refund',  createdAt: '2026-05-15T15:30:00.000Z' }),
    ];
    expect(selectStatsObservation(expenses, 0, today)).toBe('들어온 일이 종종 있었어요 🍃');
  });

  it('does not fire with only 1 income day in window', () => {
    const expenses: Expense[] = [
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-01T09:00:00.000Z' }),
    ];
    // Falls through to default (streak 0 → default)
    expect(selectStatsObservation(expenses, 0, today)).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('does not fire when income days are outside the 30-day window', () => {
    const expenses: Expense[] = [
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-04-01T09:00:00.000Z' }),
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-04-15T09:00:00.000Z' }),
    ];
    expect(selectStatsObservation(expenses, 0, today)).toBe('가끔씩 들러도 괜찮아요 🌿');
  });

  it('lifestyle texture (cafe) still beats income branch when both qualify', () => {
    const expenses: Expense[] = [
      // cafe pattern: 3 cafe records across 3 days in last 14
      makeExpense({ kind: 'spending', category: 'cafe', createdAt: '2026-05-20T09:00:00.000Z' }),
      makeExpense({ kind: 'spending', category: 'cafe', createdAt: '2026-05-21T09:00:00.000Z' }),
      makeExpense({ kind: 'spending', category: 'cafe', createdAt: '2026-05-22T09:00:00.000Z' }),
      // 2 income days too
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-01T09:00:00.000Z' }),
      makeExpense({ kind: 'income', category: 'refund', createdAt: '2026-05-15T15:30:00.000Z' }),
    ];
    expect(selectStatsObservation(expenses, 0, today)).toBe('요즘 카페에 자주 들렀네요 ☕');
  });

  it('income branch beats streak fallback when income threshold met', () => {
    const expenses: Expense[] = [
      makeExpense({ kind: 'income', category: 'salary', createdAt: '2026-05-01T09:00:00.000Z' }),
      makeExpense({ kind: 'income', category: 'refund', createdAt: '2026-05-15T15:30:00.000Z' }),
    ];
    expect(selectStatsObservation(expenses, 10, today)).toBe('들어온 일이 종종 있었어요 🍃');
  });

  it('multiple income records on same day count as 1 day', () => {
    const expenses: Expense[] = [
      makeExpense({ kind: 'income', category: 'salary',  createdAt: '2026-05-15T09:00:00.000Z' }),
      makeExpense({ kind: 'income', category: 'bonus',   createdAt: '2026-05-15T15:00:00.000Z' }),
    ];
    // Only 1 distinct income day, threshold is 2 → falls through
    expect(selectStatsObservation(expenses, 0, today)).toBe('가끔씩 들러도 괜찮아요 🌿');
  });
});
```

Use existing helpers from the same test file (`makeExpense`, etc.). Adjust shape to match.

- [ ] **Step 4: Run typecheck + tests**

```
npx tsc --noEmit
npx jest __tests__/statsObservationService.test.ts
```

Both clean. Six new tests added.

- [ ] **Step 5: Commit checkpoint**

```
git add 소박이/src/services/statsObservationService.ts 소박이/__tests__/statsObservationService.test.ts
git commit -m "feat(stats): add quiet income-day observation branch"
```

---

## Task 8: Allowance memory — narrow scope (controller task)

**Files:**
- `C:\Users\toodo\.claude\projects\c--Users-toodo-workspace-phy\memory\feedback_sobagi_allowance_giving_scene.md` (modify)

This task does not touch the repo. It updates the memory file to reflect the sub-spec A introduction of `received_allowance` as a distinct income token.

- [ ] **Step 1: Read the current memo**

Open the file and confirm its content. The memo currently broadly bans "income tracking" anywhere in Sobagi. Sub-spec C does not violate that ban (no totals, no tracking infrastructure, no salary commentary) — it adds quiet observational shape only. The memo needs clarification, not reversal.

- [ ] **Step 2: Apply the narrowing edits**

Update the memo body to:

1. **Keep:** the lock on `allowance` (🫶) as a giving scene; the 🫶 emoji constraint; the ban on income TRACKING (totals, comparison, budgeting, salary commentary).
2. **Add a new section** noting `received_allowance` (🤲) is the legitimate incoming counterpart and follows the income family tone (`feedback_sobagi_decoupled_signals.md` siblings).
3. **Clarify** that the original blanket ban targeted *gameified income tracking*. Sub-specs A/B/C added income as a quiet observational shape; this is permitted.

Suggested addition (paste verbatim into the memo, append to the existing body):

```markdown
**Sub-spec C clarification (2026-05-24):**
- `allowance` (🫶 용돈) — still a giving scene, outgoing only. Copy must never reframe as incoming. Emoji locked to 🫶.
- `received_allowance` (🤲 용돈 받음) — incoming scene, distinct token introduced in sub-spec A. Reads as "money given to me by someone." Tone follows the income family (든든한 / 따뜻한 / 안심되는), not the original giving frame.
- The two are deliberately NOT merged: a single 용돈 token would force the picker to ask "incoming or outgoing?" every save — finance-form behavior.
- The original ban targeted income TRACKING (totals, comparison, salary commentary, budgeting). Sub-specs A/B/C add income as a quiet observational shape (kind-gated dialogue, 2-rule emotion, quiet stats observation). This is permitted; gameified tracking remains banned.
```

- [ ] **Step 3: Save and update `MEMORY.md`**

The `MEMORY.md` index entry for this memo may need its one-line description updated to reflect the narrowed scope:

Current (likely):
```
- [Sobagi allowance is a giving scene, never income](feedback_sobagi_allowance_giving_scene.md) — 2026-05-19: 용돈 🫶 represents money given to someone (parents/kids); never reframe as income/salary; Sobagi is not for income tracking
```

Update to:
```
- [Sobagi allowance is a giving scene; received_allowance is the incoming counterpart](feedback_sobagi_allowance_giving_scene.md) — 2026-05-24: 용돈 🫶 (giving) and 용돈 받음 🤲 (incoming) are distinct tokens; ban on income TRACKING (totals/comparison) stands; quiet observational income shape is permitted
```

- [ ] **Step 4: No commit needed**

Memory files live outside the repo. They are not committed.

---

## Task 9: Final verification + handoff

**Files:**
- `소박이/docs/SOBAGI_CURRENT_STATE.md` (modify — Latest Handoff)
- `소박이/docs/SOBAGI_NEXT_PRIORITIES.md` (modify — strike sub-spec C, add commit list)

- [ ] **Step 1: Full typecheck**

```
npx tsc --noEmit
```
Expected: only the 2 pre-existing `_404.tsx` errors. Any other new error is a blocker.

- [ ] **Step 2: Full Jest suite**

```
npm test
```
Expected: all suites passing. Total test count increases by ~17 (6 emotionEngine income + 7 dialogue income + 2 nightPattern income + 6 statsObservation income), giving roughly **17 suites · 267 tests**. Exact totals depend on whether `emotionEngine.test.ts` existed before — recount after the run.

- [ ] **Step 3: Anti-pattern grep — banned vocabulary**

Run from `소박이/`:
```
git grep -n "수입" src/
git grep -n "수익" src/
git grep -n "매출" src/
git grep -n "보상" src/
git grep -n "리워드" src/
git grep -n "축하" src/
git grep -n "잘했어요" src/
git grep -n "성공" src/
git grep -n "잔액" src/
git grep -n "통장" src/
git grep -n "저축" src/
git grep -n "벌었" src/
git grep -n "입금" src/
git grep -n "💵\|💰\|💴" src/
```

Expected: no new matches in any of the touched files. Pre-existing matches in unrelated files (if any) are noted but not blockers.

- [ ] **Step 4: Anti-pattern grep — pebble path**

```
git grep -n "grantRest\|pebble" src/services/expenseService.ts
git grep -n "grantRest\|pebble" src/pages/record.tsx
git grep -n "grantRest\|pebble" src/pages/reaction.tsx
git grep -n "grantRest" src/
```

Expected:
- No matches in `expenseService.ts`, `record.tsx`, `reaction.tsx`.
- `grantRest` only appears in `restService.ts` (definition) and `hooks/useRestedAd.ts` (caller) — same as before sub-spec C.

If any new file references `grantRest`, Task 9 fails — surface immediately.

- [ ] **Step 5: Anti-pattern grep — emotion token integrity**

```
git grep -n "'calm'\|'relief'\|'warm'" src/
git grep -n "SobagiEmotion" src/types/index.ts
```

Expected: no new emotion-token literals introduced. `SobagiEmotion` type definition shows the same 5 tokens as before.

- [ ] **Step 6: Anti-pattern grep — income ternary residue**

```
git grep -n "derivedKind === 'income'" src/
git grep -n "kind === 'income' \? 'happy'" src/
git grep -n "'income' \? 'happy'" src/
```

Expected: no matches.

- [ ] **Step 7: Manual QA paths**

Walk each path mentally (no app run required, just static reasoning):

**Path A — income-only day**
- User saves an income record at 14:00.
- `evaluate(...)` → `evaluateIncome` → `'happy'`.
- `record.tsx` saves `sobagiEmotion: 'happy'`. No pebble grant.
- `reaction.tsx` renders. `selectReactionMessage('happy', tier, 'income')` returns from `INCOME_REACTION_POOLS[tier]`.
- `todayHasSpending = false` (sub-spec B) → no photocard button. Auto-dismiss returns to home.
- Stats view: day shows `●` in MonthPresenceRow (income-only with hasRecord). Calendar shows day with no spending amount (sub-spec A behavior).

**Path B — income-only late-night day**
- User saves an income record at 23:30.
- `evaluateIncome` → `'sleepy'`.
- `reaction.tsx` uses `INCOME_REACTION_POOLS[tier]` (emotion ignored on income kind). Sobagi visual shows sleepy face.
- No pebble grant.

**Path C — mixed day (spending + income)**
- Spending save: `evaluate` runs full spending chain (kind === 'spending' branch).
- Income save same day: `evaluate` runs `evaluateIncome`.
- Photocard handoff (after spending save): `todayHasSpending = true` → button reveals. Photocard right panel shows 쓴 기록 + 들어온 기록 groups (sub-spec B baseline).
- MonthPresenceRow: `●` (spending total > 0 dominates).

**Path D — first save of day is income**
- `isFirstRecordToday === true`, but engine ignores it on income branch.
- Result: `'happy'`, not `'surprised'`. Spec compliance.

**Path E — high-streak day, income save**
- `currentStreak === 10`, but engine ignores on income.
- Result: `'happy'`, not `'excited'`. Spec compliance.

**Path F — large salary save**
- `amount === 5_000_000`, but engine ignores amount on income.
- Result: `'happy'`, not `'soft-sad'`. Spec compliance.

**Path G — 2 income days last 30 days**
- Stats screen observation chain hits the new income branch.
- Returns `들어온 일이 종종 있었어요 🍃`.

**Path H — 1 income day last 30 days**
- Income branch fails (`< 2`). Falls through to streak.

**Path I — night pattern with mixed income/spending**
- Salary at 22:30 + 2 spending records at 22:00 across 3 nights.
- After Task 6 filter: only the 2 spending records count.
- `hasNightPattern` returns false (needs 3 distinct nights of spending) → night observation does NOT fire.

If any path's predicted behavior contradicts the spec, debug before continuing.

- [ ] **Step 8: Update `SOBAGI_CURRENT_STATE.md` Latest Handoff**

Replace the existing `## Latest Handoff` block with:

```markdown
## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-24
**Group:** Income system integration (sub-spec C of "Income records" decomposition — final layer)

### What changed
- **Emotion engine:** new `evaluateIncome` subroutine (2-rule chain: hour ≥ 22 → `'sleepy'`, else → `'happy'`). `evaluate()` routes `kind === 'income'` through it. Spending chain unchanged. `record.tsx` no longer has the `derivedKind === 'income' ? 'happy' : evaluate(...)` ternary.
- **Dialogue:** new `INCOME_REACTION_POOLS` (3 tiers × 3 lines, all warmth/relief-toned, no banned vocabulary). `selectReactionMessage(emotion, tier, kind = 'spending')` gates on kind before reading the spending pool. `reaction.tsx` passes the latest expense's `kind`.
- **Stats observation:** new income-day branch in `selectStatsObservation` — fires `들어온 일이 종종 있었어요 🍃` when there are ≥ 2 distinct income days in the trailing 30 days. Inserted between calm-day and streak ≥ 7. Lifestyle texture (cafe / night / calm) still wins.
- **MonthPresenceRow:** `DayCellData` extended with `hasRecord` and `hasOnlyNoSpend`. Income-only days now render `●` (same as spending). No-spend-only still renders `🌿`. Truth table verified.
- **Night pattern detector:** `hasNightPattern` newly filters out `kind === 'income'` so salary-deposit timestamps don't impersonate late-night user activity.
- **Tests:** ~17 new tests across `emotionEngine`, `dialogueService`, `roomPresenceService`, `statsObservationService`. Includes explicit negative tests proving income emotion ignores amount, streak, and first-of-day; and that `'surprised'` is never returned for income.

### What's now working
- Income save at any hour resolves through the engine with quiet warmth tone, never event/celebration tone.
- Dialogue copy for income is tonally coherent across all tiers and emotion combinations.
- Stats screen surfaces income as a quiet recurrence ("들어온 일이 종종 있었어요"), never as a number or comparison.
- MonthPresenceRow reads income-only days as presence (●) without categorizing them as spending vs income.
- Night pattern stays anchored to user late-night presence, not system-generated income timestamps.

### Preserved (regression-confirmed)
- `SobagiEmotion` union — unchanged 5 tokens.
- `EMOTION_MESSAGES`, `VALID_EMOTIONS`, mood asset resolver — untouched.
- `expenseService.recordNoSpend` — still emits `'happy'`.
- `restService` / pebble jar / rest letters — untouched. No new code path writes pebble state.
- `foundItemService` T1/T2/T3 — kind-agnostic presence shape preserved.
- `hasCategoryPattern` (cafe), `computeCalmDayCount` (atmosphere), T4 (small-purchase) — all kept spending-keyed.
- Photocard components — sub-spec B baseline untouched.
- No storage keys added, removed, or renamed.

### What the next agent must NOT do
- Add a new `SobagiEmotion` token (`'calm'` / `'relief'` / etc.).
- Re-route income through `'surprised'` on first-of-day.
- Grant pebbles on any income code path.
- Introduce income totals, net balance, or comparison framing anywhere.
- Add a differentiated MonthPresenceRow glyph for income.
- Touch `hasCategoryPattern`, `computeCalmDayCount`, or T4 to "include" income — they are spending-keyed by design.

### No new storage keys
No storage keys were added, removed, or renamed.

### Next
The "Income records" decomposition (sub-specs A → B → C) is now complete. Backlog items from `SOBAGI_NEXT_PRIORITIES.md` resume normal priority order: rest-TV production ad ID swap, photocard small polish (time-of-day label / Sobagi signature / early-dismiss guard), Android keyboard verification.
```

- [ ] **Step 9: Update `SOBAGI_NEXT_PRIORITIES.md`**

In the `Up next` section, strike through the sub-spec C entry. In `Recently completed`, prepend a new entry with the commit range from this work:

```markdown
- [x] **Income system integration (sub-spec C)** — `evaluateIncome` 2-rule subroutine (hour ≥ 22 → `'sleepy'`, else → `'happy'`); explicit negative tests prove amount / streak / first-of-day / `'surprised'` are never consulted. `INCOME_REACTION_POOLS` (3 tiers × 3 lines, warmth/relief tone, kind-gated selector). `MonthPresenceRow` income-only days render `●`. `hasNightPattern` filters income out. `selectStatsObservation` gains one quiet income branch (`들어온 일이 종종 있었어요 🍃`) at ≥ 2 income days in 30. Memory file `feedback_sobagi_allowance_giving_scene.md` narrowed to clarify `received_allowance` as legitimate incoming counterpart. No new emotion token; no storage change; no pebble interaction; no `restService` touches. ~17 new tests (267 total). Commits `<start>` → `<end>`. (2026-05-24)
```

Replace `<start>` and `<end>` with the actual first/last commit SHAs after the push step below.

- [ ] **Step 10: Commit the handoff updates**

```
git add 소박이/docs/SOBAGI_CURRENT_STATE.md 소박이/docs/SOBAGI_NEXT_PRIORITIES.md
git commit -m "docs: sub-spec C (income system integration) handoff"
```

- [ ] **Step 11: Push**

```
git push
```

Expected: clean push, no rejected refs. Report the commit range to the human.

---

## Final acceptance gate

Before declaring sub-spec C complete, confirm all of the following pass:

- [ ] `npx tsc --noEmit` — only `_404.tsx` errors remain.
- [ ] `npm test` — all suites green, count roughly 17 suites / ~267 tests (exact number depends on baseline file presence).
- [ ] All 6 Task 9 anti-pattern grep blocks are clean.
- [ ] All 9 manual QA paths (A–I) trace correctly.
- [ ] No new file references `restService`, `grantRest`, or `pebble`.
- [ ] `SobagiEmotion` union unchanged.
- [ ] No storage keys added.
- [ ] Memory file `feedback_sobagi_allowance_giving_scene.md` updated (controller task — confirm before close).
- [ ] CURRENT_STATE Latest Handoff replaced.
- [ ] NEXT_PRIORITIES has sub-spec C in Recently completed with commit range.

If any gate fails, surface to the human before pushing.

---

*End of plan.*
