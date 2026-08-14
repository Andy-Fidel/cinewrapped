import { Prisma } from '@cinewrapped/database';
import type {
  MediaSummary,
  SceneIdentificationCandidate,
  SceneIdentificationSummary,
} from '@cinewrapped/shared-types';
import { identifySceneSchema, sceneIdentificationFeedbackSchema } from '@cinewrapped/validation';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import type { ApiEnvironment } from '@cinewrapped/config';
import { API_ENVIRONMENT } from '../config/environment.module.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { MediaCatalogService } from '../media-provider/media-catalog.service.js';
import { OpenAiSceneProvider, type VisionSceneCandidate } from './openai-scene.provider.js';

type IdentifyInput = z.output<typeof identifySceneSchema>;
type FeedbackInput = z.output<typeof sceneIdentificationFeedbackSchema>;
const storedCandidatesSchema = z.array(
  z.object({
    suggestedTitle: z.string(),
    suggestedYear: z.number().int().nullable(),
    suggestedMediaType: z.enum(['MOVIE', 'TV']).nullable(),
    confidence: z.number().int().min(0).max(100),
    evidence: z.array(z.string()),
    mediaId: z.string().uuid().nullable(),
  }),
);
type StoredCandidate = z.output<typeof storedCandidatesSchema>[number];

const include = {
  matchedMedia: { include: { genres: { select: { genreId: true } } } },
} satisfies Prisma.SceneIdentificationInclude;
type SceneRecord = Prisma.SceneIdentificationGetPayload<{ include: typeof include }>;
type MediaRecord = NonNullable<SceneRecord['matchedMedia']>;

