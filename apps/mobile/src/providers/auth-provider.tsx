import type { CurrentUser } from '@cinewrapped/shared-types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  oauth: (provider: 'google' | 'apple') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const installationKey = 'cinewrapped.installation-id';

async function installationId(): Promise<string> {
  if (Platform.OS === 'web') return `web-${globalThis.crypto.randomUUID()}`;
  const current = await SecureStore.getItemAsync(installationKey);
  if (current !== null) return current;
  const created = globalThis.crypto.randomUUID();
  await SecureStore.setItemAsync(installationKey, created);
  return created;
}

function platform(): 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN' {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'web') return 'WEB';
  return 'UNKNOWN';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bootstrap = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (nextSession === null) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const current = await api.request<CurrentUser>('auth/bootstrap', {
        method: 'POST',
        idempotencyKey: `bootstrap-${globalThis.crypto.randomUUID()}`,
        body: { locale, timezone, platform: platform(), installationId: await installationId() },
      });
      setUser(current);
      setError(null);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load your CineWrapped profile.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => bootstrap(data.session));
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') router.replace('/(auth)/update-password');
      void bootstrap(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, [bootstrap]);

  const refreshUser = useCallback(async () => {
    setUser(await api.request<CurrentUser>('users/me'));
  }, []);

  const signOut = useCallback(async () => {
    try {
      const sessions = await api.request<Array<{ id: string; current: boolean }>>('auth/sessions');
      const current = sessions.find((candidate) => candidate.current);
      if (current !== undefined) {
        await api.request(`auth/sessions/${encodeURIComponent(current.id)}`, { method: 'DELETE' });
      }
    } catch {
      // Supabase remains the credential authority; local logout must still proceed if registry cleanup fails.
    }
    const { error: authError } = await supabase.auth.signOut();
    if (authError !== null) throw authError;
  }, []);

  const oauth = useCallback(async (provider: 'google' | 'apple') => {
    const redirectTo = Linking.createURL('/auth/callback');
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (authError !== null) throw authError;
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const parameters = new URL(result.url).searchParams;
      const code = parameters.get('code');
      if (code !== null) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError !== null) throw exchangeError;
      }
    }
  }, []);

  const value = useMemo(
    () => ({ session, user, loading, error, refreshUser, signOut, oauth }),
    [session, user, loading, error, refreshUser, signOut, oauth],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
