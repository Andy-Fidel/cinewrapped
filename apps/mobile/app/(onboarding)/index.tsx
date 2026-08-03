import type {
  CurrentUser,
  GenreSummary,
  MediaSummary,
  StreamingProviderSummary,
} from '@cinewrapped/shared-types';
import { usernameSchema } from '@cinewrapped/validation';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader, Button, ErrorText, Field, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/providers/auth-provider';
import { useOnboardingStore } from '../../src/stores/onboarding-store';

const steps = [
  'Your profile',
  'Pick your genres',
  'Choose five favorites',
  'Your services',
  'Tune recommendations',
  'Stay in the loop',
];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surfaceRaised,
          borderColor: selected ? colors.brand : colors.border,
        },
      ]}
    >
      <Text style={{ color: selected ? colors.onBrand : colors.textPrimary, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}

function toggle(items: string[], id: string): string[] {
  return items.includes(id) ? items.filter((item) => item !== id) : [...items, id];
}

function decodeBase64(base64: string): ArrayBuffer {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

export default function OnboardingScreen() {
  const colors = useColors();
  const { user, refreshUser } = useAuth();
  const draft = useOnboardingStore();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<MediaSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profileAttempted, setProfileAttempted] = useState(false);
  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: () => api.request<GenreSummary[]>('genres'),
  });
  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.request<StreamingProviderSummary[]>('streaming-providers'),
  });

  useEffect(() => {
    if (user !== null && draft.username.length === 0)
      draft.patch({
        username: user.username.startsWith('user_') ? '' : user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        profileVersion: user.version,
      });
  }, [draft, user]);

  const mark = (step: string) =>
    api.request('users/me/onboarding', { method: 'PATCH', body: { step } });
  const next = async () => {
    if (user === null) return;
    setBusy(true);
    setMessage(null);
    try {
      if (draft.step === 0) {
        setProfileAttempted(true);
        const parsedUsername = usernameSchema.safeParse(draft.username);
        if (!parsedUsername.success) {
          throw new Error('Enter a username with 3–30 lowercase letters, numbers, or underscores.');
        }
        if (draft.displayName.trim().length === 0) throw new Error('Enter your display name.');
        const username = parsedUsername.data;
        const updated = await api.request<CurrentUser>('users/me', {
          method: 'PATCH',
          body: {
            expectedVersion: draft.profileVersion,
            username,
            displayName: draft.displayName,
            avatarUrl: draft.avatarUrl,
          },
        });
        draft.patch({ profileVersion: updated.version });
        await mark('PROFILE');
      } else if (draft.step === 1) {
        if (draft.genreIds.length < 5) throw new Error('Choose at least five genres.');
        await api.request('users/me/preferences', {
          method: 'PATCH',
          body: { preferredGenreIds: draft.genreIds, contentTypes: ['MOVIE', 'TV'] },
        });
        await mark('CONTENT_TYPES');
        await mark('GENRES');
      } else if (draft.step === 2) {
        if (draft.favoriteMediaIds.length < 5)
          throw new Error('Choose at least five favorite titles.');
        await api.request('users/me/preferences', {
          method: 'PATCH',
          body: { favoriteMediaIds: draft.favoriteMediaIds },
        });
        await mark('FAVORITES');
      } else if (draft.step === 3) {
        await api.request('users/me/preferences', {
          method: 'PATCH',
          body: { streamingProviderIds: draft.streamingProviderIds },
        });
        await mark('STREAMING');
      } else if (draft.step === 4) {
        await api.request('users/me/preferences', {
          method: 'PATCH',
          body: {
            preferredLanguages: ['en'],
            preferredDecades: [1980, 1990, 2000, 2010, 2020],
            preferredRuntimeMin: 70,
            preferredRuntimeMax: 180,
            mainstreamPreferencePercent: draft.mainstreamPreferencePercent,
          },
        });
        await mark('RECOMMENDATIONS');
      } else {
        await api.request('users/me/preferences', {
          method: 'PATCH',
          body: {
            notificationPreferences: {
              recommendations: draft.notificationsEnabled,
              social: draft.notificationsEnabled,
              product: false,
            },
          },
        });
        await mark('NOTIFICATIONS');
        await api.request('users/me/onboarding/complete', {
          method: 'POST',
          idempotencyKey: `onboarding-${globalThis.crypto.randomUUID()}`,
          body: {
            acceptedPrivacyVersion: '2026-08-01',
            acceptedTermsVersion: '2026-08-01',
            expectedProfileVersion: draft.profileVersion,
          },
        });
        await refreshUser();
        draft.reset();
        router.replace('/(tabs)');
        return;
      }
      draft.patch({ step: draft.step + 1 });
    } catch (error) {
      const detail = errorMessage(error);
      setMessage(detail);
      Alert.alert('Could not continue', detail);
    } finally {
      setBusy(false);
    }
  };

  const uploadAvatar = async () => {
    if (user === null) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const detail =
        'Allow photo access in Settings to choose an avatar. You can also continue without one.';
      setMessage(detail);
      Alert.alert('Photo access is off', detail, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => void Linking.openSettings() },
      ]);
      return;
    }
    setMessage(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });
    if (picked.canceled) return;
    setBusy(true);
    try {
      const asset = picked.assets[0];
      if (asset === undefined) return;
      if (asset.base64 == null)
        throw new Error('The selected photo could not be read. Try another photo.');
      const body = decodeBase64(asset.base64);
      const identity = (await supabase.auth.getUser()).data.user;
      if (identity === null) throw new Error('Your identity session has expired.');
      const path = `${identity.id}/${globalThis.crypto.randomUUID()}.jpg`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, body, { contentType: asset.mimeType ?? 'image/jpeg', upsert: false });
      if (error !== null) throw error;
      draft.patch({
        avatarUrl: supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl,
      });
    } catch (error) {
      const detail = errorMessage(error);
      setMessage(detail);
      Alert.alert('Avatar upload failed', `${detail}\n\nYou can continue without an avatar.`);
    } finally {
      setBusy(false);
    }
  };

  const searchMedia = async () => {
    if (search.trim().length < 2) return;
    setBusy(true);
    setMessage(null);
    try {
      setResults(
        await api.request<MediaSummary[]>(
          `search/media?q=${encodeURIComponent(search.trim())}&language=en-US`,
        ),
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={[styles.progress, { color: colors.textSecondary }]}>
        STEP {draft.step + 1} OF {steps.length}
      </Text>
      <BrandHeader
        title={steps[draft.step] ?? 'Make it yours'}
        body="You can change these choices later in Settings."
      />
      {draft.step === 0 && (
        <>
          <Field
            label="Username"
            autoCapitalize="none"
            value={draft.username}
            error={
              profileAttempted && !usernameSchema.safeParse(draft.username).success
                ? 'Use 3–30 lowercase letters, numbers, or underscores.'
                : undefined
            }
            onChangeText={(username) => {
              setMessage(null);
              draft.patch({ username });
            }}
          />
          <Field
            label="Display name"
            value={draft.displayName}
            error={
              profileAttempted && draft.displayName.trim().length === 0
                ? 'Display name is required.'
                : undefined
            }
            onChangeText={(displayName) => {
              setMessage(null);
              draft.patch({ displayName });
            }}
          />
          {draft.avatarUrl === null ? null : (
            <Image source={{ uri: draft.avatarUrl }} style={styles.avatar} />
          )}
          <Button
            label={draft.avatarUrl === null ? 'Choose avatar' : 'Change avatar'}
            variant="secondary"
            disabled={busy}
            onPress={() => void uploadAvatar()}
          />
          <Text style={{ color: colors.textSecondary }}>
            Avatar is optional—you can add it later.
          </Text>
        </>
      )}
      {draft.step === 1 && (
        <View style={styles.chips}>
          {genres.data?.map((genre) => (
            <Chip
              key={genre.id}
              label={genre.name}
              selected={draft.genreIds.includes(genre.id)}
              onPress={() => draft.patch({ genreIds: toggle(draft.genreIds, genre.id) })}
            />
          ))}
        </View>
      )}
      {draft.step === 2 && (
        <>
          <Field
            label="Search movies and shows"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => void searchMedia()}
          />
          <Button label="Search" variant="secondary" onPress={() => void searchMedia()} />{' '}
          <Text style={{ color: colors.textSecondary }}>
            {draft.favoriteMediaIds.length}/5 minimum selected
          </Text>
          <View style={styles.chips}>
            {results.map((media) => (
              <Chip
                key={media.id}
                label={`${media.title}${media.releaseYear === null ? '' : ` (${media.releaseYear})`}`}
                selected={draft.favoriteMediaIds.includes(media.id)}
                onPress={() =>
                  draft.patch({ favoriteMediaIds: toggle(draft.favoriteMediaIds, media.id) })
                }
              />
            ))}
          </View>
        </>
      )}
      {draft.step === 3 && (
        <>
          <Text style={{ color: colors.textSecondary }}>
            Select any services you use—or continue with none.
          </Text>
          <View style={styles.chips}>
            {providers.data?.map((provider) => (
              <Chip
                key={provider.id}
                label={provider.name}
                selected={draft.streamingProviderIds.includes(provider.id)}
                onPress={() =>
                  draft.patch({
                    streamingProviderIds: toggle(draft.streamingProviderIds, provider.id),
                  })
                }
              />
            ))}
          </View>
        </>
      )}
      {draft.step === 4 && (
        <>
          <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>Discovery balance</Text>
          <Chip
            label="Hidden gems"
            selected={draft.mainstreamPreferencePercent === 25}
            onPress={() => draft.patch({ mainstreamPreferencePercent: 25 })}
          />
          <Chip
            label="A balanced mix"
            selected={draft.mainstreamPreferencePercent === 50}
            onPress={() => draft.patch({ mainstreamPreferencePercent: 50 })}
          />
          <Chip
            label="Popular picks"
            selected={draft.mainstreamPreferencePercent === 75}
            onPress={() => draft.patch({ mainstreamPreferencePercent: 75 })}
          />
        </>
      )}
      {draft.step === 5 && (
        <>
          <Text style={{ color: colors.textSecondary }}>
            Get recommendation and social updates. Marketing stays off by default.
          </Text>
          <Chip
            label={draft.notificationsEnabled ? 'Notifications enabled' : 'Notifications paused'}
            selected={draft.notificationsEnabled}
            onPress={() => draft.patch({ notificationsEnabled: !draft.notificationsEnabled })}
          />
        </>
      )}
      {message === null ? null : <ErrorText>{message}</ErrorText>}
      <View style={styles.actions}>
        {draft.step === 0 ? null : (
          <Button
            label="Back"
            variant="secondary"
            disabled={busy}
            onPress={() => draft.patch({ step: draft.step - 1 })}
          />
        )}
        <View style={styles.grow}>
          <Button
            label={draft.step === steps.length - 1 ? 'Finish setup' : 'Continue'}
            loading={busy}
            onPress={() => void next()}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignSelf: 'center', borderRadius: 56, height: 112, width: 112 },
  progress: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  choiceTitle: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  grow: { flex: 1 },
});
