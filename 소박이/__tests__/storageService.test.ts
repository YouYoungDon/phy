import { Storage } from '@apps-in-toss/framework';
import * as storageService from '../src/services/storageService';

jest.mock('@apps-in-toss/framework', () => ({
  Storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const mockStorage = Storage as jest.Mocked<typeof Storage>;

describe('storageService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('save serializes value and calls Storage.setItem', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);
    const ok = await storageService.save('test-key', { foo: 1 });
    expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', '{"foo":1}');
    expect(ok).toBe(true);
  });

  it('load deserializes and returns value', async () => {
    mockStorage.getItem.mockResolvedValue('{"foo":1}');
    const result = await storageService.load<{ foo: number }>('test-key');
    expect(result).toEqual({ foo: 1 });
  });

  it('load returns null when key missing', async () => {
    mockStorage.getItem.mockResolvedValue(null);
    const result = await storageService.load('missing-key');
    expect(result).toBeNull();
  });

  it('save returns false (no throw) when Storage.setItem fails after retries', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
    await expect(storageService.save('key', 'value')).resolves.toBe(false);
    // Retried once: 2 attempts total.
    expect(mockStorage.setItem).toHaveBeenCalledTimes(2);
  });

  it('save returns true on first success without retrying', async () => {
    mockStorage.setItem.mockResolvedValue(undefined);
    const ok = await storageService.save('key', 'value');
    expect(ok).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('save retries once then succeeds on the second attempt', async () => {
    mockStorage.setItem
      .mockRejectedValueOnce(new Error('transient'))
      .mockResolvedValueOnce(undefined);
    const ok = await storageService.save('key', 'value');
    expect(ok).toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledTimes(2);
  });

  it('save returns false without retrying when value is unserializable', async () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const ok = await storageService.save('key', circular);
    expect(ok).toBe(false);
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('load returns null when Storage.getItem fails', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const result = await storageService.load('key');
    expect(result).toBeNull();
  });
});
