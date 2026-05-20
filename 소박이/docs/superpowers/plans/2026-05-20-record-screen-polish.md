# Record Screen Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Record screen so it feels lightweight, calm, and scene-oriented — chip selected-state shifts to wood family, breathing room nudges up, accounting language drops, the no-spend button recedes from card-peer to a quiet centered prompt.

**Architecture:** Pure presentation-layer changes. No logic, services, types, or state touched. Two source files modified across two focused commits; one docs commit at the end. Polish-only — no new tests required.

**Tech Stack:** React Native 0.84, TypeScript 5.8, existing `COLORS` token system at `src/constants/colors.ts`.

**Spec:** `docs/superpowers/specs/2026-05-20-record-screen-polish-design.md`

---

## File Structure

**Modify:**
- `src/components/expense/CategorySelector.tsx` — chip styling refinement (Task 1).
- `src/pages/record.tsx` — remove `카테고리` label, memo placeholder text, no-spend button styles + label text (Task 2).
- `docs/SOBAGI_CURRENT_STATE.md`, `docs/SOBAGI_NEXT_PRIORITIES.md` — handoff (Task 3).

**Unchanged:**
- All services, hooks, stores, types, and constants. No taxonomy, no logic, no routing.

---

## Task 1: Category chip refinement

**Files:**
- Modify: `src/components/expense/CategorySelector.tsx`

- [ ] **Step 1: Update the chip styles**

Edit `src/components/expense/CategorySelector.tsx`. Replace the entire `styles` `StyleSheet.create` block with:

```tsx
const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingVertical: 2,
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

Diff from current:
- `row.gap`: `8` → `10`
- `chip.paddingHorizontal`: `16` → `18`
- `chip.paddingVertical`: `10` → `12`
- `chipSelected.backgroundColor`: `COLORS.oliveGreen` → `COLORS.woodLight`
- `chipSelected.borderColor`: `COLORS.oliveDark` → **removed** (the chip's `borderColor: 'transparent'` now applies in both states)
- `chipSelected`: **added** `shadowColor: COLORS.wood`, `shadowOpacity: 0.10`, `shadowRadius: 4`, `shadowOffset: { width: 0, height: 2 }`, `elevation: 1`
- `emoji.fontSize`: `20` → `22`
- `labelSelected.color`: `'#fff'` → `COLORS.text`

Nothing else changes. The JSX (the function body of `CategorySelector`) and the imports stay exactly as they are.

- [ ] **Step 2: Typecheck**

Run from `소박이/`:

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output.

- [ ] **Step 3: Run the full test suite (no test file references chip styles, but verify nothing regressed)**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 4: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/components/expense/CategorySelector.tsx && git commit -m "$(cat <<'EOF'
style: warmer category chip selected-state + breathing room

Selected background woodLight (was oliveGreen) with text-color label.
Padding bumps for breathing room (16/10 → 18/12), gap 8 → 10,
emoji 20 → 22. Adds a subtle shadow lift on selected chip (iOS
shadow + elevation 1 on Android). Drops the dark-olive border on
selected — would have clashed with the new wood family.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: record.tsx — tone copy + no-spend visual reduction

**Files:**
- Modify: `src/pages/record.tsx`

- [ ] **Step 1: Remove the "카테고리" label**

In `src/pages/record.tsx`, find the Category section (around lines 258–262):

```tsx
        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>카테고리</Text>
          <CategorySelector selected={category} onSelect={setCategory} />
        </View>
```

Delete the `<Text style={styles.sectionLabel}>카테고리</Text>` line entirely. Final result:

```tsx
        {/* Category */}
        <View style={styles.section}>
          <CategorySelector selected={category} onSelect={setCategory} />
        </View>
```

Do not add a replacement heading. The chip row leads its own section.

- [ ] **Step 2: Update the memo placeholder**

In the same file, find the memo `TextInput` (around line 290):

```tsx
            placeholder="오늘 소비에 대한 한마디..."
```

Change to:

```tsx
            placeholder="오늘에 대한 한마디..."
```

(Just removes the "소비에 대한" framing.)

- [ ] **Step 3: Update the no-spend label text**

In the same file, find the no-spend label (around line 236):

```tsx
            <Text style={styles.noSpendLabel}>오늘은 무지출이에요</Text>
```

Change to:

```tsx
            <Text style={styles.noSpendLabel}>오늘은 무지출이에요 🌿</Text>
```

- [ ] **Step 4: Reduce no-spend button visual weight**

In the same file's `StyleSheet.create` block, find `noSpendBtn` and `noSpendLabel` (around lines 402–417):

```tsx
  noSpendBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  noSpendLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
```

Replace with:

```tsx
  noSpendBtn: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  noSpendLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
```

Diff:
- `noSpendBtn.backgroundColor`: `COLORS.surface` → `'transparent'`
- `noSpendBtn.borderWidth`: **removed**
- `noSpendBtn.borderColor`: **removed**
- `noSpendBtn.paddingVertical`: `14` → `10`
- `noSpendBtn.paddingHorizontal`: `20` → `16`
- `noSpendBtn.marginBottom`: `16` → `12`
- `noSpendLabel.fontSize`: `14` → `13`
- Everything else on these two style objects stays the same.

- [ ] **Step 5: Typecheck**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404" | head -10
```

Expected: empty output.

- [ ] **Step 6: Run the full test suite**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService
```

Expected: all suites green.

- [ ] **Step 7: Confirm scope (only `record.tsx` changed)**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git status --short
```

