export type AdminRole =
  'SUPER_ADMINISTRATOR' | 'CONTENT_MODERATOR' | 'COMMUNITY_MODERATOR' | 'SUPPORT_AGENT' | 'ANALYST';

export interface AdminSession {
  id: string;
  email: string;
  displayName: string;
  roles: AdminRole[];
  assuranceLevel: 'aal2';
}

export interface DashboardData {
  counts: {
    users: number;
    reviews: number;
    clubs: number;
    pendingReports: number;
    failedJobs: number;
  };
  recentReports: AdminReport[];
}

export interface AdminReport {
  id: string;
  occurredAt: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  details: string | null;
  status: string;
  reporter: string;
}

export interface ManagedUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  countryCode: string;
  status: 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED';
  statusReason: string | null;
  statusUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  roles: AdminRole[];
  viewingCount: number;
  reviewCount: number;
}

export interface FeatureFlagConfig {
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: string[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  occurredAt: string;
  actorType: string;
  actor: string;
  action: string;
  targetType: string;
  targetId: string | null;
  requestId: string | null;
  reason: string | null;
  metadata: unknown;
}
