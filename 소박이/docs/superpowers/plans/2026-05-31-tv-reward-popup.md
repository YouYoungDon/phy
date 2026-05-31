# TV Reward Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing simple rest sheet with a three-state popup (reward / daily-limit-reached / suppressed) that makes the reward and daily limit explicit, supports "don't show today", and raises the cap from 2 to 3 with a fixed 1-pebble reward.

**Architecture:** Pure restService helpers + a re-rendered RestPrompt with a state prop + a new storage key + a small wiring update at the TV `onPress` callsite. No new hooks, no new component files outside RestPrompt.

**Tech Stack:** TypeScript 5.8, React Native 0.84, Zustand 5, Jest 29. Reuses the existing `useRestedAd` ad lifecycle and `grantRest` boundary.

---

## File Structure

- **Modify** `소박이/src/services/restService.ts` — cap 2→3, computePebbleDelta returns 1, drop PEBBLE_MIN/MAX, add `PEBBLE_PER_REST` and `isSuppressedForToday`.
- **Modify** `소박이/__tests__/restService.test.ts` — update existing assertions for new constants, add isSuppressedForToday tests.
- **Modify** `소박이/src/constants/storage.ts` — add `SUPPRESS_REST_POPUP_DATE`.
- **Replace** `소박이/src/components/room/RestPrompt.tsx` — three-state popup with checkbox.
- **Modify** `소박이/src/pages/index.tsx` — new TV onPress decision tree, new local state for suppress + sheet sub-state, pass new props to RestPrompt.
- **Modify** `소박이/src/hooks/useAppInit.ts` — hydrate suppress flag on init.

---

## Task 1: restService — cap, fixed pebble, suppress helper (TDD)

**Files:**
- Modify: `소박이/__tests__/restService.test.ts` (test updates land first)
- Modify: `소박이/src/services/restService.ts` (impl follows)

- [ ] **Step 1: Update test for new constants (will fail against current source)**

In `__tests__/restService.test.ts`:

Replace the `computePebbleDelta` describe block:

```ts
import {
  computePebbleDelta,
  findCrossedLetterThresholds,
  getEffectiveRestsToday,
  canRest,
  isSuppressedForToday,
  PEBBLE_PER_REST,
  REST_DAILY_CAP,
} from '../src/services/restService';

// ... existing ThresholdItem type ...

describe('computePebbleDelta', () => {
  it('returns the fixed PEBBLE_PER_REST value (1)', () => {
    expect(computePebbleDelta()).toBe(1);
    expect(PEBBLE_PER_REST).toBe(1);
  });
});
```

Update the `canRest` describe block:

```ts
describe('canRest', () => {
  it('allows rest on a fresh day even when storedRestsToday is at the old cap (2)', () => {
    expect(canRest(2, '2026-05-20', '2026-05-21')).toBe(true);
  });

  it('allows rest when restsToday < REST_DAILY_CAP', () => {
    expect(canRest(0, '2026-05-21', '2026-05-21')).toBe(true);
    expect(canRest(1, '2026-05-21', '2026-05-21')).toBe(true);
    expect(canRest(2, '2026-05-21', '2026-05-21')).toBe(true);
  });

  it('blocks rest when restsToday >= REST_DAILY_CAP', () => {
    expect(canRest(3, '2026-05-21', '2026-05-21')).toBe(false);
    expect(canRest(4, '2026-05-21', '2026-05-21')).toBe(false);
  });

  it('REST_DAILY_CAP is 3', () => {
    expect(REST_DAILY_CAP).toBe(3);
  });
});

describe('isSuppressedForToday', () => {
  it('returns false when suppressDate is null', () => {
    expect(isSuppressedForToday(null, '2026-05-31')).toBe(false);
  });

  it('returns false when suppressDate is from a past day', () => {
    expect(isSuppressedForToday('2026-05-30', '2026-05-31')).toBe(false);
  });

  it('returns true when suppressDate matches today', () => {
    expect(isSuppressedForToday('2026-05-31', '2026-05-31')).toBe(true);
  });
});
```

Update the grantRest pebble-range test:

```ts
it('grants exactly 1 pebble per watch', async () => {
  await grantRest();
  const after = useUserStore.getState().pebbleCount;
  expect(after).toBe(1);
});
```

Update the letter-crossing test starting count (was 25 to land in [30,45], now must be 29 to land at 30):

