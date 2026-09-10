'use client';

import { BookOpen, LayoutDashboard, Shield, ShieldAlert, ToggleLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAdmin } from '../lib/admin-context';
import type { AdminRole } from '../lib/admin-types';

const navigation: Array<{
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: AdminRole[];
}> = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: [
      'SUPER_ADMINISTRATOR',
      'CONTENT_MODERATOR',
      'COMMUNITY_MODERATOR',
      'SUPPORT_AGENT',
      'ANALYST',
    ],
  },
  {
    name: 'Reports',
    href: '/moderation/reports',
    icon: ShieldAlert,
    roles: ['SUPER_ADMINISTRATOR', 'CONTENT_MODERATOR', 'COMMUNITY_MODERATOR'],
  },
  {
    name: 'Users & Roles',
    href: '/users',
    icon: Shield,
    roles: ['SUPER_ADMINISTRATOR', 'SUPPORT_AGENT'],
  },
  {
    name: 'Feature Flags',
    href: '/feature-flags',
    icon: ToggleLeft,
    roles: ['SUPER_ADMINISTRATOR', 'ANALYST'],
  },
  {
    name: 'Audit Logs',
    href: '/audit-logs',
    icon: BookOpen,
    roles: ['SUPER_ADMINISTRATOR', 'ANALYST'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { hasRole } = useAdmin();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800/80 px-6">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-red-600 font-extrabold text-white">
          C
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white">CineWrapped</h1>
          <p className="text-[11px] text-zinc-500">Secure operations</p>
        </div>
      </div>
      <nav className="space-y-1 p-4" aria-label="Admin navigation">
        {navigation
          .filter((item) => hasRole(...item.roles))
          .map((item) => {
            const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-red-600 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
      </nav>
      <p className="mt-auto p-5 text-[10px] leading-relaxed text-zinc-600">
        Administrative actions are authenticated, role checked, and written to the audit ledger.
      </p>
    </aside>
  );
}
