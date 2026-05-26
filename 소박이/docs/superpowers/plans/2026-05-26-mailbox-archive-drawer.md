# 편지함 "Letter on the Table" + 지난 편지 Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the mailbox so the current letter sits open on top and past letters fold into a quiet "지난 편지" drawer, replacing the flat list feel.

**Architecture:** A pure `splitMailbox(deliveredIds, unreadAtOpen)` helper divides letters into "current" (unread this open, or the most-recent fallback) and "archived" (the rest). The mailbox render shows current letters expanded and archived letters inside a collapsible drawer. Archiving is derived entirely from existing read-state — no new storage, no migration, delivered-set untouched.

**Tech Stack:** React Native 0.84 / React 19 / TypeScript 5.8 (`noUnusedLocals` ON — unused imports are build errors), Jest 29.

**Verification rhythm:** From `소박이/`, single test `npx jest <name>`; full gate `npx tsc --noEmit` (exit 0) + `npx jest` (whole suite green). All commands run from `소박이/`.

**Spec:** `docs/superpowers/specs/2026-05-26-mailbox-archive-drawer-design.md`

---

## File Structure

- `src/services/letterService.ts` — add pure `splitMailbox`. Already the home of letter logic (`checkAndDeliverLetters`).
- `src/pages/index.tsx` — restructure the `activeSheet === 'mailbox'` render into 현재 + 지난 편지 drawer; add `archiveOpen` state; reset it in `closeSheet`.
- `__tests__/letterService.test.ts` — tests for `splitMailbox`.

---

## Task 1: `splitMailbox` pure helper

**Files:**
- Modify: `src/services/letterService.ts` (append exported function at end of file)
- Test: `__tests__/letterService.test.ts`

- [ ] **Step 1: Write the failing tests**

Add `splitMailbox` to the existing import at the top of `__tests__/letterService.test.ts`:

```ts
import { checkAndDeliverLetters, splitMailbox } from '../src/services/letterService';
```

Append this `describe` block to the end of the file:

```ts
describe('splitMailbox', () => {
  it('returns empty groups when nothing is delivered', () => {
    expect(splitMailbox([], new Set())).toEqual({ currentIds: [], archivedIds: [] });
  });
  it('puts a single unread letter in current, nothing archived', () => {
    expect(splitMailbox(['a'], new Set(['a']))).toEqual({ currentIds: ['a'], archivedIds: [] });
  });
  it('falls back to the most recent letter as current when none are unread', () => {
    // delivery order a,b,c → newest-first c,b,a; none unread → current=[c], archived=[b,a]
    expect(splitMailbox(['a', 'b', 'c'], new Set())).toEqual({
      currentIds: ['c'],
      archivedIds: ['b', 'a'],
    });
  });
  it('keeps all unread letters in current (newest-first), read ones archived', () => {
    // a,b read; c,d unread. newest-first d,c,b,a → current=[d,c], archived=[b,a]
    expect(splitMailbox(['a', 'b', 'c', 'd'], new Set(['c', 'd']))).toEqual({
      currentIds: ['d', 'c'],
      archivedIds: ['b', 'a'],
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest letterService`
Expected: FAIL — `splitMailbox is not a function` (or a TS/import error).

- [ ] **Step 3: Implement the helper**

Append to the end of `src/services/letterService.ts`:

```ts
// Splits delivered letters into the ones to show open ("current") and the ones to
// tuck into the 지난 편지 drawer ("archived"). A letter is current only while it is
// still unread at this open (the caller passes the unread-at-open set); once seen it
// archives on its own. If nothing is unread, the most recent letter stays on the table
// so the mailbox is never empty. Both arrays are newest-first. Pure — read state lives
// in MAILBOX_READ_IDS; this adds no storage and never touches the delivered set.
export function splitMailbox(
  deliveredIds: string[],
  unreadAtOpen: Set<string>,
): { currentIds: string[]; archivedIds: string[] } {
  const newestFirst = [...deliveredIds].reverse();
  let currentIds = newestFirst.filter((id) => unreadAtOpen.has(id));
  if (currentIds.length === 0 && newestFirst.length > 0) {
    currentIds = [newestFirst[0]!];
  }
  const currentSet = new Set(currentIds);
  const archivedIds = newestFirst.filter((id) => !currentSet.has(id));
  return { currentIds, archivedIds };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest letterService`
Expected: PASS (all `letterService` tests green, including the new `splitMailbox` block).

- [ ] **Step 5: Commit**

```bash
git add src/services/letterService.ts __tests__/letterService.test.ts
git commit -m "feat(mailbox): add splitMailbox helper (current vs 지난 편지)"
```

---

## Task 2: Mailbox render restructure

**Files:**
- Modify: `src/pages/index.tsx` — import (~line 29 area), state (~line 102), `closeSheet` (~line 180-187), mailbox render (~line 427-468), styles (after `letterFoldedSig` ~line 925).

This task is React-Native UI wiring with no pure unit to test; it is verified by
`npx tsc --noEmit` + the full Jest suite staying green (Task 3).

- [ ] **Step 1: Import `splitMailbox`**

