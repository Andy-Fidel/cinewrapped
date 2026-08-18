import type { PublicReviewItem } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { haptics } from '../lib/haptics';
import { PosterImage, useColors } from './ui';

export type CardTheme = 'MIDNIGHT' | 'CRIMSON' | 'CYAN' | 'GOLD';

interface ReviewShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  review: {
    title?: string | null | undefined;
    body: string;
    ratingValue?: number | null | undefined;
    vibeTags?: string[] | undefined;
    quote?: string | null | undefined;
    user?: {
      displayName?: string | null | undefined;
      handle?: string | null | undefined;
      avatarUrl?: string | null | undefined;
    } | undefined;
  };
  media: {
    id: string;
    title: string;
    posterUrl: string | null | undefined;
    releaseDate?: string | null | undefined;
    genres?: Array<{ id: string; name: string }> | undefined;
  };
}

const THEMES: Record<
  CardTheme,
  {
    name: string;
    bg: string;
    cardBg: string;
    accent: string;
    border: string;
    glow: string;
  }
> = {
  MIDNIGHT: {
    name: 'Midnight Noir',
    bg: '#0A0D14',
    cardBg: '#121722',
    accent: '#6366F1',
    border: 'rgba(99, 102, 241, 0.25)',
    glow: 'rgba(99, 102, 241, 0.4)',
  },
  CRIMSON: {
    name: 'Criterion Red',
    bg: '#120A0C',
    cardBg: '#1E1014',
    accent: '#EF4444',
    border: 'rgba(239, 68, 68, 0.25)',
    glow: 'rgba(239, 68, 68, 0.4)',
  },
  CYAN: {
    name: '70mm Cyan',
    bg: '#071015',
    cardBg: '#0E1B22',
    accent: '#06B6D4',
    border: 'rgba(6, 182, 212, 0.25)',
    glow: 'rgba(6, 182, 212, 0.4)',
  },
  GOLD: {
    name: '35mm Amber',
    bg: '#140E06',
    cardBg: '#20170A',
    accent: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.4)',
  },
};

