import 'react-native-url-polyfill/auto';

import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { withNetworkRetry } from './network-fetch';

const SECURE_STORE_CHUNK_BYTES = 1_800;
const manifestSuffix = '.manifest';

function webStorage(): Storage | null {
  return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
}

async function removeNativeValue(key: string): Promise<void> {
  const manifest = await SecureStore.getItemAsync(`${key}${manifestSuffix}`);
  if (manifest !== null) {
    const count = Number.parseInt(manifest, 10);
    if (Number.isSafeInteger(count) && count > 0) {
      await Promise.all(
        Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${index}`)),
      );
    }
  }
  await Promise.all([
    SecureStore.deleteItemAsync(key),
    SecureStore.deleteItemAsync(`${key}${manifestSuffix}`),
  ]);
}

async function getNativeValue(key: string): Promise<string | null> {
  const manifest = await SecureStore.getItemAsync(`${key}${manifestSuffix}`);
  if (manifest === null) return SecureStore.getItemAsync(key);
  const count = Number.parseInt(manifest, 10);
  if (!Number.isSafeInteger(count) || count <= 0) {
    await removeNativeValue(key);
    return null;
  }
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${key}.${index}`)),
  );
  if (chunks.some((chunk) => chunk === null)) {
    await removeNativeValue(key);
    return null;
  }
  return chunks.join('');
}

async function setNativeValue(key: string, value: string): Promise<void> {
  await removeNativeValue(key);
  const chunks = value.match(new RegExp(`.{1,${SECURE_STORE_CHUNK_BYTES}}`, 'gu')) ?? [''];
  await Promise.all(
    chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${index}`, chunk)),
  );
  await SecureStore.setItemAsync(`${key}${manifestSuffix}`, String(chunks.length));
}

const storage: SupportedStorage = {
  getItem: async (key) =>
    Platform.OS === 'web' ? (webStorage()?.getItem(key) ?? null) : getNativeValue(key),
  setItem: async (key, value) => {
    if (Platform.OS === 'web') webStorage()?.setItem(key, value);
    else await setNativeValue(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === 'web') webStorage()?.removeItem(key);
    else await removeNativeValue(key);
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
