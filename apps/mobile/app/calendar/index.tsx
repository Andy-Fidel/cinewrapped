import type { CalendarEventSummary, CalendarEventType } from '@cinewrapped/shared-types';
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { nextClockTime, nextWeekdayTime } from '../../src/lib/calendar-dates';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

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
  const params = useLocalSearchParams<{
    eventType?: CalendarEventType;
    mediaId?: string;
    title?: string;
  }>();

  // Form states
  const [isPlanningOpen, setIsPlanningOpen] = useState(Boolean(params.title || params.mediaId));
  const [title, setTitle] = useState(params.title ?? '');
  const [linkedMediaId, setLinkedMediaId] = useState<string | null>(params.mediaId ?? null);
  const [notes, setNotes] = useState('');
  const [selectedQuickDateIndex, setSelectedQuickDateIndex] = useState(0);
  const [eventType, setEventType] = useState<CalendarEventType>(
    params.eventType === 'RELEASE_REMINDER' ? 'RELEASE_REMINDER' : 'WATCH_PLAN',
  );
  const [reminderOption, setReminderOption] = useState<number>(60); // 60 mins before
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Filtering states
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  const quickDates = useMemo(() => getQuickDateOptions(), []);

  // 1-year window query
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
      setTitle('');
      setNotes('');
      setLinkedMediaId(null);
      setIsPlanningOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.request<{ id: string }>(`calendar/${id}`, { method: 'DELETE' }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['calendar'] }),
  });

  // Calculate statistics
  const stats = useMemo(() => {
    const list = events.data ?? [];
    const watchPlans = list.filter((e) => e.eventType === 'WATCH_PLAN').length;
    const reminders = list.filter((e) => e.eventType === 'RELEASE_REMINDER').length;
    const totalMinutes = list.reduce((acc, curr) => acc + (curr.durationMinutes || 120), 0);
    return {
      watchPlans,
      reminders,
      totalHours: (totalMinutes / 60).toFixed(1),
    };
  }, [events.data]);

  // Rolling 14-day horizon for top calendar strip
  const horizonDays = useMemo(() => {
    const list: { key: string; dayName: string; dayNum: number; date: Date }[] = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      list.push({
        key,
        dayName: i === 0 ? 'TODAY' : d.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
        date: d,
      });
    }
    return list;
  }, []);

  // Map of events by day key for indicator dots
  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, { hasWatchPlan: boolean; hasReminder: boolean }>();
    for (const event of events.data ?? []) {
      const d = new Date(event.startsAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`;
      const entry = map.get(key) ?? { hasWatchPlan: false, hasReminder: false };
      if (event.eventType === 'WATCH_PLAN') entry.hasWatchPlan = true;
      if (event.eventType === 'RELEASE_REMINDER') entry.hasReminder = true;
      map.set(key, entry);
    }
    return map;
  }, [events.data]);

  // Filtered event list
  const filteredEvents = useMemo(() => {
    let list = events.data ?? [];
    if (activeFilter !== 'ALL') {
      list = list.filter((e) => e.eventType === activeFilter);
    }
    if (selectedDayKey !== null) {
      list = list.filter((e) => {
        const d = new Date(e.startsAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate(),
        ).padStart(2, '0')}`;
        return key === selectedDayKey;
      });
    }
    return list;
  }, [events.data, activeFilter, selectedDayKey]);

  const handleExportIcs = async (event: CalendarEventSummary) => {
    setExportingId(event.id);
    setExportError(null);
    try {
      const contents = await api.requestText(`calendar/${event.id}.ics`);
      const safeTitle = event.title.replace(/[^a-z0-9]+/giu, '-').replace(/^-|-$/gu, '') || 'event';
      if (Platform.OS === 'web') {
        await Linking.openURL(`data:text/calendar;charset=utf-8,${encodeURIComponent(contents)}`);
        return;
      }
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable.');
      const file = new File(Paths.cache, `cinewrapped-${safeTitle}.ics`);
      file.write(contents);
      await Sharing.shareAsync(file.uri, {
        dialogTitle: `Export ${event.title}`,
        mimeType: 'text/calendar',
        UTI: 'public.calendar-event',
      });
    } catch (error) {
      setExportError(errorMessage(error));
    } finally {
      setExportingId(null);
    }
  };

  if (session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Schedule & Reminders',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <FeatureGate feature="CALENDAR_INTEGRATION">
        {/* Cinema Hero Glance Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.eyebrow, { color: colors.brand }]}>CINEWRAPPED TIMELINE</Text>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.textPrimary }]}
              >
                Cinema Schedule
              </Text>
            </View>
            <Pressable
              accessibilityLabel={isPlanningOpen ? 'Close planning form' : 'Plan movie night'}
              accessibilityRole="button"
              onPress={() => setIsPlanningOpen((prev) => !prev)}
              style={({ pressed }) => [
                styles.planFab,
                {
                  backgroundColor: isPlanningOpen ? colors.surfaceRaised : colors.brand,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={isPlanningOpen ? 'close' : 'add'}
                size={22}
                color={isPlanningOpen ? colors.textPrimary : colors.onBrand}
              />
              <Text
                style={[
                  styles.planFabText,
                  { color: isPlanningOpen ? colors.textPrimary : colors.onBrand },
                ]}
              >
                {isPlanningOpen ? 'Close' : 'Plan Event'}
              </Text>
            </Pressable>
          </View>

          {/* Quick Metrics Bar */}
          <View style={styles.metricsRow}>
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="film-outline" size={15} color="#F59E0B" />
              <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                {stats.watchPlans} {stats.watchPlans === 1 ? 'Movie Night' : 'Movie Nights'}
              </Text>
            </View>
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="notifications-outline" size={15} color="#A78BFA" />
              <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                {stats.reminders} {stats.reminders === 1 ? 'Premiere' : 'Premieres'}
              </Text>
            </View>
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="time-outline" size={15} color={colors.textSecondary} />
              <Text style={[styles.metricText, { color: colors.textSecondary }]}>
                {stats.totalHours} hrs planned
              </Text>
            </View>
          </View>
        </View>

        {/* Collapsible Glass Planning Card */}
        {isPlanningOpen && (
          <View
            style={[
              styles.planningCard,
              { backgroundColor: colors.surface, borderColor: colors.brand },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="calendar" size={18} color={colors.brand} />
                <Text style={[styles.heading, { color: colors.textPrimary }]}>
                  Schedule Screening
                </Text>
              </View>
              <Text style={[styles.cardHeaderHint, { color: colors.textSecondary }]}>
                Private Schedule
              </Text>
            </View>

            {/* Event Type Toggle */}
            <View accessibilityRole="radiogroup" style={styles.typeSelector}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: eventType === 'WATCH_PLAN' }}
                onPress={() => setEventType('WATCH_PLAN')}
                style={[
                  styles.typeButton,
                  eventType === 'WATCH_PLAN' && {
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: '#F59E0B',
                  },
                  eventType !== 'WATCH_PLAN' && { borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color={eventType === 'WATCH_PLAN' ? '#F59E0B' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    {
                      color: eventType === 'WATCH_PLAN' ? colors.textPrimary : colors.textSecondary,
                    },
                  ]}
                >
                  Watch Plan
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: eventType === 'RELEASE_REMINDER' }}
                onPress={() => setEventType('RELEASE_REMINDER')}
                style={[
                  styles.typeButton,
                  eventType === 'RELEASE_REMINDER' && {
                    backgroundColor: 'rgba(167, 139, 250, 0.15)',
                    borderColor: '#A78BFA',
                  },
                  eventType !== 'RELEASE_REMINDER' && { borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color={eventType === 'RELEASE_REMINDER' ? '#A78BFA' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeText,
                    {
                      color:
                        eventType === 'RELEASE_REMINDER'
                          ? colors.textPrimary
                          : colors.textSecondary,
                    },
                  ]}
                >
                  Premiere Alert
                </Text>
              </Pressable>
            </View>

            {/* Inputs */}
            <TextInput
              accessibilityLabel="Event title"
              placeholder={
                eventType === 'WATCH_PLAN'
                  ? 'Movie or show title (e.g. Dune: Part Two)'
                  : 'Premiere title to track (e.g. Blade Runner 2099)'
              }
              placeholderTextColor={colors.textDisabled}
              value={title}
              onChangeText={setTitle}
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            />

            <TextInput
              accessibilityLabel="Event notes"
              placeholder="Notes, snacks, streaming platform or who you're watching with..."
              placeholderTextColor={colors.textDisabled}
              value={notes}
              onChangeText={setNotes}
              style={[
                styles.input,
                styles.inputMultiline,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
              multiline
              numberOfLines={2}
            />

            {/* Quick Date Presets */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>WHEN</Text>
            <ScrollView
              accessibilityRole="radiogroup"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickDateRow}
            >
              {quickDates.map((opt, idx) => {
                const isSelected = selectedQuickDateIndex === idx;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={opt.label}
                    onPress={() => setSelectedQuickDateIndex(idx)}
                    style={[
                      styles.quickDateChip,
                      {
                        backgroundColor: isSelected ? colors.brand : colors.surfaceRaised,
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickDateLabel,
                        { color: isSelected ? colors.onBrand : colors.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.quickDateSub,
                        { color: isSelected ? colors.onBrand : colors.textSecondary },
                      ]}
                    >
                      {opt.sublabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Reminder Interval Chips */}
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              ALERT REMINDER
            </Text>
            <View accessibilityRole="radiogroup" style={styles.reminderRow}>
              {[
                { label: '15m before', val: 15 },
                { label: '1h before', val: 60 },
                { label: '1 day before', val: 1440 },
              ].map((rem) => {
                const isSelected = reminderOption === rem.val;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    key={rem.val}
                    onPress={() => setReminderOption(rem.val)}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: isSelected ? colors.surfaceRaised : 'transparent',
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="alarm-outline"
                      size={13}
                      color={isSelected ? colors.brand : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.reminderChipText,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                      ]}
                    >
                      {rem.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={title.trim() === '' || create.isPending}
              onPress={() => create.mutate()}
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: colors.brand,
                  opacity: title.trim() === '' || create.isPending || pressed ? 0.65 : 1,
                },
              ]}
            >
              {create.isPending ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <View style={styles.submitButtonContent}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={colors.onBrand} />
                  <Text style={[styles.submitButtonText, { color: colors.onBrand }]}>
                    Save to Cinema Schedule
                  </Text>
                </View>
              )}
            </Pressable>

            {create.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 13 }}>
                {errorMessage(create.error)}
              </Text>
            ) : null}
          </View>
        )}

        {/* 14-Day Horizon Bar */}
        <View style={styles.horizonSection}>
          <View style={styles.horizonHeader}>
            <Text style={[styles.horizonTitle, { color: colors.textPrimary }]}>Date Horizon</Text>
            {selectedDayKey !== null && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedDayKey(null)}
                hitSlop={8}
              >
                <Text style={[styles.clearFilterText, { color: colors.brand }]}>
                  Show all dates
                </Text>
              </Pressable>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizonScroller}
          >
            {horizonDays.map((item) => {
              const isSelected = selectedDayKey === item.key;
              const indicator = eventsByDayKey.get(item.key);
              return (
                <Pressable
                  accessibilityLabel={`Filter schedule by ${item.dayName} ${item.dayNum}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  key={item.key}
                  onPress={() => setSelectedDayKey(isSelected ? null : item.key)}
                  style={[
                    styles.dayPill,
                    {
                      backgroundColor: isSelected ? colors.brand : colors.surface,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dayPillName,
                      { color: isSelected ? colors.onBrand : colors.textSecondary },
                    ]}
                  >
                    {item.dayName}
                  </Text>
                  <Text
                    style={[
                      styles.dayPillNum,
                      { color: isSelected ? colors.onBrand : colors.textPrimary },
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                  <View style={styles.pipsRow}>
                    {indicator?.hasWatchPlan && (
                      <View
                        style={[
                          styles.pip,
                          { backgroundColor: isSelected ? colors.onBrand : '#F59E0B' },
                        ]}
                      />
                    )}
                    {indicator?.hasReminder && (
                      <View
                        style={[
                          styles.pip,
                          { backgroundColor: isSelected ? colors.onBrand : '#A78BFA' },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Segmented Filter Pills */}
        <View accessibilityRole="radiogroup" style={styles.filterBar}>
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === 'ALL' }}
            onPress={() => setActiveFilter('ALL')}
            style={[
              styles.filterPill,
              {
                backgroundColor: activeFilter === 'ALL' ? colors.surfaceRaised : 'transparent',
                borderColor: activeFilter === 'ALL' ? colors.brand : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: activeFilter === 'ALL' ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              All Schedule ({events.data?.length ?? 0})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === 'WATCH_PLAN' }}
            onPress={() => setActiveFilter('WATCH_PLAN')}
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  activeFilter === 'WATCH_PLAN' ? colors.surfaceRaised : 'transparent',
                borderColor: activeFilter === 'WATCH_PLAN' ? '#F59E0B' : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="film"
              size={13}
              color={activeFilter === 'WATCH_PLAN' ? '#F59E0B' : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color: activeFilter === 'WATCH_PLAN' ? colors.textPrimary : colors.textSecondary,
                },
              ]}
            >
              Movie Nights ({stats.watchPlans})
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: activeFilter === 'RELEASE_REMINDER' }}
            onPress={() => setActiveFilter('RELEASE_REMINDER')}
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  activeFilter === 'RELEASE_REMINDER' ? colors.surfaceRaised : 'transparent',
                borderColor: activeFilter === 'RELEASE_REMINDER' ? '#A78BFA' : 'transparent',
              },
            ]}
          >
            <Ionicons
              name="notifications"
              size={13}
              color={activeFilter === 'RELEASE_REMINDER' ? '#A78BFA' : colors.textSecondary}
            />
            <Text
              style={[
                styles.filterPillText,
                {
                  color:
                    activeFilter === 'RELEASE_REMINDER' ? colors.textPrimary : colors.textSecondary,
                },
              ]}
            >
              Premieres ({stats.reminders})
            </Text>
          </Pressable>
        </View>

        {/* Events Agenda List */}
        <View style={styles.list}>
          {filteredEvents.map((event) => {
            const isWatchPlan = event.eventType === 'WATCH_PLAN';
            const dateParts = formatEventDate(event.startsAt);
            const relativeCountdown = formatRelativeCountdown(event.startsAt);
            const timeStr = formatEventTime(event.startsAt);

            return (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isWatchPlan
                      ? 'rgba(245, 158, 11, 0.35)'
                      : 'rgba(167, 139, 250, 0.35)',
                  },
                ]}
              >
                {/* Left Date / Time Pill */}
                <View
                  style={[
                    styles.dateBadge,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: isWatchPlan ? '#F59E0B' : '#A78BFA',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.dateBadgeDayName,
                      { color: isWatchPlan ? '#F59E0B' : '#A78BFA' },
                    ]}
                  >
                    {dateParts.dayName}
                  </Text>
                  <Text style={[styles.dateBadgeDayNum, { color: colors.textPrimary }]}>
                    {dateParts.dayNum}
                  </Text>
                  <Text style={[styles.dateBadgeMonth, { color: colors.textSecondary }]}>
                    {dateParts.monthName}
                  </Text>
                </View>

                {/* Main Content Info */}
                <View style={styles.eventContent}>
                  {/* Category Pill & Countdown */}
                  <View style={styles.tagRow}>
                    <View
                      style={[
                        styles.eventTypeTag,
                        {
                          backgroundColor: isWatchPlan
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(167, 139, 250, 0.15)',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isWatchPlan ? 'play' : 'notifications'}
                        size={11}
                        color={isWatchPlan ? '#F59E0B' : '#A78BFA'}
                      />
                      <Text
                        style={[
                          styles.eventTypeText,
                          { color: isWatchPlan ? '#F59E0B' : '#A78BFA' },
                        ]}
                      >
                        {isWatchPlan ? 'MOVIE NIGHT' : 'PREMIERE'}
                      </Text>
                    </View>

                    {relativeCountdown && (
                      <View
                        style={[styles.countdownTag, { backgroundColor: colors.surfaceRaised }]}
                      >
                        <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
                          {relativeCountdown}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={[styles.eventTitle, { color: colors.textPrimary }]}>
                    {event.title}
                  </Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                      {timeStr} · {event.durationMinutes}m
                    </Text>
                    {event.reminderMinutes.length > 0 && (
                      <>
                        <Text style={{ color: colors.textDisabled }}>•</Text>
                        <Ionicons name="alarm-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          Alert {event.reminderMinutes[0]}m prior
                        </Text>
                      </>
                    )}
                  </View>

                  {event.notes ? (
                    <Text numberOfLines={2} style={[styles.notes, { color: colors.textSecondary }]}>
                      {event.notes}
                    </Text>
                  ) : null}

                  {/* If linked to TMDB media, show rich preview */}
                  {event.media && (
                    <Pressable
                      onPress={() => router.push(`/media/${event.media?.id}`)}
                      style={[
                        styles.mediaSnippet,
                        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                      ]}
                    >
                      {event.media.posterUrl ? (
                        <Image
                          source={{ uri: event.media.posterUrl }}
                          style={styles.snippetPoster}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.snippetPoster, { backgroundColor: colors.surface }]}>
                          <Ionicons name="film" size={14} color={colors.textDisabled} />
                        </View>
                      )}
                      <View style={styles.snippetCopy}>
                        <Text
                          numberOfLines={1}
                          style={[styles.snippetTitle, { color: colors.textPrimary }]}
                        >
                          {event.media.title}
                        </Text>
                        <Text style={[styles.snippetMeta, { color: colors.textSecondary }]}>
                          {event.media.releaseYear ?? 'TBA'} ·{' '}
                          {event.media.mediaType === 'MOVIE' ? 'Movie' : 'TV Series'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                    </Pressable>
                  )}
                </View>

                {/* Right Action Icons (Export .ics & Remove) */}
                <View style={styles.actionCol}>
                  <Pressable
                    accessibilityLabel={`Export ${event.title} to calendar`}
                    accessibilityRole="button"
                    hitSlop={8}
                    disabled={exportingId === event.id}
                    onPress={() => void handleExportIcs(event)}
                    style={styles.actionButton}
                  >
                    {exportingId === event.id ? (
                      <ActivityIndicator color={colors.textSecondary} size="small" />
                    ) : (
                      <Ionicons name="download-outline" color={colors.textSecondary} size={19} />
                    )}
                  </Pressable>

                  <Pressable
                    accessibilityLabel={`Remove ${event.title}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => remove.mutate(event.id)}
                    style={styles.actionButton}
                  >
                    <Ionicons name="trash-outline" color={colors.danger} size={19} />
                  </Pressable>
                </View>
              </View>
            );
          })}

          {events.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.brand} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                Loading cinema schedule…
              </Text>
            </View>
          ) : null}

          {events.isError ? (
            <Text style={{ color: colors.danger, textAlign: 'center' }}>
              {errorMessage(events.error)}
            </Text>
          ) : null}

          {exportError === null ? null : (
            <Text accessibilityRole="alert" style={{ color: colors.danger, textAlign: 'center' }}>
              {exportError}
            </Text>
          )}

          {/* Cinematic Empty State */}
          {!events.isPending && filteredEvents.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <Ionicons name="film-outline" size={32} color={colors.brand} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {selectedDayKey !== null
                  ? 'No events on this day'
                  : activeFilter !== 'ALL'
                    ? 'No events in this category'
                    : 'Your cinema schedule is clear'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {selectedDayKey !== null
                  ? 'Select another date or plan a screening for this day.'
                  : 'Schedule an upcoming movie night or set a premiere reminder to never miss a release.'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setSelectedDayKey(null);
                  setActiveFilter('ALL');
                  setIsPlanningOpen(true);
                }}
                style={[styles.emptyActionBtn, { backgroundColor: colors.brand }]}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.onBrand} />
                <Text style={[styles.emptyActionText, { color: colors.onBrand }]}>
                  Plan a Movie Night
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </FeatureGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 12, marginBottom: 8, marginTop: 12 },
  headerTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  planFab: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  planFabText: { fontSize: 13, fontWeight: '700' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metricPill: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metricText: { fontSize: 12, fontWeight: '600' },

  // Planning Sheet
  planningCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 12,
    marginTop: 6,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  heading: { fontSize: 16, fontWeight: '800' },
  cardHeaderHint: { fontSize: 11, fontWeight: '600' },
  typeSelector: { flexDirection: 'row', gap: 10 },
  typeButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  typeText: { fontSize: 13, fontWeight: '700' },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputMultiline: { minHeight: 56, textAlignVertical: 'top' },
  sectionSubtitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  quickDateRow: { gap: 8, paddingVertical: 4 },
  quickDateChip: {
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickDateLabel: { fontSize: 13, fontWeight: '700' },
  quickDateSub: { fontSize: 11 },
  reminderRow: { flexDirection: 'row', gap: 8 },
  reminderChip: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reminderChipText: { fontSize: 12, fontWeight: '600' },
  submitButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  submitButtonContent: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  submitButtonText: { fontSize: 15, fontWeight: '700' },

  // Horizon
  horizonSection: { gap: 8, marginTop: 8 },
  horizonHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  horizonTitle: { fontSize: 14, fontWeight: '700' },
  clearFilterText: { fontSize: 12, fontWeight: '700' },
  horizonScroller: { gap: 8, paddingVertical: 4 },
  dayPill: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 54,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  dayPillName: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  dayPillNum: { fontSize: 18, fontWeight: '800' },
  pipsRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  pip: { borderRadius: 3, height: 5, width: 5 },

  // Filter Bar
  filterBar: { flexDirection: 'row', gap: 6, marginTop: 6 },
  filterPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 12, fontWeight: '700' },

  // Agenda List
  list: { gap: 12, marginTop: 8 },
  eventCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  dateBadge: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    height: 70,
    justifyContent: 'center',
    width: 54,
  },
  dateBadgeDayName: { fontSize: 10, fontWeight: '800' },
  dateBadgeDayNum: { fontSize: 20, fontWeight: '800' },
  dateBadgeMonth: { fontSize: 10, fontWeight: '700' },
  eventContent: { flex: 1, gap: 4 },
  tagRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  eventTypeTag: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventTypeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  countdownTag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  countdownText: { fontSize: 10, fontWeight: '600' },
  eventTitle: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  metaText: { fontSize: 12, fontWeight: '500' },
  notes: { fontSize: 12, lineHeight: 16, marginTop: 2 },
  mediaSnippet: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    padding: 6,
  },
  snippetPoster: {
    alignItems: 'center',
    borderRadius: 4,
    height: 36,
    justifyContent: 'center',
    width: 24,
  },
  snippetCopy: { flex: 1 },
  snippetTitle: { fontSize: 12, fontWeight: '700' },
  snippetMeta: { fontSize: 10 },
  actionCol: { alignItems: 'center', gap: 14, justifyContent: 'center' },
  actionButton: { padding: 4 },

  // Empty State
  loadingContainer: { alignItems: 'center', paddingVertical: 24 },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 24,
    textAlign: 'center',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, lineHeight: 18, maxWidth: 280, textAlign: 'center' },
  emptyActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionText: { fontSize: 14, fontWeight: '700' },
});
