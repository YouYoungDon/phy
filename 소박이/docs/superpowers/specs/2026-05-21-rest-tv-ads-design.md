# 쉬어가기 TV — Soft Rewarded-Ad System — Design Spec

**Date:** 2026-05-21
**Status:** Approved
**Branch target:** apps-in-toss-clean

---

## Goal

Introduce a small TV-based resting interaction inside Sobagi's room that pairs a rewarded ad watch with a quiet emotional ritual. Watching grants a small handful of 조약돌 (pebbles), nudges room warmth, refreshes Sobagi's idle line, and — at hidden pebble thresholds — delivers a personal letter. Pebbles never spend; they accumulate forever as a visible quiet trace in a 병 (jar) sprite next to the TV.

## Philosophy

Not: *"Watch ads → get rewards."*
But: *"Spend a quiet moment with Sobagi → a small trace remains."*

The TV reads as furniture, not a menu. The jar reads as presence, not a currency UI. The whole interaction sits inside the room's existing emotional vocabulary (warmth overlays, idle bubbles, mailbox letters) — it adds no new visual language for "rewards."

Critical constraints:
- The app must remain fully enjoyable without resting / ads.
- Resting never gates progression (level / roomStage / recordedDaysCount stay independent).
- No streaks, multipliers, push notifications, or "watch more for bonus" patterns.
- Hard cap: 2 watches per local day.
- When the SDK reports `isSupported() === false`, the TV simply doesn't render — no fallback prompt, no apology message.

## Section 1 — Architecture & data model

### New files

- `src/services/restService.ts` — pure logic: `canRest()`, `grantRest()`, threshold detection, daily reset. No React, no SDK.
- `src/hooks/useRestedAd.ts` — wraps `loadFullScreenAd` / `showFullScreenAd` lifecycle, exposes `{ status, show }`.
- `src/components/room/RestTV.tsx` — TV sprite + tap behavior.
- `src/components/room/PebbleJar.tsx` — jar sprite + tap bubble.
- `src/components/room/RestPrompt.tsx` — bottom-sheet prompt + reward flow.
- `src/constants/restLetters.ts` — letter pool keyed by `triggerPebbles`.
- `src/constants/ads.ts` — `REST_AD_GROUP_ID`.

### Modified files

- `src/constants/assets.ts` — add `ROOM_FURNITURE_URIS` export with `tv` key.
- `src/constants/storage.ts` — add `PEBBLE_COUNT`, `RESTS_TODAY`, `LAST_REST_DATE`, `LAST_REST_AT`.
- `src/store/userStore.ts` — new fields, setters, hydration; daily reset of `restsToday` when `lastRestDate !== todayStr`.
- `src/services/storageService.ts` — load/save the four new keys.
- `src/services/atmosphereService.ts` — add `getRestWarmthOpacity(now, lastRestAtISO)`.
- `src/hooks/useAppInit.ts` — hydrate the four new userStore fields on cold start.
- `src/pages/index.tsx` — render `<RestTV />` + `<PebbleJar />` inside `RoomBackground`; extend `SheetType` to include `'rest'`; wire `useRestedAd` hook; merge rest letters into `LETTER_LOOKUP`; add `getIdleMessages(lastRestAtISO)` for rest-aware lines; add new overlay using `getRestWarmthOpacity`.

### Data shape (userStore additions)

```ts
pebbleCount: number;          // accumulates forever, never spends
restsToday: number;           // 0, 1, or 2 — effective value depends on lastRestDate
lastRestDate: string | null;  // YYYY-MM-DD, used to detect day rollover
lastRestAt: string | null;    // ISO timestamp, used to fade warmth overlay
```

### Daily reset semantics

`canRest()` always normalizes against today's local date — it does not trust `restsToday` blindly:

```ts
function canRest(): boolean {
  const todayStr = getLocalDateString(new Date());
  if (userStore.lastRestDate !== todayStr) return true;  // new day, fresh
  return userStore.restsToday < 2;
}
```

