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
    await storageService.save('test-key', { foo: 1 });
    expect(mockStorage.setItem).toHaveBeenCalledWith('test-key', '{"foo":1}');
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

  it('save does not throw when Storage.setItem fails', async () => {
    mockStorage.setItem.mockRejectedValue(new Error('Storage error'));
    await expect(storageService.save('key', 'value')).resolves.toBeUndefined();
  });

  it('load returns null when Storage.getItem fails', async () => {
    mockStorage.getItem.mockRejectedValue(new Error('Storage error'));
    const result = await storageService.load('key');
    expect(result).toBeNull();
  });
});
