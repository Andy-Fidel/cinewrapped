'use client';

import { CheckCircle2, Lock, Shield, Snowflake, Trash2, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { useAdmin } from '../../../lib/admin-context';
import { adminStore, type ManagedClub } from '../../../lib/admin-store';

export default function ClubModerationPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);

  const handleUpdateStatus = (id: string, status: ManagedClub['status']) => {
    adminStore.updateClubStatus(session, id, status, `Club status updated to ${status}`);
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="h-6 w-6 text-sky-500" />
          Cinema Clubs Moderation
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Review community film societies, freeze non-compliant groups, and verify official clubs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminStore.clubs.map((club) => (
          <Card key={club.id} className="overflow-hidden p-0 flex flex-col">
            <div className="h-28 relative">
              <img
                src={club.coverImageUrl}
                alt={club.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
              <div className="absolute top-3 right-3 flex gap-1">
                {club.isOfficial && <Badge variant="purple">⭐ Official</Badge>}
                <Badge variant={club.privacy === 'PUBLIC' ? 'default' : 'outline'}>
                  {club.privacy}
                </Badge>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-zinc-100">{club.name}</h3>
                  <Badge
                    variant={
                      club.status === 'ACTIVE'
                        ? 'success'
                        : club.status === 'FROZEN'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {club.status}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{club.description}</p>
                <div className="flex items-center gap-3 text-xs text-zinc-500 pt-2">
                  <span>{club.memberCount} members</span>
                  <span>•</span>
                  <span>{club.discussionCount} threads</span>
                  <span>•</span>
                  <span>Owner: @{club.ownerUsername}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/80">
                {club.status === 'ACTIVE' ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(club.id, 'FROZEN')}
                  >
                    <Snowflake className="h-3.5 w-3.5" />
                    Freeze Club
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleUpdateStatus(club.id, 'ACTIVE')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Unfreeze
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleUpdateStatus(club.id, 'DISBANDED')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Disband
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
