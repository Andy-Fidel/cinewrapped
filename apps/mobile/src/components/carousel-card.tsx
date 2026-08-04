import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';

export function CarouselCard({ media }: { media: MediaSummary }) {
  const colors = useColors();
  const imageUrl = media.backdropUrl ?? media.posterUrl;

  return (
    <Pressable
      accessibilityLabel={`Featured: ${media.title}${media.releaseYear === null ? '' : `, ${media.releaseYear}`}`}
      accessibilityRole="button"
      onPress={() => router.push(`/media/${media.id}`)}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surfaceRaised }]}>
        {imageUrl === null ? (
          <View style={styles.fallback}>
            <Ionicons name="film-outline" size={32} color={colors.textDisabled} />
          </View>
        ) : (
          <Image source={{ uri: imageUrl }} resizeMode="cover" style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.overlay} />

        {/* Top Badges */}
        <View style={styles.topBadges}>
          <View style={[styles.pill, { backgroundColor: colors.brand }]}>
            <Text style={[styles.pillText, { color: colors.onBrand }]}>
              {media.mediaType === 'MOVIE' ? 'Movie' : 'TV'}
            </Text>
          </View>
          {media.averageProviderRating !== null ? (
            <View style={[styles.ratingPill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.ratingText}>{media.averageProviderRating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.textPrimary }]}>
          {media.title}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.textSecondary }]}>
          {[
            media.releaseYear ?? 'TBA',
            media.runtimeMinutes === null ? null : `${media.runtimeMinutes}m`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {media.overview ? (
          <Text numberOfLines={2} style={[styles.overview, { color: colors.textSecondary }]}>
            {media.overview}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    height: 220,
    marginRight: 14,
    overflow: 'hidden',
    width: 260,
  },
  imageContainer: {
    height: 125,
    justifyContent: 'space-between',
    overflow: 'hidden',
    padding: 10,
    position: 'relative',
    width: '100%',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  topBadges: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  pill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  ratingPill: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  info: {
    gap: 3,
    padding: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    fontSize: 11,
    fontWeight: '500',
  },
  overview: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
});
