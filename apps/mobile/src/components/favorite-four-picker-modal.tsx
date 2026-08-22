import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { PosterImage, useColors } from './ui';
import { useDialog } from '../providers/dialog-provider';

interface FavoriteFourPickerModalProps {
  visible: boolean;
  onClose: () => void;
  currentFavorites: MediaSummary[];
}

export function FavoriteFourPickerModal({
  visible,
  onClose,
  currentFavorites,
}: FavoriteFourPickerModalProps) {
  const colors = useColors();
  const { showInfo } = useDialog();
  const queryClient = useQueryClient();
  const [selectedMedia, setSelectedMedia] = useState<Array<MediaSummary | null>>(() => {
    const list: Array<MediaSummary | null> = [null, null, null, null];
    currentFavorites.slice(0, 4).forEach((m, idx) => {
      list[idx] = m;
    });
    return list;
  });
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Search query for films
  const searchResults = useQuery({
    queryKey: ['media-search-favorites', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const res = await api.request<{ items: MediaSummary[] }>(
        `search?query=${encodeURIComponent(searchQuery.trim())}&limit=12`,
      );
      return res.items;
    },
    enabled: visible && searchQuery.trim().length > 1,
  });

  const saveMutation = useMutation({
    mutationFn: async (mediaIds: string[]) => {
      return api.request('users/me/preferences', {
        method: 'PATCH',
        body: { favoriteMediaIds: mediaIds },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['public-profile'] });
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
      haptics.celebration();
      showInfo('Favorite 4 Updated', 'Your profile pinned showcase has been saved.');
      onClose();
    },
  });

  const handleSelectMedia = (item: MediaSummary) => {
    haptics.selection();
    const updated = [...selectedMedia];
    // Remove if already in another slot
    for (let i = 0; i < 4; i++) {
      if (updated[i]?.id === item.id) {
        updated[i] = null;
      }
    }
    updated[activeSlot] = item;
    setSelectedMedia(updated);
    // Auto advance to next empty slot if available
    const nextEmpty = updated.findIndex((s) => s === null);
    if (nextEmpty !== -1) {
      setActiveSlot(nextEmpty);
    }
  };

  const handleRemoveSlot = (slotIdx: number) => {
    haptics.selection();
    const updated = [...selectedMedia];
    updated[slotIdx] = null;
    setSelectedMedia(updated);
    setActiveSlot(slotIdx);
  };

  const handleSave = () => {
    const validIds = selectedMedia.filter((m): m is MediaSummary => m !== null).map((m) => m.id);
    saveMutation.mutate(validIds);
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Pick Your Favorite 4
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                The 4 definitive films showcased on your profile
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close picker"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* 4 Selected Slots Preview */}
          <View style={styles.slotsRow}>
            {[0, 1, 2, 3].map((slotIdx) => {
              const item = selectedMedia[slotIdx];
              const isSelected = activeSlot === slotIdx;
              return (
                <Pressable
                  key={slotIdx}
                  onPress={() => {
                    haptics.selection();
                    setActiveSlot(slotIdx);
                  }}
                  style={[
                    styles.slotCard,
                    {
                      borderColor: isSelected ? '#F59E0B' : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.slotBadge,
                      { backgroundColor: isSelected ? '#F59E0B' : 'rgba(0,0,0,0.6)' },
                    ]}
                  >
                    <Text
                      style={[styles.slotBadgeText, { color: isSelected ? '#000000' : '#FFFFFF' }]}
                    >
                      {slotIdx + 1}
                    </Text>
                  </View>

                  {item ? (
                    <View style={styles.posterContainer}>
                      <PosterImage uri={item.posterUrl ?? null} size="fill" rounded={8} />
                      <Pressable
                        onPress={() => handleRemoveSlot(slotIdx)}
                        style={styles.removeSlotBtn}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.emptySlotContent}>
                      <Ionicons
                        name="add"
                        size={24}
                        color={isSelected ? '#F59E0B' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.emptySlotText,
                          { color: isSelected ? '#F59E0B' : colors.textSecondary },
                        ]}
                      >
                        Slot {slotIdx + 1}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Active Slot Instruction */}
          <View style={styles.activeSlotHint}>
            <Ionicons name="sparkles" size={14} color="#F59E0B" />
            <Text style={[styles.activeSlotHintText, { color: colors.textSecondary }]}>
              Selecting film for{' '}
              <Text style={{ color: '#F59E0B', fontWeight: '800' }}>Slot #{activeSlot + 1}</Text>
            </Text>
          </View>

          {/* Search Input */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              autoFocus={false}
              onChangeText={setSearchQuery}
              placeholder="Search movie title..."
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={searchQuery}
            />
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          {/* Search Results List */}
          <View style={styles.resultsWrap}>
            {searchResults.isFetching ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color="#F59E0B" size="small" />
              </View>
            ) : (searchResults.data ?? []).length > 0 ? (
              <FlatList
                data={searchResults.data}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => handleSelectMedia(item)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      {
                        backgroundColor: pressed ? colors.surfaceRaised : 'transparent',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.resultPoster}>
                      <PosterImage uri={item.posterUrl ?? null} size="fill" rounded={6} />
                    </View>
                    <View style={styles.resultMeta}>
                      <Text
                        numberOfLines={1}
                        style={[styles.resultTitle, { color: colors.textPrimary }]}
                      >
                        {item.title}
                      </Text>
                      <Text style={[styles.resultYear, { color: colors.textSecondary }]}>
                        {item.releaseYear ?? 'Unknown'} ·{' '}
                        {item.mediaType === 'TV' ? 'TV Series' : 'Film'}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color="#F59E0B" />
                  </Pressable>
                )}
                showsVerticalScrollIndicator={false}
              />
            ) : searchQuery.trim().length > 1 ? (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  No films found matching "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Type a film title to search and set your Favorite 4
                </Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <View style={styles.footer}>
            <Pressable
              disabled={saveMutation.isPending}
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                { opacity: pressed || saveMutation.isPending ? 0.85 : 1 },
              ]}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Favorite 4</Text>
              )}
            </Pressable>
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
    height: '90%',
    paddingBottom: 24,
    paddingTop: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  slotCard: {
    alignItems: 'center',
    borderRadius: 12,
    height: 110,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    width: '23%',
  },
  slotBadge: {
    borderRadius: 999,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    left: 4,
    position: 'absolute',
    top: 4,
    width: 18,
    zIndex: 10,
  },
  slotBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  posterContainer: {
    height: '100%',
    position: 'relative',
    width: '100%',
  },
  removeSlotBtn: {
    position: 'absolute',
    right: 3,
    top: 3,
    zIndex: 10,
  },
  emptySlotContent: {
    alignItems: 'center',
    gap: 4,
  },
  emptySlotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  activeSlotHint: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  activeSlotHintText: {
    fontSize: 12,
  },
  searchBar: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  resultsWrap: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingWrap: {
    alignItems: 'center',
    paddingTop: 30,
  },
  resultRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
  },
  resultPoster: {
    borderRadius: 6,
    height: 48,
    overflow: 'hidden',
    width: 34,
  },
  resultMeta: {
    flex: 1,
    gap: 2,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  resultYear: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  saveBtn: {
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  saveBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },
});
