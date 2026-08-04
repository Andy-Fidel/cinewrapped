import type {
  PrivacySettingsSummary,
  ProfileVisibility,
  SessionSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

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
      <BrandHeader title="Settings" body="Manage your account preferences, privacy, and active sessions." />

      {/* Profile Card */}
      {user ? (
        <View style={[styles.card, styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 20 }}>
                {user.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfoWrap}>
            <Text style={[styles.userDisplayName, { color: colors.textPrimary }]}>{user.displayName}</Text>
            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>@{user.username}</Text>
          </View>
          <View style={[styles.signedInBadge, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.signedInText, { color: colors.brand }]}>Active</Text>
          </View>
        </View>
      ) : null}

      {/* Appearance Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="color-palette-outline" size={20} color={colors.brand} />
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Appearance</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
          Choose your preferred theme across the app.
        </Text>

        <View style={styles.row}>
          {[
            { label: 'System', value: 'SYSTEM', icon: 'desktop-outline' },
            { label: 'Light', value: 'LIGHT', icon: 'sunny-outline' },
            { label: 'Dark', value: 'DARK', icon: 'moon-outline' },
          ].map((themeOption) => {
            const selected = themePreference === themeOption.value;
            return (
              <Pressable
                key={themeOption.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                disabled={busy || selected}
                onPress={() => void setTheme(themeOption.value as 'SYSTEM' | 'LIGHT' | 'DARK')}
                style={({ pressed }) => [
                  styles.themePill,
                  {
                    backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                    borderColor: selected ? colors.brand : colors.border,
                    opacity: pressed || busy ? 0.75 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={themeOption.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={selected ? colors.onBrand : colors.textPrimary}
                />
                <Text
                  style={{
                    color: selected ? colors.onBrand : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  {themeOption.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Privacy Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.brand} />
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Privacy & Visibility</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
          Your visibility settings are enforced by the API. Apply a private preset anytime.
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void makePrivate()}
          style={({ pressed }) => [
            styles.privatePresetButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              opacity: pressed || busy ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.brand} />
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
            Make All Activity Private
          </Text>
        </Pressable>

        <VisibilityControl
          disabled={busy}
          label="Leaderboard"
          value={privacy.data?.leaderboardVisibility ?? 'PRIVATE'}
          onChange={(value) => void setGamificationVisibility('leaderboardVisibility', value)}
        />
        <VisibilityControl
          disabled={busy}
          label="Movie Passport"
          value={privacy.data?.passportVisibility ?? 'PRIVATE'}
          onChange={(value) => void setGamificationVisibility('passportVisibility', value)}
        />
      </View>

      {/* Active Sessions Section */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="hardware-chip-outline" size={20} color={colors.brand} />
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Active Sessions</Text>
        </View>

        <View style={styles.sessionsList}>
          {sessions.data?.map((sessionItem) => (
            <View key={sessionItem.id} style={[styles.sessionRow, { borderColor: colors.border }]}>
              <Ionicons
                name={sessionItem.current ? 'phone-portrait-outline' : 'laptop-outline'}
                size={20}
                color={colors.brand}
              />
              <View style={styles.sessionTextWrap}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
                  {sessionItem.current ? 'This Device' : sessionItem.deviceName ?? sessionItem.platform}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Last seen {new Date(sessionItem.lastSeenAt).toLocaleDateString()}
                </Text>
              </View>
              {sessionItem.current ? (
                <View style={[styles.activePill, { backgroundColor: 'rgba(79, 209, 165, 0.15)' }]}>
                  <Text style={{ color: '#4FD1A5', fontWeight: '700', fontSize: 11 }}>Active</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>

        <Button
          label="Sign out other devices"
          variant="secondary"
          disabled={busy}
          onPress={() => void revokeOthers()}
        />
      </View>

      {message === null ? null : <ErrorText>{message}</ErrorText>}

      {/* Sign Out Button */}
      <Button
        label="Sign Out"
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
      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 14 }}>{label}</Text>
      <View style={styles.row}>
        {[
          { label: 'Private', value: 'PRIVATE', icon: 'lock-closed-outline' },
          { label: 'Friends', value: 'FRIENDS', icon: 'people-outline' },
          { label: 'Public', value: 'PUBLIC', icon: 'globe-outline' },
        ].map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              disabled={disabled || selected}
              onPress={() => onChange(option.value as ProfileVisibility)}
              style={({ pressed }) => [
                styles.visibilityPill,
                {
                  backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                  borderColor: selected ? colors.brand : colors.border,
                  opacity: pressed || disabled ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={selected ? colors.onBrand : colors.textPrimary}
              />
              <Text
                style={{
                  color: selected ? colors.onBrand : colors.textPrimary,
                  fontWeight: '600',
                  fontSize: 12,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, gap: 14, padding: 18 },
  userCard: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  userAvatar: { borderRadius: 24, height: 48, width: 48 },
  userAvatarFallback: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  userInfoWrap: { flex: 1, gap: 2 },
  userDisplayName: { fontSize: 17, fontWeight: '800' },
  userUsername: { fontSize: 13 },
  signedInBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  signedInText: { fontSize: 12, fontWeight: '700' },
  sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  heading: { fontSize: 18, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themePill: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
    minWidth: 90,
  },
  privatePresetButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    height: 44,
    justifyContent: 'center',
  },
  visibility: { gap: 8 },
  visibilityPill: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    height: 40,
    justifyContent: 'center',
    minWidth: 85,
  },
  sessionsList: { gap: 8 },
  sessionRow: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  sessionTextWrap: { flex: 1, gap: 2 },
  activePill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
});
