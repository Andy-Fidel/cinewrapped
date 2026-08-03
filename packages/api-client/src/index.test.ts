import { describe, expect, it } from 'vitest';

import { ApiClient } from './index.js';
import type { ApiClientError } from './index.js';

const tokenProvider = { getAccessToken: () => Promise.resolve('test-token') };

describe('ApiClient', () => {
  it('attaches authentication and returns envelope data', async () => {
    const fetchImplementation: typeof fetch = (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: { ready: true }, meta: { requestId: 'req-1' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    };
    const client = new ApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      accessTokenProvider: tokenProvider,
      fetchImplementation,
    });

    await expect(client.request<{ ready: boolean }>('/health')).resolves.toEqual({ ready: true });
  });

  it('forwards idempotency keys on mutation requests', async () => {
    const fetchImplementation: typeof fetch = (_input, init) => {
      expect(new Headers(init?.headers).get('Idempotency-Key')).toBe('phase-one-request-123');
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: {}, meta: { requestId: 'req-3' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    };
    const client = new ApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      accessTokenProvider: tokenProvider,
      fetchImplementation,
    });

    await client.request('/auth/bootstrap', {
      method: 'POST',
      idempotencyKey: 'phase-one-request-123',
    });
  });

  it('throws a typed error from the API error envelope', async () => {
    const fetchImplementation: typeof fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: 'VERSION_CONFLICT',
              message: 'The resource changed.',
              details: null,
              requestId: 'req-2',
            },
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    const client = new ApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      accessTokenProvider: tokenProvider,
      fetchImplementation,
    });

    await expect(client.request('/resource')).rejects.toMatchObject({
      status: 409,
      code: 'VERSION_CONFLICT',
      requestId: 'req-2',
    } satisfies Partial<ApiClientError>);
  });
});
