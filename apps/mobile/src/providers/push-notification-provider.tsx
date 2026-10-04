import type { NotificationResponse } from 'expo-notifications';
import type { UserPreferences } from '@cinewrapped/shared-types';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { uuidSchema } from '@cinewrapped/validation';
import { api } from '../lib/api';
import { notificationLink } from '../lib/notification-link';
import { registerForPushNotifications } from '../lib/push-notifications';
import { supabase } from '../lib/supabase';
import { useAuth } from './auth-provider';
export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const subject = session?.user.id;
  useEffect(() => {
    if (
      !subject ||
      Platform.OS === 'web' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient
    )
      return;
    let active = true;
    let remove: (() => void) | undefined;
    const handled = new Set<string>();
    const setup = async () => {
      const notifications = await import('expo-notifications');
      const handle = async (response: NotificationResponse) => {
        const data = response.notification.request.content.data;
        const id = uuidSchema.safeParse(data?.notificationId);
        const link = notificationLink(data?.deepLink);
        const identifier = response.notification.request.identifier;
        if (!id.success || !link || !active || handled.has(identifier)) return;
        handled.add(identifier);
        if ((await supabase.auth.getSession()).data.session?.user.id !== subject) return;
        // The API proves this notification belongs to the signed-in user before following its link.
        await api.request(`notifications/${id.data}/read`, { method: 'PATCH' });
        if (active && (await supabase.auth.getSession()).data.session?.user.id === subject)
          router.push(link as Href);
        await notifications.clearLastNotificationResponseAsync();
      };
      if (!active) return;
      const listener = notifications.addNotificationResponseReceivedListener((response) => {
        void handle(response).catch(() => undefined);
      });
      remove = () => listener.remove();
      const last = await notifications.getLastNotificationResponseAsync();
      if (last) await handle(last).catch(() => undefined);
      const preferences = await api.request<UserPreferences>('users/me/preferences');
      if (active && Object.values(preferences.notificationPreferences).some((value) => value))
        await registerForPushNotifications(false).catch(() => undefined);
    };
    void setup().catch(() => undefined);
    return () => {
      active = false;
      remove?.();
    };
  }, [subject]);
  return children;
}