```ts
it('delivers a letter when its pebble threshold is crossed', async () => {
  // Starting at 29, delta is fixed 1, newCount = 30 — exactly crosses rest1.
  useUserStore.setState({ pebbleCount: 29 });
  (storageService.load as jest.Mock).mockResolvedValueOnce(null);
  const result = await grantRest();
  expect(result.lettersDelivered.map((l) => l.id)).toContain('rest1');
  expect(storageService.save).toHaveBeenCalledWith(
    STORAGE_KEYS.MAILBOX_DELIVERED_IDS,
    expect.arrayContaining(['rest1']),
  );
});

it('does not re-deliver a letter the mailbox already has', async () => {
  useUserStore.setState({ pebbleCount: 29 });
  (storageService.load as jest.Mock).mockResolvedValueOnce(['rest1']);
  const result = await grantRest();
  expect(result.lettersDelivered.map((l) => l.id)).not.toContain('rest1');
});
```

- [ ] **Step 2: Run tests, confirm new ones fail**

Run from project dir: `node node_modules/jest/bin/jest.js --testPathPattern=restService`
Expected: failures on `PEBBLE_PER_REST` import (doesn't exist yet), on the `REST_DAILY_CAP === 3` assertion, on `isSuppressedForToday` import, on the +1 grantRest assertion (gets 5-20 from current code).

- [ ] **Step 3: Update restService.ts to match**

Edit `src/services/restService.ts`:

Replace:
```ts
export const PEBBLE_MIN = 5;
export const PEBBLE_MAX = 20;
export const REST_DAILY_CAP = 2;

/** Inclusive integer in [PEBBLE_MIN, PEBBLE_MAX]. */
export function computePebbleDelta(): number {
  const range = PEBBLE_MAX - PEBBLE_MIN + 1;
  return PEBBLE_MIN + Math.floor(Math.random() * range);
}
```

With:
```ts
// Reward magnitude is intentionally fixed at 1: the TV reward popup
// advertises "조약돌 1개" and the user-facing promise must match. Old
// random range (5–20) was kept invisible from the UI; with the popup
// surfacing the amount, predictability beats variance. Rest-letter
// thresholds (REST_LETTERS) are unchanged — delivery rate slows
// accordingly (see the design doc for the deliberate trade-off).
export const PEBBLE_PER_REST = 1;
export const REST_DAILY_CAP = 3;

export function computePebbleDelta(): number {
  return PEBBLE_PER_REST;
}
```

Add after the `canRest` function:

```ts
/**
 * Mirrors getEffectiveRestsToday's daily-reset shape. Returns true only
 * when the user has explicitly opted out of the rest reward popup for
 * the current local date. Past-date suppress flags are treated as not
 * suppressed (auto-expire — no explicit reset is required).
 */
export function isSuppressedForToday(
  suppressDate: string | null,
  todayStr: string,
): boolean {
  return suppressDate !== null && suppressDate === todayStr;
}
```

- [ ] **Step 4: Run tests, confirm all green**

Run: `node node_modules/jest/bin/jest.js --testPathPattern=restService`
Expected: all restService tests pass.

- [ ] **Step 5: Commit**

```bash
git -C /c/Users/toodo/workspace/phy add \
  소박이/src/services/restService.ts \
  소박이/__tests__/restService.test.ts
git -C /c/Users/toodo/workspace/phy commit -m "feat(rest): cap=3, fixed 1-pebble reward, isSuppressedForToday helper

Prep for the TV reward popup (daily limit 3). REST_DAILY_CAP rises
2 → 3 to match the new popup contract. computePebbleDelta becomes
the constant PEBBLE_PER_REST=1 so the popup's '조약돌 1개' copy is
a literal promise, not a marketing simplification. Rest letter
thresholds stay unchanged; their delivery rate slows by design
(documented in the spec).

isSuppressedForToday mirrors getEffectiveRestsToday's daily-reset
shape — a pure helper for the new 'don't show today' opt-out.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Storage key for suppress flag

**Files:**
- Modify: `소박이/src/constants/storage.ts`

- [ ] **Step 1: Add the new key**

In `src/constants/storage.ts`, append a new entry before the closing `} as const;`:

```ts
  SUPPRESS_REST_POPUP_DATE: 'sobagi-suppress-rest-popup-date',
