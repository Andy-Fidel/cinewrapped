import { gridColumns } from '../../src/lib/responsive-layout';
import type { LibraryItem, SavedSoundtrackSummary, WatchStatus } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaCard } from '../../src/components/media-card';
import { Button, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';
import { useFeatureFlags } from '../../src/providers/feature-flags-provider';

const filters: Array<{
  label: string;
  value: WatchStatus | undefined;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { label: 'All', value: undefined, icon: 'film-outline' },
  { label: 'Watching', value: 'WATCHING', icon: 'play-circle-outline' },
  { label: 'Planned', value: 'PLANNED', icon: 'bookmark-outline' },
  { label: 'Completed', value: 'COMPLETED', icon: 'checkmark-circle-outline' },
  { label: 'Rewatching', value: 'REWATCHING', icon: 'repeat-outline' },
  { label: 'Dropped', value: 'DROPPED', icon: 'close-circle-outline' },
  { label: 'Paused', value: 'PAUSED', icon: 'pause-circle-outline' },
];

export default function LibraryScreen() {
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const columns = gridColumns(width, fontScale);
  const { session, loading: authLoading } = useAuth();
  const { isEnabled } = useFeatureFlags();
  const [status, setStatus] = useState<WatchStatus | undefined>();

  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<'MOVIE' | 'TV' | undefined>();
  const [sort, setSort] = useState('RECENT');
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);
  const library = useInfiniteQuery({
    queryKey: ['library', status, mediaType, query, sort],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const params = new URLSearchParams({ limit: '50', sort });
      if (status) params.set('status', status);
      if (mediaType) params.set('mediaType', mediaType);
      if (query) params.set('q', query);
      if (pageParam) params.set('cursor', pageParam);
      return api.requestCollection<LibraryItem>(`library?${params}`, { signal });
    },
    getNextPageParam: (page) => page.meta.page.nextCursor ?? undefined,
    enabled: session !== null,
  });
  const items = [
    ...new Map(
      (library.data?.pages.flatMap((page) => page.data) ?? []).map((item) => [item.media.id, item]),
    ).values(),
  ];
  const loadMore = () => {
    if (library.hasNextPage && !library.isFetching) void library.fetchNextPage();
  };

  const savedSoundtracks = useQuery({
    queryKey: ['saved-soundtracks'],
    queryFn: () => api.request<SavedSoundtrackSummary[]>('soundtracks/saves'),
    enabled: session !== null && isEnabled('SOUNDTRACKS'),
  });

  if (authLoading) return null;
  if (session === null) return <Redirect href="/(auth)/login" />;
  const totalItems = items.length;
  const soundtrackCount = savedSoundtracks.data?.length ?? 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <FlashList
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleTextWrap}>
                <Text style={[styles.eyebrow, { color: colors.brand }]}>MY LIBRARY</Text>
                <Text
                  accessibilityRole="header"
                  style={[styles.title, { color: colors.textPrimary }]}
                >
                  My Library
                </Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: colors.surfaceRaised }]}>
                <Text style={[styles.countText, { color: colors.brand }]}>
                  📚 {totalItems}
                  {library.hasNextPage ? '+' : ''} shown
                </Text>
              </View>
            </View>

            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your watch history, progress, ratings, and media archives.
            </Text>

            {/* Quick Vault Navigation Bar (Soundtracks, Journal, Calendar) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.vaultShortcutsRow}
            >
              {isEnabled('SOUNDTRACKS') && (
                <Pressable
                  accessibilityLabel="Saved Soundtracks"
                  accessibilityRole="button"
                  onPress={() => router.push('/soundtracks')}
                  style={({ pressed }) => [
                    styles.vaultShortcutPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.vaultIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}
                  >
                    <Ionicons name="musical-notes" size={13} color="#F59E0B" />
                  </View>
                  <Text style={[styles.vaultShortcutText, { color: colors.textPrimary }]}>
                    Soundtracks {soundtrackCount > 0 ? `(${soundtrackCount})` : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textDisabled} />
                </Pressable>
              )}

              {isEnabled('MOVIE_JOURNAL') && (
                <Pressable
                  accessibilityLabel="Movie Journal"
                  accessibilityRole="button"
                  onPress={() => router.push('/journal')}
                  style={({ pressed }) => [
                    styles.vaultShortcutPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.vaultIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}
                  >
                    <Ionicons name="book" size={13} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.vaultShortcutText, { color: colors.textPrimary }]}>
                    Film Journal
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textDisabled} />
                </Pressable>
              )}

              {isEnabled('CALENDAR_INTEGRATION') && (
                <Pressable
                  accessibilityLabel="Viewing Calendar"
                  accessibilityRole="button"
                  onPress={() => router.push('/calendar')}
                  style={({ pressed }) => [
                    styles.vaultShortcutPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View
                    style={[styles.vaultIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
                  >
                    <Ionicons name="calendar" size={13} color="#10B981" />
                  </View>
                  <Text style={[styles.vaultShortcutText, { color: colors.textPrimary }]}>
                    Schedule
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textDisabled} />
                </Pressable>
              )}
            </ScrollView>

            <TextInput
              accessibilityLabel="Search your library"
              placeholder="Search your library"
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              maxLength={100}
              style={{
                color: colors.textPrimary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                minHeight: 48,
              }}
            />
            <ScrollView
              horizontal
              contentContainerStyle={{ gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {(
                [
                  { label: 'All types', value: undefined },
                  { label: 'Movies', value: 'MOVIE' },
                  { label: 'TV shows', value: 'TV' },
                ] as const
              ).map((option) => (
                <Button
                  key={option.label}
                  label={option.label}
                  variant={mediaType === option.value ? 'primary' : 'secondary'}
                  onPress={() => setMediaType(option.value)}
                />
              ))}
            </ScrollView>
            <ScrollView
              horizontal
              contentContainerStyle={{ gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {[
                ['RECENT', 'Recently updated'],
                ['OLDEST', 'Oldest updated'],
                ['TITLE_ASC', 'Title A–Z'],
                ['TITLE_DESC', 'Title Z–A'],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  label={label!}
                  variant={sort === value ? 'primary' : 'secondary'}
                  onPress={() => setSort(value!)}
                />
              ))}
            </ScrollView>
            {/* Horizontal Scrollable Status Filters */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              {filters.map((filter) => {
                const selected = status === filter.value;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={filter.label}
                    onPress={() => setStatus(filter.value)}
                    style={({ pressed }) => [
                      styles.filter,
                      {
                        backgroundColor: selected ? colors.brand : colors.surface,
                        borderColor: selected ? colors.brand : colors.border,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name={filter.icon}
                      size={14}
                      color={selected ? colors.onBrand : colors.textPrimary}
                    />
                    <Text
                      style={{
                        color: selected ? colors.onBrand : colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 12,
                      }}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        }
        keyboardShouldPersistTaps="handled"
        onEndReached={() => {
          if (!library.isFetchNextPageError) loadMore();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          <View style={{ padding: 16, gap: 8 }}>
            {library.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                Could not load {items.length ? 'more titles' : 'your library'}. Your loaded titles
                are still available.
              </Text>
            ) : null}
            {library.hasNextPage ? (
              <Button
                label={library.isFetchNextPageError ? 'Retry loading more' : 'Load more titles'}
                loading={library.isFetchingNextPage}
                onPress={loadMore}
              />
            ) : library.isError ? (
              <Button label="Retry library" onPress={() => void library.refetch()} />
            ) : null}
          </View>
        }
        data={items}
        keyExtractor={(item) => item.media.id}
        key={`library-${columns}`}
        numColumns={columns}
        onRefresh={() => void Promise.all([library.refetch(), savedSoundtracks.refetch()])}
        refreshing={library.isRefetching}
        renderItem={({ item }) => {
          const progressPercent = Math.min(100, Math.max(0, Math.round(item.progressPercent)));
          return (
            <View style={styles.item}>
              <MediaCard media={item.media} />

              {/* Progress Bar Container */}
              <View style={[styles.progressBarBg, { backgroundColor: colors.surfaceRaised }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: colors.brand,
                      width: `${progressPercent}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.itemMetaRow}>
                <Text style={[styles.status, { color: colors.textSecondary }]}>
                  {item.status.toLowerCase()} · {progressPercent}%
                </Text>
                {item.rating?.ratingValue === null ||
                item.rating?.ratingValue === undefined ? null : (
                  <View style={[styles.ratingBadge, { backgroundColor: colors.surfaceRaised }]}>
                    <Ionicons name="star" size={11} color="#FFD700" />
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 11 }}>
                      {item.rating.ratingValue}/{item.rating.ratingScale}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceRaised }]}>
              <Ionicons name="bookmark-outline" size={32} color={colors.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {library.isPending ? 'Loading your library…' : 'No titles found'}
            </Text>
            <Text
              style={{
                color: library.isError ? colors.danger : colors.textSecondary,
                textAlign: 'center',
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {library.isError
                ? 'Your library could not be loaded.'
                : query || status || mediaType
                  ? 'Try a different search or filter.'
                  : 'Track a title from Discover to start building your history.'}
            </Text>
            {!library.isPending && !library.isError ? (
              <View style={styles.emptyCtaWrap}>
                <Button
                  label="Discover movies & shows"
                  onPress={() => router.push('/(tabs)/discover')}
                />
              </View>
            ) : null}
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { gap: 10, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  titleRow: {
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleTextWrap: { minWidth: 0, flexShrink: 1, gap: 2 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
  countBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  countText: { fontSize: 12, fontWeight: '700' },
  subtitle: { fontSize: 13, lineHeight: 18 },

  // Vault Shortcuts Bar
  vaultShortcutsRow: { gap: 8, paddingVertical: 2 },
  vaultShortcutPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
  },
  vaultIconBox: {
    alignItems: 'center',
    borderRadius: 14,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  vaultShortcutText: { fontSize: 12, fontWeight: '700' },

  // Filters
  filtersScrollContent: { gap: 8, paddingVertical: 4 },
  filter: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  list: { paddingHorizontal: 10, paddingTop: 8 },
  item: { flex: 1, gap: 6, padding: 6 },
  progressBarBg: {
    borderRadius: 999,
    height: 4,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    borderRadius: 999,
    height: '100%',
  },
  itemMetaRow: {
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  status: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  ratingBadge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  empty: { alignItems: 'center', gap: 12, padding: 40 },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyCtaWrap: { marginTop: 8, width: '100%' },
});
