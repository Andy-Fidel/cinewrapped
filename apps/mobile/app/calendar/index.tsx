import type {
  ActivityHeatmapDay,
  ActivityHeatmapSummary,
  CalendarEventSummary,
  CalendarEventType,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnnualHeatmap } from '../../src/components/annual-heatmap';
import { FeatureGate } from '../../src/components/feature-gate';
import { MonthlyViewingCalendar } from '../../src/components/monthly-viewing-calendar';
import { PosterImage, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { nextClockTime, nextWeekdayTime } from '../../src/lib/calendar-dates';
import { errorMessage } from '../../src/lib/error-message';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

type CalendarMode = 'HISTORY' | 'PLANNER';
type FilterType = 'ALL' | 'WATCH_PLAN' | 'RELEASE_REMINDER';

interface QuickDateOption {
  label: string;
  sublabel: string;
  getDate: () => Date;
}

function getQuickDateOptions(now = new Date()): QuickDateOption[] {
  const tonight = nextClockTime(now, 20, 0);
  const friday = nextWeekdayTime(now, 5, 20, 30);
  const saturday = nextWeekdayTime(now, 6, 19, 0);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOffset = (date: Date) =>
    Math.round(
      (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() -
        startOfToday.getTime()) /
        86_400_000,
    );
  return [
    {
      label: tonight.getDate() === now.getDate() ? 'Tonight' : 'Tomorrow Night',
      sublabel: '8:00 PM',
      getDate: () => new Date(tonight),
    },
    {
      label: 'Tomorrow',
      sublabel: '8:00 PM',
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(20, 0, 0, 0);
        return d;
      },
    },
    {
      label: dayOffset(friday) >= 7 ? 'Next Friday' : 'This Friday',
      sublabel: '8:30 PM',
      getDate: () => new Date(friday),
    },
    {
      label: dayOffset(saturday) >= 7 ? 'Next Saturday' : 'This Saturday',
      sublabel: '7:00 PM',
      getDate: () => new Date(saturday),
    },
    {
      label: 'Next Week',
      sublabel: '8:00 PM',
      getDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        d.setHours(20, 0, 0, 0);
        return d;
      },
    },
  ];
}

function formatRelativeCountdown(dateStr: string): string | null {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays > 7 && diffDays <= 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  if (diffDays > 30) return `In ${Math.ceil(diffDays / 30)} months`;
  return null;
}

function formatEventTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatEventDate(dateStr: string): { dayName: string; dayNum: string; monthName: string } {
  const date = new Date(dateStr);
  return {
    dayName: date.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
    dayNum: String(date.getDate()),
    monthName: date.toLocaleDateString([], { month: 'short' }),
  };
}

