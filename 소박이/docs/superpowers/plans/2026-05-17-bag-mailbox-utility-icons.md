# Bag & Mailbox Quiet Utility Icons — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating bag (🎒 at `top: 58%`) and mailbox (📬 at `top: 28%`) emoji props on the Home screen with a vertical stack of quiet, View-composed beige silhouettes placed beneath the level chip.

**Architecture:** A single localized JSX swap in `src/pages/index.tsx`. The two existing `TouchableOpacity` blocks are replaced by one stack `View` containing two `Pressable` items. Geometry is composed from `View` primitives (no new dependencies). All state, handlers, and side-effects (`openSheet`, `pendingNewItemId`, `mailboxUnread`, `hasNewBagItem`) are reused unchanged.

**Tech Stack:** React Native 0.84 (existing), Granite/Bedrock framework (existing). No new packages.

**Spec:** [`docs/superpowers/specs/2026-05-17-bag-mailbox-utility-icons-design.md`](../specs/2026-05-17-bag-mailbox-utility-icons-design.md)

---

## Files

- Modify: `소박이/src/pages/index.tsx` (only file changed)
  - JSX block at lines 256–268 (current `propMailbox` and `propBag` `TouchableOpacity` blocks) → replaced by a single utility stack `View`
  - Styles at lines 525–569 (current `propMailbox`, `propBag`, `propIconMailbox`, `propIconBag`, `propBagShadow`, `propBadge`, `propBadgeText`) → deleted
  - New styles added to the same `StyleSheet.create` block

No other files are touched. No tests are added (the project has no UI/component tests for the home screen — verification is `npm run typecheck` plus on-device QA against the spec checklist).

---

## Task 1: Replace floating bag/mailbox props with quiet utility stack

**Files:**
- Modify: `소박이/src/pages/index.tsx`

### Step 1: Read the current file to confirm line numbers haven't drifted

- [ ] Open `소박이/src/pages/index.tsx` and confirm:
  - The two existing `TouchableOpacity` blocks for `propMailbox` and `propBag` are present, immediately after the `characterArea` `TouchableOpacity` closing tag
  - The styles `propMailbox`, `propBag`, `propIconMailbox`, `propIconBag`, `propBagShadow`, `propBadge`, `propBadgeText` all exist in the `StyleSheet.create` block
  - The state variables `pendingNewItemId`, `hasNewBagItem`, `mailboxUnread`, and the callback `openSheet` are all in scope at the JSX site

If line numbers have drifted from the plan, that's fine — operate by content match, not by line number.

### Step 2: Replace the floating prop JSX with the utility stack

Find this exact block in `소박이/src/pages/index.tsx` (currently around lines 256–268):

```jsx
        <TouchableOpacity style={styles.propMailbox} onPress={() => openSheet('mailbox')} activeOpacity={0.7}>
          <Text style={styles.propIconMailbox}>📬</Text>
          {mailboxUnread && (
            <View style={styles.propBadge}>
              <Text style={styles.propBadgeText}>!</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.propBag} onPress={() => openSheet('bag')} activeOpacity={0.7}>
          <Text style={styles.propIconBag}>🎒</Text>
          <View style={styles.propBagShadow} />
          {(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.bagDot} />}
        </TouchableOpacity>
```

Replace it with:

```jsx
        <View style={styles.utilityStack}>
          <Pressable
            style={({ pressed }) => [styles.utilityBtn, pressed && styles.utilityBtnPressed]}
            onPress={() => openSheet('bag')}
          >
            <View style={styles.bagSilhouette}>
              <View style={styles.bagHandle} />
              <View style={styles.bagBody} />
              {(pendingNewItemId !== null || hasNewBagItem) && <View style={styles.utilityDot} />}
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.utilityBtn, pressed && styles.utilityBtnPressed]}
            onPress={() => openSheet('mailbox')}
          >
            <View style={styles.mailboxSilhouette}>
              <View style={styles.mailboxFold} />
              {mailboxUnread && <View style={styles.utilityDot} />}
            </View>
          </Pressable>
        </View>
```

