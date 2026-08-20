import type {
  CalendarEventSummary,
  RecommendationSummary,
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
  onAddToWatchlist,
}: {
  recommendations?: RecommendationSummary[] | undefined;
  upcomingEvents?: CalendarEventSummary[] | undefined;
  onAddToWatchlist?: ((mediaId: string) => void) | undefined;
}) {
  const colors = useColors();
  const [activeFilter, setActiveFilter] = useState<WidgetFilter>('ALL');

  const handleSelectFilter = (filter: WidgetFilter) => {
    haptics.selection();
    setActiveFilter(filter);
  };

  const dailyPick = recommendations && recommendations.length > 0 ? recommendations[0] : undefined;

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
                style={[
                  styles.chipText,
                  { color: selected ? colors.onBrand : colors.textPrimary },
                ]}
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
          <ContinueWatchingWidget />
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
          <WatchlistShortcutWidget />
        )}

        {/* 4. Weekly Statistics Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'STATS') && (
          <WeeklyStatsWidget />
        )}

        {/* 5. Upcoming Release Countdown Widget */}
        {(activeFilter === 'ALL' || activeFilter === 'COUNTDOWN') && (
          <UpcomingCountdownWidget />
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
    gap: 8,
  },
  hubBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  hubBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionTitle: {
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
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  widgetsStack: {
    paddingHorizontal: 16,
    gap: 14,
  },
});
