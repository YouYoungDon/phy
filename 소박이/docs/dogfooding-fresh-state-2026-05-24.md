# Fresh-State Dogfooding Prep — 2026-05-24

**Status:** Mapping only. No product behavior changed by this document.
**Branch:** apps-in-toss-clean
**Purpose:** Prepare an intentional first-use walkthrough so we can feel the
"first time someone opens Sobagi" before adding new feature work. You only get
to feel a true first-launch once per reset, so this maps how to get back to
zero cleanly and what to watch for.

---

## 1. Storage reset options

### What `clean-cache` does — and does NOT do
- `npm run clean` → [scripts/clean-cache.js](../scripts/clean-cache.js) clears
  **Metro transform cache + Jest haste-map only**. It touches build tooling in
  the OS temp dir. **It does not clear any app data.** Running it has zero
  effect on the zero-state.

### App-side clear path: there is none
- [storageService.ts](../src/services/storageService.ts) exposes only `save()`
  and `load()`. There is **no `clear`, `removeItem`, or reset function** anywhere
  in the codebase (verified across all `STORAGE_KEYS` writers).
- All persistence goes through the framework `Storage` (`Storage.setItem` /
  `Storage.getItem`, imported from `@apps-in-toss/framework`). The app only ever
  *writes* and *reads* — it never deletes.
- **Conclusion:** there is no in-app "reset to zero" lever today. Building one
  would be a product change (deferred per current scope).

### Therefore: reset = clear the host/device storage
Because `Storage` persists in the native host's key-value store (AsyncStorage-
style), a true zero-state requires clearing storage **outside the app**:
- **Simulator/emulator:** clear the running host app's data, or delete &
  reinstall the host that runs the mini-app (iOS Simulator: erase app / device;
  Android: `adb shell pm clear <host-package>` or App Info → Clear storage).