`grantRest()` writes `lastRestDate = todayStr` atomically with the `restsToday` increment, so the day-rollover case is handled at use-time without a separate reset job. This pattern matches the existing streak service.

For UI surfaces that read `restsToday` (e.g., TV opacity), use a derived selector `effectiveRestsToday = lastRestDate === todayStr ? restsToday : 0`.

### Letter delivery

Rest letters merge into the existing mailbox flow. `MAILBOX_DELIVERED_IDS` is the single source of truth — appending a rest letter's ID lights up the existing red-dot indicator with zero new UI.

### SDK gate

If `loadFullScreenAd.isSupported() === false`, `useRestedAd` returns `status: 'unsupported'` and `<RestTV />` returns `null`. No fallback messaging, no banner, no "ad unavailable" copy in the room. This is intentional — we never promote the resting path as something users seek out.

## Section 2 — Room sprites (TV + jar)

### Asset additions

```ts
// constants/assets.ts
export const ROOM_FURNITURE_URIS: Record<'tv', string> = {
  tv: `${CDN}/sobaki_tv.png`,
};
```

### Position anchoring

The TV anchors to a normalized constant representing the mailbox's visual position. The mailbox utility icon itself **does not change** — it stays pixel-positioned in the existing utility stack (`top:118, left:16`). The constant exists so room-layer fixtures can anchor below it without duplicating coordinates.

```ts
// Lives in index.tsx (or src/constants/roomLayout.ts if more fixtures join)
const MAILBOX_POSITION = { x: 0.12, y: 0.29 } as const;
const TV_POSITION = {
  x: MAILBOX_POSITION.x + 0.02,
  y: MAILBOX_POSITION.y + 0.16,
};
const JAR_POSITION = { x: 0.18, y: 0.66 } as const;
```

Starting values are derived from the existing pixel layout. Final numbers may shift ±0.02 after the live small-phone visual check; the *relationship* (TV anchors to mailbox) is locked.

### TV sprite states

| State | Condition | Opacity |
|---|---|---|
| Available | `effectiveRestsToday < 2 && status === 'ready'` | `0.85` |
| Loading | `effectiveRestsToday < 2 && status === 'loading'` | `0.55` |
| Done for today | `effectiveRestsToday >= 2` | `0.35` |
| Error | `status === 'error'` | `0.35` |

(`effectiveRestsToday` is the daily-reset-aware selector defined in Section 1.)

Rendering:

```tsx
<Image
  source={{ uri: ROOM_FURNITURE_URIS.tv }}
  style={[
    styles.tvSprite,
    { left: `${TV_POSITION.x * 100}%`, top: `${TV_POSITION.y * 100}%`, opacity: tvOpacity },
  ]}
  resizeMode="contain"
/>
```

Target size around 56×56px; final size pinned to the asset's intrinsic ratio.

### TV tap behavior

| State | Tap action |
|---|---|
| Available | Opens `<RestPrompt />` sheet |
| Loading | Opens sheet with disabled "쉬어가기" button + `'준비 중이에요 🌿'` hint |
| Done for today | Bubble above TV: `'오늘은 충분히 쉬었어요 🌿'` (3s, no sheet) |
| Error | Bubble: `'지금은 조용한 채널이 없어요 🌿'` (3s, no sheet) |

### Jar fill stages

Single emoji (`🫙`) with opacity + scale stages — no glyph switching.

| Stage | `pebbleCount` | Opacity | Scale |
|---|---|---|---|
| Empty | 0–9 | `0.40` | `1.00` |
| Few | 10–49 | `0.60` | `1.00` |
| Many | 50–199 | `0.80` | `1.00` |
| Overflowing | 200+ | `1.00` | `1.08` |

Tap behavior: 2-second bubble above the jar — `'조약돌 N개'` — auto-dismisses. No sheet, no spending UI, no explanation card.

### No badges, no labels

