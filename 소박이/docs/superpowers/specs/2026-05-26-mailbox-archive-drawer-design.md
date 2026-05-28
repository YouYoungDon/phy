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

> **Correction (2026-05-26, post-dogfood):** the original design kept the single most-recent
> letter forced-open when nothing was new ("never empty / letter on the table"). In use this
> felt wrong — a read letter stuck open and couldn't fold. Per user feedback ("읽은건 접게
> 해줘"), **read letters always fold; there is no forced-open fallback**, and current letters
> are now **tappable to fold** too. The sections below reflect the corrected behavior.

Two zones, both derived at render time:

- **현재 (top):** every letter unread at this open, newest-first, shown **expanded** but
  **tap-to-fold**. Read letters never sit here — once seen, a letter folds away.
- **지난 편지 (read letters, folded):** with new mail above, read letters hide behind a quiet
  collapsible "지난 편지" drawer (folded by default; tap the header to look back, tap a preview
  to open it inline). With **nothing new**, read letters ARE the content: shown directly as
  folded previews under a plain "지난 편지" label (no drawer toggle), still tap-to-expand.

### Empty / boundary states
- **0 delivered:** existing empty state ("아직 도착한 편지가 없어요 🌿"); no archive.
- **1 unread:** it is the current letter (open, foldable); nothing archived.
- **1 read (nothing new):** current empty; the read letter shows as a folded preview under the 지난 편지 label.
- **All read, multiple:** current empty; every letter shown as a folded preview (지난 편지 label, no toggle).
- **New letters this open:** current = all unread-at-open (open, foldable); read ones behind the 지난 편지 drawer.

## The split is a pure, testable helper

In `src/services/letterService.ts`:

```ts
export function splitMailbox(
  deliveredIds: string[],
  unreadAtOpen: Set<string>,
): { currentIds: string[]; archivedIds: string[] } {
  const newestFirst = [...deliveredIds].reverse();
  const currentIds = newestFirst.filter((id) => unreadAtOpen.has(id));
  const currentSet = new Set(currentIds);
  const archivedIds = newestFirst.filter((id) => !currentSet.has(id));
  return { currentIds, archivedIds };
}
```

Both arrays are newest-first (matching the current render's `[...deliveredLetterIds].reverse()`).

## UI details

- **One `renderLetter` for both zones:** a new letter is open by default, a read letter folded
  by default; both are `Pressable` and tapping toggles fold/expand. Fold state derives from a
  single `toggledLetterIds` set — "ids the user toggled away from their default":
  `isExpanded = isNew ? !toggledLetterIds.has(id) : toggledLetterIds.has(id)`. New letters keep
  the warm `letterCardNew` background; folded = the existing `letterFolded` preview line.
- **지난 편지 label:** when there IS new mail, a muted tappable drawer header — "지난 편지" +
  chevron (▸ folded / ▾ open), default folded. When there is **no** new mail, the same label
  renders as a plain non-tappable `View` and the folded previews show directly beneath it. One
  new style group (`letterArchiveHeader` / `letterArchiveTitle` / `letterArchiveChevron`). No
  background pill, no count.
- **State:** `toggledLetterIds` (replaces the old `expandedReadIds`; `toggleLetter` replaces
  `toggleLetterExpand`) and `archiveOpen: boolean` (default false). Both **reset on sheet
  close** in `closeSheet`. Effective archive visibility = `archiveOpen || currentIds.length === 0`.

## Philosophy check

- Letters are never deleted (keepsake-respecting).
- Archiving is automatic, zero management chrome (implicit-signals ethos).
- Surface is the new letter(s) open + read ones quietly folded — not a flat list.
- No counts, badges, notification dots, or reward energy on the drawer.

## Files touched

- `src/services/letterService.ts` — add pure `splitMailbox`.
- `src/pages/index.tsx` — restructure the mailbox render into 현재 + 지난 편지 drawer; add
  `archiveOpen` state and reset it in `closeSheet`.

## Testing

`__tests__/letterService.test.ts` — `splitMailbox`:
- 0 delivered → `{ currentIds: [], archivedIds: [] }`.
- 1 delivered, unread → current = [it], archived = [].
- All read (unreadAtOpen empty), multiple → current = [] (no forced-open fallback), archived = every id, newest-first.
- New letters this open → current = the unread set (newest-first), archived = the read ones.

## Explicitly NOT doing

- No deletion / dismiss.
- No new storage key or migration.
- No count/badge on the drawer.
- No "보관" button or per-letter management affordance.
- No change to delivery logic (`checkAndDeliverLetters` untouched).