```

- [ ] **Step 2: Typecheck**

```bash
cd 소박이 && node node_modules/typescript/bin/tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git -C /c/Users/toodo/workspace/phy add 소박이/src/constants/storage.ts
git -C /c/Users/toodo/workspace/phy commit -m "feat(storage): add SUPPRESS_REST_POPUP_DATE key

Storage slot for the TV reward popup's 'don't show today' opt-out.
Date-scoped string; stale values auto-expire via the suppress check
helper (isSuppressedForToday) — no migration, no reset code.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: New RestPrompt component (three states)

**Files:**
- Replace: `소박이/src/components/room/RestPrompt.tsx`

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `src/components/room/RestPrompt.tsx` with:

```tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RestAdStatus } from '../../hooks/useRestedAd';
import { COLORS } from '../../constants/colors';

export type RestPromptState = 'reward' | 'daily-limit-reached';

interface RestPromptProps {
  state: RestPromptState;
  adStatus: RestAdStatus;
  watchesToday: number;        // effectiveRestsToday at render time
  dailyCap: number;            // REST_DAILY_CAP — passed in for layout flexibility
  onConfirm: (suppressToday: boolean) => void;  // primary "광고 보고 리워드 받기"
  onCancel: (suppressToday: boolean) => void;   // secondary "괜찮아요"
  onDismiss: () => void;       // daily-limit-reached "닫기"
}

// Three-state rest popup. The home screen owns the state decision; this
// component just renders. Suppress-today preference is captured locally
// and only persists when the user explicitly resolves the popup (confirm
// or cancel) — closing the sheet without pressing a button is treated as
// "no decision".
export function RestPrompt(props: RestPromptProps) {
  if (props.state === 'daily-limit-reached') {
    return <DailyLimitReachedView onDismiss={props.onDismiss} />;
  }
  return <RewardView {...props} />;
}

function DailyLimitReachedView({ onDismiss }: { onDismiss: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>오늘은 받을 수 있는 리워드를 모두 받았어요 🌿</Text>
      <Text style={styles.body}>내일 다시 찾아와 주세요.</Text>
      <View style={styles.buttonRow}>
        <Pressable style={styles.btnSecondary} onPress={onDismiss}>
          <Text style={styles.btnSecondaryLabel}>닫기</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RewardView({
  adStatus,
  watchesToday,
  dailyCap,
  onConfirm,
  onCancel,
}: RestPromptProps) {
  const [suppressToday, setSuppressToday] = useState(false);
  const adReady = adStatus === 'ready';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>잠시 쉬어갈까요?</Text>
      <Text style={styles.body}>광고를 보고 리워드를 받을 수 있어요.</Text>

      <View style={styles.rewardSection}>
        <Text style={styles.rewardLabel}>리워드</Text>
        <Text style={styles.rewardValue}>조약돌 1개</Text>
      </View>

      <Text style={styles.progress}>
        오늘 본 횟수 {watchesToday}/{dailyCap}
      </Text>

      {!adReady && (
        <Text style={styles.hint}>준비 중이에요 🌿</Text>
      )}

      <View style={styles.buttonRow}>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => onCancel(suppressToday)}
        >
          <Text style={styles.btnSecondaryLabel}>괜찮아요</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, !adReady && styles.btnPrimaryDisabled]}
          onPress={() => onConfirm(suppressToday)}
          disabled={!adReady}
        >
          <Text style={styles.btnPrimaryLabel}>광고 보고 리워드 받기</Text>
        </Pressable>
      </View>

      {/* Plain checkbox row — no fancy chrome, matches the existing low-key
          aesthetic. The glyph swap (☑ / ☐) is the only visual feedback. */}
      <Pressable
        style={styles.suppressRow}
        onPress={() => setSuppressToday((v) => !v)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Text style={styles.suppressGlyph}>{suppressToday ? '☑' : '☐'}</Text>
        <Text style={styles.suppressLabel}>오늘 하루 더 이상 보지 않기</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  rewardSection: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  rewardLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  rewardValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  progress: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  hint: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.surface,
  },
  btnSecondaryLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: COLORS.oliveDark,
  },
  btnPrimaryDisabled: {
    opacity: 0.5,
  },
  btnPrimaryLabel: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  suppressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 6,
    marginTop: 2,
  },
  suppressGlyph: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  suppressLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd 소박이 && node node_modules/typescript/bin/tsc --noEmit
```

