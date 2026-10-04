import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { CARD_THEMES, type CardTheme } from '../lib/share-card-model';
import { GraphicCardPreview } from './graphic-card-preview';
import { Button, useColors } from './ui';
export type { CardTheme } from '../lib/share-card-model';

interface ReviewShareCardModalProps {
  visible: boolean;
  onClose: () => void;
  review: {
    title?: string | null | undefined;
    body: string;
    ratingValue?: number | null | undefined;
    ratingScale?: number | null | undefined;
    containsSpoilers?: boolean | undefined;
    vibeTags?: string[] | undefined;
    quote?: string | null | undefined;
    user?:
      | {
          displayName?: string | null | undefined;
          handle?: string | null | undefined;
          avatarUrl?: string | null | undefined;
        }
      | undefined;
  };
  media: {
    id: string;
    title: string;
    posterUrl: string | null | undefined;
    releaseDate?: string | null | undefined;
    genres?: Array<{ id: string; name: string }> | undefined;
  };
}

export function ReviewShareCardModal({
  visible,
  onClose,
  review,
  media,
}: ReviewShareCardModalProps) {
  const colors = useColors();
  const [theme, setTheme] = useState<CardTheme>('MIDNIGHT');
  const [spoilerConsent, setSpoilerConsent] = useState<string | null>(null);
  const spoilerContent = JSON.stringify([media.title, review.body, review.title, review.quote]);
  const containsSpoilers = review.containsSpoilers === true;
  const permitted = !containsSpoilers || spoilerConsent === spoilerContent;
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={{ flex: 1, backgroundColor: '#000000B8', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.background,
            maxHeight: '92%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingBottom: 12,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 18 }}>
              CineWrapped Share Card
            </Text>
            <Pressable
              accessibilityLabel="Close share card"
              accessibilityRole="button"
              onPress={onClose}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" color={colors.textPrimary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 20 }}>
            <View
              accessibilityRole="radiogroup"
              style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
            >
              {(Object.keys(CARD_THEMES) as CardTheme[]).map((key) => {
                const selected = key === theme;
                const choice = CARD_THEMES[key];
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setTheme(key)}
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: selected ? choice.accent : colors.surfaceRaised,
                      borderWidth: 1,
                      borderColor: selected ? choice.accent : colors.border,
                    }}
                  >
                    <Text
                      style={{
                        color: selected ? choice.onAccent : colors.textPrimary,
                        fontWeight: '700',
                      }}
                    >
                      {choice.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!visible ? null : !permitted ? (
              <View style={{ gap: 12 }}>
                <Text style={{ color: colors.textPrimary }}>
                  This review contains spoilers. Revealing it will also include the spoiler text in
                  the shared image.
                </Text>
                <Button
                  label="Reveal spoilers and prepare card"
                  onPress={() => setSpoilerConsent(spoilerContent)}
                />
              </View>
            ) : (
              <GraphicCardPreview
                card={{
                  title: media.title,
                  subtitle: [
                    media.releaseDate?.slice(0, 4),
                    ...(media.genres ?? []).slice(0, 2).map((genre) => genre.name),
                  ]
                    .filter(Boolean)
                    .join(' · '),
                  body: review.body,
                  quote: review.quote ?? review.title ?? null,
                  author: review.user?.displayName ?? 'Cinephile',
                  handle: review.user?.handle ?? 'cinephile',
                  ratingValue: review.ratingValue ?? null,
                  ratingScale: review.ratingScale ?? null,
                  containsSpoilers,
                  theme,
                }}
                posterUrl={media.posterUrl}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
