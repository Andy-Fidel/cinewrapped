import { createCipheriv, createHash } from 'node:crypto';
import type { PrismaClient } from '@cinewrapped/database';
import type { WorkerEnvironment } from '@cinewrapped/config';
import { describe, expect, it, vi } from 'vitest';
import { decryptPushToken, deliverPush } from '../src/push-delivery.js';

const secret = 'test-encryption-secret';
const token = 'ExponentPushToken[test]';
const cipher = createCipheriv(
  'aes-256-gcm',
  createHash('sha256').update(`cinewrapped:push-token:v1:${secret}`).digest(),
  Buffer.alloc(12, 1),
);
const encrypted = Buffer.concat([cipher.update(token), cipher.final()]);
const envelope = `v1:${Buffer.alloc(12, 1).toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
function fixture(consent = true) {
  const db = {
    notification: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'notification',
        userId: 'owner',
        title: 'New friend request',
        body: 'A friend request arrived.',
        type: 'FRIEND_REQUEST',
        user: { preferences: { notificationPreferences: { social: consent } } },
      }),
    },
    pushDevice: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'device',
        userId: 'owner',
        pushTokenHash: 'hash',
        encryptedToken: envelope,
      }),
      updateMany: vi.fn(),
    },
    outboxEvent: { update: vi.fn() },
  };
  const event = {
    id: 'event',
    createdAt: new Date(),
    payloadJson: { notificationId: 'notification', deviceId: 'device', tokenHash: 'hash' },
  };
  const environment = { PUSH_TOKEN_ENCRYPTION_KEY: secret } as WorkerEnvironment;
  return { db, event, environment, prisma: db as unknown as PrismaClient };
}

describe('push delivery', () => {
  it('decrypts the API envelope and rejects tampering or the wrong key', () => {
    expect(decryptPushToken(envelope, secret)).toBe(token);
    expect(() => decryptPushToken(envelope, 'wrong')).toThrow();
  });
  it('persists a ticket for receipt checking rather than claiming delivery', async () => {
    const f = fixture();
    const request = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { status: 'ok', id: 'ticket' } }));
    expect(await deliverPush(f.prisma, f.environment, f.event, request)).toBe(true);
    expect(f.db.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          payloadJson: expect.objectContaining({ receiptId: 'ticket' }),
        }),
      }),
    );
  });
  it('does not send without consent or to a device now owned by another account', async () => {
    const f = fixture(false);
    const request = vi.fn();
    expect(await deliverPush(f.prisma, f.environment, f.event, request)).toBe(false);
    const other = fixture();
    other.db.pushDevice.findUnique.mockResolvedValue({
      id: 'device',
      userId: 'other',
      pushTokenHash: 'hash',
      encryptedToken: envelope,
    });
    expect(await deliverPush(other.prisma, other.environment, other.event, request)).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
  it('checks the stored receipt without resending and disables unregistered tokens', async () => {
    const f = fixture();
    const request = vi.fn().mockResolvedValue(
      Response.json({
        data: { ticket: { status: 'error', details: { error: 'DeviceNotRegistered' } } },
      }),
    );
    expect(
      await deliverPush(
        f.prisma,
        f.environment,
        { ...f.event, payloadJson: { ...f.event.payloadJson, receiptId: 'ticket' } },
        request,
      ),
    ).toBe(false);
    expect(request.mock.calls[0]?.[0]).toContain('/getReceipts');
    expect(f.db.pushDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'device', pushTokenHash: 'hash' } }),
    );
  });
  it('keeps a failed provider request retryable', async () => {
    const f = fixture();
    await expect(
      deliverPush(
        f.prisma,
        f.environment,
        f.event,
        vi.fn().mockResolvedValue(new Response('', { status: 503 })),
      ),
    ).rejects.toThrow('EXPO_HTTP_503');
    expect(f.db.outboxEvent.update).not.toHaveBeenCalled();
  });
});
