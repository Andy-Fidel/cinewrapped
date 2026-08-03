import type { LibraryItem, WatchStatus } from '@cinewrapped/shared-types';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { MediaCard } from '../../src/components/media-card';
import { useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

const filters: Array<{ label: string; value: WatchStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Watching', value: 'WATCHING' },
  { label: 'Planned', value: 'PLANNED' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Paused', value: 'PAUSED' },
];

export default function LibraryScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [status, setStatus] = useState<WatchStatus | undefined>();
  const library = useQuery({
    queryKey: ['library', status],
    queryFn: () =>
      api.request<LibraryItem[]>(
        `library?limit=50${status === undefined ? '' : `&status=${status}`}`,
      ),
    enabled: session !== null,
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
          My library
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          Your watch history, progress, ratings, and reviews.
        </Text>
        <View style={styles.filters}>
          {filters.map((filter) => {
            const selected = status === filter.value;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={filter.label}
                onPress={() => setStatus(filter.value)}
                style={[
                  styles.filter,
                  { backgroundColor: selected ? colors.brand : colors.surface },
                ]}
              >
                <Text style={{ color: selected ? colors.onBrand : colors.textPrimary }}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <FlashList
        data={library.data ?? []}
        keyExtractor={(item) => item.media.id}
        numColumns={2}
        onRefresh={() => void library.refetch()}
        refreshing={library.isRefetching}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <MediaCard media={item.media} />
            <Text style={[styles.status, { color: colors.textSecondary }]}>
              {item.status.toLowerCase()} · {Math.round(item.progressPercent)}%
            </Text>
            {item.rating?.ratingValue === null || item.rating?.ratingValue === undefined ? null : (
              <Text style={{ color: colors.brand, fontWeight: '700' }}>
                {item.rating.ratingValue}/{item.rating.ratingScale}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {library.isPending ? 'Loading your library…' : 'Nothing here yet'}
            </Text>
            <Text
              style={{
                color: library.isError ? colors.danger : colors.textSecondary,
                textAlign: 'center',
              }}
            >
              {library.isError
                ? 'Your library could not be loaded.'
                : 'Track a title from Discover to start building your history.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { gap: 12, padding: 20, paddingBottom: 8 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  list: { padding: 12 },
  item: { flex: 1, gap: 5, padding: 8 },
  status: { fontSize: 12, textTransform: 'capitalize' },
  empty: { alignItems: 'center', gap: 9, padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
});
