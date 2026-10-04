import type { CurrentUser } from '@cinewrapped/shared-types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { setOfflineOwner } from '../lib/offline-viewings';
import { api } from '../lib/api';
import { authCallbackUrl, completeAuthRedirect } from '../lib/auth-links';
import { devicePlatform, getInstallationId } from '../lib/installation';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  oauth: (provider: 'google' | 'apple') => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const bootstrapGeneration = useRef(0);
  const ownerSubject = useRef<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootstrapToken = useRef<string | null>(null);
  const bootstrapInFlight = useRef<Promise<void> | null>(null);

  const bootstrap = useCallback(
    async (nextSession: Session | null, force = false) => {
      if (nextSession && !force && bootstrapToken.current === nextSession.access_token) {
        setSession(nextSession);
        await bootstrapInFlight.current;
        return;
      }
      const generation = ++bootstrapGeneration.current;
      const subject = nextSession?.user.id ?? null;
      if (ownerSubject.current !== subject) {
        ownerSubject.current = subject;
        queryClient.clear();
        setUser(null);
        await setOfflineOwner(null, null);
      }
      if (generation !== bootstrapGeneration.current) return;
      setSession(nextSession);
      if (nextSession === null) {
        bootstrapToken.current = null;
        setUser(null);
        setLoading(false);
        return;
      }
      bootstrapToken.current = nextSession.access_token;
      const operation = (async () => {
        setLoading(true);
        try {
          const locale = Intl.DateTimeFormat().resolvedOptions().locale || 'en-US';
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const current = await api.request<CurrentUser>('auth/bootstrap', {
            method: 'POST',
            body: {
              locale,
              timezone,
              platform: devicePlatform(),
              installationId: await getInstallationId(),
            },
          });
          if (generation !== bootstrapGeneration.current) return;
          setUser(current);
          setError(null);
        } catch (reason) {
          if (generation !== bootstrapGeneration.current) return;
          bootstrapToken.current = null;
          setError(
            reason instanceof Error ? reason.message : 'Unable to load your CineWrapped profile.',
          );
        } finally {
          if (generation !== bootstrapGeneration.current) return;
          setLoading(false);
          bootstrapInFlight.current = null;
        }
      })();
      bootstrapInFlight.current = operation;
      await operation;
    },
    [queryClient],
  );

  useEffect(() => {
    let active = true;
    const handleAuthUrl = async (url: string | null) => {
      if (url === null) return;
      try {
        const handled = await completeAuthRedirect(supabase, url);
        if (handled) {
          const parsed = new URL(url);
          const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''));
          if (
            parsed.searchParams.get('type') === 'recovery' ||
            fragment.get('type') === 'recovery'
          ) {
            router.replace('/(auth)/update-password');
          }
        }
      } catch (reason) {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : 'The authentication link is invalid.',
          );
          setLoading(false);
        }
      }
    };
    const restoreSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError !== null) throw sessionError;
        await bootstrap(data.session);
      } catch {
        // A stale token can fail to refresh while the app launches. Remove only the local
        // credential so the user can sign in again instead of leaving an unhandled rejection.
        setSession(null);
        setUser(null);
        setError('We could not restore your secure session. Please sign in again.');
        setLoading(false);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      }
    };

    void restoreSession();
    void Linking.getInitialURL().then(handleAuthUrl);
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleAuthUrl(url);
    });
    const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') router.replace('/(auth)/update-password');
      if (event === 'TOKEN_REFRESHED' && nextSession !== null) setSession(nextSession);
      else void bootstrap(nextSession);
    });
    return () => {
      active = false;
      linkingSubscription.remove();
      data.subscription.unsubscribe();
    };
  }, [bootstrap]);

  const refreshUser = useCallback(async () => {
    setUser(await api.request<CurrentUser>('users/me'));
  }, []);

  const retry = useCallback(async () => {
    await bootstrap(session, true);
  }, [bootstrap, session]);

  const signOut = useCallback(async () => {
    await setOfflineOwner(null, null);
    queryClient.clear();
    try {
      await api.request(`notifications/devices/${encodeURIComponent(await getInstallationId())}`, {
        method: 'DELETE',
      });
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
  }, [queryClient]);

  const oauth = useCallback(async (provider: 'google' | 'apple') => {
    const redirectTo = authCallbackUrl;
    const { data, error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });
    if (authError !== null) throw authError;
    if (Platform.OS === 'web') return;
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
    () => ({ session, user, loading, error, retry, refreshUser, signOut, oauth }),
    [session, user, loading, error, retry, refreshUser, signOut, oauth],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
