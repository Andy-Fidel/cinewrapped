import 'react-native-url-polyfill/auto';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { withNetworkRetry } from './network-fetch';

const memory = new Map<string, string>();
const storage: SupportedStorage = {
  getItem: async (key) =>
    Platform.OS === 'web' ? (memory.get(key) ?? null) : SecureStore.getItemAsync(key),
  setItem: async (key, value) => {
    if (Platform.OS === 'web') memory.set(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') memory.delete(key);
    else await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (supabaseUrl === undefined || supabaseAnonKey === undefined) {
  throw new Error(
    'Supabase public configuration is missing. Start Expo from the CineWrapped workspace so app.config.ts can load the root .env file.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: withNetworkRetry(globalThis.fetch.bind(globalThis)) },
  auth: {
    storage,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    persistSession: true,
  },
});
