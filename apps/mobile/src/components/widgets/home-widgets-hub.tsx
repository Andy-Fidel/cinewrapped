import type {
  CalendarEventSummary,
  LibraryItem,
  RecommendationSummary,
  StatisticsSummary,
  WatchlistDetails,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../ui';
import { ContinueWatchingWidget } from './continue-watching-widget';
import { DailyRecommendationWidget } from './daily-recommendation-widget';
import { UpcomingCountdownWidget } from './upcoming-countdown-widget';
import { WatchlistShortcutWidget } from './watchlist-shortcut-widget';
import { WeeklyStatsWidget } from './weekly-stats-widget';
import { haptics } from '../../lib/haptics';

type WidgetFilter = 'ALL' | 'CONTINUE' | 'DAILY' | 'WATCHLIST' | 'STATS' | 'COUNTDOWN';

const FILTER_CHIPS: { key: WidgetFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'All Widgets', icon: 'grid-outline' },
  { key: 'CONTINUE', label: 'Continue Watching', icon: 'play-circle-outline' },
  { key: 'DAILY', label: 'Daily Pick', icon: 'sparkles-outline' },
  { key: 'WATCHLIST', label: 'Watchlist', icon: 'bookmark-outline' },
  { key: 'STATS', label: 'Weekly Stats', icon: 'stats-chart-outline' },
  { key: 'COUNTDOWN', label: 'Countdown', icon: 'timer-outline' },
];

export function HomeWidgetsHub({
  recommendations,
  upcomingEvents,
  continueWatching,
  defaultWatchlist,
  weeklyStatistics,
  weeklyActivity,
  onAddToWatchlist,
  onFinishWatching,
}: {
  recommendations?: RecommendationSummary[] | undefined;
  upcomingEvents?: CalendarEventSummary[] | undefined;
  continueWatching?: LibraryItem | undefined;
  defaultWatchlist?: WatchlistDetails | undefined;
  weeklyStatistics?: StatisticsSummary | undefined;
  weeklyActivity?: Array<{ date: string; count: number; minutesWatched: number }> | undefined;
  onAddToWatchlist?: ((mediaId: string) => void) | undefined;
  onFinishWatching?: ((mediaId: string) => void) | undefined;
}) {
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState<WidgetFilter>('ALL');

  const handleSelectFilter = (filter: WidgetFilter) => {
    haptics.selection();
    setActiveFilter(filter);
  };

  const dailyPick = recommendations && recommendations.length > 0 ? recommendations[0] : undefined;
  const upcoming = upcomingEvents?.find((event) => event.media !== null);
  const continueItem =
    continueWatching === undefined
      ? undefined
      : {
          id: continueWatching.media.id,
          media: continueWatching.media,
          progressPercent: continueWatching.progressPercent,
          lastWatchedAt: continueWatching.lastWatchedAt ?? continueWatching.updatedAt,
        };
  const watchlistItems = defaultWatchlist?.items.slice(0, 4).map((item) => ({
    id: item.id,
    media: item.media,
    addedAt: item.createdAt,
  }));
  const weeklyStats =
    weeklyStatistics === undefined || weeklyActivity === undefined
      ? undefined
      : {
          filmsCount: weeklyStatistics.viewingCount,
          runtimeMinutes: weeklyStatistics.totalMinutes,
          currentStreakDays: weeklyStatistics.longestStreakDays,
          topVibe: weeklyStatistics.topGenres[0]?.label ?? 'Your week',
          dailyActivity: weeklyActivity.map((day) => ({
            day: new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: 'narrow',
            }),
            watched: day.count > 0,
            minutes: day.minutesWatched,
          })),
        };
  const upcomingRelease =
    upcoming?.media === null || upcoming?.media === undefined
      ? undefined
      : {
          id: upcoming.id,
          title: upcoming.title,
          releaseDate: upcoming.startsAt,
          format: upcoming.eventType === 'RELEASE_REMINDER' ? 'Release reminder' : 'Watch plan',
          posterUrl: upcoming.media.posterUrl,
          backdropUrl: upcoming.media.backdropUrl,
          ...((upcoming.notes ?? upcoming.media.overview) === null
            ? {}
            : { synopsis: upcoming.notes ?? upcoming.media.overview }),
          mediaId: upcoming.media.id,
        };

  return (
    <View style={styles.container}>
      {/* Widget Hub Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.hubBadge, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="apps" size={14} color={colors.brand} />
            <Text style={[styles.hubBadgeText, { color: colors.brand }]}>WIDGETS</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Home Command Dashboard
          </Text>
        </View>
      </View>

      {/* Filter Chips Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {FILTER_CHIPS.map((chip) => {
          const selected = activeFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => handleSelectFilter(chip.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? colors.brand : colors.surface,
                  borderColor: selected ? colors.brand : colors.border,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
            >
              <Ionicons
                name={chip.icon}
                size={14}
                color={selected ? colors.onBrand : colors.textPrimary}
              />
              <Text
                style={[styles.chipText, { color: selected ? colors.onBrand : colors.textPrimary }]}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Active Widgets Stack */}
      <View style={styles.widgetsStack}>
        {/* 1. Continue Watching Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'CONTINUE') && (
          <ContinueWatchingWidget
            item={continueItem}
            onFinish={(mediaId) => onFinishWatching?.(mediaId)}
          />
        )}

        {/* 2. Recommendation of the Day Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'DAILY') && (
          <DailyRecommendationWidget
            recommendation={dailyPick}
            onAddToWatchlist={onAddToWatchlist}
          />
        )}

        {/* 3. Watchlist Shortcut Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'WATCHLIST') && (
          <WatchlistShortcutWidget
            items={watchlistItems}
            totalCount={defaultWatchlist?.itemCount}
          />
        )}

        {/* 4. Weekly Statistics Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'STATS') && (
          <WeeklyStatsWidget stats={weeklyStats} />
        )}

        {/* 5. Upcoming Release Countdown Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'COUNTDOWN') && (
          <UpcomingCountdownWidget release={upcomingRelease} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 4,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  chipText: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '700',
  },
  widgetsStack: {
    paddingHorizontal: 16,
    gap: 14,
  },
});