export default function CalendarScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const { confirm, showError } = useDialog();
  const params = useLocalSearchParams<{
    eventType?: CalendarEventType;
    mediaId?: string;
    title?: string;
    mode?: CalendarMode;
  }>();

  // Mode switcher
  const [mode, setMode] = useState<CalendarMode>(params.title || params.mediaId ? 'PLANNER' : 'HISTORY');

  // Heatmap & Viewing History states
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [selectedDayActivity, setSelectedDayActivity] = useState<ActivityHeatmapDay | null>(null);
  const [annualGoal, setAnnualGoal] = useState<number>(100);

  // Form states
  const [isPlanningOpen, setIsPlanningOpen] = useState(Boolean(params.title || params.mediaId));
  const [title, setTitle] = useState(params.title ?? '');
  const [linkedMediaId, setLinkedMediaId] = useState<string | null>(params.mediaId ?? null);
  const [notes, setNotes] = useState('');
  const [selectedQuickDateIndex, setSelectedQuickDateIndex] = useState(0);
  const [eventType, setEventType] = useState<CalendarEventType>(
    params.eventType === 'RELEASE_REMINDER' ? 'RELEASE_REMINDER' : 'WATCH_PLAN',
  );
  const [reminderOption, setReminderOption] = useState<number>(60);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filtering states
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const quickDates = useMemo(() => getQuickDateOptions(), []);

  // 1-year window query for planner
  const range = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setFullYear(to.getFullYear() + 1);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const events = useQuery({
    queryKey: ['calendar', range.from, range.to],
    queryFn: () =>
      api.request<CalendarEventSummary[]>(
        `calendar?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
    enabled: session !== null,
  });

  // Query Heatmap Data
  const userTimezone = user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const heatmap = useQuery({
    queryKey: ['statistics', 'heatmap', selectedYear, userTimezone],
    queryFn: () =>
      api.request<ActivityHeatmapSummary>(
        `statistics/heatmap?year=${selectedYear}&timezone=${encodeURIComponent(userTimezone)}`,
      ),
    enabled: session !== null,
  });

  const create = useMutation({
    mutationFn: () => {
      const selectedOption = quickDates[selectedQuickDateIndex] ?? quickDates[0];
      const selectedDate = selectedOption ? selectedOption.getDate() : new Date();
      return api.request<CalendarEventSummary>('calendar', {
        method: 'POST',
        body: {
          eventType,
          mediaId: linkedMediaId,
          title: title.trim(),
          notes: notes.trim() || null,
          startsAt: selectedDate.toISOString(),
          timezone: user?.timezone ?? 'UTC',
          durationMinutes: 120,
          reminderMinutes: [reminderOption],
        },
      });
    },
    onSuccess: async () => {
      haptics.clapperSnap();
      setTitle('');
      setNotes('');
      setLinkedMediaId(null);
      setIsPlanningOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
    onError: (error) => showError('Could not schedule event', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => {
      haptics.selection();
      return api.request<{ id: string }>(`calendar/${id}`, { method: 'DELETE' });
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['calendar'] }),
    onError: (error) => showError('Could not remove event', errorMessage(error)),
  });

  // Export event to standard .ics file
  const handleExportIcs = async (event: CalendarEventSummary) => {
    try {
      haptics.selection();
      setExportingId(event.id);
      setExportError(null);
      const icsData = await api.requestText(`calendar/${event.id}/ics`);

      const filename = `cinewrapped-${event.id.slice(0, 8)}.ics`;
      const file = new File(Paths.cache, filename);
      file.create();
      file.write(icsData);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/calendar',
          dialogTitle: `Export ${event.title}`,
          UTI: 'com.apple.ical.ics',
        });
      } else {
        await Linking.openURL(`data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`);
      }
    } catch (err) {
      setExportError(errorMessage(err));
    } finally {
      setExportingId(null);
    }
  };

  // Filtered event list
  const filteredEvents = useMemo(() => {
    let list = events.data ?? [];
    if (activeFilter !== 'ALL') {
      list = list.filter((e) => e.eventType === activeFilter);
    }
    return list;
  }, [events.data, activeFilter]);

  // Annual Pace Calculation
  const paceStats = useMemo(() => {
    const totalViewings = heatmap.data?.totalViewings ?? 0;
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.max(1, Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)));
    const totalDays = ((now.getFullYear() % 4 === 0 && now.getFullYear() % 100 !== 0) || now.getFullYear() % 400 === 0) ? 366 : 365;

    const projectedTotal = Math.round((totalViewings / dayOfYear) * totalDays);
    const delta = projectedTotal - annualGoal;
    const progressPercent = Math.min(100, Math.round((totalViewings / annualGoal) * 100));

    return {
      projectedTotal,
      delta,
      progressPercent,
      isOnPace: delta >= 0,
    };
  }, [heatmap.data?.totalViewings, annualGoal]);

  const handleShareYearPixels = async () => {
    if (!heatmap.data) return;
    haptics.selection();
    const data = heatmap.data;
    await Share.share({
      message: `🎬 My ${data.year} Cinema Year in Pixels on CineWrapped!\n\n🍿 ${data.totalViewings} Movies & Episodes watched\n🔥 ${data.currentStreakDays}-day streak (Longest: ${data.longestStreakDays}d)\n👑 Peak Night: ${data.mostActiveWeekday.name}\n🌙 Persona: ${data.circadianRhythm.persona}\n\nTrack your cinema journey on CineWrapped!`,
    });
  };

  if (session === null) return <Redirect href="/(auth)/login" />;

  const heatmapData = heatmap.data;

  return (
    <FeatureGate feature="CALENDAR_INTEGRATION">
      <Screen>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Calendar & Heatmap',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
            headerRight: () =>
              mode === 'HISTORY' && heatmapData ? (
                <Pressable
                  accessibilityLabel="Share Year in Pixels"
                  accessibilityRole="button"
                  onPress={() => void handleShareYearPixels()}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                </Pressable>
              ) : null,
          }}
        />

        {/* Mode Switcher Tabs */}
        <View style={[styles.modeSwitcher, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
          <Pressable
            accessibilityRole="tab"
            onPress={() => {
              haptics.selection();
              setMode('HISTORY');
            }}
            style={[
              styles.modeTab,
              mode === 'HISTORY' && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
            ]}
          >
            <Ionicons
              name="calendar"
              size={16}
              color={mode === 'HISTORY' ? '#10B981' : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'HISTORY' ? colors.textPrimary : colors.textSecondary, fontWeight: mode === 'HISTORY' ? '800' : '600' },
              ]}
            >
              Viewing History
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="tab"
            onPress={() => {
              haptics.selection();
              setMode('PLANNER');
            }}
            style={[
              styles.modeTab,
              mode === 'PLANNER' && { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={16}
              color={mode === 'PLANNER' ? colors.brand : colors.textSecondary}
            />
            <Text
              style={[
                styles.modeTabText,
                { color: mode === 'PLANNER' ? colors.textPrimary : colors.textSecondary, fontWeight: mode === 'PLANNER' ? '800' : '600' },
              ]}
            >
              Watch Planner
            </Text>
          </Pressable>
        </View>

        {/* ---------------- MODE 1: VIEWING HISTORY & HEATMAP ---------------- */}
        {mode === 'HISTORY' ? (
          <View style={styles.historyContainer}>
            {heatmap.isPending ? (
              <View style={styles.centerBox}>
                <ActivityIndicator color="#10B981" />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                  Loading viewing history…
                </Text>
              </View>
            ) : heatmapData ? (
              <>
                {/* Streaks & Activity Stats Banner */}
                <View style={styles.statsGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                      <Ionicons name="flame" size={20} color="#EF4444" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {heatmapData.currentStreakDays}d
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      CURRENT STREAK
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                      <Ionicons name="flash" size={20} color="#F59E0B" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {heatmapData.longestStreakDays}d
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      LONGEST STREAK
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={[styles.statIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                      {heatmapData.activeDaysCount}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                      ACTIVE DAYS
                    </Text>
                  </View>
                </View>

                {/* Annual Pace & Goal Tracker Card */}
                <View style={[styles.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.goalHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="trophy" size={18} color="#F59E0B" />
                      <Text style={[styles.goalTitle, { color: colors.textPrimary }]}>
                        {selectedYear} Cinema Pace & Goal
                      </Text>
                    </View>
                    <View style={[styles.goalPaceBadge, { backgroundColor: paceStats.isOnPace ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                      <Text style={{ color: paceStats.isOnPace ? '#10B981' : '#F59E0B', fontSize: 11, fontWeight: '800' }}>
                        {paceStats.isOnPace ? `🔥 +${paceStats.delta} Ahead of Pace` : `🎯 ${Math.abs(paceStats.delta)} to Catch Pace`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.goalProgressRow}>
                    <View style={[styles.goalTrack, { backgroundColor: colors.surfaceRaised }]}>
                      <View style={[styles.goalFill, { width: `${paceStats.progressPercent}%`, backgroundColor: colors.brand }]} />
                    </View>
                    <Text style={[styles.goalProgressText, { color: colors.textPrimary }]}>
                      {heatmapData.totalViewings} / {annualGoal}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    On pace to finish with <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{paceStats.projectedTotal} films</Text> by December 31.
                  </Text>
                </View>

                {/* GitHub-style Annual Heatmap with Chromatic Palettes */}
                <AnnualHeatmap
                  data={heatmapData}
                  onSelectDate={(day) => {
                    setSelectedDayKey(day.date);
                    setSelectedDayActivity(day);
                  }}
                  selectedDate={selectedDayKey}
                />

                {/* Circadian Cinema Clock (24-Hour Viewing Rhythm) */}
                <View style={[styles.circadianCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.circadianHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="time" size={18} color="#8B5CF6" />
                      <Text style={[styles.circadianTitle, { color: colors.textPrimary }]}>
                        Circadian Cinema Clock
                      </Text>
                    </View>
                    <View style={[styles.personaBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                      <Text style={styles.personaBadgeText}>
                        🎭 {heatmapData.circadianRhythm.persona}
                      </Text>
                    </View>
                  </View>

                  {/* 4 Quadrants Time-of-Day Bar */}
                  <View style={styles.quadrantBarsWrap}>
                    <View style={[styles.quadrantTrack, { backgroundColor: colors.surfaceRaised }]}>
                      {heatmapData.circadianRhythm.morningPercent > 0 ? (
                        <View style={[styles.quadrantSegment, { width: `${heatmapData.circadianRhythm.morningPercent}%`, backgroundColor: '#F59E0B' }]} />
                      ) : null}
                      {heatmapData.circadianRhythm.afternoonPercent > 0 ? (
                        <View style={[styles.quadrantSegment, { width: `${heatmapData.circadianRhythm.afternoonPercent}%`, backgroundColor: '#06B6D4' }]} />
                      ) : null}
                      {heatmapData.circadianRhythm.eveningPercent > 0 ? (
                        <View style={[styles.quadrantSegment, { width: `${heatmapData.circadianRhythm.eveningPercent}%`, backgroundColor: '#8B5CF6' }]} />
                      ) : null}
                      {heatmapData.circadianRhythm.nightPercent > 0 ? (
                        <View style={[styles.quadrantSegment, { width: `${heatmapData.circadianRhythm.nightPercent}%`, backgroundColor: '#EC4899' }]} />
                      ) : null}
                    </View>

                    {/* Quadrant Legend */}
                    <View style={styles.quadrantLegendRow}>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                          Morning ({heatmapData.circadianRhythm.morningPercent}%)
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#06B6D4' }]} />
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                          Matinee ({heatmapData.circadianRhythm.afternoonPercent}%)
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                          Evening ({heatmapData.circadianRhythm.eveningPercent}%)
                        </Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
                        <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
                          Night ({heatmapData.circadianRhythm.nightPercent}%)
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Interactive Monthly Calendar */}
                <MonthlyViewingCalendar
                  days={heatmapData.days}
                  onSelectDate={(day, dateKey) => {
                    setSelectedDayKey(dateKey);
                    setSelectedDayActivity(day);
                  }}
                  selectedDate={selectedDayKey}
                />

                {/* Most Active Weekdays Breakdown */}
                <View style={[styles.weekdayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.weekdayHeaderRow}>
                    <View style={styles.weekdayTitleWrap}>
                      <Ionicons name="stats-chart" size={18} color="#10B981" />
                      <Text style={[styles.weekdayTitle, { color: colors.textPrimary }]}>
                        Most Active Weekdays
                      </Text>
                    </View>
                    <View style={[styles.peakBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={styles.peakBadgeText}>
                        👑 Peak: {heatmapData.mostActiveWeekday.name}
                      </Text>
                    </View>
                  </View>

                  {/* Weekday Bars */}
                  <View style={styles.weekdayBarsList}>
                    {heatmapData.weekdayDistribution.map((item: ActivityHeatmapSummary['weekdayDistribution'][number]) => {
                      const isPeak = item.fullDay === heatmapData.mostActiveWeekday.name && item.count > 0;
                      return (
                        <View key={item.day} style={styles.weekdayBarRow}>
                          <Text style={[styles.dayLabel, { color: isPeak ? '#10B981' : colors.textSecondary }]}>
                            {item.day}
                          </Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.surfaceRaised }]}>
                            <View
                              style={[
                                styles.barFill,
                                {
                                  width: `${Math.max(item.percent, item.count > 0 ? 8 : 0)}%`,
                                  backgroundColor: isPeak ? '#10B981' : colors.brand,
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.barCount, { color: isPeak ? colors.textPrimary : colors.textSecondary }]}>
                            {item.count} ({item.percent}%)
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Selected Day Log Drawer with Retroactive 1-Tap Quick Logger */}
                {selectedDayKey ? (
                  <View
                    style={[
                      styles.selectedLogCard,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.selectedLogHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="film" size={18} color="#10B981" />
                        <Text style={[styles.selectedLogTitle, { color: colors.textPrimary }]}>
                          Log for {new Date(`${selectedDayKey}T00:00:00.000Z`).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}
                        </Text>
                      </View>
                      <Pressable onPress={() => {
                        setSelectedDayKey(null);
                        setSelectedDayActivity(null);
                      }}>
                        <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                      </Pressable>
                    </View>

                    {selectedDayActivity && selectedDayActivity.viewings.length > 0 ? (
                      <View style={styles.viewingsList}>
                        {selectedDayActivity.viewings.map((v: ActivityHeatmapDay['viewings'][number]) => (
                          <Pressable
                            accessibilityRole="button"
                            key={v.id}
                            onPress={() => router.push(`/media/${v.mediaId}`)}
                            style={({ pressed }) => [
                              styles.viewingItem,
                              { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.8 : 1 },
                            ]}
                          >
                            <View style={styles.viewingPosterWrap}>
                              <PosterImage uri={v.posterUrl} size="fill" rounded={8} />
                            </View>
                            <View style={{ flex: 1, gap: 4 }}>
                              <Text numberOfLines={1} style={[styles.viewingTitle, { color: colors.textPrimary }]}>
                                {v.title}
                              </Text>
                              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                {v.mediaType === 'MOVIE' ? 'Movie' : 'TV Episode'} · Watched at {formatEventTime(v.watchedAt)}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                          </Pressable>
                        ))}
                      </View>
                    ) : (
                      /* Retroactive Quick Logger Callout for Empty Past Day */
                      <View style={styles.emptyDayLogWrap}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                          No screenings logged on this day.
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            haptics.selection();
                            router.push('/(tabs)/discover');
                          }}
                          style={({ pressed }) => [
                            styles.retroLogBtn,
                            { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
                          ]}
                        >
                          <Ionicons name="add-circle" size={16} color={colors.onBrand} />
                          <Text style={[styles.retroLogBtnText, { color: colors.onBrand }]}>
                            Log a Movie for this Day
                          </Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : (
          /* ---------------- MODE 2: WATCH PLANNER & SCHEDULING ---------------- */
          <View style={styles.plannerContainer}>
            {/* Quick Action Button to Open Add Form */}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                haptics.selection();
                setIsPlanningOpen(!isPlanningOpen);
              }}
              style={({ pressed }) => [
                styles.addPlanButton,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons
                name={isPlanningOpen ? 'close' : 'add'}
                size={20}
                color={colors.onBrand}
              />
              <Text style={[styles.addPlanText, { color: colors.onBrand }]}>
                {isPlanningOpen ? 'Close Scheduler' : 'Schedule Movie Night'}
              </Text>
            </Pressable>

            {/* Quick Scheduler Form Card */}
            {isPlanningOpen ? (
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.formTitle, { color: colors.textPrimary }]}>
                  {linkedMediaId ? 'Schedule Watch Plan' : 'Add Custom Reminder'}
                </Text>

                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>TITLE</Text>
                  <TextInput
                    placeholder="Film or event title…"
                    placeholderTextColor={colors.textDisabled}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceRaised,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                      },
                    ]}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                {/* Quick Date Shortcuts */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>WHEN</Text>
                  <View style={styles.quickDateRow}>
                    {quickDates.map((opt, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => {
                          haptics.selection();
                          setSelectedQuickDateIndex(idx);
                        }}
                        style={[
                          styles.quickDateChip,
                          {
                            backgroundColor:
                              selectedQuickDateIndex === idx
                                ? colors.brand
                                : colors.surfaceRaised,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.quickDateLabel,
                            {
                              color:
                                selectedQuickDateIndex === idx
                                  ? colors.onBrand
                                  : colors.textPrimary,
                            },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text
                          style={[
                            styles.quickDateSublabel,
                            {
                              color:
                                selectedQuickDateIndex === idx
                                  ? colors.onBrand
                                  : colors.textSecondary,
                            },
                          ]}
                        >
                          {opt.sublabel}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Notes Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, { color: colors.textSecondary }]}>
                    NOTES (OPTIONAL)
                  </Text>
                  <TextInput
                    placeholder="E.g. popcorn, watch with Alex…"
                    placeholderTextColor={colors.textDisabled}
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.surfaceRaised,
                        color: colors.textPrimary,
                        borderColor: colors.border,
                      },
                    ]}
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>

                {/* Submit Button */}
                <Pressable
                  accessibilityRole="button"
                  disabled={!title.trim() || create.isPending}
                  onPress={() => create.mutate()}
                  style={({ pressed }) => [
                    styles.submitButton,
                    {
                      backgroundColor: colors.brand,
                      opacity: pressed || !title.trim() || create.isPending ? 0.7 : 1,
                    },
                  ]}
                >
                  {create.isPending ? (
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <Text style={[styles.submitText, { color: colors.onBrand }]}>
                      Confirm Plan
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {(['ALL', 'WATCH_PLAN', 'RELEASE_REMINDER'] as FilterType[]).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => {
                    haptics.selection();
                    setActiveFilter(f);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        activeFilter === f ? colors.brand : colors.surfaceRaised,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color:
                          activeFilter === f ? colors.onBrand : colors.textSecondary,
                        fontWeight: activeFilter === f ? '700' : '500',
                      },
                    ]}
                  >
                    {f === 'ALL'
                      ? 'All'
                      : f === 'WATCH_PLAN'
                        ? 'Watch Plans'
                        : 'Release Reminders'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Upcoming Event Cards */}
            <View style={styles.eventsList}>
              {filteredEvents.map((event) => {
                const dateInfo = formatEventDate(event.startsAt);
                const countdown = formatRelativeCountdown(event.startsAt);

                return (
                  <View
                    key={event.id}
                    style={[
                      styles.eventCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.eventDateBox,
                        { backgroundColor: colors.surfaceRaised },
                      ]}
                    >
                      <Text style={[styles.eventDayName, { color: colors.brand }]}>
                        {dateInfo.dayName}
                      </Text>
                      <Text style={[styles.eventDayNum, { color: colors.textPrimary }]}>
                        {dateInfo.dayNum}
                      </Text>
                      <Text style={[styles.eventMonthName, { color: colors.textSecondary }]}>
                        {dateInfo.monthName}
                      </Text>
                    </View>

                    <View style={styles.eventInfo}>
                      <View style={styles.eventHeaderRow}>
                        <Text
                          numberOfLines={1}
                          style={[styles.eventTitle, { color: colors.textPrimary }]}
                        >
                          {event.title}
                        </Text>
                      </View>

                      <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                        🕒 {formatEventTime(event.startsAt)}
                        {countdown ? ` · ${countdown}` : ''}
                      </Text>

                      {event.notes ? (
                        <Text
                          numberOfLines={1}
                          style={[styles.eventNotes, { color: colors.textSecondary }]}
                        >
                          📝 {event.notes}
                        </Text>
                      ) : null}

                      {/* Export & Actions Row */}
                      <View style={styles.eventActionsRow}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => void handleExportIcs(event)}
                          style={[styles.actionChip, { backgroundColor: colors.surfaceRaised }]}
                        >
                          <Ionicons name="download-outline" size={14} color={colors.brand} />
                          <Text style={[styles.actionChipText, { color: colors.brand }]}>
                            {exportingId === event.id ? 'Exporting…' : 'Export .ics'}
                          </Text>
                        </Pressable>

                        <Pressable
                          accessibilityRole="button"
                          onPress={async () => {
                            const confirmed = await confirm({
                              title: 'Delete Event',
                              message: `Remove "${event.title}" from your calendar?`,
                              confirmLabel: 'Remove',
                              destructive: true,
                            });
                            if (confirmed) remove.mutate(event.id);
                          }}
                          style={[styles.actionChip, { backgroundColor: colors.surfaceRaised }]}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {filteredEvents.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Ionicons name="calendar-outline" size={32} color={colors.textDisabled} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No scheduled events in this filter.
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </Screen>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  modeSwitcher: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    marginVertical: 10,
    padding: 3,
  },
  modeTab: {
    alignItems: 'center',
    borderRadius: 11,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  modeTabText: {
    fontSize: 13,
  },
  historyContainer: {
    gap: 16,
    paddingBottom: 24,
  },
  plannerContainer: {
    gap: 14,
    paddingBottom: 24,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  statIconBox: {
    alignItems: 'center',
    borderRadius: 10,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Goal & Pace Card
  goalCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  goalHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  goalPaceBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  goalProgressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  goalTrack: {
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  goalFill: {
    borderRadius: 999,
    height: '100%',
  },
  goalProgressText: {
    fontSize: 13,
    fontWeight: '800',
  },

  // Circadian Rhythm Card
  circadianCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  circadianHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circadianTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  personaBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  personaBadgeText: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '800',
  },
  quadrantBarsWrap: {
    gap: 10,
  },
  quadrantTrack: {
    borderRadius: 999,
    flexDirection: 'row',
    height: 10,
    overflow: 'hidden',
  },
  quadrantSegment: {
    height: '100%',
  },
  quadrantLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  legendDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Weekdays Breakdown
  weekdayCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  weekdayHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekdayTitleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  weekdayTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  peakBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  peakBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  weekdayBarsList: {
    gap: 8,
  },
  weekdayBarRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '700',
    width: 30,
  },
  barTrack: {
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: 'hidden',
  },
  barFill: {
    borderRadius: 999,
    height: '100%',
  },
  barCount: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    width: 60,
  },

  // Selected Log Card
  selectedLogCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  selectedLogHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedLogTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  viewingsList: {
    gap: 10,
  },
  viewingItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  viewingPosterWrap: {
    height: 52,
    width: 36,
  },
  viewingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyDayLogWrap: {
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 4,
  },
  retroLogBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retroLogBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Planner Styles
  addPlanButton: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  addPlanText: {
    fontSize: 14,
    fontWeight: '800',
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateChip: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickDateLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  quickDateSublabel: {
    fontSize: 10,
  },
  submitButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  filterChipText: {
    fontSize: 12,
  },
  eventsList: {
    gap: 10,
  },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  eventDateBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 64,
    justifyContent: 'center',
    width: 54,
  },
  eventDayName: {
    fontSize: 10,
    fontWeight: '800',
  },
  eventDayNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  eventMonthName: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  eventTime: {
    fontSize: 12,
  },
  eventNotes: {
    fontSize: 12,
  },
  eventActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionChip: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 32,
  },
  emptyText: {
    fontSize: 13,
  },
});