Neither sprite shows a quest indicator, "NEW" badge, or label underneath. The TV being slightly opaque vs. fully muted is the only signal that today's rest is available. The jar is silent until tapped.

## Section 3 — Ad flow + per-watch rewards

### `useRestedAd` hook lifecycle

```ts
type RestAdStatus = 'loading' | 'ready' | 'showing' | 'unsupported' | 'error';

function useRestedAd(): {
  status: RestAdStatus;
  show: (onReward: () => void) => void;
}
```

1. On Home mount: check `loadFullScreenAd.isSupported()`. If false → `status: 'unsupported'` permanently.
2. If supported: call `loadFullScreenAd({ options: { adGroupId: REST_AD_GROUP_ID } })`. `loaded` event → `status: 'ready'`. `onError` → `status: 'error'`.
3. User taps "쉬어가기" in prompt: call `showFullScreenAd`. `status: 'showing'`.
4. `userEarnedReward` event fires → invoke `onReward()`. **Only path that grants pebbles.** `dismissed` alone does nothing.
5. `dismissed` event fires → `status: 'loading'`, call `loadFullScreenAd` again for next watch.
6. On unmount: call the `unregister` returned from `loadFullScreenAd`.

The hook does not call `grantRest()` directly — it invokes the `onReward` callback that `RestPrompt.tsx` passes in. This keeps SDK concerns isolated from business logic.

### `grantRest()` in `restService.ts`

```ts
function grantRest(): RestGrant {
  const pebbleDelta = randomInt(5, 20);
  const oldCount = userStore.pebbleCount;
  const newCount = oldCount + pebbleDelta;

  const lettersToDeliver = REST_LETTERS.filter(
    (l) => l.triggerPebbles > oldCount && l.triggerPebbles <= newCount,
  );

  userStore.setPebbleCount(newCount);
  userStore.setRestsToday(userStore.restsToday + 1);
  userStore.setLastRestDate(getLocalDateString(new Date()));
  userStore.setLastRestAt(new Date().toISOString());

  for (const letter of lettersToDeliver) {
    appendDeliveredLetter(letter.id);
  }

  return { pebbleDelta, newCount, lettersDelivered: lettersToDeliver };
}

// TODO(rest-rare-item): when pebbleCount crosses 500 / 1500 / 3000, deliver
// a rare ambient item to the room placements. Item pool and delivery shape
// defined in a separate spec — not in scope for this landing.
```

**Trust boundary:** the SDK's `event.data.unitType` and `event.data.unitAmount` are ignored. Pebbles are always 5–20 from our own RNG. The SDK event is the trust signal that a watch completed — nothing more.

### Per-watch visual sequence

After `userEarnedReward` fires and `grantRest()` completes:

1. Prompt sheet auto-dismisses (slide-down using existing `sheetAnim` pattern).
2. One-time warm-color pulse across the room — `COLORS.wood` family at `opacity: 0.08`, fades to `0` over ~600ms. Visual only, not persisted.
3. Sobagi's emotion bubble pops with `'소박이가 한 숨 돌렸어요 🌿'` (~3s, reuses `EmotionBubble` + `hideTimeoutRef` from existing `handleSobagiTap`).
4. Pebble counter `'+N'` rises from the jar sprite over ~1s, fades. Then the jar's opacity/scale updates to its new fill stage.
5. Letters delivered: no separate celebration. The mailbox red-dot lights up; user discovers the letter on next mailbox open.

### Persistent warmth nudge (atmosphereService.ts)

```ts
export function getRestWarmthOpacity(now: Date, lastRestAtISO: string | null): number {
  if (lastRestAtISO === null) return 0;
  const minsSince = (now.getTime() - Date.parse(lastRestAtISO)) / 60_000;
  if (minsSince < 0 || minsSince > 60) return 0;
  return 0.08 * (1 - minsSince / 60);  // linear fade 0.08 → 0 over 60 min
}
```

