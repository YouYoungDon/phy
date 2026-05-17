# Sobagi — Room Presence Design

**Date:** 2026-05-17
**Branch:** apps-in-toss-clean
**Status:** Approved design, ready for implementation planning

---

## 1. Governing Philosophy

> "The things the user discovered slowly become part of Sobagi's life and space."

This system is not a decoration feature. It is not a room-building game. It is not a collectible showcase.

The correct emotional reaction when a user notices a placed item is:
> "Oh… that thing I found is here now."

Not:
> "I unlocked room decoration."

**Every decision in this system must pass the following tests:**

- Does this feel like the room is remembering, or like the user is configuring?
- Is the item part of the scene, or the subject of the scene?
- Would a user notice this without being told?

If an item draws attention to itself — centered placement, animation on arrival, any "new!" signal — it fails.

**Anti-patterns, explicitly forbidden:**
- Spotlight or centered presentation of placed items
- Unlock framing ("새 아이템이 방에 생겼어요!")
- Item celebration animations
- "New item in room" badge or counter
- Any UI that resembles a room inventory or decoration manager
- Visible unlock thresholds ("Day 45 — plant unlocked")

---

## 2. Item Ecosystem

### Design principle

One unified item list. Not two inventories. Items that live in the bag stay in the bag. Items that earn room presence carry that meaning into the room — they don't graduate to a separate system.

Some items should remain small personal keepsakes, carried but never placed. This is emotionally correct. Not everything discovered needs to become furniture.

### Updated BagItem type

```typescript
type RoomZone =
  | '창가'       // window sill
  | '책상'       // desk
  | '침대옆'     // bedside
  | '방구석'     // floor corner
  | '벽걸이'     // wall hook
  | '차코너'     // tea corner (soft rename from "kitchen")
  | '작은선반';  // small shelf (soft rename from "bookshelf")

type AmbientAffinity =
  | 'room'             // permanent zone placement (this spec)
  | 'photocardOnly'    // appears in photocards but not placed in room
  | 'wearable'         // future: Sobagi character variant
  | 'temporaryAmbient' // future: appears during certain states, not permanently
  | 'seasonal';        // future: appears only during seasonal windows

type BagItem = {
  id: string;
  emoji: string;
  name: string;
  tab: '장신구' | '재료' | '간식' | '장난감';
  minDays: number;

  // Room placement — undefined means bag-only forever
  roomPresence?: {
    zones: [RoomZone, ...RoomZone[]];     // preferred zone first; fallback zones after
    emotionAffinity?: SobagiEmotion[];    // B-path trigger; undefined = A-path fallback
    timeAffinity?: TimeOfDay[];           // not a trigger — affects visual prominence
    promptOnPlace: boolean;               // true = Sobagi asks once; false = silent
    minDaysInBag: number;                 // must sit in bag this long before eligible
  };

  // Photocard appearance — independent of roomPresence
  photocardAffinity?: SobagiEmotion[];   // eligible to appear in photocard for these emotions

  // Reserved for future systems — not implemented in this spec
  ambientAffinity?: AmbientAffinity;     // type slot for wearable / temporaryAmbient / seasonal
};
```

**`timeAffinity`** does not trigger placement. It affects how visually present an item feels during matching hours (more visible in the room render, more likely to be selected for photocard). Implementation detail for room rendering — deferred until sprites exist.

### Existing bag items — room presence metadata

Items not listed here remain bag-only. Snacks (쑥 경단, 버터 쿠키, 작은 빵) and toys (팽이, 요요) stay bag-only — they are personal keepsakes, not environmental objects. 작은 풍선 🎈 is an exception among toys: it earns a zone at 창가 because a balloon near the window fits the room's quiet life.

| Item | minDays | zones | emotionAffinity | promptOnPlace | minDaysInBag |
|------|---------|-------|-----------------|---------------|--------------|
| 꽃잎 핀 🌸 | 0 | 책상 | — (A-path) | false | 10 |
| 도토리 🌰 | 7 | 작은선반 | — (A-path) | false | 14 |
| 달 반지 🌙 | 14 | 침대옆 | sad, soft-sad | false | 7 |
| 꿀병 🍯 | 18 | 차코너 | happy, neutral | false | 5 |
| 따뜻한 커피 ☕ | 20 | 책상, 차코너 | happy, neutral | false | 7 |
| 작은 풍선 🎈 | 12 | 창가 | — (A-path) | false | 10 |
| 작은 리본 🎀 | 25 | 책상 | — (A-path) | false | 10 |
| 나뭇조각 🪵 | 32 | 방구석 | — (A-path) | false | 14 |
| 작은 곰 🧸 | 40 | 작은선반, 방구석 | sad, soft-sad | **true** | 14 |

**Photocard affinity** (separate from room placement):
- 꽃잎 핀: happy, neutral
- 달 반지: sad, soft-sad
- 따뜻한 커피: happy, neutral, (evening hours)
- 작은 곰: sad, soft-sad

