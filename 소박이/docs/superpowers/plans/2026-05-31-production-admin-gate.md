# Production Admin Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `syncRemoteLetters` and `syncAdminOperations` complete no-ops in production builds, while preserving full dev-mode behavior for local admin tooling.

**Architecture:** Two early `if (!__DEV__)` guards. `__DEV__` is a React Native build-time global, `false` in `ait build` bundles. Established pattern (already used in storageService).

**Tech Stack:** TypeScript 5.8, Jest 29, React Native global `__DEV__`.

---

## File Structure

- **Modify** [src/services/letterService.ts](../../../src/services/letterService.ts) — add `declare const __DEV__: boolean;` and an early-return guard at the top of `syncRemoteLetters()`.
- **Modify** [src/services/adminOpsService.ts](../../../src/services/adminOpsService.ts) — add `declare const __DEV__: boolean;` and `if (!__DEV__) return;` at the top of `syncAdminOperations()`.
- **Modify** [__tests__/letterService.test.ts](../../../__tests__/letterService.test.ts) — set `(global as any).__DEV__ = true` in `beforeEach` to preserve happy-path coverage; add one no-op assertion.
- **Create** [__tests__/adminOpsService.test.ts](../../../__tests__/adminOpsService.test.ts) — one no-op assertion.

---

## Task 1: Gate syncRemoteLetters on !__DEV__

**Files:**
- Modify: `소박이/__tests__/letterService.test.ts:11-15` (beforeEach + new test)
- Modify: `소박이/src/services/letterService.ts` (add `declare const __DEV__` + early-return)

- [ ] **Step 1: Update beforeEach to set __DEV__=true (preserves existing fetch-path tests)**

In `__tests__/letterService.test.ts`, change the `beforeEach` block:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  (global.fetch as jest.Mock | undefined) = undefined;
  (global as unknown as { __DEV__: boolean }).__DEV__ = true;
});
```

- [ ] **Step 2: Write the failing test (no-op in production)**

Append inside `describe('syncRemoteLetters', () => { ... })`:

```ts
  it('is a no-op in production builds (no fetch, returns local state)', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      if (key === 'sobagi-mailbox-delivered-ids') return ['001'];
      if (key === 'sobagi-mailbox-remote-letters') return [{ id: 'local-1', body: 'b', sig: '— 소박이' }];
      return null;
    });
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const result = await syncRemoteLetters();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.userId).toBe('user-1');
    expect(result.deliveredIds).toEqual(['001']);
    expect(result.letters).toEqual([{ id: 'local-1', body: 'b', sig: '— 소박이' }]);
    expect(storageService.save).not.toHaveBeenCalled();
  });
