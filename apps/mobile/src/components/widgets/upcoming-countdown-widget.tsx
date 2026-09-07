import type { CalendarEventSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import { useColors } from '../ui';
import { CalendarSyncModal } from '../calendar-sync-modal';
import { haptics } from '../../lib/haptics';

export interface CountdownReleaseInfo {
  id: string;
  title: string;
  releaseDate: string; // ISO string
  format: string; // 'IMAX 70mm', 'Theatrical', 'VOD Premiere'
  posterUrl: string | null;
  backdropUrl: string | null;
  synopsis?: string | null;
  mediaId?: string;
}

function getTimeRemaining(targetDateIso: string) {
  const total = Date.parse(targetDateIso) - Date.now();
  if (total <= 0) {
    return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

export function UpcomingCountdownWidget({
  release,
}: {
  release?: CountdownReleaseInfo | undefined;
}) {
  const colors = useColors();
  const releaseDate = release?.releaseDate ?? new Date(0).toISOString();
  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(releaseDate));
  const [syncModalVisible, setSyncModalVisible] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(releaseDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [releaseDate]);

  if (release === undefined) return null;

  const handleOpenMedia = () => {
    haptics.selection();
    if (release.mediaId) {
      router.push(`/media/${release.mediaId}`);
    } else {
      router.push('/calendar');
    }
  };

  const handleOpenSync = (event: GestureResponderEvent) => {
    event.stopPropagation();
    haptics.selection();
    setSyncModalVisible(true);
  };

  const eventForModal: CalendarEventSummary = {
    id: release.id,
    media: {
      id: release.mediaId ?? 'm-1',
      provider: 'TMDB',
      externalId: 'ext-1',
      mediaType: 'MOVIE',
      title: release.title,
      overview: release.synopsis ?? null,
      runtimeMinutes: 138,
      releaseYear: 2026,
      posterUrl: release.posterUrl,
      backdropUrl: release.backdropUrl,
      genreIds: ['g-scifi', 'g-drama'],
      averageProviderRating: 8.4,
    },
    eventType: 'RELEASE_REMINDER',
    status: 'SCHEDULED',
    title: `${release.title} Premiere`,
    notes: `${release.format} Premiere - Synced via CineWrapped`,
    startsAt: release.releaseDate,
    timezone: 'UTC',
    durationMinutes: 150,
    reminderMinutes: [60, 1440],
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Upcoming release countdown for ${release.title}`}
        onPress={handleOpenMedia}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        {/* Visual Poster Banner */}
        <View style={styles.bannerContainer}>
          {release.backdropUrl !== null ? (
            <Image
              source={{ uri: release.backdropUrl }}
              style={styles.backdropImage}
              resizeMode="cover"
            />
          ) : null}
          <View style={styles.overlay} />

          {/* Top Format & Status Tags */}
          <View style={styles.topRow}>
            <View style={styles.countdownBadge}>
              <Ionicons name="timer-outline" size={13} color="#FFD700" />
              <Text style={styles.countdownBadgeText}>UPCOMING RELEASE COUNTDOWN</Text>
            </View>

            <View style={styles.formatPill}>
              <Text style={styles.formatPillText}>{release.format}</Text>
            </View>
          </View>

          {/* Center Info with Title */}
          <View style={styles.centerInfo}>
            <Text style={styles.releaseTitle} numberOfLines={1}>
              {release.title}
            </Text>
            <Text style={styles.releaseDateText}>
              Premiere Date:{' '}
              {new Date(release.releaseDate).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          </View>
        </View>

        {/* Live Countdown Blocks Grid */}
        <View style={[styles.timerSection, { backgroundColor: colors.surface }]}>
          <View style={styles.timerGrid}>
            <View
              style={[
                styles.timeBox,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {String(timeLeft.days).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>DAYS</Text>
            </View>

            <Text style={[styles.colonText, { color: colors.textSecondary }]}>:</Text>

            <View
              style={[
                styles.timeBox,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {String(timeLeft.hours).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>HOURS</Text>
            </View>

            <Text style={[styles.colonText, { color: colors.textSecondary }]}>:</Text>

            <View
              style={[
                styles.timeBox,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.timeValue, { color: colors.textPrimary }]}>
                {String(timeLeft.minutes).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>MINS</Text>
            </View>

            <Text style={[styles.colonText, { color: colors.textSecondary }]}>:</Text>

            <View
              style={[
                styles.timeBox,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.timeValue, { color: colors.brand }]}>
                {String(timeLeft.seconds).padStart(2, '0')}
              </Text>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>SECS</Text>
            </View>
          </View>

          {/* Sync Button */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sync premiere to calendar"
            onPress={handleOpenSync}
            style={({ pressed }) => [
              styles.syncButton,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.brand} />
            <Text style={[styles.syncButtonText, { color: colors.brand }]}>Sync to Calendar</Text>
          </Pressable>
        </View>
      </Pressable>

      {/* 1-Tap Google / Apple Calendar Sync Modal */}
      <CalendarSyncModal
        visible={syncModalVisible}
        onClose={() => setSyncModalVisible(false)}
        event={eventForModal}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  bannerContainer: {
    height: 130,
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    padding: 12,
  },
  backdropImage: {
    ...StyleSheet.absoluteFill,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 10, 15, 0.65)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 0.5,
    borderColor: '#FFD700',
  },
  countdownBadgeText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  formatPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatPillText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  centerInfo: {
    gap: 2,
  },
  releaseTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  releaseDateText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    fontWeight: '600',
  },
  timerSection: {
    padding: 14,
    gap: 12,
  },
  timerGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  colonText: {
    fontSize: 16,
    fontWeight: '900',
    paddingHorizontal: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
