import 'react-native-url-polyfill/auto';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://invalid.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-public-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web',
    persistSession: true,
  },
});
