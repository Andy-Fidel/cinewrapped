import type { ApiEnvironment } from '@cinewrapped/config';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenAiSceneProvider } from '../src/scene-identification/openai-scene.provider.js';

const environment = {
  OPENAI_API_KEY: 'test-key-that-is-never-sent-to-a-real-provider',
  OPENAI_VISION_MODEL: 'gpt-5.4-mini',
} as ApiEnvironment;

describe('OpenAiSceneProvider', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends a non-stored vision request and parses structured candidates', async () => {
    const request = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
      if (typeof init?.body !== 'string') throw new Error('Expected a JSON request body.');
      const body = JSON.parse(init.body) as Record<string, unknown>;
      expect(body.store).toBe(false);
      expect(body.model).toBe('gpt-5.4-mini');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: 'resp_test',
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: JSON.stringify({
                      sceneDescription: 'A lone figure stands in a desert landscape.',
                      candidates: [
                        {
                          title: 'Dune: Part Two',
                          releaseYear: 2024,
                          mediaType: 'MOVIE',
                          confidence: 87,
                          evidence: ['Desert costume design', 'Orange cinematography'],
                        },
                      ],
                    }),
                  },
                ],
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    });
    vi.stubGlobal('fetch', request);

    const result = await new OpenAiSceneProvider(environment).identify(
      'https://example.supabase.co/storage/v1/object/sign/scene-identification/image.jpg?token=signed',
    );

    expect(result.candidates[0]).toMatchObject({
      title: 'Dune: Part Two',
      confidence: 87,
    });
    expect(request).toHaveBeenCalledOnce();
  });

  it('distinguishes exhausted provider quota from transient rate limiting', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'insufficient_quota', message: 'Quota exhausted' } }),
            { status: 429, headers: { 'content-type': 'application/json' } },
          ),
        ),
      ),
    );

    await expect(
      new OpenAiSceneProvider(environment).identify('https://example.com/frame.jpg'),
    ).rejects.toMatchObject({
      code: 'SCENE_PROVIDER_QUOTA_EXHAUSTED',
      status: 503,
    });
  });
});
