'use client';

import { CheckCircle, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Modal } from '../../../components/ui/modal';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore, type ModerationReport } from '../../../lib/admin-store';

export default function ReportsQueuePage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>(
    'PENDING',
  );
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const [activeReport, setActiveReport] = useState<ModerationReport | null>(null);
  const [resolveAction, setResolveAction] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [adminReason, setAdminReason] = useState('');

  const reports = adminStore.reports.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSeverity = severityFilter === 'ALL' || r.severity === severityFilter;
    return matchesStatus && matchesSeverity;
  });

  const handleResolve = () => {
    if (!activeReport) return;
    adminStore.resolveReport(
      session,
      activeReport.id,
      resolveAction,
      adminReason || `Report ${resolveAction.toLowerCase()} by moderator`,
    );
    setActiveReport(null);
    setAdminReason('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-amber-500" />
          Community Safety & Moderation Queue
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review, action, and triage flagged reviews, comments, clubs, and user accounts.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl">
          {(['PENDING', 'RESOLVED', 'DISMISSED', 'ALL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === tab
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="h-9 px-3 text-xs rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Severities</option>
          <option value="HIGH">High Severity</option>
          <option value="MEDIUM">Medium Severity</option>
          <option value="LOW">Low Severity</option>
        </select>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {reports.length === 0 ? (
          <Card className="py-16 text-center text-zinc-500 text-sm">
            <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            No reports in this category.
          </Card>
        ) : (
          reports.map((report) => (
            <Card key={report.id} className="p-5 hover:border-zinc-700 transition-all">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        report.severity === 'HIGH'
                          ? 'danger'
                          : report.severity === 'MEDIUM'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {report.severity} Priority
                    </Badge>
                    <Badge variant="outline">{report.targetType}</Badge>
                    <Badge
                      variant={
                        report.status === 'PENDING'
                          ? 'warning'
                          : report.status === 'RESOLVED'
                            ? 'success'
                            : 'outline'
                      }
                    >
                      {report.status}
                    </Badge>
                    <span className="text-xs text-zinc-500 font-mono">#{report.id}</span>
                  </div>

                  <h3 className="text-base font-bold text-zinc-100">{report.targetTitle}</h3>

                  <div className="bg-zinc-950/70 border border-zinc-800/80 p-3 rounded-xl">
                    <p className="text-xs text-zinc-300 font-serif italic">
                      "{report.targetSnippet}"
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span>
                      Reported by <strong className="text-zinc-300">{report.reporterName}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Target author: <strong className="text-zinc-300">{report.authorName}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-amber-400 font-medium font-mono">{report.reason}</span>
                  </div>
                </div>

                {report.status === 'PENDING' ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveReport(report);
                        setResolveAction('DISMISSED');
                      }}
                    >
                      Dismiss
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        setActiveReport(report);
                        setResolveAction('RESOLVED');
                      }}
                    >
                      Take Action
                    </Button>
                  </div>
                ) : (
                  <div className="text-right text-xs text-zinc-500">
                    <p>Resolved by {report.resolvedBy ?? 'Moderator'}</p>
                    <p className="text-[11px] text-zinc-600 font-mono">{report.resolvedAt}</p>
                  </div>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Resolution Modal */}
      <Modal
        isOpen={activeReport !== null}
        onClose={() => setActiveReport(null)}
        title={resolveAction === 'RESOLVED' ? 'Action and Resolve Report' : 'Dismiss Report'}
        description={`Target: ${activeReport?.targetTitle}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Moderator Rationale (Audit Record)
            </label>
            <textarea
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="e.g. Unmarked spoiler confirmed. Content flagged and user issued a warning."
              rows={3}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)}>
              Cancel
            </Button>
            <Button
              variant={resolveAction === 'RESOLVED' ? 'danger' : 'secondary'}
              size="sm"
              onClick={handleResolve}
            >
              Confirm {resolveAction}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
