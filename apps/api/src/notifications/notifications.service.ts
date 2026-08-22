import type {
  NotificationInboxResponse,
  NotificationSummary,
  RegisterPushDeviceDto,
} from '@cinewrapped/shared-types';
import { Prisma } from '@cinewrapped/database';
import { Injectable } from '@nestjs/common';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { TokenCryptoService } from '../common/token-crypto.service.js';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class NotificationsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  public async getInbox(
    principal: AuthPrincipal,
    filter: 'all' | 'unread' = 'all',
  ): Promise<NotificationInboxResponse> {
    const userId = await this.userId(principal.subject);

    const whereClause: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
    };

    if (filter === 'unread') {
      whereClause.readAt = null;
    }

    const [dbItems, unreadCount, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          actor: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          deletedAt: null,
          readAt: null,
        },
      }),
      this.prisma.notification.count({
        where: {
          userId,
          deletedAt: null,
        },
      }),
    ]);

    const items: NotificationSummary[] = dbItems.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.type,
      actorUserId: item.actorUserId,
      actor: item.actor
        ? {
            id: item.actor.id,
            displayName: item.actor.displayName,
            handle: item.actor.username,
            avatarUrl: item.actor.avatarUrl,
          }
        : null,
      entityType: item.entityType,
      entityId: item.entityId,
      title: item.title,
      body: item.body,
      deepLink: item.deepLink,
      readAt: item.readAt ? item.readAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items,
      unreadCount,
      totalCount,
    };
  }

  public async markAsRead(
    principal: AuthPrincipal,
    notificationId: string,
  ): Promise<{ success: boolean; id: string }> {
    const userId = await this.userId(principal.subject);

    const result = await this.prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        readAt: new Date(),
      },
    });
    if (result.count === 0) {
      throw new AppException(404, 'NOTIFICATION_NOT_FOUND', 'The notification was not found.');
    }

    return { success: true, id: notificationId };
  }

  public async markAllAsRead(
    principal: AuthPrincipal,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const userId = await this.userId(principal.subject);

    const res = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
        deletedAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { success: true, updatedCount: res.count };
  }

  public async registerDevice(
    principal: AuthPrincipal,
    dto: RegisterPushDeviceDto,
  ): Promise<{ success: boolean; deviceId?: string }> {
    const userId = await this.userId(principal.subject);
    const pushTokenHash = this.tokenCrypto.hash(dto.pushToken);
    const encryptedToken = this.tokenCrypto.encrypt(dto.pushToken);

    const device = await this.prisma.pushDevice.upsert({
      where: {
        userId_installationId: {
          userId,
          installationId: dto.installationId,
        },
      },
      create: {
        userId,
        installationId: dto.installationId,
        platform: dto.platform,
        pushTokenHash,
        encryptedToken,
        locale: dto.locale ?? null,
        timezone: dto.timezone ?? null,
        lastSeenAt: new Date(),
      },
      update: {
        platform: dto.platform,
        pushTokenHash,
        encryptedToken,
        locale: dto.locale ?? null,
        timezone: dto.timezone ?? null,
        lastSeenAt: new Date(),
        disabledAt: null,
      },
    });

    return { success: true, deviceId: device.id };
  }

  private async userId(subject: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { authSubject: subject, deletedAt: null },
      select: { id: true },
    });
    if (user === null)
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    return user.id;
  }
}
