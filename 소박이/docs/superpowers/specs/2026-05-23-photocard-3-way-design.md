# Sobagi — Photocard 3-Way Layout (Sub-spec B)

**Date:** 2026-05-23
**Status:** Draft — awaiting review
**Parent:** `docs/superpowers/specs/2026-05-23-income-record-data-model-design.md`
**Predecessors:** Sub-spec A landed 2026-05-23 (`a4f4287`) — income data model, stats split, edit-sheet kind derivation, interim photocard `kind` plumbing
**Successor:** Sub-spec C — emotion engine / dialogue / pebble / room-presence integration (deferred)

---

## Section 1 — Why redesign

The current photocard right-panel reads as a spending receipt, not a memory keepsake.

**Concrete tensions with `SOBAGI_PHILOSOPHY.md §The Photocard`:**

| Philosophy rule | Current behavior |
|---|---|
| "A spending summary with emotional decoration" is what the photocard is **not** | `총 금액 ₩ X` block sits at 18pt bold — the loudest text in the right panel |
| 65% screenshot test: top 65% should be Sobagi + quote | Quote lives at the bottom of the right panel, below records |
| "The data is context. The atmosphere is the point." | Records + total dominate the right panel's visual weight |

Sub-spec A added income records that flow through the same photocard, which currently means an income save can produce a "you earned ₩ X today" receipt — exactly the framing the spec's anti-pattern list ([sub-spec A §9](2026-05-23-income-record-data-model-design.md)) explicitly bans.

Sub-spec B fixes both problems in a single pass:
1. Restructure the right panel so the aggregate amount disappears and per-record lines remain quietly listed.
2. Group records by kind (쓴 / 들어온 / 무지출) so income surfaces as its own quiet section, never blended into a spending receipt.
3. Hide the photocard entry point on income-only days so the keepsake stays a spending-memory artifact.

---

## Section 2 — Decisions (resolved before drafting)

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Fate of the `총 금액` block | **Removed entirely** | PHILOSOPHY §The Photocard "not a spending summary"; allows quote/Sobagi to read as the hero of the card |
| D2 | Income-only day entry point | **Hidden** (no photocard button) | Current sub-spec A behavior in `stats.tsx`; sub-spec B extends this to `reaction.tsx`. Photocard remains a spending-memory artifact |
| D3 | Mood asset behavior with income | **Unchanged** | Income → hardcoded `'happy'` per sub-spec A, which already feeds existing mood resolver. Asset overhaul deferred to sub-spec C |
| D4 | Reaction-screen vs Stats photocard parity | **Identical content rules** | Both render `PhotocardView` with same prop shape; only the data source (today's records vs selected day's records) differs |

Two design choices made during drafting (open to redirect):

| # | Choice | Rationale |
|---|---|---|
| D5 | **Conditional group rendering** — sections appear only when records exist for that kind | Most days have one kind. Always rendering empty group headers re-introduces dashboard density |
| D6 | **Small muted group labels** above each group (not full-weight headers) | Makes the 3-way structure legible without becoming a finance-form layout. Style follows the existing `weekdaySub` 9pt / `TEXT_MUTED` treatment |

---

## Section 3 — Card composition (new structure)

Right panel, top → bottom:

```
┌──────────────────────────────┐
│ 2026.05.23                   │  ← dateHeader (16pt bold)
│ 토요일 · 오늘의 기록          │  ← weekdaySub (9pt muted)
├──────────────────────────────┤
│                              │
│ 쓴                            │  ← group label (9pt muted)
│ ☕ 카페 · 라떼       ₩ 5,000  │  ← record row (10pt)
│ 🍚 집밥             ₩ 8,000  │
│                              │
│ 들어온                        │  ← group label (rendered only if income present)
│ 💼 월급                       │  ← income row, amount hidden when 0
│                              │
├──────────────────────────────┤
│ 🌱 오늘의 한 줄                │  ← noteBlock heading (9pt muted)
│ "조용히 기록해뒀어요 🌿"        │  ← quote (11pt)
└──────────────────────────────┘
```

**What was removed:**
- `totalBlock` (의 9pt label + 18pt amount)
- The divider between `totalBlock` and `recordsBlock` (subsumed by group structure)

**What stayed:**
- Date header + weekday sub (carries snapshot identity)
- Per-record amount column (the existing kind-aware hide rule from sub-spec A keeps income-amount-0 rows quiet)
- Quote block at the bottom — kept here for sub-spec B scope. Lift to top is a separate typography pass (Section 8)
- Left panel (mood asset + time badge) — completely unchanged

**Section ordering rule (top → bottom):**
1. 쓴 (when present)
2. 들어온 (when present)
3. 무지출 (when standalone — see Section 4)

---

## Section 4 — Grouping rules

### 4.1 What goes in each group