Expected: only `M  src/pages/record.tsx` (and possibly the LF/CRLF warning line on commit, harmless).

- [ ] **Step 8: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add src/pages/record.tsx && git commit -m "$(cat <<'EOF'
style: record screen tone — drop "카테고리" label, soften copy + no-spend

Removes the "카테고리" section label so the chip row visually leads
itself. Memo placeholder drops "소비" framing ("오늘 소비에 대한
한마디..." → "오늘에 대한 한마디..."). No-spend button visually recedes
from card-peer (background transparent, border removed, smaller
padding + font); label gains a 🌿 leaf hint consistent with the
no_spend marker used elsewhere.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Docs handoff

**Files:**
- Modify: `docs/SOBAGI_CURRENT_STATE.md`
- Modify: `docs/SOBAGI_NEXT_PRIORITIES.md`

- [ ] **Step 1: Replace the `## Latest Handoff` section in `SOBAGI_CURRENT_STATE.md`**

Find the existing `## Latest Handoff` block (it currently describes the life-scene category landing). Replace the entire block between `## Latest Handoff` and the next `---` separator with:

```markdown
## Latest Handoff

**Agent:** Engineering
**Date:** 2026-05-20
**Group completed:** Record screen polish (chip warmth, tone copy, quiet no-spend)

### What changed
- `src/components/expense/CategorySelector.tsx` — selected chip background `oliveGreen → woodLight`, selected label `white → text`, paddings `16/10 → 18/12`, row `gap 8 → 10`, emoji `20 → 22`, dropped the `oliveDark` border override on selected, added a subtle shadow (iOS) + `elevation: 1` (Android) on the selected chip.
- `src/pages/record.tsx` — removed the `카테고리` `<Text>` label above the chip row (no replacement heading); memo placeholder `"오늘 소비에 대한 한마디..." → "오늘에 대한 한마디..."`; no-spend label gains a `🌿` hint; no-spend button styles recede to transparent / borderless / tighter padding.

### What's now working
- The category chip row reads with warmer, less-stamped selected state. Wood now signals "scene-tagged" while olive remains the primary-action color (save CTA, date chips, emotion chips).
- The Record screen reads cleaner: no `카테고리` accounting label, no `소비` framing in the placeholder.
- The no-spend button no longer competes visually with the amount card; it sits as a quiet centered prompt above the form, only when `!hasRecordToday && !isSaving && selectedDate === todayStr`.

### Fragile / surprising
- The reaction loop is structurally correct and was intentionally NOT modified. Findings documented in the spec (Section 4) as known trade-offs:
  - No in-flight visual besides dimmed save button. AsyncStorage saves typically <100ms. Adding a spinner would push the screen toward app-form energy.
  - No-spend button doesn't dim when `isSaving` flips; it relies on `canNoSpend` gating the handler. Sub-1-frame race window, acceptable.
  - `evaluate` builds a transient partial expense object for emotion evaluation; the stand-in never reaches storage.

### What the next agent must NOT do
- Don't reintroduce a label above the chip row. The chip emojis lead the section.
- Don't add a loading spinner or progress UI to save / no-spend. The restraint is intentional.
- Don't add a border or card chrome back to the no-spend button.
- Don't shift category chip selected back to olive — wood is intentional differentiation from primary-action surfaces.
- Don't change the no-spend visibility gate or the no-spend services.

### Next
Stats screen evolution (separate spec, follow-up landing): tone review, rhythm summaries, small additive pattern-signal surface, visual density review.
```

- [ ] **Step 2: Update `SOBAGI_NEXT_PRIORITIES.md`**

Update the header date. The current top line reads:
```
**Last updated:** 2026-05-19 (Engineering — life-scene category taxonomy landed)
```

Replace with:
```
**Last updated:** 2026-05-20 (Engineering — record screen polish landed)
```

Add a new entry at the very top of `## Recently completed` (before the existing "Life-scene category taxonomy" entry):

```markdown
- [x] **Record screen polish** — `CategorySelector` selected chip moves to `woodLight` with subtle shadow + slight breathing-room bumps; `src/pages/record.tsx` removes the `카테고리` label, drops `소비` from the memo placeholder, and recedes the no-spend button from card-peer to a quiet centered prompt with a 🌿 hint. Reaction loop audited only — restraint preserved, no functional edits. (2026-05-20)
```

- [ ] **Step 3: Commit**

```bash
cd "c:/Users/toodo/workspace/phy/소박이" && git add docs/SOBAGI_CURRENT_STATE.md docs/SOBAGI_NEXT_PRIORITIES.md && git commit -m "$(cat <<'EOF'
docs: record screen polish handoff

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Final verification

After Task 3:

- [ ] Run the full test suite one more time: `cd "c:/Users/toodo/workspace/phy/소박이" && npx jest --testPathIgnorePatterns letterService` — all green.
- [ ] Run typecheck: `cd "c:/Users/toodo/workspace/phy/소박이" && npx tsc --noEmit 2>&1 | grep -E "^(src|error)" | grep -v "_404"` — empty.
- [ ] Visual smoke (manual, optional): `npx ait dev` and verify the Record screen — chip row leads with no header, selected chip is warm wood, no-spend prompt sits quietly between date chips and amount card. The reviewer can also tap a chip on Android to confirm `elevation: 1` produces only a hairline lift, not a chunky shadow.

Three commits total, each touching one logical area. No tests, no migrations, no services — polish-only landing.
