'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { adminApi } from '../../../lib/admin-api';
import type { AdminReport } from '../../../lib/admin-types';

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState<Record<string, string>>({});
  const reports = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => adminApi<AdminReport[]>('/admin/reports?take=100'),
  });
  const resolve = useMutation({
    mutationFn: ({ id, resolution }: { id: string; resolution: 'RESOLVED' | 'DISMISSED' }) =>
      adminApi<AdminReport>(`/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ resolution, reason: reason[id]?.trim() }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white">Reports queue</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Review and resolve reports with a required audit reason.
        </p>
      </div>
      {reports.isPending && <p className="text-sm text-zinc-400">Loading reports…</p>}
      {reports.isError && (
        <p role="alert" className="text-sm text-red-400">
          {reports.error.message}
        </p>
      )}
      {resolve.isError && (
        <p role="alert" className="text-sm text-red-400">
          {resolve.error.message}
        </p>
      )}
      <div className="space-y-4">
        {reports.data?.map((report) => (
          <Card key={report.id}>
            <div className="flex flex-col justify-between gap-5 lg:flex-row">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-xs">
                    {report.status}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(report.occurredAt).toLocaleString()}
                  </span>
                </div>
                <h3 className="font-bold text-zinc-100">
                  {report.targetType} · {report.reason ?? 'Unspecified'}
                </h3>
                <p className="text-sm text-zinc-400">
                  {report.details ?? 'No additional details.'}
                </p>
                <p className="text-xs text-zinc-500">
                  Reporter: {report.reporter} · Target: {report.targetId ?? 'unavailable'}
                </p>
              </div>
              {report.status === 'PENDING' && (
                <div className="w-full space-y-2 lg:w-80">
                  <textarea
                    aria-label={`Resolution reason for ${report.id}`}
                    placeholder="Resolution reason (minimum 8 characters)"
                    value={reason[report.id] ?? ''}
                    onChange={(event) =>
                      setReason((current) => ({ ...current, [report.id]: event.target.value }))
                    }
                    className="min-h-20 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-xs outline-none focus:border-red-500"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={(reason[report.id]?.trim().length ?? 0) < 8 || resolve.isPending}
                      onClick={() => resolve.mutate({ id: report.id, resolution: 'RESOLVED' })}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={(reason[report.id]?.trim().length ?? 0) < 8 || resolve.isPending}
                      onClick={() => resolve.mutate({ id: report.id, resolution: 'DISMISSED' })}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
        {reports.data?.length === 0 && (
          <Card>
            <p className="text-sm text-zinc-500">No reports recorded.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
