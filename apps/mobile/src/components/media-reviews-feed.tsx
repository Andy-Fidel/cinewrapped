import type { PublicReviewItem } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../lib/api';
import { haptics } from '../lib/haptics';
import { ReportContentModal, type ReportTarget } from './report-content-modal';
import { ReviewShareCardModal } from './review-share-card-modal';
import { useColors } from './ui';

interface MediaReviewsFeedProps {
  mediaId: string;
  mediaTitle: string;
  posterUrl?: string | null;
  releaseDate?: string | null;
  genres?: Array<{ id: string; name: string }>;
}

export function MediaReviewsFeed({
  mediaId,
  mediaTitle,
  posterUrl = null,
  releaseDate = null,
  genres = [],
}: MediaReviewsFeedProps) {
  const colors = useColors();
  const [revealedSpoilers, setRevealedSpoilers] = useState<Record<string, boolean>>({});
  const [likedReviews, setLikedReviews] = useState<Record<string, boolean>>({});
  const [activeShareReview, setActiveShareReview] = useState<PublicReviewItem | null>(null);
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);

  const reviewsQuery = useQuery({
    queryKey: ['media-reviews', mediaId],
    queryFn: () => api.request<PublicReviewItem[]>(`media/${mediaId}/reviews`),
  });

  const toggleSpoiler = (reviewId: string) => {
    haptics.selection();
    setRevealedSpoilers((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const toggleLike = (reviewId: string) => {
    haptics.heartReact();
    setLikedReviews((prev) => ({ ...prev, [reviewId]: !prev[reviewId] }));
  };

  const reviews = reviewsQuery.data ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chatbubbles" size={20} color={colors.brand} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Community Reviews</Text>
        </View>
        <Text style={[styles.countBadge, { color: colors.textSecondary }]}>
          {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
        </Text>
      </View>

      {reviewsQuery.isPending ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.brand} />
          <Text style={{ color: colors.textSecondary, marginTop: 8, fontSize: 13 }}>
            Loading reviews for {mediaTitle}…
          </Text>
        </View>
      ) : reviews.length === 0 ? (
        <View style={[styles.emptyBox, { backgroundColor: colors.surfaceRaised }]}>
          <Ionicons name="create-outline" size={28} color={colors.textDisabled} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No reviews yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Be the first cinephile to review {mediaTitle}!
          </Text>
        </View>
      ) : (
        <View style={styles.reviewsList}>
          {reviews.map((review) => {
            const isSpoilerHidden = review.containsSpoilers && !revealedSpoilers[review.id];
            const isLiked = Boolean(likedReviews[review.id]);
            const effectiveLikeCount = review.likeCount + (isLiked ? 1 : 0);

            return (
              <View
                key={review.id}
                style={[
                  styles.reviewCard,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                {/* User Header Row */}
                <View style={styles.userRow}>
                  <View style={styles.userInfo}>
                    {review.user.avatarUrl ? (
                      <Image source={{ uri: review.user.avatarUrl }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: colors.brand }]}>
                        <Text style={[styles.avatarInitials, { color: colors.onBrand }]}>
                          {(review.user.displayName || review.user.handle || 'U').slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ gap: 2 }}>
                      <Text style={[styles.displayName, { color: colors.textPrimary }]}>
                        {review.user.displayName || `@${review.user.handle}`}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                        @{review.user.handle}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {/* Rating Stars */}
                    {review.ratingValue !== null ? (
                      <View style={[styles.ratingBadge, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                        <Ionicons name="star" size={13} color="#F59E0B" />
                        <Text style={styles.ratingText}>
                          {review.ratingValue}.0
                        </Text>
                      </View>
                    ) : null}

                    {/* Report Violation Action */}
                    <Pressable
                      accessibilityLabel="Report review"
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        haptics.selection();
                        setReportTarget({
                          entityType: 'REVIEW',
                          entityId: review.id,
                          entityTitle: review.title || review.body.slice(0, 40),
                          authorName: review.user.handle,
                        });
                      }}
                      style={({ pressed }) => [
                        styles.reportBtn,
                        { opacity: pressed ? 0.6 : 0.8 },
                      ]}
                    >
                      <Ionicons name="flag-outline" size={14} color={colors.textDisabled} />
                    </Pressable>
                  </View>
                </View>

                {/* Review Body or Spoiler Shield */}
                {isSpoilerHidden ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => toggleSpoiler(review.id)}
                    style={[styles.spoilerShield, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                  >
                    <Ionicons name="eye-off-outline" size={20} color="#EF4444" />
                    <Text style={styles.spoilerShieldText}>
                      ⚠️ Review contains spoilers · Tap to reveal
                    </Text>
                  </Pressable>
                ) : (
                  <View style={{ gap: 8 }}>
                    {review.containsSpoilers ? (
                      <View style={styles.spoilerWarningPill}>
                        <Ionicons name="warning-outline" size={12} color="#EF4444" />
                        <Text style={styles.spoilerWarningText}>Spoilers revealed</Text>
                      </View>
                    ) : null}

                    {review.title ? (
                      <Text style={[styles.reviewTitle, { color: colors.textPrimary }]}>
                        {review.title}
                      </Text>
                    ) : null}

                    <Text style={[styles.reviewBody, { color: colors.textPrimary }]}>
                      {review.body}
                    </Text>
                  </View>
                )}

                {/* Footer with Timestamp, Share Card, and Like Button */}
                <View style={styles.reviewFooter}>
                  <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                    {new Date(review.publishedAt ?? review.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {/* 1-Tap Visual CineWrapped Share Card Trigger */}
                    <Pressable
                      accessibilityLabel="Generate visual share card"
                      accessibilityRole="button"
                      onPress={() => {
                        haptics.selection();
                        setActiveShareReview(review);
                      }}
                      style={({ pressed }) => [
                        styles.shareCardBtn,
                        {
                          backgroundColor: colors.surface,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="sparkles" size={13} color="#F59E0B" />
                      <Text style={[styles.shareCardBtnText, { color: colors.textPrimary }]}>
                        Card
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => toggleLike(review.id)}
                      style={({ pressed }) => [
                        styles.likeBtn,
                        {
                          backgroundColor: isLiked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.06)',
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={14}
                        color={isLiked ? '#EF4444' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.likeBtnText,
                          { color: isLiked ? '#EF4444' : colors.textSecondary },
                        ]}
                      >
                        {effectiveLikeCount > 0 ? effectiveLikeCount : 'Like'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Visual Share Card Modal */}
      {activeShareReview ? (
        <ReviewShareCardModal
          media={{
            id: mediaId,
            title: mediaTitle,
            posterUrl,
            releaseDate,
            genres,
          }}
          onClose={() => setActiveShareReview(null)}
          review={activeShareReview}
          visible={Boolean(activeShareReview)}
        />
      ) : null}

      {/* UGC Violation Report Modal */}
      <ReportContentModal
        visible={Boolean(reportTarget)}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  reportBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyBox: {
    alignItems: 'center',
    borderRadius: 14,
    gap: 6,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  userRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  userInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  avatar: {
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: '800',
  },
  displayName: {
    fontSize: 14,
    fontWeight: '800',
  },
  ratingBadge: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '800',
  },
  spoilerShield: {
    alignItems: 'center',
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#EF4444',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    padding: 14,
  },
  spoilerShieldText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  spoilerWarningPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spoilerWarningText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  reviewBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  reviewFooter: {
    alignItems: 'center',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  timestamp: {
    fontSize: 11,
  },
  shareCardBtn: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  shareCardBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  likeBtn: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  likeBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
