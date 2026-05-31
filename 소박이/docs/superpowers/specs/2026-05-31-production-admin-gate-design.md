# Production Admin Gate — Design

**Date:** 2026-05-31
**Branch:** apps-in-toss-clean
**Status:** Approved (release-readiness P0)

## Problem

Two services run on every app launch and make outbound HTTP calls to a hardcoded
localhost admin endpoint:

- `syncRemoteLetters()` in [letterService.ts](../../../src/services/letterService.ts) —
  fetches `http://127.0.0.1:4173/api/letters?userId=…`, merges results into
  `MAILBOX_REMOTE_LETTERS` and `MAILBOX_DELIVERED_IDS`.
- `syncAdminOperations()` in [adminOpsService.ts](../../../src/services/adminOpsService.ts) —
  fetches `…/api/ops/pending?userId=…`, applies operations that can mutate mailbox
  state, discovery state, and the entire `UserState` blob
  (`level`, `streak`, `totalRecordCount`, `recordedDaysCount`, `roomStage`).

In a production `ait build` shipped to AppsInToss:

1. These calls still fire on every launch (battery / network waste, failed network
   calls in catch blocks).
2. The dev override global `SOBAGI_ADMIN_LETTER_ENDPOINT` could point to any URL.
   If set, **arbitrary operators could remotely reset/mutate user state** —
   `set_user_state`, `reset_mailbox`, `reset_discovery`, etc.

This is unacceptable for a user-facing release.

## Approach

Build-time gate on `__DEV__` (React Native global, `true` during `granite dev`,
`false` in `ait build` production bundles). Established pattern already used in
[storageService.ts:3,24,35,52](../../../src/services/storageService.ts).

```ts
// letterService.ts — top of syncRemoteLetters()
if (!__DEV__) {
  const userId = await getOrCreateAdminUserId();
  const letters = (await storageService.load<RemoteLetter[]>(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS)) ?? [];
  const deliveredIds = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];
  return { userId, letters, deliveredIds };
}
```

```ts
// adminOpsService.ts — top of syncAdminOperations()
if (!__DEV__) return;
```

Both services already have a try/catch that returns a "local-only" shape when the
network is unavailable. The `!__DEV__` early return is the same shape, just
unconditional and ahead of the fetch.

## Why not runtime config

- No new state to manage; no settings UI; no risk of being toggled by accident.
- `__DEV__` is replaced at bundle time — the entire production code path containing
  `fetch()` becomes dead code that minifiers can drop.
- Zero new types, zero new tests beyond the two no-op assertions.

## Out of scope (deliberate)

- Removing or relocating the admin service files entirely.
- Building a `patch-package` setup for the Windows node_modules patches.
- Any product-facing behavior change.
- Stage 5 / Trinket→Discovery unification / new categories / new room mechanics.

## Tests

One new assertion per service:

- `letterService.test.ts` — when `__DEV__ === false`, `syncRemoteLetters` does not
  call `fetch` and returns local-state `{ userId, letters, deliveredIds }` from
  storage.
- `adminOpsService.test.ts` (new file) — when `__DEV__ === false`,
  `syncAdminOperations` does not call `fetch` and does not write
  `ADMIN_APPLIED_OP_IDS`.

Existing `syncRemoteLetters` happy-path tests get `(global as any).__DEV__ = true`
in `beforeEach` so they continue to exercise the network code path.

## Risk

Tiny. The change is two early returns. The only failure mode is misuse of
`__DEV__` at the top level (e.g. typo) — caught by `tsc` and the new tests.
