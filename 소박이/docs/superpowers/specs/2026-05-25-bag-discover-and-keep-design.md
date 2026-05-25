# Bag "Discover & Keep" — Design

**Date:** 2026-05-25
**Status:** Approved (design direction)
**Branch:** apps-in-toss-clean

## Guiding principle

> **Discovery is not a reward queue. It is a gentle arrival queue.**

Items don't drop because the user earned them; they *arrive* the way small things turn
up in a lived-in room, and the user notices and keeps them. Everything below serves
that line. If a decision makes discovery feel like loot, points, or a to-do backlog,
it's wrong.

## 1. Overview

Today the bag is a passive 4×4 catalog that auto-fills by days recorded, and the room
permanently scatters a subset of those items as static, untappable emoji — which reads
as clutter and quietly drifts toward "stuff on display." This redesign turns the bag
into a **keepsake box** and the room into a calm **discovery surface**:

- An item that becomes available **arrives** in the room as a single, gently noticeable
  thing — **one at a time**.
- The user **taps to pick it up**; it pockets into the **bag** and the room is clean again.
- The bag holds what the user has **kept**; tapping a kept item is a **quiet moment**
  (a short Sobagi line about it, via the ambient voice).

Out of scope and untouched: save reactions, observation lines, DayFeeling, the ambient
idle voice itself (we reuse it), letters, pebbles/rest.

## 2. The model

### Item universe
Two existing pools, both keyed by stable `id` (no collisions — bag ids are `a*/m*/s*/t*`,
found ids are `f*`):
- **Catalog items** — `ALL_BAG_ITEMS` (`src/constants/bagItems.ts`), each with `minDays`
  and optional `roomPresence`/affinity.
- **Found trinkets** — `FINDABLE_ITEMS` (`src/constants/findableItems.ts`), each with a `findLine`.

### Three states an item can be in
- **dormant** — not yet eligible.
- **arriving** — eligible but not yet picked up; sits in the discovery queue (front of
  queue is the one currently shown in the room).
- **kept** — picked up; lives in the bag.

### Acquisition = a discovery schedule (cadence preserved)
The `minDays` timing is **kept** as *eligibility*, but an eligible item no longer just
appears greyed-in a grid — it **enqueues as an arrival** and shows up in the room to be
found. Eligibility sources (all feed the same queue):
- **Time:** when `recordedDaysCount` reaches an item's `minDays`.
- **Pattern:** the existing café/streak/night triggers (`roomPresenceService`) may bring a
  specific item earlier — reused, but their output becomes "enqueue an arrival," not
  "place permanently."
- **Found:** found-trinket triggers enqueue the trinket.

An item is enqueued at most once, and never if it's already `arriving` or `kept`.

### The queue is invisible
The user sees **one** arrival at a time. The queue's length is **never surfaced** — no
"3 waiting," no counter, no badge with a number. A count would make it a reward backlog.
The bag icon may carry the existing soft dot ("something to find"), but never a tally.

## 3. Migration (existing users keep what they have)

One-time, gated by a `DISCOVERY_MIGRATION_DONE` flag (same pattern as
`CATEGORY_MIGRATION_DONE`). On first launch of the new version, seed **kept** with
everything the user already has, so nothing must be re-discovered:
- every catalog item already unlocked (`recordedDaysCount >= minDays`),
- every item id in `ROOM_PLACEMENTS`,
- every id in `FOUND_ITEM_IDS`.

The discovery queue is seeded from `PENDING_NEW_ITEM_ID` (if any), else empty. From then
on, only *newly* eligible items enqueue. A brand-new user starts with an empty bag and
receives items as arrivals from day 0.

## 4. Storage

New keys:
- `KEPT_ITEM_IDS: string[]` — the bag's contents (discovered & picked up).
- `DISCOVERY_QUEUE: string[]` — arrived-but-not-yet-kept item ids; index 0 is shown in room.
- `DISCOVERY_MIGRATION_DONE: boolean` — one-time migration guard.

Existing keys:
- `ROOM_PLACEMENTS` — **stop rendering it in the home room.** Whether to fully retire it
  depends on a consumer audit (see §7 risk) — its data is migrated into `KEPT_ITEM_IDS`
  regardless.
- `FOUND_ITEM_IDS`, `PENDING_NEW_ITEM_ID` — superseded by kept/queue; migrated, then no
  longer written by the new flow.
- `LAST_BAG_OPEN_DAYS` / `hasNewBagItem` — "new" now means "queue non-empty"; repurpose or retire.

## 5. UI changes

### Room (discovery surface)
- Remove the `roomPlacements.map` static emoji render (`src/pages/index.tsx`).
- If `DISCOVERY_QUEUE` is non-empty, render the **front item** as a single tappable
  discoverable at a calm position, with a gentle affordance (soft bob / faint glow — never
  a loud badge or sparkle burst).
