import { Prisma } from '@cinewrapped/database';
import type {
  MediaSummary,
  SavedSoundtrackSummary,
  SoundtrackAlbumSummary,
  SoundtrackDiscoverySummary,
} from '@cinewrapped/shared-types';
import { saveSoundtrackSchema } from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CacheService } from '../cache/cache.service.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { AppleSoundtrackProvider } from './apple-soundtrack.provider.js';

type SaveInput = z.output<typeof saveSoundtrackSchema>;
const include = {
  media: { include: { genres: { select: { genreId: true } } } },
} satisfies Prisma.SoundtrackSaveInclude;
type SaveRecord = Prisma.SoundtrackSaveGetPayload<{ include: typeof include }>;

function toMedia(media: SaveRecord['media']): MediaSummary {
  return {
    id: media.id,
    provider: media.externalProvider,
    externalId: media.externalId,
    mediaType: media.mediaType,
    title: media.title,
    releaseYear: media.releaseYear,
    runtimeMinutes: media.runtimeMinutes,
    posterUrl: media.posterUrl,
    backdropUrl: media.backdropUrl,
    overview: media.overview,
    genreIds: media.genres.map(({ genreId }) => genreId),
    averageProviderRating:
      media.averageProviderRating === null ? null : Number(media.averageProviderRating),
  };
}

function serviceLinks(title: string, artistName: string, providerUrl: string) {
  return [
    { service: 'APPLE_MUSIC' as const, url: providerUrl },
    {
      service: 'SPOTIFY' as const,
      url: `https://open.spotify.com/search/${encodeURIComponent(`${title} ${artistName}`)}`,
    },
  ];
}

function toSaved(row: SaveRecord): SavedSoundtrackSummary {
  return {
    id: row.id,
    provider: row.provider,
    providerAlbumId: row.providerAlbumId,
    title: row.title,
    artistName: row.artistName,
    artworkUrl: row.artworkUrl,
    providerUrl: row.providerUrl,
    releaseDate: row.releaseDate?.toISOString().slice(0, 10) ?? null,
    trackCount: row.trackCount,
    explicit: false,
    serviceLinks: serviceLinks(row.title, row.artistName, row.providerUrl),
    saveId: row.id,
    media: toMedia(row.media),
    savedAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class SoundtracksService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly cache: CacheService,
    private readonly provider: AppleSoundtrackProvider,
  ) {}

  public async discover(
    principal: AuthPrincipal,
    mediaId: string,
    countryCode: string,
  ): Promise<SoundtrackDiscoverySummary> {
    await this.flags.assertEnabled(principal, 'SOUNDTRACKS');
    const userId = await this.userId(principal.subject);
    const media = await this.prisma.media.findUnique({
      where: { id: mediaId },
      select: { title: true },
    });
    if (media === null) throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    const albums = await this.cache.remember(
      `soundtracks:search:${countryCode}:${encodeURIComponent(media.title)}`,
      21_600,
      () => this.provider.search(media.title, countryCode),
    );
    const saves = await this.prisma.soundtrackSave.findMany({
      where: { userId, mediaId, deletedAt: null },
      select: { id: true, providerAlbumId: true },
    });
    const saved = new Map(saves.map((row) => [row.providerAlbumId, row.id]));
    return {
      mediaId,
      query: `${media.title} soundtrack`,
      attribution: 'Apple',
      albums: albums.map((album): SoundtrackAlbumSummary => ({
        ...album,
        saveId: saved.get(album.providerAlbumId) ?? null,
      })),
    };
  }

  public async tracks(principal: AuthPrincipal, providerAlbumId: string, countryCode: string) {
    await this.flags.assertEnabled(principal, 'SOUNDTRACKS');
    await this.userId(principal.subject);
    return this.cache.remember(`soundtracks:tracks:${countryCode}:${providerAlbumId}`, 21_600, () =>
      this.provider.tracks(providerAlbumId, countryCode),
    );
  }

  public async list(principal: AuthPrincipal): Promise<SavedSoundtrackSummary[]> {
    await this.flags.assertEnabled(principal, 'SOUNDTRACKS');
    const rows = await this.prisma.soundtrackSave.findMany({
      where: { userId: await this.userId(principal.subject), deletedAt: null },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toSaved);
  }

  public async save(principal: AuthPrincipal, mediaId: string, input: SaveInput) {
    await this.flags.assertEnabled(principal, 'SOUNDTRACKS');
    const userId = await this.userId(principal.subject);
    if ((await this.prisma.media.count({ where: { id: mediaId } })) === 0)
      throw new AppException(404, 'MEDIA_NOT_FOUND', 'The title was not found.');
    const row = await this.prisma.soundtrackSave.upsert({
      where: {
        userId_mediaId_provider_providerAlbumId: {
          userId,
          mediaId,
          provider: input.provider,
          providerAlbumId: input.providerAlbumId,
        },
      },
      create: {
        userId,
        mediaId,
        provider: input.provider,
        providerAlbumId: input.providerAlbumId,
        title: input.title,
        artistName: input.artistName,
        artworkUrl: input.artworkUrl ?? null,
        providerUrl: input.providerUrl,
        releaseDate:
          input.releaseDate == null ? null : new Date(`${input.releaseDate}T00:00:00.000Z`),
        trackCount: input.trackCount ?? null,
      },
      update: {
        title: input.title,
        artistName: input.artistName,
        artworkUrl: input.artworkUrl ?? null,
        providerUrl: input.providerUrl,
        releaseDate:
          input.releaseDate == null ? null : new Date(`${input.releaseDate}T00:00:00.000Z`),
        trackCount: input.trackCount ?? null,
        deletedAt: null,
      },
      include,
    });
    return toSaved(row);
  }

  public async remove(principal: AuthPrincipal, saveId: string) {
    await this.flags.assertEnabled(principal, 'SOUNDTRACKS');
    const userId = await this.userId(principal.subject);
    const result = await this.prisma.soundtrackSave.updateMany({
      where: { id: saveId, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (result.count === 0)
      throw new AppException(
        404,
        'SOUNDTRACK_SAVE_NOT_FOUND',
        'The saved soundtrack was not found.',
      );
    return { id: saveId };
  }

  private async userId(subject: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { authSubject: subject, deletedAt: null },
      select: { id: true },
    });
    if (user === null)
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    return user.id;
  }
}
