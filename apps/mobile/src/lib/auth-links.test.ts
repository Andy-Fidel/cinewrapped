import { describe, expect, it, vi } from 'vitest';

import { authCallbackUrl, completeAuthRedirect, getAuthCallbackUrl } from './auth-links';

function client() {
  return {
    auth: {
      exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      setSession: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe('completeAuthRedirect', () => {
  it('exchanges a PKCE confirmation code', async () => {
    const supabase = client();
    await expect(
      completeAuthRedirect(supabase as never, `${authCallbackUrl}?code=abc`),
    ).resolves.toBe(true);
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('restores an implicit confirmation session', async () => {
    const supabase = client();
    await expect(
      completeAuthRedirect(
        supabase as never,
        `${authCallbackUrl}#access_token=access&refresh_token=refresh&type=signup`,
      ),
    ).resolves.toBe(true);
    expect(supabase.auth.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });

  it('ignores unrelated links', async () => {
    await expect(completeAuthRedirect(client() as never, 'https://example.com')).resolves.toBe(
      false,
    );
  });
});

describe('auth callback destinations', () => {
  it('uses the production website origin for browser sign-in', () => {
    expect(getAuthCallbackUrl('https://cinewrapped-web.onrender.com')).toBe(
      'https://cinewrapped-web.onrender.com/auth/callback',
    );
  });
  it('retains the native scheme and supports local web development', () => {
    expect(getAuthCallbackUrl()).toBe('cinewrapped://auth/callback');
    expect(getAuthCallbackUrl('http://localhost:8081')).toBe('http://localhost:8081/auth/callback');
  });
});
