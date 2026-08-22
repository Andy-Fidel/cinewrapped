import { createCipheriv, createHash, randomBytes } from 'node:crypto';

import type { ApiEnvironment } from '@cinewrapped/config';
import { Inject, Injectable } from '@nestjs/common';

import { API_ENVIRONMENT } from '../config/environment.module.js';

@Injectable()
export class TokenCryptoService {
  readonly #key: Buffer;

  public constructor(@Inject(API_ENVIRONMENT) environment: ApiEnvironment) {
    this.#key = createHash('sha256')
      .update(
        `cinewrapped:push-token:v1:${environment.PUSH_TOKEN_ENCRYPTION_KEY ?? environment.S3_SECRET_KEY}`,
      )
      .digest();
  }

  public hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  public encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join(':');
  }
}
