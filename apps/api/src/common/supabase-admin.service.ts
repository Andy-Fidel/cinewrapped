import type { ApiEnvironment } from '@cinewrapped/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Inject, Injectable } from '@nestjs/common';

import { API_ENVIRONMENT } from '../config/environment.module.js';
import { AppException } from './app.exception.js';

const USER_STORAGE_BUCKETS = [
  'avatars',
  'club-covers',
  'data-exports',
  'data-imports',
  'journal-attachments',
  'scene-identification',
] as const;

@Injectable()
export class SupabaseAdminService {
  readonly #client: SupabaseClient | null;

  public constructor(@Inject(API_ENVIRONMENT) environment: ApiEnvironment) {
    this.#client =
      environment.SUPABASE_SECRET_KEY === undefined
        ? null
        : createClient(environment.SUPABASE_URL, environment.SUPABASE_SECRET_KEY, {
            auth: { autoRefreshToken: false, persistSession: false },
          });
  }

  public assertConfigured(): void {
    if (this.#client === null) {
      throw new AppException(
        503,
        'ACCOUNT_ERASURE_UNAVAILABLE',
        'Account deletion is temporarily unavailable. Please contact support.',
      );
    }
  }

  public async eraseUserStorage(ownerId: string): Promise<void> {
    const client = this.requireClient();
    for (const bucket of USER_STORAGE_BUCKETS) {
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await client.storage.from(bucket).list(ownerId, {
          limit: 1000,
          offset: 0,
        });
        if (error !== null) throw this.erasureFailure('storage', error.message);
        const paths = data.map((item) => `${ownerId}/${item.name}`);
        if (paths.length === 0) break;
        const { error: removeError } = await client.storage.from(bucket).remove(paths);
        if (removeError !== null) throw this.erasureFailure('storage', removeError.message);
        hasMore = paths.length === 1000;
      }
    }
  }

  public async deleteIdentity(authSubject: string): Promise<void> {
    const { error } = await this.requireClient().auth.admin.deleteUser(authSubject);
    if (error !== null) throw this.erasureFailure('identity', error.message);
  }

  private requireClient(): SupabaseClient {
    this.assertConfigured();
    return this.#client as SupabaseClient;
  }

  private erasureFailure(stage: string, providerMessage: string): AppException {
    return new AppException(
      502,
      'ACCOUNT_ERASURE_FAILED',
      'CineWrapped could not safely complete account deletion. No success was reported.',
      { stage, providerMessage },
    );
  }
}
