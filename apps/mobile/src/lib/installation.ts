import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const installationKey = 'cinewrapped.installation-id';

export async function getInstallationId(): Promise<string> {
  if (Platform.OS === 'web') {
    const current = globalThis.localStorage.getItem(installationKey);
    if (current !== null) return current;
    const created = `web-${randomUUID()}`;
    globalThis.localStorage.setItem(installationKey, created);
    return created;
  }
  const current = await SecureStore.getItemAsync(installationKey);
  if (current !== null) return current;
  const created = randomUUID();
  await SecureStore.setItemAsync(installationKey, created);
  return created;
}

export function devicePlatform(): 'IOS' | 'ANDROID' | 'WEB' | 'UNKNOWN' {
  if (Platform.OS === 'ios') return 'IOS';
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'web') return 'WEB';
  return 'UNKNOWN';
}
