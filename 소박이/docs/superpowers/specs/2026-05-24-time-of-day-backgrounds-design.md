# Time-of-Day Home Backgrounds — Design

**Date:** 2026-05-24
**Status:** Approved (design)
**Branch:** apps-in-toss-clean

## Goal

Replace the single static home-room background with four time-of-day background
images so the Home room visually reads as morning / afternoon / evening / late
night. The background itself carries the time-of-day feeling, replacing the
faint color-tint overlay that previously hinted at it.

## Motivation

The user uploaded four new background assets to the `sobaki` asset repo:
`sobaki_stage_morning.png`, `sobaki_stage_afternoon.png`,
`sobaki_stage_evening.png`, `sobaki_stage_latenight.png`. These are full-room
paintings already lit for their time of day. With real time-lit backgrounds, the
old `getTimeOfDayTint` color wash (a 7–10% colored film over a daytime image) is
redundant and would actually fight the new art (e.g. a cool-blue film over an
already-dark latenight painting). So the background swap replaces the tint.

This stays inside the spatial-identity and restraint principles: it is the same
single centered room, just lit for the hour. No new objects, no labels, no
controls. (`project_sobagi_spatial_identity`, `feedback_sobagi_restraint_over_visibility`.)

## Time Buckets (approved)

Pure function of the local hour, render-time only (no timer / no live re-render
mid-session — it resolves whenever the Home screen renders):

| Bucket      | Hours (24h)        |
|-------------|--------------------|
| `morning`   | 5 ≤ h < 12         |
| `afternoon` | 12 ≤ h < 17        |
| `evening`   | 17 ≤ h < 21        |
| `latenight` | 21 ≤ h < 24, 0 ≤ h < 5 |

These cover all 24 hours with no gap and no overlap. `latenight` is the
`else` branch.

## Architecture / Components

### 1. CDN pin bump — `src/constants/assets.ts`

Bump the pinned commit SHA so the new uploads resolve:

```
ffd169c1e2cf370768506179f0e1be1b6386ec3a  →  d940b2c41d269ec842aaf127c3c334df5e7ad000
```

The four new assets live under the same `/assets` path as the existing room/
sobagi/photocard images, so only the single `CDN` constant changes; all existing
URIs keep resolving (the new commit is a superset — "Add files via upload").

Add a new map alongside the existing `ROOM_BACKGROUND_URIS`:

```ts
export const ROOM_TIME_BACKGROUND_URIS: Record<
  'morning' | 'afternoon' | 'evening' | 'latenight',
  string
> = {
  morning: `${CDN}/sobaki_stage_morning.png`,
  afternoon: `${CDN}/sobaki_stage_afternoon.png`,
  evening: `${CDN}/sobaki_stage_evening.png`,
  latenight: `${CDN}/sobaki_stage_latenight.png`,
};
```

`ROOM_BACKGROUND_URIS` (the stage-1 `room_stage1.png` map) is **kept as-is** but
stops being imported by `index.tsx`. It remains exported for any future
stage-specific use and to avoid an unrelated deletion. (YAGNI cuts new code, not
existing exports that another surface may touch.)

### 2. Pure resolver — `src/services/atmosphereService.ts`

Add a pure, unit-testable resolver that maps an hour to a bucket key:

```ts
export type TimeOfDayBackgroundKey = 'morning' | 'afternoon' | 'evening' | 'latenight';

export function getTimeOfDayBackgroundKey(hour: number): TimeOfDayBackgroundKey {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'latenight';
}
```

**Remove** the now-dead `getTimeOfDayTint` function from this file.

**Keep** the `TimeOfDayTint` type — `PhotocardView.tsx:43` still declares an
optional `atmosphereTint?: TimeOfDayTint | null` prop (currently never passed at
any call site). Removing that dead prop is a separate, out-of-scope cleanup; this
feature does not touch PhotocardView.

**Keep** unchanged: `getWarmthOpacity`, `computeCalmDayCount`,
`getCalmAtmosphereOpacity`, `getRestWarmthOpacity`, and all calm/rest constants.

