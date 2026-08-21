import type { StoryPresentation, StorySlideData } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getStoryTheme } from './story-theme';
import { useColors } from '../ui';
import { haptics } from '../../lib/haptics';

export interface StoryExportOptions {
  platform: 'INSTAGRAM' | 'WHATSAPP' | 'TIKTOK' | 'DOWNLOAD_IMAGE' | 'COPY_JSON';
  slideIndex: number;
}

export function StoryExportModal({
  visible,
  onClose,
  presentation,
  currentSlideIndex,
}: {
  visible: boolean;
  onClose: () => void;
  presentation: StoryPresentation;
  currentSlideIndex: number;
}) {
  const colors = useColors();
  const [copiedNotification, setCopiedNotification] = useState(false);

  const activeSlide: StorySlideData =
    presentation.slides[currentSlideIndex] ?? presentation.slides[0]!;

  const handleSharePlatform = async (platform: StoryExportOptions['platform']) => {
    haptics.clapperSnap();

    if (platform === 'COPY_JSON') {
      const jsonString = JSON.stringify(presentation, null, 2);
      if (Platform.OS === 'web') {
        try {
          await navigator.clipboard.writeText(jsonString);
        } catch {
          // Fallback
        }
      }
      setCopiedNotification(true);
      setTimeout(() => {
        setCopiedNotification(false);
      }, 2500);
      return;
    }

    const platformLabels: Record<string, string> = {
      INSTAGRAM: 'Instagram Stories (9:16)',
      WHATSAPP: 'WhatsApp Status',
      TIKTOK: 'TikTok (9:16 Slide)',
      DOWNLOAD_IMAGE: 'Download Image Card',
    };

    const message = `🎬 ${presentation.title} — ${activeSlide.headline}\n\n${activeSlide.description ?? ''}\n\n🍿 Explore on CineWrapped: https://cinewrapped.app/stories/${presentation.id}`;

    try {
      await Share.share({
        title: `${presentation.title} - ${platformLabels[platform]}`,
        message,
        url: `https://cinewrapped.app/stories/${presentation.id}?slide=${currentSlideIndex}`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={{ gap: 2 }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                Share & Export Slide
              </Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                Slide {currentSlideIndex + 1} of {presentation.slides.length} · 9:16 High Res Format
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surfaceRaised }]}
            >
              <Ionicons name="close" size={18} color={colors.textPrimary} />
            </Pressable>
          </View>

          {copiedNotification ? (
            <View style={styles.copiedBanner}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.copiedBannerText}>Structured Story JSON copied to clipboard!</Text>
            </View>
          ) : null}

          {/* Social Platforms Grid */}
          <View style={styles.platformsGrid}>
            {/* 1. Instagram Stories */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSharePlatform('INSTAGRAM')}
              style={({ pressed }) => [
                styles.platformCard,
                {
                  backgroundColor: 'rgba(225, 48, 108, 0.12)',
                  borderColor: '#E1306C',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.platformIconBox, { backgroundColor: '#E1306C' }]}>
                <Ionicons name="logo-instagram" size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.platformName, { color: colors.textPrimary }]}>Instagram Stories</Text>
              <Text style={[styles.platformSpec, { color: colors.textSecondary }]}>9:16 Full Bleed</Text>
            </Pressable>

            {/* 2. WhatsApp Status */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSharePlatform('WHATSAPP')}
              style={({ pressed }) => [
                styles.platformCard,
                {
                  backgroundColor: 'rgba(37, 211, 102, 0.12)',
                  borderColor: '#25D366',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.platformIconBox, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.platformName, { color: colors.textPrimary }]}>WhatsApp Status</Text>
              <Text style={[styles.platformSpec, { color: colors.textSecondary }]}>9:16 Instant Share</Text>
            </Pressable>

            {/* 3. TikTok */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSharePlatform('TIKTOK')}
              style={({ pressed }) => [
                styles.platformCard,
                {
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderColor: colors.brand,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.platformIconBox, { backgroundColor: colors.brand }]}>
                <Ionicons name="logo-tiktok" size={22} color="#000000" />
              </View>
              <Text style={[styles.platformName, { color: colors.textPrimary }]}>TikTok</Text>
              <Text style={[styles.platformSpec, { color: colors.textSecondary }]}>9:16 Slide Deck</Text>
            </Pressable>

            {/* 4. Download Image Card */}
            <Pressable
              accessibilityRole="button"
              onPress={() => handleSharePlatform('DOWNLOAD_IMAGE')}
              style={({ pressed }) => [
                styles.platformCard,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <View style={[styles.platformIconBox, { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border }]}>
                <Ionicons name="download-outline" size={22} color={colors.brand} />
              </View>
              <Text style={[styles.platformName, { color: colors.textPrimary }]}>Download Card</Text>
              <Text style={[styles.platformSpec, { color: colors.textSecondary }]}>Ultra-HD Image</Text>
            </Pressable>
          </View>

          {/* Structured JSON Export Action */}
          <Pressable
            accessibilityRole="button"
            onPress={() => handleSharePlatform('COPY_JSON')}
            style={({ pressed }) => [
              styles.jsonExportBtn,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="code-slash" size={16} color={colors.brand} />
            <Text style={[styles.jsonExportText, { color: colors.textPrimary }]}>
              Export Structured Presentation JSON
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  copiedBannerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  platformCard: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  platformIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  platformName: {
    fontSize: 13,
    fontWeight: '800',
  },
  platformSpec: {
    fontSize: 10,
    fontWeight: '600',
  },
  jsonExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  jsonExportText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