Rendered as a new room overlay in `index.tsx` using the same pattern as the existing `warmthOpacity` / `calmOpacity` overlays. Color `#E8C070` (matching existing warmth tint). Composes additively — does not replace the day-count-based warmth.

The 60-minute window persists across app reloads via the stored `lastRestAt`.

### Idle line refresh

Three rest-aware idle lines are added to a separate pool:

```ts
const REST_IDLE_MESSAGES = [
  '잠깐 쉬다 왔어요 🌿',
  '좋은 채널이었어요 📺',
  '한 숨 돌리니 좋네요 🌿',
];

function getIdleMessages(lastRestAtISO: string | null, now: Date): string[] {
  const restRecent = lastRestAtISO !== null
    && (now.getTime() - Date.parse(lastRestAtISO)) / 60_000 < 60;
  return restRecent ? [...IDLE_MESSAGES, ...REST_IDLE_MESSAGES] : IDLE_MESSAGES;
}
```

`handleSobagiTap` reads from this merged pool.

### Done-for-today flow

After the 2nd watch completes, `restsToday === 2`. TV opacity drops to `0.35`. Future taps bypass the prompt sheet and show the `'오늘은 충분히 쉬었어요 🌿'` bubble for 3s.

### Error paths

- `unsupported` → TV sprite never renders.
- `error` (load failed) → TV at 0.35 opacity. Tap → bubble `'지금은 조용한 채널이 없어요 🌿'`.
- `failedToShow` event → close prompt sheet, same dimmed-bubble treatment.
- User dismisses ad mid-view (no `userEarnedReward`) → no grant. Prompt sheet just closes. Status returns to `ready` for next attempt — `restsToday` does not increment.

## Section 4 — Threshold rewards & copy

### Rest letters

5 letters in initial pool, defined in `restLetters.ts`:

```ts
export type RestLetter = {
  id: string;
  triggerPebbles: number;
  body: string;
  sig: string;
};
```

| `id` | `triggerPebbles` | Theme |
|---|---|---|
| `rest1` | 30 | First rest-letter — gentle acknowledgment of pausing |
| `rest2` | 100 | Resting becoming a quiet small habit |
| `rest3` | 250 | Room feels warmer because you came back |
| `rest4` | 500 | Sobagi has been watching channels with you for a while |
| `rest5` | 1000 | Long-form settled-trace letter |

**Letter body drafts** (final wording pinned during implementation, drafts here for reference):

```
rest1:
오늘도 잠깐 쉬어갔네요.
조용한 채널을 보고 있으면
시간이 천천히 흐르는 것 같아요.
— 소박이

rest2:
요즘 자주 쉬어가네요.
조용한 시간이 쌓이는 건
작은 일이 아니에요.
— 소박이

rest3:
이 방이 조금 따뜻해진 것 같아요.
계속 들러줘서 그런가봐요 🌿
— 소박이

rest4:
같이 본 채널이 꽤 됐네요.
대단한 건 아니지만
이 시간이 좋아요.
— 소박이

rest5:
조약돌이 한가득 모였어요.
그동안 함께 쉬어갔던
조용한 순간들이에요.
— 소박이
```

Tone: short (3–5 lines), no exclamation about ads, no thank-you for watching, no reward framing. Closer in register to the existing personal letters than to a notification.

### Letter integration

Rest letters merge into `LETTER_LOOKUP` in `index.tsx` alongside `PERSONAL_LETTERS` and `ALL_SEASONAL_LETTERS`. Existing mailbox UI renders them with zero changes — same card layout, same red-dot indicator, same expand/collapse pattern.

### Rare ambient item hook

State is tracked (`pebbleCount`) but no items deliver yet. A TODO comment in `grantRest()` marks the integration point for the follow-up spec.

### Full copy reference

