import type { CreditSummary, MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { PosterImage, useColors } from './ui';

interface FilmographyCompletionTrackerProps {
  person: CreditSummary;
  visible: boolean;
  onClose: () => void;
}

export function FilmographyCompletionTracker({
  person,
  visible,
  onClose,
}: FilmographyCompletionTrackerProps) {
  const colors = useColors();
  const router = useRouter();

  // Search person's filmography
  const filmography = useQuery({
    queryKey: ['person-filmography', person.name],
    queryFn: async () => {
      const res = await api.request<{ items: MediaSummary[] }>(
        `search?query=${encodeURIComponent(person.name)}&limit=15`,
      );
      return res.items;
    },
    enabled: visible,
  });

  // Query user's watched history
  const library = useQuery({
    queryKey: ['library-watched-status'],
    queryFn: async () => {
      const res = await api.request<{ items: Array<{ media: { id: string } }> }>(
        'library/entries?status=WATCHED&limit=200',
      );
      return new Set(res.items.map((i) => i.media.id));
    },
    enabled: visible,
  });

  const allFilms = filmography.data ?? [];
  const watchedSet = library.data ?? new Set<string>();

  const watchedFilms = allFilms.filter((f) => watchedSet.has(f.id));
  const watchedCount = watchedFilms.length;
  const totalCount = Math.max(allFilms.length, 1);
  const percentage = Math.round((watchedCount / totalCount) * 100);

  const getTier = (
    pct: number,
  ): { title: string; icon: keyof typeof Ionicons.glyphMap; color: string } => {
    if (pct === 100) return { title: 'Auteur Completionist', icon: 'ribbon', color: '#F59E0B' };
    if (pct >= 75) return { title: 'Gold Scholar', icon: 'medal', color: '#F59E0B' };
    if (pct >= 50) return { title: 'Silver Connoisseur', icon: 'trophy', color: '#E2E8F0' };
    if (pct >= 25) return { title: 'Bronze Explorer', icon: 'shield-checkmark', color: '#CD7F32' };
    return { title: 'Novice Viewer', icon: 'sparkles', color: colors.textSecondary };
  };

  const tier = getTier(percentage);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.personHeaderRow}>
              {person.profileUrl ? (
                <Image source={{ uri: person.profileUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: colors.surfaceRaised }]}>
                  <Ionicons name="person" size={24} color={colors.textSecondary} />
                </View>
              )}
              <View style={{ gap: 2 }}>
                <Text style={[styles.personName, { color: colors.textPrimary }]}>
                  {person.name}
                </Text>
                <Text style={[styles.personRole, { color: colors.textSecondary }]}>
                  {person.job ?? person.department ?? 'Filmography'}
                </Text>
              </View>
            </View>

            <Pressable
              accessibilityLabel="Close filmography"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Completion Status Dashboard Banner */}
          <View
            style={[
              styles.completionBanner,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <View style={styles.tierRow}>
              <View style={[styles.tierBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                <Ionicons name={tier.icon} size={14} color={tier.color} />
                <Text style={[styles.tierTitle, { color: tier.color }]}>{tier.title}</Text>
              </View>
              <Text style={[styles.percentNumber, { color: colors.textPrimary }]}>
                {percentage}%
              </Text>
            </View>

            <Text style={[styles.completionSubtext, { color: colors.textSecondary }]}>
              You've watched{' '}
              <Text style={{ color: '#00E054', fontWeight: '800' }}>{watchedCount}</Text> of{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
                {allFilms.length}
              </Text>{' '}
              catalog works
            </Text>

            {/* Segmented Progress Bar */}
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <View style={[styles.progressFill, { width: `${Math.max(percentage, 5)}%` }]} />
            </View>
          </View>

          {/* Filmography Work List */}
          <View style={styles.listWrap}>
            <Text style={[styles.listHeading, { color: colors.textPrimary }]}>
              Catalog Filmography ({allFilms.length})
            </Text>

            {filmography.isPending ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#F59E0B" size="small" />
              </View>
            ) : (
              <FlatList
                data={allFilms}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isWatched = watchedSet.has(item.id);
                  return (
                    <Pressable
                      onPress={() => {
                        haptics.selection();
                        onClose();
                        router.push(`/media/${item.id}`);
                      }}
                      style={({ pressed }) => [
                        styles.filmRow,
                        {
                          backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.posterContainer}>
                        <PosterImage uri={item.posterUrl ?? null} size="fill" rounded={8} />
                      </View>
                      <View style={styles.filmMeta}>
                        <Text
                          numberOfLines={1}
                          style={[styles.filmTitle, { color: colors.textPrimary }]}
                        >
                          {item.title}
                        </Text>
                        <Text style={[styles.filmYear, { color: colors.textSecondary }]}>
                          {item.releaseYear ?? 'Unknown'} ·{' '}
                          {item.mediaType === 'TV' ? 'Series' : 'Film'}
                        </Text>
                      </View>

                      {/* Watched / Unwatched Indicator */}
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: isWatched
                              ? 'rgba(0, 224, 84, 0.15)'
                              : 'rgba(255, 255, 255, 0.05)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={isWatched ? 'checkmark-circle' : 'time-outline'}
                          size={14}
                          color={isWatched ? '#00E054' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: isWatched ? '#00E054' : colors.textSecondary },
                          ]}
                        >
                          {isWatched ? 'Watched' : 'Unseen'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '88%',
    paddingBottom: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  personHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    borderRadius: 24,
    height: 48,
    width: 48,
  },
  avatarFallback: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  personName: {
    fontSize: 17,
    fontWeight: '900',
  },
  personRole: {
    fontSize: 12,
  },
  closeBtn: {
    padding: 4,
  },
  completionBanner: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
  },
  tierRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierBadge: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tierTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  percentNumber: {
    fontSize: 22,
    fontWeight: '900',
  },
  completionSubtext: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    backgroundColor: '#00E054',
    borderRadius: 999,
    height: '100%',
  },
  listWrap: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  listHeading: {
    fontSize: 15,
    fontWeight: '800',
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  filmRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  posterContainer: {
    borderRadius: 6,
    height: 52,
    overflow: 'hidden',
    width: 36,
  },
  filmMeta: {
    flex: 1,
    gap: 2,
  },
  filmTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  filmYear: {
    fontSize: 12,
  },
  statusPill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