function normalize(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

function toMedia(media: MediaRecord): MediaSummary {
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

export function assertTrustedSceneImageUrl(
  supabaseUrl: string,
  subject: string,
  storagePath: string,
  signedImageUrl: string,
): void {
  if (!storagePath.startsWith(`${subject}/`))
    throw new AppException(400, 'SCENE_IMAGE_PATH_INVALID', 'The scene image path is invalid.');
  let expectedHost: string;
  let url: URL;
  try {
    expectedHost = new URL(supabaseUrl).host;
    url = new URL(signedImageUrl);
  } catch {
    throw new AppException(400, 'SCENE_IMAGE_URL_INVALID', 'The scene image URL is invalid.');
  }
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    throw new AppException(400, 'SCENE_IMAGE_URL_INVALID', 'The scene image URL is invalid.');
  }
  const expectedSuffix = `/storage/v1/object/sign/scene-identification/${storagePath}`;
  if (
    url.protocol !== 'https:' ||
    url.host !== expectedHost ||
    !decodedPath.endsWith(expectedSuffix) ||
    (url.searchParams.get('token') ?? '').length < 16
  ) {
    throw new AppException(
      400,
      'SCENE_IMAGE_URL_INVALID',
      'The signed scene image URL is invalid.',
    );
  }
}

@Injectable()
export class SceneIdentificationService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly flags: FeatureFlagsService,
    private readonly catalog: MediaCatalogService,
    private readonly vision: OpenAiSceneProvider,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  public async identify(
    principal: AuthPrincipal,
    input: IdentifyInput,
  ): Promise<SceneIdentificationSummary> {
    await this.flags.assertEnabled(principal, 'SCENE_IDENTIFICATION');
    const userId = await this.userId(principal.subject);
    assertTrustedSceneImageUrl(
      this.environment.SUPABASE_URL,
      principal.subject,
      input.storagePath,
      input.signedImageUrl,
    );
    const startedAt = Date.now();
    const result = await this.vision.identify(input.signedImageUrl);
    const candidates: StoredCandidate[] = [];
    for (const candidate of result.candidates)
      candidates.push(await this.ground(candidate, input.language));
    const top = candidates[0];
    const status =
      top?.mediaId != null && top.confidence >= 70
        ? 'MATCHED'
        : candidates.length > 0
          ? 'UNCERTAIN'
          : 'NO_MATCH';
    const matchedMediaId = status === 'MATCHED' ? (top?.mediaId ?? null) : null;
    const record = await this.prisma.sceneIdentification.create({
      data: {
        userId,
        matchedMediaId,
        status,
        confidence: top?.confidence ?? 0,
        sceneDescription: result.sceneDescription.slice(0, 1_000),
        candidatesJson: JSON.parse(JSON.stringify(candidates)) as Prisma.InputJsonValue,
        model: this.vision.model,
        processingMs: Date.now() - startedAt,
      },
      include,
    });
    return this.toSummary(record);
  }

  public async list(
    principal: AuthPrincipal,
    limit: number,
  ): Promise<SceneIdentificationSummary[]> {
    await this.flags.assertEnabled(principal, 'SCENE_IDENTIFICATION');
    const records = await this.prisma.sceneIdentification.findMany({
      where: { userId: await this.userId(principal.subject), deletedAt: null },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return Promise.all(records.map((record) => this.toSummary(record)));
  }

  public async feedback(principal: AuthPrincipal, id: string, input: FeedbackInput) {
    await this.flags.assertEnabled(principal, 'SCENE_IDENTIFICATION');
    const userId = await this.userId(principal.subject);
    const current = await this.requireRecord(userId, id);
    if (input.action === 'CONFIRM') {
      const mediaId = input.mediaId ?? '';
      const allowed = storedCandidatesSchema
        .parse(current.candidatesJson)
        .some((candidate) => candidate.mediaId === mediaId);
      if (!allowed)
        throw new AppException(400, 'SCENE_MEDIA_INVALID', 'Choose one of the suggested titles.');
      return this.toSummary(
        await this.prisma.sceneIdentification.update({
          where: { id },
          data: {
            feedback: 'CONFIRMED',
            matchedMediaId: mediaId,
            status: 'MATCHED',
            confirmedAt: new Date(),
            rejectedAt: null,
          },
          include,
        }),
      );
    }
    return this.toSummary(
      await this.prisma.sceneIdentification.update({
        where: { id },
        data: {
          feedback: 'REJECTED',
          matchedMediaId: null,
          confirmedAt: null,
          rejectedAt: new Date(),
        },
        include,
      }),
    );
  }

  public async remove(principal: AuthPrincipal, id: string) {
    await this.flags.assertEnabled(principal, 'SCENE_IDENTIFICATION');
    const userId = await this.userId(principal.subject);
    await this.requireRecord(userId, id);
    await this.prisma.sceneIdentification.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { id };
  }

  private async ground(
    candidate: VisionSceneCandidate,
    language: string,
  ): Promise<StoredCandidate> {
    let media: MediaSummary | null = null;
    try {
      const results = await this.catalog.search(candidate.title, language, { limit: 20 }, 1);
      const best = results
        .map((item) => {
          let score = normalize(item.title) === normalize(candidate.title) ? 60 : 0;
          if (candidate.releaseYear !== null && item.releaseYear === candidate.releaseYear)
            score += 25;
          if (candidate.mediaType !== null && item.mediaType === candidate.mediaType) score += 15;
          return { item, score };
        })
        .sort((a, b) => b.score - a.score)[0];
      media = best !== undefined && best.score >= 60 ? best.item : null;
    } catch {
      media = null;
    }
    return {
      suggestedTitle: candidate.title,
      suggestedYear: candidate.releaseYear,
      suggestedMediaType: candidate.mediaType,
      confidence: candidate.confidence,
      evidence: candidate.evidence,
      mediaId: media?.id ?? null,
    };
  }

  private async toSummary(record: SceneRecord): Promise<SceneIdentificationSummary> {
    const stored = storedCandidatesSchema.parse(record.candidatesJson);
    const mediaIds = stored.flatMap(({ mediaId }) => (mediaId === null ? [] : [mediaId]));
    const media = await this.prisma.media.findMany({
      where: { id: { in: mediaIds } },
      include: { genres: { select: { genreId: true } } },
    });
    const byId = new Map(media.map((item) => [item.id, toMedia(item)]));
    const candidates: SceneIdentificationCandidate[] = stored.map(({ mediaId, ...candidate }) => ({
      ...candidate,
      media: mediaId === null ? null : (byId.get(mediaId) ?? null),
    }));
    return {
      id: record.id,
      status: record.status,
      feedback: record.feedback,
      confidence: record.confidence,
      sceneDescription: record.sceneDescription,
      candidates,
      matchedMedia: record.matchedMedia === null ? null : toMedia(record.matchedMedia),
      model: record.model,
      processingMs: record.processingMs,
      confirmedAt: record.confirmedAt?.toISOString() ?? null,
      rejectedAt: record.rejectedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
      notice: 'AI scene matches can be wrong. Confirm the title before relying on this result.',
    };
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

  private async requireRecord(userId: string, id: string) {
    const record = await this.prisma.sceneIdentification.findFirst({
      where: { id, userId, deletedAt: null },
      include,
    });
    if (record === null)
      throw new AppException(
        404,
        'SCENE_IDENTIFICATION_NOT_FOUND',
        'The scene result was not found.',
      );
    return record;
  }
}
