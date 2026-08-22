'use client';

import { Eye, EyeOff, Film, Flag, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function ReviewModerationPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);

  const handleToggleSpoiler = (id: string) => {
    adminStore.toggleReviewSpoiler(session, id, 'Toggled spoiler tag during content review');
    setRerender((v) => v + 1);
  };

  const handleToggleVisibility = (id: string) => {
    adminStore.toggleReviewVisibility(
      session,
      id,
      'Toggled review visibility for moderation compliance',
    );
    setRerender((v) => v + 1);
  };

  const handleDelete = (id: string) => {
    adminStore.deleteReview(session, id, 'Deleted review violating community guidelines');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Film className="h-6 w-6 text-purple-500" />
          Review Moderation & Spoiler Controls
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Inspect cinephile film reviews, toggle spoiler alerts, hide non-compliant posts, and audit
          ratings.
        </p>
      </div>

      <div className="space-y-4">
        {adminStore.reviews.map((rev) => (
          <Card key={rev.id} className="p-5">
            <div className="flex flex-col md:flex-row gap-5">
              <img
                src={rev.posterUrl}
                alt={rev.mediaTitle}
                className="h-32 w-24 object-cover rounded-xl border border-zinc-800 shadow-md shrink-0"
              />

              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base text-zinc-100">{rev.mediaTitle}</span>
                    {rev.ratingValue && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/30">
                        <Star className="h-3 w-3 fill-amber-400" /> {rev.ratingValue.toFixed(1)}
                      </span>
                    )}
                    {rev.containsSpoilers && <Badge variant="warning">⚠️ Spoilers Tagged</Badge>}
                    {rev.isHidden && <Badge variant="danger">Hidden from Feed</Badge>}
                    {rev.flagCount > 0 && (
                      <Badge variant="danger">{rev.flagCount} User Flags</Badge>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 font-mono">
                    {new Date(rev.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <img
                    src={rev.authorAvatar}
                    alt={rev.authorUsername}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                  <span>
                    By <strong className="text-zinc-200">@{rev.authorUsername}</strong>
                  </span>
                  <span>•</span>
                  <span>{rev.likeCount} likes</span>
                </div>

                <p className="text-xs text-zinc-300 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 font-serif leading-relaxed">
                  "{rev.body}"
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleToggleSpoiler(rev.id)}>
                    <Flag className="h-3.5 w-3.5" />
                    {rev.containsSpoilers ? 'Remove Spoiler Tag' : 'Mark as Spoiler'}
                  </Button>
                  <Button
                    variant={rev.isHidden ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleVisibility(rev.id)}
                  >
                    {rev.isHidden ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                    {rev.isHidden ? 'Restore to Public' : 'Hide from Public'}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(rev.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Review
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
