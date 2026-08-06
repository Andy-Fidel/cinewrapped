import type { PrivacySettingsSummary, ProfileVisibility } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';

import { ChoiceRow, SettingsCard, ToggleRow } from '../../src/components/settings-controls';
import { Button, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';

type ActivityVisibility = ProfileVisibility | 'CLUB_ONLY';
type PrivacyPatch = Record<string, boolean | ActivityVisibility>;

const visibilityOptions: ReadonlyArray<{ label: string; value: ProfileVisibility }> = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Friends', value: 'FRIENDS' },
  { label: 'Public', value: 'PUBLIC' },
];
const activityVisibilityOptions: ReadonlyArray<{ label: string; value: ActivityVisibility }> = [
  { label: 'Private', value: 'PRIVATE' },
  { label: 'Friends', value: 'FRIENDS' },
  { label: 'Clubs', value: 'CLUB_ONLY' },
  { label: 'Public', value: 'PUBLIC' },
];

export default function PrivacySettingsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const privacy = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: () => api.request<PrivacySettingsSummary>('users/me/privacy'),
  });
  const update = useMutation({
    mutationFn: (body: PrivacyPatch) =>
      api.request<PrivacySettingsSummary>('users/me/privacy', { method: 'PATCH', body }),
    onSuccess: (updated) => queryClient.setQueryData(['privacy-settings'], updated),
  });
  const data = privacy.data;

  const makePrivate = () =>
    update.mutate({
      watchHistoryVisibility: 'PRIVATE',
      ratingsVisibility: 'PRIVATE',
      reviewsVisibility: 'PRIVATE',
      listsVisibility: 'PRIVATE',
      friendListVisibility: 'PRIVATE',
      wrapsVisibility: 'PRIVATE',
      onlineStatusVisibility: 'PRIVATE',
      leaderboardVisibility: 'PRIVATE',
      passportVisibility: 'PRIVATE',
      shareWatchActivity: false,
      shareRatingActivity: false,
      shareReviewActivity: false,
      shareListActivity: false,
      shareAchievementActivity: false,
    });

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Privacy & Visibility',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <SettingsCard
        icon="shield-checkmark-outline"
        title="Privacy Preset"
        body="Privacy is enforced by the API. This preset hides all supported activity in one action."
      >
        <Button
          label="Make Everything Private"
          variant="secondary"
          loading={update.isPending}
          onPress={makePrivate}
        />
      </SettingsCard>

      {privacy.isPending ? <ActivityIndicator color={colors.brand} /> : null}
      {data === undefined ? null : (
        <>
          <SettingsCard
            icon="eye-outline"
            title="Audience Controls"
            body="Set who can see each part of your CineWrapped profile."
          >
            {(
              [
                ['Watch history', 'watchHistoryVisibility'],
                ['Ratings', 'ratingsVisibility'],
                ['Reviews', 'reviewsVisibility'],
                ['Lists', 'listsVisibility'],
                ['Friend list', 'friendListVisibility'],
                ['Wraps', 'wrapsVisibility'],
                ['Online status', 'onlineStatusVisibility'],
              ] as const
            ).map(([label, field]) => (
              <ChoiceRow<ActivityVisibility>
                key={field}
                label={label}
                value={data[field] as ActivityVisibility}
                options={activityVisibilityOptions}
                disabled={update.isPending}
                onChange={(value) => update.mutate({ [field]: value })}
              />
            ))}
            <ChoiceRow<ProfileVisibility>
              label="Leaderboard"
              value={data.leaderboardVisibility}
              options={visibilityOptions}
              disabled={update.isPending}
              onChange={(leaderboardVisibility) => update.mutate({ leaderboardVisibility })}
            />
            <ChoiceRow<ProfileVisibility>
              label="Movie Passport"
              value={data.passportVisibility}
              options={visibilityOptions}
              disabled={update.isPending}
              onChange={(passportVisibility) => update.mutate({ passportVisibility })}
            />
          </SettingsCard>

          <SettingsCard
            icon="share-social-outline"
            title="Activity Sharing"
            body="Visibility decides the audience; these switches decide whether an activity is shared at all."
          >
            {(
              [
                ['Share watch activity', 'shareWatchActivity'],
                ['Share rating activity', 'shareRatingActivity'],
                ['Share review activity', 'shareReviewActivity'],
                ['Share list activity', 'shareListActivity'],
                ['Share achievements', 'shareAchievementActivity'],
              ] as const
            ).map(([label, field]) => (
              <ToggleRow
                key={field}
                label={label}
                value={data[field]}
                disabled={update.isPending}
                onChange={(value) => update.mutate({ [field]: value })}
              />
            ))}
          </SettingsCard>
        </>
      )}

      {privacy.isError || update.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {errorMessage(update.error ?? privacy.error)}
        </Text>
      ) : null}
    </Screen>
  );
}
