import type { Prisma } from '@cinewrapped/database';

// Called inside the transaction that commits the action, so notifications cannot get lost.
export async function createNotification(
  tx: Prisma.TransactionClient,
  input: Prisma.NotificationUncheckedCreateInput,
): Promise<void> {
  const notification = await tx.notification.create({ data: input });
  const devices = await tx.pushDevice.findMany({
    where: { userId: notification.userId, disabledAt: null, platform: { in: ['IOS', 'ANDROID'] } },
    select: { id: true, pushTokenHash: true },
    take: 100,
  });
  if (!devices.length) return;
  await tx.outboxEvent.createMany({
    data: devices.map((device) => ({
      aggregateType: 'notification',
      aggregateId: notification.id,
      eventType: 'notification.push',
      payloadJson: {
        notificationId: notification.id,
        deviceId: device.id,
        tokenHash: device.pushTokenHash,
      },
    })),
  });
}
