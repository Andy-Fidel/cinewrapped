'use client';

import { BookOpen, Search } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/badge';
import { Card } from '../../components/ui/card';
import { adminStore } from '../../lib/admin-store';

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const audits = adminStore.audits.filter((a) => {
    const matchesSearch =
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.actorName.toLowerCase().includes(search.toLowerCase()) ||
      (a.targetLabel && a.targetLabel.toLowerCase().includes(search.toLowerCase())) ||
      a.reason.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || a.actorRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-sky-500" />
          Immutable Administrative Audit Stream
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Cryptographically recorded, append-only operational ledger of every moderation, flag, and
          configuration change.
        </p>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search audit actions, actor name, target, reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMINISTRATOR">Super Administrator</option>
            <option value="CONTENT_MODERATOR">Content Moderator</option>
            <option value="COMMUNITY_MODERATOR">Community Moderator</option>
            <option value="SUPPORT_AGENT">Support Agent</option>
            <option value="ANALYST">Analyst</option>
          </select>
        </div>
      </Card>

      {/* Audit Stream Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-800/80 text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Action</th>
                <th className="p-4">Target</th>
                <th className="p-4">Reason & Metadata Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {audits.map((a) => (
                <tr key={a.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="p-4 text-zinc-400 whitespace-nowrap">
                    {new Date(a.occurredAt).toLocaleString()}
                  </td>
                  <td className="p-4 font-sans whitespace-nowrap">
                    <div className="font-bold text-zinc-100">{a.actorName}</div>
                    <Badge variant="outline" className="text-[10px] py-0 mt-0.5">
                      {a.actorRole}
                    </Badge>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                      {a.action}
                    </span>
                  </td>
                  <td className="p-4 font-sans">
                    <span className="font-semibold text-zinc-200">
                      {a.targetLabel || a.targetType}
                    </span>
                    {a.targetId && (
                      <p className="text-[10px] text-zinc-500 font-mono">ID: {a.targetId}</p>
                    )}
                  </td>
                  <td className="p-4 font-sans space-y-1">
                    <p className="text-zinc-300 italic">"{a.reason}"</p>
                    {Object.keys(a.metadataJson).length > 0 && (
                      <div className="bg-zinc-950 p-2 rounded border border-zinc-800/60 font-mono text-[11px] text-zinc-400 overflow-x-auto">
                        {JSON.stringify(a.metadataJson)}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
