import type {
  ContentType,
  GenreSummary,
  MediaDetails,
  MediaSummary,
  RatingSystem,
  SpoilerPreference,
  StreamingProviderSummary,
  UserPreferences,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import {
  ChoiceRow,
  SelectChip,
  SettingsCard,
  ToggleRow,
  settingsControlStyles,
} from '../../src/components/settings-controls';
import { Button, Field, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

function toggle(items: string[], value: string): string[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function commaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function PreferenceSettingsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preferencesKey = ['preferences', user?.id ?? 'anonymous'] as const;
  const preferences = useQuery({
    queryKey: preferencesKey,
    queryFn: () => api.request<UserPreferences>('users/me/preferences'),
    enabled: user !== null,
  });
  const genres = useQuery({
    queryKey: ['genres'],
    queryFn: () => api.request<GenreSummary[]>('genres'),
  });
  const providers = useQuery({
    queryKey: ['streaming-providers'],
    queryFn: () => api.request<StreamingProviderSummary[]>('streaming-providers'),
  });
  const [preferredLanguages, setPreferredLanguages] = useState('');
  const [preferredCountries, setPreferredCountries] = useState('');
  const [preferredDecades, setPreferredDecades] = useState('');
  const [runtimeMin, setRuntimeMin] = useState('');
  const [runtimeMax, setRuntimeMax] = useState('');
  const [streamingCountry, setStreamingCountry] = useState('US');
  const [favoriteSearch, setFavoriteSearch] = useState('');
  const [favoriteResults, setFavoriteResults] = useState<MediaSummary[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const data = preferences.data;
    if (data === undefined) return;
    setPreferredLanguages(data.preferredLanguages.join(', '));
    setPreferredCountries(data.preferredCountries.join(', '));
    setPreferredDecades(data.preferredDecades.join(', '));
    setRuntimeMin(data.preferredRuntimeMin?.toString() ?? '');
    setRuntimeMax(data.preferredRuntimeMax?.toString() ?? '');
    setStreamingCountry(data.defaultCountryForStreaming);
  }, [preferences.data]);

  const update = useMutation({
    mutationFn: (body: Partial<UserPreferences>) =>
      api.request<UserPreferences>('users/me/preferences', { method: 'PATCH', body }),
    onSuccess: (updated) => {
      queryClient.setQueryData(preferencesKey, updated);
      setMessage('Preferences saved.');
    },
    onError: (error) => setMessage(errorMessage(error)),
  });

  const data = preferences.data;
  const favoriteDetails = useQuery({
    queryKey: ['favorite-media-details', data?.favoriteMediaIds ?? []],
    queryFn: () =>
      Promise.all(
        (data?.favoriteMediaIds ?? []).map((mediaId) =>
          api.request<MediaDetails>(
            `media/${encodeURIComponent(mediaId)}?language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}&countryCode=${encodeURIComponent(user?.countryCode ?? 'US')}`,
          ),
        ),
      ),
    enabled: data !== undefined && data.favoriteMediaIds.length > 0,
  });
  const searchFavorites = async () => {
    if (favoriteSearch.trim().length < 2) return;
    try {
      setFavoriteResults(
        await api.request<MediaSummary[]>(
          `search/media?q=${encodeURIComponent(favoriteSearch.trim())}&language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}`,
        ),
      );
    } catch (error) {
      setMessage(errorMessage(error));
    }
  };
  const saveRegional = () => {
    const min = runtimeMin.trim() === '' ? null : Number(runtimeMin);
    const max = runtimeMax.trim() === '' ? null : Number(runtimeMax);
    update.mutate({
      preferredLanguages: commaList(preferredLanguages),
      preferredCountries: commaList(preferredCountries).map((code) => code.toUpperCase()),
      preferredDecades: commaList(preferredDecades).map(Number),
      preferredRuntimeMin: min,
      preferredRuntimeMax: max,
      defaultCountryForStreaming: streamingCountry.trim().toUpperCase(),
    });
  };

  if (preferences.isPending || genres.isPending || providers.isPending) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Personalization',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <ActivityIndicator color={colors.brand} />
      </Screen>
    );
  }

  if (data === undefined) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Personalization',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          Personalization settings are unavailable. Pull back and try again.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Personalization',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />

      <SettingsCard
        icon="film-outline"
        title="Content Types"
        body="Choose at least one kind of story you want CineWrapped to recommend."
      >
        <View style={settingsControlStyles.chips}>
          {(
            [
              ['MOVIE', 'Movies'],
              ['TV', 'TV'],
              ['ANIME', 'Anime'],
              ['DOCUMENTARY', 'Documentaries'],
              ['SHORT_FILM', 'Short films'],
            ] as const
          ).map(([value, label]) => (
            <SelectChip
              key={value}
              label={label}
              selected={data.contentTypes.includes(value)}
              disabled={update.isPending}
              onPress={() => {
                const next = toggle(data.contentTypes, value) as ContentType[];
                if (next.length > 0) update.mutate({ contentTypes: next });
              }}
            />
          ))}
        </View>
        <ChoiceRow<RatingSystem>
          label="Rating system"
          value={data.preferredRatingSystem}
          disabled={update.isPending}
          options={[
            { label: '5 stars', value: 'FIVE_STAR' },
            { label: '10 points', value: 'TEN_POINT' },
            { label: 'Like / dislike', value: 'LIKE_DISLIKE' },
          ]}
          onChange={(preferredRatingSystem) => update.mutate({ preferredRatingSystem })}
        />
        <ChoiceRow<SpoilerPreference>
          label="Spoilers"
          value={data.spoilerPreference}
          disabled={update.isPending}
          options={[
            { label: 'Always hide', value: 'ALWAYS_HIDE' },
            { label: 'Reveal manually', value: 'HIDE_UNTIL_REVEALED' },
            { label: 'Show', value: 'SHOW' },
          ]}
          onChange={(spoilerPreference) => update.mutate({ spoilerPreference })}
        />
        <ToggleRow
          label="Adult content"
          body="Allow mature titles to appear in discovery and recommendations."
          value={data.adultContentEnabled}
          disabled={update.isPending}
          onChange={(adultContentEnabled) => update.mutate({ adultContentEnabled })}
        />
      </SettingsCard>

      <SettingsCard
        icon="heart-outline"
        title="Genre Taste"
        body="Preferred genres raise recommendation scores; disliked genres lower them."
      >
        <Text style={[styles.subheading, { color: colors.textPrimary }]}>Preferred</Text>
        <View style={settingsControlStyles.chips}>
          {(genres.data ?? []).map((genre) => (
            <SelectChip
              key={`preferred-${genre.id}`}
              label={genre.name}
              selected={data.preferredGenreIds.includes(genre.id)}
              disabled={update.isPending}
              onPress={() => {
                const preferredGenreIds = toggle(data.preferredGenreIds, genre.id);
                const dislikedGenreIds = data.dislikedGenreIds.filter((id) => id !== genre.id);
                update.mutate({ preferredGenreIds, dislikedGenreIds });
              }}
            />
          ))}
        </View>
        <Text style={[styles.subheading, { color: colors.textPrimary }]}>Disliked</Text>
        <View style={settingsControlStyles.chips}>
          {(genres.data ?? []).map((genre) => (
            <SelectChip
              key={`disliked-${genre.id}`}
              label={genre.name}
              selected={data.dislikedGenreIds.includes(genre.id)}
              disabled={update.isPending}
              onPress={() => {
                const dislikedGenreIds = toggle(data.dislikedGenreIds, genre.id);
                const preferredGenreIds = data.preferredGenreIds.filter((id) => id !== genre.id);
                update.mutate({ preferredGenreIds, dislikedGenreIds });
              }}
            />
          ))}
        </View>
      </SettingsCard>

      <SettingsCard
        icon="star-outline"
        title="Favorite Titles"
        body="Keep 5–20 favorites as strong recommendation signals."
      >
        <Text style={[styles.subheading, { color: colors.textPrimary }]}>Selected</Text>
        <View style={settingsControlStyles.chips}>
          {(favoriteDetails.data ?? []).map((media) => (
            <SelectChip
              key={media.id}
              label={media.title}
              selected
              disabled={update.isPending || data.favoriteMediaIds.length <= 5}
              onPress={() =>
                update.mutate({
                  favoriteMediaIds: data.favoriteMediaIds.filter((id) => id !== media.id),
                })
              }
            />
          ))}
        </View>
        {favoriteDetails.isPending ? <ActivityIndicator color={colors.brand} /> : null}
        <View style={settingsControlStyles.fields}>
          <Field
            label="Find a title"
            returnKeyType="search"
            value={favoriteSearch}
            onChangeText={setFavoriteSearch}
            onSubmitEditing={() => void searchFavorites()}
          />
          <Button
            label="Search Titles"
            variant="secondary"
            onPress={() => void searchFavorites()}
          />
        </View>
        <View style={settingsControlStyles.chips}>
          {favoriteResults.map((media) => {
            const selected = data.favoriteMediaIds.includes(media.id);
            return (
              <SelectChip
                key={`search-${media.id}`}
                label={`${media.title}${media.releaseYear === null ? '' : ` (${media.releaseYear})`}`}
                selected={selected}
                disabled={
                  update.isPending ||
                  (!selected && data.favoriteMediaIds.length >= 20) ||
                  (selected && data.favoriteMediaIds.length <= 5)
                }
                onPress={() =>
                  update.mutate({ favoriteMediaIds: toggle(data.favoriteMediaIds, media.id) })
                }
              />
            );
          })}
        </View>
      </SettingsCard>

      <SettingsCard
        icon="tv-outline"
        title="Streaming Services"
        body="Recommendations can prioritize titles available on your services."
      >
        <View style={settingsControlStyles.chips}>
          {(providers.data ?? []).map((provider) => (
            <SelectChip
              key={provider.id}
              label={provider.name}
              selected={data.streamingProviderIds.includes(provider.id)}
              disabled={update.isPending}
              onPress={() =>
                update.mutate({
                  streamingProviderIds: toggle(data.streamingProviderIds, provider.id),
                })
              }
            />
          ))}
        </View>
      </SettingsCard>

      <SettingsCard
        icon="compass-outline"
        title="Discovery Balance"
        body="Tune how often familiar hits appear compared with lesser-known titles."
      >
        <ChoiceRow<number>
          label="Mainstream preference"
          value={data.mainstreamPreferencePercent}
          disabled={update.isPending}
          options={[
            { label: 'Hidden gems', value: 25 },
            { label: 'Balanced', value: 50 },
            { label: 'Popular picks', value: 75 },
          ]}
          onChange={(mainstreamPreferencePercent) => update.mutate({ mainstreamPreferencePercent })}
        />
      </SettingsCard>

      <SettingsCard
        icon="globe-outline"
        title="Recommendation Filters"
        body="Use comma-separated language tags, country codes, and decades."
      >
        <View style={settingsControlStyles.fields}>
          <Field
            label="Languages"
            placeholder="en, fr"
            value={preferredLanguages}
            onChangeText={setPreferredLanguages}
          />
          <Field
            label="Countries"
            placeholder="US, GH"
            autoCapitalize="characters"
            value={preferredCountries}
            onChangeText={setPreferredCountries}
          />
          <Field
            label="Decades"
            placeholder="1990, 2000, 2010"
            keyboardType="numbers-and-punctuation"
            value={preferredDecades}
            onChangeText={setPreferredDecades}
          />
          <View style={styles.runtimeRow}>
            <View style={styles.grow}>
              <Field
                label="Minimum runtime"
                keyboardType="number-pad"
                value={runtimeMin}
                onChangeText={setRuntimeMin}
              />
            </View>
            <View style={styles.grow}>
              <Field
                label="Maximum runtime"
                keyboardType="number-pad"
                value={runtimeMax}
                onChangeText={setRuntimeMax}
              />
            </View>
          </View>
          <Field
            label="Streaming country"
            autoCapitalize="characters"
            maxLength={2}
            value={streamingCountry}
            onChangeText={setStreamingCountry}
          />
          <Button label="Save Filters" loading={update.isPending} onPress={saveRegional} />
        </View>
      </SettingsCard>

      <SettingsCard
        icon="accessibility-outline"
        title="Playback & Accessibility"
        body="These preferences also control motion on the Discover carousel."
      >
        <ToggleRow
          label="Autoplay trailers"
          value={data.autoplayTrailers}
          disabled={update.isPending}
          onChange={(autoplayTrailers) => update.mutate({ autoplayTrailers })}
        />
        <ToggleRow
          label="Reduce motion"
          body="Disables automatic carousel movement and minimizes nonessential animation."
          value={data.reduceMotion}
          disabled={update.isPending}
          onChange={(reduceMotion) => update.mutate({ reduceMotion })}
        />
      </SettingsCard>

      {message === null ? null : (
        <Text accessibilityRole="alert" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  subheading: { fontSize: 14, fontWeight: '800' },
  runtimeRow: { flexDirection: 'row', gap: 10 },
  grow: { flex: 1 },
});
