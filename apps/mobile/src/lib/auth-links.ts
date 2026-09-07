import type { SupabaseClient } from '@supabase/supabase-js';

export function getAuthCallbackUrl(webOrigin?: string): string {
  return webOrigin === undefined
    ? 'cinewrapped://auth/callback'
    : new URL('/auth/callback', webOrigin).toString();
}

export const authCallbackUrl = getAuthCallbackUrl(
  typeof window === 'undefined' ? undefined : window.location.origin,
);
export const passwordRecoveryUrl = authCallbackUrl;

export async function completeAuthRedirect(
  client: Pick<SupabaseClient, 'auth'>,
  url: string,
): Promise<boolean> {
  if (!url.startsWith('cinewrapped://')) return false;

  const parsed = new URL(url);
  const query = parsed.searchParams;
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const errorDescription = query.get('error_description') ?? fragment.get('error_description');
  if (errorDescription !== null) throw new Error(errorDescription.replace(/\+/g, ' '));

  const code = query.get('code');
  if (code !== null) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error !== null) throw error;
    return true;
  }

  const accessToken = fragment.get('access_token');
  const refreshToken = fragment.get('refresh_token');
  if (accessToken !== null && refreshToken !== null) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error !== null) throw error;
    return true;
  }

  return false;
}
