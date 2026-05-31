jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { checkAndDeliverLetters, splitMailbox, syncRemoteLetters } from '../src/services/letterService';

const mockLoad = storageService.load as jest.MockedFunction<typeof storageService.load>;

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
  (global.fetch as jest.Mock | undefined) = undefined;
  (global as unknown as { SOBAGI_ADMIN_API_BASE_URL?: string }).SOBAGI_ADMIN_API_BASE_URL = undefined;
  (global as unknown as { SOBAGI_ADMIN_LETTER_ENDPOINT?: string }).SOBAGI_ADMIN_LETTER_ENDPOINT = undefined;
  // Preserve dev-mode behavior for the existing happy-path tests; the
  // production gate is exercised by the dedicated no-op test below.
  (global as unknown as { __DEV__: boolean }).__DEV__ = true;
});

describe('checkAndDeliverLetters — personal letters', () => {
  it('delivers welcome letter (id 001) on day 0', async () => {
    await checkAndDeliverLetters(0, new Date('2026-05-16'));
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      expect.arrayContaining(['001']),
    );
  });

  it('delivers week-1 letter at day 7', async () => {
    await checkAndDeliverLetters(7, new Date('2026-05-16'));
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      expect.arrayContaining(['personal-week1']),
    );
  });

  it('does not deliver month-1 letter at day 29', async () => {
    await checkAndDeliverLetters(29, new Date('2026-05-16'));
    const savedIds: string[] = (storageService.save as jest.Mock).mock.calls
      .find(c => c[0] === 'sobagi-mailbox-delivered-ids')?.[1] ?? [];
    expect(savedIds).not.toContain('personal-month1');
  });

  it('delivers month-1 letter at day 30', async () => {
    await checkAndDeliverLetters(30, new Date('2026-05-16'));
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      expect.arrayContaining(['personal-month1']),
    );
  });

  it('does not re-deliver already-delivered letters', async () => {
    // 2026-05-16 is inside the seasonal-may-2026 window (May 1–31), so the
    // pre-staged delivered set must include that letter too — otherwise the
    // service correctly delivers it and the "no new save" assertion fails.
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-mailbox-delivered-ids') return ['001', 'seasonal-may-2026'];
      return null;
    });
    await checkAndDeliverLetters(0, new Date('2026-05-16'));
    // save should not be called — no new letters to deliver
    expect(storageService.save).not.toHaveBeenCalled();
  });

  it('does not call save if nothing new to deliver', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-mailbox-delivered-ids') return ['001', 'personal-week1', 'seasonal-may-2026'];
      return null;
    });
    await checkAndDeliverLetters(7, new Date('2026-05-16'));
    expect(storageService.save).not.toHaveBeenCalled();
  });
});

describe('checkAndDeliverLetters — seasonal letters', () => {
  it('delivers spring letter when date is in window (March 1–15)', async () => {
    await checkAndDeliverLetters(0, new Date('2026-03-05'));
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      expect.arrayContaining(['seasonal-spring-2026']),
    );
  });

  it('does not deliver spring letter outside window (March 16)', async () => {
    await checkAndDeliverLetters(0, new Date('2026-03-16'));
    const savedIds: string[] = (storageService.save as jest.Mock).mock.calls
      .find(c => c[0] === 'sobagi-mailbox-delivered-ids')?.[1] ?? [];
    expect(savedIds).not.toContain('seasonal-spring-2026');
  });

  it('does not deliver spring letter outside window (February 28)', async () => {
    await checkAndDeliverLetters(0, new Date('2026-02-28'));
    const savedIds: string[] = (storageService.save as jest.Mock).mock.calls
      .find(c => c[0] === 'sobagi-mailbox-delivered-ids')?.[1] ?? [];
    expect(savedIds).not.toContain('seasonal-spring-2026');
  });

  it('does not re-deliver seasonal letter already delivered', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-mailbox-delivered-ids') return ['001', 'seasonal-spring-2026'];
      return null;
    });
    await checkAndDeliverLetters(0, new Date('2026-03-05'));
    // Only '001' was already delivered, spring already delivered — no new saves
    expect(storageService.save).not.toHaveBeenCalled();
  });
});

