import { PrismaClient } from '@prisma/client';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const confirmed = process.env.ALLOW_INITIAL_ADMIN_GRANT === 'true';
const prisma = new PrismaClient();

async function grantInitialAdmin(): Promise<void> {
  if (!email) throw new Error('ADMIN_EMAIL is required.');
  if (!confirmed) {
    throw new Error('Set ALLOW_INITIAL_ADMIN_GRANT=true to confirm this privileged operation.');
  }

  const result = await prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, email: true },
    });
    if (!user) throw new Error(`No active CineWrapped user was found for ${email}.`);

    const existing = await transaction.userRoleAssignment.findUnique({
      where: { userId_role: { userId: user.id, role: 'SUPER_ADMINISTRATOR' } },
      select: { revokedAt: true },
    });
    if (existing?.revokedAt === null) return { email: user.email, changed: false };

    await transaction.userRoleAssignment.upsert({
      where: { userId_role: { userId: user.id, role: 'SUPER_ADMINISTRATOR' } },
      create: { userId: user.id, role: 'SUPER_ADMINISTRATOR' },
      update: { revokedAt: null, grantedById: null },
    });
    await transaction.auditLog.create({
      data: {
        actorType: 'SYSTEM',
        actorSubject: 'initial-admin-bootstrap',
        action: 'ADMIN_ROLE_GRANTED',
        targetType: 'USER',
        targetId: user.id,
        reason: 'Initial production super-administrator bootstrap',
        metadataJson: { role: 'SUPER_ADMINISTRATOR' },
      },
    });
    return { email: user.email, changed: true };
  });

  console.log(
    result.changed
      ? `Granted SUPER_ADMINISTRATOR to ${result.email}.`
      : `${result.email} already has an active SUPER_ADMINISTRATOR role.`,
  );
}

grantInitialAdmin()
  .catch((error: unknown) => {
    console.error('Initial administrator grant failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
