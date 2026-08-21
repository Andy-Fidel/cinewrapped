import type {
  MediaTrackingState,
  PrivacySettingsSummary,
  ReviewAssistantResult,
  ReviewAssistantStyle,
  ReviewSummary,
  WatchStatus,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../lib/api';
import { errorMessage } from '../lib/error-message';
import { haptics } from '../lib/haptics';
import { useAuth } from '../providers/auth-provider';
import { ReviewShareCardModal } from './review-share-card-modal';
import { Button, useColors } from './ui';

const statuses: Array<{ value: WatchStatus; label: string }> = [
  { value: 'PLANNED', label: 'Plan' },
  { value: 'WATCHING', label: 'Watching' },
  { value: 'COMPLETED', label: 'Watched' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'DROPPED', label: 'Dropped' },
  { value: 'REWATCHING', label: 'Rewatching' },
];

const VIBE_TAGS = [
  { id: 'masterpiece', label: '🔥 Masterpiece' },
  { id: 'mind_bending', label: '🤯 Mind-Bending' },
  { id: 'popcorn_fun', label: '🍿 Popcorn Fun' },
  { id: 'tearjerker', label: '💔 Tearjerker' },
  { id: 'stellar_acting', label: '🎭 Stellar Acting' },
  { id: 'visual_art', label: '🎨 Visual Art' },
  { id: 'slow_burn', label: '🕯️ Slow Burn' },
  { id: 'feel_good', label: '✨ Feel Good' },
  { id: 'adrenaline', label: '⚡ Adrenaline' },
];

const VIEWING_FORMATS = [
  { id: 'THEATER', label: '🎟️ In Theaters' },
  { id: 'STREAM_4K', label: '📺 4K Stream' },
  { id: 'PHYSICAL', label: '💿 Criterion / Disc' },
];

function operationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (character) => {
    const value = Math.floor(Math.random() * 16);
    const digit = character === 'x' ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

interface TrackingPanelProps {
  mediaId: string;
  mediaTitle?: string;
  posterUrl?: string | null;
  releaseDate?: string | null;
  genres?: Array<{ id: string; name: string }>;
}

export function TrackingPanel({
  mediaId,
  mediaTitle = 'Movie',
  posterUrl = null,
  releaseDate = null,
  genres = [],
}: TrackingPanelProps) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [reviewBody, setReviewBody] = useState<string | null>(null);
  const [favoriteQuote, setFavoriteQuote] = useState<string>('');
  const [selectedVibeTags, setSelectedVibeTags] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [spoilers, setSpoilers] = useState<boolean | null>(null);
  const [assistantStyle, setAssistantStyle] = useState<ReviewAssistantStyle>('SHORT');
  const [assistedDraft, setAssistedDraft] = useState(false);
  const [draftApproved, setDraftApproved] = useState(false);
  const [shareReviewActivity, setShareReviewActivity] = useState(false);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [isShareCardOpen, setIsShareCardOpen] = useState(false);

  const tracking = useQuery({
    queryKey: ['tracking-state', mediaId],
    queryFn: () => api.request<MediaTrackingState>(`library/media/${mediaId}`),
  });

  const privacy = useQuery({
    queryKey: ['privacy-settings'],
    queryFn: () => api.request<PrivacySettingsSummary>('users/me/privacy'),
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tracking-state', mediaId] }),
      queryClient.invalidateQueries({ queryKey: ['media-reviews', mediaId] }),
      queryClient.invalidateQueries({ queryKey: ['library'] }),
      queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
    ]);
  };

  const statusMutation = useMutation({
    mutationFn: (status: WatchStatus) => {
      haptics.clapperSnap();
      return api.request(`library/media/${mediaId}/status`, {
        method: 'PUT',
        body: {
          status,
          ...(tracking.data?.library === null || tracking.data?.library === undefined
            ? {}
            : { expectedVersion: tracking.data.library.version }),
        },
      });
    },
    onSuccess: refresh,
  });

  const watchedMutation = useMutation({
    mutationFn: () => {
      haptics.clapperSnap();
      return api.request(`library/media/${mediaId}/viewings`, {
        method: 'POST',
        body: {
          clientOperationId: operationId(),
          watchedAt: new Date().toISOString(),
          completed: true,
        },
      });
    },
    onSuccess: refresh,
  });

  const watchlistMutation = useMutation({
    mutationFn: () => {
      haptics.heartReact();
      return api.request('watchlist/items', { method: 'POST', body: { mediaId } });
    },
    onSuccess: refresh,
  });

  const ratingMutation = useMutation({
    mutationFn: (ratingValue: number) => {
      haptics.ratingStep();
      return api.request(`media/${mediaId}/rating`, {
        method: 'PUT',
        body: {
          ratingValue,
          ratingScale: 5,
          ...(tracking.data?.rating === null || tracking.data?.rating === undefined
            ? {}
            : { expectedVersion: tracking.data.rating.version }),
        },
      });
    },
    onSuccess: refresh,
  });

  const toggleVibeTag = (tagId: string) => {
    haptics.selection();
    setSelectedVibeTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const reviewMutation = useMutation({
    mutationFn: async () => {
      const existing = tracking.data?.latestReview;
      let finalBody = reviewBody ?? existing?.body ?? '';

      // Format with Quote if entered
      if (favoriteQuote.trim()) {
        finalBody = `« ${favoriteQuote.trim()} »\n\n${finalBody}`;
      }

      const containsSpoilers = spoilers ?? existing?.containsSpoilers ?? false;
      const review =
        existing === null || existing === undefined
          ? await api.request<ReviewSummary>(`media/${mediaId}/reviews`, {
              method: 'POST',
              body: {
                body: finalBody,
                containsSpoilers,
                status: 'PUBLISHED',
                visibility: 'PUBLIC',
              },
            })
          : await api.request<ReviewSummary>(`reviews/${existing.id}`, {
              method: 'PATCH',
              body: {
                body: finalBody,
                containsSpoilers,
                status: 'PUBLISHED',
                expectedVersion: existing.version,
              },
            });
      let sharingEnabled = privacy.data?.shareReviewActivity === true;
      let sharingFailed = false;
      if (!sharingEnabled && shareReviewActivity) {
        try {
          const updatedPrivacy = await api.request<PrivacySettingsSummary>('users/me/privacy', {
            method: 'PATCH',
            body: { shareReviewActivity: true },
          });
          queryClient.setQueryData(['privacy-settings'], updatedPrivacy);
          sharingEnabled = true;
        } catch {
          sharingFailed = true;
        }
      }
      return { review, sharingEnabled, sharingFailed };
    },
    onSuccess: async ({ sharingEnabled, sharingFailed }) => {
      haptics.celebration();
      setReviewBody(null);
      setFavoriteQuote('');
      setSpoilers(null);
      setAssistedDraft(false);
      setDraftApproved(false);
      setShareReviewActivity(false);
      setReviewNotice(
        sharingFailed
          ? 'Review published, but Social sharing could not be enabled. You can enable it in Settings.'
          : sharingEnabled
            ? 'Review published and shared to your Social feed.'
            : 'Review published. Social sharing remains off in your privacy settings.',
      );
      await Promise.all([
        refresh(),
        queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['media-reviews', mediaId] }),
      ]);
    },
    onError: (error) => setReviewNotice(errorMessage(error)),
  });

  const assistantMutation = useMutation({
    mutationFn: () =>
      api.request<ReviewAssistantResult>('ai/reviews/assist', {
        method: 'POST',
        body: {
          mediaId,
          notes: currentReviewBody,
          style: assistantStyle,
          containsSpoilers,
        },
      }),
    onSuccess: (result) => {
      setReviewBody(result.draft);
      setAssistedDraft(true);
      setDraftApproved(false);
    },
  });

  if (tracking.isPending) {
    return <Text style={{ color: colors.textSecondary }}>Loading your tracking state…</Text>;
  }
  if (tracking.isError) {
    return (
      <Text style={{ color: colors.danger }}>Your tracking controls could not be loaded.</Text>
    );
  }
  const state = tracking.data;
  const existingReview = state.latestReview;
  const currentReviewBody = reviewBody ?? existingReview?.body ?? '';
  const containsSpoilers = spoilers ?? existingReview?.containsSpoilers ?? false;

  return (
    <View style={[styles.panel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.heading, { color: colors.textPrimary }]}>Your activity</Text>

      {/* Watch Status Chips */}
      <View style={styles.chips}>
        {statuses.map((status) => {
          const selected = state.library?.status === status.value;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              disabled={statusMutation.isPending}
              key={status.value}
              onPress={() => statusMutation.mutate(status.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                  borderColor: selected ? colors.brand : colors.border,
                },
              ]}
            >
              <Text style={{ color: selected ? colors.onBrand : colors.textPrimary, fontWeight: selected ? '800' : '600' }}>
                {status.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={
              state.watchlists.some((list) => list.isDefault) ? 'In watchlist' : 'Add to watchlist'
            }
            variant="secondary"
            disabled={state.watchlists.some((list) => list.isDefault)}
            loading={watchlistMutation.isPending}
            onPress={() => watchlistMutation.mutate()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Log watched"
            loading={watchedMutation.isPending}
            onPress={() => watchedMutation.mutate()}
          />
        </View>
      </View>

      {/* 5-Star Rating Section */}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Your Rating</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((value) => {
            const isSelected =
              (state.rating?.ratingValue ?? 0) >= value && state.rating?.ratingScale === 5;
            return (
              <Pressable
                accessibilityLabel={`${value} out of 5 stars`}
                accessibilityRole="button"
                key={value}
                onPress={() => ratingMutation.mutate(value)}
                style={({ pressed }) => [
                  styles.ratingStarBtn,
                  { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Ionicons
                  name={isSelected ? 'star' : 'star-outline'}
                  size={24}
                  color={isSelected ? '#F59E0B' : colors.textDisabled}
                />
                <Text style={{ color: isSelected ? '#F59E0B' : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
                  {value}★
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Cinema Vibe Tags (3 in a Row Horizontally) */}
      <View style={{ gap: 8 }}>
        <View style={styles.vibeHeaderRow}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>Cinema Vibe Tags</Text>
          {selectedVibeTags.length > 0 ? (
            <Text style={[styles.vibeCountBadge, { color: colors.brand }]}>
              {selectedVibeTags.length} selected
            </Text>
          ) : null}
        </View>
        <View style={styles.vibeGrid}>
          {VIBE_TAGS.map((tag) => {
            const isSelected = selectedVibeTags.includes(tag.id);
            return (
              <Pressable
                key={tag.id}
                onPress={() => toggleVibeTag(tag.id)}
                style={({ pressed }) => [
                  styles.vibeTagCard,
                  {
                    backgroundColor: isSelected ? 'rgba(245, 158, 11, 0.16)' : colors.surfaceRaised,
                    borderColor: isSelected ? '#F59E0B' : colors.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    color: isSelected ? '#F59E0B' : colors.textPrimary,
                    fontWeight: isSelected ? '800' : '600',
                    fontSize: 12,
                    textAlign: 'center',
                  }}
                >
                  {tag.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Viewing Format Experience */}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Viewing Format</Text>
        <View style={styles.chips}>
          {VIEWING_FORMATS.map((fmt) => {
            const isSelected = selectedFormat === fmt.id;
            return (
              <Pressable
                key={fmt.id}
                onPress={() => {
                  haptics.selection();
                  setSelectedFormat(isSelected ? null : fmt.id);
                }}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.surfaceRaised,
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text style={{ color: isSelected ? colors.onBrand : colors.textSecondary, fontWeight: isSelected ? '800' : '500', fontSize: 12 }}>
                  {fmt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Favorite Quote Pullout Input */}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Favorite Dialogue / Quote (Optional)</Text>
        <TextInput
          accessibilityLabel="Favorite Quote"
          onChangeText={setFavoriteQuote}
          placeholder="« Add your favorite line from the movie… »"
          placeholderTextColor={colors.textDisabled}
          style={[styles.quoteInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceRaised }]}
          value={favoriteQuote}
        />
      </View>

      {/* Review Body Input */}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Your Review</Text>
        <TextInput
          accessibilityLabel="Review"
          multiline
          onChangeText={(value) => {
            setReviewBody(value);
            setReviewNotice(null);
            if (assistedDraft) setDraftApproved(false);
          }}
          placeholder="What did you think of the cinematography, story, and performances?"
          placeholderTextColor={colors.textDisabled}
          style={[styles.review, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceRaised }]}
          value={currentReviewBody}
        />
      </View>

      {/* Review Assistant */}
      <Text style={[styles.label, { color: colors.textPrimary }]}>AI Review Assistant</Text>
      <View style={styles.chips}>
        {(['SHORT', 'DETAILED', 'FUNNY', 'SPOILER_FREE', 'SOCIAL_CAPTION'] as const).map(
          (style) => {
            const selected = assistantStyle === style;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={style}
                onPress={() => setAssistantStyle(style)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.brand : colors.surfaceRaised,
                    borderColor: selected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text style={{ color: selected ? colors.onBrand : colors.textPrimary, fontSize: 12 }}>
                  {style.replaceAll('_', ' ').toLowerCase()}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>

      <Button
        disabled={currentReviewBody.trim().length < 3}
        label="Rewrite from my notes"
        loading={assistantMutation.isPending}
        onPress={() => assistantMutation.mutate()}
        variant="secondary"
      />

      {assistedDraft ? (
        <View style={[styles.assistantNotice, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            Assisted draft · local grounded source
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 19 }}>
            This draft uses only your notes and title facts. Edit it freely, then approve it before
            publishing.
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: draftApproved }}
            onPress={() => setDraftApproved((value) => !value)}
          >
            <Text style={{ color: colors.textPrimary }}>
              {draftApproved ? '☑' : '☐'} I reviewed and approve this draft
            </Text>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: containsSpoilers }}
        onPress={() => setSpoilers((value) => !(value ?? containsSpoilers))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
      >
        <Ionicons
          name={containsSpoilers ? 'checkbox' : 'square-outline'}
          size={20}
          color={containsSpoilers ? '#EF4444' : colors.textSecondary}
        />
        <Text style={{ color: containsSpoilers ? '#EF4444' : colors.textSecondary, fontWeight: '600' }}>
          Contains spoilers (Will activate Spoiler Shield for readers)
        </Text>
      </Pressable>

      {privacy.data?.shareReviewActivity === true ? (
        <View style={[styles.shareNotice, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Social sharing is on</Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 18 }}>
            Publishing will also add this review activity to your Social feed.
          </Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: shareReviewActivity }}
          disabled={privacy.isPending}
          onPress={() => setShareReviewActivity((value) => !value)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}
        >
          <Ionicons
            name={shareReviewActivity ? 'checkbox' : 'square-outline'}
            size={20}
            color={colors.brand}
          />
          <Text style={{ color: colors.textSecondary }}>
            Also share published review to Social feed
          </Text>
        </Pressable>
      )}

      <Button
        disabled={currentReviewBody.trim().length === 0 || (assistedDraft && !draftApproved)}
        label={existingReview === null ? 'Publish review' : 'Update review'}
        loading={reviewMutation.isPending}
        onPress={() => reviewMutation.mutate()}
      />

      {/* Visual CineWrapped Share Card Generator Button */}
      {currentReviewBody.trim().length > 0 ? (
        <Button
          label="✨ CineWrapped Share Card"
          variant="secondary"
          onPress={() => {
            haptics.selection();
            setIsShareCardOpen(true);
          }}
        />
      ) : null}

      {reviewNotice === null ? null : (
        <Text accessibilityRole="alert" style={{ color: colors.textSecondary, lineHeight: 19 }}>
          {reviewNotice}
        </Text>
      )}

      {[
        statusMutation,
        watchedMutation,
        watchlistMutation,
        ratingMutation,
        reviewMutation,
        assistantMutation,
      ].some((mutation) => mutation.isError) ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          That change could not be saved. Refresh and try again.
        </Text>
      ) : null}

      {/* Review Share Card Modal */}
      {isShareCardOpen ? (
        <ReviewShareCardModal
          media={{
            id: mediaId,
            title: mediaTitle,
            posterUrl,
            releaseDate,
            genres,
          }}
          onClose={() => setIsShareCardOpen(false)}
          review={{
            body: currentReviewBody,
            ratingValue: state.rating?.ratingValue ?? null,
            quote: favoriteQuote.trim() || null,
            vibeTags: selectedVibeTags,
            user: {
              displayName: user?.displayName,
              handle: user?.username,
              avatarUrl: user?.avatarUrl,
            },
          }}
          visible={isShareCardOpen}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 18, borderWidth: 1, gap: 14, padding: 16 },
  heading: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  vibeHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vibeCountBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeTagCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    paddingHorizontal: 4,
    width: '31.4%',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  ratingStarBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  quoteInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontStyle: 'italic',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  review: {
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 100,
    padding: 12,
    textAlignVertical: 'top',
  },
  assistantNotice: { borderRadius: 12, gap: 8, padding: 12 },
  shareNotice: { borderRadius: 12, gap: 4, padding: 12 },
});
