import { supabase } from './supabase';

interface SuccessEnvelope<TData> {
  success: true;
  data: TData;
  meta: { requestId: string };
}

interface ErrorEnvelope {
  success: false;
  error: { code: string; message: string; requestId?: string };
}

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
if (!apiBaseUrl) throw new Error('NEXT_PUBLIC_API_BASE_URL is required.');

export class AdminApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
  }
}

export async function adminApi<TData>(path: string, init: RequestInit = {}): Promise<TData> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new AdminApiError(401, 'AUTH_REQUIRED', 'Sign in to continue.');
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    SuccessEnvelope<TData> | ErrorEnvelope | null;
  if (!response.ok || payload === null || payload.success === false) {
    const failure = payload !== null && payload.success === false ? payload.error : null;
    throw new AdminApiError(
      response.status,
      failure?.code ?? 'ADMIN_API_ERROR',
      failure?.message ?? 'The admin service could not complete the request.',
      failure?.requestId,
    );
  }
  return payload.data;
}
