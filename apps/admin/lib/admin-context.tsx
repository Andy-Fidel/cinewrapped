'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { adminApi } from './admin-api';
import type { AdminRole, AdminSession } from './admin-types';
import { supabase } from './supabase';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'forbidden';

interface AdminContextValue {
  session: AdminSession | null;
  status: SessionStatus;
  error: string | null;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (...roles: AdminRole[]) => boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const auth = await supabase.auth.getSession();
    if (!auth.data.session) {
      setSession(null);
      setStatus('unauthenticated');
      return;
    }
    try {
      const nextSession = await adminApi<AdminSession>('/admin/session');
      setSession(nextSession);
      setError(null);
      setStatus('authenticated');
    } catch (caught) {
      setSession(null);
      setError(caught instanceof Error ? caught.message : 'Administrator access was denied.');
      setStatus('forbidden');
    }
  }, []);

  useEffect(() => {
    void refreshSession();
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void refreshSession(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [refreshSession]);

  const value = useMemo<AdminContextValue>(
    () => ({
      session,
      status,
      error,
      refreshSession,
      signOut: async () => {
        await supabase.auth.signOut();
        setSession(null);
        setStatus('unauthenticated');
      },
      hasRole: (...roles) => session?.roles.some((role) => roles.includes(role)) ?? false,
    }),
    [error, refreshSession, session, status],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) throw new Error('useAdmin must be used within AdminProvider.');
  return context;
}
