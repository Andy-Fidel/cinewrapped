import type { CreditSummary, MediaDetails, ShareReceipt } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
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
import { SoundtracksPanel } from '../../src/components/soundtracks-panel';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

function getYouTubeVideoId(url: string | null): string | null {
  if (url === null) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  const id = match?.[2];
  return id && id.length === 11 ? id : null;
}

function Person({ credit }: { credit: CreditSummary }) {
  const colors = useColors();
  return (
    <View style={styles.person}>
      {credit.profileUrl === null ? (
        <View
          style={[
            styles.avatar,
            styles.avatarFallback,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
          ]}
        >
          <Ionicons name="person-outline" size={32} color={colors.textDisabled} />
        </View>
      ) : (
        <Image
          source={{ uri: credit.profileUrl }}
          resizeMode="cover"
          style={[styles.avatar, { borderColor: colors.border }]}
        />
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
  const [showTrailer, setShowTrailer] = useState(false);
  const { isEnabled } = useFeatureFlags();

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
  const youtubeId = getYouTubeVideoId(media.trailerUrl);

  const handlePlayTrailer = async () => {
    if (Platform.OS === 'web') {
      setShowTrailer(true);
    } else if (media.trailerUrl) {
      try {
        await WebBrowser.openBrowserAsync(media.trailerUrl);
      } catch {
        void Linking.openURL(media.trailerUrl);
      }
    }
  };

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
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop Hero Header */}
        <View style={[styles.heroContainer, { backgroundColor: colors.surfaceRaised }]}>
          {media.backdropUrl === null ? null : (
            <Image
              source={{ uri: media.backdropUrl }}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          <View style={styles.backdropOverlay} />

          {/* Hero Play Button Overlay if trailer exists */}
          {media.trailerUrl !== null ? (
            <Pressable
              accessibilityLabel="Play official trailer"
              accessibilityRole="button"
              onPress={() => void handlePlayTrailer()}
              style={({ pressed }) => [styles.heroPlayOverlay, { opacity: pressed ? 0.75 : 1 }]}
            >
              <View style={[styles.heroPlayCircle, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
                <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 3 }} />
              </View>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.content}>
          {/* Header section with floating poster & title */}
          <View style={styles.headerRow}>
            {media.posterUrl === null ? null : (
              <View
                style={[
                  styles.floatingPoster,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <Image
                  source={{ uri: media.posterUrl }}
                  resizeMode="cover"
                  style={StyleSheet.absoluteFill}
                />
              </View>
            )}
            <View style={styles.titleMetaSection}>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.textPrimary }]}
              >
                {media.title}
              </Text>
              {media.averageProviderRating !== null ? (
                <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={[styles.ratingValue, { color: colors.textPrimary }]}>
                    {media.averageProviderRating.toFixed(1)}
                  </Text>
                  <Text style={[styles.ratingScale, { color: colors.textSecondary }]}>/ 10</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Metadata Chips */}
          <View style={styles.metaRow}>
            {[
              media.releaseYear,
              media.runtimeMinutes === null ? null : `${media.runtimeMinutes} min`,
              media.ageRating,
              media.mediaType === 'MOVIE' ? 'Movie' : 'TV Series',
            ]
              .filter(Boolean)
              .map((item, idx) => (
                <View
                  key={idx}
                  style={[styles.metaChip, { backgroundColor: colors.surfaceRaised }]}
                >
                  <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>{item}</Text>
                </View>
              ))}
          </View>

          {/* Genre Chips */}
          <View style={styles.chips}>
            {media.genres.map((genre) => (
              <View key={genre.id} style={[styles.chip, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                  {genre.name}
                </Text>
              </View>
            ))}
          </View>

          {/* Overview */}
          {media.overview === null ? null : (
            <Text style={[styles.overview, { color: colors.textPrimary }]}>{media.overview}</Text>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {media.trailerUrl === null ? null : (
              <Pressable
                accessibilityRole="button"
                onPress={() => void handlePlayTrailer()}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor: colors.brand,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="play-circle" size={20} color={colors.onBrand} />
                <Text style={[styles.actionButtonText, { color: colors.onBrand }]}>
                  {showTrailer ? 'Playing Trailer' : 'Watch Trailer'}
                </Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={shareMedia.isPending}
              onPress={() => shareMedia.mutate()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderWidth: 1,
                  opacity: pressed || shareMedia.isPending ? 0.7 : 1,
                },
              ]}
            >
              {shareMedia.isPending ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>
                    Share
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Embedded YouTube Trailer Player */}
          {showTrailer && youtubeId ? (
            <View
              style={[
                styles.trailerCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.trailerHeader}>
                <View style={styles.trailerTitleRow}>
                  <Ionicons name="film-outline" size={18} color={colors.brand} />
                  <Text style={[styles.trailerTitle, { color: colors.textPrimary }]}>
                    Official Trailer
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close trailer player"
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => setShowTrailer(false)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
                </Pressable>
              </View>

              <View style={styles.trailerFrameContainer}>
                {React.createElement('iframe', {
                  src: `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`,
                  style: {
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: 10,
                  },
                  allow:
                    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
                  allowFullScreen: true,
                })}
              </View>
            </View>
          ) : null}

          <TrackingPanel mediaId={media.id} />

          {isEnabled('CALENDAR_INTEGRATION') ? (
            <Pressable
              accessibilityHint="Opens Calendar with this title already selected"
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: '/calendar',
                  params: { eventType: 'WATCH_PLAN', mediaId: media.id, title: media.title },
                })
              }
              style={({ pressed }) => [
                styles.journalButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons color={colors.brand} name="calendar-outline" size={22} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  Plan to watch
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Add {media.title} to your viewing calendar
                </Text>
              </View>
              <Ionicons color={colors.textDisabled} name="chevron-forward" size={19} />
            </Pressable>
          ) : null}

          {isEnabled('MOVIE_JOURNAL') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/journal/new?mediaId=${media.id}`)}
              style={({ pressed }) => [
                styles.journalButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <Ionicons color={colors.brand} name="book-outline" size={22} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '800' }}>
                  Add to Movie Journal
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Private notes, moods, photos, quotes, and memories
                </Text>
              </View>
              <Ionicons color={colors.textDisabled} name="chevron-forward" size={19} />
            </Pressable>
          ) : null}

          {isEnabled('SOUNDTRACKS') ? (
            <SoundtracksPanel mediaId={media.id} countryCode={user?.countryCode ?? 'US'} />
          ) : null}

          {/* Streaming Availability Section */}
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Where to Watch ({media.streamingAvailability?.countryCode ?? user?.countryCode})
          </Text>
          {media.streamingAvailability?.items.length ? (
            <View style={styles.providers}>
              {media.streamingAvailability.items.map((item) => (
                <Pressable
                  accessibilityRole={item.providerUrl === null ? undefined : 'link'}
                  disabled={item.providerUrl === null}
                  key={`${item.providerId}-${item.monetizationType}`}
                  onPress={() =>
                    item.providerUrl === null ? undefined : void Linking.openURL(item.providerUrl)
                  }
                  style={({ pressed }) => [
                    styles.provider,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {item.logoUrl === null ? (
                    <Ionicons name="tv-outline" size={24} color={colors.textDisabled} />
                  ) : (
                    <Image
                      source={{ uri: item.logoUrl }}
                      resizeMode="contain"
                      style={styles.providerLogo}
                    />
                  )}
                  <Text style={{ color: colors.textPrimary, flex: 1, fontWeight: '600' }}>
                    {item.providerName}
                  </Text>
                  <View
                    style={[styles.monetizationBadge, { backgroundColor: colors.surfaceRaised }]}
                  >
                    <Text style={[styles.monetizationText, { color: colors.brand }]}>
                      {item.monetizationType === 'FLATRATE' ? 'Stream' : item.monetizationType}
                    </Text>
                  </View>
                  {item.providerUrl === null ? null : (
                    <Ionicons name="open-outline" size={16} color={colors.textDisabled} />
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              No streaming providers currently reported for this region.
            </Text>
          )}

          {/* Cast Section */}
          {media.cast.length === 0 ? null : (
            <>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {media.cast.map((credit) => (
                  <Person credit={credit} key={credit.id} />
                ))}
              </ScrollView>
            </>
          )}

          {/* Crew Section */}
          {media.crew.length === 0 ? null : (
            <>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Key Crew</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {media.crew.map((credit) => (
                  <Person credit={credit} key={credit.id} />
                ))}
              </ScrollView>
            </>
          )}

          {/* Seasons Section */}
          {media.seasons.length === 0 ? null : (
            <>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Seasons</Text>
              <View style={styles.seasonsList}>
                {media.seasons.map((season) => (
                  <Pressable
                    accessibilityRole="button"
                    key={season.id}
                    onPress={() => router.push(`/media/${media.id}/season/${season.seasonNumber}`)}
                    style={({ pressed }) => [
                      styles.seasonCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View style={styles.seasonInfo}>
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
                        {season.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                        {season.episodeCount ?? 0} episodes
                        {season.airDate === null ? '' : ` · ${season.airDate.slice(0, 4)}`}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward-outline"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.attribution, { color: colors.textDisabled }]}>
            Metadata and availability supplied by TMDB. Streaming availability subject to change.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  heroContainer: { aspectRatio: 16 / 9, position: 'relative', width: '100%' },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  heroPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  heroPlayCircle: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  content: { gap: 20, padding: 18 },
  headerRow: { flexDirection: 'row', gap: 16, marginTop: -40, zIndex: 10 },
  floatingPoster: {
    borderRadius: 14,
    borderWidth: 2,
    elevation: 8,
    height: 140,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    width: 95,
  },
  titleMetaSection: { flex: 1, gap: 8, justifyContent: 'flex-end', paddingTop: 38 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4, lineHeight: 32 },
  ratingBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ratingValue: { fontSize: 14, fontWeight: '800' },
  ratingScale: { fontSize: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  overview: { fontSize: 15, lineHeight: 24 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  journalButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 15,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  actionButtonText: { fontSize: 15, fontWeight: '700' },
  trailerCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
    padding: 14,
  },
  trailerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  trailerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  trailerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  trailerFrameContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  heading: { fontSize: 20, fontWeight: '700', marginTop: 6 },
  providers: { gap: 10 },
  provider: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  providerLogo: { borderRadius: 8, height: 36, width: 36 },
  monetizationBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  monetizationText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  person: { marginRight: 14, width: 92 },
  avatar: { borderRadius: 46, borderWidth: 2, height: 84, width: 84 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  personName: { fontSize: 13, fontWeight: '700', marginTop: 8 },
  personRole: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  seasonsList: { gap: 10 },
  seasonCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  seasonInfo: { gap: 4 },
  attribution: { fontSize: 12, lineHeight: 18, marginTop: 10 },
});