### 3. Home wiring — `src/pages/index.tsx`

- Import: drop `getTimeOfDayTint`, add `getTimeOfDayBackgroundKey`. Drop
  `ROOM_BACKGROUND_URIS`, add `ROOM_TIME_BACKGROUND_URIS`.
- Replace the line-91 `timeOfDayTint` computation with:
  ```ts
  const timeBackgroundUri = ROOM_TIME_BACKGROUND_URIS[getTimeOfDayBackgroundKey(new Date().getHours())];
  ```
- Pass it to `RoomBackground`:
  ```tsx
  <RoomBackground stage={roomStage} backgroundUri={timeBackgroundUri}>
  ```
  The time background applies to **all stages** (the bucket is independent of
  `roomStage`). `RoomBackground` already renders a cover `<Image>` when
  `backgroundUri` is set and falls back to the CSS room when it is `null`; passing
  a non-null URI keeps the image path. No change to `RoomBackground.tsx`.
- **Remove** the tint-overlay `<View>` block (current lines 248–253, the
  `timeOfDayTint !== null && (...)` overlay).
- **Keep** the warmth overlay, rest-warmth overlay, calm overlay, and
  `bottomFade` stack exactly as they are — they sit on top of the new background
  and still compose additively.

## Data Flow

```
new Date().getHours()
  → getTimeOfDayBackgroundKey(hour)        [pure]
  → ROOM_TIME_BACKGROUND_URIS[key]         [string URI]
  → <RoomBackground backgroundUri={uri}>   [cover <Image>]
  → warmth / rest / calm overlays + bottomFade on top  (unchanged)
```

Resolved once per Home render. No interval/timer — if the user keeps Home open
across a bucket boundary the background does not re-light until the next render
(navigation, store update, etc.). This matches the existing behavior of
`warmthOpacity`/`calmOpacity`, which are also computed inline at render.

## Error Handling

- Out-of-range/NaN hours can't occur (`getHours()` is 0–23), but the resolver's
  `else` branch makes `latenight` the total fallback, so any unexpected value
  still yields a valid key — never `undefined`.
- The map is a total `Record` over the four keys, so the indexed lookup is always
  a defined string under `noUncheckedIndexedAccess`. No `?? fallback` needed.
- If a remote image fails to load, `RoomBackground`'s existing `<Image>` behavior
  applies (no new failure mode introduced).

## Testing

`__tests__/atmosphereService.test.ts`:

- **Remove** the entire `describe('getTimeOfDayTint', ...)` block (all its
  assertions reference the deleted function).
- **Add** a `describe('getTimeOfDayBackgroundKey', ...)` block covering every
  bucket and both boundaries of each:
  - `5,8,11 → 'morning'`; `4 → 'latenight'` (just below morning)
  - `12,14,16 → 'afternoon'`; `11 → 'morning'` (boundary)
  - `17,19,20 → 'evening'`; `16 → 'afternoon'` (boundary)
  - `21,23,0,3 → 'latenight'`; `20 → 'evening'`, `5 → 'morning'` (boundaries)
- Leave the warmth/calm/rest describe blocks untouched.

Full suite + `npm run typecheck` must stay green.

## Out of Scope (YAGNI)

- No animated/cross-fade transition between buckets — instant swap on render.
- No live timer to re-light the room mid-session.
- No per-stage time backgrounds — one background set shared across all stages.
- No removal of `ROOM_BACKGROUND_URIS` export or the dead `atmosphereTint` prop.
- No change to the warmth / calm / rest overlay system or the bottom fade.

## Verification Checklist

- [ ] `npm run typecheck` clean
- [ ] `npm test` full suite green (new resolver tests pass, old tint tests gone)
- [ ] Home renders the correct background for a mocked hour in each bucket
- [ ] Tint overlay no longer present; warmth/rest/calm/bottomFade still present
- [ ] No leftover `getTimeOfDayTint` references in `src/` (docs/plan history may keep theirs)
