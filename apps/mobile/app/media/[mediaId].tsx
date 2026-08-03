import type { CreditSummary, MediaDetails, ShareReceipt } from '@cinewrapped/shared-types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, useColors } from '../../src/components/ui';
import { TrackingPanel } from '../../src/components/tracking-panel';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

function Person({ credit }: { credit: CreditSummary }) {
  const colors = useColors();
  return (
    <View style={styles.person}>
      {credit.profileUrl === null ? (
        <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]} />
      ) : (
        <Image source={{ uri: credit.profileUrl }} resizeMode="cover" style={styles.avatar} />
      )}
      <Text numberOfLines={2} style={[styles.personName, { color: colors.textPrimary }]}>
        {credit.name}
      </Text>
      <Text numberOfLines={2} style={[styles.personRole, { color: colors.textSecondary }]}>
        {credit.character ?? credit.job ?? credit.department ?? credit.creditType}
      </Text>
    </View>
  );
}

export default function MediaDetailsScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const details = useQuery({
    queryKey: ['media-details', mediaId, user?.countryCode],
    queryFn: () =>
      api.request<MediaDetails>(
        `media/${encodeURIComponent(mediaId)}?language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}&countryCode=${encodeURIComponent(user?.countryCode ?? 'US')}`,
      ),
    enabled: session !== null && typeof mediaId === 'string',
    staleTime: 6 * 60 * 60 * 1000,
  });
  const shareMedia = useMutation({
    mutationFn: () => api.request<ShareReceipt>(`media/${mediaId}/shares`, { method: 'POST' }),
    onSuccess: async (receipt) => {
      await Share.share({ message: `${receipt.title}\n${receipt.webUrl}`, url: receipt.deepLink });
    },
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (details.isPending)
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.brand} />
      </SafeAreaView>
    );
  if (details.isError)
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          We couldn’t load this title.
        </Text>
        <Button label="Try again" onPress={() => void details.refetch()} />
      </SafeAreaView>
    );
  const media = details.data;
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: media.title,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <ScrollView>
        <View style={[styles.backdrop, { backgroundColor: colors.surfaceRaised }]}>
          {media.backdropUrl === null ? null : (
            <Image
              source={{ uri: media.backdropUrl }}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
        </View>
        <View style={styles.content}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            {media.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {[
              media.releaseYear,
              media.runtimeMinutes === null ? null : `${media.runtimeMinutes} min`,
              media.ageRating,
              media.averageProviderRating === null
                ? null
                : `${media.averageProviderRating.toFixed(1)}/10`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <View style={styles.chips}>
            {media.genres.map((genre) => (
              <View key={genre.id} style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={{ color: colors.textPrimary }}>{genre.name}</Text>
              </View>
            ))}
          </View>
          {media.overview === null ? null : (
            <Text style={[styles.overview, { color: colors.textPrimary }]}>{media.overview}</Text>
          )}
          <TrackingPanel mediaId={media.id} />
          <Button
            label="Share title"
            loading={shareMedia.isPending}
            onPress={() => shareMedia.mutate()}
            variant="secondary"
          />
          {media.trailerUrl === null ? null : (
            <Button
              label="Watch trailer"
              variant="secondary"
              onPress={() => void Linking.openURL(media.trailerUrl ?? '')}
            />
          )}
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Where to watch · {media.streamingAvailability?.countryCode ?? user?.countryCode}
          </Text>
          {media.streamingAvailability?.items.length ? (
            <View style={styles.providers}>
              {media.streamingAvailability.items.map((item) => (
                <Pressable
                  accessibilityRole="link"
                  key={`${item.providerId}-${item.monetizationType}`}
                  onPress={() =>
                    item.providerUrl === null ? undefined : void Linking.openURL(item.providerUrl)
                  }
                  style={[styles.provider, { borderColor: colors.border }]}
                >
                  {item.logoUrl === null ? null : (
                    <Image
                      source={{ uri: item.logoUrl }}
                      resizeMode="contain"
                      style={styles.providerLogo}
                    />
                  )}
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.providerName}</Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {item.monetizationType === 'FLATRATE'
                      ? 'Stream'
                      : item.monetizationType.toLowerCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary }}>
              No provider availability was reported for this country.
            </Text>
          )}
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Cast</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.cast.map((credit) => (
              <Person credit={credit} key={credit.id} />
            ))}
          </ScrollView>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Key crew</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {media.crew.map((credit) => (
              <Person credit={credit} key={credit.id} />
            ))}
          </ScrollView>
          {media.seasons.length === 0 ? null : (
            <>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Seasons</Text>
              {media.seasons.map((season) => (
                <Pressable
                  accessibilityRole="button"
                  key={season.id}
                  onPress={() => router.push(`/media/${media.id}/season/${season.seasonNumber}`)}
                  style={[styles.season, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {season.name}
                  </Text>
                  <Text style={{ color: colors.textSecondary }}>
                    {season.episodeCount ?? 0} episodes
                    {season.airDate === null ? '' : ` · ${season.airDate.slice(0, 4)}`}
                  </Text>
                </Pressable>
              ))}
            </>
          )}
          <Text style={[styles.attribution, { color: colors.textDisabled }]}>
            Metadata and availability supplied by TMDB. Streaming availability may change.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  backdrop: { aspectRatio: 16 / 9, width: '100%' },
  content: { gap: 18, padding: 20 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4 },
  meta: { fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  overview: { fontSize: 16, lineHeight: 25 },
  heading: { fontSize: 21, fontWeight: '700', marginTop: 8 },
  providers: { gap: 10 },
  provider: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    padding: 10,
  },
  providerLogo: { height: 38, width: 38 },
  person: { marginRight: 14, width: 96 },
  avatar: { borderRadius: 48, height: 88, width: 88 },
  personName: { fontSize: 13, fontWeight: '700', marginTop: 7 },
  personRole: { fontSize: 12, lineHeight: 16, marginTop: 3 },
  season: { borderBottomWidth: 1, gap: 4, paddingBottom: 12 },
  attribution: { fontSize: 12, lineHeight: 18, marginVertical: 12 },
});
