'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

import {
  type AdminRole,
  type AdminUserSession,
  adminStore,
  hasPermission,
} from './admin-store';

interface AdminContextValue {
  session: AdminUserSession;
  setActiveRole: (role: AdminRole) => void;
  canAccess: (moduleName: string) => boolean;
}

const DEFAULT_SESSION: AdminUserSession = {
  id: 'usr-1',
  name: 'Alex Rivers',
  email: 'alex.rivers@cinewrapped.app',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  activeRole: 'SUPER_ADMINISTRATOR',
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminUserSession>(DEFAULT_SESSION);

  const setActiveRole = (role: AdminRole) => {
    setSession((prev) => ({
      ...prev,
      activeRole: role,
    }));
  };

  const canAccess = (moduleName: string) => {
    return hasPermission(session.activeRole, moduleName);
  };

  return (
    <AdminContext.Provider value={{ session, setActiveRole, canAccess }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within an AdminProvider');
  return ctx;
}
