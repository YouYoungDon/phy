# HomeScreen Atmosphere Polish — Design Spec
**Date:** 2026-05-16
**Status:** Approved
**Scope:** `src/pages/index.tsx` only
**Branch:** apps-in-toss-clean

---

## Problem Statement

The HomeScreen currently reads as "background image + UI overlays" rather than a single inhabited space.

Three compounding causes:
1. Props (📬 🎒) float over the background — no grounding, no shadow, no depth
2. Sobagi has no contact with the floor — the float animation reads as "levitating over a backdrop" instead of "standing in a room"
3. The summaryCard cuts the room off with a hard 1px border — atmosphere stops at the wall/card boundary
4. The level chip uses `rgba(0,0,0,0.32)` (neutral cold black), which reads as a game HUD overlay rather than something belonging to the room

**Goal:** Make the room feel physically believable and atmospherically continuous — without new assets, new components, or new dependencies.

---

## Guiding Constraint

All changes should feel like the room becoming more coherent, not like a feature update.

Do not introduce:
- Reward-like language or unlock framing
- Attention-grabbing animation
- Visual prominence that makes any prop feel like a primary CTA
- Anything that increases "game" register

---

## Change 1 — summaryCard Boundary Dissolve

### Intent
The room's floor should dissolve into the summaryCard, not terminate against it.

### Implementation
Remove the hard border from `summaryCard`. Replace with a stacked fade overlay inside `RoomBackground`'s children.

**`summaryCard` style change:**
```
Remove: borderTopWidth: 1
Remove: borderTopColor: COLORS.border
Keep:   backgroundColor: COLORS.card
```

**New `bottomFade` overlay** (placed inside RoomBackground children, after all props and character, with `pointerEvents="none"`):

Five stacked Views, each `height: 8`, `backgroundColor: COLORS.card` (`#FFFCF5`), rendered top-to-bottom with increasing opacity:

| Slice | Opacity | From bottom |
|-------|---------|-------------|
| 1st (top) | 0.06 | 32–40px |
| 2nd | 0.18 | 24–32px |
| 3rd | 0.38 | 16–24px |
| 4th | 0.60 | 8–16px |
| 5th (bottom) | 0.82 | 0–8px |

Total fade zone: 40px. Positioned `absolute, bottom: 0, left: 0, right: 0`.

**Critical:** `pointerEvents="none"` on the container — the fade must not intercept touches.

**Visual target:** The room floor dissolves toward the card color. No visible band — if the fade reads as a stripe, the topmost opacity is too high.

---

## Change 2 — Level Chip Warmth

### Intent
Shift the level chip from "cold neutral overlay" to "warm room-palette element" without losing readability.

### Implementation
**`levelCard` background color:**
```
Before: rgba(0, 0, 0, 0.32)     — neutral black
After:  rgba(61, 48, 32, 0.42)  — warm dark brown (COLORS.text base)
```

COLORS.text is `#3D3020`, which is RGB (61, 48, 32). Using this as the shadow color shifts the chip from cold/game to warm/room.

**`progressTrack` background:**
```
Before: rgba(255, 255, 255, 0.20)
After:  rgba(250, 246, 238, 0.25)  — cream-white (COLORS.cream base)
```

**Text:** Keep `color: '#fff'` — white on `rgba(61,48,32,0.42)` remains readable.

**Do not change:** font size, font weight, pill shape, padding, or progress bar fill color (oliveGreen is already warm).

---

## Change 3 — Sobagi Contact Shadow

### Intent
Sobagi's float animation should feel like movement above a fixed ground point, not levitation over a background layer.

### Implementation
Add a small elliptical shadow View inside `characterArea`, rendered after `SobagiCharacter` (so it appears below the character in the flex stack).

```
width: 64
height: 8
borderRadius: 32
backgroundColor: rgba(61, 48, 32, 0.15)
alignSelf: 'center'
```

**Shadow is fixed — does not animate.** The float animation moves the character above the static shadow, which is the physically correct behavior. A shadow that follows the character upward is not a contact shadow.

**Tone:** Very soft, very subtle. If it reads as "shadow effect" rather than a natural room element, reduce opacity to 0.10.

---

## Change 4 — Closet Icon Removal

### Intent
A tappable icon that leads to placeholder content breaks trust. Remove the entry point until closet has real content.

### Implementation
- Delete `propCloset` TouchableOpacity and its children from JSX
- Delete `propCloset` style from StyleSheet
- Remove `'closet'` from `SheetType` union
- Remove the `activeSheet === 'closet'` sheet content block
- Remove the `openSheet('closet')` call site

**Do not** remove the concept from memory or documentation — closet is planned, just not yet content-ready.

**Visual side effect (intentional):** Three props in an awkward triangle → two props in a clean diagonal. 📬 upper-right ↔ 🎒 lower-left. This gives the room more breathing room.

---

## Change 5 — Prop Depth and Weight Differentiation

### Intent
Props at different spatial positions in the room should carry different visual weight. Items closer to the viewer feel heavier; items further away feel lighter and smaller.

### Spatial logic
- **Mailbox** (`top: '28%'`, upper-right): higher in the room = further away = wall-mounted
- **Bag** (`top: '58%'`, lower-left): lower in the room = closer to viewer = floor-resting

### Implementation

Both props currently share the same `propIcon` style (`fontSize: 28`). After this change they diverge — implement as separate style overrides (`propIconMailbox`, `propIconBag`) rather than modifying the shared `propIcon` base.

**Mailbox — receded:**
```
propIconMailbox: { fontSize: 26, opacity: 0.76 }
```
No floor shadow — the mailbox is wall-mounted.

**Bag — grounded:**
```
propIconBag: { fontSize: 30, opacity: 0.90 }
```

Add a small elliptical ground shadow below the bag emoji, rendered as a child View inside the bag's TouchableOpacity:
```
width: 20
height: 4
borderRadius: 10
backgroundColor: rgba(61, 48, 32, 0.10)
alignSelf: 'center'
marginTop: -2   — tucks slightly under the emoji
```

**Caution:** The bag must remain a quiet prop, not a primary action. `fontSize: 30` is a 2px increase from 28 — barely perceptible. The shadow adds ground contact without adding prominence. If the bag feels like a CTA after implementation, reduce opacity rather than reverting size.

---

## What Is Explicitly Not Changed

| Element | Reason |
|---------|--------|
| Idle float animation (±5px, 1800ms) | Already correct; shadow grounds it sufficiently |
| EmotionBubble behavior | Not a visual hierarchy issue |
| DailySummary content/layout | Out of scope for this pass |
| Level chip position (top: 48, left: 16) | Placement is correct |
| Sheet animations (spring-in, slide-out) | Not a room atmosphere issue |
| BottomTabs | Not part of room atmosphere |
| Ambient animation (C direction) | Deferred — physical believability first |

---

## Success Criteria

After this pass, the HomeScreen should answer "yes" to all of the following:

1. Does the room image flow into the summaryCard without a visible cut?
2. Does Sobagi appear to stand on the floor rather than float above the background?
3. Does the level chip feel like it belongs to the room's visual language?
4. Does removing the closet icon make the room feel less cluttered (not emptier)?
5. Does the bag feel heavier/closer and the mailbox lighter/further without either feeling like a UI button?

---

## Technical Constraints

- No new files
- No new npm dependencies
- No new components
- All changes confined to `src/pages/index.tsx`
- No changes to `RoomBackground.tsx`, `SobagiCharacter.tsx`, or any other component
- The bottomFade overlay must use `pointerEvents="none"` to preserve all touch targets beneath it