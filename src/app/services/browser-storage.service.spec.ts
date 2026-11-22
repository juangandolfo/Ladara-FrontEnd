import { BrowserStorageService } from './browser-storage.service';

describe('BrowserStorageService', () => {
  let service: BrowserStorageService;

  beforeEach(() => {
    service = new BrowserStorageService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('writes and reads back a value', () => {
    expect(service.setItem('token', 'abc123')).toBe(true);
    expect(service.getItem('token')).toBe('abc123');
  });

  it('returns null for a missing key', () => {
    expect(service.getItem('missing-key')).toBeNull();
  });

  it('removes a stored value', () => {
    service.setItem('token', 'abc123');
    expect(service.removeItem('token')).toBe(true);
    expect(service.getItem('token')).toBeNull();
  });

  it('returns false and logs instead of throwing when getItem fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const getSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(service.getItem('token')).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    getSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('returns false and logs instead of throwing when setItem fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const setSpy = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(service.setItem('token', 'value')).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    setSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('returns false and logs instead of throwing when removeItem fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(service.removeItem('token')).toBe(false);
    expect(consoleSpy).toHaveBeenCalled();

    removeSpy.mockRestore();
    consoleSpy.mockRestore();
  });
});
