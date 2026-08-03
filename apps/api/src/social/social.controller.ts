import {
  blockUserSchema,
  createCommentSchema,
  createFriendshipSchema,
  respondFriendshipSchema,
  uuidSchema,
} from '@cinewrapped/validation';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SocialService } from './social.service.js';

const userSearchSchema = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
const friendshipQuerySchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED', 'BLOCKED']).optional(),
});
const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(300).optional(),
});
const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_]+$/u);
const parentTypeSchema = z.enum(['REVIEW', 'FEED_ACTIVITY']);
const reactionTargetSchema = z.enum(['REVIEW', 'COMMENT', 'FEED_ACTIVITY']);
const reactionTypeSchema = z.enum(['LIKE', 'LOVE', 'LAUGH', 'WOW', 'SAD']);

@ApiTags('Social')
@ApiBearerAuth()
@Controller()
export class SocialController {
  public constructor(private readonly social: SocialService) {}

  @Get('users')
  public async users(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(userSearchSchema)) query: z.output<typeof userSearchSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(await this.social.users(principal, query.q, query.limit), request.id);
  }

  @Get('users/:username')
  public async profile(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('username', new ZodValidationPipe(usernameSchema)) username: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.social.profile(principal, username), request.id);
  }

  @Put('follows/:userId')
  public async follow(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.social.follow(principal, userId), request.id);
  }

  @Delete('follows/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async unfollow(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    await this.social.unfollow(principal, userId);
  }

  @Get('friendships')
  public async friendships(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(friendshipQuerySchema))
    query: z.output<typeof friendshipQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(await this.social.friendships(principal, query.status), request.id);
  }

  @Post('friendships')
  public async createFriendship(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createFriendshipSchema))
    input: z.output<typeof createFriendshipSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.social.createFriendship(principal, input.addresseeUserId),
      request.id,
    );
  }

  @Patch('friendships/:friendshipId')
  public async respondFriendship(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('friendshipId', new ZodValidationPipe(uuidSchema)) friendshipId: string,
    @Body(new ZodValidationPipe(respondFriendshipSchema))
    input: z.output<typeof respondFriendshipSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.social.respondFriendship(principal, friendshipId, input.action),
      request.id,
    );
  }

  @Delete('friendships/:friendshipId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteFriendship(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('friendshipId', new ZodValidationPipe(uuidSchema)) friendshipId: string,
  ) {
    await this.social.deleteFriendship(principal, friendshipId);
  }

  @Get('feed')
  public async feed(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(feedQuerySchema)) query: z.output<typeof feedQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    const result = await this.social.feed(principal, query.limit, query.cursor);
    return this.collection(result.items, request.id, result.nextCursor, query.limit);
  }

  @Get('social/comments/:parentType/:parentId')
  public async comments(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('parentType', new ZodValidationPipe(parentTypeSchema))
    parentType: 'REVIEW' | 'FEED_ACTIVITY',
    @Param('parentId', new ZodValidationPipe(uuidSchema)) parentId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.collection(await this.social.comments(principal, parentType, parentId), request.id);
  }

  @Post('social/comments/:parentType/:parentId')
  public async createComment(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('parentType', new ZodValidationPipe(parentTypeSchema))
    parentType: 'REVIEW' | 'FEED_ACTIVITY',
    @Param('parentId', new ZodValidationPipe(uuidSchema)) parentId: string,
    @Body(new ZodValidationPipe(createCommentSchema)) input: z.output<typeof createCommentSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.social.createComment(principal, parentType, parentId, input),
      request.id,
    );
  }

  @Delete('social/comments/item/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteComment(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('commentId', new ZodValidationPipe(uuidSchema)) commentId: string,
  ) {
    await this.social.deleteComment(principal, commentId);
  }

  @Put('reactions/:targetType/:targetId/:reactionType')
  public async setReaction(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('targetType', new ZodValidationPipe(reactionTargetSchema))
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    @Param('targetId', new ZodValidationPipe(uuidSchema)) targetId: string,
    @Param('reactionType', new ZodValidationPipe(reactionTypeSchema))
    reactionType: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD',
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.social.setReaction(principal, targetType, targetId, reactionType),
      request.id,
    );
  }

  @Delete('reactions/:targetType/:targetId/:reactionType')
  public async deleteReaction(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('targetType', new ZodValidationPipe(reactionTargetSchema))
    targetType: 'REVIEW' | 'COMMENT' | 'FEED_ACTIVITY',
    @Param('targetId', new ZodValidationPipe(uuidSchema)) targetId: string,
    @Param('reactionType', new ZodValidationPipe(reactionTypeSchema))
    reactionType: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD',
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.social.deleteReaction(principal, targetType, targetId, reactionType),
      request.id,
    );
  }

  @Post('media/:mediaId/shares')
  public async shareMedia(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.social.shareMedia(principal, mediaId), request.id);
  }

  @Put('blocks/:userId')
  public async block(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
    @Body(new ZodValidationPipe(blockUserSchema)) input: z.output<typeof blockUserSchema>,
    @Req() request: FastifyRequest,
  ) {
    await this.social.block(principal, userId, input.reason);
    return this.ok({ blocked: true }, request.id);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async unblock(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    await this.social.unblock(principal, userId);
  }

  @Put('mutes/:userId')
  public async mute(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
    @Req() request: FastifyRequest,
  ) {
    await this.social.mute(principal, userId);
    return this.ok({ muted: true }, request.id);
  }

  @Delete('mutes/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async unmute(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('userId', new ZodValidationPipe(uuidSchema)) userId: string,
  ) {
    await this.social.unmute(principal, userId);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
  private collection<T>(
    data: T[],
    requestId: string,
    nextCursor: string | null = null,
    limit = data.length,
  ) {
    return {
      success: true as const,
      data,
      meta: { requestId, page: { nextCursor, hasMore: nextCursor !== null, limit } },
    };
  }
}
