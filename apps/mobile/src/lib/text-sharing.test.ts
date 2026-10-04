import { beforeEach, afterEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ platform: { OS: 'web' }, share: vi.fn() }));
vi.mock('react-native', () => ({
  Platform: native.platform,
  Share: { share: native.share, dismissedAction: 'dismissedAction' },
}));
import { appLink, shareTextContent } from './text-sharing';
import { publicAppUrl } from '@cinewrapped/shared-types';
beforeEach(() => {
  native.platform.OS = 'web';
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('constructs canonical HTTPS links and rejects unsafe origins and destinations', () => {
  expect(appLink('/media/title-id')).toBe('https://cinewrapped.vercel.app/media/title-id');
  expect(publicAppUrl('/trivia', 'https://custom.test/path')).toBe('https://custom.test/trivia');
  for (const origin of ['javascript:alert(1)', 'https://user:password@test.example'])
    expect(() => publicAppUrl('/', origin)).toThrow();
  for (const path of ['https://evil.test', '//evil.test', '/\\evil.test'])
    expect(() => publicAppUrl(path)).toThrow();
});
it('calls browser share immediately with HTTPS data before any asynchronous preparation', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('navigator', { share });
  const operation = shareTextContent({
    title: 'Film',
    message: 'Watch this',
    url: appLink('/media/title-id'),
  });
  expect(share).toHaveBeenCalledWith({
    title: 'Film',
    text: 'Watch this',
    url: 'https://cinewrapped.vercel.app/media/title-id',
  });
  expect(await operation).toBe('shared');
});
it('reports unsupported browsers without automatic downloads or clipboard writes', async () => {
  const clipboard = { writeText: vi.fn() };
  vi.stubGlobal('navigator', { clipboard });
  expect(await shareTextContent({ title: 'Film', message: 'Text' })).toBe('unsupported');
  expect(clipboard.writeText).not.toHaveBeenCalled();
});
it('treats cancellation as normal and propagates actual permission failures', async () => {
  const share = vi
    .fn()
    .mockRejectedValueOnce({ name: 'AbortError' })
    .mockRejectedValueOnce(new Error('Permission denied'));
  vi.stubGlobal('navigator', { share });
  expect(await shareTextContent({ title: 'Film', message: 'Text' })).toBe('cancelled');
  await expect(shareTextContent({ title: 'Film', message: 'Text' })).rejects.toThrow(
    'Permission denied',
  );
});
it('preserves native cancellation and includes the web URL in Android-compatible text', async () => {
  native.platform.OS = 'ios';
  native.share.mockResolvedValue({ action: 'dismissedAction' });
  expect(
    await shareTextContent({
      title: 'Film',
      message: 'Text',
      url: 'https://cinewrapped.vercel.app',
    }),
  ).toBe('cancelled');
  expect(native.share).toHaveBeenCalledWith({
    title: 'Film',
    message: 'Text\nhttps://cinewrapped.vercel.app',
  });
});
