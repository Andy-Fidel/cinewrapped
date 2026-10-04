import { beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({
  write: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  share: vi.fn(),
  available: vi.fn(),
}));
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    uri = 'file:///cache/card.png';
    exists = true;
    create = native.create;
    write = native.write;
    delete = native.remove;
  },
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: native.available, shareAsync: native.share }));
import { shareNativeCard } from './share-card-generator';
beforeEach(() => {
  vi.clearAllMocks();
  native.available.mockResolvedValue(true);
  native.share.mockResolvedValue(undefined);
});
it('writes PNG bytes, shares a local PNG file and removes the temporary file', async () => {
  expect(await shareNativeCard('iVBORw==')).toBe('shared');
  expect(native.write).toHaveBeenCalledWith(new Uint8Array([137, 80, 78, 71]));
  expect(native.share).toHaveBeenCalledWith(
    'file:///cache/card.png',
    expect.objectContaining({ mimeType: 'image/png', UTI: 'public.png' }),
  );
  expect(native.remove).toHaveBeenCalledOnce();
});
it('cleans up on cancellation and on genuine share failure', async () => {
  native.share.mockRejectedValueOnce({ name: 'AbortError' });
  expect(await shareNativeCard('iVBORw==')).toBe('cancelled');
  native.share.mockRejectedValueOnce(new Error('Sharing failed'));
  await expect(shareNativeCard('iVBORw==')).rejects.toThrow('Sharing failed');
  expect(native.remove).toHaveBeenCalledTimes(2);
});
it('does not create a file when sharing is unavailable', async () => {
  native.available.mockResolvedValue(false);
  await expect(shareNativeCard('iVBORw==')).rejects.toThrow('unavailable');
  expect(native.create).not.toHaveBeenCalled();
});
