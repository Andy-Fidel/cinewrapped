import { ApiClient } from '@cinewrapped/api-client';

import { supabase } from './supabase';

export const api = new ApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1',
  accessTokenProvider: {
    getAccessToken: async () =>
      (await supabase.auth.getSession()).data.session?.access_token ?? null,
  },
});