`letterService` is not yet imported in `index.tsx`. Add this import next to the other
service imports (immediately after the `discoveryService` import line):

```ts
import { keepsakeLineFor, pickupLineFor, trinketCounts } from '../services/discoveryService';
import { splitMailbox } from '../services/letterService';
```

- [ ] **Step 2: Add the `archiveOpen` state**

Find the `expandedReadIds` state declaration:

```ts
  const [expandedReadIds, setExpandedReadIds] = useState<ReadonlySet<string>>(new Set());
```

Immediately AFTER it, add:

```ts
  // Whether the 지난 편지 drawer is expanded. Render-only; resets when the sheet closes.
  const [archiveOpen, setArchiveOpen] = useState(false);
```

- [ ] **Step 3: Reset `archiveOpen` on sheet close**

The current `closeSheet` reads:

```ts
  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: 400, duration: 210, useNativeDriver: true }).start(() => {
      activeSheetRef.current = null;
      setActiveSheet(null);
      setSelectedKeptId(null);
      setExpandedReadIds(new Set());
    });
  }, [sheetAnim]);
```

Add `setArchiveOpen(false);` after the `setExpandedReadIds(new Set());` line:

```ts
  const closeSheet = useCallback(() => {
    Animated.timing(sheetAnim, { toValue: 400, duration: 210, useNativeDriver: true }).start(() => {
      activeSheetRef.current = null;
      setActiveSheet(null);
      setSelectedKeptId(null);
      setExpandedReadIds(new Set());
      setArchiveOpen(false);
    });
  }, [sheetAnim]);
```

- [ ] **Step 4: Replace the mailbox render block**

The current block reads:

```tsx
        {activeSheet === 'mailbox' && (
          <View>
            <Text style={styles.sheetTitle}>편지함</Text>
            {deliveredLetterIds.length === 0 ? (
              <Text style={styles.mailboxEmpty}>아직 도착한 편지가 없어요 🌿</Text>
            ) : (
              <ScrollView style={styles.letterScroll} showsVerticalScrollIndicator={false}>
                {[...deliveredLetterIds].reverse().map((id, idx) => {
                  const letter = LETTER_LOOKUP.get(id);
                  if (!letter) return null;
                  const isNew = unreadAtOpenRef.current.has(id);
                  const isExpanded = isNew || expandedReadIds.has(id);
                  const firstLine = letter.body.split('\n')[0] ?? letter.body;
                  const preview = firstLine.length > 38 ? firstLine.slice(0, 38) + '…' : firstLine + '…';
                  return (
                    <Pressable
                      key={id}
                      style={[
                        styles.letterCard,
                        idx > 0 && styles.letterCardSpacing,
                        isNew && styles.letterCardNew,
                        !isExpanded && styles.letterCardCollapsed,
                      ]}
                      onPress={() => { if (!isNew) toggleLetterExpand(id); }}
                    >
                      {isExpanded ? (
                        <>
                          <Text style={styles.letterText}>{letter.body}</Text>
                          <Text style={styles.letterSig}>{letter.sig}</Text>
                        </>
                      ) : (
                        <View style={styles.letterFolded}>
                          <Text style={styles.letterFoldedPreview} numberOfLines={1}>{preview}</Text>
                          <Text style={styles.letterFoldedSig}>{letter.sig}</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
```

Replace it entirely with (current letters open on top; 지난 편지 drawer folded below):

```tsx
        {activeSheet === 'mailbox' && (
          <View>
            <Text style={styles.sheetTitle}>편지함</Text>
            {deliveredLetterIds.length === 0 ? (
              <Text style={styles.mailboxEmpty}>아직 도착한 편지가 없어요 🌿</Text>
            ) : (() => {
              const { currentIds, archivedIds } = splitMailbox(
                deliveredLetterIds,
                new Set(unreadAtOpenRef.current),
              );
              return (
                <ScrollView style={styles.letterScroll} showsVerticalScrollIndicator={false}>
                  {/* 현재 — the letter(s) on the table, always open. */}
                  {currentIds.map((id, idx) => {
                    const letter = LETTER_LOOKUP.get(id);
                    if (!letter) return null;
                    const isNew = unreadAtOpenRef.current.has(id);
                    return (
                      <View
                        key={id}
                        style={[
                          styles.letterCard,
                          idx > 0 && styles.letterCardSpacing,
                          isNew && styles.letterCardNew,
                        ]}
                      >
                        <Text style={styles.letterText}>{letter.body}</Text>
                        <Text style={styles.letterSig}>{letter.sig}</Text>
                      </View>
                    );
                  })}

                  {/* 지난 편지 — quietly folded; tap the header to look back. */}
                  {archivedIds.length > 0 && (
                    <>
                      <Pressable
                        style={styles.letterArchiveHeader}
                        onPress={() => setArchiveOpen((v) => !v)}
                      >
                        <Text style={styles.letterArchiveTitle}>지난 편지</Text>
                        <Text style={styles.letterArchiveChevron}>{archiveOpen ? '▾' : '▸'}</Text>
                      </Pressable>
                      {archiveOpen &&
                        archivedIds.map((id) => {
                          const letter = LETTER_LOOKUP.get(id);
                          if (!letter) return null;
                          const isExpanded = expandedReadIds.has(id);
                          const firstLine = letter.body.split('\n')[0] ?? letter.body;
                          const preview =
                            firstLine.length > 38 ? firstLine.slice(0, 38) + '…' : firstLine + '…';
                          return (
                            <Pressable
                              key={id}
                              style={[
                                styles.letterCard,
                                styles.letterCardSpacing,
                                !isExpanded && styles.letterCardCollapsed,
                              ]}
                              onPress={() => toggleLetterExpand(id)}
                            >
                              {isExpanded ? (
                                <>
                                  <Text style={styles.letterText}>{letter.body}</Text>
                                  <Text style={styles.letterSig}>{letter.sig}</Text>
                                </>
                              ) : (
                                <View style={styles.letterFolded}>
                                  <Text style={styles.letterFoldedPreview} numberOfLines={1}>
                                    {preview}
                                  </Text>
                                  <Text style={styles.letterFoldedSig}>{letter.sig}</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                    </>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        )}
```

