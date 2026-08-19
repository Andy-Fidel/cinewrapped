import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsCard, SettingsLink } from '../../src/components/settings-controls';
import { BrandHeader, BrandLogo, Button, Screen, useColors } from '../../src/components/ui';
import { useAuth } from '../../src/providers/auth-provider';
import { useTheme } from '../../src/providers/theme-provider';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';
import { useDialog } from '../../src/providers/dialog-provider';

export default function SettingsScreen() {
  const colors = useColors();
  const { user, signOut } = useAuth();
  const { preference: themePreference, setPreference: setThemePreference } = useTheme();
  const { isEnabled } = useFeatureFlags();
  const { confirm, showError } = useDialog();

  const handleSignOut = async () => {
    const accepted = await confirm({
      title: 'Sign out of CineWrapped?',
      message: 'You will need to sign in again to access your profile and private data.',
      confirmLabel: 'Sign Out',
      destructive: true,
    });
    if (!accepted) return;
    try {
      await signOut();
    } catch (error) {
      showError('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  return (
    <Screen>
      <BrandHeader
        title="Settings"
        body="Manage your profile, recommendations, privacy, notifications, and account security."
      />

      {user ? (
        <Pressable
          accessibilityHint="Edit your profile and regional settings"
          accessibilityRole="button"
          onPress={() => router.push('/settings/profile')}
          style={({ pressed }) => [
            styles.userCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.userAvatar} />
          ) : (
            <View style={[styles.userAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ color: colors.brand, fontSize: 20, fontWeight: '800' }}>
                {user.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.userInfoWrap}>
            <Text style={[styles.userDisplayName, { color: colors.textPrimary }]}>
              {user.displayName}
            </Text>
            <Text style={[styles.userUsername, { color: colors.textSecondary }]}>
              @{user.username} · {user.countryCode}
            </Text>
          </View>
          <Ionicons name="create-outline" size={20} color={colors.brand} />
        </Pressable>
      ) : null}

      <SettingsCard
        icon="color-palette-outline"
        title="Appearance"
        body="Choose your preferred theme across the app."
      >
        <View accessibilityRole="radiogroup" style={styles.themeRow}>
          {[
            { label: 'System', value: 'SYSTEM', icon: 'desktop-outline' },
            { label: 'Light', value: 'LIGHT', icon: 'sunny-outline' },
            { label: 'Dark', value: 'DARK', icon: 'moon-outline' },
          ].map((themeOption) => {
            const selected = themePreference === themeOption.value;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                disabled={selected}
                key={themeOption.value}
                onPress={() =>
                  void setThemePreference(themeOption.value as 'SYSTEM' | 'LIGHT' | 'DARK')
                }
                style={({ pressed }) => [
                  styles.themePill,
                  {
                    backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                    borderColor: selected ? colors.brand : colors.border,
                    opacity: pressed ? 0.75 : 1,
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
                    fontSize: 13,
                    fontWeight: '700',
                  }}
                >
                  {themeOption.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SettingsCard>

      <View style={styles.links}>
        {isEnabled('MOVIE_JOURNAL') ? (
          <SettingsLink
            icon="book-outline"
            label="Movie Journal"
            detail="Private notes, moods, photos, tickets, and viewing memories"
            onPress={() => router.push('/journal')}
          />
        ) : null}
        {isEnabled('CALENDAR_INTEGRATION') ? (
          <SettingsLink
            icon="calendar-outline"
            label="Viewing Calendar"
            detail="Watch plans, release reminders, and calendar export"
            onPress={() => router.push('/calendar')}
          />
        ) : null}
        {isEnabled('SOUNDTRACKS') ? (
          <SettingsLink
            icon="musical-notes-outline"
            label="Saved Soundtracks"
            detail="Music discovered and bookmarked from movies and series"
            onPress={() => router.push('/soundtracks')}
          />
        ) : null}
        {isEnabled('SCENE_IDENTIFICATION') ? (
          <SettingsLink
            icon="scan-outline"
            label="Identify a Scene"
            detail="Use a screenshot to find a movie or television title"
            onPress={() => router.push('/scene-identification')}
          />
        ) : null}
        <SettingsLink
          icon="person-circle-outline"
          label="Profile & Region"
          detail="Avatar, name, bio, language, country, and timezone"
          onPress={() => router.push('/settings/profile')}
        />
        <SettingsLink
          icon="options-outline"
          label="Personalization"
          detail="Genres, services, discovery balance, content, and playback"
          onPress={() => router.push('/settings/preferences')}
        />
        <SettingsLink
          icon="notifications-outline"
          label="Notifications"
          detail="Recommendation, social, and product update preferences"
          onPress={() => router.push('/settings/notifications')}
        />
        <SettingsLink
          icon="shield-checkmark-outline"
          label="Privacy & Visibility"
          detail="Control every audience and activity-sharing setting"
          onPress={() => router.push('/settings/privacy')}
        />
        <SettingsLink
          icon="lock-closed-outline"
          label="Security & Sessions"
          detail="Change your password and manage signed-in devices"
          onPress={() => router.push('/settings/security')}
        />
      </View>

      <View style={{ alignItems: 'center', marginVertical: 18, gap: 6 }}>
        <BrandLogo size="md" variant="full" />
        <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
          v0.1.0 · Crafted for cinephiles
        </Text>
      </View>

      <Button label="Sign Out" variant="danger" onPress={() => void handleSignOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  userCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  userAvatar: { borderRadius: 26, height: 52, width: 52 },
  userAvatarFallback: {
    alignItems: 'center',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  userInfoWrap: { flex: 1, gap: 3 },
  userDisplayName: { fontSize: 17, fontWeight: '800' },
  userUsername: { fontSize: 13 },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
  links: { gap: 10 },
});
