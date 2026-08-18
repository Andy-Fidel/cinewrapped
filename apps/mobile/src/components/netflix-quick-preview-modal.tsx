import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { useColors } from './ui';

interface NetflixQuickPreviewModalProps {
  media: MediaSummary | null;
  visible: boolean;
  onClose: () => void;
  matchScore?: number | undefined;
}

const GENRE_MAP: Record<string, string> = {
  '28': 'Action',
  '12': 'Adventure',
  '16': 'Animation',
  '35': 'Comedy',
  '80': 'Crime',
  '99': 'Documentary',
  '18': 'Drama',
  '10751': 'Family',
  '14': 'Fantasy',
  '36': 'History',
  '27': 'Horror',
  '10402': 'Music',
  '9648': 'Mystery',
  '10749': 'Romance',
  '878': 'Sci-Fi',
  '10770': 'TV Movie',
  '53': 'Thriller',
  '10752': 'War',
  '37': 'Western',
};

export function NetflixQuickPreviewModal({
  media,
  visible,
  onClose,
  matchScore,
}: NetflixQuickPreviewModalProps) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);

  const watchlistMutation = useMutation({
    mutationFn: () => {
      haptics.heartReact();
      return api.request('watchlist/items', { method: 'POST', body: { mediaId: media?.id } });
    },
    onSuccess: async () => {
      setInWatchlist(true);
      await queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      await queryClient.invalidateQueries({ queryKey: ['tracking-state', media?.id] });
    },
  });

  const ratingMutation = useMutation({
    mutationFn: (ratingValue: number) => {
      haptics.ratingStep();
      return api.request(`media/${media?.id}/rating`, {
        method: 'PUT',
        body: { ratingValue, ratingScale: 5 },
      });
    },
    onSuccess: async () => {
      setUserRating(5);
      await queryClient.invalidateQueries({ queryKey: ['tracking-state', media?.id] });
      await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });

  if (!media) return null;

  const matchPercent = matchScore
    ? Math.min(99, Math.max(88, Math.round(matchScore * 100)))
    : 96;

  const releaseYear = media.releaseYear ? String(media.releaseYear) : '';
  const runtimeLabel = media.runtimeMinutes
    ? `${Math.floor(media.runtimeMinutes / 60)}h ${media.runtimeMinutes % 60}m`
    : '';

  const genreNames = (media.genreIds ?? [])
    .map((gid) => GENRE_MAP[gid] ?? gid)
    .filter(Boolean)
    .slice(0, 4);

  const handleShare = async () => {
    haptics.selection();
    await Share.share({
      message: `🎬 Check out "${media.title}" (${releaseYear}) on CineWrapped! https://cinewrapped.app/media/${media.id}`,
      title: media.title,
    });
  };

  const handleOpenDetails = () => {
    haptics.selection();
    onClose();
    router.push(`/media/${media.id}`);
  };

  const handlePlanWatch = () => {
    haptics.clapperSnap();
    onClose();
    router.push({
      pathname: '/calendar',
      params: { eventType: 'WATCH_PLAN', mediaId: media.id, title: media.title },
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />

        {/* Floating Quick Preview Card */}
        <View style={[styles.cardContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Backdrop Header Image */}
          <View style={styles.imageHeader}>
            <Image
              source={{
                uri:
                  media.backdropUrl ||
                  media.posterUrl ||
                  'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000&q=80',
              }}
              style={styles.backdropImage}
              resizeMode="cover"
            />

            {/* Dark Gradient Overlay */}
            <View style={styles.imageDarkGradient} />

            {/* Top Close Icon */}
            <Pressable
              accessibilityLabel="Close preview"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeCircleBtn}
            >
              <Ionicons name="close" size={18} color="#FFFFFF" />
            </Pressable>

            {/* Play Button Center Overlay */}
            <Pressable
              accessibilityRole="button"
              onPress={handlePlanWatch}
              style={({ pressed }) => [
                styles.centerPlayCircle,
                { opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Ionicons name="play" size={24} color="#000000" style={{ marginLeft: 3 }} />
            </Pressable>
          </View>

          {/* Body Content */}
          <View style={styles.bodyContent}>
            {/* Title & Type */}
            <View style={styles.titleRow}>
              <Text numberOfLines={2} style={[styles.titleText, { color: colors.textPrimary }]}>
                {media.title}
              </Text>
            </View>

            {/* Metadata & Quality Row */}
            <View style={styles.metaRow}>
              <Text style={styles.matchText}>🔥 {matchPercent}% Match</Text>
              {releaseYear ? (
                <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                  {releaseYear}
                </Text>
              ) : null}
              {runtimeLabel ? (
                <Text style={[styles.metaItem, { color: colors.textSecondary }]}>
                  {runtimeLabel}
                </Text>
              ) : null}
              <View style={[styles.badgePill, { borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>HD</Text>
              </View>
              <View style={[styles.badgePill, { borderColor: colors.border }]}>
                <Text style={[styles.badgeText, { color: colors.textSecondary }]}>5.1</Text>
              </View>
            </View>

            {/* Overview / Teaser */}
            {media.overview ? (
              <Text numberOfLines={3} style={[styles.overviewText, { color: colors.textSecondary }]}>
                {media.overview}
              </Text>
            ) : null}

            {/* Genre Pills */}
            {genreNames.length > 0 ? (
              <View style={styles.genrePillsRow}>
                {genreNames.map((g, idx) => (
                  <View
                    key={idx}
                    style={[styles.genrePill, { backgroundColor: colors.surfaceRaised }]}
                  >
                    <Text style={[styles.genrePillText, { color: colors.textPrimary }]}>
                      {g}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* 1-Tap Quick Action Row */}
            <View style={styles.actionButtonsRow}>
              {/* Plan / Watch Now */}
              <Pressable
                accessibilityRole="button"
                onPress={handlePlanWatch}
                style={({ pressed }) => [
                  styles.primaryPlayBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="play" size={18} color="#000000" />
                <Text style={styles.primaryPlayBtnText}>Plan Watch</Text>
              </Pressable>

              {/* Add to Watchlist */}
              <Pressable
                accessibilityLabel="Add to My List"
                accessibilityRole="button"
                onPress={() => watchlistMutation.mutate()}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: inWatchlist ? '#10B981' : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={inWatchlist ? 'checkmark' : 'add'}
                  size={20}
                  color={inWatchlist ? '#10B981' : colors.textPrimary}
                />
              </Pressable>

              {/* Thumbs Up / 5★ Rating */}
              <Pressable
                accessibilityLabel="Rate 5 Stars"
                accessibilityRole="button"
                onPress={() => ratingMutation.mutate(5)}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: userRating !== null ? '#F59E0B' : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={userRating !== null ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={18}
                  color={userRating !== null ? '#F59E0B' : colors.textPrimary}
                />
              </Pressable>

              {/* Share */}
              <Pressable
                accessibilityLabel="Share movie"
                accessibilityRole="button"
                onPress={() => void handleShare()}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="share-social-outline" size={18} color={colors.textPrimary} />
              </Pressable>

              {/* Full Details More Info */}
              <Pressable
                accessibilityLabel="Full details"
                accessibilityRole="button"
                onPress={handleOpenDetails}
                style={({ pressed }) => [
                  styles.circleActionBtn,
                  {
                    backgroundColor: colors.surfaceRaised,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  cardContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
    overflow: 'hidden',
    paddingBottom: 28,
  },
  imageHeader: {
    height: 180,
    position: 'relative',
    width: '100%',
  },
  backdropImage: {
    height: '100%',
    width: '100%',
  },
  imageDarkGradient: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    ...StyleSheet.absoluteFillObject,
  },
  closeCircleBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    top: 14,
    width: 32,
    zIndex: 10,
  },
  centerPlayCircle: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -28,
    marginTop: -28,
    position: 'absolute',
    top: '50%',
    width: 56,
    zIndex: 8,
  },
  bodyContent: {
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchText: {
    color: '#46D369',
    fontSize: 13,
    fontWeight: '900',
  },
  metaItem: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgePill: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  overviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  genrePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  genrePill: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  genrePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionButtonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryPlayBtn: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
  },
  primaryPlayBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '800',
  },
  circleActionBtn: {
    alignItems: 'center',
    borderRadius: 21,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
