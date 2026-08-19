'use client';

import {
  AlertTriangle,
  Ban,
  CheckCircle,
  MoreVertical,
  Search,
  Shield,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Modal } from '../../components/ui/modal';
import { useAdmin } from '../../lib/admin-context';
import { adminStore, type AdminRole, type ManagedUser } from '../../lib/admin-store';

export default function UsersManagementPage() {
  const { session } = useAdmin();
  const [, setRerender] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [actionType, setActionType] = useState<'ROLE' | 'STATUS' | null>(null);
  const [targetRole, setTargetRole] = useState<AdminRole | 'USER'>('USER');
  const [targetStatus, setTargetStatus] = useState<ManagedUser['status']>('ACTIVE');
  const [adminReason, setAdminReason] = useState('');

  const users = adminStore.users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.displayName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleUpdateStatus = () => {
    if (!selectedUser) return;
    adminStore.updateUserStatus(session, selectedUser.id, targetStatus, adminReason || `Status updated to ${targetStatus}`);
    setActionType(null);
    setSelectedUser(null);
    setAdminReason('');
    setRerender((v) => v + 1);
  };

  const handleUpdateRole = () => {
    if (!selectedUser) return;
    adminStore.updateUserRole(session, selectedUser.id, targetRole, adminReason || `Role updated to ${targetRole}`);
    setActionType(null);
    setSelectedUser(null);
    setAdminReason('');
    setRerender((v) => v + 1);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-red-500" />
            User Management & Authorization
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage cinephile profiles, administrative role grants, suspensions, and safety warnings.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search by username, display name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-4 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMINISTRATOR">Super Admin</option>
              <option value="CONTENT_MODERATOR">Content Mod</option>
              <option value="COMMUNITY_MODERATOR">Community Mod</option>
              <option value="USER">Standard User</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="WARNED">Warned</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 border-b border-zinc-800/80 text-zinc-400 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Status</th>
                <th className="p-4">Activity</th>
                <th className="p-4">Region</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.username}
                        className="h-9 w-9 rounded-full object-cover border border-zinc-700"
                      />
                      <div>
                        <p className="font-bold text-zinc-100">{user.displayName}</p>
                        <p className="text-zinc-500 font-mono">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        user.role === 'SUPER_ADMINISTRATOR'
                          ? 'danger'
                          : user.role.includes('MODERATOR')
                            ? 'purple'
                            : 'outline'
                      }
                    >
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        user.status === 'ACTIVE'
                          ? 'success'
                          : user.status === 'WARNED'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-zinc-300">
                    <p className="font-medium">{user.totalViewings} films logged</p>
                    <p className="text-[11px] text-zinc-500">{user.totalReviews} reviews</p>
                  </td>
                  <td className="p-4 text-zinc-400 font-mono">{user.countryCode}</td>
                  <td className="p-4 text-right space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setTargetRole(user.role);
                        setActionType('ROLE');
                      }}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Role
                    </Button>
                    <Button
                      variant={user.status === 'ACTIVE' ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => {
                        setSelectedUser(user);
                        setTargetStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                        setActionType('STATUS');
                      }}
                    >
                      {user.status === 'ACTIVE' ? <Ban className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      Status
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Assignment Modal */}
      <Modal
        isOpen={actionType === 'ROLE' && selectedUser !== null}
        onClose={() => setActionType(null)}
        title="Assign Administrative Role"
        description={`Modify system capabilities for ${selectedUser?.displayName} (@${selectedUser?.username})`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Select Scoped Role
            </label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value as AdminRole | 'USER')}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              <option value="USER">Standard User (No Admin Access)</option>
              <option value="SUPPORT_AGENT">Support Agent</option>
              <option value="COMMUNITY_MODERATOR">Community Moderator</option>
              <option value="CONTENT_MODERATOR">Content Moderator</option>
              <option value="ANALYST">Analyst</option>
              <option value="SUPER_ADMINISTRATOR">Super Administrator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Reason for Role Grant / Revocation (Audit Log Required)
            </label>
            <textarea
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="e.g. Promoted to Content Moderator following safety team verification."
              rows={3}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleUpdateRole}>
              Confirm Role Assignment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Status Adjustment Modal */}
      <Modal
        isOpen={actionType === 'STATUS' && selectedUser !== null}
        onClose={() => setActionType(null)}
        title="Adjust User Account Standing"
        description={`Set account state for ${selectedUser?.displayName} (@${selectedUser?.username})`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Select Standing
            </label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as ManagedUser['status'])}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE (Full access)</option>
              <option value="WARNED">WARNED (Warning issued on profile)</option>
              <option value="SUSPENDED">SUSPENDED (Temporary restriction)</option>
              <option value="BANNED">BANNED (Permanent exclusion)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Mandatory Audit Reason
            </label>
            <textarea
              value={adminReason}
              onChange={(e) => setAdminReason(e.target.value)}
              placeholder="Explain why this standing adjustment is necessary..."
              rows={3}
              className="w-full text-xs rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setActionType(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleUpdateStatus}>
              Apply Status Update
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
