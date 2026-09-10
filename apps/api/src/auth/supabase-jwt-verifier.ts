import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { AppException } from '../common/app.exception.js';
import { API_ENVIRONMENT } from '../config/environment.module.js';
import type { AuthPrincipal } from './auth.types.js';

@Injectable()
export class SupabaseJwtVerifier {
  readonly #jwks: ReturnType<typeof createRemoteJWKSet>;

  public constructor(@Inject(API_ENVIRONMENT) private readonly environment: ApiEnvironment) {
    this.#jwks = createRemoteJWKSet(new URL(environment.SUPABASE_JWKS_URL));
  }

  public async verify(token: string): Promise<AuthPrincipal> {
    try {
      const { payload } = await jwtVerify(token, this.#jwks, {
        issuer: this.environment.SUPABASE_JWT_ISSUER,
        audience: this.environment.SUPABASE_JWT_AUDIENCE,
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string' ||
        typeof payload.session_id !== 'string'
      ) {
        throw new Error('Required identity claims are missing.');
      }
      const metadata = payload.user_metadata;
      const displayName =
        typeof metadata === 'object' &&
        metadata !== null &&
        'full_name' in metadata &&
        typeof metadata.full_name === 'string'
          ? metadata.full_name
          : null;
      return {
        subject: payload.sub,
        email: payload.email,
        sessionId: payload.session_id,
        expiresAt: typeof payload.exp === 'number' ? new Date(payload.exp * 1000) : null,
        displayName,
        assuranceLevel: payload.aal === 'aal1' || payload.aal === 'aal2' ? payload.aal : null,
      };
    } catch {
      throw new AppException(401, 'AUTH_TOKEN_INVALID', 'The access token is invalid or expired.');
    }
  }
}
