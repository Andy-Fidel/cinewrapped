import { PrismaClient, withPrismaConnectionLimit } from '@cinewrapped/database';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    const configuredLimit = Number(process.env.PRISMA_CONNECTION_LIMIT ?? '5');
    const connectionLimit =
      Number.isInteger(configuredLimit) && configuredLimit > 0 ? configuredLimit : 5;

    super(
      databaseUrl === undefined
        ? undefined
        : { datasourceUrl: withPrismaConnectionLimit(databaseUrl, connectionLimit) },
    );
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
