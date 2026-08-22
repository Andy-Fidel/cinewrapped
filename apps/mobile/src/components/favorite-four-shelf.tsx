import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '../lib/haptics';
import { FavoriteFourPickerModal } from './favorite-four-picker-modal';
import { PosterImage, useColors } from './ui';

interface FavoriteFourShelfProps {
  favorites?: MediaSummary[] | null | undefined;
  isSelf: boolean;
  username: string;
}

export function FavoriteFourShelf({ favorites = [], isSelf }: FavoriteFourShelfProps) {
  const colors = useColors();
  const router = useRouter();
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const items = favorites ?? [];

  if (items.length === 0 && !isSelf) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Ionicons name="star" size={16} color="#F59E0B" />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Favorite 4</Text>
        </View>

        {isSelf ? (
          <Pressable
            accessibilityLabel="Edit Favorite 4"
            accessibilityRole="button"
            onPress={() => {
              haptics.selection();
              setIsPickerOpen(true);
            }}
            style={styles.editBtn}
          >
            <Ionicons name="pencil" size={13} color="#F59E0B" />
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        ) : null}
      </View>

      {/* 4 Poster Slots Grid */}
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((idx) => {
          const item = items[idx];
          return (
            <Pressable
              key={idx}
              disabled={!item && !isSelf}
              onPress={() => {
                if (item) {
                  haptics.selection();
                  router.push(`/media/${item.id}`);
                } else if (isSelf) {
                  haptics.selection();
                  setIsPickerOpen(true);
                }
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: item ? 'rgba(245, 158, 11, 0.3)' : colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {/* Rank Pill */}
              <View style={styles.rankPill}>
                <Text style={styles.rankText}>{idx + 1}</Text>
              </View>

              {item ? (
                <View style={styles.posterWrap}>
                  <PosterImage uri={item.posterUrl ?? null} size="fill" rounded={10} />
                </View>
              ) : (
                <View style={styles.emptyWrap}>
                  <Ionicons
                    name={isSelf ? 'add-circle-outline' : 'film-outline'}
                    size={24}
                    color={colors.textSecondary}
                  />
                  {isSelf ? (
                    <Text style={[styles.addText, { color: colors.textSecondary }]}>
                      Add #{idx + 1}
                    </Text>
                  ) : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Favorite 4 Modal Picker */}
      {isSelf ? (
        <FavoriteFourPickerModal
          currentFavorites={items}
          onClose={() => setIsPickerOpen(false)}
          visible={isPickerOpen}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginVertical: 8,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  titleWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  editBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  grid: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  card: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 125,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '23%',
  },
  rankPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    left: 4,
    position: 'absolute',
    top: 4,
    width: 18,
    zIndex: 10,
  },
  rankText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '900',
  },
  posterWrap: {
    height: '100%',
    width: '100%',
  },
  emptyWrap: {
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  addText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
