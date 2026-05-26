import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS } from '../constants/letters';

// Checks personal and seasonal delivery conditions and persists newly-eligible letter IDs.
// Takes today as a parameter so it is testable without mocking Date.
export async function checkAndDeliverLetters(
  recordedDaysCount: number,
  today: Date = new Date(),
): Promise<void> {
  const month = today.getMonth() + 1; // 1–12
  const dayOfMonth = today.getDate();

  const deliveredIds =
    (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];
  const deliveredSet = new Set(deliveredIds);
  let changed = false;

  for (const letter of PERSONAL_LETTERS) {
    if (!deliveredSet.has(letter.id) && recordedDaysCount >= letter.triggerDays) {
      deliveredSet.add(letter.id);
      changed = true;
    }
  }

  for (const letter of ALL_SEASONAL_LETTERS) {
    if (
      !deliveredSet.has(letter.id) &&
      month === letter.month &&
      dayOfMonth >= letter.day &&
      dayOfMonth <= letter.endDay
    ) {
      deliveredSet.add(letter.id);
      changed = true;
    }
  }

  if (changed) {
    await storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, [...deliveredSet]);
  }
}

// Splits delivered letters into the ones to show open ("current") and the ones to
// tuck into the 지난 편지 drawer ("archived"). A letter is current only while it is
// still unread at this open (the caller passes the unread-at-open set); once seen it
// folds away on its own. When nothing is unread, current is empty and every letter is
// archived (folded) — read letters always fold, never stay forced-open. Both arrays are
// newest-first. Pure — read state lives in MAILBOX_READ_IDS; this adds no storage and
// never touches the delivered set.
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
