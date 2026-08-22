import type { ActivityHeatmapDay } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';
import { haptics } from '../lib/haptics';

interface MonthlyViewingCalendarProps {
  days: ActivityHeatmapDay[];
  selectedDate: string | null;
  onSelectDate: (day: ActivityHeatmapDay | null, dateKey: string) => void;
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MonthlyViewingCalendar({
  days,
  selectedDate,
  onSelectDate,
}: MonthlyViewingCalendarProps) {
  const colors = useColors();

  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0..11

  // Day map for quick lookup
  const dayMap = useMemo(() => {
    const map = new Map<string, ActivityHeatmapDay>();
    for (const d of days) {
      map.set(d.date, d);
    }
    return map;
  }, [days]);

  // Calendar cells for current month
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekday = firstDay.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysInMonth = lastDay.getDate();

    const cells: Array<{
      dayNumber: number | null;
      dateKey: string;
      activity: ActivityHeatmapDay | null;
      isToday: boolean;
    }> = [];

    // Empty cells before start of month
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ dayNumber: null, dateKey: `empty-${i}`, activity: null, isToday: false });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const activity = dayMap.get(dateKey) ?? null;
      cells.push({
        dayNumber: day,
        dateKey,
        activity,
        isToday: dateKey === todayStr,
      });
    }

    return cells;
  }, [year, month, dayMap]);

  const handlePrevMonth = () => {
    haptics.selection();
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    haptics.selection();
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthLabel = currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' });

  // Calculate month viewing total
  const monthWatchCount = useMemo(() => {
    let count = 0;
    for (const cell of calendarGrid) {
      if (cell.activity) {
        count += cell.activity.count;
      }
    }
    return count;
  }, [calendarGrid]);

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Month Navigation Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>{monthLabel}</Text>
          <Text style={[styles.monthSubtitle, { color: colors.textSecondary }]}>
            {monthWatchCount} {monthWatchCount === 1 ? 'title watched' : 'titles watched'}
          </Text>
        </View>

        <View style={styles.navButtons}>
          <Pressable
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            onPress={handlePrevMonth}
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </Pressable>

          <Pressable
            accessibilityLabel="Next month"
            accessibilityRole="button"
            onPress={handleNextMonth}
            style={({ pressed }) => [
              styles.navBtn,
              { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {/* Weekday Header */}
      <View style={styles.weekdayRow}>
        {WEEKDAY_NAMES.map((name) => (
          <Text key={name} style={[styles.weekdayHeader, { color: colors.textDisabled }]}>
            {name}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.grid}>
        {calendarGrid.map((cell) => {
          if (cell.dayNumber === null) {
            return <View key={cell.dateKey} style={styles.emptyCell} />;
          }

          const hasWatches = cell.activity !== null && cell.activity.count > 0;
          const isSelected = cell.dateKey === selectedDate;

          return (
            <Pressable
              accessibilityRole="button"
              key={cell.dateKey}
              onPress={() => {
                haptics.selection();
                onSelectDate(cell.activity, cell.dateKey);
              }}
              style={({ pressed }) => [
                styles.dayCell,
                {
                  backgroundColor: isSelected
                    ? 'rgba(16, 185, 129, 0.18)'
                    : cell.isToday
                      ? colors.surfaceRaised
                      : 'transparent',
                  borderColor: isSelected ? '#10B981' : cell.isToday ? colors.brand : 'transparent',
                  borderWidth: isSelected || cell.isToday ? 1.5 : 0,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  {
                    color: isSelected
                      ? '#10B981'
                      : cell.isToday
                        ? colors.brand
                        : colors.textPrimary,
                    fontWeight: isSelected || cell.isToday || hasWatches ? '800' : '500',
                  },
                ]}
              >
                {cell.dayNumber}
              </Text>

              {/* Watch marker indicator dot or count badge */}
              {hasWatches ? (
                <View
                  style={[
                    styles.watchDot,
                    {
                      backgroundColor: cell.activity!.count >= 3 ? '#F59E0B' : '#10B981',
                    },
                  ]}
                >
                  {cell.activity!.count > 1 ? (
                    <Text style={styles.dotCount}>{cell.activity!.count}</Text>
                  ) : null}
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  monthSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    alignItems: 'center',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 4,
  },
  weekdayHeader: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    width: 38,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: 8,
  },
  emptyCell: {
    height: 38,
    width: 38,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    position: 'relative',
    width: 38,
  },
  dayNumber: {
    fontSize: 13,
  },
  watchDot: {
    alignItems: 'center',
    borderRadius: 5,
    bottom: 3,
    height: 6,
    justifyContent: 'center',
    minWidth: 6,
    position: 'absolute',
  },
  dotCount: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    paddingHorizontal: 2,
  },
});
