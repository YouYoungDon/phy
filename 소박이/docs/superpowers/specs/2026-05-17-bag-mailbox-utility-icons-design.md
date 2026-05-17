# Bag & Mailbox: Quiet Utility Icons

**Date:** 2026-05-17
**Scope:** Home screen (`src/pages/index.tsx`)
**Status:** Design approved, ready for implementation plan

## Motivation

Room-presence items now live inside the room itself (placed via `roomPlacements`). The bag and mailbox — which were styled as floating room props with emoji icons (🎒 at `top: 58%`, 📬 at `top: 28%`) — visually compete with those genuine room objects and read as decorative game-UI rather than calm utilities.

The redesign repositions them as **quiet utility icons embedded into the room UI** so they no longer compete with Sobagi, room-presence items, photocards, or emotional overlays.

## Visual Direction

- Small, secondary, integrated
- Soft beige silhouettes — not emoji, not illustrations
- Vertical stack in the upper-left void beneath the level chip
- No HUD/game-menu feeling, no bright accent colors, no decorative shadows

Anti-direction (must avoid): floating decorative objects, feature-navigation energy, collectible/menu atmosphere.

## Layout

```
┌──────────────┐
│ Lv.3 소박이   │  (level chip)
│              │
│   [bag]      │  (quiet utility silhouette)
│   [mailbox]  │  (quiet utility silhouette)
│              │
└──────────────┘
```

- Stack container: a `View` with `position: absolute, top: 118, left: 16`, containing the two Pressables stacked with `gap: 14`
- Each item: `Pressable`, **44×44pt** (width and height), `justifyContent: 'center', alignItems: 'center'` — the silhouette is centered inside this hit area
- `top: 118` refers to the top edge of the first Pressable; the visual silhouette appears centered inside it, so the silhouette itself starts ~12pt below that
- Order: **bag on top, mailbox below**
- The stack sits clear of `characterArea` (which starts ~bottom 18% + 240pt tall), so no overlap or touch interception
- Rendered **after** `characterArea` in JSX — higher z-order wins, preventing the same regression that affected the floating bag previously

## Icon Visuals (View-Based Silhouettes)

No icon library is installed and no silhouette PNG assets exist in the CDN. Silhouettes are composed from `View` + `Text` primitives — honest geometric abstractions rather than tiny illustrations.

### Shared visual properties

| Property | Value |
| --- | --- |
| Silhouette fill | `#B5A284` (warm soft beige) |
| Resting opacity | `0.55` |
| Pressed opacity | `0.35` (`Pressable` style fn) |
| Shadows | None |
| Mount animation | None |
| Haptic | None |

### Bag silhouette (~22×20pt)

- Body: rounded rectangle, `20×16pt`, `borderRadius: 5`
- Handle: rectangle `12×6pt`, `borderRadius: 6`, sits above the body, slightly inset
- Reads as a small embedded knapsack

### Mailbox silhouette (~22×14pt)

- Outer envelope: rounded rectangle `22×14pt`, `borderRadius: 3`
- Single horizontal fold line drawn across the middle of the envelope: 1pt high, same beige color, opacity **0.7** of the icon's own opacity (softened from 0.8 so it reads as fold, not as a sharp UI rule)
- Reads as a closed envelope at a glance

### Indicator dot (both icons)

- Single `5×5pt` warm-beige circle (`#C9A87C`) at top-right of the silhouette, offset `-1, -1`
- No border, no animation, no glow
- Bag dot visible when `pendingNewItemId !== null || hasNewBagItem`
- Mailbox dot visible when `mailboxUnread === true`
- Reuses the existing `bagDot` color value already in use inside the bag sheet, for visual consistency

## Behavior

- **Press → openSheet:** existing `openSheet('bag')` / `openSheet('mailbox')` handlers are called unchanged. No modification to sheet content, indicator state logic, or any side-effects (`LAST_BAG_OPEN_DAYS` write, `unreadAtOpenRef` snapshot, `pendingNewItemId` lifecycle).
- **While a sheet is open:** the existing `sheetBackdrop` (full-screen absolute View) already covers the icons. Tapping their area closes the sheet — matches the rest of the backdrop. No special handling needed.
- **Atmosphere overlays:** `atmosphereOverlay` and `bottomFade` use `pointerEvents="none"` already and pass touches through to the icons.

## Removal

Delete the following from `src/pages/index.tsx`:

- JSX: the two `TouchableOpacity` blocks rendering `📬` and `🎒` (`propMailbox` and `propBag`)
- Styles: `propMailbox`, `propBag`, `propIconMailbox`, `propIconBag`, `propBagShadow`, `propBadge`, `propBadgeText`

Keep:
- `bagDot` style — reused for both new indicator dots, value matches the spec

## Readability Against Atmosphere Overlays

`#B5A284 @ 0.55` is a mid-tone beige with sufficient contrast against:
- Time-of-day tint (max ~0.25 opacity, blue or warm orange)
- Warmth overlay (max ~0.35 opacity of `#E8C070`)

Verified precedent: the level chip uses `rgba(61,48,32,0.42)` and reads through all atmospheres; our icons are lighter but smaller, so the contrast budget is comparable.

**Fallback (only if device testing shows real legibility loss):** bump resting opacity to `0.65`. Not applied preemptively — Sobagi benefits from "quietly present" over "always clearly surfaced".

## Implementation QA Checklist

- [ ] Bag tap opens bag sheet
- [ ] Mailbox tap opens mailbox sheet
- [ ] Both icons render on top of atmosphere/warmth/bottomFade overlays
- [ ] No touch interception by `characterArea`, `RoomBackground`, or `roomPlacements` rendering
- [ ] Indicator dots appear/disappear correctly when state changes
- [ ] Sheet backdrop still covers the new icons when sheet is open
- [ ] Visual legibility at night tint (cool blue), sunset tint (warm orange), max warmth overlay
- [ ] Hit target measures ≥44pt in both dimensions

## Polish-Pass Observations (Non-Blocking)

During on-device QA, briefly compare:
- Pressed opacity `0.35` vs `0.42–0.45` — `0.35` may become too faint under night tint
- Symmetrical vertical stacking on different screen heights — may risk slight "menu" reading on shorter devices

Neither is a spec blocker; resolve during the polish pass if observed.
