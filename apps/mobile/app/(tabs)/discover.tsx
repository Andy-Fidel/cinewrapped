import type { MediaSummary } from '@cinewrapped/shared-types';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MediaCard } from '../../src/components/media-card';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';

type MediaFilter = 'ALL' | 'MOVIE' | 'TV';

export default function DiscoverScreen() {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<MediaFilter>('ALL');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const mediaType = filter === 'ALL' ? '' : `&mediaType=${filter}`;
  const search = useQuery({
    queryKey: ['media-search', debouncedQuery, filter],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `search/media?q=${encodeURIComponent(debouncedQuery)}&language=en-US${mediaType}`,
      ),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
  const trending = useQuery({
    queryKey: ['media-trending', filter],
    queryFn: () =>
      api.request<MediaSummary[]>(`media/trending?window=WEEK&language=en-US${mediaType}`),
    staleTime: 10 * 60 * 1000,
  });
  const active = debouncedQuery.length >= 2 ? search : trending;
  const heading =
    debouncedQuery.length >= 2 ? `Results for “${debouncedQuery}”` : 'Trending this week';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.brand }]}>DISCOVER</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          Find your next story
        </Text>
        <TextInput
          accessibilityLabel="Search movies and television shows"
          autoCapitalize="none"
          onChangeText={setQuery}
          placeholder="Search movies and shows"
          placeholderTextColor={colors.textDisabled}
          returnKeyType="search"
          style={[
            styles.search,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={query}
        />
        <View style={styles.filters}>
          {(['ALL', 'MOVIE', 'TV'] as const).map((value) => {
            const selected = value === filter;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={value}
                onPress={() => setFilter(value)}
                style={[
                  styles.filter,
                  { backgroundColor: selected ? colors.brand : colors.surfaceRaised },
                ]}
              >
                <Text
                  style={{
                    color: selected ? colors.onBrand : colors.textPrimary,
                    fontWeight: '600',
                  }}
                >
                  {value === 'ALL' ? 'All' : value === 'MOVIE' ? 'Movies' : 'TV'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{heading}</Text>
      </View>
      {active.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : active.isError ? (
        <View style={styles.center}>
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            Discovery is unavailable. Pull down or try again shortly.
          </Text>
        </View>
      ) : (
        <FlashList
          contentContainerStyle={styles.list}
          data={active.data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          onRefresh={() => void active.refetch()}
          refreshing={active.isRefetching}
          renderItem={({ item }) => <MediaCard media={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.textSecondary }}>No titles matched this search.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { gap: 14, paddingHorizontal: 18, paddingTop: 12 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.4 },
  search: { borderRadius: 12, borderWidth: 1, fontSize: 16, minHeight: 50, paddingHorizontal: 16 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { borderRadius: 999, justifyContent: 'center', minHeight: 44, paddingHorizontal: 18 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 4 },
  list: { paddingHorizontal: 12, paddingTop: 16 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: 24 },
});
