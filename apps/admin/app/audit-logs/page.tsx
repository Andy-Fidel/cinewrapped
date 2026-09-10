'use client';

import { useQuery } from '@tanstack/react-query';

import { Card } from '../../components/ui/card';
import { adminApi } from '../../lib/admin-api';
import type { AuditLogEntry } from '../../lib/admin-types';

export default function AuditLogsPage() {
  const logs = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: () => adminApi<AuditLogEntry[]>('/admin/audit-logs?take=100'),
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white">Audit logs</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Newest authenticated security and administrative events.
        </p>
      </div>
      {logs.isPending && <p className="text-sm text-zinc-400">Loading audit ledger…</p>}
      {logs.isError && (
        <p role="alert" className="text-sm text-red-400">
          {logs.error.message}
        </p>
      )}
      {logs.data && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400">
              <tr>
                <th className="p-4">Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Request</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.data.map((log) => (
                <tr key={log.id} className="text-zinc-300">
                  <td className="p-4 whitespace-nowrap">
                    {new Date(log.occurredAt).toLocaleString()}
                  </td>
                  <td>{log.actor}</td>
                  <td className="font-mono text-zinc-200">{log.action}</td>
                  <td>
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId.slice(0, 8)}` : ''}
                  </td>
                  <td className="max-w-xs truncate">{log.reason ?? '—'}</td>
                  <td className="font-mono text-zinc-500">{log.requestId?.slice(0, 10) ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
