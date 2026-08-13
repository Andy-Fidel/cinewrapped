import {
  advancedFeatureKeys,
  type AdvancedFeatureKey,
  type FeatureFlagEvaluation,
  type FeatureFlagsResponse,
} from '@cinewrapped/shared-types';
import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { API_ENVIRONMENT } from '../config/environment.module.js';
import { PrismaService } from '../database/prisma.service.js';

type FlagRecord = {
  key: string;
  enabled: boolean;
  rolloutPercentage: number;
  environments: string[];
  overrides: Array<{ enabled: boolean }>;
};

export function rolloutBucket(subject: string, key: AdvancedFeatureKey): number {
  const prefix = createHash('sha256').update(`${key}:${subject}`).digest('hex').slice(0, 8);
  return Number.parseInt(prefix, 16) % 100;
}

export function evaluateFeatureFlag(
  flag: FlagRecord | undefined,
  subject: string,
  environment: string,
  key: AdvancedFeatureKey,
): FeatureFlagEvaluation {
  const override = flag?.overrides[0];
  if (override !== undefined) return { enabled: override.enabled, source: 'USER_OVERRIDE' };
  if (
    flag === undefined ||
    !flag.enabled ||
    (flag.environments.length > 0 && !flag.environments.includes(environment))
  ) {
    return { enabled: false, source: 'DEFAULT' };
  }
  return {
    enabled: flag.rolloutPercentage === 100 || rolloutBucket(subject, key) < flag.rolloutPercentage,
    source: 'ROLLOUT',
  };
}

@Injectable()
export class FeatureFlagsService {
  public constructor(
    private readonly prisma: PrismaService,
    @Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment,
  ) {}

  public async evaluate(principal: AuthPrincipal): Promise<FeatureFlagsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { authSubject: principal.subject, deletedAt: null },
      select: { id: true },
    });
    const flags = await this.prisma.featureFlag.findMany({
      where: { key: { in: [...advancedFeatureKeys] } },
      select: {
        key: true,
        enabled: true,
        rolloutPercentage: true,
        environments: true,
        overrides: {
          where: {
            userId: user?.id ?? '00000000-0000-0000-0000-000000000000',
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: { enabled: true },
          take: 1,
        },
      },
    });
    const byKey = new Map(flags.map((flag) => [flag.key, flag]));
    return {
      flags: Object.fromEntries(
        advancedFeatureKeys.map((key) => [
          key,
          evaluateFeatureFlag(byKey.get(key), principal.subject, this.environment.NODE_ENV, key),
        ]),
      ) as FeatureFlagsResponse['flags'],
      fetchedAt: new Date().toISOString(),
    };
  }
}
