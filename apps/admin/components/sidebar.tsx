'use client';

import { clsx } from 'clsx';
import {
  Activity,
  Award,
  BellRing,
  BookOpen,
  Calendar,
  CheckSquare,
  Database,
  Film,
  Flame,
  LayoutDashboard,
  ListOrdered,
  MessageSquare,
  Radio,
  Server,
  Shield,
  ShieldAlert,
  Sparkles,
  ToggleLeft,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAdmin } from '../lib/admin-context';
import { adminStore } from '../lib/admin-store';

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  module: string;
  badge?: number;
}

export function Sidebar() {
  const pathname = usePathname();
  const { canAccess, session } = useAdmin();

  const pendingReportsCount = adminStore.reports.filter((r) => r.status === 'PENDING').length;
  const flaggedReviewsCount = adminStore.reviews.filter((r) => r.flagCount > 0).length;

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
        { name: 'Analytics', href: '/analytics', icon: Activity, module: 'analytics' },
      ],
    },
    {
      title: 'Moderation & Safety',
      items: [
        {
          name: 'Reports Queue',
          href: '/moderation/reports',
          icon: ShieldAlert,
          module: 'reports',
          badge: pendingReportsCount,
        },
        {
          name: 'Reviews',
          href: '/moderation/reviews',
          icon: Film,
          module: 'reviews',
          badge: flaggedReviewsCount,
        },
        {
          name: 'Comments',
          href: '/moderation/comments',
          icon: MessageSquare,
          module: 'comments',
        },
        {
          name: 'Clubs',
          href: '/moderation/clubs',
          icon: Users,
          module: 'clubs',
        },
      ],
    },
    {
      title: 'Community & Engagement',
      items: [
        { name: 'Users & Roles', href: '/users', icon: Shield, module: 'users' },
        {
          name: 'Achievements',
          href: '/gamification/achievements',
          icon: Award,
          module: 'achievements',
        },
        {
          name: 'Challenges',
          href: '/gamification/challenges',
          icon: Flame,
          module: 'challenges',
        },
        {
          name: 'Campaigns',
          href: '/campaigns',
          icon: BellRing,
          module: 'campaigns',
        },
      ],
    },
    {
      title: 'Editorial & Curation',
      items: [
        {
          name: 'Featured Lists',
          href: '/curation/featured-lists',
          icon: ListOrdered,
          module: 'featured-lists',
        },
        {
          name: 'Collections',
          href: '/curation/collections',
          icon: Sparkles,
          module: 'collections',
        },
      ],
    },
    {
      title: 'Infrastructure & Ops',
      items: [
        {
          name: 'Providers Sync',
          href: '/operations/providers',
          icon: Radio,
          module: 'providers',
        },
        {
          name: 'Background Jobs',
          href: '/operations/jobs',
          icon: Server,
          module: 'jobs',
        },
        {
          name: 'Feature Flags',
          href: '/feature-flags',
          icon: ToggleLeft,
          module: 'feature-flags',
        },
        {
          name: 'Audit Logs',
          href: '/audit-logs',
          icon: BookOpen,
          module: 'audit-logs',
        },
      ],
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl flex flex-col justify-between h-screen sticky top-0">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 gap-3 border-b border-zinc-800/80">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shadow-lg shadow-red-600/30">
            <span className="font-extrabold text-white text-lg tracking-wider">C</span>
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
              CineWrapped
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-red-600/20 text-red-400 border border-red-500/30">
                OPS
              </span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-medium">Operations & Moderation</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {sections.map((section) => {
            const visibleItems = section.items.filter((item) => canAccess(item.module));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold tracking-wider text-zinc-300 uppercase">
                  {section.title}
                </p>
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        'flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group',
                        isActive
                          ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={clsx(
                            'h-4 w-4 transition-colors',
                            isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200',
                          )}
                        />
                        <span>{item.name}</span>
                      </div>
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={clsx(
                            'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                            isActive
                              ? 'bg-black/30 text-white'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Scope Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <img
            src={session.avatarUrl}
            alt={session.name}
            className="h-8 w-8 rounded-full border border-zinc-700 object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate">{session.name}</p>
            <p className="text-[10px] text-zinc-400 font-medium truncate">
              {session.activeRole.replace(/_/gu, ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
