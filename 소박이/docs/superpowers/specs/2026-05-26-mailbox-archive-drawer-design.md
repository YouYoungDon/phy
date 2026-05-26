# 편지함 — "Letter on the Table" + 지난 편지 Drawer — Design

**Date:** 2026-05-26
**Status:** Approved (design); ready for implementation plan.

## Goal

Make the mailbox feel like *one letter quietly placed on the table* rather than an inbox
list: the current letter sits open on top, and past letters fold away into a quiet
"지난 편지" drawer below.

## Problem

The mailbox renders every delivered letter in one flat, newest-first scroll. Read letters
already collapse to a faint preview line, but they all stay in the same list — so it reads
as a utilitarian mail list, not a cozy keepsake space. Letters also can't be cleared.

## Why letters can't simply be deleted

`checkAndDeliverLetters` (`src/services/letterService.ts`) dedupes against
`MAILBOX_DELIVERED_IDS`: a letter is delivered only if its id isn't already in that set.
Personal letters re-trigger whenever `recordedDaysCount >= triggerDays` (permanently true
once reached); seasonals re-trigger within their date window. So removing an id from the
delivered set would let the letter **re-deliver**. This is why there is no delete today.

## Decisions (resolved during brainstorming)

- **Keep, don't delete.** Letters are warm notes from Sobagi — keepsakes, not email. Read
  letters are *archived* (still openable), never thrown away.
- **Automatic, not manual.** A read letter settles into the drawer on its own — no
  "보관" button, no per-letter management. Matches Sobagi's implicit, no-management-UI
  ethos (the room places items silently; explicit placement UI was rejected).
- **Wording:** the drawer is labelled **"지난 편지"** (softer; "보관함" reads too much like a
  system folder).
- **No count** on the drawer header — a number ("3통") would re-introduce the inbox/list
  feeling we are removing.

## The key insight — no new storage

"Auto-archive once a letter has been seen" is exactly the existing read-state. A letter is
**current** only on the open where it was still unread — today's `unreadAtOpenRef` already
captures this, and read state already persists in `MAILBOX_READ_IDS`. So archiving is a
**render-time split of state that already exists**: no new storage key, no migration, no
delete logic, and `MAILBOX_DELIVERED_IDS` stays intact so nothing re-delivers.

## Behavior

Two zones, both derived at render time:

- **현재 (top):** every letter unread at this open, newest-first, shown **expanded**. If none
  are unread this open, the top shows the **single most recent delivered letter** expanded —
  so the mailbox is never empty; there is always one letter on the table.
- **지난 편지 (drawer):** everything else, **collapsed into one quiet header row**
  ("지난 편지" + a chevron). Tapping it reveals the existing folded-preview cards; tapping a
  preview opens that letter inline (today's `toggleLetterExpand` / `expandedReadIds`). Folded
  by default.

### Empty / boundary states
- **0 delivered:** existing empty state ("아직 도착한 편지가 없어요 🌿"); no drawer.
- **1 delivered:** it is the current letter (expanded); archive empty → drawer is not rendered.
- **All read, multiple:** current = [most recent], drawer = the rest (folded).
- **New letters this open:** current = all unread-at-open (expanded), drawer = previously-read.

## The split is a pure, testable helper

In `src/services/letterService.ts`:

```ts
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

Both arrays are newest-first (matching the current render's `[...deliveredLetterIds].reverse()`).

## UI details

- **현재 letters:** rendered expanded (full `letterText` body + `letterSig`), reusing the
  existing `letterCard` / `letterCardNew` styling. New-this-open letters keep the warm
  `letterCardNew` background; the read fallback letter uses the normal `letterCard`.
- **Drawer header:** a muted row — "지난 편지" + chevron (▸ folded / ▾ open). One new style
  (`letterArchiveHeader` + its text/chevron). No background pill, no count.
- **Drawer body (when open):** the archived letters as the existing folded-preview cards
  (`letterFolded`, opacity 0.6), each `Pressable` toggling inline expand via the existing
  `expandedReadIds` / `toggleLetterExpand`.
- **State:** new local `archiveOpen: boolean` (default false), toggled by the header, **reset
  on sheet close** alongside `expandedReadIds` in `closeSheet`.

## Philosophy check

- Letters are never deleted (keepsake-respecting).
- Archiving is automatic, zero management chrome (implicit-signals ethos).
- Surface becomes one open letter + one quiet drawer — not a list.
- No counts, badges, notification dots, or reward energy on the drawer.

## Files touched

- `src/services/letterService.ts` — add pure `splitMailbox`.
- `src/pages/index.tsx` — restructure the mailbox render into 현재 + 지난 편지 drawer; add
  `archiveOpen` state and reset it in `closeSheet`.

## Testing

`__tests__/letterService.test.ts` — `splitMailbox`:
- 0 delivered → `{ currentIds: [], archivedIds: [] }`.
- 1 delivered, unread → current = [it], archived = [].
- All read (unreadAtOpen empty), multiple → current = [most recent], archived = the rest, newest-first.
- New letters this open → current = the unread set (newest-first), archived = the read ones.

## Explicitly NOT doing

- No deletion / dismiss.
- No new storage key or migration.
- No count/badge on the drawer.
- No "보관" button or per-letter management affordance.
- No change to delivery logic (`checkAndDeliverLetters` untouched).