| Surface | Copy |
|---|---|
| Prompt sheet title | `소박이랑 잠깐 쉬어갈까요? 📺` |
| Prompt sheet body | `조용한 채널을 잠깐 보면 / 소박이가 한 숨 돌릴 거예요.` |
| Prompt primary button | `쉬어가기` |
| Prompt secondary button | `다음에` |
| Prompt loading hint | `준비 중이에요 🌿` (disables primary button) |
| Post-watch bubble (Sobagi) | `소박이가 한 숨 돌렸어요 🌿` |
| Pebble grant overlay | `+N` (rises from jar) |
| Jar tap bubble | `조약돌 N개` |
| Done-for-today bubble | `오늘은 충분히 쉬었어요 🌿` |
| Ad-error bubble | `지금은 조용한 채널이 없어요 🌿` |
| Rest-aware idle lines (added pool) | `잠깐 쉬다 왔어요 🌿` / `좋은 채널이었어요 📺` / `한 숨 돌리니 좋네요 🌿` |

No notifications, no celebration overlays, no threshold-progress hints.

## File-level scope

### Create

- `src/services/restService.ts`
- `src/hooks/useRestedAd.ts`
- `src/components/room/RestTV.tsx`
- `src/components/room/PebbleJar.tsx`
- `src/components/room/RestPrompt.tsx`
- `src/constants/restLetters.ts`
- `src/constants/ads.ts`
- `__tests__/restService.test.ts` — unit tests for `grantRest()` (pebble grant range 5–20, threshold crossing detection, daily reset)
- `__tests__/atmosphereService.test.ts` — unit tests for `getRestWarmthOpacity` (fade curve, null safety, window boundaries)

### Modify

- `src/constants/assets.ts`
- `src/constants/storage.ts`
- `src/store/userStore.ts`
- `src/services/storageService.ts`
- `src/services/atmosphereService.ts`
- `src/hooks/useAppInit.ts`
- `src/pages/index.tsx`

### Unchanged

- 가방 / 우편함 utility icon positions & styles
- Existing letters (`letters.ts`), found items, room placements
- Sobagi character rendering, emotion engine, dialogue service
- Record screen, reaction screen, stats, photocard
- Streak / level / roomStage / recordedDaysCount logic
- All other storage keys

## Anti-patterns (out of scope)

This landing must NOT introduce:

- Pebble spending UI of any kind
- Streak / consecutive-day rewards for resting
- Push notifications about rest availability
- Visible progress bar to next letter / threshold
- "Watch 2 today to unlock bonus" framing
- Achievement / badge / level for accumulated pebbles
- Sharing pebble count externally
- Skip / fast-forward affordance on the ad
- Reward multiplier or "x2 pebbles today"
- Linking rest to `streak` / `level` / `roomStage` / `recordedDaysCount` progression
- Replacing the existing warmth/calm overlays
- Trusting `event.data.unitAmount` from the SDK for pebble grant size
- Reward delivery on `dismissed` event (only `userEarnedReward` grants)

## Success criteria

- TV sprite renders visually below the mailbox icon; jar sprite renders in 방구석 floor area. Both feel like furniture, not buttons.
- Tapping the TV when available opens a calm prompt sheet with `소박이랑 잠깐 쉬어갈까요? 📺`.
- Watching to completion grants 5–20 pebbles, pulses warmth, pops the Sobagi line, and triggers a letter when a hidden threshold is crossed.
- Dismissing the ad without completion grants nothing — no pebbles, no warmth, no letter, no `restsToday` increment.
- The 3rd tap of the day shows `오늘은 충분히 쉬었어요 🌿` without launching anything.
- When `loadFullScreenAd.isSupported()` is false, the TV sprite never appears — no fallback messaging.
- Pebble accumulation visibly changes the jar's appearance across 4 stages.
- Tapping the jar shows `조약돌 N개` as a 2-second bubble.
- Letters delivered through rest mix invisibly with the existing letters in the mailbox.
- Typecheck stays clean; new unit tests for `restService` and `atmosphereService` pass; full Jest suite stays green.
