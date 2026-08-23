import { describe, expect, it, vi } from 'vitest';

import { authCallbackUrl, completeAuthRedirect } from './auth-links';

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
