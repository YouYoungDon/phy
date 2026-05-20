# Record Screen Polish — Design Spec

**Date:** 2026-05-20
**Status:** Approved
**Branch target:** apps-in-toss-clean
**Companion:** Stats Evolution spec (separate, to follow this landing)

---

## Goal

A polish pass on the Record screen so it feels lightweight, calm, and welcoming for daily use. Pull the screen further away from "submitting an expense form" energy and toward "recording a moment from today." No navigation or architecture changes; no new features.

## Philosophy

- The Record screen is a daily-use surface — restraint over decoration, breathing room over density.
- The category row is a row of *scenes*, not accounting buckets. Selected-state warmth reinforces that.
- The no-spend action is a quiet daily-presence option, never a competing CTA.
- The reaction loop is structurally correct already; intentional restraint (no spinners, no extra loading UI) is preserved.

## Section 1 — Category chip refinement

**File:** `src/components/expense/CategorySelector.tsx`

Selected-state warmth shifts from olive to wood. Chip breathing room and tap target both bump slightly.

| Property | Current | New |
|---|---|---|
| `chipSelected.backgroundColor` | `COLORS.oliveGreen` (#6B7C4A) | `COLORS.woodLight` (#C4A882) |
| `labelSelected.color` | `'#fff'` | `COLORS.text` (#3D3020) |
| `chip.paddingHorizontal` | `16` | `18` |
| `chip.paddingVertical` | `10` | `12` |
| `row.gap` | `8` | `10` |
| `emoji.fontSize` | `20` | `22` |
| `chipSelected.borderColor` | `COLORS.oliveDark` | **removed** (override dropped; inherits `'transparent'` from `chip`) |
| **New on `chipSelected`:** subtle lift | — | `shadowColor: COLORS.wood`, `shadowOpacity: 0.10`, `shadowRadius: 4`, `shadowOffset: { width: 0, height: 2 }`, `elevation: 1` |

The selected chip gets a very subtle lift via shadow (iOS) + `elevation: 1` (Android). The pre-existing dark-olive border override on selected chips is dropped because it would clash with the wood-family selected background — the shadow alone now carries the "selected" affordance. `borderRadius`, `chip.flexDirection`, `chip.alignItems`, `chip.gap`, the unselected `chip.backgroundColor` (`COLORS.surface`), and label `fontSize` / `fontWeight` all stay unchanged.

Olive remains the "primary action" color elsewhere (save CTA, date chips, emotion chips). Wood becomes the "scene-tagged" affordance unique to the category row.

## Section 2 — Tone & copy

**File:** `src/pages/record.tsx`

Three tone touch-ups; everything else stays.

| Location | Current | New |
|---|---|---|
| Section label above the chip row | `<Text style={styles.sectionLabel}>카테고리</Text>` | **removed** (delete the `<Text>` element; keep the `<View style={styles.section}>` wrapper and the `<CategorySelector ...>` child) |
| Memo input placeholder | `오늘 소비에 대한 한마디...` | `오늘에 대한 한마디...` |

Removing the `카테고리` label means the chip row leads its own section, with the existing top `marginBottom: 24` from the previous section (`amountCard`) providing breathing room. No replacement heading.

Unchanged copy (already aligned with the scene-based tone):
- Header title: `기록하기`
- Page subtitle: `오늘을 기록해요 ✏️`
- Memo section label: `한마디 (선택)`
- Emotion section label: `기분은 어때요?`
- Save CTA: `저장하기`

## Section 3 — No-spend button polish

**File:** `src/pages/record.tsx` (styles + label text)

The no-spend button currently reads as a peer card to the amount card directly below it (`surface` background, `border`, similar vertical chunk). The polish reduces it to a quiet centered prompt while keeping the same visibility gate and tap behavior.

| Property | Current | New |
|---|---|---|
| `noSpendBtn.backgroundColor` | `COLORS.surface` | `'transparent'` |
| `noSpendBtn.borderWidth` | `1` | **removed** |
| `noSpendBtn.borderColor` | `COLORS.border` | **removed** |
| `noSpendBtn.paddingVertical` | `14` | `10` |
| `noSpendBtn.paddingHorizontal` | `20` | `16` |
| `noSpendBtn.marginBottom` | `16` | `12` |
| `noSpendBtn.borderRadius` | `16` | keep (harmless on transparent bg, preserves consistent tap-feedback shape) |
| `noSpendLabel.fontSize` | `14` | `13` |
| `noSpendLabel.color` | `COLORS.textMuted` | unchanged |
| Label text | `오늘은 무지출이에요` | `오늘은 무지출이에요 🌿` |

The 🌿 hint matches the same leaf glyph used elsewhere for `no_spend` (stats calendar marker, history card label). No change to:
- The visibility gate `!hasRecordToday && !isSaving && selectedDate === todayStr`
- The `handleNoSpend` handler
- The `recordNoSpend` service call
- The placement between the date chip row and the amount card

## Section 4 — Reaction loop QA (audit only, no code changes)

A code-level audit of the record → save → reaction flow ([record.tsx:120-177](../../소박이/src/pages/record.tsx)) confirms the loop is structurally correct. No edits in this spec.

### Verified correct

- **Sobagi visible immediately on reaction screen.** `setEmotion(sobagiEmotion, reactionMessage)` updates the Zustand store synchronously before `navigate('/reaction')`. The reaction screen mounts with the new emotion already present.
- **No race between save and reaction state.** `await saveExpense()` resolves before navigate.
- **No-spend follows the same pattern.** `recordNoSpend()` awaited → `setEmotion('happy', '오늘은 조용히 머물렀네요 🌿')` → navigate.
- **Cold start.** `useAppInit` is gated by `appInitialized` and hydrates before any record screen renders.
- **Different emotions.** `evaluate()` runs a synchronous priority chain in `emotionEngine.ts`; result lands in store before navigate.
- **Repeated daily usage.** `OBSERVATION_SAVE_COUNT` persists; observation throttling holds across saves.
- **Double-tap protection.** `isSaving = true` flips immediately on entry to `handleSave` / `handleNoSpend`; `canSave` and `canNoSpend` gates close.

### Known trade-offs (intentional, documented; not addressed in this pass)

1. **No in-flight visual besides dimmed save button.** AsyncStorage saves typically resolve <100ms. Adding a spinner or "잠깐만요…" hint would push the screen closer to app-form energy and away from the calm-restraint direction. Restraint preserved.
2. **The no-spend button doesn't dim when `isSaving` flips true.** It relies on `canNoSpend` gating the handler. There's a sub-1-frame window where the button looks tappable but the handler will no-op. Adding a disabled visual would compete with the transparent / no-border polish in Section 3.
3. **`evaluate` builds a partial expense object** (`{ id: '', amount, category, sobagiEmotion: 'happy', createdAt: '' }`) for emotion evaluation. The stand-in never reaches storage. Slightly unusual shape but works because `evaluate` only reads `amount`, `category`, and `userEmotion` from context.

These are flagged for future awareness, not blockers.

---

## File-level scope

**Modify:**
- `src/components/expense/CategorySelector.tsx` — chip styles (Section 1)
- `src/pages/record.tsx` — removed label + memo placeholder text (Section 2), no-spend button styles + label text (Section 3)

**Unchanged:**
- `src/services/expenseService.ts` — `saveExpense` / `recordNoSpend` flow
- `src/services/emotionEngine.ts` — `evaluate` rule chain
- `src/services/dialogueService.ts` — tier + observation selection
- `src/pages/reaction.tsx` — reaction screen
- `src/hooks/useAppInit.ts` — app init flow
- `src/constants/colors.ts` — palette tokens
- `src/constants/categories.ts` — category taxonomy

## Anti-patterns (out of scope)

This pass must NOT introduce any of the following:

- Navigation or architecture changes
- Loading spinners or in-flight progress UI on save
- New buttons, new toggles, new form fields
- Budgeting / goals / spending caps
- Achievement framing on save or no-spend
- Celebration / reward styling on the no-spend button
- A replacement heading for the chip row
- Photocard flow changes (a separate spec covers that surface)
- Room presence philosophy changes
- Taxonomy changes
- Tone shifts on `기록하기`, `오늘을 기록해요 ✏️`, `한마디 (선택)`, `기분은 어때요?`, or `저장하기`

## Success criteria

- The category chip row reads with warmer selected-state energy and slightly more breathing room.
- Removing the `카테고리` label leaves the chip row visually self-leading; no replacement heading appears.
- The memo placeholder reads `오늘에 대한 한마디...` and never mentions `소비`.
- The no-spend button visually recedes from card-peer with the amount card to a centered borderless prompt with a 🌿 leaf hint.
- The visibility gate, behavior, and underlying services for no-spend remain identical.
- The reaction loop continues to feel emotionally immediate; no functional regressions.
- Typecheck and full Jest suite remain green; no new tests required for this polish-only pass.
