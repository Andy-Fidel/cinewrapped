'use client';

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Server,
  ShieldAlert,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Modal } from '../components/ui/modal';
import { StatCard } from '../components/ui/stat-card';
import { useAdmin } from '../lib/admin-context';
import { adminStore, type ModerationReport } from '../lib/admin-store';

export default function AdminDashboardPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [activeReportModal, setActiveReportModal] = useState<ModerationReport | null>(null);
  const [resolveReason, setResolveReason] = useState('');

  const pendingReports = adminStore.reports.filter((r) => r.status === 'PENDING');
  const activeJobs = adminStore.jobs.reduce((acc, j) => acc + j.activeCount, 0);
  const operationalProviders = adminStore.providers.filter(
    (p) => p.status === 'OPERATIONAL',
  ).length;

  const handleResolve = (action: 'RESOLVED' | 'DISMISSED') => {
    if (!activeReportModal) return;
    adminStore.resolveReport(
      session,
      activeReportModal.id,
      action,
      resolveReason || `Report ${action.toLowerCase()} from Dashboard triage`,
    );
    setActiveReportModal(null);
    setResolveReason('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Operational Command Center
            </h1>
            <Badge variant="purple" className="font-mono text-[11px]">
              v2.4-PROD
            </Badge>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Welcome back, <span className="text-zinc-200 font-semibold">{session.name}</span>.
            Currently operating as{' '}
            <span className="text-red-400 font-bold">{session.activeRole.replace(/_/gu, ' ')}</span>
            .
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/moderation/reports">
            <Button variant="danger" size="sm" className="gap-2">
              <ShieldAlert className="h-4 w-4" />
              Triage Reports ({pendingReports.length})
            </Button>
          </Link>
          <Link href="/audit-logs">
            <Button variant="secondary" size="sm" className="gap-2">
              <Clock className="h-4 w-4" />
              Audit Stream
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Cinephiles"
          value="48,920"
          description="DAU / MAU: 32.4%"
          trend={{ value: '14.2%', isPositive: true }}
          icon={Users}
          colorVariant="red"
        />
        <StatCard
          title="Moderation Queue"
          value={pendingReports.length}
          description="Avg response time: 4.2m"
          trend={{ value: '28%', isPositive: false }}
          icon={ShieldAlert}
          colorVariant="amber"
        />
        <StatCard
          title="Provider Sync Health"
          value={`${operationalProviders} / ${adminStore.providers.length}`}
          description="TMDB, JustWatch, Apple"
          trend={{ value: '99.98%', isPositive: true }}
          icon={Radio}
          colorVariant="emerald"
        />
        <StatCard
          title="Active Job Workers"
          value={`${activeJobs} tasks`}
          description="91.2k jobs completed 24h"
          trend={{ value: '0.01% fail', isPositive: true }}
          icon={Server}
          colorVariant="blue"
        />
      </div>

      {/* Main Grid: Priority Triage Queue & Infrastructure Pulse */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Priority Reports Queue */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Priority Moderation Triage
                </CardTitle>
                <CardDescription>
                  Pending items flagged by community members and automated sentiment analysis
                </CardDescription>
              </div>
              <Link
                href="/moderation/reports"
                className="text-xs text-red-400 font-semibold hover:underline"
              >
                View all ({pendingReports.length}) →
              </Link>
            </CardHeader>

            <div className="divide-y divide-zinc-800/60">
              {pendingReports.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  All clear! No pending moderation reports in the triage queue.
                </div>
              ) : (
                pendingReports.slice(0, 4).map((report) => (
                  <div
                    key={report.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-800/30 p-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            report.severity === 'HIGH'
                              ? 'danger'
                              : report.severity === 'MEDIUM'
                                ? 'warning'
                                : 'default'
                          }
                        >
                          {report.severity}
                        </Badge>
                        <Badge variant="outline">{report.targetType}</Badge>
                        <span className="text-xs text-zinc-500 font-mono">{report.reason}</span>
                      </div>
                      <h4 className="text-sm font-bold text-zinc-100">{report.targetTitle}</h4>
                      <p className="text-xs text-zinc-400 line-clamp-1 italic font-serif bg-zinc-950/40 px-2 py-1 rounded border border-zinc-800/40">
                        "{report.targetSnippet}"
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Flagged by{' '}
                        <span className="text-zinc-300 font-semibold">{report.reporterName}</span>{' '}
                        against{' '}
                        <span className="text-zinc-300 font-semibold">{report.authorName}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveReportModal(report)}
                      >
                        Action
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Launch Operations Bar */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/feature-flags">
              <Card className="hover:border-zinc-700 transition-all p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Features
                </p>
                <h4 className="text-lg font-bold text-white mt-1">Feature Flags</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Toggle runtime rollout percentages</p>
              </Card>
            </Link>
            <Link href="/campaigns">
              <Card className="hover:border-zinc-700 transition-all p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Broadcast
                </p>
                <h4 className="text-lg font-bold text-white mt-1">Push Campaigns</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Send targeted notifications</p>
              </Card>
            </Link>
            <Link href="/curation/featured-lists">
              <Card className="hover:border-zinc-700 transition-all p-4">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Editorial
                </p>
                <h4 className="text-lg font-bold text-white mt-1">Featured Shelves</h4>
                <p className="text-xs text-zinc-500 mt-0.5">Manage home & radar picks</p>
              </Card>
            </Link>
          </div>
        </div>

        {/* Right Col: Live System Pulse & Recent Audits */}
        <div className="space-y-6">
          {/* Provider Sync Health Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-emerald-400" />
                Provider Sync Status
              </CardTitle>
              <CardDescription>Live streaming and metadata ingest connections</CardDescription>
            </CardHeader>
            <div className="space-y-3">
              {adminStore.providers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-950/50 border border-zinc-800/60 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-zinc-200">{p.name.split('(')[0]}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Latency: <span className="text-zinc-300 font-mono">{p.latencyMs}ms</span> ·
                      Quota: {p.dailyApiQuotaUsedPercent}%
                    </p>
                  </div>
                  <Badge variant="success">Active</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Audit Ledger Snippet */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-sky-400" />
                  Recent Audit Trail
                </CardTitle>
                <CardDescription>Immutable administrative actions</CardDescription>
              </div>
              <Link
                href="/audit-logs"
                className="text-xs text-red-400 hover:underline font-semibold"
              >
                All Logs →
              </Link>
            </CardHeader>

            <div className="space-y-3 mt-3">
              {adminStore.audits.slice(0, 4).map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/40 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-300">{audit.actorName}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(audit.occurredAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-red-400 font-mono text-[11px] mt-0.5">{audit.action}</p>
                  <p className="text-zinc-400 text-[11px] line-clamp-1 mt-0.5">{audit.reason}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Action Report Modal */}
      <Modal
        isOpen={activeReportModal !== null}
        onClose={() => setActiveReportModal(null)}
        title="Resolve Moderation Report"
        description={
          activeReportModal
            ? `Reviewing report on ${activeReportModal.targetType}: "${activeReportModal.targetTitle}"`
            : undefined
        }
      >
        {activeReportModal && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1 text-xs">
              <p className="text-zinc-400">Content Snippet:</p>
              <p className="font-serif italic text-zinc-200">"{activeReportModal.targetSnippet}"</p>
              <p className="text-[11px] text-amber-400 pt-1">Reason: {activeReportModal.reason}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Administrative Resolution Reason (Required for Audit Log)
              </label>
              <textarea
                value={resolveReason}
                onChange={(e) => setResolveReason(e.target.value)}
                placeholder="Explain the moderation rationale..."
                rows={3}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setActiveReportModal(null)}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleResolve('DISMISSED')}>
                Dismiss Report
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleResolve('RESOLVED')}>
                Take Action & Resolve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
