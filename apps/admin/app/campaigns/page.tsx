'use client';

import { BellRing, Plus, Send } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { useAdmin } from '../../lib/admin-context';
import { adminStore, type NotificationCampaign } from '../../lib/admin-store';

export default function NotificationCampaignsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [segment, setSegment] = useState<NotificationCampaign['segment']>('ALL_USERS');
  const [channel, setChannel] = useState<NotificationCampaign['channel']>('PUSH_AND_IN_APP');

  const handleSend = () => {
    if (!title || !body) return;
    adminStore.createCampaign(
      session,
      {
        title,
        body,
        segment,
        channel,
        status: 'SENT',
      },
      `Dispatched broadcast campaign "${title}" to segment ${segment}`,
    );
    setIsCreateOpen(false);
    setTitle('');
    setBody('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-red-500" />
            Notification Campaigns & Announcements
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Broadcast targeted mobile push notifications, seasonal alerts, and in-app banners.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <div className="space-y-4">
        {adminStore.campaigns.map((camp) => (
          <Card key={camp.id} className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={camp.status === 'SENT' ? 'success' : 'warning'}>
                    {camp.status}
                  </Badge>
                  <Badge variant="outline">{camp.segment.replace(/_/gu, ' ')}</Badge>
                  <Badge variant="purple">{camp.channel.replace(/_/gu, ' ')}</Badge>
                </div>

                <h3 className="font-extrabold text-base text-zinc-100">{camp.title}</h3>
                <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  {camp.body}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                  <span>
                    Delivered:{' '}
                    <strong className="text-zinc-300">
                      {camp.deliveredCount.toLocaleString()} devices
                    </strong>
                  </span>
                  {camp.openRatePercent > 0 && (
                    <>
                      <span>•</span>
                      <span>
                        Open rate:{' '}
                        <strong className="text-emerald-400">{camp.openRatePercent}%</strong>
                      </span>
                    </>
                  )}
                  {camp.sentAt && (
                    <>
                      <span>•</span>
                      <span>Sent {new Date(camp.sentAt).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Broadcast Campaign"
        description="Draft and send notification to users"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Notification Title
            </label>
            <input
              type="text"
              placeholder="e.g. 🏆 Your Mid-Year Cinema Recap is Ready!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
              Message Body
            </label>
            <textarea
              placeholder="Write the message text..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Audience Segment
              </label>
              <select
                value={segment}
                onChange={(e) => setSegment(e.target.value as NotificationCampaign['segment'])}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              >
                <option value="ALL_USERS">All Users (48.9k)</option>
                <option value="PRO_CINEPHILES">Pro Cinephiles (100+ viewings)</option>
                <option value="INACTIVE_30D">Inactive 30+ Days</option>
                <option value="CLUB_CREATORS">Club Owners</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase mb-1">
                Delivery Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as NotificationCampaign['channel'])}
                className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-200"
              >
                <option value="PUSH_AND_IN_APP">Push + In-App Banner</option>
                <option value="PUSH_ONLY">Push Only</option>
                <option value="IN_APP_BANNER">In-App Banner Only</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSend}>
              <Send className="h-3.5 w-3.5" />
              Broadcast Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
