import type { CurrentUser, ProfileVisibility } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { Stack, router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import {
  ChoiceRow,
  SettingsCard,
  SettingsLink,
  ToggleRow,
} from '../../src/components/settings-controls';
import { Button, Field, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

function decodeBase64(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export default function ProfileSettingsScreen() {
  const colors = useColors();
  const { session, user, refreshUser } = useAuth();
  const { confirm, showError } = useDialog();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [preferredLanguage, setPreferredLanguage] = useState('en-US');
  const [timezone, setTimezone] = useState('UTC');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user === null) return;
    setUsername(user.username);
    setDisplayName(user.displayName);
    setBio(user.bio ?? '');
    setCountryCode(user.countryCode);
    setPreferredLanguage(user.preferredLanguage);
    setTimezone(user.timezone);
  }, [user]);

  const patchProfile = async (body: Record<string, unknown>) => {
    if (user === null) return;
    const updated = await api.request<CurrentUser>('users/me', {
      method: 'PATCH',
      body: { expectedVersion: user.version, ...body },
    });
    await refreshUser();
    return updated;
  };

  const run = async (work: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await work();
      setMessage(success);
    } catch (error) {
      const detail = errorMessage(error);
      setMessage(detail);
      showError('Could not update profile', detail);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(
      () =>
        patchProfile({
          username: username.trim().toLowerCase(),
          displayName: displayName.trim(),
          bio: bio.trim() === '' ? null : bio.trim(),
          countryCode: countryCode.trim().toUpperCase(),
          preferredLanguage: preferredLanguage.trim(),
          timezone: timezone.trim(),
        }),
      'Profile and regional settings saved.',
    );

  const uploadAvatar = async () => {
    if (user === null) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const openSettings = await confirm({
        title: 'Photo access is off',
        message: 'Allow photo access in Settings to change your avatar.',
        confirmLabel: 'Open Settings',
        cancelLabel: 'Not now',
      });
      if (openSettings) await Linking.openSettings();
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (picked.canceled) return;
    await run(async () => {
      const asset = picked.assets[0];
      if (asset?.base64 == null) throw new Error('The selected photo could not be read.');
      const identity = (await supabase.auth.getUser()).data.user;
      if (identity === null) throw new Error('Your identity session has expired.');
      const path = `${identity.id}/${randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, decodeBase64(asset.base64), {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: false,
        });
      if (error !== null) throw error;
      const avatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await patchProfile({ avatarUrl });
    }, 'Avatar updated.');
  };

  if (user === null) return null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Profile & Region',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <SettingsLink
        icon="calendar-outline"
        label="Viewing Calendar"
        detail="See upcoming watch plans and release reminders."
        onPress={() => router.push('/calendar')}
      />

      <SettingsCard
        icon="person-circle-outline"
        title="Public Profile"
        body="This information appears with your reviews, activity, and social profile."
      >
        <View style={styles.avatarRow}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Ionicons name="person-outline" size={32} color={colors.brand} />
            </View>
          )}
          <View style={styles.avatarCopy}>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {session?.user.email}
            </Text>
            <Button
              label="Change avatar"
              variant="secondary"
              disabled={busy}
              onPress={() => void uploadAvatar()}
            />
          </View>
        </View>

        <View style={styles.fields}>
          <Field
            label="Username"
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={setUsername}
          />
          <Field label="Display name" value={displayName} onChangeText={setDisplayName} />
          <Field
            label="Bio"
            multiline
            maxLength={500}
            numberOfLines={4}
            value={bio}
            onChangeText={setBio}
          />
        </View>

        <ChoiceRow<ProfileVisibility>
          label="Profile visibility"
          value={user.profileVisibility}
          disabled={busy}
          options={[
            { label: 'Private', value: 'PRIVATE' },
            { label: 'Friends', value: 'FRIENDS' },
            { label: 'Public', value: 'PUBLIC' },
          ]}
          onChange={(profileVisibility) =>
            void run(() => patchProfile({ profileVisibility }), 'Profile visibility updated.')
          }
        />
      </SettingsCard>

      <SettingsCard
        icon="globe-outline"
        title="Language & Region"
        body="These values control metadata, streaming availability, dates, and statistics."
      >
        <View style={styles.fields}>
          <Field
            label="Country code"
            autoCapitalize="characters"
            maxLength={2}
            value={countryCode}
            onChangeText={setCountryCode}
          />
          <Field
            label="Preferred language"
            autoCapitalize="none"
            value={preferredLanguage}
            onChangeText={setPreferredLanguage}
          />
          <Field
            label="Timezone"
            autoCapitalize="none"
            value={timezone}
            onChangeText={setTimezone}
          />
        </View>
      </SettingsCard>

      <SettingsCard
        icon="sparkles-outline"
        title="Data & Recommendations"
        body="Choose whether CineWrapped uses your activity for recommendations and analytics."
      >
        <ToggleRow
          label="Personalized recommendations"
          value={user.recommendationOptIn}
          disabled={busy}
          onChange={(recommendationOptIn) =>
            void run(
              () => patchProfile({ recommendationOptIn }),
              'Recommendation preference updated.',
            )
          }
        />
        <ToggleRow
          label="Product analytics"
          body="Allow privacy-conscious usage analytics to improve CineWrapped."
          value={user.analyticsOptIn}
          disabled={busy}
          onChange={(analyticsOptIn) =>
            void run(() => patchProfile({ analyticsOptIn }), 'Analytics preference updated.')
          }
        />
      </SettingsCard>

      {message === null ? null : (
        <Text accessibilityRole="alert" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      )}
      <Button label="Save Profile" loading={busy} onPress={() => void save()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarRow: { alignItems: 'center', flexDirection: 'row', gap: 16 },
  avatar: { borderRadius: 38, height: 76, width: 76 },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 38,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  avatarCopy: { flex: 1, gap: 8 },
  email: { fontSize: 13 },
  fields: { gap: 12 },
});
