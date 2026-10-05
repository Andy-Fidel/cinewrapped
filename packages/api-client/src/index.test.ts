import { describe, expect, it, vi } from 'vitest';

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

  it('authenticates and returns text responses', async () => {
    const fetchImplementation: typeof fetch = (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('Authorization')).toBe('Bearer test-token');
      expect(headers.get('Accept')).toContain('text/calendar');
      return Promise.resolve(
        new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n', {
          status: 200,
          headers: { 'Content-Type': 'text/calendar' },
        }),
      );
    };
    const client = new ApiClient({
      baseUrl: 'https://api.example.test/api/v1',
      accessTokenProvider: tokenProvider,
      fetchImplementation,
    });

    await expect(client.requestText('/calendar/event.ics')).resolves.toContain('VCALENDAR');
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
  it('preserves cursor metadata and authentication for archive paging', async () => {
    const client = new ApiClient({
      baseUrl: 'https://api.example.test',
      accessTokenProvider: tokenProvider,
      fetchImplementation: (url, init) => {
        expect(url).toBe('https://api.example.test/wraps?cursor=next');
        expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-token');
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              data: [{ id: 'wrap' }],
              meta: {
                requestId: 'req-page',
                page: { nextCursor: 'last', hasMore: true, limit: 30 },
              },
            }),
          ),
        );
      },
    });
    expect(await client.requestCollection('wraps?cursor=next')).toMatchObject({
      data: [{ id: 'wrap' }],
      meta: { page: { nextCursor: 'last', hasMore: true } },
    });
  });
  it('rejects missing collection metadata rather than silently truncating the archive', async () => {
    const client = new ApiClient({
      baseUrl: 'https://api.example.test',
      accessTokenProvider: tokenProvider,
      fetchImplementation: () =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: [], meta: { requestId: 'req' } })),
        ),
    });
    await expect(client.requestCollection('wraps')).rejects.toMatchObject({
      code: 'INVALID_API_RESPONSE',
    });
  });
  it('retains the no-content response contract', async () => {
    const client = new ApiClient({
      baseUrl: 'https://api.example.test',
      accessTokenProvider: tokenProvider,
      fetchImplementation: () => Promise.resolve(new Response(null, { status: 204 })),
    });
    expect(await client.request('wraps/id', { method: 'DELETE' })).toBeUndefined();
  });
  it('calls the platform fetch with its global receiver', async () => {
    const implementation = vi.fn(function (this: unknown) {
      expect(this).toBe(globalThis);
      return Promise.resolve(
        new Response(
          JSON.stringify({ success: true, data: 'ok', meta: { requestId: 'platform' } }),
        ),
      );
    });
    vi.stubGlobal('fetch', implementation);
    try {
      const client = new ApiClient({
        baseUrl: 'https://api.example.test',
        accessTokenProvider: tokenProvider,
      });
      expect(await client.request('health')).toBe('ok');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