Notes:
- `Pressable` is already imported at the top of the file (used by the sheet backdrop) — no import change needed.
- Order is bag first, mailbox second, matching the approved design.
- The new stack is placed **after** `characterArea` in JSX — same z-order safety pattern that fixed the previous bag-touch regression. Do not move it.

### Step 3: Delete the obsolete styles

In the `StyleSheet.create` block, delete exactly these style entries:

- `propMailbox`
- `propBag`
- `propIconMailbox`
- `propIconBag`
- `propBagShadow`
- `propBadge`
- `propBadgeText`

**Keep** `bagDot` — the spec reuses its color value (`#C9A87C`). Do not delete it.

### Step 4: Add the new utility-stack styles

Add these style entries to the same `StyleSheet.create` block. A natural spot is immediately after the existing `header` / `levelCard` group (the upper-screen UI cluster), but exact placement within the block does not affect behavior — group with related upper-screen styles for readability.

```ts
  utilityStack: {
    position: 'absolute',
    top: 118,
    left: 16,
    gap: 14,
  },
  utilityBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.55,
  },
  utilityBtnPressed: {
    opacity: 0.35,
  },
  bagSilhouette: {
    width: 22,
    height: 20,
  },
  bagHandle: {
    position: 'absolute',
    top: 0,
    left: 5,        // (22 - 12) / 2 — horizontally centered
    width: 12,
    height: 6,
    borderRadius: 6,
    backgroundColor: '#B5A284',
  },
  bagBody: {
    position: 'absolute',
    bottom: 0,
    left: 1,        // (22 - 20) / 2 — horizontally centered
    width: 20,
    height: 16,
    borderRadius: 5,
    backgroundColor: '#B5A284',
  },
  mailboxSilhouette: {
    width: 22,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#B5A284',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mailboxFold: {
    width: 22,
    height: 1,
    backgroundColor: '#B5A284',
    opacity: 0.7,
  },
  utilityDot: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C9A87C',
  },
```

Sanity checks on the geometry (worth eyeballing while editing):
- Bag handle (y=0..6) and bag body (y=4..20, since `bottom:0` and `height:16` in a 20-tall container) overlap by 2pt at y=4..6. The body renders **after** the handle in JSX, so the body's top edge covers the bottom of the handle, producing the "knapsack attached" silhouette. If you reorder them, the handle floats above the body as a separate shape.
- Mailbox fold sits centered inside the envelope by virtue of the parent's `justifyContent: 'center'`. The fold is the same color as the envelope at 0.7 opacity — the cream background bleeds through that 1pt strip, producing a lighter horizontal seam.
- The indicator dot is `position: 'absolute'` relative to its silhouette parent — it appears at the top-right corner of the silhouette, not of the 44×44 hit area.

### Step 5: Run the typecheck

Run from the project root:

```bash
cd 소박이 && npm run typecheck
```

Expected output: **only the two pre-existing errors in `src/pages/_404.tsx`** (TS2769 and TS7006). No new errors. If you see any error in `src/pages/index.tsx`, do not proceed — fix it.

### Step 6: Commit

```bash
git add 소박이/src/pages/index.tsx
git commit -m "feat: replace floating bag/mailbox props with quiet utility stack

Repositions bag and mailbox from emoji floating props (top 28%/58%) to
a vertical stack of beige geometric silhouettes beneath the level chip.
View-composed silhouettes, 44pt hit area, reuses existing openSheet
handlers and indicator state.

See: docs/superpowers/specs/2026-05-17-bag-mailbox-utility-icons-design.md"
```

---

## Task 2: On-device QA pass

This is a manual verification task — it cannot be scripted. After Task 1 is committed, the dev build must be checked on device against the spec's QA checklist.

**Files:** None modified at this step unless QA reveals an issue (see "If issues are found" below).

### Step 1: Start the dev build

