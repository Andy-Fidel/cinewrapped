import {
  addClubWatchlistItemSchema,
  createClubPollSchema,
  createClubPostSchema,
  createClubSchema,
  createClubWatchEventSchema,
  updateClubMembershipSchema,
  uuidSchema,
  voteClubPollSchema,
  voteClubWatchlistItemSchema,
} from '@cinewrapped/validation';
import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  ClubsService,
  type AddClubWatchlistItemInput,
  type CreateClubInput,
  type CreateClubPollInput,
  type CreateClubPostInput,
  type CreateClubWatchEventInput,
  type UpdateClubMembershipInput,
  type VoteClubPollInput,
  type VoteClubWatchlistItemInput,
} from './clubs.service.js';

const clubListQuerySchema = z.object({
  scope: z.enum(['DISCOVER', 'MINE']).default('DISCOVER'),
  q: z.string().trim().max(120).default(''),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

@ApiTags('Clubs')
@ApiBearerAuth()
@Controller('clubs')
export class ClubsController {
  public constructor(private readonly clubs: ClubsService) {}

  @Get()
  public async list(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Query(new ZodValidationPipe(clubListQuerySchema))
    query: z.output<typeof clubListQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.list(principal, query), request.id);
  }

  @Post()
  public async create(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Body(new ZodValidationPipe(createClubSchema)) input: CreateClubInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.create(principal, input), request.id);
  }

  @Get(':clubId')
  public async details(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.details(principal, clubId), request.id);
  }

  @Post(':clubId/join')
  public async join(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.join(principal, clubId), request.id);
  }

  @Patch(':clubId/members/:membershipId')
  public async updateMembership(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Param('membershipId', new ZodValidationPipe(uuidSchema)) membershipId: string,
    @Body(new ZodValidationPipe(updateClubMembershipSchema)) input: UpdateClubMembershipInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.clubs.updateMembership(principal, clubId, membershipId, input),
      request.id,
    );
  }

  @Post(':clubId/posts')
  public async createPost(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Body(new ZodValidationPipe(createClubPostSchema)) input: CreateClubPostInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.createPost(principal, clubId, input), request.id);
  }

  @Post(':clubId/polls')
  public async createPoll(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Body(new ZodValidationPipe(createClubPollSchema)) input: CreateClubPollInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.createPoll(principal, clubId, input), request.id);
  }

  @Put(':clubId/polls/:pollId/vote')
  public async votePoll(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Param('pollId', new ZodValidationPipe(uuidSchema)) pollId: string,
    @Body(new ZodValidationPipe(voteClubPollSchema)) input: VoteClubPollInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.votePoll(principal, clubId, pollId, input), request.id);
  }

  @Post(':clubId/watchlist/items')
  public async addWatchlistItem(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Body(new ZodValidationPipe(addClubWatchlistItemSchema)) input: AddClubWatchlistItemInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.addWatchlistItem(principal, clubId, input), request.id);
  }

  @Put(':clubId/watchlist/items/:itemId/vote')
  public async voteWatchlistItem(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Param('itemId', new ZodValidationPipe(uuidSchema)) itemId: string,
    @Body(new ZodValidationPipe(voteClubWatchlistItemSchema)) input: VoteClubWatchlistItemInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.clubs.voteWatchlistItem(principal, clubId, itemId, input),
      request.id,
    );
  }

  @Post(':clubId/events')
  public async createWatchEvent(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('clubId', new ZodValidationPipe(uuidSchema)) clubId: string,
    @Body(new ZodValidationPipe(createClubWatchEventSchema)) input: CreateClubWatchEventInput,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.clubs.createWatchEvent(principal, clubId, input), request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