```

- [ ] **Step 3: Run tests, verify the new one fails**

Run: `npx jest --testPathPattern=letterService -t "is a no-op in production"`
Expected: FAIL — `fetchSpy` was called (gate doesn't exist yet).

- [ ] **Step 4: Add the gate to syncRemoteLetters**

In `src/services/letterService.ts`:

1. Add at the top of the file (after imports):
   ```ts
   declare const __DEV__: boolean;
   ```
2. Inside `syncRemoteLetters()`, immediately after the existing first three `await` calls that read userId / storedLetters / deliveredIds, add the early return:

   Before:
   ```ts
   export async function syncRemoteLetters(): Promise<{
     userId: string;
     letters: RemoteLetter[];
     deliveredIds: string[];
   }> {
     const userId = await getOrCreateAdminUserId();
     const storedLetters = (await storageService.load<RemoteLetter[]>(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS)) ?? [];
     const deliveredIds = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];

     try {
   ```

   After (add the `if (!__DEV__)` block between `deliveredIds` and `try {`):
   ```ts
     const userId = await getOrCreateAdminUserId();
     const storedLetters = (await storageService.load<RemoteLetter[]>(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS)) ?? [];
     const deliveredIds = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];

     // Production safety gate: never reach out to the admin host from shipped
     // builds. The dev override global SOBAGI_ADMIN_LETTER_ENDPOINT is dev-only
     // tooling; in ait build (__DEV__ === false) we always return local state.
     if (!__DEV__) {
       return { userId, letters: storedLetters, deliveredIds };
     }

     try {
   ```

- [ ] **Step 5: Run all letterService tests, verify all pass**

Run: `npx jest --testPathPattern=letterService`
Expected: all tests pass, including the new no-op test and all existing fetch-path tests (preserved by the `__DEV__=true` in `beforeEach`).

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/letterService.ts 소박이/__tests__/letterService.test.ts
git commit -m "fix(release): gate syncRemoteLetters behind __DEV__

Production builds (ait build sets __DEV__=false) now skip the
admin-letter fetch entirely and return local state only. Removes
the only outbound HTTP call from shipped bundles, neutralizing
the dev SOBAGI_ADMIN_LETTER_ENDPOINT override on user devices.

Existing dev-mode tests are preserved by setting __DEV__=true in
beforeEach; new test asserts the no-op shape in production.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Gate syncAdminOperations on !__DEV__

**Files:**
- Create: `소박이/__tests__/adminOpsService.test.ts`
- Modify: `소박이/src/services/adminOpsService.ts`

- [ ] **Step 1: Write the failing test (no-op in production)**

Create `__tests__/adminOpsService.test.ts`:

```ts
jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { syncAdminOperations } from '../src/services/adminOpsService';

const mockLoad = storageService.load as jest.MockedFunction<typeof storageService.load>;

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  (global.fetch as jest.Mock | undefined) = undefined;
});

