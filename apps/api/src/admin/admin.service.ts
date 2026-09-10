import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';

export const adminRoles = [
  'SUPER_ADMINISTRATOR',
  'CONTENT_MODERATOR',
  'COMMUNITY_MODERATOR',
  'SUPPORT_AGENT',
  'ANALYST',
] as const;

export type AdminRole = (typeof adminRoles)[number];
export type AdminPermission =
  | 'DASHBOARD_READ'
  | 'REPORTS_READ'
  | 'REPORTS_WRITE'
  | 'USERS_READ'
  | 'USERS_WRITE'
  | 'ROLES_WRITE'
  | 'FLAGS_READ'
  | 'FLAGS_WRITE'
  | 'AUDIT_READ';

type AdminActor = {
  id: string;
  authSubject: string;
  email: string;
  displayName: string;
  roles: AdminRole[];
};

const permissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  SUPER_ADMINISTRATOR: new Set<AdminPermission>([
    'DASHBOARD_READ',
    'REPORTS_READ',
    'REPORTS_WRITE',
    'USERS_READ',
    'USERS_WRITE',
    'ROLES_WRITE',
    'FLAGS_READ',
    'FLAGS_WRITE',
    'AUDIT_READ',
  ]),
  CONTENT_MODERATOR: new Set<AdminPermission>(['DASHBOARD_READ', 'REPORTS_READ', 'REPORTS_WRITE']),
  COMMUNITY_MODERATOR: new Set<AdminPermission>([
    'DASHBOARD_READ',
    'REPORTS_READ',
    'REPORTS_WRITE',
  ]),
  SUPPORT_AGENT: new Set<AdminPermission>(['DASHBOARD_READ', 'USERS_READ']),
  ANALYST: new Set<AdminPermission>(['DASHBOARD_READ', 'FLAGS_READ', 'AUDIT_READ']),
};

function hasPermission(actor: AdminActor, permission: AdminPermission): boolean {
  return actor.roles.some((role) => permissions[role].has(permission));
}

function jsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

@Injectable()
export class AdminService {
  public constructor(private readonly prisma: PrismaService) {}

  public async session(principal: AuthPrincipal) {
    const actor = await this.authorize(principal, 'DASHBOARD_READ');
    return {
      id: actor.id,
      email: actor.email,
      displayName: actor.displayName,
      roles: actor.roles,
      assuranceLevel: principal.assuranceLevel,
    };
  }

