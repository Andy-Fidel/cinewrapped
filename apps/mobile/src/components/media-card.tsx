import type { MediaSummary } from '@cinewrapped/shared-types';
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
      style={({ pressed }) => [styles.container, { opacity: pressed ? 0.7 : 1 }]}
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
      </View>
      <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
        {media.title}
      </Text>
      <Text style={[styles.meta, { color: colors.textSecondary }]}>
        {media.releaseYear ?? 'TBA'} · {media.mediaType === 'MOVIE' ? 'Movie' : 'TV'}
        {media.averageProviderRating === null ? '' : ` · ${media.averageProviderRating.toFixed(1)}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 7, marginBottom: 20, marginHorizontal: 6 },
  poster: { aspectRatio: 2 / 3, borderRadius: 12, justifyContent: 'center', overflow: 'hidden' },
  missing: { textAlign: 'center' },
  title: { fontSize: 15, fontWeight: '700', lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 16 },
});
