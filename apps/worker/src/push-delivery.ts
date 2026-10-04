import { createDecipheriv, createHash } from 'node:crypto';
import type { PrismaClient, Prisma } from '@cinewrapped/database';
import type { WorkerEnvironment } from '@cinewrapped/config';

interface PushPayload {
  notificationId: string;
  deviceId: string;
  tokenHash: string;
  receiptId?: string;
}

export function decryptPushToken(value: string, secret: string): string {
  const [version, iv, tag, ciphertext] = value.split(':');
  if (version !== 'v1' || !iv || !tag || !ciphertext) throw new Error('PUSH_TOKEN_INVALID');
  const key = createHash('sha256').update(`cinewrapped:push-token:v1:${secret}`).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

// Returns true after a ticket is persisted; the same outbox event later checks its receipt.
export async function deliverPush(
  prisma: PrismaClient,
  environment: WorkerEnvironment,
  event: { id: string; payloadJson: Prisma.JsonValue; createdAt: Date },
  request: typeof fetch = fetch,
): Promise<boolean> {
  const payload = event.payloadJson as unknown as PushPayload;
  if (
    typeof event.payloadJson !== 'object' ||
    event.payloadJson === null ||
    typeof payload.notificationId !== 'string' ||
    typeof payload.deviceId !== 'string' ||
    typeof payload.tokenHash !== 'string'
  )
    throw new Error('PUSH_PAYLOAD_INVALID');
  const [notification, device] = await Promise.all([
    prisma.notification.findUnique({
      where: { id: payload.notificationId },
      include: { user: { include: { preferences: true } } },
    }),
    prisma.pushDevice.findUnique({ where: { id: payload.deviceId } }),
  ]);
  // Re-check ownership, consent, token rotation and erasure immediately before sending.
  if (
    !notification ||
    notification.deletedAt ||
    notification.user.deletedAt ||
    !device ||
    device.disabledAt ||
    device.userId !== notification.userId ||
    device.pushTokenHash !== payload.tokenHash
  )
    return false;
  if (notification.actorUserId) {
    const blocked = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: notification.userId, blockedId: notification.actorUserId },
          { blockerId: notification.actorUserId, blockedId: notification.userId },
        ],
      },
      select: { blockerId: true },
    });
    if (blocked) return false;
  }
  const preferences = notification.user.preferences?.notificationPreferences as
    Record<string, unknown> | undefined;
  const category = ['WRAP_READY', 'ACHIEVEMENT_UNLOCKED'].includes(notification.type)
    ? 'recommendations'
    : 'social';
  if (preferences?.[category] !== true) return false;
  const secret = environment.PUSH_TOKEN_ENCRYPTION_KEY ?? environment.S3_SECRET_KEY;
  if (!secret) throw new Error('PUSH_ENCRYPTION_KEY_MISSING');
  const response = await request(
    `https://exp.host/--/api/v2/push/${payload.receiptId ? 'getReceipts' : 'send'}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(environment.EXPO_PUSH_ACCESS_TOKEN
          ? { Authorization: `Bearer ${environment.EXPO_PUSH_ACCESS_TOKEN}` }
          : {}),
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify(
        payload.receiptId
          ? { ids: [payload.receiptId] }
          : {
              to: decryptPushToken(device.encryptedToken, secret),
              title: notification.title,
              body: notification.body,
              sound: 'default',
              data: { notificationId: notification.id, deepLink: notification.deepLink },
            },
      ),
    },
  );
  if (!response.ok) throw new Error(`EXPO_HTTP_${response.status}`);
  const result = (await response.json()) as { data?: Record<string, unknown> };
  const outcome = (payload.receiptId ? result.data?.[payload.receiptId] : result.data) as
    { status?: string; id?: string; details?: { error?: string } } | undefined;
  if (!outcome) throw new Error('EXPO_RECEIPT_PENDING');
  if (outcome.status === 'error') {
    if (outcome.details?.error === 'DeviceNotRegistered') {
      await prisma.pushDevice.updateMany({
        where: { id: device.id, pushTokenHash: payload.tokenHash },
        data: { disabledAt: new Date() },
      });
      return false;
    }
    throw new Error(`EXPO_${outcome.details?.error ?? 'DELIVERY_FAILED'}`);
  }
  if (outcome.status !== 'ok') throw new Error('EXPO_RESPONSE_INVALID');
  if (payload.receiptId) return false;
  if (typeof outcome.id !== 'string') throw new Error('EXPO_TICKET_INVALID');
  await prisma.outboxEvent.update({
    where: { id: event.id },
    data: {
      payloadJson: { ...payload, receiptId: outcome.id },
      status: 'PENDING',
      lockedAt: null,
      attemptCount: 0,
      availableAt: new Date(Date.now() + 15 * 60_000),
    },
  });
  return true;
}
