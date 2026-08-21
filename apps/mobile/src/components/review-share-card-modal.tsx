import type { PublicReviewItem } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { haptics } from '../lib/haptics';
import { shareCineWrappedGraphicCard } from '../lib/share-card-generator';
import { PosterImage, useColors } from './ui';
import { useDialog } from '../providers/dialog-provider';

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
  const { showInfo } = useDialog();
  const [activeTheme, setActiveTheme] = useState<CardTheme>('MIDNIGHT');
  const [isSharing, setIsSharing] = useState(false);

  const theme = THEMES[activeTheme];

  const releaseYear = media.releaseDate ? media.releaseDate.slice(0, 4) : '';
  const starCount = review.ratingValue ?? 5;

  const handleShareCard = async () => {
    haptics.selection();
    setIsSharing(true);

    try {
      await shareCineWrappedGraphicCard({
        mediaTitle: media.title,
        releaseYear,
        ratingValue: starCount,
        reviewBody: review.body,
        quote: review.quote ?? review.title ?? null,
        reviewerName: review.user?.displayName ?? 'Cinephile',
        reviewerHandle: review.user?.handle ?? 'cinephile',
        reviewerAvatarUrl: review.user?.avatarUrl ?? null,
        posterUrl: media.posterUrl ?? null,
        accentColor: theme.accent,
        cardBgColor: theme.cardBg,
      });
    } catch {
      // Ignore dismiss
    } finally {
      setIsSharing(false);
    }
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
                CineWrapped Share
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
                  <Text style={styles.verifiedText}>CINEWRAPPED SPOTLIGHT</Text>
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

            {/* Social Share Grid */}
            <View style={styles.platformsRow}>
              {/* WhatsApp */}
              <Pressable
                accessibilityRole="button"
                onPress={handleShareCard}
                style={({ pressed }) => [
                  styles.platformButton,
                  {
                    backgroundColor: 'rgba(37, 211, 102, 0.15)',
                    borderColor: '#25D366',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                <Text style={[styles.platformButtonText, { color: '#25D366' }]}>WhatsApp</Text>
              </Pressable>

              {/* Instagram */}
              <Pressable
                accessibilityRole="button"
                onPress={handleShareCard}
                style={({ pressed }) => [
                  styles.platformButton,
                  {
                    backgroundColor: 'rgba(225, 48, 108, 0.15)',
                    borderColor: '#E1306C',
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-instagram" size={20} color="#E1306C" />
                <Text style={[styles.platformButtonText, { color: '#E1306C' }]}>Instagram</Text>
              </Pressable>

              {/* X / Twitter */}
              <Pressable
                accessibilityRole="button"
                onPress={handleShareCard}
                style={({ pressed }) => [
                  styles.platformButton,
                  {
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="logo-twitter" size={20} color="#38BDF8" />
                <Text style={[styles.platformButtonText, { color: '#38BDF8' }]}>X / Twitter</Text>
              </Pressable>
            </View>

            {/* Main Action Button */}
            <View style={styles.actionsWrap}>
              <Pressable
                accessibilityRole="button"
                disabled={isSharing}
                onPress={() => void handleShareCard()}
                style={({ pressed }) => [
                  styles.primaryShareBtn,
                  { backgroundColor: theme.accent, opacity: pressed || isSharing ? 0.85 : 1 },
                ]}
              >
                {isSharing ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryShareText}>Share Card Graphic</Text>
                  </>
                )}
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
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  themeName: {
    fontSize: 12,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shareCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    width: 320,
  },
  cardWatermarkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  watermarkBrand: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  verifiedTag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  posterSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  posterGlowBackplate: {
    borderRadius: 20,
    height: 200,
    opacity: 0.6,
    position: 'absolute',
    top: 10,
    width: 150,
  },
  posterFrame: {
    borderRadius: 14,
    height: 210,
    overflow: 'hidden',
    width: 140,
    zIndex: 2,
  },
  titleSection: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
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
  ratingSection: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  starsWrap: {
    flexDirection: 'row',
    gap: 4,
  },
  numericRating: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '900',
  },
  reviewSection: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    marginBottom: 16,
    padding: 14,
    position: 'relative',
  },
  quoteGlyph: {
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 24,
    marginBottom: 4,
    opacity: 0.8,
  },
  cardReviewBody: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 19,
    textAlign: 'center',
  },
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
    borderRadius: 16,
    height: 32,
    width: 32,
  },
  reviewerAvatarFallback: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  reviewerInitials: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviewerHandle: {
    fontSize: 10,
  },
  cinewrappedBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  cinewrappedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  platformsRow: {
    flexDirection: 'row',
    gap: 8,
    width: 320,
  },
  platformButton: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  platformButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  actionsWrap: {
    gap: 10,
    width: 320,
  },
  primaryShareBtn: {
    alignItems: 'center',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    height: 50,
    justifyContent: 'center',
    width: '100%',
  },
  primaryShareText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
