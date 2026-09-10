'use client';

import { AlertTriangle, Film, ShieldAlert, Users, UsersRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { StatCard } from '../components/ui/stat-card';
import { adminApi } from '../lib/admin-api';
import type { DashboardData } from '../lib/admin-types';

export default function AdminDashboardPage() {
  const dashboard = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi<DashboardData>('/admin/dashboard'),
  });

  if (dashboard.isPending) return <p className="text-sm text-zinc-400">Loading live operations…</p>;
  if (dashboard.isError) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {dashboard.error.message}
      </p>
    );
  }
  const { counts, recentReports } = dashboard.data;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
          Live operations
        </p>
        <h2 className="mt-1 text-3xl font-extrabold text-white">Admin dashboard</h2>
        <p className="mt-2 text-sm text-zinc-400">Production data from the CineWrapped API.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Members" value={counts.users} icon={Users} colorVariant="blue" />
        <StatCard
          title="Published reviews"
          value={counts.reviews}
          icon={Film}
          colorVariant="purple"
        />
        <StatCard title="Clubs" value={counts.clubs} icon={UsersRound} colorVariant="emerald" />
        <StatCard
          title="Pending reports"
          value={counts.pendingReports}
          icon={ShieldAlert}
          colorVariant="amber"
        />
        <StatCard
          title="Failed events"
          value={counts.failedJobs}
          icon={AlertTriangle}
          colorVariant="red"
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent safety reports</CardTitle>
          <CardDescription>The five newest member reports in the audit ledger.</CardDescription>
        </CardHeader>
        <div className="divide-y divide-zinc-800">
          {recentReports.length === 0 && (
            <p className="py-6 text-sm text-zinc-500">No reports recorded.</p>
          )}
          {recentReports.map((report) => (
            <div key={report.id} className="flex items-center justify-between gap-4 py-4 text-sm">
              <div>
                <p className="font-semibold text-zinc-200">
                  {report.targetType} · {report.reason ?? 'No reason supplied'}
                </p>
                <p className="mt-1 text-xs text-zinc-500">Reported by {report.reporter}</p>
              </div>
              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300">
                {report.status}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
