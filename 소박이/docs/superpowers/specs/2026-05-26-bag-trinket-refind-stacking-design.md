# Quiet Trinket Re-find Traces (×N) — Design

**Date:** 2026-05-26
**Status:** Approved (design); ready for implementation plan.

## Goal

Let a found trinket occasionally turn up a second time, and show its copies as one
keepsake tile with a quiet `×N` in the corner — a soft trace that "this little thing
turned up again," never a collection count.

## Why this needs a design (two findings that reshape the request)

1. **No source of duplicates exists today.** The keepsake bag is structurally a *set of
   unique mementos*. Every acquisition path dedupes: catalog items arrive once
   (`computeTimeArrivals` filters owned, `keepItem` is idempotent), found trinkets are
   staged only from `unfound` and the trigger goes quiet once all are found
   (`foundItemService.checkForFoundItem`), and the render wraps everything in
   `new Set(...)`. "Group identical IDs + show count" alone would render `×1` on every
   tile forever — a dead feature. So the real question is *where repetition comes from*.

2. **"counts" is on the bag's explicitly-rejected list** (bag Discover-&-Keep memory +
   `SOBAGI_PHILOSOPHY.md`: "Don't add counts, completion grids, rarity tiers, synthesis,
   badges-with-numbers"). This design deliberately revisits that line. It is admissible
   only because `×N` here is a *trace of lived wandering* (re-finding the same small
   thing), tightly scoped and visually quiet — not a collection/score. The anti-drift
   checklist (§8) is the contract that keeps it on the right side of that line.

## Decisions (resolved during brainstorming)

- **Source of ×N:** re-found trinkets. Honest, self-contained to the found-item system;
  avoids deriving counts from records (which would edge into financial-taxonomy/analytics).
- **Re-find cadence:** "new first, repeats later" — always prefer undiscovered trinkets;
  only once all 8 are found does the trigger begin gently re-delivering owned ones. No
  probability knob; rare by design.

## Scope

- **In:** trinkets `f1`–`f8` only.
- **Out:** catalog items (`a*`/`m*`/`s*`/`t*`) never stack — they arrive once by `minDays`
  and always render with **no badge**.
- The `×N` badge appears **only when count ≥ 2**. A singleton trinket looks exactly as it
  does today.

## Data model / storage

`STORAGE_KEYS.FOUND_ITEM_IDS` stays a `string[]`; **repeats are now allowed** (a multiset).
`['f1','f1','f3']` means f1×2, f3×1.

- **Migration impact: none.** Every existing array is already valid — each id present
  counts as 1. No read transform, no version bump, no fresh-install special-casing.
- *Alternative considered and rejected:* a `Record<string, number>` count-map. More
  explicit but requires a real `string[] → map` migration and changes every read site. The
  multiset gives identical behavior with zero migration, so it wins on minimality.

## Trigger logic — `foundItemService.checkForFoundItem`

Today the pool is `unfound` and the function bails when `unfound.length === 0`. New shape:

```ts
const undiscovered = FINDABLE_ITEMS.filter((item) => !foundIds.includes(item.id));
const pool = undiscovered.length > 0 ? undiscovered : FINDABLE_ITEMS; // all found → repeats open
// remove the `if (unfound.length === 0) return;` early-out
const item = pool[Math.floor(Math.random() * pool.length)];
if (!item) return;
```

Unchanged: `GRACE_DAYS` (3), `COOLDOWN_DAYS` (3), the four trigger conditions (`hasTrigger`),
`promoteStaged`, and the staged→pending hand-off. Re-finds inherit the same gentle cadence,
so they can't be farmed and new discovery is never delayed. `foundIds.includes(...)` still
behaves correctly with repeats (returns true if at least one copy exists).

## Acquisition write — append, don't dedup

In `index.tsx` `openSheet`, the pending-trinket promotion currently skips an already-owned
id. Change it to **always append** so a re-found trinket increments its count:

```ts
setFoundItemIds((prev) => {
  const next = [...prev, pendingId];            // was: if (prev.includes(pendingId)) return prev;
  storageService.save(STORAGE_KEYS.FOUND_ITEM_IDS, next);
  return next;
});
```

Still atomic-on-open; still clears `PENDING_NEW_ITEM_ID` first.

## Rendering — one tile, derived count

Tiles remain one-per-id: `displayedKeptIds = Array.from(new Set([...keptItemIds, ...foundItemIds]))`
is unchanged. Add a small **pure helper** so the count is unit-testable:

```ts
// discoveryService.ts
export function trinketCounts(foundItemIds: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const id of foundItemIds) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}
```

In the bag cell:

```ts
const count = counts[id] ?? 1;            // catalog ids never appear in foundItemIds → 1
// ...
{count >= 2 && <Text style={styles.bagCellCount}>×{count}</Text>}
```

`counts` is memoized from `foundItemIds` in the component.

## Quietest UI treatment

Bare text, **no pill** (a pill reads as a badge). Bottom-right corner of the cell, quieter
than the item name (name uses `textMuted`; the count uses the softer `textLight`).

```
┌──────────────┐
│              │
│      🍀      │
│   네잎 클로버   │
│           ×2 │   ← textLight, 11px, no bold, no background
└──────────────┘
```

```ts
bagCellCount: {
  position: 'absolute',
  right: 6,
  bottom: 5,
  fontSize: 11,
  color: COLORS.textLight,   // #B5A898 — palette's softest tone
},
```

## Tap & dialogue — unchanged

Tapping the merged tile still shows `keepsakeLineFor(id)`. No count in the dialogue, no
special stack interaction. `pickupLineFor` on a re-find stays as-is — the trinket's
`findLine` reads fine for a second arrival; no new "또 주웠어요" copy, to avoid adding system.

## Anti-drift verification

| Rejected mechanic | Present? |
|---|---|
| merging / synthesis / crafting / exchange | ✗ none |
| rarity tiers | ✗ none |
| progress bars / "collect X to unlock" | ✗ none |
| reward loop / celebration | ✗ same gentle trigger + cooldown, no fanfare |
| sort-by-quantity / value | ✗ grid order unchanged (kept-then-found insertion order) |
| stack interaction / tappable count | ✗ tap = same keepsake line |
| queue-length surfaced | ✗ unchanged |

The count is a muted corner trace shown only at ≥2. It reads "this turned up again," not
"I collected N."

## Files touched

- `src/services/foundItemService.ts` — pool logic ("new first, repeats later").
- `src/services/discoveryService.ts` — add pure `trinketCounts`.
- `src/pages/index.tsx` — append-on-promote write, count derivation + `×N` render, one style.

## Testing

- `trinketCounts`: empty → `{}`; singles → all 1; repeats → correct counts.
- `checkForFoundItem`: prefers undiscovered when some remain (existing behavior preserved).
- `checkForFoundItem`: once all trinkets are found, a re-find CAN be staged given a trigger
  + satisfied cooldown (previously returned early).

## Explicitly NOT doing

- No catalog-item stacking.
- No count-map migration.
- No records-derived counts.
- No re-find dialogue copy.
- No trinket → room-discoverable change (that unification stays deferred).
