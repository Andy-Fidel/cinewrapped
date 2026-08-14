import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AppleSoundtrackProvider,
  soundtrackScore,
} from '../src/soundtracks/apple-soundtrack.provider.js';

describe('AppleSoundtrackProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('ranks official title soundtracks above unrelated and tribute albums', () => {
    const official = soundtrackScore(
      { collectionName: 'Dune: Part Two (Original Motion Picture Soundtrack)' },
      'Dune: Part Two',
    );
    const tribute = soundtrackScore(
      { collectionName: 'A Karaoke Tribute Inspired by Dune' },
      'Dune: Part Two',
    );
    const unrelated = soundtrackScore({ collectionName: 'Music for Desert Evenings' }, 'Dune');

    expect(official).toBeGreaterThan(tribute);
    expect(official).toBeGreaterThan(unrelated);
  });

  it('maps eligible albums and includes provider handoff links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              resultCount: 1,
              results: [
                {
                  wrapperType: 'collection',
                  collectionType: 'Album',
                  collectionId: 123,
                  collectionName: 'Arrival (Original Motion Picture Soundtrack)',
                  artistName: 'Jóhann Jóhannsson',
                  artworkUrl100: 'https://example.test/100x100bb.jpg',
                  collectionViewUrl: 'https://music.apple.com/album/123',
                  releaseDate: '2016-11-11T00:00:00Z',
                  trackCount: 20,
                },
              ],
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        ),
      ),
    );

    const albums = await new AppleSoundtrackProvider().search('Arrival', 'GH');

    expect(albums).toEqual([
      expect.objectContaining({
        provider: 'APPLE_MUSIC',
        providerAlbumId: '123',
        artworkUrl: 'https://example.test/600x600bb.jpg',
        releaseDate: '2016-11-11',
        saveId: null,
        serviceLinks: [
          expect.objectContaining({ service: 'APPLE_MUSIC' }),
          expect.objectContaining({ service: 'SPOTIFY' }),
        ],
      }),
    ]);
  });
});
