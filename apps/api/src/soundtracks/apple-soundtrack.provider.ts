import type { SoundtrackAlbumSummary, SoundtrackTrackSummary } from '@cinewrapped/shared-types';
import { Injectable } from '@nestjs/common';

import { AppException } from '../common/app.exception.js';

interface AppleSearchResult {
  wrapperType?: string;
  collectionType?: string;
  collectionId?: number;
  trackId?: number;
  collectionName?: string;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  releaseDate?: string;
  trackCount?: number;
  trackNumber?: number;
  trackTimeMillis?: number;
  previewUrl?: string;
  collectionExplicitness?: string;
  trackExplicitness?: string;
}

interface AppleResponse {
  resultCount?: number;
  results?: AppleSearchResult[];
}

function normalized(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function artwork(url: string | undefined): string | null {
  return url?.replace(/100x100(?:bb)?/u, '600x600bb') ?? null;
}

function spotifySearchUrl(title: string, artist: string): string {
  return `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artist}`)}`;
}

export function soundtrackScore(result: AppleSearchResult, mediaTitle: string): number {
  const album = normalized(result.collectionName ?? '');
  const title = normalized(mediaTitle);
  if (album.length === 0 || title.length === 0) return 0;
  const phraseMatch = ` ${album} `.includes(` ${title} `);
  let score = phraseMatch ? 60 : 0;
  const titleTokens = new Set(title.split(' '));
  const overlap = album.split(' ').filter((token) => titleTokens.has(token)).length;
  score += Math.round((overlap / titleTokens.size) * 30);
  if (
    /soundtrack|original motion picture|original television|original score|music from/iu.test(album)
  )
    score += 25;
  if (/karaoke|tribute|inspired by/iu.test(album)) score -= 25;
  return score;
}

@Injectable()
export class AppleSoundtrackProvider {
  public async search(mediaTitle: string, countryCode: string): Promise<SoundtrackAlbumSummary[]> {
    const query = `${mediaTitle} soundtrack`;
    const response = await this.get({
      path: 'search',
      params: { term: query, country: countryCode, media: 'music', entity: 'album', limit: '20' },
    });
    const seen = new Set<number>();
    return (response.results ?? [])
      .filter(
        (
          item,
        ): item is AppleSearchResult & {
          collectionId: number;
          collectionName: string;
          artistName: string;
          collectionViewUrl: string;
        } =>
          typeof item.collectionId === 'number' &&
          typeof item.collectionName === 'string' &&
          typeof item.artistName === 'string' &&
          typeof item.collectionViewUrl === 'string',
      )
      .map((item) => ({ item, score: soundtrackScore(item, mediaTitle) }))
      .filter(({ score }) => score >= 45)
      .sort((a, b) => b.score - a.score)
      .filter(({ item }) => {
        if (seen.has(item.collectionId)) return false;
        seen.add(item.collectionId);
        return true;
      })
      .slice(0, 8)
      .map(({ item }) => ({
        provider: 'APPLE_MUSIC',
        providerAlbumId: String(item.collectionId),
        title: item.collectionName,
        artistName: item.artistName,
        artworkUrl: artwork(item.artworkUrl100),
        providerUrl: item.collectionViewUrl,
        releaseDate: item.releaseDate?.slice(0, 10) ?? null,
        trackCount: item.trackCount ?? null,
        explicit: item.collectionExplicitness === 'explicit',
        serviceLinks: [
          { service: 'APPLE_MUSIC', url: item.collectionViewUrl },
          { service: 'SPOTIFY', url: spotifySearchUrl(item.collectionName, item.artistName) },
        ],
        saveId: null,
      }));
  }

  public async tracks(
    providerAlbumId: string,
    countryCode: string,
  ): Promise<SoundtrackTrackSummary[]> {
    const response = await this.get({
      path: 'lookup',
      params: { id: providerAlbumId, country: countryCode, entity: 'song' },
    });
    return (response.results ?? [])
      .filter(
        (
          item,
        ): item is AppleSearchResult & {
          trackId: number;
          trackName: string;
          artistName: string;
          trackViewUrl: string;
        } =>
          item.wrapperType === 'track' &&
          typeof item.trackId === 'number' &&
          typeof item.trackName === 'string' &&
          typeof item.artistName === 'string' &&
          typeof item.trackViewUrl === 'string',
      )
      .map((item) => ({
        providerTrackId: String(item.trackId),
        title: item.trackName,
        artistName: item.artistName,
        trackNumber: item.trackNumber ?? null,
        durationMs: item.trackTimeMillis ?? null,
        previewUrl: item.previewUrl ?? null,
        providerUrl: item.trackViewUrl,
        explicit: item.trackExplicitness === 'explicit',
      }));
  }

  private async get(input: { path: 'search' | 'lookup'; params: Record<string, string> }) {
    const url = new URL(`https://itunes.apple.com/${input.path}`);
    for (const [key, value] of Object.entries(input.params)) url.searchParams.set(key, value);
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`Apple catalog returned ${response.status}.`);
      const body = (await response.json()) as AppleResponse;
      return Array.isArray(body.results) ? body : { results: [] };
    } catch (error) {
      throw new AppException(
        502,
        'SOUNDTRACK_PROVIDER_UNAVAILABLE',
        'Soundtrack discovery is temporarily unavailable. Please try again.',
        { cause: error instanceof Error ? error.message : 'Unknown provider error.' },
      );
    }
  }
}
