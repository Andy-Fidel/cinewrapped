import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../ui';
import { haptics } from '../../lib/haptics';

export interface WeeklyStatsData {
  filmsCount: number;
  runtimeMinutes: number;
  currentStreakDays: number;
  topVibe: string;
  dailyActivity: { day: string; watched: boolean; minutes: number }[];
}

const DEFAULT_WEEKLY_STATS: WeeklyStatsData = {
  filmsCount: 5,
  runtimeMinutes: 624, // ~10.4 hours
  currentStreakDays: 6,
  topVibe: '🤯 Mind-Bending',
  dailyActivity: [
    { day: 'M', watched: true, minutes: 120 },
    { day: 'T', watched: true, minutes: 140 },
    { day: 'W', watched: false, minutes: 0 },
    { day: 'T', watched: true, minutes: 110 },
    { day: 'F', watched: true, minutes: 154 },
    { day: 'S', watched: true, minutes: 100 },
    { day: 'S', watched: false, minutes: 0 },
  ],
};

export function WeeklyStatsWidget({
  stats = DEFAULT_WEEKLY_STATS,
}: {
  stats?: WeeklyStatsData;
}) {
  const colors = useColors();

  const hours = (stats.runtimeMinutes / 60).toFixed(1);

  const handleOpenInsights = () => {
    haptics.selection();
    router.push('/insights');
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Weekly statistics: view full insights"
      onPress={handleOpenInsights}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="stats-chart" size={16} color="#EF4444" />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly Statistics</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your 7-day cinephile rhythm
            </Text>
          </View>
        </View>

        <View style={styles.viewInsightsPill}>
          <Text style={[styles.viewInsightsText, { color: colors.brand }]}>Insights</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.brand} />
        </View>
      </View>

      {/* 4-Stat Metric Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{stats.filmsCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>FILMS LOGGED</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: colors.brand }]}>{hours}h</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>SCREEN TIME</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>🔥 {stats.currentStreakDays}d</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>ACTIVE STREAK</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Text style={[styles.statValueVibe, { color: colors.textPrimary }]} numberOfLines={1}>
            {stats.topVibe.split(' ')[0]}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>TOP VIBE</Text>
        </View>
      </View>

      {/* Weekly Activity Bar Visualization */}
      <View style={[styles.activitySection, { borderTopColor: colors.border }]}>
        <Text style={[styles.activityHeading, { color: colors.textSecondary }]}>
          DAILY WATCH ACTIVITY
        </Text>

        <View style={styles.daysRow}>
          {stats.dailyActivity.map((item, idx) => (
            <View key={idx} style={styles.dayCol}>
              <View
                style={[
                  styles.dayBar,
                  {
                    backgroundColor: item.watched ? colors.brand : colors.surfaceRaised,
                    height: item.watched ? 24 : 10,
                  },
                ]}
              />
              <Text
                style={[
                  styles.dayLabel,
                  { color: item.watched ? colors.textPrimary : colors.textSecondary },
                ]}
              >
                {item.day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewInsightsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewInsightsText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  statValueVibe: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activitySection: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  activityHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dayCol: {
    alignItems: 'center',
    gap: 6,
  },
  dayBar: {
    width: 14,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