Items without photocardAffinity do not appear in photocards.

### New items added to bag list

These items are natively room-capable. They join the existing BAG_ITEMS array and appear in the bag UI like any other item.

| Item | Tab | minDays | zones | emotionAffinity | promptOnPlace | minDaysInBag |
|------|-----|---------|-------|-----------------|---------------|--------------|
| 담요 🧣 | 재료 | 28 | 침대옆 | sad, soft-sad, anxious | **true** | 7 |
| 우산 ☂ | 재료 | 35 | 벽걸이 | — (A-path) | false | 10 |
| 작은 식물 🪴 | 재료 | 45 | 창가, 방구석 | — (A-path, gradual) | **true** | 14 |
| 엽서 📮 | 장신구 | 50 | 작은선반, 책상 | — (letter-linked, see §4) | false | 5 |
| 머그컵 🫖 | 간식 | 55 | 책상, 차코너 | happy, neutral | **true** | 10 |

**담요 🧣** photocardAffinity: sad, soft-sad, anxious
**작은 식물 🪴** photocardAffinity: happy, neutral
**머그컵 🫖** photocardAffinity: happy, neutral

**Note on 작은 식물:** The plant's appearance should feel gradual — Sobagi places it, and it is simply there the next time the user returns. No growth animation. The "gradual" quality comes from the user's memory of not having seen it before, not from an animation.

---

## 3. Room Zones

Seven named zones. Internally, each zone has one or two coordinate slots (normalized x/y relative to room background). Zone slots are defined for future use by the room sprite renderer — they are not rendered in this spec's implementation scope.

```typescript
const ZONE_SLOTS: Record<RoomZone, { x: number; y: number }[]> = {
  '창가':    [{ x: 0.78, y: 0.18 }],
  '책상':    [{ x: 0.72, y: 0.58 }, { x: 0.82, y: 0.60 }],
  '침대옆':  [{ x: 0.18, y: 0.62 }],
  '방구석':  [{ x: 0.12, y: 0.72 }],
  '벽걸이':  [{ x: 0.85, y: 0.30 }],
  '차코너':  [{ x: 0.20, y: 0.52 }],
  '작은선반':[{ x: 0.15, y: 0.38 }, { x: 0.22, y: 0.38 }],
};
```

Zones are not shown to the user as UI labels. They exist only in the data model. What the user sees is "Sobagi suggesting a location" in natural language.

**Note on 주방 and 책장:** These were softened to 차코너 and 작은선반 deliberately. The original names carry "life simulation" and "collection display" energy respectively. The softer names keep the room feeling intimate rather than functional.

---

## 4. Placement System

### The three paths

**Path B — Emotional resonance (primary)**
Fires when: the user records an emotion matching `emotionAffinity[]`, AND the item has been in the bag ≥ `minDaysInBag` days.
Behavior: if `promptOnPlace: true`, stage a pending prompt. If false, place silently.

**Path A — Return visit (fallback for items without emotionAffinity)**
Fires when: user opens app after a gap (gap detection via existing `prevVisitDate`), AND item has been in bag ≥ `minDaysInBag` days. Apply ±2 day jitter to the `minDaysInBag` threshold to prevent mechanical predictability.
Behavior: always silent placement (no prompt regardless of `promptOnPlace`). The item "was placed during the time away."

**Path C — Ambient (small items, promptOnPlace: false)**
This is not a separate trigger — it is the result of Path A or B applied to items with `promptOnPlace: false`. These items never get a Sobagi prompt. They appear without any notification.

**Special case — 엽서:** Eligible for placement after 2nd letter is delivered to mailbox (in addition to minDays threshold). This is checked alongside the A-path return trigger.

### Placement flow

```
Item in bag (roomPresence defined)
  └─ minDaysInBag not yet passed → wait
  └─ minDaysInBag passed → eligible; watch each session for trigger

On each session open (in roomPresenceService.checkForPlacement()):
  └─ Is any item eligible?
      └─ Path B check: last recorded emotion ∈ item.emotionAffinity?
          └─ yes → proceed
      └─ Path A check: return after gap, minDays ± jitter passed?
          └─ yes → proceed
      └─ neither → skip this session (check again next open)

  └─ B→A drift check: roomPlacements.length ≥ 5 OR recordedDaysCount ≥ 45?
      └─ yes → skip prompt even if promptOnPlace: true; proceed directly to silent placement

  └─ promptOnPlace: true AND not in drift phase?
      └─ write { itemId, pendingFrom: today } to sobagi-pending-placement
      └─ home screen reads this on next render → shows Sobagi prompt

  └─ promptOnPlace: false OR in drift phase?
      └─ write directly to sobagi-room-placements
```

Process at most one item per session. Do not stack multiple placements.

### Sobagi's placement prompt

Rendered on the home screen in the same space as Sobagi's idle speech bubble. One soft line. No modal, no menu, no separate screen.

Copy style: Sobagi describes the place, not the item's value.