- [ ] **Step 5: Add the drawer styles**

Find the `letterFoldedSig` style:

```ts
  letterFoldedSig: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
    flexShrink: 0,
  },
```

Immediately AFTER it, add:

```ts
  // 지난 편지 drawer header — a quiet, tappable row. No background pill, no count;
  // muted text + a small chevron, so looking back never reads as an inbox folder.
  letterArchiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  letterArchiveTitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  letterArchiveChevron: {
    fontSize: 12,
    color: COLORS.textLight,
  },
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. In particular, `splitMailbox` is used (no `noUnusedLocals` error), and
no variable left unused by the restructure.

- [ ] **Step 7: Commit**

```bash
git add src/pages/index.tsx
git commit -m "feat(mailbox): letter on the table + folded 지난 편지 drawer"
```

---

## Task 3: Full-suite verification + anti-drift grep

**Files:** none (verification only)

- [ ] **Step 1: Typecheck the whole project**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 2: Run the whole test suite**

Run: `npx jest`
Expected: all suites pass — the prior count plus the 4 new `splitMailbox` tests; no regressions.

- [ ] **Step 3: Anti-drift / wording grep on touched files**

Confirm the rejected wording and re-introduced mechanics did NOT leak in. Run:

```bash
git grep -nE "보관함|통\b|[0-9]+통|삭제|delete|dismiss|배지|badge" -- src/services/letterService.ts src/pages/index.tsx
```

Expected: no matches in the new code. (We deliberately used "지난 편지" not "보관함", no
count like "3통", and no delete/dismiss affordance. Pre-existing unrelated matches outside
the mailbox block, if any, are acceptable — confirm none sit in the new mailbox render.)

- [ ] **Step 4: Manual dogfood note (no code)**

On a run, open the mailbox: the most recent letter shows open on top; if older letters
exist, a muted "지난 편지 ▸" row sits below — tap to reveal folded previews, tap a preview
to open it inline. Close and reopen: a letter you just read is no longer on top (it has
settled into 지난 편지), and the drawer is folded again. With a single letter, no drawer
appears. Observation only — no committed change.

---

## Self-Review

**Spec coverage:**
- "Letter on the table" current zone → Task 2 Step 4 (`currentIds.map`, always expanded). ✓
- Automatic archive from read-state → Task 1 (`splitMailbox` uses `unreadAtOpen`); no storage added. ✓
- 지난 편지 drawer, folded by default, tap to open → Task 2 Step 4 (`archiveOpen` + header) + Step 2 (default false). ✓
- Reuses existing fold/expand (`expandedReadIds`/`toggleLetterExpand`) → Task 2 Step 4 archive branch. ✓
- Never-empty fallback (most recent on top) → Task 1 Step 3 fallback; covered by test 3. ✓
- Boundary: 0 letters → empty state unchanged; 1 letter → no drawer (`archivedIds.length > 0` guard). ✓
- "지난 편지" wording, no count, no delete → Task 2 Step 4 + Task 3 Step 3 grep. ✓
- Reset drawer on close → Task 2 Step 3. ✓
- Delivery logic untouched → no task modifies `checkAndDeliverLetters`. ✓
- Tests: 4 `splitMailbox` edge cases → Task 1 Step 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows full code and exact commands. ✓

**Type consistency:** `splitMailbox(deliveredIds: string[], unreadAtOpen: Set<string>): { currentIds: string[]; archivedIds: string[] }` — defined Task 1 Step 3, imported Task 2 Step 1, called as `splitMailbox(deliveredLetterIds, new Set(unreadAtOpenRef.current))` Task 2 Step 4, destructured to `currentIds`/`archivedIds`. State `archiveOpen`/`setArchiveOpen` defined Task 2 Step 2, used Steps 3–4. Styles `letterArchiveHeader`/`letterArchiveTitle`/`letterArchiveChevron` defined Step 5, used Step 4. Consistent. ✓
