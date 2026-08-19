import type {
  RecommendationFeedbackType,
  RecommendationSummary,
  TasteProfile,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { haptics } from '../lib/haptics';
import { BrandLogo } from './brand-logo';
import { NetflixQuickPreviewModal } from './netflix-quick-preview-modal';
import { PosterImage, Skeleton, useColors } from './ui';

export function HomeBentoRecommendationsSkeleton() {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth > 680;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <Skeleton width={100} height={20} rounded={8} />
          <Skeleton width={180} height={26} rounded={8} style={{ marginTop: 4 }} />
        </View>
      </View>

      <View style={styles.gridContainer}>
        {/* ROW 1 Skeleton */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          <View style={[styles.card, styles.cardHeroMatch, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Skeleton width={110} height={24} rounded={12} />
              <Skeleton width={24} height={24} rounded={12} />
            </View>
            <View style={{ gap: 8, marginTop: 20 }}>
              <Skeleton width="85%" height={24} rounded={6} />
              <Skeleton width="95%" height={16} rounded={4} />
              <Skeleton width={140} height={36} rounded={12} style={{ marginTop: 6 }} />
            </View>
          </View>

          <View style={[styles.card, styles.cardBillboard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width={100} height={20} rounded={6} />
              <Skeleton width="80%" height={20} rounded={6} />
            </View>
            <Skeleton width={110} height={90} rounded={14} />
          </View>
        </View>

        {/* ROW 2 Skeleton */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          <View style={[styles.card, styles.cardPortrait, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width="100%" height={160} rounded={16} />
            <Skeleton width="75%" height={20} rounded={6} />
            <Skeleton width="90%" height={14} rounded={4} />
          </View>

          <View style={styles.metricColumn}>
            <View style={[styles.card, styles.cardMetricSquare, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton width={80} height={16} rounded={4} />
              <Skeleton width={70} height={32} rounded={8} />
              <Skeleton width={110} height={20} rounded={6} />
            </View>
            <View style={[styles.card, styles.cardMetricSquare, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton width={60} height={30} rounded={6} />
              <Skeleton width="100%" height={24} rounded={12} />
            </View>
          </View>
        </View>
      </View>

      {/* More Curated For You Bento Shelf Skeleton */}
      <View style={styles.shelfContainer}>
        <View style={styles.shelfHeaderRow}>
          <Skeleton width={180} height={24} rounded={8} />
          <Skeleton width={80} height={22} rounded={8} />
        </View>
        <View style={styles.shelfBentoGrid}>
          <View style={[styles.curatedRow, isWide && styles.curatedRowWide]}>
            <View style={{ flex: 1.15 }}>
              <Skeleton width="100%" height={245} rounded={20} />
            </View>
            <View style={styles.curatedMiniStack}>
              <Skeleton width="100%" height={116} rounded={18} />
              <Skeleton width="100%" height={116} rounded={18} />
            </View>
          </View>
          <Skeleton width="100%" height={128} rounded={20} />
        </View>
      </View>
    </View>
  );
}

interface HomeBentoRecommendationsProps {
  items: RecommendationSummary[];
  tasteProfile?: TasteProfile | undefined;
  onFeedback?: (recommendationId: string, feedbackType: RecommendationFeedbackType) => void;
  onAddToWatchlist?: (mediaId: string) => void;
}

export function HomeBentoRecommendations({
  items,
  tasteProfile,
  onFeedback,
  onAddToWatchlist,
}: HomeBentoRecommendationsProps) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const [previewMedia, setPreviewMedia] = useState<RecommendationSummary['media'] | null>(null);

  if (items.length === 0) return null;

  const item0 = items[0];
  const item1 = items[1] ?? items[0];
  const item2 = items[2] ?? items[0];
  const item3 = items[3] ?? items[1] ?? items[0];
  const item4 = items[4] ?? items[2] ?? items[0];
  const restItems = items.slice(5);

  const isWide = screenWidth > 680;

  const handleOpenMedia = (item: RecommendationSummary) => {
    haptics.selection();
    router.push(`/media/${item.media.id}`);
  };

  const handleLongPress = (item: RecommendationSummary) => {
    haptics.clapperSnap();
    setPreviewMedia(item.media);
  };

  const topGenre = tasteProfile?.topGenres[0]?.name ?? 'Psychological Cinema';
  const signalCount =
    (tasteProfile?.signalCounts.favorites ?? 0) +
    (tasteProfile?.signalCounts.ratings ?? 0) +
    (tasteProfile?.signalCounts.completedTitles ?? 0);

  // Helper for Long Vertical Card
  const renderTallCard = (rec: RecommendationSummary, key: string) => {
    const bgUri = rec.media.posterUrl ?? rec.media.backdropUrl ?? undefined;
    const matchScore = Math.round(rec.score * 100);
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        onPress={() => handleOpenMedia(rec)}
        onLongPress={() => handleLongPress(rec)}
        style={({ pressed }) => [
          styles.curatedTallCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {bgUri ? (
          <Image
            source={{ uri: bgUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.curatedTallScrim} />

        <View style={styles.curatedTallTop}>
          <View style={styles.curatedMatchPill}>
            <Text style={styles.curatedMatchPillText}>🎯 {matchScore}%</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              haptics.selection();
              onAddToWatchlist?.(rec.media.id);
              onFeedback?.(rec.id, 'SAVED');
            }}
            style={styles.curatedBookmarkBtn}
          >
            <Ionicons name="bookmark-outline" size={13} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.curatedTallBottom}>
          <Text style={styles.curatedTallMeta}>
            {rec.media.releaseYear ?? '2026'} · {rec.media.mediaType === 'MOVIE' ? 'Movie' : 'Series'}
          </Text>
          <Text numberOfLines={2} style={styles.curatedTallTitle}>
            {rec.media.title}
          </Text>
          {rec.media.averageProviderRating ? (
            <View style={styles.curatedTallRatingRow}>
              <View style={styles.curatedTallRatingBadge}>
                <Text style={styles.curatedTallRatingText}>
                  ★ {rec.media.averageProviderRating.toFixed(1)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  // Helper for Stacked Horizontal Mini Card
  const renderHorizontalMiniCard = (rec: RecommendationSummary, key: string) => {
    const matchScore = Math.round(rec.score * 100);
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        onPress={() => handleOpenMedia(rec)}
        onLongPress={() => handleLongPress(rec)}
        style={({ pressed }) => [
          styles.curatedMiniCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <View style={styles.curatedMiniPosterWrap}>
          <PosterImage uri={rec.media.posterUrl} size="fill" rounded={10} />
        </View>

        <View style={styles.curatedMiniContent}>
          <View style={styles.curatedMiniHeaderRow}>
            <Text style={[styles.curatedMiniMatchText, { color: colors.brand }]}>
              🎯 {matchScore}% MATCH
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={(e) => {
                e.stopPropagation();
                haptics.selection();
                onAddToWatchlist?.(rec.media.id);
                onFeedback?.(rec.id, 'SAVED');
              }}
              hitSlop={8}
            >
              <Ionicons name="bookmark-outline" size={15} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: 2 }}>
            <Text numberOfLines={1} style={[styles.curatedMiniTitle, { color: colors.textPrimary }]}>
              {rec.media.title}
            </Text>
            <Text numberOfLines={1} style={[styles.curatedMiniSub, { color: colors.textSecondary }]}>
              {rec.explanation || `${rec.media.releaseYear ?? ''} · Curated Selection`}
            </Text>
          </View>

          <View style={styles.curatedMiniBottomRow}>
            <View style={[styles.curatedMiniTag, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.curatedMiniTagText, { color: colors.textSecondary }]}>
                {rec.media.mediaType === 'MOVIE' ? 'Film' : 'TV'}
              </Text>
            </View>
            {rec.media.averageProviderRating ? (
              <Text style={[styles.curatedMiniRating, { color: colors.textSecondary }]}>
                ★ {rec.media.averageProviderRating.toFixed(1)}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  // Helper for Full-Width Long Horizontal Banner Card
  const renderWideBannerCard = (rec: RecommendationSummary, key: string) => {
    const bgUri = rec.media.backdropUrl ?? rec.media.posterUrl ?? undefined;
    const matchScore = Math.round(rec.score * 100);
    return (
      <Pressable
        key={key}
        accessibilityRole="button"
        onPress={() => handleOpenMedia(rec)}
        onLongPress={() => handleLongPress(rec)}
        style={({ pressed }) => [
          styles.curatedWideCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        {bgUri ? (
          <Image
            source={{ uri: bgUri }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.curatedWideScrim} />

        <View style={styles.curatedWideTopRow}>
          <View style={styles.curatedWideBadge}>
            <Ionicons name="sparkles" size={11} color="#F59E0B" />
            <Text style={styles.curatedWideBadgeText}>EDITORIAL HIGHLIGHT · {matchScore}%</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={(e) => {
              e.stopPropagation();
              haptics.selection();
              onAddToWatchlist?.(rec.media.id);
              onFeedback?.(rec.id, 'SAVED');
            }}
            style={styles.curatedWideAddBtn}
          >
            <Ionicons name="bookmark" size={13} color="#FFFFFF" />
            <Text style={styles.curatedWideAddBtnText}>Save</Text>
          </Pressable>
        </View>

        <View style={styles.curatedWideMiddle}>
          <Text numberOfLines={1} style={styles.curatedWideTitle}>
            {rec.media.title}
          </Text>
          <Text numberOfLines={2} style={styles.curatedWideExplanation}>
            {rec.explanation || 'Perfect thematic resonance with your CineWrapped profile history.'}
          </Text>
        </View>

        <View style={styles.curatedWideBottomRow}>
          <Text style={styles.curatedWideMeta}>
            {rec.media.releaseYear ?? '2026'} · {rec.media.mediaType === 'MOVIE' ? 'Feature Film' : 'Series'}
          </Text>
          {rec.media.averageProviderRating ? (
            <View style={styles.curatedWideRatingPill}>
              <Text style={styles.curatedWideRatingText}>
                ★ {rec.media.averageProviderRating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Bento Grid Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <View style={[styles.bentoPill, { backgroundColor: 'rgba(222, 54, 65, 0.12)' }]}>
            <Ionicons name="sparkles" size={12} color={colors.brand} />
            <Text style={[styles.bentoPillText, { color: colors.brand }]}>TASTE MATRIX</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Personalized Bento
          </Text>
        </View>
      </View>

      {/* Bento Matrix Container */}
      <View style={styles.gridContainer}>
        {/* ROW 1: Hero Match Spotlight (Top Left) + Backdrop Teaser (Top Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card 1: #1 Taste Match Hero Card with Movie Thumbnail Background */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item0 && handleOpenMedia(item0)}
            onLongPress={() => item0 && handleLongPress(item0)}
            style={({ pressed }) => [
              styles.card,
              styles.cardHeroMatch,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            {/* Movie Thumbnail Background Art */}
            {item0 && (item0.media.backdropUrl || item0.media.posterUrl) ? (
              <Image
                source={{ uri: item0.media.backdropUrl ?? item0.media.posterUrl ?? undefined }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}

            {/* Dark Crimson Vignette Scrim for High-Contrast Readability */}
            <View style={styles.heroMatchScrim} />

            <View style={styles.cardHeaderRow}>
              <View style={styles.matchBadgeHero}>
                <Ionicons name="flame" size={13} color="#FFFFFF" />
                <Text style={styles.matchBadgeHeroText}>
                  {item0?.recommendationType === 'HIDDEN_GEM' ? '💎 HIDDEN GEM' : '🎯 99% MATCH'}
                </Text>
              </View>
              <BrandLogo size="sm" variant="mark" />
            </View>

            <View style={styles.heroContentWrap}>
              <Text numberOfLines={2} style={styles.heroTitle}>
                {item0?.media.title ?? 'Signature Recommendation'}
              </Text>
              <Text numberOfLines={2} style={styles.heroExplanation}>
                {item0?.explanation ?? 'Perfect alignment with your recent 5-star ratings and genre preferences.'}
              </Text>

              <View style={styles.heroActionRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={(e) => {
                    e.stopPropagation();
                    if (item0) {
                      haptics.clapperSnap();
                      onAddToWatchlist?.(item0.media.id);
                      onFeedback?.(item0.id, 'SAVED');
                    }
                  }}
                  style={({ pressed }) => [
                    styles.heroWatchlistButton,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons name="add" size={16} color="#DE3641" />
                  <Text style={styles.heroWatchlistButtonText}>Add to Watchlist</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>

          {/* Card 2: High Affinity Backdrop Preview Card */}
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
              <View style={styles.pillTagRow}>
                <View style={[styles.specPill, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.specPillText, { color: colors.brand }]}>
                    {Math.round((item1?.score ?? 0.92) * 100)}% Match
                  </Text>
                </View>
                <View style={[styles.specPill, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.specPillText, { color: colors.textSecondary }]}>
                    {item1?.media.releaseYear ?? '2026'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.billboardEyebrow, { color: colors.textSecondary }]}>
                HIGH AFFINITY
              </Text>
              <Text numberOfLines={2} style={[styles.billboardTitle, { color: colors.textPrimary }]}>
                {item1?.media.title ?? 'Curated Cinema'}
              </Text>
              <Text numberOfLines={1} style={[styles.billboardMeta, { color: colors.textSecondary }]}>
                {item1?.media.genreIds[0] ?? 'Drama'} · {item1?.media.mediaType === 'MOVIE' ? 'Feature' : 'Series'}
              </Text>
            </View>

            {/* Floating Backdrop Thumbnail */}
            <View style={styles.billboardArtWrap}>
              {item1?.media.backdropUrl || item1?.media.posterUrl ? (
                <Image
                  source={{ uri: item1.media.backdropUrl ?? item1.media.posterUrl ?? '' }}
                  style={styles.billboardImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.billboardPlaceholder, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="videocam" size={24} color={colors.textDisabled} />
                </View>
              )}
            </View>
          </Pressable>
        </View>

        {/* ROW 2: Tall Vault Choice (Left) + Metric & Community Stack (Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card 3: Tall Vault Choice */}
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
            <View style={styles.portraitPosterWrap}>
              <PosterImage uri={item2?.media.posterUrl ?? null} size="fill" rounded={16} />
              <View style={styles.portraitFloatingBadge}>
                <Ionicons name="diamond" size={11} color="#F59E0B" />
                <Text style={styles.portraitBadgeText}>Vault Discovery</Text>
              </View>
            </View>

            <View style={styles.portraitInfo}>
              <Text numberOfLines={1} style={[styles.portraitTitle, { color: colors.textPrimary }]}>
                {item2?.media.title ?? 'Prestige Choice'}
              </Text>
              <Text numberOfLines={2} style={[styles.portraitExplanation, { color: colors.textSecondary }]}>
                {item2?.explanation ?? 'A masterclass in tension and atmosphere.'}
              </Text>
            </View>
          </Pressable>

          {/* Right Column: 2x Square Metric & Resonance Cards */}
          <View style={styles.metricColumn}>
            {/* Card 4: Taste Calibration Metric */}
            <View
              style={[
                styles.card,
                styles.cardMetricSquare,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                Taste Signals
              </Text>
              <Text style={[styles.metricBigNumber, { color: colors.textPrimary }]}>
                {signalCount > 0 ? `${signalCount}` : '84'}
              </Text>
              <View style={styles.growthPill}>
                <Ionicons name="finger-print" size={13} color="#10B981" />
                <Text style={styles.growthPillText}>{topGenre.split(' ')[0]} Focus</Text>
              </View>
            </View>

            {/* Card 5: Critical Resonance & Friend Story Stack */}
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
                  {item3?.media.averageProviderRating ? (item3.media.averageProviderRating * 0.98).toFixed(1) : '4.8'}
                </Text>
                <View style={[styles.arrowCircle, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="arrow-up-outline" size={14} color={colors.brand} style={{ transform: [{ rotate: '45deg' }] }} />
                </View>
              </View>

              {/* Overlapping Community Avatar Stack */}
              <View style={styles.avatarStackRow}>
                <View style={[styles.avatarCircle, { backgroundColor: '#DE3641', borderColor: colors.surface }]}>
                  <Text style={styles.avatarInitials}>CW</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#6366F1', marginLeft: -8, borderColor: colors.surface }]}>
                  <Text style={styles.avatarInitials}>NB</Text>
                </View>
                <View style={[styles.avatarCircle, { backgroundColor: '#10B981', marginLeft: -8, borderColor: colors.surface }]}>
                  <Text style={styles.avatarInitials}>CR</Text>
                </View>
                <Text numberOfLines={1} style={[styles.avatarStackLabel, { color: colors.textSecondary }]}>
                  {item3?.media.title ?? 'Critic Favorite'}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* ROW 3: Resonance Wave Card (Left) + AI Curator Card (Right) */}
        <View style={[styles.row, isWide && styles.rowWide]}>
          {/* Card 6: Taste Synergy Wave */}
          <Pressable
            accessibilityRole="button"
            onPress={() => item4 && handleOpenMedia(item4)}
            onLongPress={() => item4 && handleLongPress(item4)}
            style={({ pressed }) => [
              styles.card,
              styles.cardWave,
              {
                backgroundColor: '#17142A',
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <View style={styles.waveHeaderRow}>
              <View style={styles.waveLegendRow}>
                <View style={styles.waveDotGroup}>
                  <View style={[styles.waveDot, { backgroundColor: '#818CF8' }]} />
                  <Text style={styles.waveLegendText}>Taste Match</Text>
                </View>
                <View style={styles.waveDotGroup}>
                  <View style={[styles.waveDot, { backgroundColor: '#F472B6' }]} />
                  <Text style={styles.waveLegendText}>Critique</Text>
                </View>
              </View>
              <Text style={styles.waveSurgeBadge}>99.4% SYNERGY</Text>
            </View>

            {/* Stylized Waves */}
            <View style={styles.wavesArtContainer}>
              <View style={[styles.waveRibbon, { backgroundColor: 'rgba(129, 140, 248, 0.25)', top: 12 }]} />
              <View style={[styles.waveRibbon, { backgroundColor: 'rgba(244, 114, 182, 0.35)', top: 22 }]} />
              <View style={[styles.waveRibbon, { backgroundColor: '#6366F1', top: 32 }]} />
            </View>

            <View style={styles.waveFooterRow}>
              <Text numberOfLines={1} style={styles.waveMovieTitle}>
                {item4?.media.title ?? 'Resonant Spotlight'}
              </Text>
              <Text style={styles.waveIndexStat}>Optimal Pick</Text>
            </View>
          </Pressable>

          {/* Card 7: AI Assistant Launch Card */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/ai')}
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
            <Text style={[styles.editorialEyebrow, { color: colors.brand }]}>
              AI MOOD NAVIGATOR
            </Text>
            <Text numberOfLines={2} style={[styles.editorialHeadline, { color: colors.textPrimary }]}>
              Need a bespoke mood reel tonight?
            </Text>

            <View style={styles.clapperSymbolWrap}>
              <View style={[styles.clapper3DCrest, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="hardware-chip-outline" size={26} color={colors.brand} />
              </View>
            </View>

            <View style={styles.editorialFooter}>
              <Text style={[styles.editorialActionText, { color: colors.textSecondary }]}>
                Consult AI Assistant ➔
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* More Curated For You: Modular Vertical & Horizontal Bento Grid */}
      {restItems.length > 0 ? (
        <View style={styles.shelfContainer}>
          <View style={styles.shelfHeaderRow}>
            <Text style={[styles.shelfHeaderTitle, { color: colors.textPrimary }]}>
              More Curated For You
            </Text>
            <View style={styles.shelfPillBadge}>
              <Ionicons name="sparkles" size={11} color="#F59E0B" />
              <Text style={styles.shelfPillText}>{restItems.length} TITLES</Text>
            </View>
          </View>

          <View style={styles.shelfBentoGrid}>
            {(() => {
              const bentoNodes: React.ReactNode[] = [];
              let i = 0;
              let patternIndex = 0;

              while (i < restItems.length) {
                const remaining = restItems.length - i;

                if (patternIndex % 2 === 0) {
                  // Pattern A: Asymmetrical Combo (Tall Vertical on Left, 2 Stacked Mini Horizontal on Right)
                  if (remaining >= 3) {
                    const tallItem = restItems[i]!;
                    const miniItem1 = restItems[i + 1]!;
                    const miniItem2 = restItems[i + 2]!;
                    bentoNodes.push(
                      <View
                        key={`bento-cluster-a-${i}`}
                        style={[styles.curatedRow, isWide && styles.curatedRowWide]}
                      >
                        <View style={{ flex: 1.15 }}>
                          {renderTallCard(tallItem, `tall-${tallItem.id}`)}
                        </View>
                        <View style={styles.curatedMiniStack}>
                          {renderHorizontalMiniCard(miniItem1, `mini-${miniItem1.id}`)}
                          {renderHorizontalMiniCard(miniItem2, `mini-${miniItem2.id}`)}
                        </View>
                      </View>,
                    );
                    i += 3;
                  } else if (remaining === 2) {
                    const itemA = restItems[i]!;
                    const itemB = restItems[i + 1]!;
                    bentoNodes.push(
                      <View
                        key={`bento-pair-${i}`}
                        style={[styles.curatedRow, isWide && styles.curatedRowWide]}
                      >
                        <View style={{ flex: 1 }}>{renderTallCard(itemA, `tall-${itemA.id}`)}</View>
                        <View style={{ flex: 1 }}>{renderTallCard(itemB, `tall-${itemB.id}`)}</View>
                      </View>,
                    );
                    i += 2;
                  } else {
                    const singleItem = restItems[i]!;
                    bentoNodes.push(
                      <View key={`bento-wide-${i}`} style={styles.curatedSingleWideWrap}>
                        {renderWideBannerCard(singleItem, `wide-${singleItem.id}`)}
                      </View>,
                    );
                    i += 1;
                  }
                } else {
                  // Pattern B: Full-Width Horizontal Banner Card, or Inverse Asymmetrical Combo
                  if (remaining >= 4) {
                    const wideItem = restItems[i]!;
                    bentoNodes.push(
                      <View key={`bento-wide-${i}`} style={styles.curatedSingleWideWrap}>
                        {renderWideBannerCard(wideItem, `wide-${wideItem.id}`)}
                      </View>,
                    );
                    i += 1;
                  } else if (remaining === 3) {
                    const miniItem1 = restItems[i]!;
                    const miniItem2 = restItems[i + 1]!;
                    const tallItem = restItems[i + 2]!;
                    bentoNodes.push(
                      <View
                        key={`bento-cluster-b-${i}`}
                        style={[styles.curatedRow, isWide && styles.curatedRowWide]}
                      >
                        <View style={styles.curatedMiniStack}>
                          {renderHorizontalMiniCard(miniItem1, `mini-${miniItem1.id}`)}
                          {renderHorizontalMiniCard(miniItem2, `mini-${miniItem2.id}`)}
                        </View>
                        <View style={{ flex: 1.15 }}>
                          {renderTallCard(tallItem, `tall-${tallItem.id}`)}
                        </View>
                      </View>,
                    );
                    i += 3;
                  } else if (remaining === 2) {
                    const itemA = restItems[i]!;
                    const itemB = restItems[i + 1]!;
                    bentoNodes.push(
                      <View
                        key={`bento-pair-${i}`}
                        style={[styles.curatedRow, isWide && styles.curatedRowWide]}
                      >
                        <View style={{ flex: 1 }}>{renderTallCard(itemA, `tall-${itemA.id}`)}</View>
                        <View style={{ flex: 1 }}>{renderTallCard(itemB, `tall-${itemB.id}`)}</View>
                      </View>,
                    );
                    i += 2;
                  } else {
                    const singleItem = restItems[i]!;
                    bentoNodes.push(
                      <View key={`bento-wide-${i}`} style={styles.curatedSingleWideWrap}>
                        {renderWideBannerCard(singleItem, `wide-${singleItem.id}`)}
                      </View>,
                    );
                    i += 1;
                  }
                }

                patternIndex++;
              }

              return bentoNodes;
            })()}
          </View>
        </View>
      ) : null}

      {/* Quick Preview Modal on Long Press */}
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
    gap: 16,
    marginTop: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    gap: 4,
  },
  bentoPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bentoPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
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

  /* Card 1: Hero Match */
  cardHeroMatch: {
    backgroundColor: '#1E0E12',
    borderColor: 'rgba(222, 54, 65, 0.4)',
    justifyContent: 'space-between',
    minHeight: 180,
    position: 'relative',
  },
  heroMatchScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 6, 8, 0.68)',
  },
  cardHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  matchBadgeHero: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  matchBadgeHeroText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  heroContentWrap: {
    gap: 8,
    marginTop: 14,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  heroExplanation: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    lineHeight: 18,
  },
  heroActionRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  heroWatchlistButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heroWatchlistButtonText: {
    color: '#DE3641',
    fontSize: 13,
    fontWeight: '800',
  },

  /* Card 2: Billboard */
  cardBillboard: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 130,
  },
  billboardLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  pillTagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  specPill: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  specPillText: {
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
  billboardMeta: {
    fontSize: 12,
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

  /* Card 3: Tall Portrait */
  cardPortrait: {
    gap: 12,
  },
  portraitPosterWrap: {
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  portraitFloatingBadge: {
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
  portraitBadgeText: {
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
  portraitExplanation: {
    fontSize: 13,
    lineHeight: 18,
  },

  /* Metric Column */
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

  /* Card 6: Wave Chart */
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
    color: '#818CF8',
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
    color: '#818CF8',
    fontSize: 13,
    fontWeight: '900',
  },

  /* Card 7: Editorial */
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

  /* More Curated For You: Modular Bento Grid */
  shelfContainer: {
    gap: 14,
    marginTop: 14,
  },
  shelfHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shelfHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  shelfPillBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  shelfPillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  shelfBentoGrid: {
    gap: 12,
  },
  curatedRow: {
    flexDirection: 'row',
    gap: 12,
  },
  curatedRowWide: {
    flexDirection: 'row',
    gap: 14,
  },
  curatedSingleWideWrap: {
    width: '100%',
  },

  /* Tall Vertical Card */
  curatedTallCard: {
    borderRadius: 20,
    borderWidth: 1,
    height: 245,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 14,
    position: 'relative',
  },
  curatedTallScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 8, 14, 0.62)',
  },
  curatedTallTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  curatedMatchPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  curatedMatchPillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  curatedBookmarkBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    borderWidth: 1,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  curatedTallBottom: {
    gap: 4,
    zIndex: 2,
  },
  curatedTallMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  curatedTallTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
  },
  curatedTallRatingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  curatedTallRatingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  curatedTallRatingText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },

  /* Stacked Mini Horizontal Cards */
  curatedMiniStack: {
    flex: 1,
    gap: 12,
    justifyContent: 'space-between',
  },
  curatedMiniCard: {
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    height: 116,
    overflow: 'hidden',
    padding: 8,
  },
  curatedMiniPosterWrap: {
    borderRadius: 12,
    height: '100%',
    overflow: 'hidden',
    width: 72,
  },
  curatedMiniContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingLeft: 10,
    paddingVertical: 2,
  },
  curatedMiniHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  curatedMiniMatchText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  curatedMiniTitle: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  curatedMiniSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  curatedMiniBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  curatedMiniTag: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
  },
  curatedMiniTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  curatedMiniRating: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* Wide Full-Width Horizontal Banner Card */
  curatedWideCard: {
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 128,
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
    justifyContent: 'space-between',
  },
  curatedWideScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 10, 16, 0.72)',
  },
  curatedWideTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  curatedWideBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  curatedWideBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  curatedWideMiddle: {
    gap: 3,
    marginVertical: 6,
    zIndex: 2,
  },
  curatedWideTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  curatedWideExplanation: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 16,
  },
  curatedWideBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  curatedWideMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '600',
  },
  curatedWideRatingPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.22)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  curatedWideRatingText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
  },
  curatedWideAddBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  curatedWideAddBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