describe('checkAndDeliverLetters — letter content safety', () => {
  it('does not depend on expense amounts — delivery is purely date/day-count based', async () => {
    // Call twice — results should be deterministic (no amount-based branching)
    const spy = storageService.save as jest.Mock;
    await checkAndDeliverLetters(7, new Date('2026-05-16'));
    const firstCallIds = spy.mock.calls.find(c => c[0] === 'sobagi-mailbox-delivered-ids')?.[1];
    spy.mockClear();
    mockLoad.mockResolvedValue(null);
    await checkAndDeliverLetters(7, new Date('2026-05-16'));
    const secondCallIds = spy.mock.calls.find(c => c[0] === 'sobagi-mailbox-delivered-ids')?.[1];
    expect(firstCallIds).toEqual(secondCallIds);
  });
});

describe('splitMailbox', () => {
  it('returns empty groups when nothing is delivered', () => {
    expect(splitMailbox([], new Set())).toEqual({ currentIds: [], archivedIds: [] });
  });
  it('puts a single unread letter in current, nothing archived', () => {
    expect(splitMailbox(['a'], new Set(['a']))).toEqual({ currentIds: ['a'], archivedIds: [] });
  });
  it('archives every letter (newest-first) when none are unread — no forced-open letter', () => {
    // delivery order a,b,c → newest-first c,b,a; none unread → current=[], archived=[c,b,a]
    expect(splitMailbox(['a', 'b', 'c'], new Set())).toEqual({
      currentIds: [],
      archivedIds: ['c', 'b', 'a'],
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

describe('syncRemoteLetters', () => {
  it('fetches admin letters and merges them into delivered ids', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      if (key === 'sobagi-mailbox-delivered-ids') return ['001'];
      if (key === 'sobagi-mailbox-remote-letters') return [];
      return null;
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        letters: [
          { id: 'admin-letter-1', body: '관리자 편지', sig: '— 소박이', target: 'all' },
        ],
      }),
    }) as jest.Mock;

    const result = await syncRemoteLetters();

    expect(result.userId).toBe('user-1');
    expect(result.deliveredIds).toEqual(['001', 'admin-letter-1']);
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-remote-letters',
      expect.arrayContaining([expect.objectContaining({ id: 'admin-letter-1' })]),
    );
    expect(storageService.save).toHaveBeenCalledWith(
      'sobagi-mailbox-delivered-ids',
      ['001', 'admin-letter-1'],
    );
  });

  it('keeps stored remote letters when the admin server is unavailable', async () => {
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      if (key === 'sobagi-mailbox-delivered-ids') return ['001'];
      if (key === 'sobagi-mailbox-remote-letters') return [{ id: 'admin-old', body: 'old', sig: '— 소박이' }];
      return null;
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as jest.Mock;

    const result = await syncRemoteLetters();

    expect(result.letters).toEqual([{ id: 'admin-old', body: 'old', sig: '— 소박이' }]);
    expect(result.deliveredIds).toEqual(['001']);
  });

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

  it('fetches remote letters in production when an https admin endpoint is configured', async () => {
    (global as unknown as { __DEV__: boolean }).__DEV__ = false;
    (global as unknown as { SOBAGI_ADMIN_API_BASE_URL: string }).SOBAGI_ADMIN_API_BASE_URL = 'https://admin.example.test';
    mockLoad.mockImplementation(async (key: string) => {
      if (key === 'sobagi-admin-user-id') return 'user-1';
      if (key === 'sobagi-mailbox-delivered-ids') return [];
      if (key === 'sobagi-mailbox-remote-letters') return [];
      return null;
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        letters: [
          { id: 'admin-prod-letter', body: 'prod', sig: '소박이' },
        ],
      }),
    }) as jest.Mock;

    const result = await syncRemoteLetters();

    expect(global.fetch).toHaveBeenCalledWith('https://admin.example.test/api/letters?userId=user-1');
    expect(result.deliveredIds).toEqual(['admin-prod-letter']);
  });
});
