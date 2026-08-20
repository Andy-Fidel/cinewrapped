import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useColors } from '../ui';
import { haptics } from '../../lib/haptics';

export interface WatchlistShortcutItem {
  id: string;
  media: {
    id: string;
    title: string;
    releaseYear: number | null;
    posterUrl: string | null;
    runtimeMinutes?: number | null;
    genres?: string[];
  };
  addedAt: string;
  priority?: 'HIGH' | 'NORMAL';
}

const DEFAULT_WATCHLIST_ITEMS: WatchlistShortcutItem[] = [
  {
    id: 'wl-1',
    media: {
      id: 'm-dune-2',
      title: 'Dune: Part Two',
      releaseYear: 2024,
      posterUrl: 'https://image.tmdb.org/t/p/w500/8b8R8l88Qje9dn9OE8PY05Nx1S8.jpg',
      runtimeMinutes: 166,
      genres: ['Sci-Fi', 'Adventure'],
    },
    addedAt: new Date().toISOString(),
    priority: 'HIGH',
  },
  {
    id: 'wl-2',
    media: {
      id: 'm-poor-things',
      title: 'Poor Things',
      releaseYear: 2023,
      posterUrl: 'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg',
      runtimeMinutes: 141,
      genres: ['Comedy', 'Romance'],
    },
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-3',
    media: {
      id: 'm-past-lives',
      title: 'Past Lives',
      releaseYear: 2023,
      posterUrl: 'https://image.tmdb.org/t/p/w500/k3waqVXSnvCZWfJYNtdamTgTtTA.jpg',
      runtimeMinutes: 105,
      genres: ['Drama', 'Romance'],
    },
    addedAt: new Date().toISOString(),
  },
  {
    id: 'wl-4',
    media: {
      id: 'm-anatomy-fall',
      title: 'Anatomy of a Fall',
      releaseYear: 2023,
      posterUrl: 'https://image.tmdb.org/t/p/w500/5ywXdHDURzJJ2ox8NxJu8dwhxTn.jpg',
      runtimeMinutes: 151,
      genres: ['Mystery', 'Thriller'],
    },
    addedAt: new Date().toISOString(),
  },
];

export function WatchlistShortcutWidget({
  items = DEFAULT_WATCHLIST_ITEMS,
  totalCount = 14,
}: {
  items?: WatchlistShortcutItem[];
  totalCount?: number;
}) {
  const colors = useColors();

  const handleOpenWatchlists = () => {
    haptics.selection();
    router.push('/(tabs)/library');
  };

  const handleOpenMedia = (mediaId: string) => {
    haptics.selection();
    router.push(`/media/${mediaId}`);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleGroup}>
          <View style={[styles.iconCircle, { backgroundColor: colors.surfaceRaised }]}>
            <Ionicons name="bookmark" size={15} color={colors.brand} />
          </View>
          <View style={{ gap: 2 }}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Watchlist Shortcut</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {totalCount} saved films ready to queue
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={handleOpenWatchlists}
          style={({ pressed }) => [
            styles.viewAllButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.viewAllText, { color: colors.brand }]}>View All ({totalCount})</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.brand} />
        </Pressable>
      </View>

      {/* Horizontal Watchlist Item Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Watchlist movie: ${item.media.title}`}
            onPress={() => handleOpenMedia(item.media.id)}
            style={({ pressed }) => [
              styles.itemCard,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <View style={styles.posterContainer}>
              <Image
                source={{ uri: item.media.posterUrl ?? '' }}
                style={styles.posterImage}
                resizeMode="cover"
              />
              {item.priority === 'HIGH' && (
                <View style={styles.priorityBadge}>
                  <Ionicons name="flame" size={10} color="#FFF" />
                  <Text style={styles.priorityBadgeText}>TOP</Text>
                </View>
              )}
            </View>

            <View style={styles.itemMeta}>
              <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.media.title}
              </Text>
              <Text style={[styles.itemYear, { color: colors.textSecondary }]}>
                {item.media.releaseYear ?? ''} · {item.media.runtimeMinutes ? `${item.media.runtimeMinutes}m` : ''}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* Add Shortcut Card */}
        <Pressable
          accessibilityRole="button"
          onPress={handleOpenWatchlists}
          style={({ pressed }) => [
            styles.addCard,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <View style={[styles.addCircle, { backgroundColor: colors.surface }]}>
            <Ionicons name="add" size={22} color={colors.brand} />
          </View>
          <Text style={[styles.addCardText, { color: colors.textPrimary }]}>Explore Lists</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  itemCard: {
    width: 105,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  posterContainer: {
    width: 105,
    height: 145,
    position: 'relative',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  priorityBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900',
  },
  itemMeta: {
    padding: 6,
    gap: 2,
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemYear: {
    fontSize: 10,
    fontWeight: '500',
  },
  addCard: {
    width: 105,
    height: 188,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 10,
  },
  addCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
