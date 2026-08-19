'use client';

import { Activity, CheckCircle2, Radio, RefreshCw, Server, Wifi } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function ProvidersHealthPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    await new Promise((r) => setTimeout(r, 600));
    adminStore.triggerProviderSync(session, id, 'Manual delta ingest synchronization triggered');
    setSyncingId(null);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Radio className="h-6 w-6 text-emerald-500" />
          Provider Ingest & API Health
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor upstream API latency, daily quota consumption, error rates, and trigger manual syncs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminStore.providers.map((prov) => (
          <Card key={prov.id} className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-extrabold text-base text-zinc-100">{prov.name}</h3>
                </div>
                <p className="text-xs text-zinc-500 font-mono">{prov.endpointUrl}</p>
              </div>
              <Badge variant="success">{prov.status}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Latency</p>
                <p className="text-sm font-extrabold text-zinc-200 mt-0.5">{prov.latencyMs} ms</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">24h Error Rate</p>
                <p className="text-sm font-extrabold text-emerald-400 mt-0.5">{(prov.errorRate24h * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Daily Quota</p>
                <p className="text-sm font-extrabold text-zinc-200 mt-0.5">{prov.dailyApiQuotaUsedPercent}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-zinc-500">
              <span>Last Synced: {new Date(prov.lastSyncedAt).toLocaleTimeString()}</span>
              <Button
                variant="secondary"
                size="sm"
                disabled={syncingId === prov.id}
                onClick={() => void handleSync(prov.id)}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncingId === prov.id ? 'animate-spin' : ''}`} />
                {syncingId === prov.id ? 'Syncing...' : 'Trigger Sync'}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
