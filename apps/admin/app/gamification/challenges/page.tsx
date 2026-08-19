'use client';

import { Calendar, CheckCircle2, Flame, Plus, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Modal } from '../../../components/ui/modal';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore, type ManagedChallenge } from '../../../lib/admin-store';

export default function ChallengesPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [targetCount, setTargetCount] = useState(10);
  const [category, setCategory] = useState<ManagedChallenge['category']>('SEASONAL');

  const handleCreate = () => {
    if (!title) return;
    adminStore.addChallenge(
      session,
      {
        title,
        subtitle,
        coverImageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        targetCount,
        category,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        status: 'ACTIVE',
      },
      `Created cinema challenge "${title}"`,
    );
    setIsCreateOpen(false);
    setTitle('');
    setSubtitle('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Flame className="h-6 w-6 text-red-500" />
            Seasonal & Thematic Challenges
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Create community movie marathons, track completion rates, and manage reward milestones.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Challenge
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {adminStore.challenges.map((ch) => (
          <Card key={ch.id} className="p-0 overflow-hidden flex flex-col">
            <div className="h-36 relative">
              <img
                src={ch.coverImageUrl}
                alt={ch.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Badge variant={ch.status === 'ACTIVE' ? 'success' : 'info'}>
                  {ch.status}
                </Badge>
                <Badge variant="outline">{ch.category}</Badge>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-extrabold text-lg text-zinc-100">{ch.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">{ch.subtitle}</p>

                <div className="mt-4 grid grid-cols-3 gap-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 text-center">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Target</p>
                    <p className="text-sm font-extrabold text-white mt-0.5">{ch.targetCount} films</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Joined</p>
                    <p className="text-sm font-extrabold text-white mt-0.5">{ch.participantCount}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-zinc-500">Completed</p>
                    <p className="text-sm font-extrabold text-emerald-400 mt-0.5">{ch.completionCount}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800/80">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(ch.startDate).toLocaleDateString()} — {new Date(ch.endDate).toLocaleDateString()}
                </span>
                <span className="font-semibold text-zinc-300">
                  {ch.participantCount > 0
                    ? `${Math.round((ch.completionCount / ch.participantCount) * 100)}% completion`
                    : 'Upcoming'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Cinema Challenge"
        description="Set marathon target and dates"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Challenge Title</label>
            <input
              type="text"
              placeholder="e.g. Noir August 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Subtitle / Goal</label>
            <input
              type="text"
              placeholder="e.g. Watch 10 neo-noir or classic detective movies"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Target Film Count</label>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ManagedChallenge['category'])}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              >
                <option value="GENRE">GENRE</option>
                <option value="DIRECTOR">DIRECTOR</option>
                <option value="SEASONAL">SEASONAL</option>
                <option value="RUNTIME">RUNTIME</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Launch Challenge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
