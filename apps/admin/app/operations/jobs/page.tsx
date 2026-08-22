'use client';

import { RotateCcw, Server } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function BackgroundJobsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    await new Promise((r) => setTimeout(r, 600));
    adminStore.retryQueueJob(session, id, 'Batch retry initiated for failed jobs in worker queue');
    setRetryingId(null);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Server className="h-6 w-6 text-sky-500" />
          Background Job Workers & Queues
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor asynchronous BullMQ worker queues, recommendation engines, AI scene indexers, and
          retry failed jobs.
        </p>
      </div>

      <div className="space-y-4">
        {adminStore.jobs.map((job) => (
          <Card key={job.id} className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-extrabold text-lg text-zinc-100 font-mono">
                    {job.queueName}
                  </h3>
                  <Badge variant="success">{job.status}</Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1">{job.description}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={job.failed24h > 0 ? 'danger' : 'secondary'}
                  size="sm"
                  disabled={retryingId === job.id || job.failed24h === 0}
                  onClick={() => void handleRetry(job.id)}
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${retryingId === job.id ? 'animate-spin' : ''}`}
                  />
                  {retryingId === job.id ? 'Retrying...' : `Retry Failed (${job.failed24h})`}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Active Tasks</p>
                <p className="text-sm font-extrabold text-zinc-200 mt-0.5">{job.activeCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Waiting</p>
                <p className="text-sm font-extrabold text-zinc-400 mt-0.5">{job.waitingCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Completed 24h</p>
                <p className="text-sm font-extrabold text-emerald-400 mt-0.5">
                  {job.completed24h.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-zinc-500">Avg Duration</p>
                <p className="text-sm font-extrabold text-zinc-200 mt-0.5">{job.avgDurationMs}ms</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
