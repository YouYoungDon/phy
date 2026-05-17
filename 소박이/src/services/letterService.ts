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
