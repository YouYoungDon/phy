import { STORAGE_KEYS } from '../constants/storage';
import * as storageService from './storageService';
import { useDiscoveryStore } from '../store/discoveryStore';
import { useUserStore, getLevel } from '../store/userStore';
import { UserState } from '../types';
import { getOrCreateAdminUserId, adminApiUrl } from './letterService';

type AdminOperation = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
};

function isOperation(value: unknown): value is AdminOperation {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.type === 'string';
}

function stringPayload(op: AdminOperation, key: string): string | null {
  const value = op.payload?.[key];
  return typeof value === 'string' && value ? value : null;
}

function numberPayload(op: AdminOperation, key: string): number | null {
  const value = op.payload?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

async function applyOperation(op: AdminOperation): Promise<void> {
  if (op.type === 'deliver_letter') {
    const letterId = stringPayload(op, 'letterId');
    if (!letterId) return;
    const delivered = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_DELIVERED_IDS)) ?? [];
    await storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, [...new Set([...delivered, letterId])]);
    return;
  }

  if (op.type === 'mark_letter_read' || op.type === 'mark_letter_unread') {
    const letterId = stringPayload(op, 'letterId');
    if (!letterId) return;
    const read = (await storageService.load<string[]>(STORAGE_KEYS.MAILBOX_READ_IDS)) ?? [];
    const next = op.type === 'mark_letter_read'
      ? [...new Set([...read, letterId])]
      : read.filter((id) => id !== letterId);
    await storageService.save(STORAGE_KEYS.MAILBOX_READ_IDS, next);
    return;
  }

  if (op.type === 'reset_mailbox') {
    await storageService.save(STORAGE_KEYS.MAILBOX_DELIVERED_IDS, []);
    await storageService.save(STORAGE_KEYS.MAILBOX_READ_IDS, []);
    await storageService.save(STORAGE_KEYS.MAILBOX_REMOTE_LETTERS, []);
    return;
  }

  if (op.type === 'enqueue_item') {
    const itemId = stringPayload(op, 'itemId');
    if (!itemId) return;
    const queue = (await storageService.load<string[]>(STORAGE_KEYS.DISCOVERY_QUEUE)) ?? [];
    const next = [...new Set([...queue, itemId])];
    await storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, next);
    useDiscoveryStore.getState().hydrate({ queue: next, kept: useDiscoveryStore.getState().kept });
    return;
  }

  if (op.type === 'keep_item') {
    const itemId = stringPayload(op, 'itemId');
    if (!itemId) return;
    const queue = ((await storageService.load<string[]>(STORAGE_KEYS.DISCOVERY_QUEUE)) ?? []).filter((id) => id !== itemId);
    const kept = [...new Set([...(await storageService.load<string[]>(STORAGE_KEYS.KEPT_ITEM_IDS) ?? []), itemId])];
    await storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, queue);
    await storageService.save(STORAGE_KEYS.KEPT_ITEM_IDS, kept);
    useDiscoveryStore.getState().hydrate({ queue, kept });
    return;
  }

  if (op.type === 'reset_discovery') {
    await storageService.save(STORAGE_KEYS.DISCOVERY_QUEUE, []);
    await storageService.save(STORAGE_KEYS.KEPT_ITEM_IDS, []);
    await storageService.save(STORAGE_KEYS.FOUND_ITEM_IDS, []);
    await storageService.save(STORAGE_KEYS.PENDING_NEW_ITEM_ID, null);
    await storageService.save(STORAGE_KEYS.STAGED_ITEM_ID, null);
    useDiscoveryStore.getState().hydrate({ queue: [], kept: [] });
    return;
  }

  if (op.type === 'set_user_state') {
    const current = (await storageService.load<UserState>(STORAGE_KEYS.USER)) ?? useUserStore.getState();
    const recordedDaysCount = numberPayload(op, 'recordedDaysCount') ?? current.recordedDaysCount ?? 0;
    const roomStageRaw = numberPayload(op, 'roomStage') ?? current.roomStage ?? 1;
    const next: UserState = {
      level: getLevel(recordedDaysCount),
      streak: numberPayload(op, 'streak') ?? current.streak ?? 0,
      totalRecordCount: numberPayload(op, 'totalRecordCount') ?? current.totalRecordCount ?? 0,
      recordedDaysCount,
      roomStage: Math.min(5, Math.max(1, roomStageRaw)) as 1 | 2 | 3 | 4 | 5,
      pebbleCount: current.pebbleCount ?? 0,
      restsToday: current.restsToday ?? 0,
      lastRestDate: current.lastRestDate ?? null,
      lastRestAt: current.lastRestAt ?? null,
    };
    await storageService.save(STORAGE_KEYS.USER, next);
    useUserStore.getState().hydrate(next);
  }
}

export async function syncAdminOperations(): Promise<void> {
  const userId = await getOrCreateAdminUserId();
  const applied = new Set((await storageService.load<string[]>(STORAGE_KEYS.ADMIN_APPLIED_OP_IDS)) ?? []);
  const url = adminApiUrl('/api/ops/pending');
  if (!url) return;

  try {
    const response = await fetch(`${url}?userId=${encodeURIComponent(userId)}`);
    if (!response.ok) return;
    const payload = await response.json() as { operations?: unknown[] };
    const operations = Array.isArray(payload.operations) ? payload.operations.filter(isOperation) : [];

    for (const op of operations) {
      if (applied.has(op.id)) continue;
      await applyOperation(op);
      applied.add(op.id);
    }

    await storageService.save(STORAGE_KEYS.ADMIN_APPLIED_OP_IDS, [...applied].slice(-200));
  } catch {
    // Admin server is optional; app behavior must remain usable offline.
  }
}