Run from the project root:

```bash
cd 소박이 && npm run dev
```

Wait for the bundle to compile and reload the Home screen on device.

### Step 2: Walk the QA checklist

Check each item on device. Mark each:

- [ ] **Bag tap opens bag sheet** — tap the top silhouette; bag sheet should slide up
- [ ] **Mailbox tap opens mailbox sheet** — tap the bottom silhouette; mailbox sheet should slide up
- [ ] **Both icons render on top of atmosphere/warmth/bottomFade overlays** — silhouettes are visible, not painted over by tints
- [ ] **No touch interception by `characterArea`, `RoomBackground`, or `roomPlacements`** — taps on the silhouettes never trigger the Sobagi tap-bubble; taps on the character never trigger sheet opens
- [ ] **Indicator dots appear/disappear correctly** — trigger a state where `mailboxUnread === true` (e.g., a delivered letter not yet read) and confirm the mailbox dot shows; open and close the mailbox sheet, confirm the dot clears
- [ ] **Sheet backdrop still covers the new icons when sheet is open** — open the bag sheet; tap the area where the silhouettes are; sheet should close (backdrop intercepts)
- [ ] **Visual legibility at night tint (cool blue), sunset tint (warm orange), max warmth overlay** — toggle device time or temporarily hard-code `currentHour` to inspect each atmosphere; silhouettes should remain readable in all three
- [ ] **Hit target measures ≥44pt in both dimensions** — verified by spec (`utilityBtn` is `44×44`); confirm taps register on the entire 44pt square, not just the visible silhouette area

### Step 3: Polish-pass observations

Per the spec, also briefly check:

- Pressed opacity `0.35` under night tint — if visibly too faint, raise to `0.42`–`0.45` in `utilityBtnPressed`
- Vertical stack rhythm on the device's actual screen height — if it reads as "menu-like", widen the gap to `16`

These are non-blocking. Apply only if observed; commit any change separately with a brief polish-pass message.

### Step 4: If issues are found

For each issue found in steps 2 or 3, make the targeted fix in `src/pages/index.tsx`, re-run typecheck (`cd 소박이 && npm run typecheck`), re-verify on device, then commit:

```bash
git add 소박이/src/pages/index.tsx
git commit -m "polish: <one-line description of the QA fix>"
```

If no issues are found, no additional commits are needed.

---

## Self-Review Notes

**Spec coverage:**
- Layout (top: 118, left: 16, gap: 14, bag-then-mailbox, 44pt hit area, render after characterArea) → Task 1 Steps 2 & 4
- Shared visual properties (color `#B5A284`, opacity 0.55 / pressed 0.35, no shadow, no animation, no haptic) → Task 1 Step 4
- Bag silhouette (body 20×16 r:5, handle 12×6 r:6, slightly inset) → Task 1 Step 4 with overlap math validated in step notes
- Mailbox silhouette (envelope 22×14 r:3, fold 1pt at 0.7 opacity) → Task 1 Step 4
- Indicator dot (5×5 `#C9A87C` at top-right, both icons, gated by existing state) → Task 1 Steps 2 & 4
- Behavior (existing openSheet reused, sheet backdrop unchanged, atmosphere overlays unaffected) → Task 1 Step 2 reuses handlers; no other code paths touched
- Removal (`propMailbox`, `propBag`, `propIconMailbox`, `propIconBag`, `propBagShadow`, `propBadge`, `propBadgeText`) → Task 1 Step 3
- QA checklist (all 8 items) → Task 2 Step 2
- Polish observations (pressed opacity, stack rhythm) → Task 2 Step 3

**No placeholders, no TBDs, no "similar to" references.**

**Type/name consistency:** Style names used in Step 2 JSX (`utilityStack`, `utilityBtn`, `utilityBtnPressed`, `bagSilhouette`, `bagHandle`, `bagBody`, `mailboxSilhouette`, `mailboxFold`, `utilityDot`) match exactly with Step 4 definitions.
