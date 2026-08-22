'use client';

import { Award, Plus } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { Modal } from '../../../components/ui/modal';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore, type ManagedAchievement } from '../../../lib/admin-store';

export default function AchievementsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newEmoji, setNewEmoji] = useState('🏆');
  const [newTier, setNewTier] = useState<ManagedAchievement['tier']>('GOLD');
  const [newPoints, setNewPoints] = useState(50);
  const [newCriteria, setNewCriteria] = useState('');

  const handleToggle = (id: string) => {
    adminStore.toggleAchievement(session, id, 'Toggled achievement availability');
    setRerender((v) => v + 1);
  };

  const handleCreate = () => {
    if (!newTitle || !newCode) return;
    adminStore.addAchievement(
      session,
      {
        code: newCode.toUpperCase(),
        title: newTitle,
        description: newDesc,
        iconUrl: newEmoji,
        tier: newTier,
        points: Number(newPoints),
        isActive: true,
        criteriaDescription: newCriteria,
      },
      `Created new achievement badge "${newTitle}"`,
    );
    setIsCreateOpen(false);
    setNewCode('');
    setNewTitle('');
    setNewDesc('');
    setNewCriteria('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-amber-500" />
            Achievement & Badges Management
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure CineWrapped gamification rewards, points, unlocked tiers, and eligibility
            criteria.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Badge
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminStore.achievements.map((ach) => (
          <Card key={ach.id} className="p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-3xl">{ach.iconUrl}</div>
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={
                      ach.tier === 'PLATINUM'
                        ? 'purple'
                        : ach.tier === 'GOLD'
                          ? 'warning'
                          : ach.tier === 'SILVER'
                            ? 'info'
                            : 'default'
                    }
                  >
                    {ach.tier} · {ach.points} pts
                  </Badge>
                  <Badge variant={ach.isActive ? 'success' : 'outline'}>
                    {ach.isActive ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-zinc-100">{ach.title}</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">CODE: {ach.code}</p>
                <p className="text-xs text-zinc-300 mt-2">{ach.description}</p>
              </div>

              <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80 text-[11px] text-zinc-400">
                <span className="font-semibold text-zinc-300">Criteria:</span>{' '}
                {ach.criteriaDescription}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-xs">
              <span className="text-zinc-500 font-medium">
                {ach.unlockedCount} cinephiles unlocked
              </span>
              <Button
                variant={ach.isActive ? 'outline' : 'secondary'}
                size="sm"
                onClick={() => handleToggle(ach.id)}
              >
                {ach.isActive ? 'Disable' : 'Enable'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Achievement Badge"
        description="Add a new milestone reward for the CineWrapped community"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Badge Code
              </label>
              <input
                type="text"
                placeholder="e.g. HORROR_DEVOTEE"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200 uppercase font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Emoji Icon
              </label>
              <input
                type="text"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Badge Title
            </label>
            <input
              type="text"
              placeholder="e.g. Horror Devotee"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Description
            </label>
            <textarea
              placeholder="Explain how users unlock this badge..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Tier
              </label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value as ManagedAchievement['tier'])}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              >
                <option value="BRONZE">BRONZE (10 pts)</option>
                <option value="SILVER">SILVER (25 pts)</option>
                <option value="GOLD">GOLD (50 pts)</option>
                <option value="PLATINUM">PLATINUM (100 pts)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Points
              </label>
              <input
                type="number"
                value={newPoints}
                onChange={(e) => setNewPoints(Number(e.target.value))}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Save Badge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
