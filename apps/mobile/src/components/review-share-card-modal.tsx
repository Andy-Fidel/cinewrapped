import type { MediaSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import {
  CARD_FORMATS,
  CARD_TEMPLATES,
  CARD_THEMES,
  type CardFormat,
  type CardTemplate,
  type CardTheme,
} from '../lib/share-card-model';
import { ShareCollagePicker } from './share-collage-picker';
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
  const [format, setFormat] = useState<CardFormat>('STORY');
  const [template, setTemplate] = useState<CardTemplate>('CLASSIC');
  const [signature, setSignature] = useState('');
  const [showInitials, setShowInitials] = useState(false);
  const [hideWatermark, setHideWatermark] = useState(false);
  const [customColors, setCustomColors] = useState(false);
  const [background, setBackground] = useState('#121722');
  const [accent, setAccent] = useState('#A5B4FC');
  const [useCollage, setUseCollage] = useState(false);
  const [collage, setCollage] = useState<MediaSummary[]>([]);
  const validColors = /^#[0-9a-f]{6}$/iu.test(background) && /^#[0-9a-f]{6}$/iu.test(accent);
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
            <CardChoices
              label="Template"
              choices={CARD_TEMPLATES}
              value={template}
              onChange={setTemplate}
            />
            <CardChoices
              label="Format"
              choices={
                Object.fromEntries(
                  Object.entries(CARD_FORMATS).map(([key, value]) => [key, value.name]),
                ) as Record<CardFormat, string>
              }
              value={format}
              onChange={setFormat}
            />
            <CardSwitch label="Poster collage" value={useCollage} onChange={setUseCollage} />
            {visible && useCollage ? (
              <ShareCollagePicker selected={collage} onChange={setCollage} />
            ) : null}
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Personal branding</Text>
            <CardSwitch
              label="Show author initials"
              value={showInitials}
              onChange={setShowInitials}
            />
            <CardSwitch
              label="Hide CineWrapped watermark"
              value={hideWatermark}
              onChange={setHideWatermark}
            />
            <TextInput
              accessibilityLabel="Card signature"
              placeholder="Custom signature (optional)"
              placeholderTextColor={colors.textSecondary}
              value={signature}
              onChangeText={setSignature}
              maxLength={100}
              style={{
                color: colors.textPrimary,
                borderColor: colors.border,
                borderWidth: 1,
                padding: 12,
                borderRadius: 8,
              }}
            />
            <CardSwitch label="Use custom colors" value={customColors} onChange={setCustomColors} />
            {customColors ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: colors.textSecondary }}>
                  Enter six-digit hex colors, such as #121722. Keep text readable in the preview.
                </Text>
                <TextInput
                  accessibilityLabel="Background hex color"
                  value={background}
                  onChangeText={setBackground}
                  maxLength={7}
                  autoCapitalize="none"
                  style={{
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                  }}
                />
                <TextInput
                  accessibilityLabel="Accent hex color"
                  value={accent}
                  onChangeText={setAccent}
                  maxLength={7}
                  autoCapitalize="none"
                  style={{
                    color: colors.textPrimary,
                    borderColor: colors.border,
                    borderWidth: 1,
                    padding: 12,
                  }}
                />
                {!validColors ? (
                  <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                    Both colors must use #RRGGBB. The selected theme is shown until corrected.
                  </Text>
                ) : null}
              </View>
            ) : null}
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
                  template,
                  format,
                  signature,
                  hideWatermark,
                  ...(showInitials
                    ? {
                        initials: (review.user?.displayName ?? 'Cinephile')
                          .split(/\s+/u)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((part) => Array.from(part)[0])
                          .join('')
                          .toUpperCase(),
                      }
                    : {}),
                  ...(customColors && validColors ? { palette: { background, accent } } : {}),
                }}
                posterUrl={useCollage && collage.length ? null : media.posterUrl}
                collagePosters={
                  useCollage
                    ? collage.map((item) => ({ title: item.title, posterUrl: item.posterUrl }))
                    : []
                }
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CardChoices<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: Record<T, string>;
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{label}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={label}
        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
      >
        {(Object.keys(choices) as T[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: key === value }}
            onPress={() => onChange(key)}
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: key === value ? colors.accent : colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary }}>{choices[key]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function CardSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const colors = useColors();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <Text style={{ color: colors.textPrimary, flex: 1 }}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );
}
