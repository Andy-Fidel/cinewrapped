import type { ActivityHeatmapDay, ActivityHeatmapSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from './ui';
import { haptics } from '../lib/haptics';

export type HeatmapPalette = 'EMERALD' | 'AMBER' | 'VIOLET' | 'CRIMSON' | 'CYAN';

interface AnnualHeatmapProps {
  data: ActivityHeatmapSummary;
  selectedDate: string | null;
  onSelectDate: (day: ActivityHeatmapDay) => void;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const PALETTE_CONFIGS: Record<
  HeatmapPalette,
  {
    name: string;
    icon: string;
    primary: string;
    t1: string;
    t2: string;
    t3: string;
    t4: string;
  }
> = {
  EMERALD: {
    name: 'Matrix',
    icon: '🌿',
    primary: '#10B981',
    t1: 'rgba(16, 185, 129, 0.35)',
    t2: 'rgba(16, 185, 129, 0.6)',
    t3: 'rgba(16, 185, 129, 0.85)',
    t4: '#10B981',
  },
  AMBER: {
    name: '35mm Gold',
    icon: '🎞️',
    primary: '#F59E0B',
    t1: 'rgba(245, 158, 11, 0.35)',
    t2: 'rgba(245, 158, 11, 0.6)',
    t3: 'rgba(245, 158, 11, 0.85)',
    t4: '#F59E0B',
  },
  VIOLET: {
    name: 'Cyberpunk',
    icon: '🔮',
    primary: '#8B5CF6',
    t1: 'rgba(139, 92, 246, 0.35)',
    t2: 'rgba(139, 92, 246, 0.6)',
    t3: 'rgba(139, 92, 246, 0.85)',
    t4: '#8B5CF6',
  },
  CRIMSON: {
    name: 'Criterion',
    icon: '🍷',
    primary: '#EF4444',
    t1: 'rgba(239, 68, 68, 0.35)',
    t2: 'rgba(239, 68, 68, 0.6)',
    t3: 'rgba(239, 68, 68, 0.85)',
    t4: '#EF4444',
  },
  CYAN: {
    name: 'IMAX Cyan',
    icon: '🌊',
    primary: '#06B6D4',
    t1: 'rgba(6, 182, 212, 0.35)',
    t2: 'rgba(6, 182, 212, 0.6)',
    t3: 'rgba(6, 182, 212, 0.85)',
    t4: '#06B6D4',
  },
};

export function AnnualHeatmap({ data, selectedDate, onSelectDate }: AnnualHeatmapProps) {
  const colors = useColors();
  const [activePalette, setActivePalette] = useState<HeatmapPalette>('EMERALD');

  const palette = PALETTE_CONFIGS[activePalette];

  // Organize the 365/366 days into columns of 7 days (weeks)
  const { weeks, monthHeaders } = useMemo(() => {
    const days = data.days;
    if (days.length === 0) return { weeks: [], monthHeaders: [] };

    const firstDate = new Date(`${days[0]!.date}T00:00:00.000Z`);
    const startWeekday = firstDate.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    const weekList: Array<Array<ActivityHeatmapDay | null>> = [];
    let currentWeek: Array<ActivityHeatmapDay | null> = Array(startWeekday).fill(null);

    const headers: Array<{ monthName: string; weekIndex: number }> = [];
    let lastMonth = -1;

    for (const day of days) {
      const d = new Date(`${day.date}T00:00:00.000Z`);
      const month = d.getUTCMonth();

      if (month !== lastMonth) {
        headers.push({ monthName: MONTH_NAMES[month] ?? '', weekIndex: weekList.length });
        lastMonth = month;
      }

      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weekList.push(currentWeek);
        currentWeek = [];
      }
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weekList.push(currentWeek);
    }

    return { weeks: weekList, monthHeaders: headers };
  }, [data.days]);

  const getCellColor = (day: ActivityHeatmapDay | null) => {
    if (!day || day.intensity === 0) return colors.surfaceRaised;
    switch (day.intensity) {
      case 1:
        return palette.t1;
      case 2:
        return palette.t2;
      case 3:
        return palette.t3;
      case 4:
        return palette.t4;
      default:
        return colors.surfaceRaised;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header with Title & Stats */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="grid" size={18} color={palette.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {data.year} Year in Pixels
          </Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {data.totalViewings} watches · {data.activeDaysCount} active days
        </Text>
      </View>

      {/* Chromatic Palette Selector Strip */}
      <View style={styles.paletteStrip}>
        {(Object.keys(PALETTE_CONFIGS) as HeatmapPalette[]).map((pKey) => {
          const p = PALETTE_CONFIGS[pKey];
          const isSelected = activePalette === pKey;
          return (
            <Pressable
              key={pKey}
              onPress={() => {
                haptics.selection();
                setActivePalette(pKey);
              }}
              style={[
                styles.paletteChip,
                {
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.08)' : colors.surfaceRaised,
                  borderColor: isSelected ? p.primary : 'transparent',
                  borderWidth: isSelected ? 1.5 : 0,
                },
              ]}
            >
              <View style={[styles.paletteDot, { backgroundColor: p.primary }]} />
              <Text
                style={[
                  styles.paletteName,
                  { color: isSelected ? colors.textPrimary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                ]}
              >
                {p.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* 52-Week Scrollable Matrix */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matrixScroll}>
        <View style={styles.matrixWrapper}>
          {/* Month Labels Header */}
          <View style={styles.monthRow}>
            {monthHeaders.map((m, idx) => (
              <Text
                key={idx}
                style={[
                  styles.monthLabel,
                  {
                    color: colors.textSecondary,
                    left: m.weekIndex * 15,
                  },
                ]}
              >
                {m.monthName}
              </Text>
            ))}
          </View>

          {/* Grid of Weeks */}
          <View style={styles.gridRow}>
            {/* Weekday indicators (Mon, Wed, Fri) */}
            <View style={styles.weekdayCol}>
              <Text style={[styles.weekdayLabel, { color: colors.textDisabled }]}>M</Text>
              <Text style={[styles.weekdayLabel, { color: colors.textDisabled }]}>W</Text>
              <Text style={[styles.weekdayLabel, { color: colors.textDisabled }]}>F</Text>
            </View>

            {weeks.map((week, wIdx) => (
              <View key={wIdx} style={styles.weekCol}>
                {week.map((day, dIdx) => {
                  const isSelected = day !== null && day.date === selectedDate;
                  return (
                    <Pressable
                      accessibilityRole="button"
                      disabled={day === null}
                      key={dIdx}
                      onPress={() => {
                        if (day) {
                          haptics.selection();
                          onSelectDate(day);
                        }
                      }}
                      style={({ pressed }) => [
                        styles.cell,
                        {
                          backgroundColor: getCellColor(day),
                          borderColor: isSelected ? palette.primary : 'transparent',
                          borderWidth: isSelected ? 1.5 : 0,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Heatmap Legend */}
      <View style={styles.legendRow}>
        <Text style={[styles.legendText, { color: colors.textSecondary }]}>Less</Text>
        <View style={[styles.legendCell, { backgroundColor: colors.surfaceRaised }]} />
        <View style={[styles.legendCell, { backgroundColor: palette.t1 }]} />
        <View style={[styles.legendCell, { backgroundColor: palette.t2 }]} />
        <View style={[styles.legendCell, { backgroundColor: palette.t3 }]} />
        <View style={[styles.legendCell, { backgroundColor: palette.t4 }]} />
        <Text style={[styles.legendText, { color: colors.textSecondary }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  paletteStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paletteChip: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paletteDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  paletteName: {
    fontSize: 11,
  },
  matrixScroll: {
    paddingVertical: 4,
  },
  matrixWrapper: {
    gap: 6,
  },
  monthRow: {
    height: 16,
    position: 'relative',
    width: 53 * 15,
  },
  monthLabel: {
    fontSize: 10,
    fontWeight: '700',
    position: 'absolute',
    top: 0,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 3,
  },
  weekdayCol: {
    gap: 12,
    justifyContent: 'space-between',
    marginRight: 4,
    paddingVertical: 2,
  },
  weekdayLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  weekCol: {
    gap: 3,
  },
  cell: {
    borderRadius: 3,
    height: 11,
    width: 11,
  },
  legendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  legendCell: {
    borderRadius: 2,
    height: 10,
    width: 10,
  },
});
