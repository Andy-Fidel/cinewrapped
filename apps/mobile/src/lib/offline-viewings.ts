import { Platform } from 'react-native';
import { ApiClient } from '@cinewrapped/api-client';
import { OfflineViewingQueue } from './offline-queue';
import { offlineStorage } from './offline-storage';
import { supabase } from './supabase';
import { withNetworkRetry } from './network-fetch';
let identity: { userId: string; subject: string } | null = null;
export const offlineViewings = new OfflineViewingQueue(
  offlineStorage,
  async (owner, entry, signal) => {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session || identity?.userId !== owner || identity.subject !== session.user.id)
      throw new Error('Your account changed.');
    const token = session.access_token;
    const client = new ApiClient({
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL!,
      fetchImplementation: withNetworkRetry(fetch),
      accessTokenProvider: { getAccessToken: () => Promise.resolve(token) },
    });
    await client.request(`library/media/${entry.mediaId}/viewings`, {
      method: 'POST',
      body: entry.body,
      idempotencyKey: entry.id,
      signal,
    });
  },
  Date.now,
  async (operation) => {
    if (Platform.OS !== 'web') return operation();
    if (!('locks' in globalThis.navigator))
      throw new Error('Offline saving requires a browser that supports secure storage locks.');
    return globalThis.navigator.locks.request('cinewrapped.offline-viewings', operation);
  },
);
export function setOfflineOwner(userId: string | null, subject: string | null) {
  identity = userId && subject ? { userId, subject } : null;
  return offlineViewings.setOwner(userId);
}
