import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../ui';
import { haptics } from '../../lib/haptics';

export interface ContinueWatchingItem {
  id: string;
  media: {
    id: string;
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    backdropUrl: string | null;
    runtimeMinutes: number | null;
    mediaType: 'MOVIE' | 'TV';
  };
  progressPercent: number; // 0 - 100
  lastWatchedAt: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

const DEFAULT_CONTINUE_ITEM: ContinueWatchingItem = {
  id: 'cw-1',
  media: {
    id: 'm-oppenheimer',
    title: 'Oppenheimer',
    releaseYear: 2023,
    posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/rLb2cw0iw3159xHe10nbd0jL6jX.jpg',
    runtimeMinutes: 180,
    mediaType: 'MOVIE',
  },
  progressPercent: 64,
  lastWatchedAt: new Date().toISOString(),
};

export function ContinueWatchingWidget({
  item = DEFAULT_CONTINUE_ITEM,
  onFinish,
}: {
  item?: ContinueWatchingItem;
  onFinish?: (id: string) => void;
}) {
  const colors = useColors();
  const [completed, setCompleted] = useState(false);

  const runtime = item.media.runtimeMinutes ?? 120;
  const minutesLeft = Math.max(1, Math.round(runtime * (1 - item.progressPercent / 100)));

  const handleResume = () => {
    haptics.selection();
    router.push(`/media/${item.media.id}`);
  };

  const handleMarkFinished = (e: any) => {
    e.stopPropagation?.();
    haptics.clapperSnap();
    setCompleted(true);
    if (onFinish) onFinish(item.id);
  };

  if (completed) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue watching ${item.media.title}`}
      onPress={handleResume}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Backdrop with Ambient Glow & Gradient */}
      <View style={styles.backdropContainer}>
        <Image
          source={{ uri: item.media.backdropUrl ?? item.media.posterUrl ?? '' }}
          style={styles.backdropImage}
          resizeMode="cover"
        />
        <View style={styles.backdropOverlay} />
        
        {/* Top Badges */}
        <View style={styles.topBadgeRow}>
          <View style={[styles.statusPill, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusPillText}>CONTINUE WATCHING</Text>
          </View>
          
          <View style={[styles.timeLeftPill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
            <Ionicons name="time-outline" size={12} color="#FFD700" />
            <Text style={styles.timeLeftText}>{minutesLeft}m left</Text>
          </View>
        </View>

        {/* Play Button Overlay */}
        <View style={styles.playButtonWrapper}>
          <View style={[styles.playButtonCircle, { backgroundColor: colors.brand }]}>
            <Ionicons name="play" size={18} color={colors.onBrand} style={{ marginLeft: 2 }} />
          </View>
        </View>
      </View>

      {/* Progress Track Bar */}
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceRaised }]}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.brand, width: `${item.progressPercent}%` },
          ]}
        />
      </View>

      {/* Bottom Info Bar */}
      <View style={styles.infoBar}>
        <View style={styles.titleColumn}>
          <Text style={[styles.mediaTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.media.title}
          </Text>
          <Text style={[styles.episodeMeta, { color: colors.textSecondary }]}>
            {item.media.mediaType === 'TV' && item.seasonNumber
              ? `S${item.seasonNumber} E${item.episodeNumber} · ${item.episodeTitle ?? 'Episode'}`
              : `${item.progressPercent}% complete · ${item.media.releaseYear ?? ''}`}
          </Text>
        </View>

        {/* 1-Tap Quick Action */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mark as finished"
          onPress={handleMarkFinished}
          hitSlop={8}
          style={({ pressed }) => [
            styles.finishButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="checkmark-done" size={15} color={colors.brand} />
          <Text style={[styles.finishButtonText, { color: colors.textPrimary }]}>Done</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  backdropContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
  },
  backdropImage: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  timeLeftPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  timeLeftText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  playButtonWrapper: {
    alignSelf: 'center',
  },
  playButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  progressTrack: {
    height: 3.5,
    width: '100%',
  },
  progressFill: {
    height: '100%',
  },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  titleColumn: {
    flex: 1,
    gap: 2,
  },
  mediaTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  episodeMeta: {
    fontSize: 12,
    fontWeight: '500',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  finishButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
