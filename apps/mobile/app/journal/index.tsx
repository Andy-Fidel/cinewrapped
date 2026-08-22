import type { JournalEntrySummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

type FilterTab = 'ALL' | 'COMPLETED' | 'DRAFT' | 'WITH_STUBS' | 'WITH_COMPANIONS';

export default function JournalScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  const journal = useQuery({
    queryKey: ['journal', deferredQuery],
    queryFn: () =>
      api.request<JournalEntrySummary[]>(
        `journal?limit=100${deferredQuery.trim() === '' ? '' : `&query=${encodeURIComponent(deferredQuery.trim())}`}`,
      ),
    enabled: session !== null,
  });

  // Calculate scrapbook metrics
  const metrics = useMemo(() => {
    const list = journal.data ?? [];
    const completed = list.filter((e) => e.status === 'COMPLETED').length;
    const drafts = list.filter((e) => e.status === 'DRAFT').length;
    const totalStubs = list.reduce((acc, curr) => acc + curr.attachments.length, 0);
    const totalCompanions = new Set(list.flatMap((e) => e.companionNames)).size;

    return {
      total: list.length,
      completed,
      drafts,
      totalStubs,
      totalCompanions,
    };
  }, [journal.data]);

  // Client-side filtering based on selected filter tab
  const filteredEntries = useMemo(() => {
    const list = journal.data ?? [];
    if (activeFilter === 'COMPLETED') return list.filter((e) => e.status === 'COMPLETED');
    if (activeFilter === 'DRAFT') return list.filter((e) => e.status === 'DRAFT');
    if (activeFilter === 'WITH_STUBS') return list.filter((e) => e.attachments.length > 0);
    if (activeFilter === 'WITH_COMPANIONS') return list.filter((e) => e.companionNames.length > 0);
    return list;
  }, [journal.data, activeFilter]);

  if (session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Movie Journal' }} />
      <FeatureGate feature="MOVIE_JOURNAL">
        {/* Scrapbook Vault Hero Header */}
        <View style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.privacyBadge}>
                <Ionicons name="lock-closed" size={10} color={colors.brand} />
                <Text style={[styles.eyebrow, { color: colors.brand }]}>PRIVATE FILM VAULT</Text>
              </View>
              <Text
                accessibilityRole="header"
                style={[styles.title, { color: colors.textPrimary }]}
              >
                Film Diary & Scrapbook
              </Text>
            </View>

            <Pressable
              accessibilityLabel="Capture new journal memory"
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/discover')}
              style={({ pressed }) => [
                styles.newMemoryBtn,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="add" size={18} color={colors.onBrand} />
              <Text style={[styles.newMemoryBtnText, { color: colors.onBrand }]}>Log Memory</Text>
            </Pressable>
          </View>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your private sanctuary for film memories, tickets, venues, and reflections. Never shared
            with the social feed.
          </Text>

          {/* Scrapbook Metrics Bar */}
          <View style={styles.metricsBar}>
            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="book-outline" size={13} color={colors.brand} />
              <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                {metrics.total} {metrics.total === 1 ? 'Memory' : 'Memories'}
              </Text>
            </View>

            <View
              style={[
                styles.metricPill,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="ticket-outline" size={13} color="#F59E0B" />
              <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                {metrics.totalStubs} {metrics.totalStubs === 1 ? 'Stub / Photo' : 'Stubs / Photos'}
              </Text>
            </View>

            {metrics.totalCompanions > 0 && (
              <View
                style={[
                  styles.metricPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="people-outline" size={13} color="#A78BFA" />
                <Text style={[styles.metricText, { color: colors.textPrimary }]}>
                  {metrics.totalCompanions} Companions
                </Text>
              </View>
            )}

            {metrics.drafts > 0 && (
              <View
                style={[
                  styles.metricPill,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="create-outline" size={13} color={colors.warning} />
                <Text style={[styles.metricText, { color: colors.warning }]}>
                  {metrics.drafts} Drafts
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons color={colors.textSecondary} name="search-outline" size={18} />
          <TextInput
            accessibilityLabel="Search journal"
            onChangeText={setQuery}
            placeholder="Search titles, venues, quotes, or companions…"
            placeholderTextColor={colors.textDisabled}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
          />
          {query.length > 0 && (
            <Pressable hitSlop={8} onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {/* Filter Horizon Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'ALL' as const, label: `All (${metrics.total})` },
            { key: 'COMPLETED' as const, label: `Completed (${metrics.completed})` },
            { key: 'DRAFT' as const, label: `Drafts (${metrics.drafts})` },
            { key: 'WITH_STUBS' as const, label: '🎟️ With Stubs' },
            { key: 'WITH_COMPANIONS' as const, label: '👥 Group Screenings' },
          ].map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected ? colors.surfaceRaised : 'transparent',
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? colors.textPrimary : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Entries List */}
        <View style={styles.entries}>
          {filteredEntries.map((entry) => {
            const isDraft = entry.status === 'DRAFT';
            const watchedDate = entry.watchedAt
              ? new Date(entry.watchedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : new Date(entry.updatedAt).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

            const hasAtmosphere =
              entry.viewingLocation ||
              entry.companionNames.length > 0 ||
              entry.moodBefore ||
              entry.moodAfter ||
              entry.attachments.length > 0;

            const topQuote = entry.memorableQuotes.length > 0 ? entry.memorableQuotes[0] : null;

            return (
              <Pressable
                accessibilityRole="button"
                key={entry.id}
                onPress={() => router.push(`/journal/${entry.id}`)}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isDraft ? 'rgba(245, 158, 11, 0.4)' : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                {/* Left Poster Thumbnail */}
                {entry.media.posterUrl ? (
                  <Image
                    source={{ uri: entry.media.posterUrl }}
                    style={styles.poster}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.poster,
                      styles.posterFallback,
                      { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons color={colors.textDisabled} name="film-outline" size={24} />
                  </View>
                )}

                {/* Main Card Content */}
                <View style={styles.cardCopy}>
                  {/* Title & Status Badge */}
                  <View style={styles.cardTitleRow}>
                    <Text
                      numberOfLines={1}
                      style={[styles.cardTitle, { color: colors.textPrimary }]}
                    >
                      {entry.title || entry.media.title || 'Untitled Memory'}
                    </Text>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isDraft
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(16, 185, 129, 0.15)',
                        },
                      ]}
                    >
                      <Text
                        style={[styles.statusBadgeText, { color: isDraft ? '#F59E0B' : '#10B981' }]}
                      >
                        {isDraft ? 'DRAFT' : 'COMPLETE'}
                      </Text>
                    </View>
                  </View>

                  {/* Movie Year & Date Info */}
                  <Text style={[styles.dateMeta, { color: colors.textSecondary }]}>
                    {entry.media.title} ({entry.media.releaseYear ?? 'TBA'}) · Watched {watchedDate}
                  </Text>

                  {/* Atmosphere Chips (Location, Companions, Moods, Stubs) */}
                  {hasAtmosphere && (
                    <View style={styles.atmosphereRow}>
                      {entry.viewingLocation && (
                        <View style={[styles.tagChip, { backgroundColor: colors.surfaceRaised }]}>
                          <Ionicons name="location-sharp" size={10} color="#F59E0B" />
                          <Text
                            numberOfLines={1}
                            style={[styles.tagChipText, { color: colors.textPrimary }]}
                          >
                            {entry.viewingLocation}
                          </Text>
                        </View>
                      )}

                      {entry.companionNames.length > 0 && (
                        <View style={[styles.tagChip, { backgroundColor: colors.surfaceRaised }]}>
                          <Ionicons name="people" size={10} color="#A78BFA" />
                          <Text
                            numberOfLines={1}
                            style={[styles.tagChipText, { color: colors.textPrimary }]}
                          >
                            with {entry.companionNames.slice(0, 2).join(', ')}
                            {entry.companionNames.length > 2
                              ? ` +${entry.companionNames.length - 2}`
                              : ''}
                          </Text>
                        </View>
                      )}

                      {(entry.moodBefore || entry.moodAfter) && (
                        <View style={[styles.tagChip, { backgroundColor: colors.surfaceRaised }]}>
                          <Ionicons name="happy-outline" size={10} color={colors.brand} />
                          <Text
                            numberOfLines={1}
                            style={[styles.tagChipText, { color: colors.textPrimary }]}
                          >
                            {entry.moodBefore && entry.moodAfter
                              ? `${entry.moodBefore} → ${entry.moodAfter}`
                              : (entry.moodAfter ?? entry.moodBefore)}
                          </Text>
                        </View>
                      )}

                      {entry.attachments.length > 0 && (
                        <View style={[styles.tagChip, { backgroundColor: colors.surfaceRaised }]}>
                          <Ionicons name="ticket" size={10} color="#EC4899" />
                          <Text style={[styles.tagChipText, { color: colors.textPrimary }]}>
                            {entry.attachments.length}{' '}
                            {entry.attachments.length === 1 ? 'stub' : 'stubs'}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Top Memorable Quote Snippet */}
                  {topQuote && (
                    <View
                      style={[
                        styles.quoteBox,
                        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.quoteText, { color: colors.textSecondary }]}
                      >
                        “{topQuote}”
                      </Text>
                    </View>
                  )}

                  {/* Private Notes Excerpt */}
                  {entry.notes ? (
                    <Text
                      numberOfLines={2}
                      style={[styles.preview, { color: colors.textSecondary }]}
                    >
                      {entry.notes}
                    </Text>
                  ) : null}
                </View>

                <Ionicons color={colors.textDisabled} name="chevron-forward" size={18} />
              </Pressable>
            );
          })}
        </View>

        {journal.isPending && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.brand} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              Opening your private film vault…
            </Text>
          </View>
        )}

        {journal.isError && (
          <Text accessibilityRole="alert" style={{ color: colors.danger, textAlign: 'center' }}>
            {errorMessage(journal.error)}
          </Text>
        )}

        {/* Nostalgic Scrapbook Empty State */}
        {!journal.isPending && !journal.isError && filteredEntries.length === 0 && (
          <View
            style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
              ]}
            >
              <Ionicons color={colors.brand} name="book-outline" size={32} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {deferredQuery.trim() !== ''
                ? 'No matching memories found'
                : activeFilter !== 'ALL'
                  ? 'No entries in this filter'
                  : 'Your private film vault is waiting'}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              {deferredQuery.trim() !== ''
                ? 'Try searching by a different title, venue, or companion.'
                : 'Capture your thoughts, ticket stubs, cinema venue, and companion memories right after watching a film.'}
            </Text>
            <Pressable
              onPress={() => {
                setQuery('');
                setActiveFilter('ALL');
                router.push('/(tabs)/discover');
              }}
              style={({ pressed }) => [
                styles.emptyActionBtn,
                { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="film-outline" size={18} color={colors.onBrand} />
              <Text style={[styles.emptyActionBtnText, { color: colors.onBrand }]}>
                Choose a Film to Journal
              </Text>
            </Pressable>
          </View>
        )}
      </FeatureGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 10, marginTop: 12 },
  heroTopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  privacyBadge: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    marginBottom: 2,
  },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 18 },

  newMemoryBtn: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newMemoryBtnText: { fontSize: 12, fontWeight: '700' },

  // Metrics Bar
  metricsBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  metricPill: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metricText: { fontSize: 11, fontWeight: '700' },

  // Search
  search: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, minHeight: 44, paddingVertical: 8 },

  // Filters
  filterScroll: { gap: 8, paddingVertical: 4 },
  filterPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 12, fontWeight: '700' },

  // Entries
  entries: { gap: 12, marginTop: 8 },
  card: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  poster: { borderRadius: 10, height: 96, width: 64 },
  posterFallback: { alignItems: 'center', borderWidth: 1, justifyContent: 'center' },
  cardCopy: { flex: 1, gap: 4 },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', lineHeight: 20, paddingRight: 6 },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  dateMeta: { fontSize: 12, fontWeight: '500' },

  // Atmosphere Tags
  atmosphereRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  tagChip: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    maxWidth: 160,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagChipText: { fontSize: 10, fontWeight: '600' },

  // Quote pullout
  quoteBox: {
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quoteText: { fontSize: 11, fontStyle: 'italic' },

  preview: { fontSize: 12, lineHeight: 16, marginTop: 2 },

  loadingContainer: { alignItems: 'center', paddingVertical: 32 },
  empty: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
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
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyBody: { fontSize: 13, lineHeight: 18, maxWidth: 300, textAlign: 'center' },
  emptyActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionBtnText: { fontSize: 13, fontWeight: '800' },
});