Expected: exit 0. NOTE — the page (index.tsx) still uses the old RestPrompt props shape, so this WILL fail until Task 4 wires up the new shape. Acceptable — proceed to Task 4 in the same logical change unit. Do not commit yet.

- [ ] **Step 3: (deferred) Commit together with Task 4**

This task's output is incomplete on its own; the next task wires it up. Stage the file but don't commit yet.

---

## Task 4: Wire the popup at the TV onPress site (and hydrate suppress flag)

**Files:**
- Modify: `소박이/src/hooks/useAppInit.ts` — hydrate `SUPPRESS_REST_POPUP_DATE` into a new pageable state, OR pass through a callback. Simplest: read it from storage when home mounts.
- Modify: `소박이/src/pages/index.tsx` — new state, new onPress flow, new RestPrompt props.

- [ ] **Step 1: Load the suppress flag in useAppInit**

Open `src/hooks/useAppInit.ts`. Find the block that loads other rest-related fields. Add a parallel load for `SUPPRESS_REST_POPUP_DATE` and expose it on the init result.

If the existing pattern returns a single hydrated object (not a context), the cleanest path is:
- Add a new local-state hydration where `useAppInit` consumers (just `pages/index.tsx`) load it directly.

If `useAppInit` is the central hydrator (look at how `lastRestDate` is hydrated — line ~141-144 referenced in the dogfood doc), follow the same pattern there. Read the relevant section to confirm.

Concrete pattern (read first, adapt):

```ts
// In useAppInit, alongside other storage reads on init:
const suppressDate = await storageService.load<string>(STORAGE_KEYS.SUPPRESS_REST_POPUP_DATE);
// expose via existing return object OR add a setter on a store
```

If `useAppInit` doesn't expose ad-hoc fields, fall back to letting `pages/index.tsx` load it directly in a `useEffect` on mount — that's also fine for a single-page-consumed value. **Choose the path that matches the existing pattern; do not invent a new state-management layer.**

- [ ] **Step 2: Update the TV onPress in pages/index.tsx**

Look up the current TV `onPress` (around line 397-422). Replace its body. The key changes:

1. Add new local state at the top of the component:

```ts
const [suppressRestPopupDate, setSuppressRestPopupDate] = useState<string | null>(null);
const [restSheetState, setRestSheetState] = useState<'reward' | 'daily-limit-reached'>('reward');
```

Hydrate `suppressRestPopupDate` on mount (per Task 4 Step 1 choice).

2. Add an import line near the top:

```ts
import { getEffectiveRestsToday, grantRest, isSuppressedForToday, REST_DAILY_CAP } from '../services/restService';
import { getLocalDateString } from '../utils/date';
```

(`getLocalDateString` may already be imported — keep one import line.)

3. Replace the TV `onPress` body (the cap check at line 400 currently says `>= 2`):

```ts
onPress={() => {
  // Infrastructure short-circuits run first — always notify even if
  // the user suppressed the popup for today.
  if (adState.status === 'unsupported') {
    setBubbleMessage('아직 준비 중이에요 🌿');
    setBubbleVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
    return;
  }
  if (adState.status === 'error') {
    setBubbleMessage('지금은 조용한 채널이 없어요 🌿');
    setBubbleVisible(true);
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3000);
    return;
  }

  // Daily limit takes precedence — informational popup, always shown.
  if (effectiveRestsToday >= REST_DAILY_CAP) {
    setRestSheetState('daily-limit-reached');
    openSheet('rest');
    return;
  }

  // User opted out for today → silent no-op (no popup, no bubble).
  const todayStr = getLocalDateString(new Date());
  if (isSuppressedForToday(suppressRestPopupDate, todayStr)) {
    return;
  }

  setRestSheetState('reward');
  openSheet('rest');
}}
```

4. Replace the RestPrompt render block (current location ~line 549-578):

