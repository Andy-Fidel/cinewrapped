import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable } from '@nestjs/common';

import { AppException } from '../common/app.exception.js';
import { API_ENVIRONMENT } from '../config/environment.module.js';

export interface VisionSceneCandidate {
  title: string;
  releaseYear: number | null;
  mediaType: 'MOVIE' | 'TV' | null;
  confidence: number;
  evidence: string[];
}

export interface VisionSceneResult {
  sceneDescription: string;
  candidates: VisionSceneCandidate[];
}

interface OpenAiResponse {
  id?: string;
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string; refusal?: string }>;
  }>;
  error?: { message?: string; code?: string };
}

const outputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sceneDescription: { type: 'string', minLength: 1, maxLength: 500 },
    candidates: {
      type: 'array',
      minItems: 0,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 300 },
          releaseYear: {
            anyOf: [{ type: 'integer', minimum: 1870, maximum: 2200 }, { type: 'null' }],
          },
          mediaType: { anyOf: [{ type: 'string', enum: ['MOVIE', 'TV'] }, { type: 'null' }] },
          confidence: { type: 'integer', minimum: 0, maximum: 100 },
          evidence: {
            type: 'array',
            minItems: 0,
            maxItems: 4,
            items: { type: 'string', minLength: 1, maxLength: 160 },
          },
        },
        required: ['title', 'releaseYear', 'mediaType', 'confidence', 'evidence'],
      },
    },
  },
  required: ['sceneDescription', 'candidates'],
} as const;

function outputText(response: OpenAiResponse): string | null {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
      if (content.type === 'refusal') return null;
    }
  }
  return null;
}

function isCandidate(value: unknown): value is VisionSceneCandidate {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.title === 'string' &&
    (candidate.releaseYear === null || typeof candidate.releaseYear === 'number') &&
    (candidate.mediaType === null ||
      candidate.mediaType === 'MOVIE' ||
      candidate.mediaType === 'TV') &&
    typeof candidate.confidence === 'number' &&
    Array.isArray(candidate.evidence) &&
    candidate.evidence.every((item) => typeof item === 'string')
  );
}

function parseResult(text: string): VisionSceneResult {
  const value = JSON.parse(text) as unknown;
  if (typeof value !== 'object' || value === null)
    throw new Error('The vision result was not an object.');
  const result = value as Record<string, unknown>;
  if (
    typeof result.sceneDescription !== 'string' ||
    !Array.isArray(result.candidates) ||
    !result.candidates.every(isCandidate)
  ) {
    throw new Error('The vision result did not match the required structure.');
  }
  return { sceneDescription: result.sceneDescription, candidates: result.candidates.slice(0, 3) };
}

@Injectable()
export class OpenAiSceneProvider {
  public constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {}

  public get model(): string {
    return this.environment.OPENAI_VISION_MODEL;
  }

  public async identify(signedImageUrl: string): Promise<VisionSceneResult> {
    const startedAt = Date.now();
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.environment.OPENAI_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 1_200,
          input: [
            {
              role: 'system',
              content:
                'You identify frames from released movies and television. Return no candidates when visual evidence is weak. Do not identify private people, infer sensitive traits, invent episode numbers or timestamps, or reveal plot events beyond what is visibly present. Candidate evidence must describe only visible production details such as costumes, sets, characters, text, or cinematography.',
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: 'Identify the movie or television title shown in this frame. Give up to three ranked candidates. Confidence must reflect uncertainty, and a visually generic frame should produce no candidate.',
                },
                { type: 'input_image', image_url: signedImageUrl, detail: 'high' },
              ],
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'cinewrapped_scene_identification',
              strict: true,
              schema: outputSchema,
            },
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const body = (await response.json()) as OpenAiResponse;
      if (!response.ok) {
        const quotaExhausted =
          response.status === 429 && body.error?.code === 'insufficient_quota';
        const rateLimited = response.status === 429 && !quotaExhausted;
        throw new AppException(
          quotaExhausted ? 503 : rateLimited ? 429 : 502,
          quotaExhausted
            ? 'SCENE_PROVIDER_QUOTA_EXHAUSTED'
            : rateLimited
              ? 'SCENE_IDENTIFICATION_RATE_LIMITED'
              : 'SCENE_PROVIDER_UNAVAILABLE',
          quotaExhausted
            ? 'Scene identification is unavailable because its provider quota has been reached.'
            : rateLimited
              ? 'Scene identification is temporarily at capacity. Please try again shortly.'
              : 'The scene-identification provider is temporarily unavailable.',
          { providerCode: body.error?.code ?? null },
        );
      }
      const text = outputText(body);
      if (text === null)
        return { sceneDescription: 'This frame could not be analyzed.', candidates: [] };
      return parseResult(text);
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw new AppException(
        502,
        'SCENE_PROVIDER_UNAVAILABLE',
        'The scene-identification provider is temporarily unavailable.',
        {
          cause: error instanceof Error ? error.name : 'UnknownError',
          elapsedMs: Date.now() - startedAt,
        },
      );
    }
  }
}
