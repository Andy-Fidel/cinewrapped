import { ApiClient } from '@cinewrapped/api-client';

import { supabase } from './supabase';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

if (apiBaseUrl === undefined) {
  throw new Error(
    'CineWrapped API configuration is missing. Start Expo from the CineWrapped workspace so app.config.ts can load the root .env file.',
  );
}

export const api = new ApiClient({
  baseUrl: apiBaseUrl,
  accessTokenProvider: {
    getAccessToken: async () =>
      (await supabase.auth.getSession()).data.session?.access_token ?? null,
  },
});