export function ReviewShareCardModal({
  visible,
  onClose,
  review,
  media,
}: ReviewShareCardModalProps) {
  const colors = useColors();
  const [activeTheme, setActiveTheme] = useState<CardTheme>('MIDNIGHT');

  const theme = THEMES[activeTheme];

  const releaseYear = media.releaseDate ? media.releaseDate.slice(0, 4) : '';
  const starCount = review.ratingValue ?? 5;
  const starsString = '★'.repeat(starCount) + '☆'.repeat(Math.max(0, 5 - starCount));

  const handleNativeShare = async () => {
    haptics.selection();
    const reviewText = review.body.trim();
    const quoteHeader = review.quote ? `« ${review.quote} »\n\n` : '';
    const shareMessage = `🎬 "${media.title}" (${releaseYear})\nRating: ${starsString} (${starCount}/5)\n\n${quoteHeader}${reviewText}\n\n— Review by @${review.user?.handle || 'cinephile'} on CineWrapped ✨`;

    await Share.share({
      message: shareMessage,
      title: `${media.title} Review`,
    });
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header Bar */}
          <View style={styles.headerBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={18} color="#F59E0B" />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Letterboxd-Style Share Card
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close share card"
              accessibilityRole="button"
              onPress={onClose}
              style={styles.closeBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Theme Switcher Pills */}
          <View style={styles.themeRow}>
            {(Object.keys(THEMES) as CardTheme[]).map((tKey) => {
              const t = THEMES[tKey];
              const isSelected = activeTheme === tKey;
              return (
                <Pressable
                  key={tKey}
                  onPress={() => {
                    haptics.selection();
                    setActiveTheme(tKey);
                  }}
                  style={[
                    styles.themeChip,
                    {
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : colors.surfaceRaised,
                      borderColor: isSelected ? t.accent : 'transparent',
                      borderWidth: isSelected ? 1.5 : 0,
                    },
                  ]}
                >
                  <View style={[styles.themeDot, { backgroundColor: t.accent }]} />
                  <Text
                    style={[
                      styles.themeName,
                      { color: isSelected ? colors.textPrimary : colors.textSecondary, fontWeight: isSelected ? '800' : '600' },
                    ]}
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Scrollable Visual Card Area */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* The Visual Story Share Card (Vertical 9:16 aesthetic) */}
            <View
              style={[
                styles.shareCard,
                {
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                },
              ]}
            >
              {/* Top Watermark / Brand Header */}
              <View style={styles.cardWatermarkRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="film" size={14} color={theme.accent} />
                  <Text style={[styles.watermarkBrand, { color: colors.textSecondary }]}>
                    CINEWRAPPED
                  </Text>
                </View>
                <View style={[styles.verifiedTag, { backgroundColor: 'rgba(255,255,255,0.08)' }]}>
                  <Text style={styles.verifiedText}>REVIEW SPOTLIGHT</Text>
                </View>
              </View>

              {/* Floating 2:3 Movie Poster + Backdrop Glow */}
              <View style={styles.posterSection}>
                <View
                  style={[
                    styles.posterGlowBackplate,
                    { backgroundColor: theme.glow },
                  ]}
                />
                <View style={styles.posterFrame}>
                  <PosterImage uri={media.posterUrl ?? null} size="fill" rounded={14} />
                </View>
              </View>

              {/* Title & Metadata */}
              <View style={styles.titleSection}>
                <Text numberOfLines={2} style={[styles.filmTitle, { color: '#FFFFFF' }]}>
                  {media.title}
                </Text>
                <Text style={[styles.filmMeta, { color: 'rgba(255,255,255,0.6)' }]}>
                  {releaseYear ? `${releaseYear} · ` : ''}
                  {(media.genres ?? []).map((g) => g.name).slice(0, 2).join(' / ')}
                </Text>
              </View>

              {/* Star Rating Banner */}
              <View style={styles.ratingSection}>
                <View style={styles.starsWrap}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Ionicons
                      key={star}
                      name={star <= starCount ? 'star' : 'star-outline'}
                      size={22}
                      color="#F59E0B"
                    />
                  ))}
                </View>
                <Text style={styles.numericRating}>
                  {starCount}.0 / 5.0
                </Text>
              </View>

              {/* Review Pull-Quote & Body */}
              <View style={styles.reviewSection}>
                <Text style={[styles.quoteGlyph, { color: theme.accent }]}>“</Text>
                <Text
                  numberOfLines={6}
                  style={[styles.cardReviewBody, { color: 'rgba(255,255,255,0.9)' }]}
                >
                  {review.body}
                </Text>
              </View>

              {/* Reviewer Profile Footer */}
              <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.08)' }]}>
                <View style={styles.reviewerInfo}>
                  {review.user?.avatarUrl ? (
                    <Image source={{ uri: review.user.avatarUrl }} style={styles.reviewerAvatar} />
                  ) : (
                    <View style={[styles.reviewerAvatarFallback, { backgroundColor: theme.accent }]}>
                      <Text style={styles.reviewerInitials}>
                        {(review.user?.displayName || review.user?.handle || 'CW').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ gap: 2 }}>
                    <Text style={[styles.reviewerName, { color: '#FFFFFF' }]}>
                      {review.user?.displayName || 'Cinephile'}
                    </Text>
                    <Text style={[styles.reviewerHandle, { color: 'rgba(255,255,255,0.5)' }]}>
                      @{review.user?.handle || 'user'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cinewrappedBadge}>
                  <Text style={[styles.cinewrappedBadgeText, { color: theme.accent }]}>
                    cinewrapped.app
                  </Text>
                </View>
              </View>
            </View>

            {/* Main Action Buttons */}
            <View style={styles.actionsWrap}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void handleNativeShare()}
                style={({ pressed }) => [
                  styles.primaryShareBtn,
                  { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryShareText}>Share to Instagram / X / Messages</Text>
              </Pressable>
            </View>
          </ScrollView>
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
    maxHeight: '92%',
    paddingBottom: 24,
    paddingTop: 16,
  },
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  themeChip: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  themeDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  themeName: {
    fontSize: 11,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },

  // Visual Share Card Frame
  shareCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    gap: 14,
    maxWidth: 340,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    width: '100%',
  },
  cardWatermarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  watermarkBrand: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  verifiedTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  verifiedText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Floating Poster Section
  posterSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  posterGlowBackplate: {
    borderRadius: 20,
    height: 170,
    opacity: 0.35,
    position: 'absolute',
    width: 125,
  },
  posterFrame: {
    borderRadius: 14,
    elevation: 12,
    height: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    width: 110,
  },

  // Title Section
  titleSection: {
    alignItems: 'center',
    gap: 4,
  },
  filmTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  filmMeta: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Rating Section
  ratingSection: {
    alignItems: 'center',
    gap: 4,
  },
  starsWrap: {
    flexDirection: 'row',
    gap: 4,
  },
  numericRating: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },

  // Review Section
  reviewSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    position: 'relative',
  },
  quoteGlyph: {
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 28,
    marginBottom: -8,
  },
  cardReviewBody: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // Card Footer
  cardFooter: {
    alignItems: 'center',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  reviewerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  reviewerAvatar: {
    borderRadius: 14,
    height: 28,
    width: 28,
  },
  reviewerAvatarFallback: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  reviewerInitials: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '800',
  },
  reviewerHandle: {
    fontSize: 10,
  },
  cinewrappedBadge: {
    borderRadius: 6,
  },
  cinewrappedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Actions Wrap
  actionsWrap: {
    paddingHorizontal: 10,
    width: '100%',
  },
  primaryShareBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 48,
    justifyContent: 'center',
    width: '100%',
  },
  primaryShareText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
