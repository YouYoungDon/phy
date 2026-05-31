import * as storageService from './storageService';
import { STORAGE_KEYS } from '../constants/storage';
import { PERSONAL_LETTERS, ALL_SEASONAL_LETTERS, RemoteLetter } from '../constants/letters';

declare const __DEV__: boolean;

const DEV_ADMIN_API_BASE_URL = 'http://127.0.0.1:4173';
// Fill this with the deployed HTTPS admin API base URL before enabling
// production operator letters/commands.
const PROD_ADMIN_API_BASE_URL = '';

declare global {
  // Optional dev override for a LAN/ngrok/admin-host URL. Kept off product UI.
  // eslint-disable-next-line no-var
  var SOBAGI_ADMIN_LETTER_ENDPOINT: string | undefined;
  // eslint-disable-next-line no-var
  var SOBAGI_ADMIN_API_BASE_URL: string | undefined;
}

function configuredAdminApiBaseUrl(): string | null {
  const legacyEndpoint = globalThis.SOBAGI_ADMIN_LETTER_ENDPOINT?.replace(/\/api\/letters$/, '');
  const configured =
    globalThis.SOBAGI_ADMIN_API_BASE_URL ||
    legacyEndpoint ||
    (__DEV__ ? DEV_ADMIN_API_BASE_URL : PROD_ADMIN_API_BASE_URL);
  const base = configured.trim().replace(/\/$/, '');

  if (!base) return null;
  if (!__DEV__ && !base.startsWith('https://')) return null;
  return base;
}

export function adminApiUrl(path: string): string | null {
  const root = configuredAdminApiBaseUrl();
  if (!root) return null;
  return `${root}${path}`;
}

function createAdminUserId(): string {
  return `sobagi-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validRemoteLetter(value: unknown): value is RemoteLetter {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.body === 'string';
}

export async function getOrCreateAdminUserId(): Promise<string> {
  const existing = await storageService.load<string>(STORAGE_KEYS.ADMIN_USER_ID);
  if (existing) return existing;
  const userId = createAdminUserId();
  await storageService.save(STORAGE_KEYS.ADMIN_USER_ID, userId);
  return userId;
}

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

export async function syncRemoteLetters(): Promise<{
  userId: string;
  letters: RemoteLetter[];
  deliveredIds: string[];
}> {
  const userId = await getOrCreateAdminUserId();
  const storedLetters = (await storageService.load<RemoteLetter[]>(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS)) ?? [];
  const deliveredIds = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];

  const url = adminApiUrl('/api/letters');
  if (!url) {
    return { userId, letters: storedLetters, deliveredIds };
  }

  try {
    const response = await fetch(`${url}?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) {
      return { userId, letters: storedLetters, deliveredIds };
    }

    const payload = await response.json() as { letters?: unknown[] };
    const fetchedLetters = Array.isArray(payload.letters)
      ? payload.letters.filter(validRemoteLetter).map((letter) => ({
          id: letter.id,
          body: letter.body,
          sig: letter.sig || '— 소박이',
          createdAt: letter.createdAt,
          target: letter.target,
        }))
      : [];

    const remoteIds = fetchedLetters.map((letter) => letter.id);
    const nextDeliveredIds = [...new Set([...deliveredIds, ...remoteIds])];

    await storageService.save(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS, fetchedLetters);
    if (nextDeliveredIds.length !== deliveredIds.length) {
      await storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, nextDeliveredIds);
    }

    return { userId, letters: fetchedLetters, deliveredIds: nextDeliveredIds };
  } catch {
    return { userId, letters: storedLetters, deliveredIds };
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
