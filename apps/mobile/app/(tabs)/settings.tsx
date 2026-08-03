import type {
  PrivacySettingsSummary,
  ProfileVisibility,
  SessionSummary,
} from '@cinewrapped/shared-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandHeader, Button, ErrorText, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';
import { useTheme } from '../../src/providers/theme-provider';

export default function SettingsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.request<SessionSummary[]>('auth/sessions'),
  });
  const privacy = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: () => api.request<PrivacySettingsSummary>('users/me/privacy'),
  });

  const action = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      await queryClient.invalidateQueries();
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const setTheme = (theme: 'SYSTEM' | 'LIGHT' | 'DARK') => action(() => setThemePreference(theme));
  const makePrivate = () =>
    action(() =>
      api.request('users/me/privacy', {
        method: 'PATCH',
        body: {
          watchHistoryVisibility: 'PRIVATE',
          ratingsVisibility: 'PRIVATE',
          reviewsVisibility: 'PRIVATE',
          listsVisibility: 'PRIVATE',
          friendListVisibility: 'PRIVATE',
          wrapsVisibility: 'PRIVATE',
          onlineStatusVisibility: 'PRIVATE',
          shareWatchActivity: false,
          shareRatingActivity: false,
          shareReviewActivity: false,
          shareListActivity: false,
          shareAchievementActivity: false,
          leaderboardVisibility: 'PRIVATE',
          passportVisibility: 'PRIVATE',
        },
      }),
    );
  const setGamificationVisibility = (
    setting: 'leaderboardVisibility' | 'passportVisibility',
    visibility: ProfileVisibility,
  ) =>
    action(() =>
      api.request('users/me/privacy', {
        method: 'PATCH',
        body: { [setting]: visibility },
      }),
    );
  const revokeOthers = () =>
    action(() =>
      api.request('auth/sessions/revoke-others', {
        method: 'POST',
        idempotencyKey: `revoke-${randomUUID()}`,
      }),
    );

  return (
    <Screen>
      <BrandHeader title="Settings" body={`Signed in as @${user?.username ?? ''}`} />
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Appearance</Text>
        <Text style={{ color: colors.textSecondary }}>Current: {themePreference}</Text>
        <View style={styles.row}>
          <Button
            label="System"
            variant={themePreference === 'SYSTEM' ? 'primary' : 'secondary'}
            disabled={busy || themePreference === 'SYSTEM'}
            onPress={() => void setTheme('SYSTEM')}
          />
          <Button
            label="Light"
            variant={themePreference === 'LIGHT' ? 'primary' : 'secondary'}
            disabled={busy || themePreference === 'LIGHT'}
            onPress={() => void setTheme('LIGHT')}
          />
          <Button
            label="Dark"
            variant={themePreference === 'DARK' ? 'primary' : 'secondary'}
            disabled={busy || themePreference === 'DARK'}
            onPress={() => void setTheme('DARK')}
          />
        </View>
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Privacy</Text>
        <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
          Your visibility settings are enforced by the API. Apply a private preset anytime.
        </Text>
        <Button
          label="Make activity private"
          variant="secondary"
          disabled={busy}
          onPress={() => void makePrivate()}
        />
        <VisibilityControl
          disabled={busy}
          label="Leaderboard"
          value={privacy.data?.leaderboardVisibility ?? 'PRIVATE'}
          onChange={(value) => void setGamificationVisibility('leaderboardVisibility', value)}
        />
        <VisibilityControl
          disabled={busy}
          label="Movie passport"
          value={privacy.data?.passportVisibility ?? 'PRIVATE'}
          onChange={(value) => void setGamificationVisibility('passportVisibility', value)}
        />
      </View>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Active sessions</Text>
        {sessions.data?.map((session) => (
          <Text key={session.id} style={{ color: colors.textSecondary }}>
            {session.current ? 'This device' : (session.deviceName ?? session.platform)} ·{' '}
            {new Date(session.lastSeenAt).toLocaleDateString()}
          </Text>
        ))}
        <Button
          label="Sign out other devices"
          variant="secondary"
          disabled={busy}
          onPress={() => void revokeOthers()}
        />
      </View>
      {message === null ? null : <ErrorText>{message}</ErrorText>}
      <Button
        label="Sign out"
        variant="danger"
        disabled={busy}
        onPress={() => void action(signOut)}
      />
    </Screen>
  );
}

function VisibilityControl({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: ProfileVisibility) => void;
  value: ProfileVisibility;
}) {
  const colors = useColors();
  return (
    <View style={styles.visibility}>
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{label}</Text>
      <View style={styles.row}>
        {(['PRIVATE', 'FRIENDS', 'PUBLIC'] as const).map((option) => (
          <View key={option} style={styles.visibilityButton}>
            <Button
              disabled={disabled || value === option}
              label={option.slice(0, 1) + option.slice(1).toLowerCase()}
              onPress={() => onChange(option)}
              variant={value === option ? 'primary' : 'secondary'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 18 },
  heading: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  visibility: { gap: 8 },
  visibilityButton: { flex: 1, minWidth: 90 },
});
