import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';

export function MediaCard({ media }: { media: MediaSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={`${media.title}${media.releaseYear === null ? '' : `, ${media.releaseYear}`}`}
      accessibilityRole="button"
      onPress={() => router.push(`/media/${media.id}`)}
      style={({ pressed }) => [
        styles.container,
        {
          transform: [{ scale: pressed ? 0.96 : 1 }],
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.poster, { backgroundColor: colors.surfaceRaised }]}>
        {media.posterUrl === null ? (
          <Text style={[styles.missing, { color: colors.textSecondary }]}>No poster</Text>
        ) : (
          <Image
            accessibilityLabel=""
            resizeMode="cover"
            source={{ uri: media.posterUrl }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {media.averageProviderRating !== null ? (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={10} color="#FFD700" />
            <Text style={styles.ratingText}>{media.averageProviderRating.toFixed(1)}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
        {media.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {media.releaseYear ?? 'TBA'} · {media.mediaType === 'MOVIE' ? 'Movie' : 'TV'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 7, marginBottom: 20, marginHorizontal: 6 },
  poster: {
    aspectRatio: 2 / 3,
    borderRadius: 14,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  missing: { textAlign: 'center' },
  ratingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 16 },
});
