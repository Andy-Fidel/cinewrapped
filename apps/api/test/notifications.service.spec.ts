import { describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '../src/auth/auth.types.js';
import type { PrismaService } from '../src/database/prisma.service.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import type { TokenCryptoService } from '../src/common/token-crypto.service.js';

const principal: AuthPrincipal = {
  subject: 'auth-user-1',
  email: 'cinephile@example.test',
  sessionId: 'session-1',
  expiresAt: null,
  displayName: 'Cinephile User',
  assuranceLevel: 'aal1',
};

const mockUser = {
  id: '10000000-0000-4000-8000-000000000001',
  authSubject: principal.subject,
  displayName: 'Cinephile User',
};
const hashToken = vi.fn((value: string) => `hash:${value}`);
const encryptToken = vi.fn((value: string) => `encrypted:${value}`);
const tokenCrypto = {
  hash: hashToken,
  encrypt: encryptToken,
} as unknown as TokenCryptoService;

describe('NotificationsService', () => {
  it('returns inbox with unread count and items', async () => {
    const mockNotification = {
      id: 'notif-1',
      userId: mockUser.id,
      type: 'FRIEND_REQUEST',
      actorUserId: '20000000-0000-4000-8000-000000000002',
      actor: {
        id: '20000000-0000-4000-8000-000000000002',
        displayName: 'Nolan Fan',
        username: 'nolanfan',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      entityType: 'FRIENDSHIP',
      entityId: 'friend-1',
      title: 'New Friend Request',
      body: 'Nolan Fan sent you a friend request.',
      deepLink: '/users/nolanfan',
      readAt: null,
      createdAt: new Date(),
    };

    const prisma = {
      user: {
        findFirst: vi.fn(() => Promise.resolve(mockUser)),
      },
      notification: {
        findMany: vi.fn(() => Promise.resolve([mockNotification])),
        count: vi.fn((args: { where?: { readAt?: Date | null } }) => {
          if (args.where?.readAt === null) return Promise.resolve(1);
          return Promise.resolve(1);
        }),
      },
    } as unknown as PrismaService;

    const service = new NotificationsService(prisma, tokenCrypto);
    const result = await service.getInbox(principal, 'all');

    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe('New Friend Request');
    expect(result.items[0]?.actor?.displayName).toBe('Nolan Fan');
  });

  it('marks a single notification as read', async () => {
    const updateMany = vi.fn(() => Promise.resolve({ count: 1 }));
    const prisma = {
      user: {
        findFirst: vi.fn(() => Promise.resolve(mockUser)),
      },
      notification: {
        updateMany,
      },
    } as unknown as PrismaService;

    const service = new NotificationsService(prisma, tokenCrypto);
    const result = await service.markAsRead(principal, 'notif-1');

    expect(result.success).toBe(true);
    expect(result.id).toBe('notif-1');
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'notif-1',
        userId: mockUser.id,
      },
      data: expect.objectContaining({
        readAt: expect.any(Date),
      }),
    });
  });

  it('marks all notifications as read', async () => {
    const updateMany = vi.fn(() => Promise.resolve({ count: 4 }));
    const prisma = {
      user: {
        findFirst: vi.fn(() => Promise.resolve(mockUser)),
      },
      notification: {
        updateMany,
      },
    } as unknown as PrismaService;

    const service = new NotificationsService(prisma, tokenCrypto);
    const result = await service.markAllAsRead(principal);

    expect(result.success).toBe(true);
    expect(result.updatedCount).toBe(4);
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        userId: mockUser.id,
        readAt: null,
        deletedAt: null,
      },
      data: expect.objectContaining({
        readAt: expect.any(Date),
      }),
    });
  });

  it('registers a push device', async () => {
    const upsert = vi.fn(() =>
      Promise.resolve({
        id: 'dev-123',
        userId: mockUser.id,
        installationId: 'inst-1',
      }),
    );
    const prisma = {
      user: {
        findFirst: vi.fn(() => Promise.resolve(mockUser)),
      },
      pushDevice: {
        upsert,
      },
    } as unknown as PrismaService;

    const service = new NotificationsService(prisma, tokenCrypto);
    const result = await service.registerDevice(principal, {
      installationId: 'inst-1',
      platform: 'IOS',
      pushToken: 'ExponentPushToken[xxxx]',
      locale: 'en-US',
      timezone: 'America/New_York',
    });

    expect(result.success).toBe(true);
    expect(result.deviceId).toBe('dev-123');
    expect(upsert).toHaveBeenCalled();
    expect(hashToken).toHaveBeenCalledWith('ExponentPushToken[xxxx]');
    expect(encryptToken).toHaveBeenCalledWith('ExponentPushToken[xxxx]');
  });
});
