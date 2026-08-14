import { countryCodeSchema, saveSoundtrackSchema, uuidSchema } from '@cinewrapped/validation';
import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';

import type { AuthPrincipal } from '../auth/auth.types.js';
import { CurrentPrincipal } from '../auth/current-principal.decorator.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SoundtracksService } from './soundtracks.service.js';

const countryQuerySchema = z.object({ countryCode: countryCodeSchema.default('US') });
const albumIdSchema = z.string().regex(/^\d+$/u).max(128);

@ApiTags('Soundtracks')
@ApiBearerAuth()
@Controller()
export class SoundtracksController {
  public constructor(private readonly soundtracks: SoundtracksService) {}

  @Get('media/:mediaId/soundtracks')
  public async discover(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Query(new ZodValidationPipe(countryQuerySchema)) query: z.output<typeof countryQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.soundtracks.discover(principal, mediaId, query.countryCode),
      request.id,
    );
  }

  @Get('soundtracks/albums/:providerAlbumId/tracks')
  public async tracks(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('providerAlbumId', new ZodValidationPipe(albumIdSchema)) providerAlbumId: string,
    @Query(new ZodValidationPipe(countryQuerySchema)) query: z.output<typeof countryQuerySchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(
      await this.soundtracks.tracks(principal, providerAlbumId, query.countryCode),
      request.id,
    );
  }

  @Get('soundtracks/saves')
  public async list(@CurrentPrincipal() principal: AuthPrincipal, @Req() request: FastifyRequest) {
    return this.ok(await this.soundtracks.list(principal), request.id);
  }

  @Post('media/:mediaId/soundtracks/saves')
  public async save(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('mediaId', new ZodValidationPipe(uuidSchema)) mediaId: string,
    @Body(new ZodValidationPipe(saveSoundtrackSchema)) input: z.output<typeof saveSoundtrackSchema>,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.soundtracks.save(principal, mediaId, input), request.id);
  }

  @Delete('soundtracks/saves/:saveId')
  public async remove(
    @CurrentPrincipal() principal: AuthPrincipal,
    @Param('saveId', new ZodValidationPipe(uuidSchema)) saveId: string,
    @Req() request: FastifyRequest,
  ) {
    return this.ok(await this.soundtracks.remove(principal, saveId), request.id);
  }

  private ok<T>(data: T, requestId: string) {
    return { success: true as const, data, meta: { requestId } };
  }
}
