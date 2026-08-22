import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from './api';
import { devicePlatform, getInstallationId } from './installation';

export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'web') throw new Error('Push notifications require the iOS or Android app.');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'CineWrapped updates',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const permission =
    current.status === Notifications.PermissionStatus.GRANTED
      ? current
      : await Notifications.requestPermissionsAsync();
  if (permission.status !== Notifications.PermissionStatus.GRANTED) {
    throw new Error('Notification permission was not granted in your phone settings.');
  }

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Push delivery will be available after the CineWrapped EAS project is linked.');
  }
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await api.request('notifications/devices', {
    method: 'POST',
    body: {
      installationId: await getInstallationId(),
      platform: devicePlatform(),
      pushToken: token.data,
      locale: Intl.DateTimeFormat().resolvedOptions().locale || 'en-US',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  });
}
