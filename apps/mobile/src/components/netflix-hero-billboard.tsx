import type { RecommendationSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { PosterImage, useColors } from './ui';

interface NetflixHeroBillboardProps {
  featured: RecommendationSummary;
  onAddToWatchlist?: () => void;
  isInWatchlist?: boolean;
}

export function NetflixHeroBillboard({
  featured,
  onAddToWatchlist,
  isInWatchlist = false,
}: NetflixHeroBillboardProps) {
  const colors = useColors();
  const media = featured.media;

  const resonancePercent = Math.min(99, Math.max(88, Math.round(featured.score * 100)));
  const releaseYear = media.releaseYear ? String(media.releaseYear) : '';
  const runtimeLabel = media.runtimeMinutes
    ? `${Math.floor(media.runtimeMinutes / 60)}h ${media.runtimeMinutes % 60}m`
    : '';

  return (
    <View style={styles.billboardContainer}>
      {/* Cinematic Ambient Backdrop with Double-Layered Vignette */}
      <View style={styles.imageWrapper}>
        <Image
          source={{
            uri:
              media.backdropUrl ||
              media.posterUrl ||
              'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&q=80',
          }}
          style={styles.backdropImage}
          resizeMode="cover"
        />

        {/* Ambient Darkened Gradient Vignettes */}
        <View style={styles.topCurtain} />
        <View style={[styles.bottomFog, { backgroundColor: colors.background }]} />
      </View>

      {/* Floating Glassmorphic Spotlight Pedestal */}
      <View style={styles.contentOverlay}>
        {/* CineWrapped Curator Spotlight Badge */}
        <View style={styles.spotlightBadgeRow}>
          <View style={styles.curatorPill}>
            <Ionicons name="sparkles" size={12} color="#F59E0B" />
            <Text style={styles.curatorPillText}>CINEWRAPPED SPOTLIGHT</Text>
          </View>
          <View style={styles.resonancePill}>
            <Text style={styles.resonanceText}>🎯 {resonancePercent}% Resonance</Text>
          </View>
        </View>

        {/* Main Title & Floating Mini Poster Card */}
        <View style={styles.headlineRow}>
          <View style={styles.titleInfoWrap}>
            <Text numberOfLines={2} style={styles.titleText}>
              {media.title}
            </Text>

            {/* Film Spec Badges: Year, Runtime, Format, Rating */}
            <View style={styles.specsRow}>
              {releaseYear ? (
                <View style={styles.specItem}>
                  <Text style={styles.specText}>{releaseYear}</Text>
                </View>
              ) : null}
              {runtimeLabel ? (
                <View style={styles.specItem}>
                  <Text style={styles.specText}>⏱️ {runtimeLabel}</Text>
                </View>
              ) : null}
              <View style={styles.specItem}>
                <Text style={styles.specText}>
                  {media.mediaType === 'MOVIE' ? 'Feature Film' : 'Series'}
                </Text>
              </View>
              {media.averageProviderRating !== null ? (
                <View style={[styles.specItem, styles.goldRatingItem]}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.goldRatingText}>
                    {media.averageProviderRating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Floating Key Art Mini Poster with Glass Shadow */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.selection();
              router.push(`/media/${media.id}`);
            }}
            style={styles.miniPosterCard}
          >
            <PosterImage uri={media.posterUrl} size="fill" rounded={10} />
          </Pressable>
        </View>

        {/* Overview Excerpt */}
        {media.overview ? (
          <Text numberOfLines={2} style={styles.synopsisText}>
            {media.overview}
          </Text>
        ) : null}

        {/* Bespoke CineWrapped Glass Action Suite */}
        <View style={styles.actionSuiteRow}>
          {/* Primary Action: CineWrapped Brand Gradient Log / Plan Button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.clapperSnap();
              router.push({
                pathname: '/calendar',
                params: { eventType: 'WATCH_PLAN', mediaId: media.id, title: media.title },
              });
            }}
            style={({ pressed }) => [
              styles.primaryScreeningBtn,
              { opacity: pressed ? 0.88 : 1 },
            ]}
          >
            <Ionicons name="calendar-outline" size={17} color="#000000" />
            <Text style={styles.primaryBtnText}>Plan Screening</Text>
          </Pressable>

          {/* Secondary Watchlist Capsule */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.heartReact();
              if (onAddToWatchlist) onAddToWatchlist();
            }}
            style={({ pressed }) => [
              styles.glassCapsuleBtn,
              isInWatchlist && styles.glassCapsuleBtnActive,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons
              name={isInWatchlist ? 'checkmark-circle' : 'add'}
              size={18}
              color={isInWatchlist ? '#10B981' : '#FFFFFF'}
            />
            <Text
              style={[
                styles.glassCapsuleText,
                isInWatchlist && { color: '#10B981' },
              ]}
            >
              {isInWatchlist ? 'Listed' : 'Watchlist'}
            </Text>
          </Pressable>

          {/* Details Button */}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptics.selection();
              router.push(`/media/${media.id}`);
            }}
            style={({ pressed }) => [
              styles.glassIconBtn,
              { opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="information" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  billboardContainer: {
    height: 430,
    marginBottom: 8,
    position: 'relative',
    width: '100%',
  },
  imageWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropImage: {
    height: '100%',
    width: '100%',
  },
  topCurtain: {
    backgroundColor: 'rgba(10, 10, 15, 0.45)',
    height: 90,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  bottomFog: {
    bottom: 0,
    height: 220,
    left: 0,
    opacity: 0.98,
    position: 'absolute',
    right: 0,
  },
  contentOverlay: {
    bottom: 8,
    gap: 10,
    left: 0,
    paddingHorizontal: 16,
    position: 'absolute',
    right: 0,
  },
  spotlightBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  curatorPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  curatorPillText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  resonancePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resonanceText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  headlineRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  titleInfoWrap: {
    flex: 1,
    gap: 6,
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  specsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  specItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  specText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '700',
  },
  goldRatingItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
  },
  goldRatingText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  miniPosterCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    elevation: 8,
    height: 90,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    width: 60,
  },
  synopsisText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    lineHeight: 16,
  },
  actionSuiteRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryScreeningBtn: {
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 10,
    flex: 1.4,
    flexDirection: 'row',
    gap: 7,
    height: 42,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  glassCapsuleBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1.1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
  },
  glassCapsuleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  glassCapsuleText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  glassIconBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
});