```tsx
{activeSheet === 'rest' && (
  <RestPrompt
    state={restSheetState}
    adStatus={adState.status}
    watchesToday={effectiveRestsToday}
    dailyCap={REST_DAILY_CAP}
    onConfirm={(suppressToday) => {
      // Persist suppress preference BEFORE closing/firing ad — if the
      // user closes the sheet during ad load, the suppress choice still
      // sticks.
      if (suppressToday) {
        const today = getLocalDateString(new Date());
        setSuppressRestPopupDate(today);
        void storageService.save(STORAGE_KEYS.SUPPRESS_REST_POPUP_DATE, today);
      }
      closeSheet();
      adState.show(() => {
        grantRest()
          .then(() => {
            setBubbleMessage('소박이가 한 숨 돌렸어요 🌿');
            setBubbleVisible(true);
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
            hideTimeoutRef.current = setTimeout(() => setBubbleVisible(false), 3500);
          })
          .catch((err) => {
            if (__DEV__) console.error('[grantRest] failed:', err);
          });
      });
    }}
    onCancel={(suppressToday) => {
      if (suppressToday) {
        const today = getLocalDateString(new Date());
        setSuppressRestPopupDate(today);
        void storageService.save(STORAGE_KEYS.SUPPRESS_REST_POPUP_DATE, today);
      }
      closeSheet();
    }}
    onDismiss={closeSheet}
  />
)}
```

- [ ] **Step 3: Typecheck**

```bash
cd 소박이 && node node_modules/typescript/bin/tsc --noEmit
```
Expected: exit 0. Both component and page now use the new props shape.

- [ ] **Step 4: Run full Jest suite**

```bash
cd 소박이 && node node_modules/jest/bin/jest.js
```
Expected: 30 suites pass, with restService tests updated to reflect the new cap and reward.

- [ ] **Step 5: Commit (Tasks 3 + 4 together)**

```bash
git -C /c/Users/toodo/workspace/phy add \
  소박이/src/components/room/RestPrompt.tsx \
  소박이/src/pages/index.tsx \
  소박이/src/hooks/useAppInit.ts
git -C /c/Users/toodo/workspace/phy commit -m "feat(rest): TV reward popup with daily limit 3 + 'don't show today'

Replaces the simple rest sheet with a three-state popup per the
2026-05-31 brief:

  Reward (0/3, 1/3, 2/3): explicit reward label '조약돌 1개',
    progress '오늘 본 횟수 X/3', primary/secondary buttons,
    'don't show today' checkbox that persists only on resolve.
  Daily-limit-reached (3/3): informational, single 닫기 button.
  Suppressed today: silent no-op on tap.

Reward magnitude is now a literal promise: PEBBLE_PER_REST=1
matches the popup copy exactly. Existing trust boundary
(userEarnedReward → grantRest) is unchanged.

Infrastructure feedback (unsupported / error) wins over the
suppress flag — users always know when the ad system is down,
even if they opted out of the popup for today.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Final verification

- [ ] **Step 1: Typecheck**

```bash
cd 소박이 && node node_modules/typescript/bin/tsc --noEmit
```
Expected: exit 0.

- [ ] **Step 2: Full Jest**

```bash
cd 소박이 && node node_modules/jest/bin/jest.js
```
Expected: all suites green; total count grows by the new `isSuppressedForToday` tests (3) and changes by the updated computePebbleDelta / canRest tests.

- [ ] **Step 3: Anti-drift grep (sanity)**

```powershell
Select-String -Path 소박이\src\**\*.ts,소박이\src\**\*.tsx -Pattern 'dashboard|KPI|portfolio|순수익|차액|자산관리|투자관리' -CaseSensitive:$false
```
Expected: only the deliberate 차액 guard comment in stats.tsx.

- [ ] **Step 4: ait build**

```bash
cd 소박이 && npm run build
```
Expected: `pockeksobak.ait` produced, 0 errors / 0 warnings.

- [ ] **Step 5: Commit fresh .ait + force-move release-v1 (or release-v1.1 — confirm with user before pushing)**

Default plan: this is still part of the v1 release (rest feature stays dormant in prod because PROD_REST_AD_GROUP_ID=''). When the user pastes the prod ad id, the popup becomes live in a follow-up commit.

```bash
git -C /c/Users/toodo/workspace/phy add 소박이/pockeksobak.ait
git -C /c/Users/toodo/workspace/phy commit -m "build: refresh pockeksobak.ait with TV reward popup

[details]

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# Then: confirm tag move strategy with user before pushing.
```

---

## Memory updates (after merge)

After the implementation lands cleanly, update:

- `feedback_sobagi_categories_life_scenes.md` — add a scoped exception entry noting the TV reward popup explicitly surfaces counts (X/3) and reward magnitudes ("조약돌 1개") with a documented justification.
- `project_sobagi_vision.md` — note the TV reward popup as a documented "reward language permitted" surface, distinguishing it from celebration animations / level-ups which remain disallowed.

These are memory writes only; no source code change in this plan.
