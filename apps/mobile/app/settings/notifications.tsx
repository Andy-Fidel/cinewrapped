import type { UserPreferences } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { SettingsCard, ToggleRow } from '../../src/components/settings-controls';
import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = ['preferences', user?.id ?? 'anonymous'] as const;
  const preferences = useQuery({
    queryKey,
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
  });
  const update = useMutation({
    mutationFn: (notificationPreferences: Record<string, boolean>) =>
      api.request<UserPreferences>('users/me/preferences', {
        method: 'PATCH',
        body: { notificationPreferences },
      }),
    onSuccess: (updated) => queryClient.setQueryData(queryKey, updated),
  });

  const data = preferences.data;
  const setNotification = (key: string, value: boolean) => {
    update.mutate({ ...(data?.notificationPreferences ?? {}), [key]: value });
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Notifications',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <SettingsCard
        icon="notifications-outline"
        title="Notification Preferences"
        body="Choose which updates CineWrapped may send. Device permission remains controlled by your phone."
      >
        {preferences.isPending ? <ActivityIndicator color={colors.brand} /> : null}
        <ToggleRow
          label="Recommendations"
          body="New personalized picks and availability updates."
          value={data?.notificationPreferences.recommendations ?? false}
          disabled={data === undefined || update.isPending}
          onChange={(value) => setNotification('recommendations', value)}
        />
        <ToggleRow
          label="Social activity"
          body="Friend requests, reactions, comments, and club activity."
          value={data?.notificationPreferences.social ?? false}
          disabled={data === undefined || update.isPending}
          onChange={(value) => setNotification('social', value)}
        />
        <ToggleRow
          label="Product news"
          body="Occasional feature announcements and CineWrapped updates."
          value={data?.notificationPreferences.product ?? false}
          disabled={data === undefined || update.isPending}
          onChange={(value) => setNotification('product', value)}
        />
      </SettingsCard>
      {preferences.isError || update.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {errorMessage(update.error ?? preferences.error)}
        </Text>
      ) : null}
    </Screen>
  );
}
