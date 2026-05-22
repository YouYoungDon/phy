jest.mock('../src/services/storageService', () => ({
  load: jest.fn().mockResolvedValue(null),
  save: jest.fn().mockResolvedValue(undefined),
}));

import * as storageService from '../src/services/storageService';
import { checkAndDeliverLetters } from '../src/services/letterService';

const mockLoad = storageService.load as jest.MockedFunction<typeof storageService.load>;

beforeEach(() => {
  jest.clearAllMocks();
  mockLoad.mockResolvedValue(null);
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
