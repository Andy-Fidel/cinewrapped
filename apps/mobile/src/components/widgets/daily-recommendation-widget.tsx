import type { RecommendationSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useColors } from '../ui';
import { haptics } from '../../lib/haptics';

export function DailyRecommendationWidget({
  recommendation,
  onAddToWatchlist,
}: {
  recommendation?: RecommendationSummary | undefined;
  onAddToWatchlist?: ((mediaId: string) => void) | undefined;
}) {
  const colors = useColors();
  const [inWatchlist, setInWatchlist] = useState(false);

  const media = recommendation?.media;
  const matchScore = recommendation?.score ? Math.round(recommendation.score * 100) : 98;
  const vibeTag = recommendation?.explanation ?? '🔥 Cinema Masterpiece';

  const handlePress = () => {
    if (!media) return;
    haptics.selection();
    router.push(`/media/${media.id}`);
  };

  const handleToggleWatchlist = (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (!media) return;
    haptics.heartReact();
    setInWatchlist((prev) => !prev);
    if (onAddToWatchlist) onAddToWatchlist(media.id);
  };

  if (!media) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Recommendation of the day: ${media.title}`}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.brand,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Visual Billboard with Hero Artwork */}
      <View style={styles.heroArtContainer}>
        <Image
          source={{ uri: media.backdropUrl ?? media.posterUrl ?? '' }}
          style={styles.backdropImage}
          resizeMode="cover"
        />
        <View style={styles.gradientOverlay} />

        {/* Top Badges: Spotlight Crown & Match Score */}
        <View style={styles.topBadgeRow}>
          <View style={styles.crownBadge}>
            <Ionicons name="sparkles" size={12} color="#FFD700" />
            <Text style={styles.crownText}>RECOMMENDATION OF THE DAY</Text>
          </View>

          <View style={styles.matchBadge}>
            <Text style={styles.matchScoreText}>{matchScore}%</Text>
            <Text style={styles.matchLabelText}>MATCH</Text>
          </View>
        </View>

        {/* Center Poster + Details Overlay */}
        <View style={styles.centerMetaRow}>
          {media.posterUrl ? (
            <Image
              source={{ uri: media.posterUrl }}
              style={styles.posterThumbnail}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.metaColumn}>
            <View style={styles.vibePill}>
              <Text style={styles.vibeText}>{vibeTag}</Text>
            </View>

            <Text style={styles.mediaTitle} numberOfLines={2}>
              {media.title}
            </Text>

            <Text style={styles.metaSubtext}>
              {media.releaseYear ?? ''} ·{' '}
              {media.runtimeMinutes ? `${media.runtimeMinutes}m` : 'Feature'} · {media.mediaType}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Footer */}
      <View
        style={[
          styles.footerBar,
          { backgroundColor: colors.surface, borderTopColor: colors.border },
        ]}
      >
        <View style={styles.streamingInfo}>
          <Ionicons name="tv-outline" size={15} color={colors.textSecondary} />
          <Text style={[styles.streamingText, { color: colors.textSecondary }]}>
            Available on Demand & Cinema
          </Text>
        </View>

        <View style={styles.actionButtons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add to watchlist"
            onPress={handleToggleWatchlist}
            style={({ pressed }) => [
              styles.watchlistButton,
              {
                backgroundColor: inWatchlist ? colors.surfaceRaised : 'transparent',
                borderColor: inWatchlist ? colors.brand : colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name={inWatchlist ? 'checkmark' : 'add'}
              size={16}
              color={inWatchlist ? colors.brand : colors.textPrimary}
            />
            <Text
              style={[
                styles.watchlistButtonText,
                { color: inWatchlist ? colors.brand : colors.textPrimary },
              ]}
            >
              {inWatchlist ? 'Saved' : 'Watchlist'}
            </Text>
          </Pressable>

          <View style={[styles.playPill, { backgroundColor: colors.brand }]}>
            <Text style={[styles.playPillText, { color: colors.onBrand }]}>View Pick</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.onBrand} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  heroArtContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 14,
  },
  backdropImage: {
    ...StyleSheet.absoluteFill,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 10, 15, 0.72)',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  crownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 198, 92, 0.2)',
    borderWidth: 1,
    borderColor: '#FFC65C',
    flex: 1,
    minWidth: 0,
  },
  crownText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
    flexShrink: 1,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderColor: '#10B981',
    flexShrink: 0,
  },
  matchScoreText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '900',
  },
  matchLabelText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  centerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  posterThumbnail: {
    width: 50,
    height: 75,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  metaColumn: {
    flex: 1,
    gap: 4,
  },
  vibePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vibeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mediaTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  metaSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '600',
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  streamingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  streamingText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  watchlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  watchlistButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  playPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
