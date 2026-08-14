import type {
  CurrentUser,
  GenreSummary,
  MediaSummary,
  StreamingProviderSummary,
} from '@cinewrapped/shared-types';
import { usernameSchema } from '@cinewrapped/validation';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
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
  'Your Profile',
  'Pick Your Genres',
  'Choose Five Favorites',
  'Your Services',
  'Tune Recommendations',
  'Stay in the Loop',
];

function StepProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const colors = useColors();
  return (
    <View style={styles.stepProgressContainer}>
      <View style={styles.stepSegmentsRow}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index <= currentStep;
          return (
            <View
              key={index}
              style={[
                styles.stepSegment,
                {
                  backgroundColor: isCompleted ? colors.brand : colors.surfaceRaised,
                },
              ]}
            />
          );
        })}
      </View>
      <View style={styles.stepTextRow}>
        <Text style={[styles.stepEyebrow, { color: colors.brand }]}>
          STEP {currentStep + 1} OF {totalSteps}
        </Text>
        <Text style={[styles.stepTitleLabel, { color: colors.textSecondary }]}>
          {steps[currentStep]}
        </Text>
      </View>
    </View>
  );
}

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
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.brand : colors.surfaceRaised,
          borderColor: selected ? colors.brand : colors.border,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      {selected ? (
        <Ionicons
          name="checkmark-circle"
          size={16}
          color={colors.onBrand}
          style={{ marginRight: 4 }}
        />
      ) : null}
      <Text
        style={{
          color: selected ? colors.onBrand : colors.textPrimary,
          fontWeight: '600',
          fontSize: 13,
        }}
      >
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
  const hydrateProfile = draft.hydrateProfile;

  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: () => api.request<GenreSummary[]>('genres'),
  });

  const providers = useQuery({
    queryKey: ['providers'],
    queryFn: () => api.request<StreamingProviderSummary[]>('streaming-providers'),
  });

  useEffect(() => {
    if (user !== null) hydrateProfile(user);
  }, [hydrateProfile, user]);

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
          idempotencyKey: `onboarding-${randomUUID()}`,
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
      const path = `${identity.id}/${randomUUID()}.jpg`;
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
      {/* Step Progress Bar Header */}
      <StepProgressBar currentStep={draft.step} totalSteps={steps.length} />

      <BrandHeader
        title={steps[draft.step] ?? 'Make it yours'}
        body="You can change these choices later in Settings."
      />

      {/* Step 0: Profile Setup */}
      {draft.step === 0 && (
        <View style={styles.stepContentWrap}>
          {/* Avatar Upload Container */}
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void uploadAvatar()}
            style={({ pressed }) => [
              styles.avatarContainer,
              { opacity: pressed || busy ? 0.8 : 1 },
            ]}
          >
            {draft.avatarUrl ? (
              <Image source={{ uri: draft.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="person-outline" size={40} color={colors.brand} />
              </View>
            )}
            <View style={[styles.cameraBadge, { backgroundColor: colors.brand }]}>
              <Ionicons name="camera-outline" size={16} color={colors.onBrand} />
            </View>
          </Pressable>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            Tap to choose avatar photo (optional)
          </Text>

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
        </View>
      )}

      {/* Step 1: Genres */}
      {draft.step === 1 && (
        <View style={styles.stepContentWrap}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Select at least 5 genres to help us personalize your recommendations (
            {draft.genreIds.length}/5).
          </Text>
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
        </View>
      )}

      {/* Step 2: Favorites */}
      {draft.step === 2 && (
        <View style={styles.stepContentWrap}>
          <Field
            label="Search movies and shows"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => void searchMedia()}
          />
          <Button label="Search Titles" variant="secondary" onPress={() => void searchMedia()} />
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            Selected: {draft.favoriteMediaIds.length}/5 minimum titles
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
        </View>
      )}

      {/* Step 3: Streaming Services */}
      {draft.step === 3 && (
        <View style={styles.stepContentWrap}>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
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
        </View>
      )}

      {/* Step 4: Discovery Balance */}
      {draft.step === 4 && (
        <View style={styles.stepContentWrap}>
          <Text style={[styles.choiceTitle, { color: colors.textPrimary }]}>Discovery Balance</Text>
          {[
            {
              percent: 25,
              title: 'Hidden Gems',
              desc: 'Prioritize indie, cult classic, and rare titles.',
              icon: 'sparkles-outline',
            },
            {
              percent: 50,
              title: 'Balanced Mix',
              desc: 'An equal blend of mainstream hits and hidden gems.',
              icon: 'git-compare-outline',
            },
            {
              percent: 75,
              title: 'Popular Picks',
              desc: 'Focus on trending blockbusters and award winners.',
              icon: 'flame-outline',
            },
          ].map((option) => {
            const selected = draft.mainstreamPreferencePercent === option.percent;
            return (
              <Pressable
                key={option.percent}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => draft.patch({ mainstreamPreferencePercent: option.percent })}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: selected ? colors.surfaceRaised : colors.surface,
                    borderColor: selected ? colors.brand : colors.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.optionIconBox,
                    { backgroundColor: selected ? colors.brand : colors.surfaceRaised },
                  ]}
                >
                  <Ionicons
                    name={option.icon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={selected ? colors.onBrand : colors.textPrimary}
                  />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                    {option.title}
                  </Text>
                  <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                    {option.desc}
                  </Text>
                </View>
                {selected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Step 5: Notifications */}
      {draft.step === 5 && (
        <View style={styles.stepContentWrap}>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: draft.notificationsEnabled }}
            onPress={() => draft.patch({ notificationsEnabled: !draft.notificationsEnabled })}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: draft.notificationsEnabled ? colors.surfaceRaised : colors.surface,
                borderColor: draft.notificationsEnabled ? colors.brand : colors.border,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View
              style={[
                styles.optionIconBox,
                {
                  backgroundColor: draft.notificationsEnabled ? colors.brand : colors.surfaceRaised,
                },
              ]}
            >
              <Ionicons
                name={draft.notificationsEnabled ? 'notifications' : 'notifications-off-outline'}
                size={22}
                color={draft.notificationsEnabled ? colors.onBrand : colors.textPrimary}
              />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>
                {draft.notificationsEnabled ? 'Notifications Enabled' : 'Notifications Paused'}
              </Text>
              <Text style={[styles.optionDesc, { color: colors.textSecondary }]}>
                Get personalized recommendation updates and friend activity alerts.
              </Text>
            </View>
            <Ionicons
              name={draft.notificationsEnabled ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={draft.notificationsEnabled ? colors.brand : colors.textDisabled}
            />
          </Pressable>
        </View>
      )}

      {message === null ? null : <ErrorText>{message}</ErrorText>}

      {/* Action Buttons */}
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
  stepProgressContainer: { gap: 8, marginTop: 10, width: '100%' },
  stepSegmentsRow: { flexDirection: 'row', gap: 6, width: '100%' },
  stepSegment: { borderRadius: 999, flex: 1, height: 4 },
  stepTextRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  stepEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  stepTitleLabel: { fontSize: 12, fontWeight: '600' },
  stepContentWrap: { gap: 14 },
  avatarContainer: { alignSelf: 'center', position: 'relative' },
  avatarImage: { borderRadius: 56, height: 112, width: 112 },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 56,
    height: 112,
    justifyContent: 'center',
    width: 112,
  },
  cameraBadge: {
    alignItems: 'center',
    borderRadius: 16,
    bottom: 2,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 2,
    width: 32,
  },
  avatarHint: { fontSize: 13, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  choiceTitle: { fontSize: 18, fontWeight: '800' },
  optionCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  optionIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  optionTextWrap: { flex: 1, gap: 2 },
  optionTitle: { fontSize: 16, fontWeight: '800' },
  optionDesc: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  grow: { flex: 1 },
});
