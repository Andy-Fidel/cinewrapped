'use client';

import { CheckCircle2, ShieldAlert, Sliders, ToggleLeft, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { Switch } from '../../components/ui/switch';
import { useAdmin } from '../../lib/admin-context';
import { adminStore, type FeatureFlagConfig } from '../../lib/admin-store';

export default function FeatureFlagsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlagConfig | null>(null);
  const [targetEnabled, setTargetEnabled] = useState(false);
  const [targetRollout, setTargetRollout] = useState(100);
  const [adminReason, setAdminReason] = useState('');

  const handleOpenEdit = (flag: FeatureFlagConfig) => {
    setSelectedFlag(flag);
    setTargetEnabled(flag.isEnabled);
    setTargetRollout(flag.rolloutPercentage);
    setAdminReason('');
  };

  const handleSaveFlag = () => {
    if (!selectedFlag) return;
    adminStore.toggleFeatureFlag(
      session,
      selectedFlag.key,
      targetEnabled,
      targetRollout,
      adminReason || `Updated flag ${selectedFlag.key} rollout to ${targetRollout}% (enabled: ${targetEnabled})`,
    );
    setSelectedFlag(null);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <ToggleLeft className="h-6 w-6 text-red-500" />
          Runtime Feature Flags & Rollouts
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Dynamic capability toggles, canary rollout percentages, and scoped role permissions.
        </p>
      </div>

      <div className="space-y-4">
        {adminStore.flags.map((flag) => (
          <Card key={flag.key} className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-base text-zinc-100">{flag.name}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {flag.key}
                  </Badge>
                  <Badge variant={flag.isEnabled ? 'success' : 'outline'}>
                    {flag.isEnabled ? `Active (${flag.rolloutPercentage}%)` : 'Disabled'}
                  </Badge>
                </div>

                <p className="text-xs text-zinc-400 max-w-2xl">{flag.description}</p>

                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 pt-1">
                  <span>
                    Updated by <strong className="text-zinc-300">{flag.updatedBy}</strong>
                  </span>
                  <span>•</span>
                  <span>{new Date(flag.updatedAt).toLocaleString()}</span>
                  <span>•</span>
                  <span className="text-zinc-400">
                    Roles: {flag.allowedRoles.map((r) => r.split('_')[0]).join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(flag)}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Configure
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={selectedFlag !== null}
        onClose={() => setSelectedFlag(null)}
        title="Configure Feature Flag"
        description={selectedFlag ? `Tuning rollout for "${selectedFlag.name}"` : undefined}
      >
        {selectedFlag && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <p className="text-xs font-bold text-zinc-200">Global Activation State</p>
                <p className="text-[11px] text-zinc-400">Master switch for this feature</p>
              </div>
              <Switch checked={targetEnabled} onCheckedChange={setTargetEnabled} />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 uppercase mb-1">
                <span>Canary Rollout Percentage</span>
                <span className="text-red-400 font-bold">{targetRollout}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={targetRollout}
                onChange={(e) => setTargetRollout(Number(e.target.value))}
                className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-red-600 border border-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Audit Rationale (Required)
              </label>
              <textarea
                value={adminReason}
                onChange={(e) => setAdminReason(e.target.value)}
                placeholder="e.g. Scaling rollout to 100% following successful staging smoke tests."
                rows={3}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedFlag(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveFlag}>
                Save & Record Audit
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
