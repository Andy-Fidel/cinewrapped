import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { chunkedStorage } from './chunked-storage';
const native = chunkedStorage({
  get: SecureStore.getItemAsync,
  set: SecureStore.setItemAsync,
  remove: SecureStore.deleteItemAsync,
});
export const offlineStorage = {
  getItem: async (key: string) =>
    Platform.OS === 'web' ? globalThis.localStorage.getItem(key) : native.getItem(key),
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') globalThis.localStorage.setItem(key, value);
    else await native.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') globalThis.localStorage.removeItem(key);
    else await native.removeItem(key);
  },
};