- Tap → pick up: move the id from queue front into `KEPT_ITEM_IDS`, persist both, show a
  soft line, play the pocket animation; the next queued item becomes the new front.

### Bag (read-only keepsake view)
- Show **kept** items only — no greyed/day-locked cells, no completion grid.
- Resolve each kept id from `ALL_BAG_ITEMS` ∪ `FINDABLE_ITEMS` for emoji/name.
- Read-only: no synthesis, no actions, no "place in room," no counts like "N/총". Just the
  things you've kept. (Tab grouping by source category may be retained for tidiness, but
  shows only kept items; a single clean grid is also acceptable — decided in the bag stage.)

### Item moment (tap dialogue)
- Tapping a kept item → a short Sobagi line *about that item*: a specific object line if one
  exists (reuse/extend `OBJECT_LINES` from `ambientDialogue.ts`, keyed by item id), else the
  item's existing `desc` (catalog) or `findLine` (trinket) as a gentle fallback.
- Observational, never ownership/collection praise (⭕ "오늘 물 줬어요 🌱" · ❌ "잘 모으고 있네요!").

## 6. Staged implementation (in this order)

Each stage is independently shippable and verifiable.

1. **storage/migration + kept bag model** — `KEPT_ITEM_IDS` / `DISCOVERY_QUEUE` /
   `DISCOVERY_MIGRATION_DONE` keys; a pure module computing newly-eligible arrivals and the
   `keep(itemId)` transition; the one-time migration seeding kept from
   unlocked/placed/found. Pure + unit-tested; no UI yet.
2. **room discovery queue front render + tap to keep** — render the queue-front item as a
   tappable discoverable; tap moves it to kept; remove the static placement render.
3. **bag read-only keepsake view** — bag renders kept items (no locked grid); read-only.
4. **item tap dialogue** — tapping a kept item surfaces its line (object line → desc/findLine
   fallback).
5. **pickup animation / polish** — pocket-toward-bag animation, the bob/glow affordance, and
   queue-advance polish.

## 7. Risks / things the plan must handle

- **`ROOM_PLACEMENTS` consumers:** audit every consumer (esp. `PhotocardView`, which has
  placed-item affinity, and `ZONE_SLOTS` usage) before retiring it. Kept items may need to
  feed whatever placed items fed. Stage 1 resolves this; default is to migrate data into
  `KEPT_ITEM_IDS` and keep `ROOM_PLACEMENTS` intact (unrendered) if a consumer still needs it.
- **No re-discovery storm:** migration must seed kept *before* the arrival computation runs,
  or existing users get a flood of "arrivals" for items they already had.
- **Queue invisibility:** never surface queue length; resist any "X new" counter.
- **Bag-only items:** items without `roomPresence` must still be discoverable (they enqueue
  by `minDays` like everything else) — they appear in the room as an arrival even though the
  old system never placed them.

## 8. Tone guardrails (binding)

- Discovery is a **gentle arrival**, not loot/points/a backlog. No counts, completion grids,
  rarity tiers, "collect them all," badges-with-numbers, or synthesis.
- Keeping is **keeping**, not earning. No reward/achievement copy on pickup ("획득!", "축하").
- Item/keepsake lines are observational, never ownership praise.
- One arrival at a time; the queue is internal and silent.
- Aligns with `SOBAGI_PHILOSOPHY.md` (not a gamified reward loop; objects must not feel like
  rewards), `feedback_sobagi_room_accumulation` (no placement UI; this replaces it with
  pickup, not slot management), `feedback_sobagi_restraint_over_visibility`, and
  `project_sobagi_ambient_dialogue` (item lines reuse the ambient voice).

## 9. Testing

Pure-logic tests (stage 1) carry most coverage:
- newly-eligible computation: an item at `minDays` boundary enqueues once; never if already
  kept/queued.
- `keep(itemId)`: moves id queue→kept, idempotent, persists.
- migration: seeds kept from unlocked (`>= minDays`) + placed + found; sets the done flag;
  no double-run; no re-discovery of seeded items.
- queue invariants: front-of-queue is the rendered item; pickup advances the front.
- guardrail: keepsake/pickup line resolution falls back correctly; object lines reuse passes
  the existing banned-vocabulary scan.

Plus `npm run typecheck` and full Jest green at each stage; anti-pattern grep
(`순수익|잔액|차액|net|balance|profit` + reward vocab) clean.

## 10. Out of scope (YAGNI)

- No synthesis/fusion, no rarity tiers, no real-world rewards/coupons (explicitly rejected).
- No room placement UI / slot management.
- No queue-length display, no collection-completion meter.
- Save reactions / observations / DayFeeling / letters / pebbles untouched.
