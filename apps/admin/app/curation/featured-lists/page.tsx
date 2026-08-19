'use client';

import { Eye, EyeOff, Film, ListOrdered, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function FeaturedListsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);

  const handleTogglePublish = (id: string) => {
    adminStore.toggleListPublish(session, id, 'Toggled featured shelf visibility on mobile home/discover');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ListOrdered className="h-6 w-6 text-red-500" />
            Editorial Featured Shelves
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Curate homepage shelves, bento radar grids, and weekly spotlight collections.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {adminStore.featuredLists.map((list) => (
          <Card key={list.id} className="p-5 hover:border-zinc-700 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={list.isPublished ? 'success' : 'outline'}>
                    {list.isPublished ? 'Live on Home/Discover' : 'Draft / Hidden'}
                  </Badge>
                  <Badge variant="purple">{list.shelfLocation}</Badge>
                  <span className="text-xs text-zinc-500">{list.itemCount} movies curated</span>
                </div>

                <h3 className="font-extrabold text-base text-zinc-100">{list.title}</h3>
                <p className="text-xs text-zinc-400">{list.description}</p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-1">
                  <span>Curator: <strong className="text-zinc-300">{list.curatorName}</strong></span>
                  <span>•</span>
                  <span>{list.viewCount.toLocaleString()} impressions</span>
                  <span>•</span>
                  <span>Updated {new Date(list.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant={list.isPublished ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleTogglePublish(list.id)}
                >
                  {list.isPublished ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {list.isPublished ? 'Unpublish' : 'Publish Shelf'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