| Group | Inclusion rule | Source |
|---|---|---|
| 쓴 | `e.kind !== 'income' && e.category !== 'no_spend'` | Regular spending records |
| 들어온 | `e.kind === 'income'` | All 5 income tokens |
| 무지출 | `e.category === 'no_spend'` | Only appears on no-spend-only days (see §4.3) |

### 4.2 Rendering conditions

A group section is rendered when:
- Its records array (after filtering) has at least one entry, **and**
- The photocard itself is being rendered (i.e., entry-point gate passed — see Section 5)

A photocard is never rendered with zero groups. The entry-point gate guarantees ≥1 group.

### 4.3 The 무지출 group edge case

No-spend records cannot coexist with other records by construction (the no-spend button at `record.tsx:140-144` is gated on `!hasRecordOnSelectedDate`). So a day either has:

- (a) Spending records (possibly with income added later that day) — 쓴 group always; 들어온 if applicable
- (b) Income records only — entry point hidden per D2; no card rendered
- (c) No-spend only — entry point gated by `selectedSpendingExpenses.length > 0` in stats; no card rendered

In practice, **the 무지출 group is currently unreachable in the live photocard rendering path**. We keep the conditional in the type system + grouping logic for forward compatibility and for the rare case where future UI changes enable mixed-with-no_spend days. Implementation should render the 무지출 group when the data shape calls for it, but the entry-point gate will prevent it from surfacing under current rules.

### 4.4 Per-group amount rule

No per-group sub-totals. The spec's anti-pattern list (sub-spec A §9) forbids monthly income totals; per-group totals on a photocard would re-create the same finance-summary energy. Individual record amounts remain (already kind-aware: income `amount === 0` hides the column).

---

## Section 5 — Entry-point policy

Both surfaces gate the photocard button on **at least one spending record existing for the day in question**. Income-only and no-spend-only days never expose the button.

### 5.1 `stats.tsx` (already correct after sub-spec A)

Current line 471:
```tsx
{selectedSpendingExpenses.length > 0 && (
  <Pressable style={styles.photocardEntryBtn} onPress={openDayPhotocard}>
    <Text style={styles.photocardEntryText}>포토카드 생성</Text>
  </Pressable>
)}
```
✓ No change required.

### 5.2 `reaction.tsx` (new gate)

Current behavior: photocard button fades in unconditionally at 1000ms regardless of kind. Required change:

- Compute `todayHasSpending = todayExpenses.some((e) => e.kind !== 'income' && e.category !== 'no_spend')` at the top of the screen.
- Only schedule the button fade-in (`setPhotocardBtnVisible(true)` + opacity animation) when `todayHasSpending === true`.
- When `todayHasSpending === false`, leave the auto-dismiss timer in place (3500ms → home) and never reveal the button. Reaction screen for an income-only or no-spend-only save still feels acknowledged via title + hearts + Sobagi; just no photocard handoff.

This matches the philosophy of "the card appearing is the complete experience" — the absence of a card for income-only days is not a degradation, it's the spec.

---

## Section 6 — Type / API changes

### 6.1 `PhotocardRecord` (no shape change)

Already carries `kind?: RecordKind` from sub-spec A. No new fields.

### 6.2 `PhotocardView` props

| Prop | Status | Notes |
|---|---|---|
| `amount` | **Deprecated / unused** | Block that consumed it is removed. Keep the prop for backward compatibility — accept and ignore. Callers may continue passing it; a follow-up pass can drop it once all callers are clean. Marked optional in the type. |
| `records` | Unchanged | The single source of truth for what's on the card |
| `quote`, `dateStr`, `weekdayLabel`, `timeLabel` | Unchanged | |
| Everything else | Unchanged | |

### 6.3 New internal helper inside `PhotocardView`

```typescript
function groupByKind(records: PhotocardRecord[]): {
  spending: PhotocardRecord[];
  income: PhotocardRecord[];
  noSpend: PhotocardRecord[];
} {
  // Filter on category for no_spend (since no_spend.kind is 'spending')
  // and kind for income.
}
```

Pure, exported for testing if needed. Caller (`PhotocardView`) computes once and renders three conditional `View` sections.

### 6.4 Caller updates

`reaction.tsx`:
- Add the `todayHasSpending` gate (Section 5.2)
- `todayTotal` calculation no longer needed for the `amount` prop (since the prop is unused); can be removed in a follow-up commit but isn't blocking
- `todaySpendingExpenses` already filters `no_spend`; **must also filter income** since `photocardRecords` now needs to include all of today's records (so the income group can render). Reverse the filter direction: pass all today's records, let `PhotocardView` group them
- Result: `photocardRecords` is built from `todayExpenses.filter((e) => e.category !== 'no_spend')` and passed as-is

