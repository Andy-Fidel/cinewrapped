import type { CreditSummary, MediaDetails, ShareReceipt } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaReviewsFeed } from '../../src/components/media-reviews-feed';
import { SoundtracksPanel } from '../../src/components/soundtracks-panel';
import { TrackingPanel } from '../../src/components/tracking-panel';
import { Button, PosterImage, StarRating, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';

interface ProviderAppConfig {
  brandColor: string;
  nativeScheme?: string;
}

const PROVIDER_CONFIGS: Record<string, ProviderAppConfig> = {
  netflix: { brandColor: '#E50914', nativeScheme: 'nflx://' },
  'apple tv': { brandColor: '#D1D5DB', nativeScheme: 'appletv://' },
  'apple tv plus': { brandColor: '#D1D5DB', nativeScheme: 'appletv://' },
  'amazon prime video': { brandColor: '#00A8E1', nativeScheme: 'primevideo://' },
  'prime video': { brandColor: '#00A8E1', nativeScheme: 'primevideo://' },
  disney: { brandColor: '#113CCF', nativeScheme: 'disneyplus://' },
  'disney+': { brandColor: '#113CCF', nativeScheme: 'disneyplus://' },
  'disney plus': { brandColor: '#113CCF', nativeScheme: 'disneyplus://' },
  max: { brandColor: '#5822B4', nativeScheme: 'max://' },
  'hbo max': { brandColor: '#5822B4', nativeScheme: 'hbomax://' },
  hulu: { brandColor: '#1CE783', nativeScheme: 'hulu://' },
  peacock: { brandColor: '#000000', nativeScheme: 'peacocktv://' },
  'peacock premium': { brandColor: '#000000', nativeScheme: 'peacocktv://' },
  'criterion channel': { brandColor: '#D4AF37', nativeScheme: 'criterionchannel://' },
  'the criterion channel': { brandColor: '#D4AF37', nativeScheme: 'criterionchannel://' },
  'paramount+': { brandColor: '#0064FF', nativeScheme: 'paramountplus://' },
  'paramount plus': { brandColor: '#0064FF', nativeScheme: 'paramountplus://' },
};

function getAmbientPalette(genres: Array<{ name: string }>): {
  primaryGlow: string;
  secondaryGlow: string;
  ambientShadow: string;
  accentBadge: string;
} {
  const names = genres.map((g) => g.name.toLowerCase());

  if (names.some((n) => n.includes('horror') || n.includes('thriller') || n.includes('mystery'))) {
    return {
      primaryGlow: 'rgba(239, 68, 68, 0.35)', // Crimson Aura
      secondaryGlow: 'rgba(139, 92, 246, 0.25)', // Violet
      ambientShadow: '#DC2626',
      accentBadge: 'rgba(239, 68, 68, 0.15)',
    };
  }
  if (names.some((n) => n.includes('sci-fi') || n.includes('science fiction') || n.includes('action'))) {
    return {
      primaryGlow: 'rgba(59, 130, 246, 0.35)', // Electric Blue
      secondaryGlow: 'rgba(245, 158, 11, 0.25)', // Amber
      ambientShadow: '#2563EB',
      accentBadge: 'rgba(59, 130, 246, 0.15)',
    };
  }
  if (names.some((n) => n.includes('romance') || n.includes('drama'))) {
    return {
      primaryGlow: 'rgba(244, 63, 94, 0.35)', // Rose Glow
      secondaryGlow: 'rgba(251, 146, 60, 0.25)', // Sunset
      ambientShadow: '#E11D48',
      accentBadge: 'rgba(244, 63, 94, 0.15)',
    };
  }
  if (names.some((n) => n.includes('comedy') || n.includes('animation') || n.includes('family'))) {
    return {
      primaryGlow: 'rgba(234, 179, 8, 0.35)', // Warm Gold
      secondaryGlow: 'rgba(16, 185, 129, 0.25)', // Emerald
      ambientShadow: '#D97706',
      accentBadge: 'rgba(234, 179, 8, 0.15)',
    };
  }

  // Default Cinematic Indigo & Gold Aura
  return {
    primaryGlow: 'rgba(99, 102, 241, 0.35)',
    secondaryGlow: 'rgba(245, 158, 11, 0.25)',
    ambientShadow: '#4F46E5',
    accentBadge: 'rgba(99, 102, 241, 0.15)',
  };
}

async function openStreamingProvider(providerName: string, providerUrl: string | null) {
  haptics.selection();
  if (!providerUrl) return;

  const key = providerName.trim().toLowerCase();
  const config = Object.entries(PROVIDER_CONFIGS).find(([name]) => key.includes(name))?.[1];

  if (config?.nativeScheme && Platform.OS !== 'web') {
    try {
      const canOpen = await Linking.canOpenURL(config.nativeScheme);
      if (canOpen) {
        await Linking.openURL(config.nativeScheme);
        return;
      }
    } catch {
      // Fallback to web link
    }
  }

  try {
    if (Platform.OS !== 'web') {
      await WebBrowser.openBrowserAsync(providerUrl);
    } else {
      window.open(providerUrl, '_blank');
    }
  } catch {
    void Linking.openURL(providerUrl);
  }
}

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
        {credit.character ?? credit.job ?? credit.department}
      </Text>
    </View>
  );
}

