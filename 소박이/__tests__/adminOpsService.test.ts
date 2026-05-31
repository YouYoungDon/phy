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
