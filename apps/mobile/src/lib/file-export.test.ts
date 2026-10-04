import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const ports = vi.hoisted(() => ({
  platform: { OS: 'ios' },
  share: vi.fn(),
  available: vi.fn(),
  files: new Map<string, string>(),
  uris: [] as string[],
}));
vi.mock('react-native', () => ({ Platform: ports.platform }));
vi.mock('expo-file-system', () => ({
  Paths: { cache: 'cache' },
  File: class {
    uri: string;
    constructor(_cache: string, name: string) {
      this.uri = 'file:///cache/' + name;
      ports.uris.push(this.uri);
    }
    get exists() {
      return ports.files.has(this.uri);
    }
    create() {
      if (this.exists) throw Error('Exists');
      ports.files.set(this.uri, '');
    }
    write(content: string) {
      ports.files.set(this.uri, content);
    }
    delete() {
      ports.files.delete(this.uri);
    }
  },
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: ports.available, shareAsync: ports.share }));
vi.mock('expo-linking', () => ({ openURL: vi.fn().mockResolvedValue(undefined) }));
import { exportTextFile } from './file-export';
import { openAppleCalendar } from './calendar-integration';
beforeEach(() => {
  vi.clearAllMocks();
  ports.files.clear();
  ports.uris.length = 0;
  ports.platform.OS = 'ios';
  ports.available.mockResolvedValue(true);
  ports.share.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('exports the same calendar event twice and removes files after each share', async () => {
  const event = {
    id: 'repeated-event',
    title: 'Film',
    startsAt: '2026-10-05T20:00:00Z',
    notes: 'Private note',
    reminderMinutes: [],
  };
  await openAppleCalendar(event);
  await openAppleCalendar(event);
  expect(ports.uris[0]).not.toBe(ports.uris[1]);
  expect(ports.files.size).toBe(0);
  expect(ports.share).toHaveBeenCalledWith(
    expect.stringMatching(/\.ics$/u),
    expect.objectContaining({ mimeType: 'text/calendar', UTI: 'com.apple.ical.ics' }),
  );
});
it('cleans up on cancellation and failed sharing', async () => {
  ports.share
    .mockRejectedValueOnce({ name: 'AbortError' })
    .mockRejectedValueOnce(new Error('Failed'));
  expect(await exportTextFile('private', 'export.json', 'application/json', 'Save')).toBe(
    'cancelled',
  );
  await expect(
    exportTextFile('private', 'export.json', 'application/json', 'Save'),
  ).rejects.toThrow('Failed');
  expect(ports.files.size).toBe(0);
});
it('downloads a real ICS Blob on web without using the native filesystem', async () => {
  ports.platform.OS = 'web';
  vi.useFakeTimers();
  const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:ics');
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  expect(
    await openAppleCalendar({ id: 'event', title: 'Film', startsAt: '2026-10-05T20:00:00Z' }),
  ).toBe('downloaded');
  expect(anchor.download).toBe('cinewrapped-event.ics');
  expect(anchor.click).toHaveBeenCalledOnce();
  expect(ports.uris).toHaveLength(0);
  const file = create.mock.calls[0]![0] as File;
  expect(await file.text()).toContain('BEGIN:VCALENDAR');
  vi.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:ics');
});
