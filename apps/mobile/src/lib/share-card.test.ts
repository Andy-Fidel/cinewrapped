import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeCardBytes, encodeCardBytes } from './card-base64';
import { CARD_THEMES, ratingLabel, renderGraphicCard, wrapCardText } from './share-card-model';
import { loadCardPoster, prepareWebCard, shareWebCard } from './share-card-generator';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('card content', () => {
  it.each([
    [null, 5, 'Unrated'],
    [0, 5, '0 / 5'],
    [4.5, 5, '4.5 / 5'],
    [9, 10, '9 / 10'],
    [6, 5, 'Unrated'],
    [NaN, 10, 'Unrated'],
    [4, null, 'Unrated'],
  ])('formats %s on scale %s', (value, scale, label) => {
    expect(ratingLabel(value, scale)).toBe(label);
  });
  it('escapes review content, labels spoilers and renders fractional stars on the original scale', () => {
    const svg = renderGraphicCard({
      title: '<script>alert(1)</script>',
      body: 'A & B',
      author: 'Viewer',
      theme: 'CYAN',
      ratingValue: 9,
      ratingScale: 10,
      containsSpoilers: true,
      posterDataUrl: 'https://evil.test/x.svg',
    });
    expect(svg).not.toContain('<script>');
    expect(svg).toContain('&lt;script&gt;');
    expect(svg).toContain('A &amp; B');
    expect(svg).toContain('SPOILERS');
    expect(svg).toContain('9 / 10');
    expect(svg).toContain('<rect width="30" height="60"/>');
    expect(svg).not.toContain('evil.test');
    expect(
      renderGraphicCard({ title: 'Film', body: '', author: 'Viewer', theme: 'GOLD' }),
    ).not.toContain('<polygon');
  });
  it('bounds long multilingual text without splitting surrogate pairs', () => {
    const lines = wrapCardText('電影🎬'.repeat(100), 20, 3);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatch(/…$/u);
    for (const line of lines) expect(Array.from(line).length).toBeLessThanOrEqual(11);
    expect(lines.join('')).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/u);
  });
  it('keeps theme text contrast at least 4.5:1', () => {
    const luminance = (hex: string) => {
      const rgb = hex
        .match(/[0-9A-F]{2}/gu)!
        .map((v) => parseInt(v, 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    };
    const contrast = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (values[0]! + 0.05) / (values[1]! + 0.05);
    };
    for (const theme of Object.values(CARD_THEMES)) {
      expect(contrast(theme.accent, theme.onAccent)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(theme.accent, theme.background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast('#BDC7D9', theme.background)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it.each([0, 1, 2, 3, 8191, 20000])('round-trips %s bytes without browser globals', (length) => {
    const bytes = Uint8Array.from({ length }, (_, i) => i % 256);
    const encoded = encodeCardBytes(bytes);
    expect(encoded).toBe(Buffer.from(bytes).toString('base64'));
    expect(decodeCardBytes(encoded)).toEqual(bytes);
  });
});

describe('file export and sharing', () => {
  const card = {
    file: new File(['png'], 'cinewrapped-card.png', { type: 'image/png' }),
    title: 'Film',
  };
  it('shares a PNG file rather than a caption or poster URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { canShare: () => true, share });
    expect(await shareWebCard(card)).toBe('shared');
    expect(share).toHaveBeenCalledWith({ files: [card.file], title: 'Film' });
  });
  it('cancels without clipboard writes or downloads', async () => {
    const writeText = vi.fn();
    const createElement = vi.fn();
    vi.stubGlobal('document', { createElement });
    vi.stubGlobal('navigator', {
      canShare: () => true,
      share: vi.fn().mockRejectedValue({ name: 'AbortError' }),
      clipboard: { writeText },
    });
    expect(await shareWebCard(card)).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    expect(createElement).not.toHaveBeenCalled();
  });
  it('propagates permission failures for visible error feedback', async () => {
    vi.stubGlobal('navigator', {
      canShare: () => true,
      share: vi.fn().mockRejectedValue(new Error('Permission denied')),
    });
    await expect(shareWebCard(card)).rejects.toThrow('Permission denied');
  });
  it('downloads the PNG when file sharing is unsupported', async () => {
    vi.useFakeTimers();
    const anchor = { click: vi.fn(), remove: vi.fn(), href: '', download: '' };
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', { createElement: () => anchor, body: { appendChild: vi.fn() } });
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:card');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    expect(await shareWebCard(card)).toBe('downloaded');
    expect(create).toHaveBeenCalledWith(card.file);
    expect(anchor.download).toBe('cinewrapped-card.png');
    expect(anchor.click).toHaveBeenCalledOnce();
    vi.runAllTimers();
    expect(revoke).toHaveBeenCalledWith('blob:card');
  });
  it('releases rendering URLs when image decoding fails', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:svg');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.stubGlobal(
      'Image',
      class {
        onerror?: () => void;
        set src(_value: string) {
          this.onerror?.();
        }
      },
    );
    await expect(prepareWebCard('<svg/>', 'Film')).rejects.toThrow('Could not render');
    expect(revoke).toHaveBeenCalledWith('blob:svg');
  });
  it('fetches only public raster posters without authentication', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/png' } }),
      );
    vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    expect(await loadCardPoster('https://private.test/avatar', signal)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(await loadCardPoster('https://image.tmdb.org/t/p/w500/test.png', signal)).toBe(
      'data:image/png;base64,AQID',
    );
    expect(fetch).toHaveBeenCalledWith('https://image.tmdb.org/t/p/w500/test.png', {
      signal,
      credentials: 'omit',
    });
  });
});
