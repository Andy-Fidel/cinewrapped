'use client';

import { Eye, EyeOff, MessageSquare, Pin, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function CommentModerationPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);

  const handleToggleVisibility = (id: string) => {
    adminStore.toggleCommentVisibility(session, id, 'Toggled comment visibility');
    setRerender((v) => v + 1);
  };

  const handleTogglePin = (id: string) => {
    adminStore.toggleCommentPin(session, id, 'Toggled comment pinned status');
    setRerender((v) => v + 1);
  };

  const handleDelete = (id: string) => {
    adminStore.deleteComment(session, id, 'Deleted toxic/spam comment');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-emerald-500" />
          Comment & Discussion Moderation
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Monitor social threads, discussion comments, pinned announcements, and spam cleanup.
        </p>
      </div>

      <div className="space-y-3">
        {adminStore.comments.map((com) => (
          <Card key={com.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{com.threadType}</Badge>
                  <span className="text-xs font-bold text-zinc-300">{com.threadTitle}</span>
                  {com.isPinned && <Badge variant="purple">📌 Pinned</Badge>}
                  {com.isFlagged && <Badge variant="danger">Flagged</Badge>}
                  {com.isHidden && <Badge variant="warning">Hidden</Badge>}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <img
                    src={com.authorAvatar}
                    alt={com.authorUsername}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span className="font-semibold text-zinc-200">@{com.authorUsername}</span>
                  <span>•</span>
                  <span>{com.likeCount} likes</span>
                  <span>•</span>
                  <span className="text-zinc-500">{new Date(com.createdAt).toLocaleString()}</span>
                </div>

                <p className="text-xs text-zinc-200 bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
                  {com.content}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => handleTogglePin(com.id)}>
                  <Pin className="h-3.5 w-3.5" />
                  {com.isPinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button
                  variant={com.isHidden ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleVisibility(com.id)}
                >
                  {com.isHidden ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                  {com.isHidden ? 'Unhide' : 'Hide'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(com.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
