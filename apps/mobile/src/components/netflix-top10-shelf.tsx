import type { MediaSummary, RecommendationSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { NetflixQuickPreviewModal } from './netflix-quick-preview-modal';
import { PosterImage, Skeleton, useColors } from './ui';

interface NetflixTop10ShelfProps {
  items: RecommendationSummary[];
  title?: string;
  loading?: boolean;
}

export function NetflixTop10ShelfSkeleton({
  title = 'Top 10 in CineWrapped Today',
}: {
  title?: string | undefined;
}) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.top10Square}>
            <Text style={styles.top10SquareText}>TOP</Text>
            <Text style={styles.top10SquareNum}>10</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[1, 2, 3, 4].map((num) => (
          <View key={num} style={styles.itemCard}>
            <View style={styles.rankNumberContainer}>
              <Text style={[styles.rankNumber, { color: 'rgba(150, 150, 150, 0.2)' }]}>{num}</Text>
            </View>
            <View style={styles.posterWrap}>
              <Skeleton width={100} height={145} rounded={8} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function NetflixTop10Shelf({
  items,
  title = 'Top 10 in CineWrapped Today',
  loading = false,
}: NetflixTop10ShelfProps) {
  const colors = useColors();
  const [selectedMedia, setSelectedMedia] = useState<MediaSummary | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | undefined>(undefined);

  if (loading) {
    return <NetflixTop10ShelfSkeleton title={title} />;
  }

  const top10List = items.slice(0, 10);
  if (top10List.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={styles.top10Square}>
            <Text style={styles.top10SquareText}>TOP</Text>
            <Text style={styles.top10SquareNum}>10</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        </View>
      </View>

      {/* Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {top10List.map((rec, index) => {
          const rank = index + 1;
          const media = rec.media;

          return (
            <Pressable
              accessibilityRole="button"
              key={rec.id}
              onPress={() => {
                haptics.selection();
                router.push(`/media/${media.id}`);
              }}
              onLongPress={() => {
                haptics.clapperSnap();
                setSelectedMedia(media);
                setSelectedScore(rec.score);
              }}
              style={({ pressed }) => [styles.itemCard, { opacity: pressed ? 0.85 : 1 }]}
            >
              {/* Giant Stylized Rank Numeral (Outlined Layered Style) */}
              <View style={styles.rankNumberContainer}>
                {/* Outlined Shadow Effect */}
                <Text style={[styles.rankNumberStroke, { color: '#000000' }]}>{rank}</Text>
                <Text style={styles.rankNumber}>{rank}</Text>
              </View>

              {/* 2:3 Vertical Movie Poster */}
              <View style={[styles.posterWrap, { borderColor: colors.border }]}>
                <PosterImage uri={media.posterUrl} size="fill" rounded={8} />

                {/* Subtle Recently Added / High Match Ribbon */}
                {rank <= 3 ? (
                  <View style={styles.rankCrownBadge}>
                    <Ionicons name="flame" size={12} color="#FFFFFF" />
                    <Text style={styles.rankCrownText}>#{rank}</Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Netflix Quick Preview Sheet */}
      <NetflixQuickPreviewModal
        media={selectedMedia}
        matchScore={selectedScore}
        visible={selectedMedia !== null}
        onClose={() => {
          setSelectedMedia(null);
          setSelectedScore(undefined);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 14,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  top10Square: {
    alignItems: 'center',
    backgroundColor: '#E50914',
    borderRadius: 4,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  top10SquareText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    lineHeight: 8,
  },
  top10SquareNum: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 11,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  scrollContent: {
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  itemCard: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 150,
    position: 'relative',
    width: 148,
  },
  rankNumberContainer: {
    bottom: -10,
    left: -6,
    position: 'absolute',
    zIndex: 1,
  },
  rankNumberStroke: {
    fontSize: 98,
    fontWeight: '900',
    left: -2,
    position: 'absolute',
    top: -2,
  },
  rankNumber: {
    color: '#595959',
    fontSize: 96,
    fontWeight: '900',
    letterSpacing: -6,
    textShadowColor: '#000000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  posterWrap: {
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    height: 145,
    marginLeft: 42,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    width: 100,
    zIndex: 2,
  },
  rankCrownBadge: {
    alignItems: 'center',
    backgroundColor: '#E50914',
    borderBottomRightRadius: 6,
    flexDirection: 'row',
    gap: 2,
    left: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: 'absolute',
    top: 0,
    zIndex: 5,
  },
  rankCrownText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