describe('syncAdminOperations', () => {
  it('is a no-op in production builds (no fetch, no writes)', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      return null;
    });
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await syncAdminOperations();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('fetches and applies operations in dev builds', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = true;
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      if (key === 'sobagi-admin-applied-op-ids') return [];
      if (key === 'sobagi-mailbox-delivered-ids') return [];
      return null;
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        operations: [
          { id: 'op-1', type: 'deliver_letter', payload: { letterId: 'l-1' } },
        ],
      }),
    }) as jest.Mock;

    await syncAdminOperations();

    expect(global.fetch).toHaveBeenCalled();
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      ['l-1'],
    );
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-admin-applied-op-ids',
      ['op-1'],
    );
  });
});
```

- [ ] **Step 2: Run new tests, verify the production no-op fails**

Run: `npx jest --testPathPattern=adminOpsService`
Expected: the "no-op in production" test FAILS (fetchSpy was called); the "fetches and applies" test passes.

- [ ] **Step 3: Add the gate to syncAdminOperations**

In `src/services/adminOpsService.ts`:

1. Add at the top of the file (after imports):
   ```ts
   declare const __DEV__: boolean;
   ```
2. At the very top of `syncAdminOperations()`, before any `await`:

   Before:
   ```ts
   export async function syncAdminOperations(): Promise<void> {
     const userId = await getOrCreateAdminUserId();
     const applied = new Set((await storageService.load<string[]>(STORAGE_KEYS.ADMIN_APPLIED_OP_IDS)) ?? []);
   ```

   After:
   ```ts
   export async function syncAdminOperations(): Promise<void> {
     // Production safety gate: admin ops can mutate mailbox / discovery / user
     // state remotely. Shipped builds (ait build sets __DEV__=false) must never
     // touch the admin endpoint.
     if (!__DEV__) return;

     const userId = await getOrCreateAdminUserId();
     const applied = new Set((await storageService.load<string[]>(STORAGE_KEYS.ADMIN_APPLIED_OP_IDS)) ?? []);
   ```

- [ ] **Step 4: Run tests, verify both pass**

Run: `npx jest --testPathPattern=adminOpsService`
Expected: both tests pass.

- [ ] **Step 5: Run full suite to confirm no regressions**

Run: `npx jest`
Expected: 30 suites (was 29 + new adminOpsService), all green.

- [ ] **Step 6: Commit**

```bash
git add 소박이/src/services/adminOpsService.ts 소박이/__tests__/adminOpsService.test.ts
git commit -m "fix(release): gate syncAdminOperations behind __DEV__

Production builds must never let an admin endpoint mutate user
state. syncAdminOperations can apply set_user_state /
reset_mailbox / reset_discovery / etc. — making it a complete
no-op when __DEV__=false closes the remote-mutation path on
shipped bundles.

Adds adminOpsService.test.ts covering both modes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Re-apply Windows node_modules patches

**Files (not committed — node_modules is gitignored):**
- `node_modules/@granite-js/plugin-micro-frontend/dist/index.js`
- `node_modules/@granite-js/plugin-micro-frontend/dist/index.cjs`
- `node_modules/@apps-in-toss/plugin-compat/dist/index.js`
- `node_modules/@apps-in-toss/plugin-compat/dist/index.cjs`

- [ ] **Step 1: Patch the micro-frontend files**

Both files need every `path.resolve(modulePath)` call to be wrapped as
`path.resolve(modulePath).replace(/\\/g, '/')` so the resolved Windows backslash
paths become forward-slash before being embedded into generated JS string
literals (otherwise esbuild rejects them as bad character escape sequences).

Use the inline Node script in Task 3 Step 3 to apply mechanically.

- [ ] **Step 2: Patch the plugin-compat files**

Both files need:
- `reactUsePolyfillPath` → `reactUsePolyfillPath.replace(/\\/g, '/')`
- `reactEffectEventPolyfillPath` → `reactEffectEventPolyfillPath.replace(/\\/g, '/')`

at the embed sites where these are inserted into output strings.

- [ ] **Step 3: Verify all 4 markers present**

```bash
node -e "
const fs=require('fs');
const checks=[
  {f:'node_modules/@granite-js/plugin-micro-frontend/dist/index.js', re:/path\.resolve\([^)]*\)\.replace\(\/\\\\\\\\\/g/},
  {f:'node_modules/@granite-js/plugin-micro-frontend/dist/index.cjs', re:/path\.resolve\([^)]*\)\.replace\(\/\\\\\\\\\/g/},
  {f:'node_modules/@apps-in-toss/plugin-compat/dist/index.js', re:/reactUsePolyfillPath\.replace\(\/\\\\\\\\\/g/},
  {f:'node_modules/@apps-in-toss/plugin-compat/dist/index.cjs', re:/reactUsePolyfillPath\.replace\(\/\\\\\\\\\/g/},
];
for(const c of checks){
  const txt=fs.readFileSync(c.f,'utf8');
  console.log((c.re.test(txt)?'✅':'❌') + ' ' + c.f);
}
"
```

Expected: 4 × ✅

---

## Task 4: Final verification

- [ ] **Step 1: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no output (clean).

- [ ] **Step 2: Full Jest suite**

```bash
npx jest
```
Expected: 30 suites, all green.

- [ ] **Step 3: Anti-drift grep**

```powershell
Select-String -Path 소박이\src\**\*.ts,소박이\src\**\*.tsx -Pattern 'dashboard|KPI|portfolio|순수익|차액|자산관리|투자관리' -CaseSensitive:$false
```
Expected: only the deliberate `차액` guard comment in `stats.tsx:289`.

---

## Task 5: Build

- [ ] **Step 1: Run ait build**

```bash
cd 소박이 && npm run build
```
Expected: produces `소박이/pockeksobak.ait` with no errors.

- [ ] **Step 2: Report artifact**

Inspect:
```bash
ls -la 소박이/*.ait
```

---

## Task 6: Tag release

- [ ] **Step 1: Tag**

```bash
git tag release-v1
git push origin release-v1
```

(Or `release-v1-rc1` if user prefers an explicit pre-submission marker — confirm naming before pushing.)
