import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { BrandLogo } from './brand-logo';
import { NetflixQuickPreviewModal } from './netflix-quick-preview-modal';
import { PosterImage, Skeleton, useColors } from './ui';

export function TrendingBentoGridSkeleton() {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 680;

  return (
    <View style={styles.container}>
      <View style={styles.gridContainer}>
        {/* ROW 1 Skeleton */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          <View
            style={[
              styles.card,
              styles.cardHeroSpotlight,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.cardHeaderRow}>
              <Skeleton width={110} height={24} rounded={12} />
              <Skeleton width={24} height={24} rounded={12} />
            </View>
            <View style={{ gap: 8, marginTop: 24 }}>
              <Skeleton width="85%" height={24} rounded={6} />
              <Skeleton width="50%" height={16} rounded={4} />
            </View>
          </View>

          <View
            style={[
              styles.card,
              styles.cardBillboard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width={90} height={20} rounded={6} />
              <Skeleton width="75%" height={20} rounded={6} />
            </View>
            <Skeleton width={110} height={90} rounded={14} />
          </View>
        </View>

        {/* ROW 2 Skeleton */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          <View
            style={[
              styles.card,
              styles.cardPortrait,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Skeleton width="100%" height={160} rounded={16} />
            <Skeleton width="80%" height={20} rounded={6} />
            <Skeleton width="95%" height={14} rounded={4} />
          </View>

          <View style={styles.metricColumn}>
            <View
              style={[
                styles.card,
                styles.cardMetricSquare,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Skeleton width={80} height={16} rounded={4} />
              <Skeleton width={90} height={32} rounded={8} />
              <Skeleton width={110} height={20} rounded={6} />
            </View>
            <View
              style={[
                styles.card,
                styles.cardMetricSquare,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Skeleton width={60} height={30} rounded={6} />
              <Skeleton width="100%" height={24} rounded={12} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

interface TrendingBentoGridProps {
  mediaList: MediaSummary[];
}

export function TrendingBentoGrid({ mediaList }: TrendingBentoGridProps) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const [previewMedia, setPreviewMedia] = useState<MediaSummary | null>(null);

  if (mediaList.length === 0) return null;

  const item0 = mediaList[0];
  const item1 = mediaList[1] ?? mediaList[0];
  const item2 = mediaList[2] ?? mediaList[0];
  const item3 = mediaList[3] ?? mediaList[1] ?? mediaList[0];
  const item4 = mediaList[4] ?? mediaList[2] ?? mediaList[0];
  const item5 = mediaList[5] ?? mediaList[3] ?? mediaList[0];
  const restItems = mediaList.slice(6);

  const isWide = screenWidth > 680;

  const handleOpenMedia = (media: MediaSummary) => {
    haptics.selection();
    router.push(`/media/${media.id}`);
  };

  const handleLongPress = (media: MediaSummary) => {
    haptics.clapperSnap();
    setPreviewMedia(media);
  };

  return (
    <View style={styles.container}>
      {/* Bento Grid Container */}
      <View style={styles.gridContainer}>
        {/* ROW 1: Hero Accent Card (Left) + Backdrop Showcase (Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card A: #1 Trending Vibrant Spotlight with Movie Thumbnail Background */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item0 && handleOpenMedia(item0)}
            onLongPress={() => item0 && handleLongPress(item0)}
            style={({ pressed }) => [
              styles.card,
              styles.cardHeroSpotlight,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {/* Movie Thumbnail Background Art */}
            {item0 && (item0.backdropUrl || item0.posterUrl) ? (
              <Image
                source={{ uri: item0.backdropUrl ?? item0.posterUrl ?? undefined }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}

            {/* Dark Crimson Vignette Scrim for High-Contrast Readability */}
            <View style={styles.heroSpotlightScrim} />

            <View style={styles.cardHeaderRow}>
              <View style={styles.rankBadge}>
                <Ionicons name="flame" size={13} color="#FFFFFF" />
                <Text style={styles.rankBadgeText}>#1 TRENDING</Text>
              </View>
              <BrandLogo size="sm" variant="mark" />
            </View>

            <View style={styles.heroSpotlightContent}>
              <Text numberOfLines={2} style={styles.heroSpotlightTitle}>
                {item0?.title ?? 'Trending Feature'}
              </Text>
              <View style={styles.heroSpotlightMetaRow}>
                <Text style={styles.heroSpotlightMeta}>
                  {item0?.releaseYear ?? '2026'} ·{' '}
                  {item0?.mediaType === 'MOVIE' ? 'Movie' : 'Series'}
                </Text>
                {item0?.averageProviderRating ? (
                  <View style={styles.matchScorePill}>
                    <Text style={styles.matchScoreText}>
                      ★ {item0.averageProviderRating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Pressable>

          {/* Card B: Wide Device / Scene Billboard Preview */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item1 && handleOpenMedia(item1)}
            onLongPress={() => item1 && handleLongPress(item1)}
            style={({ pressed }) => [
              styles.card,
              styles.cardBillboard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.billboardLeft}>
              <View style={styles.platformPillsRow}>
                <View style={[styles.platformPill, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="film-outline" size={12} color={colors.brand} />
                </View>
                <View style={[styles.platformPill, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="tv-outline" size={12} color={colors.textSecondary} />
                </View>
                <View style={[styles.platformPill, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.platformPillText, { color: colors.textSecondary }]}>4K</Text>
                </View>
              </View>

              <Text style={[styles.billboardEyebrow, { color: colors.textSecondary }]}>
                CINEPHILE BUZZ
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.billboardTitle, { color: colors.textPrimary }]}
              >
                {item1?.title ?? 'Cinematic Highlight'}
              </Text>
            </View>

            {/* Floating Scene Art Thumbnail */}
            <View style={styles.billboardArtWrap}>
              {item1?.backdropUrl || item1?.posterUrl ? (
                <Image
                  source={{ uri: item1.backdropUrl ?? item1.posterUrl ?? '' }}
                  style={styles.billboardImage}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={[styles.billboardPlaceholder, { backgroundColor: colors.surfaceRaised }]}
                >
                  <Ionicons name="videocam" size={24} color={colors.textDisabled} />
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* ROW 2: Tall Portrait Card (Left) + Metric Stack (Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card C: Tall Curator Portrait Spotlight */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item2 && handleOpenMedia(item2)}
            onLongPress={() => item2 && handleLongPress(item2)}
            style={({ pressed }) => [
              styles.card,
              styles.cardPortrait,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.portraitPosterContainer}>
              <PosterImage uri={item2?.posterUrl ?? null} size="fill" rounded={16} />
              <View style={styles.curatorFloatingBadge}>
                <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                <Text style={styles.curatorBadgeText}>Curator Pick</Text>
              </View>
            </View>

            <View style={styles.portraitInfo}>
              <Text numberOfLines={1} style={[styles.portraitTitle, { color: colors.textPrimary }]}>
                {item2?.title ?? 'Must-Watch Reel'}
              </Text>
              <Text
                numberOfLines={2}
                style={[styles.portraitOverview, { color: colors.textSecondary }]}
              >
                {item2?.overview ??
                  'Celebrated by critics for extraordinary cinematography and narrative depth.'}
              </Text>
            </View>
          </Pressable>

          {/* Right Column: 2x Square Metric Cards */}
          <View style={styles.metricColumn}>
            {/* Card D: Weekly Watchers Metric Card */}
            <View
              style={[
                styles.card,
                styles.cardMetricSquare,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Weekly Watchers
              </Text>
              <Text style={[styles.metricBigNumber, { color: colors.textPrimary }]}>94.8K</Text>
              <View style={styles.growthPill}>
                <Ionicons name="trending-up" size={13} color="#10B981" />
                <Text style={styles.growthPillText}>+18.4% velocity</Text>
              </View>
            </View>

            {/* Card E: Critical Resonance + Avatar Stack */}
            <Pressable
              accessibilityRole="button"
              onPress={() => item3 && handleOpenMedia(item3)}
              onLongPress={() => item3 && handleLongPress(item3)}
              style={({ pressed }) => [
                styles.card,
                styles.cardMetricSquare,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View style={styles.ratingRow}>
                <Text style={[styles.ratingScore, { color: colors.textPrimary }]}>
                  {item3?.averageProviderRating
                    ? (item3.averageProviderRating * 0.95).toFixed(1)
                    : '4.9'}
                </Text>
                <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={14}
                    color={colors.brand}
                    style={{ transform: [{ rotate: '45deg' }] }}
                  />
                </View>
              </View>

              {/* Overlapping Community Avatar Story Stack */}
              <View style={styles.avatarStackRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: '#E11D48', borderColor: colors.surface },
                  ]}
                >
                  <Text style={styles.avatarInitials}>JS</Text>
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: '#8B5CF6', marginLeft: -8, borderColor: colors.surface },
                  ]}
                >
                  <Text style={styles.avatarInitials}>MK</Text>
                </View>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: '#059669', marginLeft: -8, borderColor: colors.surface },
                  ]}
                >
                  <Text style={styles.avatarInitials}>AL</Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.avatarStackLabel, { color: colors.textSecondary }]}
                >
                  {item3?.title ?? 'Critically Acclaimed'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ROW 3: Velocity Surge Wave (Left) + Editorial Reel (Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card G: Velocity Wave Chart Card */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item4 && handleOpenMedia(item4)}
            onLongPress={() => item4 && handleLongPress(item4)}
            style={({ pressed }) => [
              styles.card,
              styles.cardWave,
              {
                backgroundColor: '#1E1435',
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.waveHeaderRow}>
              <View style={styles.waveLegendRow}>
                <View style={styles.waveDotGroup}>
                  <View style={[styles.waveDot, { backgroundColor: '#A78BFA' }]} />
                  <Text style={styles.waveLegendText}>Box Office</Text>
                </View>
                <View style={styles.waveDotGroup}>
                  <View style={[styles.waveDot, { backgroundColor: '#EC4899' }]} />
                  <Text style={styles.waveLegendText}>Streaming</Text>
                </View>
              </View>
              <Text style={styles.waveSurgeBadge}>+34% SURGE</Text>
            </View>

            {/* Stylized Cinema Resonance Waves */}
            <View style={styles.wavesArtContainer}>
              <View
                style={[
                  styles.waveRibbon,
                  { backgroundColor: 'rgba(167, 139, 250, 0.25)', top: 12 },
                ]}
              />
              <View
                style={[
                  styles.waveRibbon,
                  { backgroundColor: 'rgba(236, 72, 153, 0.35)', top: 22 },
                ]}
              />
              <View style={[styles.waveRibbon, { backgroundColor: '#7C3AED', top: 32 }]} />
            </View>

            <View style={styles.waveFooterRow}>
              <Text numberOfLines={1} style={styles.waveMovieTitle}>
                {item4?.title ?? 'Streaming Surge'}
              </Text>
              <Text style={styles.waveIndexStat}>98.6 Index</Text>
            </View>
          </Pressable>

          {/* Card H: Editorial Vision Column with 3D Clapper Star */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item5 && handleOpenMedia(item5)}
            onLongPress={() => item5 && handleLongPress(item5)}
            style={({ pressed }) => [
              styles.card,
              styles.cardEditorial,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.editorialEyebrow, { color: colors.brand }]}>CURATED RADAR</Text>
            <Text
              numberOfLines={2}
              style={[styles.editorialHeadline, { color: colors.textPrimary }]}
            >
              {item5?.title ?? 'Standout Vision'}
            </Text>

            <View style={styles.clapperSymbolWrap}>
              <View style={[styles.clapper3DCrest, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="sparkles" size={28} color={colors.brand} />
              </View>
            </View>

            <View style={styles.editorialFooter}>
              <Text style={[styles.editorialActionText, { color: colors.textSecondary }]}>
                Explore Full Spotlight ➔
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* Extended Grid for remaining trending titles */}
      {restItems.length > 0 ? (
        <View style={styles.shelfContainer}>
          <Text style={[styles.shelfHeaderTitle, { color: colors.textPrimary }]}>
            More Trending This Week
          </Text>
          <View style={styles.shelfGrid}>
            {restItems.map((media) => (
              <Pressable
                key={media.id}
                accessibilityRole="button"
                onPress={() => handleOpenMedia(media)}
                onLongPress={() => handleLongPress(media)}
                style={({ pressed }) => [
                  styles.shelfCard,
                  {
                    transform: [{ scale: pressed ? 0.96 : 1 }],
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={styles.shelfPosterWrap}>
                  <PosterImage uri={media.posterUrl} size="fill" rounded={12} />
                  {media.averageProviderRating ? (
                    <View style={styles.shelfRatingBadge}>
                      <Text style={styles.shelfRatingText}>
                        ★ {media.averageProviderRating.toFixed(1)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text numberOfLines={1} style={[styles.shelfTitle, { color: colors.textPrimary }]}>
                  {media.title}
                </Text>
                <Text style={[styles.shelfMeta, { color: colors.textSecondary }]}>
                  {media.releaseYear ?? 'TBA'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {/* Quick Preview Modal on Long-Press */}
      <NetflixQuickPreviewModal
        media={previewMedia}
        visible={previewMedia !== null}
        onClose={() => setPreviewMedia(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    marginTop: 8,
  },
  gridContainer: {
    gap: 12,
  },
  row: {
    flexDirection: 'column',
    gap: 12,
  },
  rowWide: {
    flexDirection: 'row',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },

  /* Card A: Hero Spotlight */
  cardHeroSpotlight: {
    backgroundColor: '#1E0E12',
    borderColor: 'rgba(222, 54, 65, 0.4)',
    justifyContent: 'space-between',
    minHeight: 165,
    position: 'relative',
  },
  heroSpotlightScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 6, 8, 0.68)',
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rankBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  rankBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroSpotlightContent: {
    gap: 6,
    marginTop: 18,
  },
  heroSpotlightTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroSpotlightMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  heroSpotlightMeta: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  matchScorePill: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  matchScoreText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  /* Card B: Billboard */
  cardBillboard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 130,
  },
  billboardLeft: {
    flex: 1,
    gap: 6,
    paddingRight: 12,
  },
  platformPillsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  platformPill: {
    alignItems: 'center',
    borderRadius: 8,
    height: 24,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  platformPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  billboardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  billboardTitle: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
  },
  billboardArtWrap: {
    borderRadius: 14,
    height: 90,
    overflow: 'hidden',
    width: 110,
  },
  billboardImage: {
    height: '100%',
    width: '100%',
  },
  billboardPlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },

  /* Card C: Tall Portrait */
  cardPortrait: {
    gap: 12,
  },
  portraitPosterContainer: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  curatorFloatingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    bottom: 10,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    position: 'absolute',
    right: 10,
  },
  curatorBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  portraitInfo: {
    gap: 4,
  },
  portraitTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  portraitOverview: {
    fontSize: 13,
    lineHeight: 18,
  },

  /* Metric Column & Square Cards */
  metricColumn: {
    flexDirection: 'row',
    gap: 12,
  },
  cardMetricSquare: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 140,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricBigNumber: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  growthPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  growthPillText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingScore: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  arrowCircle: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  avatarStackRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  avatarCircle: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatarStackLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
  },

  /* Card G: Wave Chart */
  cardWave: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'space-between',
    minHeight: 150,
  },
  waveHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waveLegendRow: {
    flexDirection: 'row',
    gap: 12,
  },
  waveDotGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  waveDot: {
    borderRadius: 4,
    height: 7,
    width: 7,
  },
  waveLegendText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },
  waveSurgeBadge: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '800',
  },
  wavesArtContainer: {
    height: 48,
    position: 'relative',
    width: '100%',
  },
  waveRibbon: {
    borderRadius: 10,
    height: 12,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  waveFooterRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  waveMovieTitle: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    paddingRight: 10,
  },
  waveIndexStat: {
    color: '#A78BFA',
    fontSize: 13,
    fontWeight: '900',
  },

  /* Card H: Editorial Vision Column */
  cardEditorial: {
    justifyContent: 'space-between',
    minHeight: 150,
  },
  editorialEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  editorialHeadline: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
  },
  clapperSymbolWrap: {
    alignItems: 'center',
    marginVertical: 4,
  },
  clapper3DCrest: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  editorialFooter: {
    marginTop: 4,
  },
  editorialActionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  /* Shelf Below Bento */
  shelfContainer: {
    gap: 12,
    marginTop: 10,
  },
  shelfHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  shelfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shelfCard: {
    gap: 5,
    width: '31%',
  },
  shelfPosterWrap: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    position: 'relative',
    width: '100%',
  },
  shelfRatingBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    right: 5,
    top: 5,
  },
  shelfRatingText: {
    color: '#FACC15',
    fontSize: 10,
    fontWeight: '800',
  },
  shelfTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  shelfMeta: {
    fontSize: 11,
  },
});
