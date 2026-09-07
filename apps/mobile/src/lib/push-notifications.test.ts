import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = vi.hoisted(() => ({ platform: 'web', environment: 'storeClient' }));
vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return runtime.platform;
    },
  },
}));
vi.mock('expo-constants', () => ({
  default: {
    get executionEnvironment() {
      return runtime.environment;
    },
  },
  ExecutionEnvironment: { StoreClient: 'storeClient' },
}));
vi.mock('./api', () => ({ api: { request: vi.fn() } }));
vi.mock('./installation', () => ({
  devicePlatform: () => 'ANDROID',
  getInstallationId: async () => 'test',
}));
vi.mock('expo-notifications', () => {
  throw new Error('Unsupported notification module was imported');
});

import { registerForPushNotifications } from './push-notifications';

describe('push registration platform guards', () => {
  beforeEach(() => {
    runtime.platform = 'web';
    runtime.environment = 'storeClient';
  });
  it('rejects browser registration before importing native notifications', async () => {
    await expect(registerForPushNotifications()).rejects.toThrow('require the iOS or Android app');
  });
  it('rejects Android Expo Go before importing the module that crashes', async () => {
    runtime.platform = 'android';
    await expect(registerForPushNotifications()).rejects.toThrow('installed CineWrapped build');
  });
});
