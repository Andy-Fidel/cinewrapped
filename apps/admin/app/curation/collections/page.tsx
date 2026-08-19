'use client';

import { Eye, EyeOff, Film, Plus, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore } from '../../../lib/admin-store';

export default function CollectionsPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);

  const handleToggleFeatured = (id: string) => {
    adminStore.toggleCollectionFeatured(session, id, 'Toggled collection featured hero status');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          Curated Cinema Collections
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Build rich thematic film vaults (A24, Criterion, Ghibli, 90s Cyberpunk) with custom artwork.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {adminStore.collections.map((col) => (
          <Card key={col.id} className="p-0 overflow-hidden flex flex-col">
            <div className="h-40 relative">
              <img
                src={col.backdropUrl}
                alt={col.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              <div className="absolute top-3 right-3 flex gap-2">
                {col.isFeatured && <Badge variant="warning">⭐ Hero Featured</Badge>}
                <Badge variant="purple">{col.theme}</Badge>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-1.5">
                <h3 className="font-extrabold text-lg text-zinc-100">{col.title}</h3>
                <p className="text-xs text-zinc-400">{col.description}</p>
                <p className="text-xs text-zinc-500 pt-1">
                  Contains <strong className="text-zinc-300">{col.movieCount} curated titles</strong>
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <span className="text-xs text-zinc-500 font-mono">
                  Created {new Date(col.publishedAt).toLocaleDateString()}
                </span>
                <Button
                  variant={col.isFeatured ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleToggleFeatured(col.id)}
                >
                  <Star className="h-3.5 w-3.5" />
                  {col.isFeatured ? 'Unfeature' : 'Feature on Hero'}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
