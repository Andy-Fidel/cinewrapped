'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAdmin } from '../../lib/admin-context';
import { adminApi } from '../../lib/admin-api';
import type { FeatureFlagConfig } from '../../lib/admin-types';

export default function FeatureFlagsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAdmin();
  const canWrite = hasRole('SUPER_ADMINISTRATOR');
  const [reason, setReason] = useState<Record<string, string>>({});
  const flags = useQuery({
    queryKey: ['admin', 'feature-flags'],
    queryFn: () => adminApi<FeatureFlagConfig[]>('/admin/feature-flags'),
  });
  const update = useMutation({
    mutationFn: ({ flag, enabled }: { flag: FeatureFlagConfig; enabled: boolean }) =>
      adminApi<FeatureFlagConfig>(`/admin/feature-flags/${encodeURIComponent(flag.key)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          enabled,
          rolloutPercentage: enabled ? Math.max(flag.rolloutPercentage, 100) : 0,
          environments: flag.environments,
          reason: reason[flag.key]?.trim(),
        }),
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['admin', 'feature-flags'] }),
  });
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold text-white">Feature flags</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Live rollout controls. Every change requires a reason and is audited.
        </p>
      </div>
      {flags.isPending && <p className="text-sm text-zinc-400">Loading feature flags…</p>}
      {flags.isError && (
        <p role="alert" className="text-sm text-red-400">
          {flags.error.message}
        </p>
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-red-400">
          {update.error.message}
        </p>
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {flags.data?.map((flag) => (
          <Card key={flag.key}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-mono text-sm font-bold text-zinc-100">{flag.key}</h3>
                <p className="mt-1 text-xs text-zinc-400">{flag.description}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${flag.enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}
              >
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <p className="mt-4 text-xs text-zinc-500">
              Rollout: {flag.rolloutPercentage}% · Environments:{' '}
              {flag.environments.join(', ') || 'all'}
            </p>
            {canWrite && (
              <div className="mt-4 flex gap-2">
                <input
                  aria-label={`Change reason for ${flag.key}`}
                  placeholder="Change reason (minimum 8 characters)"
                  value={reason[flag.key] ?? ''}
                  onChange={(event) =>
                    setReason((current) => ({ ...current, [flag.key]: event.target.value }))
                  }
                  className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs outline-none focus:border-red-500"
                />
                <Button
                  size="sm"
                  variant={flag.enabled ? 'danger' : 'primary'}
                  disabled={(reason[flag.key]?.trim().length ?? 0) < 8 || update.isPending}
                  onClick={() => update.mutate({ flag, enabled: !flag.enabled })}
                >
                  {flag.enabled ? 'Disable' : 'Enable'}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
