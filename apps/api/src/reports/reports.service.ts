import { Prisma } from '@cinewrapped/database';
import { reportContentSchema } from '@cinewrapped/validation';
import { Injectable } from '@nestjs/common';
import type { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { AppException } from '../common/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import { SocialService } from '../social/social.service.js';

export type ReportContentInput = z.output<typeof reportContentSchema>;

@Injectable()
export class ReportsService {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly social: SocialService,
  ) {}

  public async create(
    principal: AuthPrincipal,
    input: ReportContentInput,
    requestId: string,
  ): Promise<{ reportId: string; blocked: boolean }> {
    const reporter = await this.prisma.user.findFirst({
      where: { authSubject: principal.subject, deletedAt: null },
      select: { id: true },
    });
    if (reporter === null) {
      throw new AppException(
        404,
        'USER_NOT_BOOTSTRAPPED',
        'The application profile is unavailable.',
      );
    }

    const authorId = await this.targetAuthor(input.entityType, input.entityId);
    if (authorId === reporter.id) {
      throw new AppException(422, 'REPORT_SELF_NOT_ALLOWED', 'You cannot report your own content.');
    }

    const report = await this.prisma.auditLog.create({
      data: {
        actorType: 'USER',
        actorUserId: reporter.id,
        actorSubject: principal.subject,
        action: 'CONTENT_REPORTED',
        targetType: input.entityType,
        targetId: input.entityId,
        requestId,
        reason: input.reason,
        metadataJson: {
          details: input.details ?? null,
          reportedAuthorId: authorId,
          status: 'PENDING',
        } satisfies Prisma.InputJsonValue,
      },
      select: { id: true },
    });

    if (input.blockAuthor) await this.social.block(principal, authorId, 'CONTENT_REPORT');
    return { reportId: report.id, blocked: input.blockAuthor };
  }

  private async targetAuthor(
    entityType: ReportContentInput['entityType'],
    entityId: string,
  ): Promise<string> {
    const authorId =
      entityType === 'USER'
        ? (
            await this.prisma.user.findFirst({
              where: { id: entityId, deletedAt: null },
              select: { id: true },
            })
          )?.id
        : entityType === 'REVIEW'
          ? (
              await this.prisma.review.findFirst({
                where: { id: entityId, deletedAt: null },
                select: { userId: true },
              })
            )?.userId
          : entityType === 'COMMENT'
            ? (
                await this.prisma.comment.findFirst({
                  where: { id: entityId, deletedAt: null },
                  select: { userId: true },
                })
              )?.userId
            : (
                await this.prisma.club.findFirst({
                  where: { id: entityId, deletedAt: null },
                  select: { ownerId: true },
                })
              )?.ownerId;

    if (authorId === undefined) {
      throw new AppException(404, 'REPORT_TARGET_NOT_FOUND', 'The content is unavailable.');
    }
    return authorId;
  }
}