  public async dashboard(principal: AuthPrincipal) {
    await this.authorize(principal, 'DASHBOARD_READ');
    const [users, reviews, clubs, pendingReports, failedJobs, recentReports] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.review.count({ where: { deletedAt: null, status: 'PUBLISHED' } }),
      this.prisma.club.count({ where: { deletedAt: null } }),
      this.prisma.auditLog.count({
        where: {
          action: 'CONTENT_REPORTED',
          metadataJson: { path: ['status'], equals: 'PENDING' },
        },
      }),
      this.prisma.outboxEvent.count({ where: { status: 'FAILED' } }),
      this.prisma.auditLog.findMany({
        where: { action: 'CONTENT_REPORTED' },
        orderBy: { occurredAt: 'desc' },
        take: 5,
        include: { actorUser: { select: { username: true, displayName: true } } },
      }),
    ]);
    return {
      counts: { users, reviews, clubs, pendingReports, failedJobs },
      recentReports: recentReports.map((report) => this.mapReport(report)),
    };
  }

  public async users(principal: AuthPrincipal, query: string | undefined, take: number) {
    await this.authorize(principal, 'USERS_READ');
    const normalized = query?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(normalized
          ? {
              OR: [
                { email: { contains: normalized, mode: 'insensitive' as const } },
                { username: { contains: normalized, mode: 'insensitive' as const } },
                { displayName: { contains: normalized, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        countryCode: true,
        status: true,
        statusReason: true,
        statusUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          where: { revokedAt: null },
          select: { role: true, grantedAt: true },
        },
        _count: { select: { viewings: true, reviews: true } },
      },
    });
    return users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      statusUpdatedAt: user.statusUpdatedAt?.toISOString() ?? null,
      roles: user.roles.map(({ role }) => role),
      viewingCount: user._count.viewings,
      reviewCount: user._count.reviews,
      _count: undefined,
    }));
  }

  public async updateUserStatus(
    principal: AuthPrincipal,
    targetId: string,
    status: 'ACTIVE' | 'WARNED' | 'SUSPENDED' | 'BANNED',
    reason: string,
    requestId: string,
  ) {
    const actor = await this.authorize(principal, 'USERS_WRITE');
    if (actor.id === targetId && (status === 'SUSPENDED' || status === 'BANNED')) {
      throw new AppException(
        422,
        'ADMIN_SELF_RESTRICTION',
        'You cannot restrict your own account.',
      );
    }
    const updated = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.update({
        where: { id: targetId },
        data: { status, statusReason: reason, statusUpdatedAt: new Date() },
        select: { id: true, status: true, statusReason: true, statusUpdatedAt: true },
      });
      await transaction.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorUserId: actor.id,
          actorSubject: actor.authSubject,
          action: 'ADMIN_USER_STATUS_UPDATED',
          targetType: 'USER',
          targetId,
          requestId,
          reason,
          metadataJson: { status },
        },
      });
      if (status === 'SUSPENDED' || status === 'BANNED') {
        await transaction.authSession.updateMany({
          where: { userId: targetId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return user;
    });
    return {
      ...updated,
      statusUpdatedAt: updated.statusUpdatedAt?.toISOString() ?? null,
    };
  }

  public async updateUserRole(
    principal: AuthPrincipal,
    targetId: string,
    role: AdminRole,
    enabled: boolean,
    reason: string,
    requestId: string,
  ) {
    const actor = await this.authorize(principal, 'ROLES_WRITE');
    if (actor.id === targetId && role === 'SUPER_ADMINISTRATOR' && !enabled) {
      throw new AppException(
        422,
        'ADMIN_SELF_DEMOTION',
        'You cannot revoke your own super-admin role.',
      );
    }
    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.findUniqueOrThrow({ where: { id: targetId } });
      await transaction.userRoleAssignment.upsert({
        where: { userId_role: { userId: targetId, role } },
        update: { revokedAt: enabled ? null : new Date(), grantedById: actor.id },
        create: {
          userId: targetId,
          role,
          grantedById: actor.id,
          revokedAt: enabled ? null : new Date(),
        },
      });
      await transaction.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorUserId: actor.id,
          actorSubject: actor.authSubject,
          action: enabled ? 'ADMIN_ROLE_GRANTED' : 'ADMIN_ROLE_REVOKED',
          targetType: 'USER',
          targetId,
          requestId,
          reason,
          metadataJson: { role },
        },
      });
    });
    return { userId: targetId, role, enabled };
  }

  public async featureFlags(principal: AuthPrincipal) {
    await this.authorize(principal, 'FLAGS_READ');
    const flags = await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    return flags.map((flag) => ({
      ...flag,
      createdAt: flag.createdAt.toISOString(),
      updatedAt: flag.updatedAt.toISOString(),
    }));
  }

  public async updateFeatureFlag(
    principal: AuthPrincipal,
    key: string,
    input: { enabled: boolean; rolloutPercentage: number; environments: string[]; reason: string },
    requestId: string,
  ) {
    const actor = await this.authorize(principal, 'FLAGS_WRITE');
    return this.prisma.$transaction(async (transaction) => {
      const flag = await transaction.featureFlag.update({
        where: { key },
        data: {
          enabled: input.enabled,
          rolloutPercentage: input.rolloutPercentage,
          environments: input.environments,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorUserId: actor.id,
          actorSubject: actor.authSubject,
          action: 'ADMIN_FEATURE_FLAG_UPDATED',
          targetType: 'FEATURE_FLAG',
          requestId,
          reason: input.reason,
          metadataJson: {
            key,
            enabled: input.enabled,
            rolloutPercentage: input.rolloutPercentage,
            environments: input.environments,
          },
        },
      });
      return {
        ...flag,
        createdAt: flag.createdAt.toISOString(),
        updatedAt: flag.updatedAt.toISOString(),
      };
    });
  }

  public async reports(principal: AuthPrincipal, take: number) {
    await this.authorize(principal, 'REPORTS_READ');
    const reports = await this.prisma.auditLog.findMany({
      where: { action: 'CONTENT_REPORTED' },
      orderBy: { occurredAt: 'desc' },
      take,
      include: { actorUser: { select: { username: true, displayName: true } } },
    });
    return reports.map((report) => this.mapReport(report));
  }

  public async resolveReport(
    principal: AuthPrincipal,
    reportId: string,
    resolution: 'RESOLVED' | 'DISMISSED',
    reason: string,
    requestId: string,
  ) {
    const actor = await this.authorize(principal, 'REPORTS_WRITE');
    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.auditLog.findFirst({
        where: { id: reportId, action: 'CONTENT_REPORTED' },
      });
      if (report === null) {
        throw new AppException(404, 'REPORT_NOT_FOUND', 'The report was not found.');
      }
      const metadata = jsonObject(report.metadataJson);
      const updated = await transaction.auditLog.update({
        where: { id: reportId },
        data: {
          metadataJson: {
            ...metadata,
            status: resolution,
            resolutionReason: reason,
            resolvedAt: new Date().toISOString(),
            resolvedBy: actor.id,
          },
        },
        include: { actorUser: { select: { username: true, displayName: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorUserId: actor.id,
          actorSubject: actor.authSubject,
          action: `ADMIN_REPORT_${resolution}`,
          targetType: 'AUDIT_LOG',
          targetId: reportId,
          requestId,
          reason,
          metadataJson: {
            reportedTargetType: report.targetType,
            reportedTargetId: report.targetId,
          },
        },
      });
      return this.mapReport(updated);
    });
  }

  public async auditLogs(principal: AuthPrincipal, take: number) {
    await this.authorize(principal, 'AUDIT_READ');
    const logs = await this.prisma.auditLog.findMany({
      orderBy: { occurredAt: 'desc' },
      take,
      include: { actorUser: { select: { username: true, displayName: true, email: true } } },
    });
    return logs.map((log) => ({
      id: log.id,
      occurredAt: log.occurredAt.toISOString(),
      actorType: log.actorType,
      actor: log.actorUser?.displayName ?? log.actorUser?.username ?? log.actorSubject ?? 'System',
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      requestId: log.requestId,
      reason: log.reason,
      metadata: log.metadataJson,
    }));
  }

  private async authorize(
    principal: AuthPrincipal,
    permission: AdminPermission,
  ): Promise<AdminActor> {
    if (principal.assuranceLevel !== 'aal2') {
      throw new AppException(403, 'ADMIN_MFA_REQUIRED', 'Multi-factor authentication is required.');
    }
    const user = await this.prisma.user.findFirst({
      where: { authSubject: principal.subject, deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        authSubject: true,
        email: true,
        displayName: true,
        roles: { where: { revokedAt: null }, select: { role: true } },
      },
    });
    if (user === null) {
      throw new AppException(403, 'ADMIN_ACCESS_DENIED', 'Administrator access is required.');
    }
    const actor: AdminActor = {
      ...user,
      roles: user.roles.map(({ role }) => role),
    };
    if (!hasPermission(actor, permission)) {
      throw new AppException(
        403,
        'ADMIN_PERMISSION_DENIED',
        'Your role cannot perform this action.',
      );
    }
    return actor;
  }

  private mapReport(report: {
    id: string;
    occurredAt: Date;
    targetType: string;
    targetId: string | null;
    reason: string | null;
    metadataJson: Prisma.JsonValue;
    actorUser: { username: string; displayName: string } | null;
  }) {
    const metadata = jsonObject(report.metadataJson);
    return {
      id: report.id,
      occurredAt: report.occurredAt.toISOString(),
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      details: typeof metadata.details === 'string' ? metadata.details : null,
      status: typeof metadata.status === 'string' ? metadata.status : 'PENDING',
      reporter: report.actorUser?.displayName ?? report.actorUser?.username ?? 'Unknown member',
    };
  }
}
