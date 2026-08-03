import type { ErrorResponse, SuccessResponse } from '@cinewrapped/shared-types';

export interface AccessTokenProvider {
  getAccessToken(): Promise<string | null>;
}

export interface ApiClientOptions {
  baseUrl: string;
  accessTokenProvider: AccessTokenProvider;
  fetchImplementation?: typeof fetch;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export class ApiClientError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId: string,
    public readonly details: Record<string, unknown> | null,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { success?: unknown; error?: unknown };
  if (
    candidate.success !== false ||
    typeof candidate.error !== 'object' ||
    candidate.error === null
  ) {
    return false;
  }
  const error = candidate.error as { code?: unknown; message?: unknown; requestId?: unknown };
  return (
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.requestId === 'string'
  );
}

export class ApiClient {
  readonly #baseUrl: string;
  readonly #accessTokenProvider: AccessTokenProvider;
  readonly #fetch: typeof fetch;

  public constructor(options: ApiClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/u, '');
    this.#accessTokenProvider = options.accessTokenProvider;
    this.#fetch = options.fetchImplementation ?? fetch;
  }

  public async request<TData>(path: string, options: ApiRequestOptions = {}): Promise<TData> {
    const { body, headers: headerValues, idempotencyKey, ...requestInit } = options;
    const accessToken = await this.#accessTokenProvider.getAccessToken();
    const headers = new Headers(headerValues);
    headers.set('Accept', 'application/json');
    if (accessToken !== null) headers.set('Authorization', `Bearer ${accessToken}`);
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (idempotencyKey !== undefined) {
      headers.set('Idempotency-Key', idempotencyKey);
    }

    const response = await this.#fetch(`${this.#baseUrl}/${path.replace(/^\//u, '')}`, {
      ...requestInit,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });

    if (response.status === 204) return undefined as TData;

    const payload: unknown = await response.json();
    if (!response.ok) {
      if (isErrorResponse(payload)) {
        throw new ApiClientError(
          response.status,
          payload.error.code,
          payload.error.message,
          payload.error.requestId,
          payload.error.details,
        );
      }
      throw new ApiClientError(
        response.status,
        'INVALID_API_RESPONSE',
        'The API returned an invalid error response.',
        response.headers.get('X-Request-ID') ?? 'unknown',
        null,
      );
    }

    const success = payload as SuccessResponse<TData>;
    return success.data;
  }
}
