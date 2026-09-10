'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { useAdmin } from '../../lib/admin-context';
import { adminApi } from '../../lib/admin-api';
import type { AdminRole, ManagedUser } from '../../lib/admin-types';

const roles: AdminRole[] = [
  'SUPER_ADMINISTRATOR',
  'CONTENT_MODERATOR',
  'COMMUNITY_MODERATOR',
  'SUPPORT_AGENT',
  'ANALYST',
];
type UserStatus = ManagedUser['status'];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAdmin();
  const canWrite = hasRole('SUPER_ADMINISTRATOR');
  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<ManagedUser | null>(null);
  const [mode, setMode] = useState<'status' | 'role'>('status');
  const [status, setStatus] = useState<UserStatus>('ACTIVE');
  const [role, setRole] = useState<AdminRole>('SUPPORT_AGENT');
  const [roleEnabled, setRoleEnabled] = useState(true);
  const [reason, setReason] = useState('');

  const users = useQuery({
    queryKey: ['admin', 'users', query],
    queryFn: () => adminApi<ManagedUser[]>(`/admin/users?take=100&q=${encodeURIComponent(query)}`),
  });
  const update = useMutation({
    mutationFn: async () => {
      if (!target) throw new Error('Select a user.');
      if (mode === 'status') {
        return adminApi(`/admin/users/${target.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status, reason: reason.trim() }),
        });
      }
      return adminApi(`/admin/users/${target.id}/roles`, {
        method: 'PATCH',
        body: JSON.stringify({ role, enabled: roleEnabled, reason: reason.trim() }),
      });
    },
    onSuccess: async () => {
      setTarget(null);
      setReason('');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  function open(user: ManagedUser, nextMode: 'status' | 'role') {
    setTarget(user);
    setMode(nextMode);
    setStatus(user.status);
    setReason('');
    setRoleEnabled(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Users & roles</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Live accounts, restrictions, and administrative access.
          </p>
        </div>
        <input
          aria-label="Search users"
          placeholder="Search email, username, or name"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm outline-none focus:border-red-500 lg:w-80"
        />
      </div>
      {users.isPending && <p className="text-sm text-zinc-400">Loading users…</p>}
      {users.isError && (
        <p role="alert" className="text-sm text-red-400">
          {users.error.message}
        </p>
      )}
      {update.isError && (
        <p role="alert" className="text-sm text-red-400">
          {update.error.message}
        </p>
      )}
      {users.data && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[1050px] text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900 text-zinc-400">
              <tr>
                <th className="p-4">Member</th>
                <th>Status</th>
                <th>Roles</th>
                <th>Activity</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {users.data.map((user) => (
                <tr key={user.id} className="text-zinc-300">
                  <td className="p-4">
                    <p className="font-semibold text-zinc-100">{user.displayName}</p>
                    <p className="text-zinc-500">
                      @{user.username} · {user.email}
                    </p>
                  </td>
                  <td>
                    <span className="rounded-full border border-zinc-700 px-2 py-1">
                      {user.status}
                    </span>
                  </td>
                  <td className="max-w-56">
                    {user.roles.length
                      ? user.roles.map((item) => item.replaceAll('_', ' ')).join(', ')
                      : 'Member'}
                  </td>
                  <td>
                    {user.viewingCount} watches · {user.reviewCount} reviews
                  </td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex gap-2">
                      {canWrite && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => open(user, 'status')}>
                            Status
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => open(user, 'role')}>
                            Role
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Modal
        isOpen={target !== null}
        onClose={() => setTarget(null)}
        title={mode === 'status' ? 'Update account status' : 'Update administrator role'}
        description={target ? `${target.displayName} · ${target.email}` : undefined}
      >
        <div className="space-y-4">
          {mode === 'status' ? (
            <label className="block text-xs font-semibold text-zinc-300">
              Status
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatus)}
                className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
              >
                <option>ACTIVE</option>
                <option>WARNED</option>
                <option>SUSPENDED</option>
                <option>BANNED</option>
              </select>
            </label>
          ) : (
            <>
              <label className="block text-xs font-semibold text-zinc-300">
                Role
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as AdminRole)}
                  className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
                >
                  {roles.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={roleEnabled}
                  onChange={(event) => setRoleEnabled(event.target.checked)}
                />
                Role is active
              </label>
            </>
          )}
          <label className="block text-xs font-semibold text-zinc-300">
            Audit reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-2 min-h-24 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3"
              placeholder="Required; minimum 8 characters"
            />
          </label>
          <Button
            className="w-full"
            disabled={reason.trim().length < 8 || update.isPending}
            onClick={() => update.mutate()}
          >
            {update.isPending ? 'Saving…' : 'Save audited change'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