`stats.tsx`:
- Current line 251 builds `photocardRecords` from `selectedSpendingExpenses` (spending-only, by design from sub-spec A interim).
- After B: build from `selectedExpenses.filter((e) => e.category !== 'no_spend')` so the income group can render on mixed days.
- Entry-point gate on `selectedSpendingExpenses.length > 0` stays — that decides whether the card opens at all.

---

## Section 7 — File-level scope

### Create

- `소박이/__tests__/photocardGrouping.test.ts` — covers `groupByKind`, edge cases (empty input, all-income, all-spending, mixed, no_spend mixed)

### Modify

- `소박이/src/components/photocard/PhotocardView.tsx`
  - Remove `totalBlock` + its divider
  - Add `groupByKind` helper
  - Restructure `recordsBlock` rendering into up to 3 grouped sub-sections
  - Mark `amount` prop deprecated (keep for backcompat); update JSDoc
  - Add `groupLabel` style entry
- `소박이/src/pages/reaction.tsx`
  - Add `todayHasSpending` gate around the button reveal effect
  - Pass full (non-no_spend) records to `PhotocardView` so the income group can render on mixed days
- `소박이/src/pages/stats.tsx`
  - Pass `selectedExpenses.filter((e) => e.category !== 'no_spend')` (instead of `selectedSpendingExpenses`) as `records` so the income group can render in the day's photocard
  - Entry-point gate unchanged

### Unchanged

- `PhotocardMoodAsset` resolver and asset URIs (mood asset overhaul deferred to sub-spec C)
- `photocardMoodService.ts`
- Left panel structure, time badge, reveal animation, modal overlay
- `recordNoSpend` flow
- `emotionEngine`, dialogue pools, storage shape
- `useExpenseStore`, `useUserStore`, `useEmotionStore`
- Stats edit sheet (already kind-aware after sub-spec A)
- All atmosphere / room-presence / found-item / pebble services

---

## Section 8 — Out of scope (deferred)

These are valid future polish but **must not** land in sub-spec B:

- **Quote position lift to top of right panel** (full 65% rule alignment). Requires re-laying out the whole right panel; treat as a separate typography pass after B settles.
- **Mood asset overhaul for income** — sub-spec C decides whether income gets a distinct asset, weather signal, or stays on the happy path.
- **PhotocardMoodAsset / weather / spendingLevel interaction with income** — entire signal-resolution rewrite deferred.
- **Per-group typography refinement** beyond the 9pt muted group label (e.g., olive accent for 들어온, dotted divider between groups).
- **Income-only photocard policy** (allowing the card to render with only 들어온). Decided as "hidden" for B; reopening is a separate spec.

---

## Section 9 — Anti-patterns (must not appear in sub-spec B)

- **수입 / 수입 총액 / income visible to user.** Group label is **들어온** (carrying over from stats.tsx); never **수입**.
- **Per-group monetary aggregate** (no "들어온 ₩ X" subtotal under the 들어온 label).
- **Side-by-side or +/- comparison** of 쓴 vs 들어온 (no green/red coloring, no `−`/`+` prefixes, no aligned-column layout that invites mental arithmetic).
- **Celebration on income save photocard** (no special burst, no different reveal animation).
- **Removing the 65% rule entirely.** Quote stays in the card; if anything, sub-spec B makes it more prominent by removing the loud `총 금액` competing element above it.
- **Migrating storage** to denormalize kind into the photocard data. PhotocardRecord remains the runtime-only shape.

---

## Section 10 — Success criteria

After sub-spec B landing:

- A spending-only photocard renders identically to sub-spec A behavior except: no `총 금액` block, and a small 쓴 group label above the records.
- A mixed (spending + income) photocard shows `쓴` group with spending records, followed by `들어온` group with income records. Income amounts respect the sub-spec A hide rule (₩ 0 hidden, amount > 0 shown muted).
- An income-only save reaches the reaction screen, sees the title + hearts + Sobagi message, and **does not see the photocard button**.
- An income-only day in stats does not show the `포토카드 생성` button (unchanged from sub-spec A).
- A no-spend-only day shows neither photocard button (unchanged).
- The right panel's loudest text is no longer the total — Sobagi's quote and the date header carry the visual weight.
- Existing test suites remain green; new `photocardGrouping.test.ts` covers grouping logic.
- Typecheck stays clean (2 pre-existing `_404.tsx` errors only).
- Anti-pattern grep finds no new matches: `수입 / 순수익 / 손익 / balance / profit / net income / incomeTotal / totalIncome / sumIncome / incomeSum`.

---

## Open questions deferred to sub-spec C

- Should reaction-screen photocard suppression on income-only days be reconsidered once sub-spec C adds an income dialogue pool?
- Should the quote text differ for income-mixed days? (Probably yes — sub-spec C handles dialogue routing.)
- Should the day-card photocard in stats expose a separate "들어온 카드" affordance later, or stay spending-only forever?
- `MonthPresenceRow` income glyph treatment (also in sub-spec C scope).

These do not block sub-spec B.