**Good:**
- "담요, 침대 옆에 놔둘까요? 차가워지는 날에 있으면 좋을 것 같아요 🌙"
- "이 식물, 창가에 어울릴 것 같아요. 빛이 잘 드는 곳이에요 🌱"
- "머그컵 책상 위에 두면 좋을 것 같아요 ☕"

**Avoid:**
- Any line that evaluates the item ("예쁜 머그컵이에요")
- Any line that references the user's action ("잘 찾아왔어요")
- Any line that creates urgency or scarcity

**Actions:**
- `응, 좋아` — places item immediately; clears pending-placement
- `나중에` — sets `pendingFrom: today`; does NOT place immediately

**나중에 behavior:** After 3 calendar days, on the next app open, the item is placed silently with no notification. Internal copy: "방이 자리를 찾았어요" — but this is never shown to the user. The room simply has the item.

This is not auto-placement framing. It is "the room found a place for it." The difference matters in how the service is written: there is no "auto-place" log line or console message. The item is just placed.

### B→A drift

As the relationship deepens, the room starts taking care of itself.

```
roomPlacements.length < 5 AND recordedDaysCount < 45:
  → Use full B model. Prompts fire for promptOnPlace: true items.

roomPlacements.length ≥ 5 OR recordedDaysCount ≥ 45:
  → No new prompts. All future placements are silent (Path C behavior).
  → The room has its own rhythm.
```

This threshold is a starting heuristic — not a visible milestone. The user never sees "5/5 items placed." The room simply quiets its invitations.

---

## 5. Photocard Affinity

Items with `photocardAffinity` matching the current emotion may appear in the photocard as emoji overlays.

**Selection rules:**
- Only items in `roomPlacements` (already placed) are eligible. Unplaced items do not appear.
- Filter eligible items by `photocardAffinity` matching current emotion.
- Select one item at random from the eligible set. Maximum one item per photocard.
- If no items match, no overlay is added. Absence is correct and expected.

**Rendering:**
- Emoji rendered at the item's primary zone x/y position within the photocard card dimensions.
- Opacity: 0.50–0.55. The item is present, not featured.
- No label. No border. No animation.
- The item does not interrupt the memory strip or the date signature.
- Zone positions mapped from `ZONE_SLOTS` normalized coordinates × `CARD_WIDTH` / `CARD_HEIGHT`.

**The test:** the item should feel like a quiet trace that remained in the room. Not a reward. Not a feature. The user's attention should be on the quote and the date, not the item.

---

## 6. Storage Keys

Two new keys added to `src/constants/storage.ts`:

```
sobagi-room-placements   → RoomPlacement[]
sobagi-pending-placement → PendingPlacement | null
```

```typescript
type RoomPlacement = {
  itemId: string;
  zone: RoomZone;
  placedAt: string;          // YYYY-MM-DD
  placementPath: 'B' | 'A' | 'C';  // internal only — not exposed to UI or user
};

type PendingPlacement = {
  itemId: string;
  pendingFrom: string;       // YYYY-MM-DD — auto-settle after 3 days
};
```

`placementPath` is stored for debugging and future analytics. It is never displayed in any UI.

---

## 7. Implementation Scope

### Buildable now (no new assets required)

- `BagItem` type extension (`roomPresence`, `photocardAffinity`, `ambientAffinity` fields)
- Room metadata added to existing BAG_ITEMS entries
- 5 new items added to BAG_ITEMS (담요, 우산, 작은 식물, 엽서, 머그컵)
- `src/services/roomPresenceService.ts` — placement trigger logic (B/A/C paths, B→A drift)
- Storage keys (`sobagi-room-placements`, `sobagi-pending-placement`)
- `나중에` → auto-settle logic (checked on app open in `useAppInit.ts`)
- Sobagi placement prompt in `src/pages/index.tsx`
- Photocard emoji overlay in `src/components/photocard/PhotocardView.tsx`

### Asset-blocked (data model ready, rendering deferred)

- Room visual rendering — zone coordinate slots are defined; sprites not yet commissioned
- `timeAffinity` visual prominence — stored in type; room render uses it when sprites exist

### Future systems (type slots reserved, not implemented)

- `wearable` affinity — Sobagi character variants wearing items; requires character art
- `temporaryAmbient` — items appearing during specific emotional states, not permanently placed; 꽃잎 핀 seasonal appearance belongs here
- `seasonal` — items appearing in seasonal windows

---

## 8. Rejection List

The following are explicitly out of scope for this system, permanently:

- Room decoration score or rating
- "Best placement" suggestions or optimization hints
- Item collection progress bar or completion percentage
- Unlock announcements for room items
- Drag-and-drop or free placement
- Rotation or resize controls
- Room item inventory screen (separate from bag)
- Any framing that connects item appearance to a specific user action ("you recorded 5 expenses, so…")

---

*The room should feel inhabited, not designed. The user should feel they are sharing a space with Sobagi, not building one.*