- **Toss sandbox app on a real device:** clear the host app's storage / reinstall.
- After clearing storage, you **must fully restart the JS process** (not just
  navigate). `appInitialized` and `prevVisitDate` in
  [useAppInit.ts](../src/hooks/useAppInit.ts#L23-L24) are module-level — a warm
  reload won't re-run init. Cold reload / relaunch is required.

> **Open item (non-blocking):** the framework `Storage` method surface beyond
> `get/set` (does it expose `clear()`/`getAllKeys()`?) could not be confirmed
> locally — the symbol isn't in `@apps-in-toss/framework`'s node_modules files
> and the docs search index was file-locked. Even if `clear()` exists, calling
> it requires running code (a dev-only reset button or hook), which is the
> deferred product-change path. The device-level clear above needs no code.

---

## 2. True zero-state checklist

All persisted keys live in [storage.ts](../src/constants/storage.ts). A full
host-storage wipe clears every row below at once. **Wipe everything — do not
cherry-pick keys** (see the pebble/rest gotcha).

| Storage key | Subsystem it controls | Written by | Read / hydrated by |
|---|---|---|---|
| `sobagi-user` (USER blob) | level, **streak**, totalRecordCount, recordedDaysCount, roomStage, **pebbleCount, restsToday, lastRestDate, lastRestAt** | [expenseService.ts:66,138](../src/services/expenseService.ts#L66) | useAppInit → `userStore.hydrate` |
| `sobagi-expenses` | every record (spending / income / no_spend) | expenseService, expenseMigration | useAppInit → `expenseStore.hydrate` |
| `sobagi-last-emotion` | Sobagi's current emotion/mood | [emotionStore.ts:24](../src/store/emotionStore.ts#L24) | useAppInit → `emotionStore` |
| `sobagi-mailbox-delivered-ids` | which letters have been delivered | letterService, restService | mailbox render |
| `sobagi-mailbox-read-ids` | which letters have been opened (clears red dot) | [index.tsx:188](../src/pages/index.tsx#L188) | mailbox red-dot |
| `sobagi-found-item-ids` | found items collected into the bag | index.tsx | bag contents |
| `sobagi-pending-item-id` | bag red-dot: a found item awaiting first view | foundItemService, index | bag dot |
| `sobagi-staged-item-id` | found item staged for next-session promotion | foundItemService | `promoteStaged` on init |
| `sobagi-last-item-date` | daily gate so found-item fires once/day | foundItemService | found-item eval gate |
| `sobagi-last-visit-date` | visit anchor for return-after-gap detection | useAppInit, refreshVisitState | `getPrevVisitDate` / returnAfterGap |
| `sobagi-observation-save-count` | gates observational dialogue lines | [record.tsx:228](../src/pages/record.tsx#L228) | dialogueService |
| `sobagi-last-bag-open-days` | baseline for "new bag item" dot | [index.tsx:171](../src/pages/index.tsx#L171) | `hasNewBagItem` |
| `sobagi-room-placements` | ambient items silently placed in the room | roomPresenceService | room render |
| `sobagi-pending-placement` | placement queued between sessions | roomPresenceService | `checkForPlacement` |
| `sobagi-category-migration-done` | one-time legacy-category migration flag | expenseMigration | migration gate |
| `sobagi-pebble-count` | pebble jar count | [restService.ts:111](../src/services/restService.ts#L111) | (see gotcha) |
| `sobagi-rests-today` | rest watches taken today (daily cap = 2) | restService | rest cap |
| `sobagi-last-rest-date` | daily-reset anchor for rest cap | restService | rest cap reset |
| `sobagi-last-rest-at` | timestamp driving the 60-min rest-warmth overlay | restService | atmosphereService rest-warmth |

### Per-subsystem confirmation (the user's list)
- **Expenses** → `sobagi-expenses`. Cleared by wipe; `expenseStore` re-inits to `[]`.
- **User / store hydration** → `sobagi-user`. Cleared by wipe; `userStore`
  re-inits to defaults (level 1, streak 0, recordedDaysCount 0, pebble 0).
- **Mailbox delivered letters** → `sobagi-mailbox-delivered-ids` (+ read state in
  `sobagi-mailbox-read-ids`). Both cleared by wipe.
- **Found items / staged items** → `sobagi-found-item-ids`,
  `sobagi-staged-item-id`, `sobagi-pending-item-id`, `sobagi-last-item-date`.
- **Pebble count / rest state** → standalone keys `sobagi-pebble-count`,
  `sobagi-rests-today`, `sobagi-last-rest-date`, `sobagi-last-rest-at`
  **AND** the same fields inside the `sobagi-user` blob (see gotcha).
- **Visit state / streak state** → `sobagi-last-visit-date` (visit) and `streak`
  inside `sobagi-user` (streak).
- **Cached photocard / reaction state** → **none persisted.** The photocard and
  reaction screens derive entirely from in-memory `expenses` + `emotion` at
  render time. They reset for free once storage is wiped and the process
  restarts. (Reaction's `lastKind` lives in `emotionStore`, re-init'd on restart.)

### ⚠️ Pebble/rest gotcha — why you must wipe everything
Rest state is written to the **standalone keys** by `grantRest`, but
[useAppInit hydrates pebble/rest from the USER blob](../src/hooks/useAppInit.ts#L141-L144)
(`userData.pebbleCount ?? 0`). The USER blob's copy is refreshed on the next
expense save. So the same logical value lives in two places. Clearing only
`sobagi-pebble-count` while leaving `sobagi-user` would **rehydrate a stale
pebble count**. A full wipe avoids this entirely.

---

## 3. Fresh-state walkthrough plan

Do the steps **in order** — the first record permanently changes
recordedDaysCount, level baselines, and visit anchors, so capture the truly
empty state first. Use the observation table in §4 at each ▶ checkpoint.

**Pre-step:** wipe host storage → cold relaunch (per §1).

1. **▶ First launch, zero records** — *before touching anything.*
   Look at: the empty home room, Sobagi's greeting bubble, the level chip
   (should read level 1 / earliest progress), absence of mailbox red-dot,
   absence of bag dot, the pebble jar's empty/initial read, and the
   [DailySummary](../src/components/common/DailySummary.tsx) empty state. Does an
   empty room feel *calm and inviting* or *unfinished/empty*?

2. **▶ First spending record** — open record screen, enter amount + category +
   memo, save. Watch the amount/memo input feel (this also previews the Android
   keyboard concern). Does category selection read as *life scenes* or *accounting*?

3. **▶ First reaction screen** — the post-save reaction. Watch Sobagi's emotion,
   the title copy, the floating hearts, and the timing of the "포토카드 생성"
   button appearing (~1s) vs. auto-dismiss.

4. **▶ First photocard entry** — tap 포토카드 생성. Watch the white-reveal
   animation, the mood-asset panel, the records list, and the "오늘의 한 줄"
   quote. Does it feel like *a kept moment* or *a receipt*?

5. **▶ First no-spend record** — record a no-spend day. Confirm the reaction
   runs but **no photocard button** appears (no-spend-only days don't expose it).
   Does no-spend feel *honored* or *like a zero*?

6. **▶ First income record** — record income (용돈 받음 🤲 / 용돈 🫶). Confirm the
   reaction runs, **no photocard button** for income-only, and that nothing shows
   a balance, total, or "saved" framing. Income should read as a *quiet scene*,
   not a ledger entry.

7. **▶ First mailbox letter + red-dot** — letters deliver by threshold / calendar
   window (letterService). On the first qualifying launch, watch the mailbox
   gain a letter and red-dot, then open it. Does the letter feel *personal* and
   *earned-by-presence*, or *like a notification*?

8. **▶ First pebble jar tap / rest-TV** — *only if supported* in your dev host
   (`loadFullScreenAd.isSupported()`; uses the **dev** ad group ID). Tap the jar /
   open the rest prompt, watch the ad → reward → pebble increment → the soft
   rest-warmth overlay settling over the room → any rest letter delivered. Does
   "쉬어가기" feel *gentle* or *like a game reward loop*?

---

## 4. Observation format

Fill one block per ▶ checkpoint. Mark the axes that apply; the free note is
where the real signal lives.

```
Checkpoint: [e.g. "First launch, zero records"]
Date/Device:

  😕 confusing?        [ ]   ___________________________________________
  💰 too financial?    [ ]   ___________________________________________
  🎮 too game-like?    [ ]   ___________________________________________
  🕳  too empty?        [ ]   ___________________________________________
  🌱 emotionally right?[ ]   ___________________________________________

  One thing to change: _______________________________________________
  Leave exactly as-is: _______________________________________________
```

Rolling read after the full pass:
- Which single moment felt *most* like "a place I want to return to"?
- Which single moment broke the spell hardest?
- Did the empty state feel calm or unfinished? (decides onboarding-lite work)
- Anything that drifted toward finance/game register? (tone debt)

---

## Notes / open items surfaced during mapping
- No in-app reset exists. If first-use dogfooding becomes frequent, a **dev-only**
  storage-reset (gated on `__DEV__`) would be the cleanest enabler — but that's a
  product change, intentionally **not** done here.
- Confirm the framework `Storage` method surface (`clear`/`getAllKeys`) against
  Toss docs when the docs index is free, in case it simplifies future reset tooling.
