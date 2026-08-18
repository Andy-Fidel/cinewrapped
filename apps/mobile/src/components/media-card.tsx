import type { MediaSummary } from '@cinewrapped/shared-types';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { NetflixQuickPreviewModal } from './netflix-quick-preview-modal';
import { PosterImage, StarRating, useColors } from './ui';

export function MediaCard({ media }: { media: MediaSummary }) {
  const colors = useColors();
  const [previewVisible, setPreviewVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityLabel={`${media.title}${media.releaseYear === null ? '' : `, ${media.releaseYear}`}`}
        accessibilityRole="button"
        onPress={() => router.push(`/media/${media.id}`)}
        onLongPress={() => {
          haptics.clapperSnap();
          setPreviewVisible(true);
        }}
        style={({ pressed }) => [
          styles.container,
          {
            transform: [{ scale: pressed ? 0.96 : 1 }],
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={styles.posterContainer}>
          <PosterImage
            uri={media.posterUrl}
            size="fill"
            rounded={12}
          />
          {media.averageProviderRating !== null ? (
            <View style={styles.ratingWrapper}>
              <StarRating rating={media.averageProviderRating} size="sm" />
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

      <NetflixQuickPreviewModal
        media={media}
        visible={previewVisible}
        onClose={() => setPreviewVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: 6, marginBottom: 20, marginHorizontal: 6 },
  posterContainer: {
    aspectRatio: 2 / 3,
    borderRadius: 12,
    position: 'relative',
    width: '100%',
  },
  ratingWrapper: {
    position: 'absolute',
    right: 6,
    top: 6,
    zIndex: 2,
  },
  title: { fontSize: 14, fontWeight: '700', lineHeight: 19 },
  meta: { fontSize: 12, lineHeight: 16 },
});