export default function MediaDetailScreen() {
  const colors = useColors();
  const { isEnabled } = useFeatureFlags();
  const { session, user } = useAuth();
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const [showTrailer, setShowTrailer] = useState(false);
  const [whereToWatchExpanded, setWhereToWatchExpanded] = useState(true);

  const details = useQuery({
    queryKey: ['media-details', mediaId],
    queryFn: () => api.request<MediaDetails>(`media/${mediaId}`),
    enabled: session !== null && typeof mediaId === 'string',
    staleTime: 6 * 60 * 60 * 1000,
  });

  const shareMedia = useMutation({
    mutationFn: () => api.request<ShareReceipt>(`media/${mediaId}/shares`, { method: 'POST' }),
    onSuccess: async (receipt) => {
      haptics.selection();
      await Share.share({ message: `${receipt.title}\n${receipt.webUrl}`, url: receipt.deepLink });
    },
  });

  const ambient = useMemo(
    () => getAmbientPalette(details.data?.genres ?? []),
    [details.data?.genres],
  );

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
    haptics.selection();
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
          headerRight: () => (
            <Pressable
              accessibilityLabel="Share Title"
              accessibilityRole="button"
              onPress={() => shareMedia.mutate()}
              style={{ marginRight: 8 }}
            >
              <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Backdrop Hero Header with Adaptive Ambient Fog */}
        <View style={[styles.heroContainer, { backgroundColor: colors.surfaceRaised }]}>
          {media.backdropUrl === null ? null : (
            <Image
              source={{ uri: media.backdropUrl }}
              resizeMode="cover"
              style={StyleSheet.absoluteFill}
            />
          )}
          {/* Ambient Lighting Gradient Layer */}
          <View
            style={[
              styles.ambientBackdropLayer,
              { backgroundColor: ambient.primaryGlow },
            ]}
          />
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
          {/* Header section with floating poster & Ambient Glow Aura */}
          <View style={styles.headerRow}>
            {media.posterUrl === null ? null : (
              <View style={styles.posterGlowWrapper}>
                {/* Dynamic Ambient Glow Halo behind poster */}
                <View
                  style={[
                    styles.posterAmbientGlow,
                    {
                      backgroundColor: ambient.primaryGlow,
                      shadowColor: ambient.ambientShadow,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.floatingPoster,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  ]}
                >
                  <PosterImage uri={media.posterUrl} size="fill" rounded={14} />
                </View>
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
                <View style={styles.starWrap}>
                  <StarRating rating={media.averageProviderRating} size="md" />
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
              onPress={() => shareMedia.mutate()}
              style={({ pressed }) => [
                styles.actionButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  borderWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="share-social-outline" size={19} color={colors.textPrimary} />
              <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>Share</Text>
            </Pressable>
          </View>

          {/* Interactive Trailer Preview Frame if Active on Web */}
          {showTrailer && youtubeId ? (
            <View
              style={[
                styles.trailerCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.trailerHeader}>
                <View style={styles.trailerTitleRow}>
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                  <Text style={[styles.trailerTitle, { color: colors.textPrimary }]}>
                    Official Trailer
                  </Text>
                </View>
                <Pressable
                  accessibilityLabel="Close trailer"
                  accessibilityRole="button"
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

          {/* User Tracking Activity Panel */}
          <TrackingPanel
            genres={media.genres}
            mediaId={media.id}
            mediaTitle={media.title}
            posterUrl={media.posterUrl}
            releaseDate={media.releaseDate}
          />

          {/* Community Reviews Feed with Spoiler Shield & Letterboxd Share Cards */}
          <MediaReviewsFeed
            genres={media.genres}
            mediaId={media.id}
            mediaTitle={media.title}
            posterUrl={media.posterUrl}
            releaseDate={media.releaseDate}
          />

          {/* Schedule Movie Night */}
          {isEnabled('CALENDAR_INTEGRATION') ? (
            <Pressable
              accessibilityHint="Opens Calendar with this title already selected"
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                router.push({
                  pathname: '/calendar',
                  params: { eventType: 'WATCH_PLAN', mediaId: media.id, title: media.title },
                });
              }}
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
                  Plan to Watch
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Add {media.title} to your cinema schedule
                </Text>
              </View>
              <Ionicons color={colors.textDisabled} name="chevron-forward" size={19} />
            </Pressable>
          ) : null}

          {/* Private Movie Journal */}
          {isEnabled('MOVIE_JOURNAL') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                router.push(`/journal/new?mediaId=${media.id}`);
              }}
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

          {/* Soundtracks Panel */}
          {isEnabled('SOUNDTRACKS') ? (
            <SoundtracksPanel mediaId={media.id} countryCode={user?.countryCode ?? 'US'} />
          ) : null}

          {/* Where to Watch Collapsible Accordion Section */}
          <View style={[styles.accordionContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Pressable
              accessibilityLabel="Where to Watch streaming availability"
              accessibilityRole="button"
              accessibilityState={{ expanded: whereToWatchExpanded }}
              onPress={() => {
                haptics.selection();
                setWhereToWatchExpanded((prev) => !prev);
              }}
              style={({ pressed }) => [
                styles.accordionHeader,
                {
                  borderBottomColor: whereToWatchExpanded ? colors.border : 'transparent',
                  borderBottomWidth: whereToWatchExpanded ? 1 : 0,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={styles.accordionHeaderLeft}>
                <View style={[styles.streamingIconCircle, { backgroundColor: 'rgba(222, 54, 65, 0.12)' }]}>
                  <Ionicons name="play" size={16} color={colors.brand} />
                </View>
                <View>
                  <Text style={[styles.accordionTitle, { color: colors.textPrimary }]}>
                    Where to Watch
                  </Text>
                  <Text style={[styles.accordionSubtitle, { color: colors.textSecondary }]}>
                    {media.streamingAvailability?.items.length
                      ? `${media.streamingAvailability.items.length} provider${media.streamingAvailability.items.length === 1 ? '' : 's'} available`
                      : 'Streaming & rental availability'}
                  </Text>
                </View>
              </View>

              <View style={styles.accordionHeaderRight}>
                <View style={[styles.countryBadge, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.countryBadgeText, { color: colors.brand }]}>
                    🌍 {media.streamingAvailability?.countryCode ?? user?.countryCode ?? 'US'}
                  </Text>
                </View>
                <Ionicons
                  name={whereToWatchExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textSecondary}
                />
              </View>
            </Pressable>

            {whereToWatchExpanded && (
              <View style={styles.accordionContent}>
                {media.streamingAvailability?.items.length ? (
                  <View style={styles.providers}>
                    {media.streamingAvailability.items.map((item) => {
                      const key = item.providerName.trim().toLowerCase();
                      const providerConfig = Object.entries(PROVIDER_CONFIGS).find(([name]) =>
                        key.includes(name),
                      )?.[1];
                      const brandAccent = providerConfig?.brandColor ?? colors.brand;

                      return (
                        <Pressable
                          accessibilityRole="link"
                          disabled={item.providerUrl === null}
                          key={`${item.providerId}-${item.monetizationType}`}
                          onPress={() => void openStreamingProvider(item.providerName, item.providerUrl)}
                          style={({ pressed }) => [
                            styles.providerCard,
                            {
                              backgroundColor: colors.surfaceRaised,
                              borderColor: colors.border,
                              opacity: pressed ? 0.85 : 1,
                            },
                          ]}
                        >
                          {/* Brand indicator strip */}
                          <View style={[styles.providerBrandStrip, { backgroundColor: brandAccent }]} />

                          {item.logoUrl === null ? (
                            <View
                              style={[
                                styles.providerLogoFallback,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              <Ionicons name="tv-outline" size={22} color={colors.textSecondary} />
                            </View>
                          ) : (
                            <Image
                              source={{ uri: item.logoUrl }}
                              resizeMode="contain"
                              style={styles.providerLogo}
                            />
                          )}

                          <View style={styles.providerInfo}>
                            <Text style={[styles.providerName, { color: colors.textPrimary }]}>
                              {item.providerName}
                            </Text>
                            <View style={styles.providerTagRow}>
                              <View
                                style={[
                                  styles.monetizationBadge,
                                  {
                                    backgroundColor:
                                      item.monetizationType === 'FLATRATE'
                                        ? 'rgba(16, 185, 129, 0.15)'
                                        : colors.surface,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.monetizationText,
                                    {
                                      color:
                                        item.monetizationType === 'FLATRATE'
                                          ? '#10B981'
                                          : colors.textSecondary,
                                    },
                                  ]}
                                >
                                  {item.monetizationType === 'FLATRATE'
                                    ? 'Included'
                                    : item.monetizationType}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Launch Action Button */}
                          <View
                            style={[
                              styles.launchPill,
                              {
                                backgroundColor:
                                  item.monetizationType === 'FLATRATE'
                                    ? colors.brand
                                    : colors.surface,
                              },
                            ]}
                          >
                            <Ionicons
                              name="play"
                              size={12}
                              color={
                                item.monetizationType === 'FLATRATE' ? colors.onBrand : colors.textPrimary
                              }
                            />
                            <Text
                              style={[
                                styles.launchText,
                                {
                                  color:
                                    item.monetizationType === 'FLATRATE'
                                      ? colors.onBrand
                                      : colors.textPrimary,
                                },
                              ]}
                            >
                              Watch
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyStreamingWrap}>
                    <Ionicons name="tv-outline" size={26} color={colors.textDisabled} />
                    <Text style={[styles.emptyStreamingText, { color: colors.textSecondary }]}>
                      No streaming options currently reported for this region.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

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
                    onPress={() => {
                      haptics.selection();
                      router.push(`/media/${media.id}/season/${season.seasonNumber}`);
                    }}
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
            Metadata and availability supplied by TMDB & JustWatch. Streaming availability subject to change.
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
  ambientBackdropLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  content: { gap: 18, padding: 16 },

  // Header row & poster glow
  headerRow: { flexDirection: 'row', gap: 16, marginTop: -42, zIndex: 10 },
  posterGlowWrapper: {
    position: 'relative',
    width: 96,
  },
  posterAmbientGlow: {
    borderRadius: 20,
    bottom: -8,
    elevation: 20,
    left: -8,
    opacity: 0.85,
    position: 'absolute',
    right: -8,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    top: -8,
  },
  floatingPoster: {
    borderRadius: 14,
    borderWidth: 2,
    elevation: 8,
    height: 144,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    width: 96,
  },
  titleMetaSection: { flex: 1, gap: 6, justifyContent: 'flex-end', paddingTop: 38 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, lineHeight: 30 },
  starWrap: { marginTop: 2 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { fontSize: 12, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 6 },
  overview: { fontSize: 14, lineHeight: 22 },
  actionButtons: { flexDirection: 'row', gap: 10 },
  journalButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  actionButtonText: { fontSize: 14, fontWeight: '700' },
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
  heading: { fontSize: 18, fontWeight: '800', marginTop: 4 },

  // Where to Watch Collapsible Accordion Section
  accordionContainer: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  streamingIconCircle: {
    alignItems: 'center',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  accordionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  accordionHeaderRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  countryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  accordionContent: {
    padding: 14,
  },
  providers: { gap: 10 },
  providerCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    position: 'relative',
  },
  providerBrandStrip: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 4,
  },
  providerLogo: { borderRadius: 8, height: 38, width: 38 },
  providerLogoFallback: {
    alignItems: 'center',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  providerInfo: { flex: 1, gap: 2 },
  providerName: { fontSize: 14, fontWeight: '700' },
  providerTagRow: { flexDirection: 'row', gap: 6 },
  monetizationBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  monetizationText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },

  launchPill: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  launchText: { fontSize: 12, fontWeight: '700' },

  emptyStreamingWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  emptyStreamingText: { fontSize: 13, textAlign: 'center' },

  // Cast & Crew
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
  attribution: { fontSize: 11, lineHeight: 16, marginTop: 8 },
});
