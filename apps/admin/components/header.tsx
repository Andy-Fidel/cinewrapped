'use client';

import { Bell, Search, ShieldCheck, UserCheck } from 'lucide-react';

import { useAdmin } from '../lib/admin-context';
import type { AdminRole } from '../lib/admin-store';
import { Badge } from './ui/badge';

const ROLES_LIST: { role: AdminRole; label: string; color: string }[] = [
  { role: 'SUPER_ADMINISTRATOR', label: 'Super Administrator', color: 'text-red-400' },
  { role: 'CONTENT_MODERATOR', label: 'Content Moderator', color: 'text-purple-400' },
  { role: 'COMMUNITY_MODERATOR', label: 'Community Moderator', color: 'text-emerald-400' },
  { role: 'SUPPORT_AGENT', label: 'Support Agent', color: 'text-sky-400' },
  { role: 'ANALYST', label: 'Analyst', color: 'text-amber-400' },
];

export function Header() {
  const { session, setActiveRole } = useAdmin();

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Global Search Bar */}
      <div className="relative w-80 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search users, movies, reviews, clubs, logs…"
          className="w-full h-9 pl-9 pr-4 text-xs rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50 focus:border-red-500/50 transition-all"
        />
      </div>

      {/* Role Switcher & Profile Actions */}
      <div className="flex items-center gap-4">
        {/* Role Selector Badge */}
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-1.5 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-red-400" />
          <span className="text-xs text-zinc-400 font-medium">Viewing as:</span>
          <select
            value={session.activeRole}
            onChange={(e) => setActiveRole(e.target.value as AdminRole)}
            className="bg-transparent text-xs font-bold text-zinc-200 focus:outline-none cursor-pointer"
          >
            {ROLES_LIST.map((r) => (
              <option key={r.role} value={r.role} className="bg-zinc-900 text-zinc-100">
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Audit Status Pill */}
        <Badge variant="success" className="gap-1 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Audit Ledger Active
        </Badge>
      </div>
    </header>
  );
}
