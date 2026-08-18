import type {
  SceneIdentificationCandidate,
  SceneIdentificationSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Redirect, Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { identifySceneFromAsset } from '../../src/lib/scene-identification';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

function ConfidenceBadge({ value, size = 'medium' }: { value: number; size?: 'small' | 'medium' }) {
  const isHigh = value >= 80;
  const isMedium = value >= 55;

  const bgTone = isHigh
    ? 'rgba(16, 185, 129, 0.15)'
    : isMedium
      ? 'rgba(245, 158, 11, 0.15)'
      : 'rgba(239, 68, 68, 0.15)';
  const borderTone = isHigh ? '#10B981' : isMedium ? '#F59E0B' : '#EF4444';
  const textTone = isHigh ? '#10B981' : isMedium ? '#F59E0B' : '#EF4444';

  return (
    <View
      style={[
        styles.confidencePill,
        { backgroundColor: bgTone, borderColor: borderTone },
        size === 'small' && styles.confidencePillSmall,
      ]}
    >
      <View style={[styles.confidenceDot, { backgroundColor: textTone }]} />
      <Text
        style={[
          styles.confidenceValue,
          { color: textTone },
          size === 'small' && styles.confidenceValueSmall,
        ]}
      >
        {value}% Match
      </Text>
    </View>
  );
}

function EvidenceChip({ text }: { text: string }) {
  const colors = useColors();
  let iconName: keyof typeof Ionicons.glyphMap = 'sparkles-outline';
  const lower = text.toLowerCase();
  if (lower.includes('actor') || lower.includes('character') || lower.includes('face')) {
    iconName = 'person-outline';
  } else if (lower.includes('costume') || lower.includes('wearing') || lower.includes('suit')) {
    iconName = 'shirt-outline';
  } else if (
    lower.includes('location') ||
    lower.includes('setting') ||
    lower.includes('city') ||
    lower.includes('room')
  ) {
    iconName = 'location-outline';
  } else if (lower.includes('color') || lower.includes('lighting') || lower.includes('tone')) {
    iconName = 'color-palette-outline';
  } else if (lower.includes('car') || lower.includes('vehicle') || lower.includes('ship')) {
    iconName = 'car-outline';
  }

  return (
    <View
      style={[
        styles.evidenceChip,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
      ]}
    >
      <Ionicons name={iconName} size={11} color={colors.brand} />
      <Text numberOfLines={2} style={[styles.evidenceChipText, { color: colors.textSecondary }]}>
        {text}
      </Text>
    </View>
  );
}

function CandidateCard({
  candidate,
  isTopCandidate,
  selected,
  disabled,
  onConfirm,
}: {
  candidate: SceneIdentificationCandidate;
  isTopCandidate: boolean;
  selected: boolean;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.candidateCard,
        {
          backgroundColor: colors.surface,
          borderColor: selected ? '#10B981' : isTopCandidate ? colors.brand : colors.border,
          borderWidth: isTopCandidate || selected ? 1.5 : 1,
        },
      ]}
    >
      {/* Top Banner Tag if top match */}
      {isTopCandidate && !selected && (
        <View style={[styles.topMatchBanner, { backgroundColor: colors.brand }]}>
          <Ionicons name="sparkles" size={10} color={colors.onBrand} />
          <Text style={[styles.topMatchBannerText, { color: colors.onBrand }]}>
            TOP MATCH CANDIDATE
          </Text>
        </View>
      )}

      <View style={styles.candidateRow}>
        {/* Poster Thumbnail */}
        {candidate.media?.posterUrl ? (
          <Image
            source={{ uri: candidate.media.posterUrl }}
            style={styles.candidatePoster}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.candidatePoster,
              styles.posterFallback,
              { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          >
            <Ionicons color={colors.textDisabled} name="film-outline" size={24} />
          </View>
        )}

        {/* Info Column */}
        <View style={styles.candidateContent}>
          <View style={styles.candidateHeaderRow}>
            <Text
              numberOfLines={2}
              style={[styles.candidateTitleText, { color: colors.textPrimary }]}
            >
              {candidate.media?.title ?? candidate.suggestedTitle}
            </Text>
            <ConfidenceBadge size="small" value={candidate.confidence} />
          </View>

          <Text style={[styles.candidateMetaText, { color: colors.textSecondary }]}>
            {candidate.media?.releaseYear ?? candidate.suggestedYear ?? 'Year unknown'} ·{' '}
            {candidate.media?.mediaType === 'TV' ? 'TV Series' : 'Feature Film'}
            {candidate.media?.averageProviderRating
              ? ` · ★ ${candidate.media.averageProviderRating.toFixed(1)}`
              : ''}
          </Text>

          {/* Evidence tags */}
          {candidate.evidence.length > 0 && (
            <View style={styles.evidenceContainer}>
              {candidate.evidence.slice(0, 2).map((item) => (
                <EvidenceChip key={item} text={item} />
              ))}
            </View>
          )}

          {/* Action Bar */}
          <View style={styles.candidateActionRow}>
            {candidate.media && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/media/${candidate.media?.id}`)}
                style={[
                  styles.candidateDetailsBtn,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.candidateDetailsBtnText, { color: colors.textPrimary }]}>
                  View Details
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
              </Pressable>
            )}

            {candidate.media && !selected && (
              <Pressable
                accessibilityRole="button"
                disabled={disabled}
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.confirmMatchBtn,
                  {
                    backgroundColor: colors.brand,
                    opacity: disabled || pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons color={colors.onBrand} name="checkmark-circle-outline" size={15} />
                <Text style={[styles.confirmMatchBtnText, { color: colors.onBrand }]}>
                  Confirm Match
                </Text>
              </Pressable>
            )}

            {selected && (
              <View
                style={[styles.confirmedBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}
              >
                <Ionicons color="#10B981" name="checkmark-circle" size={16} />
                <Text style={styles.confirmedBadgeText}>Confirmed Match</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function ResultCard({
  result,
  busy,
  onConfirm,
  onReject,
  onDelete,
}: {
  result: SceneIdentificationSummary;
  busy: boolean;
  onConfirm: (mediaId: string) => void;
  onReject: () => void;
  onDelete?: (() => void) | undefined;
}) {
  const colors = useColors();
  const isRejected = result.feedback === 'REJECTED';

  return (
    <View
      style={[
        styles.resultContainer,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Result Top Telemetry */}
      <View style={styles.resultHeaderBar}>
        <View style={styles.resultStatusGroup}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  result.status === 'MATCHED'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : result.status === 'UNCERTAIN'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)',
              },
            ]}
          >
            <Ionicons
              name={
                result.status === 'MATCHED'
                  ? 'checkmark-circle'
                  : result.status === 'UNCERTAIN'
                    ? 'help-circle'
                    : 'alert-circle'
              }
              size={14}
              color={
                result.status === 'MATCHED'
                  ? '#10B981'
                  : result.status === 'UNCERTAIN'
                    ? '#F59E0B'
                    : '#EF4444'
              }
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    result.status === 'MATCHED'
                      ? '#10B981'
                      : result.status === 'UNCERTAIN'
                        ? '#F59E0B'
                        : '#EF4444',
                },
              ]}
            >
              {result.status === 'MATCHED'
                ? 'High Confidence Match'
                : result.status === 'UNCERTAIN'
                  ? 'Candidate Matches'
                  : 'No Confident Match'}
            </Text>
          </View>

          {result.status !== 'NO_MATCH' && <ConfidenceBadge value={result.confidence} />}
        </View>

        {/* Telemetry pill */}
        <View style={[styles.telemetryPill, { backgroundColor: colors.surfaceRaised }]}>
          <Ionicons name="flash-outline" size={11} color={colors.textSecondary} />
          <Text style={[styles.telemetryText, { color: colors.textSecondary }]}>
            {result.processingMs}ms · {result.model.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Script Breakdown / Scene Description Box */}
      <View
        style={[
          styles.synopsisBox,
          { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
        ]}
      >
        <View style={styles.synopsisHeader}>
          <Ionicons name="document-text-outline" size={13} color={colors.brand} />
          <Text style={[styles.synopsisEyebrow, { color: colors.brand }]}>
            VISUAL FORENSIC ANALYSIS
          </Text>
        </View>
        <Text style={[styles.synopsisText, { color: colors.textPrimary }]}>
          "{result.sceneDescription}"
        </Text>
      </View>

      {/* Candidate List */}
      <View style={styles.candidateList}>
        {result.candidates.map((candidate, idx) => (
          <CandidateCard
            candidate={candidate}
            disabled={busy}
            isTopCandidate={idx === 0}
            key={`${candidate.suggestedTitle}-${candidate.suggestedYear ?? 'unknown'}`}
            onConfirm={() => candidate.media && onConfirm(candidate.media.id)}
            selected={
              result.feedback === 'CONFIRMED' && result.matchedMedia?.id === candidate.media?.id
            }
          />
        ))}
      </View>

      {/* Feedback Bar */}
      {result.feedback === 'PENDING' && result.candidates.length > 0 && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={onReject}
          style={styles.rejectFeedbackBtn}
        >
          <Ionicons color={colors.danger} name="close-circle-outline" size={16} />
          <Text style={[styles.rejectFeedbackText, { color: colors.danger }]}>
            None of these candidates match this frame
          </Text>
        </Pressable>
      )}

      {isRejected && (
        <View style={[styles.feedbackBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
          <Ionicons name="close-circle" size={15} color={colors.danger} />
          <Text style={[styles.feedbackBannerText, { color: colors.danger }]}>
            Marked as unverified / not matched
          </Text>
        </View>
      )}

      {/* Footer Notice & Delete */}
      <View style={styles.resultFooter}>
        <Text style={[styles.noticeText, { color: colors.textDisabled }]}>{result.notice}</Text>
        {onDelete && (
          <Pressable
            accessibilityLabel="Delete scene result"
            accessibilityRole="button"
            disabled={busy}
            onPress={onDelete}
            hitSlop={8}
            style={styles.deleteBtn}
          >
            <Ionicons color={colors.textDisabled} name="trash-outline" size={15} />
            <Text style={[styles.deleteBtnText, { color: colors.textDisabled }]}>Delete</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function SceneIdentificationScreen() {
  const colors = useColors();
  const { session, user } = useAuth();
  const { confirm, showError } = useDialog();
  const client = useQueryClient();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [latest, setLatest] = useState<SceneIdentificationSummary | null>(null);
  const [scanningStep, setScanningStep] = useState(0);

  const history = useQuery({
    queryKey: ['scene-identifications'],
    queryFn: () => api.request<SceneIdentificationSummary[]>('scene-identifications?limit=20'),
    enabled: session !== null,
  });

  const identify = useMutation({
    mutationFn: async () => {
      if (asset === null || session === null) throw new Error('Choose a screenshot first.');
      return identifySceneFromAsset({
        asset,
        ownerId: session.user.id,
        language: user?.preferredLanguage ?? 'en-US',
        countryCode: user?.countryCode ?? 'US',
      });
    },
    onSuccess: async (result) => {
      setLatest(result);
      setAsset(null);
      setAcknowledged(false);
      await client.invalidateQueries({ queryKey: ['scene-identifications'] });
    },
    onError: (error) => showError('Could not identify scene', errorMessage(error)),
  });

  const feedback = useMutation({
    mutationFn: ({
      id,
      action,
      mediaId,
    }: {
      id: string;
      action: 'CONFIRM' | 'REJECT';
      mediaId?: string;
    }) =>
      api.request<SceneIdentificationSummary>(`scene-identifications/${id}/feedback`, {
        method: 'PATCH',
        body: { action, ...(mediaId === undefined ? {} : { mediaId }) },
      }),
    onSuccess: async (result) => {
      setLatest((current) => (current?.id === result.id ? result : current));
      await client.invalidateQueries({ queryKey: ['scene-identifications'] });
    },
    onError: (error) => showError('Could not update result', errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      api.request<{ id: string }>(`scene-identifications/${id}`, { method: 'DELETE' }),
    onSuccess: async ({ id }) => {
      setLatest((current) => (current?.id === id ? null : current));
      await client.invalidateQueries({ queryKey: ['scene-identifications'] });
    },
    onError: (error) => showError('Could not delete result', errorMessage(error)),
  });

  // Dynamic status text ticker during analysis
  useEffect(() => {
    if (!identify.isPending) {
      setScanningStep(0);
      return;
    }
    const interval = setInterval(() => {
      setScanningStep((prev) => (prev + 1) % 3);
    }, 1800);
    return () => clearInterval(interval);
  }, [identify.isPending]);

  const scanningSteps = [
    'Extracting visual features & cinematic composition…',
    'Cross-referencing actors, wardrobe & TMDB catalog…',
    'Computing neural confidence weights & rankings…',
  ];

  if (session === null) return <Redirect href="/(auth)/login" />;

  const pick = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      const openSettings = await confirm({
        title: 'Photo access is off',
        message: `Allow ${source === 'camera' ? 'camera' : 'photo'} access in Settings to choose a frame.`,
        confirmLabel: 'Open Settings',
        cancelLabel: 'Not now',
      });
      if (openSettings) await Linking.openSettings();
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    const next = result.canceled ? undefined : result.assets[0];
    if (next) {
      setAsset(next);
      setLatest(null);
      setAcknowledged(false);
    }
  };

  const busy = identify.isPending || feedback.isPending || remove.isPending;

  const deleteResult = async (id: string) => {
    const accepted = await confirm({
      title: 'Delete scene result?',
      message: 'This result will be permanently removed from your detection history.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (accepted) remove.mutate(id);
  };

  return (
    <FeatureGate feature="SCENE_IDENTIFICATION">
      <Screen>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Identify a Scene',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />

        {/* Hero Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.brand }]}>CINEMA AI RECOGNITION</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            Identify Film Stills
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Upload or capture any movie or TV frame to instantly detect the title, cast, and year.
          </Text>
        </View>

        {/* Anamorphic Lens Viewfinder / Upload HUD */}
        <View
          style={[
            styles.scannerHUD,
            { backgroundColor: colors.surface, borderColor: asset ? colors.brand : colors.border },
          ]}
        >
          {/* Viewfinder Viewport */}
          <View style={styles.viewfinderContainer}>
            {asset ? (
              <View style={styles.previewWrapper}>
                <Image source={{ uri: asset.uri }} resizeMode="cover" style={styles.previewImage} />
                <View style={styles.previewOverlay}>
                  <View style={styles.aspectRatioTag}>
                    <Text style={styles.aspectRatioText}>CINEMA FRAME</Text>
                  </View>
                  <Pressable
                    accessibilityLabel="Change frame"
                    onPress={() => setAsset(null)}
                    style={styles.changeFrameBtn}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.previewPlaceholder, { backgroundColor: colors.surfaceRaised }]}>
                {/* Viewfinder Corner Reticles */}
                <View
                  style={[styles.reticle, styles.reticleTopLeft, { borderColor: colors.brand }]}
                />
                <View
                  style={[styles.reticle, styles.reticleTopRight, { borderColor: colors.brand }]}
                />
                <View
                  style={[styles.reticle, styles.reticleBottomLeft, { borderColor: colors.brand }]}
                />
                <View
                  style={[styles.reticle, styles.reticleBottomRight, { borderColor: colors.brand }]}
                />

                <View
                  style={[
                    styles.scanIconCircle,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons color={colors.brand} name="scan" size={32} />
                </View>

                <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
                  Position or upload a film frame
                </Text>
                <Text style={[styles.placeholderHint, { color: colors.textSecondary }]}>
                  High-res movie stills, streaming screencaps, or cinema photos
                </Text>
              </View>
            )}

            {/* Scanning Laser / Loading Animation Overlay */}
            {identify.isPending && (
              <View style={styles.scanningOverlay}>
                <View style={[styles.laserBeam, { backgroundColor: colors.brand }]} />
                <View style={styles.scanningStatusBox}>
                  <ActivityIndicator color={colors.brand} size="small" />
                  <Text style={[styles.scanningStatusText, { color: colors.textPrimary }]}>
                    {scanningSteps[scanningStep]}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Dual Source Pickers */}
          <View style={styles.sourceButtonsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void pick('library')}
              style={({ pressed }) => [
                styles.sourceButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: busy || pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="images-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.sourceButtonText, { color: colors.textPrimary }]}>
                Choose Still
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void pick('camera')}
              style={({ pressed }) => [
                styles.sourceButton,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.border,
                  opacity: busy || pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons name="camera-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.sourceButtonText, { color: colors.textPrimary }]}>
                Snap Frame
              </Text>
            </Pressable>
          </View>

          {/* Ephemeral Privacy Pill */}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acknowledged }}
            disabled={asset === null || busy}
            onPress={() => setAcknowledged((value) => !value)}
            style={({ pressed }) => [
              styles.privacyPill,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: acknowledged ? colors.brand : colors.border,
                opacity: asset === null ? 0.45 : pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons
              color={acknowledged ? colors.brand : colors.textDisabled}
              name={acknowledged ? 'shield-checkmark' : 'shield-outline'}
              size={20}
            />
            <View style={styles.privacyCopy}>
              <Text style={[styles.privacyTitle, { color: colors.textPrimary }]}>
                Ephemeral Private Processing
              </Text>
              <Text style={[styles.privacyBody, { color: colors.textSecondary }]}>
                I agree to send this frame to OpenAI for recognition. Temporary cloud copies are
                purged immediately after analysis.
              </Text>
            </View>
          </Pressable>

          {/* Primary Action Button */}
          <Pressable
            accessibilityRole="button"
            disabled={asset === null || !acknowledged || identify.isPending}
            onPress={() => identify.mutate()}
            style={({ pressed }) => [
              styles.identifyBtn,
              {
                backgroundColor: colors.brand,
                opacity: asset === null || !acknowledged || identify.isPending || pressed ? 0.6 : 1,
              },
            ]}
          >
            {identify.isPending ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <View style={styles.identifyBtnContent}>
                <Ionicons name="sparkles" size={18} color={colors.onBrand} />
                <Text style={[styles.identifyBtnText, { color: colors.onBrand }]}>
                  Analyze Scene & Detect Movie
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* Latest Identified Result */}
        {latest && (
          <View style={styles.latestSection}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sparkles" size={18} color={colors.brand} />
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Latest AI Detection
              </Text>
            </View>
            <ResultCard
              busy={busy}
              onConfirm={(mediaId) =>
                feedback.mutate({ id: latest.id, action: 'CONFIRM', mediaId })
              }
              onDelete={() => void deleteResult(latest.id)}
              onReject={() => feedback.mutate({ id: latest.id, action: 'REJECT' })}
              result={latest}
            />
          </View>
        )}

        {/* Search History / Film Stills Archive */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <View style={styles.historyTitleGroup}>
              <Ionicons name="time-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>
                Recent Detections
              </Text>
              {(history.data?.length ?? 0) > 0 && (
                <View style={[styles.countBadge, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.countBadgeText, { color: colors.textSecondary }]}>
                    {history.data?.length}
                  </Text>
                </View>
              )}
            </View>
            {history.isError && (
              <Pressable onPress={() => void history.refetch()}>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>Retry</Text>
              </Pressable>
            )}
          </View>

          {history.isPending && (
            <View style={styles.loadingHistory}>
              <ActivityIndicator color={colors.brand} />
              <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                Loading scene detections…
              </Text>
            </View>
          )}

          {history.data
            ?.filter((item) => item.id !== latest?.id)
            .map((item) => (
              <ResultCard
                busy={busy}
                key={item.id}
                onConfirm={(mediaId) =>
                  feedback.mutate({ id: item.id, action: 'CONFIRM', mediaId })
                }
                onDelete={() => void deleteResult(item.id)}
                onReject={() => feedback.mutate({ id: item.id, action: 'REJECT' })}
                result={item}
              />
            ))}

          {!history.isPending && (history.data?.length ?? 0) === 0 && latest === null && (
            <View
              style={[
                styles.emptyHistoryCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="film-outline" size={36} color={colors.textDisabled} />
              <Text style={[styles.emptyHistoryTitle, { color: colors.textPrimary }]}>
                No film stills analyzed yet
              </Text>
              <Text style={[styles.emptyHistorySubtitle, { color: colors.textSecondary }]}>
                Snap or upload a screenshot from your favorite movie or show to test the neural
                recognition model.
              </Text>
            </View>
          )}
        </View>
      </Screen>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8, marginBottom: 8, marginTop: 16 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 20 },

  // Scanner HUD
  scannerHUD: {
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 14,
    marginTop: 8,
    padding: 16,
  },
  viewfinderContainer: {
    borderRadius: 16,
    height: 220,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  previewWrapper: { height: '100%', position: 'relative', width: '100%' },
  previewImage: { height: '100%', width: '100%' },
  previewOverlay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 12,
    position: 'absolute',
    right: 12,
    top: 12,
  },
  aspectRatioTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aspectRatioText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  changeFrameBtn: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },

  // Reticles
  previewPlaceholder: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
    width: '100%',
  },
  reticle: {
    borderColor: '#7C3AED',
    height: 24,
    position: 'absolute',
    width: 24,
  },
  reticleTopLeft: { borderLeftWidth: 2.5, borderTopWidth: 2.5, left: 16, top: 16 },
  reticleTopRight: { borderRightWidth: 2.5, borderTopWidth: 2.5, right: 16, top: 16 },
  reticleBottomLeft: { borderBottomWidth: 2.5, borderLeftWidth: 2.5, bottom: 16, left: 16 },
  reticleBottomRight: { borderBottomWidth: 2.5, borderRightWidth: 2.5, bottom: 16, right: 16 },
  scanIconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: 10,
    width: 60,
  },
  placeholderTitle: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  placeholderHint: { fontSize: 12, marginTop: 4, textAlign: 'center' },

  // Laser Overlay
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
  },
  laserBeam: {
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '45%',
  },
  scanningStatusBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  scanningStatusText: { fontSize: 12, fontWeight: '700' },

  // Source Buttons
  sourceButtonsRow: { flexDirection: 'row', gap: 10 },
  sourceButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  sourceButtonText: { fontSize: 14, fontWeight: '700' },

  // Privacy
  privacyPill: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  privacyCopy: { flex: 1, gap: 2 },
  privacyTitle: { fontSize: 13, fontWeight: '700' },
  privacyBody: { fontSize: 11, lineHeight: 16 },

  // Identify Action
  identifyBtn: {
    alignItems: 'center',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 20,
  },
  identifyBtnContent: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  identifyBtnText: { fontSize: 15, fontWeight: '800' },

  // Latest Section
  latestSection: { gap: 10, marginTop: 14 },
  sectionHeaderRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  sectionHeading: { fontSize: 18, fontWeight: '800' },

  // Confidence Pill
  confidencePill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  confidencePillSmall: { paddingHorizontal: 7, paddingVertical: 2 },
  confidenceDot: { borderRadius: 3, height: 6, width: 6 },
  confidenceValue: { fontSize: 12, fontWeight: '800' },
  confidenceValueSmall: { fontSize: 11, fontWeight: '800' },

  // Result Card
  resultContainer: {
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 12,
    padding: 16,
  },
  resultHeaderBar: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  resultStatusGroup: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusPill: {
    alignItems: 'center',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPillText: { fontSize: 11, fontWeight: '800' },
  telemetryPill: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  telemetryText: { fontSize: 10, fontWeight: '600' },

  // Synopsis Box
  synopsisBox: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    padding: 12,
  },
  synopsisHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  synopsisEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  synopsisText: { fontSize: 13, fontStyle: 'italic', lineHeight: 19 },

  // Candidate Cards
  candidateList: { gap: 10 },
  candidateCard: {
    borderRadius: 14,
    gap: 8,
    overflow: 'hidden',
    padding: 12,
  },
  topMatchBanner: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  topMatchBannerText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  candidateRow: { flexDirection: 'row', gap: 12 },
  candidatePoster: { borderRadius: 8, height: 100, width: 68 },
  posterFallback: { alignItems: 'center', borderWidth: 1, justifyContent: 'center' },
  candidateContent: { flex: 1, gap: 4 },
  candidateHeaderRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  candidateTitleText: { flex: 1, fontSize: 15, fontWeight: '800', lineHeight: 19, paddingRight: 6 },
  candidateMetaText: { fontSize: 12, fontWeight: '500' },
  evidenceContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  evidenceChip: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  evidenceChipText: { fontSize: 11 },
  candidateActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  candidateDetailsBtn: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  candidateDetailsBtnText: { fontSize: 11, fontWeight: '700' },
  confirmMatchBtn: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmMatchBtnText: { fontSize: 11, fontWeight: '800' },
  confirmedBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  confirmedBadgeText: { color: '#10B981', fontSize: 11, fontWeight: '800' },

  // Feedback & Footer
  rejectFeedbackBtn: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 6,
  },
  rejectFeedbackText: { fontSize: 12, fontWeight: '700' },
  feedbackBanner: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    padding: 8,
  },
  feedbackBannerText: { fontSize: 12, fontWeight: '600' },
  resultFooter: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  noticeText: { flex: 1, fontSize: 10, lineHeight: 14, paddingRight: 8 },
  deleteBtn: { alignItems: 'center', flexDirection: 'row', gap: 4, padding: 4 },
  deleteBtnText: { fontSize: 11 },

  // History Section
  historySection: { gap: 12, marginTop: 16 },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyTitleGroup: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  historyTitle: { fontSize: 20, fontWeight: '800' },
  countBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 11, fontWeight: '800' },
  loadingHistory: { alignItems: 'center', paddingVertical: 20 },
  emptyHistoryCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 24,
    textAlign: 'center',
  },
  emptyHistoryTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyHistorySubtitle: { fontSize: 12, lineHeight: 17, maxWidth: 280, textAlign: 'center' },
});
