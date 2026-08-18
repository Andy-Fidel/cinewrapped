import type {
  CommentSummary,
  FeedActivitySummary,
  FriendshipSummary,
  UserSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { haptics } from '../../src/lib/haptics';
import { useAuth } from '../../src/providers/auth-provider';

type ActivityFilter = 'ALL' | 'WATCHED' | 'RATED' | 'REVIEWED' | 'FAVORITED';

function formatActivityType(type: string) {
  const clean = type.replace('USER_', '').replaceAll('_', ' ').toLowerCase();
  if (clean.includes('watch') || clean.includes('completed')) {
    return {
      label: 'WATCHED & LOGGED',
      icon: 'film' as const,
      color: '#10B981',
      bg: 'rgba(16, 185, 129, 0.15)',
    };
  }
  if (clean.includes('rate')) {
    return {
      label: 'RATED',
      icon: 'star' as const,
      color: '#F59E0B',
      bg: 'rgba(245, 158, 11, 0.15)',
    };
  }
  if (clean.includes('review')) {
    return {
      label: 'REVIEWED',
      icon: 'chatbox-ellipses' as const,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.15)',
    };
  }
  if (clean.includes('favorite')) {
    return {
      label: 'FAVORITED',
      icon: 'heart' as const,
      color: '#EF4444',
      bg: 'rgba(239, 68, 68, 0.15)',
    };
  }
  return {
    label: clean.toUpperCase(),
    icon: 'sparkles' as const,
    color: '#3B82F6',
    bg: 'rgba(59, 130, 246, 0.15)',
  };
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function MemberRow({ member }: { member: UserSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/users/${encodeURIComponent(member.username)}`)}
      style={({ pressed }) => [
        styles.memberRow,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.avatarInitial, { color: colors.brand }]}>
            {member.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}

      <View style={styles.memberInfo}>
        <Text style={[styles.memberDisplayName, { color: colors.textPrimary }]}>
          {member.displayName}
        </Text>
        <Text style={[styles.memberUsername, { color: colors.textSecondary }]}>
          @{member.username}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textDisabled} />
    </Pressable>
  );
}

function FriendRequestCard({ request }: { request: FriendshipSummary }) {
  const colors = useColors();
  const queryClient = useQueryClient();

  const respond = useMutation({
    mutationFn: (action: 'ACCEPT' | 'DECLINE') =>
      api.request<FriendshipSummary>(`friendships/${request.id}`, {
        method: 'PATCH',
        body: { action },
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['friendships'] }),
  });

  const isAccepting = respond.isPending && respond.variables === 'ACCEPT';
  const isDeclining = respond.isPending && respond.variables === 'DECLINE';

  return (
    <View
      style={[
        styles.friendRequestCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.friendRequestHeader}>
        {request.otherUser.avatarUrl ? (
          <Image source={{ uri: request.otherUser.avatarUrl }} style={styles.memberAvatar} />
        ) : (
          <View style={[styles.memberAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
            <Text style={[styles.avatarInitial, { color: colors.brand }]}>
              {request.otherUser.displayName.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.friendRequestInfo}>
          <Text style={[styles.memberDisplayName, { color: colors.textPrimary }]}>
            {request.otherUser.displayName}
          </Text>
          <Text style={[styles.memberUsername, { color: colors.textSecondary }]}>
            @{request.otherUser.username} wants to connect
          </Text>
        </View>
      </View>

      <View style={styles.friendRequestActions}>
        <Pressable
          accessibilityRole="button"
          disabled={respond.isPending}
          onPress={() => respond.mutate('ACCEPT')}
          style={({ pressed }) => [
            styles.friendActionBtn,
            {
              backgroundColor: colors.brand,
              opacity: pressed || respond.isPending ? 0.75 : 1,
            },
          ]}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color={colors.onBrand} />
              <Text style={[styles.friendActionBtnText, { color: colors.onBrand }]}>Accept</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={respond.isPending}
          onPress={() => respond.mutate('DECLINE')}
          style={({ pressed }) => [
            styles.friendActionBtn,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderWidth: 1,
              opacity: pressed || respond.isPending ? 0.75 : 1,
            },
          ]}
        >
          {isDeclining ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="close" size={16} color={colors.textSecondary} />
              <Text style={[styles.friendActionBtnText, { color: colors.textSecondary }]}>
                Decline
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {respond.isError && (
        <Text style={{ color: colors.danger, fontSize: 12 }}>
          {errorMessage(respond.error)}
        </Text>
      )}
    </View>
  );
}

function ActivityCard({ activity }: { activity: FeedActivitySummary }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);

  const comments = useQuery({
    queryKey: ['social-comments', activity.id],
    queryFn: () => api.request<CommentSummary[]>(`social/comments/FEED_ACTIVITY/${activity.id}`),
    enabled: showComments,
  });

  const react = useMutation({
    mutationFn: () => {
      haptics.heartReact();
      return api.request(`reactions/FEED_ACTIVITY/${activity.id}/LIKE`, {
        method: activity.reactions.mine.includes('LIKE') ? 'DELETE' : 'PUT',
      });
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
  });

  const postComment = useMutation({
    mutationFn: () => {
      haptics.clapperSnap();
      return api.request<CommentSummary>(`social/comments/FEED_ACTIVITY/${activity.id}`, {
        method: 'POST',
        body: { body: comment.trim(), containsSpoilers },
      });
    },
    onSuccess: async () => {
      setComment('');
      setContainsSpoilers(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-comments', activity.id] }),
        queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
      ]);
    },
  });

  const isLiked = activity.reactions.mine.includes('LIKE');
  const meta = formatActivityType(activity.activityType);
  const timeAgo = formatRelativeTime(activity.occurredAt);

  return (
    <View
      style={[
        styles.activityCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* User Header Row */}
      <View style={styles.activityHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/users/${encodeURIComponent(activity.actor.username)}`)}
          style={styles.actorProfile}
        >
          {activity.actor.avatarUrl ? (
            <Image source={{ uri: activity.actor.avatarUrl }} style={styles.actorAvatar} />
          ) : (
            <View style={[styles.actorAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={[styles.actorAvatarInitial, { color: colors.brand }]}>
                {activity.actor.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}

          <View style={styles.actorTextContainer}>
            <Text numberOfLines={1} style={[styles.actorName, { color: colors.textPrimary }]}>
              {activity.actor.displayName}
            </Text>
            <Text style={[styles.actorMeta, { color: colors.textSecondary }]}>
              @{activity.actor.username} · {timeAgo}
            </Text>
          </View>
        </Pressable>

        {/* Activity Pill Tag */}
        <View style={[styles.activityBadge, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={11} color={meta.color} />
          <Text style={[styles.activityBadgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Cinematic Media Snippet (Strict 2:3 Ratio) */}
      {activity.media && (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/media/${activity.media?.id}`)}
          style={({ pressed }) => [
            styles.mediaCard,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {activity.media.posterUrl ? (
            <Image
              source={{ uri: activity.media.posterUrl }}
              style={styles.mediaPoster}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mediaPoster, styles.posterFallback, { backgroundColor: colors.surface }]}>
              <Ionicons name="film-outline" size={24} color={colors.textDisabled} />
            </View>
          )}

          <View style={styles.mediaDetails}>
            <Text numberOfLines={1} style={[styles.mediaTitle, { color: colors.textPrimary }]}>
              {activity.media.title}
            </Text>

            <View style={styles.mediaSubRow}>
              <Text style={[styles.mediaYearType, { color: colors.textSecondary }]}>
                {activity.media.releaseYear ?? 'TBA'} ·{' '}
                {activity.media.mediaType === 'MOVIE' ? 'Feature Film' : 'TV Series'}
              </Text>

              {activity.media.averageProviderRating !== null && (
                <View style={styles.ratingPill}>
                  <Ionicons name="star" size={11} color="#FFD700" />
                  <Text style={styles.ratingPillText}>
                    {activity.media.averageProviderRating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
        </Pressable>
      )}

      {/* Social Interactions Toolbar */}
      <View style={styles.interactionsRow}>
        <Pressable
          accessibilityRole="button"
          disabled={react.isPending}
          onPress={() => react.mutate()}
          style={({ pressed }) => [
            styles.reactionPill,
            {
              backgroundColor: isLiked ? 'rgba(239, 68, 68, 0.15)' : colors.surfaceRaised,
              borderColor: isLiked ? '#EF4444' : colors.border,
              opacity: pressed || react.isPending ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isLiked ? '#EF4444' : colors.textPrimary}
          />
          <Text
            style={[
              styles.reactionCount,
              { color: isLiked ? '#EF4444' : colors.textPrimary },
            ]}
          >
            {activity.reactions.counts.LIKE ?? 0}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowComments((prev) => !prev)}
          style={({ pressed }) => [
            styles.reactionPill,
            {
              backgroundColor: showComments ? colors.surfaceRaised : 'transparent',
              borderColor: colors.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name="chatbubble-outline" size={15} color={colors.textPrimary} />
          <Text style={[styles.reactionCount, { color: colors.textPrimary }]}>
            {activity.commentCount} {activity.commentCount === 1 ? 'Comment' : 'Comments'}
          </Text>
        </Pressable>
      </View>

      {/* Comments Drawer */}
      {showComments && (
        <View
          style={[
            styles.commentsDrawer,
            { borderTopColor: colors.border },
          ]}
        >
          {comments.isPending && (
            <ActivityIndicator color={colors.brand} style={{ paddingVertical: 8 }} />
          )}

          {(comments.data ?? []).map((item) => (
            <View key={item.id} style={styles.commentRow}>
              {item.author.avatarUrl ? (
                <Image source={{ uri: item.author.avatarUrl }} style={styles.commentAvatar} />
              ) : (
                <View style={[styles.commentAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
                  <Text style={[styles.commentAvatarInitial, { color: colors.brand }]}>
                    {item.author.displayName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View
                style={[
                  styles.commentBubble,
                  { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: colors.textPrimary }]}>
                    {item.author.displayName}
                  </Text>
                  {item.containsSpoilers && (
                    <View style={styles.spoilerTag}>
                      <Text style={styles.spoilerTagText}>SPOILER</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.commentBody, { color: colors.textPrimary }]}>
                  {item.body}
                </Text>
              </View>
            </View>
          ))}

          {/* Comment Input */}
          <View style={styles.addCommentWrap}>
            <TextInput
              accessibilityLabel="Add a comment"
              maxLength={5000}
              onChangeText={setComment}
              placeholder="Write a comment…"
              placeholderTextColor={colors.textDisabled}
              style={[
                styles.commentInput,
                { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surfaceRaised },
              ]}
              value={comment}
            />

            <View style={styles.commentPostActions}>
              <Pressable
                onPress={() => setContainsSpoilers((prev) => !prev)}
                style={styles.spoilerToggle}
              >
                <Ionicons
                  name={containsSpoilers ? 'checkbox' : 'square-outline'}
                  size={16}
                  color={containsSpoilers ? colors.brand : colors.textSecondary}
                />
                <Text style={[styles.spoilerToggleText, { color: colors.textSecondary }]}>
                  Contains spoilers
                </Text>
              </Pressable>

              <Pressable
                disabled={comment.trim().length === 0 || postComment.isPending}
                onPress={() => postComment.mutate()}
                style={({ pressed }) => [
                  styles.postCommentBtn,
                  {
                    backgroundColor: colors.brand,
                    opacity: comment.trim().length === 0 || postComment.isPending || pressed ? 0.6 : 1,
                  },
                ]}
              >
                {postComment.isPending ? (
                  <ActivityIndicator color={colors.onBrand} size="small" />
                ) : (
                  <Text style={[styles.postCommentBtnText, { color: colors.onBrand }]}>Post</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

export default function SocialScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());
  const [activeFilter, setActiveFilter] = useState<ActivityFilter>('ALL');

  const feed = useQuery({
    queryKey: ['social-feed'],
    queryFn: () => api.request<FeedActivitySummary[]>('feed?limit=50'),
    enabled: session !== null,
  });

  const requests = useQuery({
    queryKey: ['friendships', 'PENDING'],
    queryFn: () => api.request<FriendshipSummary[]>('friendships?status=PENDING'),
    enabled: session !== null,
  });

  const members = useQuery({
    queryKey: ['member-search', deferredSearch],
    queryFn: () =>
      api.request<UserSummary[]>(`users?q=${encodeURIComponent(deferredSearch)}&limit=12`),
    enabled: session !== null && deferredSearch.length >= 2,
  });

  const incomingRequests = (requests.data ?? []).filter((item) => item.direction === 'INCOMING');

  // Extract unique active friends for the top "Now Watching" Story Ring horizon
  const activeFriends = useMemo(() => {
    const map = new Map<string, UserSummary>();
    for (const item of feed.data ?? []) {
      if (!map.has(item.actor.id)) {
        map.set(item.actor.id, item.actor);
      }
    }
    return Array.from(map.values());
  }, [feed.data]);

  // Client-side activity category filter
  const filteredFeed = useMemo(() => {
    const list = feed.data ?? [];
    if (activeFilter === 'ALL') return list;
    if (activeFilter === 'WATCHED')
      return list.filter((a) => a.activityType.includes('WATCH') || a.activityType.includes('COMPLETED'));
    if (activeFilter === 'RATED') return list.filter((a) => a.activityType.includes('RATE'));
    if (activeFilter === 'REVIEWED') return list.filter((a) => a.activityType.includes('REVIEW'));
    if (activeFilter === 'FAVORITED') return list.filter((a) => a.activityType.includes('FAVORITE'));
    return list;
  }, [feed.data, activeFilter]);

  if (session === null) return <Redirect href="/(auth)/login" />;

  const refreshing = feed.isRefetching || requests.isRefetching;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            onRefresh={() => void Promise.all([feed.refetch(), requests.refetch()])}
            refreshing={refreshing}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.content}>
          {/* Header Banner */}
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>COMMUNITY FEED</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Film Friends & Activity
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              See what your film circle is watching, rating, and discussing in real-time.
            </Text>

            {/* Movie Clubs Hero CTA Card */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/clubs')}
              style={({ pressed }) => [
                styles.clubsHeroCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.clubsIconCircle, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="people" size={22} color={colors.brand} />
              </View>
              <View style={styles.clubsInfo}>
                <Text style={[styles.clubsTitle, { color: colors.textPrimary }]}>
                  Explore Cinema Clubs & Guilds
                </Text>
                <Text style={[styles.clubsSubtitle, { color: colors.textSecondary }]}>
                  Collaborative watchlists, group discussions & watch parties
                </Text>
              </View>
              <View style={[styles.explorePill, { backgroundColor: colors.brand }]}>
                <Text style={[styles.explorePillText, { color: colors.onBrand }]}>Explore</Text>
              </View>
            </Pressable>
          </View>

          {/* Active Friends "Now Watching" Story Ring Horizon */}
          {activeFriends.length > 0 && (
            <View style={styles.storyHorizonSection}>
              <Text style={[styles.storySectionTitle, { color: colors.textSecondary }]}>
                ACTIVE CIRCLE
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storyScroller}
              >
                {activeFriends.map((friend) => (
                  <Pressable
                    key={friend.id}
                    onPress={() => router.push(`/users/${encodeURIComponent(friend.username)}`)}
                    style={styles.storyAvatarWrap}
                  >
                    <View style={[styles.storyRing, { borderColor: colors.brand }]}>
                      {friend.avatarUrl ? (
                        <Image source={{ uri: friend.avatarUrl }} style={styles.storyAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.storyAvatar,
                            styles.storyAvatarFallback,
                            { backgroundColor: colors.surfaceRaised },
                          ]}
                        >
                          <Text style={[styles.avatarInitial, { color: colors.brand }]}>
                            {friend.displayName.slice(0, 1).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} style={[styles.storyName, { color: colors.textPrimary }]}>
                      {friend.displayName.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Member Search Field */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.textDisabled}
              style={styles.searchIcon}
            />
            <TextInput
              accessibilityLabel="Search members"
              autoCapitalize="none"
              onChangeText={setSearch}
              placeholder="Search by username or name to find cinephiles…"
              placeholderTextColor={colors.textDisabled}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={search}
            />
            {search.length > 0 && (
              <Pressable
                accessibilityLabel="Clear member search"
                hitSlop={8}
                onPress={() => setSearch('')}
              >
                <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              </Pressable>
            )}
          </View>

          {/* Member Search Results */}
          {deferredSearch.length >= 2 && (
            <View style={styles.searchResultsSection}>
              <Text style={[styles.searchSectionTitle, { color: colors.textPrimary }]}>
                Matching Members
              </Text>
              {(members.data ?? []).map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
              {members.isPending && (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Searching…</Text>
              )}
              {members.isError && (
                <Text style={{ color: colors.danger, fontSize: 13 }}>
                  {errorMessage(members.error)}
                </Text>
              )}
              {!members.isPending && (members.data?.length ?? 0) === 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  No members found matching "{deferredSearch}".
                </Text>
              )}
            </View>
          )}

          {/* Incoming Friend Requests */}
          {incomingRequests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="person-add" size={18} color={colors.brand} />
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Friend Requests ({incomingRequests.length})
                </Text>
              </View>
              {incomingRequests.map((request) => (
                <FriendRequestCard key={request.id} request={request} />
              ))}
            </View>
          )}

          {/* Activity Feed Section */}
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="flash-outline" size={18} color={colors.brand} />
              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Friend Activity
              </Text>
            </View>

            {/* Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              {[
                { key: 'ALL' as const, label: 'All Activity' },
                { key: 'WATCHED' as const, label: '🎬 Watched' },
                { key: 'RATED' as const, label: '⭐ Ratings' },
                { key: 'REVIEWED' as const, label: '💬 Reviews' },
                { key: 'FAVORITED' as const, label: '❤️ Favorites' },
              ].map((tab) => {
                const isSelected = activeFilter === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveFilter(tab.key)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? colors.surfaceRaised : 'transparent',
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: isSelected ? colors.textPrimary : colors.textSecondary },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Feed Cards */}
            {filteredFeed.map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}

            {feed.isPending && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={colors.brand} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
                  Loading community feed…
                </Text>
              </View>
            )}

            {feed.isError && (
              <Text style={{ color: colors.danger, textAlign: 'center' }}>
                {errorMessage(feed.error)}
              </Text>
            )}

            {/* Empty State */}
            {!feed.isPending && !feed.isError && filteredFeed.length === 0 && (
              <View
                style={[
                  styles.emptyCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="people-outline" size={32} color={colors.brand} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {activeFilter !== 'ALL'
                    ? 'No activity in this filter'
                    : 'Your social feed is quiet'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {activeFilter !== 'ALL'
                    ? 'Switch back to all activity or check back soon.'
                    : 'Follow film friends, connect with fellow cinephiles, or join a movie club to share your cinema journey.'}
                </Text>
                <Pressable
                  onPress={() => router.push('/clubs')}
                  style={({ pressed }) => [
                    styles.emptyActionBtn,
                    { backgroundColor: colors.brand, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="people" size={16} color={colors.onBrand} />
                  <Text style={[styles.emptyActionBtnText, { color: colors.onBrand }]}>
                    Discover Movie Clubs
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 18, maxWidth: 640, padding: 18, width: '100%' },

  // Header
  header: { gap: 10, paddingTop: 6 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.3 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 19 },

  // Clubs Hero Card
  clubsHeroCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.2,
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    padding: 14,
  },
  clubsIconCircle: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  clubsInfo: { flex: 1, gap: 2 },
  clubsTitle: { fontSize: 15, fontWeight: '800' },
  clubsSubtitle: { fontSize: 11, lineHeight: 15 },
  explorePill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  explorePillText: { fontSize: 12, fontWeight: '800' },

  // Story Horizon
  storyHorizonSection: { gap: 6 },
  storySectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  storyScroller: { gap: 12, paddingVertical: 4 },
  storyAvatarWrap: { alignItems: 'center', gap: 4, width: 56 },
  storyRing: {
    borderRadius: 26,
    borderWidth: 2,
    height: 52,
    padding: 2,
    width: 52,
  },
  storyAvatar: { borderRadius: 22, height: 44, width: 44 },
  storyAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  storyName: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Search
  searchBox: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  searchResultsSection: { gap: 8 },
  searchSectionTitle: { fontSize: 14, fontWeight: '800' },

  // Sections
  section: { gap: 12, marginTop: 4 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  sectionHeading: { fontSize: 18, fontWeight: '800' },

  // Filter Horizon
  filterScroll: { gap: 8, paddingVertical: 2 },
  filterPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterPillText: { fontSize: 12, fontWeight: '700' },

  // Member Rows
  memberRow: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  memberAvatar: { borderRadius: 20, height: 40, width: 40 },
  memberAvatarFallback: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarInitial: { fontSize: 15, fontWeight: '800' },
  memberInfo: { flex: 1, gap: 2 },
  memberDisplayName: { fontSize: 14, fontWeight: '800' },
  memberUsername: { fontSize: 12 },

  // Friend Request Card
  friendRequestCard: {
    borderRadius: 16,
    borderWidth: 1.2,
    gap: 12,
    padding: 14,
  },
  friendRequestHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  friendRequestInfo: { flex: 1, gap: 2 },
  friendRequestActions: { flexDirection: 'row', gap: 10 },
  friendActionBtn: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 40,
    justifyContent: 'center',
  },
  friendActionBtnText: { fontSize: 13, fontWeight: '800' },

  // Activity Card
  activityCard: {
    borderRadius: 18,
    borderWidth: 1.2,
    gap: 12,
    padding: 14,
  },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actorProfile: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 10 },
  actorAvatar: { borderRadius: 18, height: 38, width: 38 },
  actorAvatarFallback: {
    alignItems: 'center',
    borderRadius: 18,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  actorAvatarInitial: { fontSize: 14, fontWeight: '800' },
  actorTextContainer: { flex: 1, gap: 1 },
  actorName: { fontSize: 14, fontWeight: '800' },
  actorMeta: { fontSize: 11 },
  activityBadge: {
    alignItems: 'center',
    borderRadius: 6,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  activityBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  // 2:3 Media Card
  mediaCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 8,
  },
  mediaPoster: { borderRadius: 8, height: 66, width: 44 },
  posterFallback: { alignItems: 'center', borderWidth: 1, justifyContent: 'center' },
  mediaDetails: { flex: 1, gap: 4 },
  mediaTitle: { fontSize: 14, fontWeight: '800' },
  mediaSubRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  mediaYearType: { fontSize: 12 },
  ratingPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 4,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },

  // Interactions Toolbar
  interactionsRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  reactionPill: {
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reactionCount: { fontSize: 12, fontWeight: '700' },

  // Comments Drawer
  commentsDrawer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
    paddingTop: 10,
  },
  commentRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  commentAvatar: { borderRadius: 14, height: 28, width: 28 },
  commentAvatarFallback: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  commentAvatarInitial: { fontSize: 11, fontWeight: '800' },
  commentBubble: {
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    padding: 8,
  },
  commentHeader: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  commentAuthor: { fontSize: 12, fontWeight: '800' },
  spoilerTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  spoilerTagText: { color: '#EF4444', fontSize: 8, fontWeight: '800' },
  commentBody: { fontSize: 13, lineHeight: 17 },

  addCommentWrap: { gap: 8, marginTop: 4 },
  commentInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  commentPostActions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spoilerToggle: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  spoilerToggleText: { fontSize: 11 },
  postCommentBtn: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 60,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  postCommentBtnText: { fontSize: 12, fontWeight: '800' },

  // Empty State
  loadingContainer: { alignItems: 'center', paddingVertical: 28 },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 24,
    textAlign: 'center',
  },
  emptyIconCircle: {
    alignItems: 'center',
    borderRadius: 30,
    borderWidth: 1,
    height: 60,
    justifyContent: 'center',
    marginBottom: 4,
    width: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptySubtitle: { fontSize: 13, lineHeight: 18, maxWidth: 280, textAlign: 'center' },
  emptyActionBtn: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyActionBtnText: { fontSize: 13, fontWeight: '800' },
});
