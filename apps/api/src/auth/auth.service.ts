import { randomUUID } from 'node:crypto';

import type { CurrentUser, SessionSummary } from '@cinewrapped/shared-types';
import { Injectable } from '@nestjs/common';

import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { toCurrentUser } from '../users/user.mapper.js';
import type { AuthPrincipal } from './auth.types.js';

export interface BootstrapInput {
  timezone: string;
  locale: string;
  installationId?: string;
  platform: 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN';
  deviceName?: string;
}

function countryFromLocale(locale: string): string {
  const region = locale.split(/[-_]/u)[1];
  return region !== undefined && /^[A-Za-z]{2}$/u.test(region) ? region.toUpperCase() : 'US';
}

function displayNameFor(principal: AuthPrincipal): string {
  const fallback = principal.email.split('@')[0] ?? 'CineWrapped member';
  return (principal.displayName ?? fallback).slice(0, 80);
}

@Injectable()
export class AuthService {
  public constructor(private readonly prisma: PrismaService) {}

  public async bootstrap(principal: AuthPrincipal, input: BootstrapInput): Promise<CurrentUser> {
    const id = randomUUID();
    const suffix = id.replaceAll('-', '').slice(0, 12);
    const emailNormalized = principal.email.trim().toLowerCase();
    const countryCode = countryFromLocale(input.locale);
    const user = await this.prisma.$transaction(async (transaction) => {
      const member = await transaction.user.upsert({
        where: { authSubject: principal.subject },
        update: { email: principal.email, emailNormalized },
        create: {
          id,
          authSubject: principal.subject,
          email: principal.email,
          emailNormalized,
          username: `user_${suffix}`,
          usernameNormalized: `user_${suffix}`,
          displayName: displayNameFor(principal),
          countryCode,
          preferredLanguage: input.locale,
          timezone: input.timezone,
          preferences: { create: { defaultCountryForStreaming: countryCode } },
          privacySettings: { create: {} },
          onboardingProgress: { create: {} },
        },
      });
      await transaction.authSession.upsert({
        where: { id: principal.sessionId },
        update: {
          ...(input.installationId === undefined ? {} : { installationId: input.installationId }),
          platform: input.platform,
          ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
          expiresAt: principal.expiresAt,
          lastSeenAt: new Date(),
          revokedAt: null,
        },
        create: {
          id: principal.sessionId,
          userId: member.id,
          ...(input.installationId === undefined ? {} : { installationId: input.installationId }),
          platform: input.platform,
          ...(input.deviceName === undefined ? {} : { deviceName: input.deviceName }),
          expiresAt: principal.expiresAt,
        },
      });
      return member;
    });
    return toCurrentUser(user);
  }

  public async listSessions(principal: AuthPrincipal): Promise<SessionSummary[]> {
    const userId = await this.requireUserId(principal.subject);
    const sessions = await this.prisma.authSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeenAt: 'desc' },
      take: 50,
    });
    return sessions.map((session) => ({
      id: session.id,
      installationId: session.installationId,
      platform: session.platform,
      deviceName: session.deviceName,
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      current: session.id === principal.sessionId,
    }));
  }

  public async revokeSession(principal: AuthPrincipal, sessionId: string): Promise<void> {
    const userId = await this.requireUserId(principal.subject);
    const result = await this.prisma.authSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new AppException(404, 'AUTH_SESSION_NOT_FOUND', 'The session was not found.');
    }
  }

  public async revokeOtherSessions(principal: AuthPrincipal): Promise<number> {
    const userId = await this.requireUserId(principal.subject);
    const result = await this.prisma.authSession.updateMany({
      where: { userId, id: { not: principal.sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  private async requireUserId(subject: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: subject },
      select: { id: true, deletedAt: true },
    });
    if (user === null || user.deletedAt !== null) {
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    }
    return user.id;
  }
}
