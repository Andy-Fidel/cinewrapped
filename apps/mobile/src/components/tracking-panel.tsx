import type {
  MediaTrackingState,
  ReviewAssistantResult,
  ReviewAssistantStyle,
  WatchStatus,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { api } from '../lib/api';
import { Button, useColors } from './ui';

const statuses: Array<{ value: WatchStatus; label: string }> = [
  { value: 'PLANNED', label: 'Plan' },
  { value: 'WATCHING', label: 'Watching' },
  { value: 'COMPLETED', label: 'Watched' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'DROPPED', label: 'Dropped' },
  { value: 'REWATCHING', label: 'Rewatching' },
];

function operationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/gu, (character) => {
    const value = Math.floor(Math.random() * 16);
    const digit = character === 'x' ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

export function TrackingPanel({ mediaId }: { mediaId: string }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [reviewBody, setReviewBody] = useState<string | null>(null);
  const [spoilers, setSpoilers] = useState<boolean | null>(null);
  const [assistantStyle, setAssistantStyle] = useState<ReviewAssistantStyle>('SHORT');
  const [assistedDraft, setAssistedDraft] = useState(false);
  const [draftApproved, setDraftApproved] = useState(false);
  const tracking = useQuery({
    queryKey: ['tracking-state', mediaId],
    queryFn: () => api.request<MediaTrackingState>(`library/media/${mediaId}`),
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tracking-state', mediaId] }),
      queryClient.invalidateQueries({ queryKey: ['library'] }),
      queryClient.invalidateQueries({ queryKey: ['watchlists'] }),
    ]);
  };
  const statusMutation = useMutation({
    mutationFn: (status: WatchStatus) =>
      api.request(`library/media/${mediaId}/status`, {
        method: 'PUT',
        body: {
          status,
          ...(tracking.data?.library === null || tracking.data?.library === undefined
            ? {}
            : { expectedVersion: tracking.data.library.version }),
        },
      }),
    onSuccess: refresh,
  });
  const watchedMutation = useMutation({
    mutationFn: () =>
      api.request(`library/media/${mediaId}/viewings`, {
        method: 'POST',
        body: {
          clientOperationId: operationId(),
          watchedAt: new Date().toISOString(),
          completed: true,
        },
      }),
    onSuccess: refresh,
  });
  const watchlistMutation = useMutation({
    mutationFn: () => api.request('watchlist/items', { method: 'POST', body: { mediaId } }),
    onSuccess: refresh,
  });
  const ratingMutation = useMutation({
    mutationFn: (ratingValue: number) =>
      api.request(`media/${mediaId}/rating`, {
        method: 'PUT',
        body: {
          ratingValue,
          ratingScale: 5,
          ...(tracking.data?.rating === null || tracking.data?.rating === undefined
            ? {}
            : { expectedVersion: tracking.data.rating.version }),
        },
      }),
    onSuccess: refresh,
  });
  const reviewMutation = useMutation({
    mutationFn: () => {
      const existing = tracking.data?.latestReview;
      const body = reviewBody ?? existing?.body ?? '';
      const containsSpoilers = spoilers ?? existing?.containsSpoilers ?? false;
      return existing === null || existing === undefined
        ? api.request(`media/${mediaId}/reviews`, {
            method: 'POST',
            body: {
              body,
              containsSpoilers,
              status: 'PUBLISHED',
              visibility: 'PUBLIC',
            },
          })
        : api.request(`reviews/${existing.id}`, {
            method: 'PATCH',
            body: {
              body,
              containsSpoilers,
              status: 'PUBLISHED',
              expectedVersion: existing.version,
            },
          });
    },
    onSuccess: async () => {
      setReviewBody(null);
      setSpoilers(null);
      setAssistedDraft(false);
      setDraftApproved(false);
      await refresh();
    },
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
              <Text style={{ color: selected ? colors.onBrand : colors.textPrimary }}>
                {status.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label={
          state.watchlists.some((list) => list.isDefault) ? 'In watchlist' : 'Add to watchlist'
        }
        variant="secondary"
        disabled={state.watchlists.some((list) => list.isDefault)}
        loading={watchlistMutation.isPending}
        onPress={() => watchlistMutation.mutate()}
      />
      <Button
        label="Log watched now"
        loading={watchedMutation.isPending}
        onPress={() => watchedMutation.mutate()}
      />
      <Text style={[styles.label, { color: colors.textPrimary }]}>Your rating</Text>
      <View style={styles.ratingRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const selected = state.rating?.ratingValue === value && state.rating.ratingScale === 5;
          return (
            <Pressable
              accessibilityLabel={`${value} out of 5`}
              accessibilityRole="button"
              key={value}
              onPress={() => ratingMutation.mutate(value)}
              style={[
                styles.rating,
                { backgroundColor: selected ? colors.brand : colors.surfaceRaised },
              ]}
            >
              <Text style={{ color: selected ? colors.onBrand : colors.textPrimary }}>{value}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.label, { color: colors.textPrimary }]}>Your review</Text>
      <TextInput
        accessibilityLabel="Review"
        multiline
        onChangeText={(value) => {
          setReviewBody(value);
          if (assistedDraft) setDraftApproved(false);
        }}
        placeholder="What did you think?"
        placeholderTextColor={colors.textDisabled}
        style={[styles.review, { borderColor: colors.border, color: colors.textPrimary }]}
        value={currentReviewBody}
      />
      <Text style={[styles.label, { color: colors.textPrimary }]}>Review assistant</Text>
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
                <Text style={{ color: selected ? colors.onBrand : colors.textPrimary }}>
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
      >
        <Text style={{ color: colors.textSecondary }}>
          {containsSpoilers ? '☑' : '☐'} Contains spoilers
        </Text>
      </Pressable>
      <Button
        disabled={currentReviewBody.trim().length === 0 || (assistedDraft && !draftApproved)}
        label={existingReview === null ? 'Publish review' : 'Update review'}
        loading={reviewMutation.isPending}
        onPress={() => reviewMutation.mutate()}
      />
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
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, borderWidth: 1, gap: 14, padding: 16 },
  heading: { fontSize: 21, fontWeight: '700' },
  label: { fontSize: 15, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  ratingRow: { flexDirection: 'row', gap: 9 },
  rating: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  review: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 112,
    padding: 12,
    textAlignVertical: 'top',
  },
  assistantNotice: { borderRadius: 12, gap: 8, padding: 12 },
});
