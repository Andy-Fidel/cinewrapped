import type {
  CommentSummary,
  FeedActivitySummary,
  FriendshipSummary,
  UserSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
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

import { Button, Field, useColors } from '../../src/components/ui';
import { errorMessage } from '../../src/lib/error-message';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

function MemberRow({ member }: { member: UserSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/users/${encodeURIComponent(member.username)}`)}
      style={({ pressed }) => [
        styles.member,
        { borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={styles.avatarImage} />
      ) : (
        <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 16 }}>
            {member.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.grow}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
          {member.displayName}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>@{member.username}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={18} color={colors.textDisabled} />
    </Pressable>
  );
}

function FriendRequest({ request }: { request: FriendshipSummary }) {
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
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <MemberRow member={request.otherUser} />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={respond.isPending}
          onPress={() => respond.mutate('ACCEPT')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.brand, opacity: pressed || respond.isPending ? 0.8 : 1 },
          ]}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={16} color={colors.onBrand} />
              <Text style={{ color: colors.onBrand, fontWeight: '700' }}>Accept</Text>
            </>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={respond.isPending}
          onPress={() => respond.mutate('DECLINE')}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              borderWidth: 1,
              opacity: pressed || respond.isPending ? 0.8 : 1,
            },
          ]}
        >
          {isDeclining ? (
            <ActivityIndicator size="small" color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="close-outline" size={16} color={colors.textPrimary} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Decline</Text>
            </>
          )}
        </Pressable>
      </View>
      {respond.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {errorMessage(respond.error)}
        </Text>
      ) : null}
    </View>
  );
}

function formatActivityType(type: string) {
  const clean = type.replace('USER_', '').replaceAll('_', ' ').toLowerCase();
  if (clean.includes('watch') || clean.includes('completed'))
    return { label: '🎬 Watched', icon: 'film-outline' };
  if (clean.includes('rate')) return { label: '⭐ Rated', icon: 'star-outline' };
  if (clean.includes('review')) return { label: '💬 Reviewed', icon: 'chatbox-ellipses-outline' };
  if (clean.includes('favorite')) return { label: '❤️ Favorited', icon: 'heart-outline' };
  return {
    label: `🔥 ${clean.charAt(0).toUpperCase() + clean.slice(1)}`,
    icon: 'sparkles-outline',
  };
}

function ActivityCard({ activity }: { activity: FeedActivitySummary }) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');

  const comments = useQuery({
    queryKey: ['social-comments', activity.id],
    queryFn: () => api.request<CommentSummary[]>(`social/comments/FEED_ACTIVITY/${activity.id}`),
    enabled: showComments,
  });

  const react = useMutation({
    mutationFn: () =>
      api.request(`reactions/FEED_ACTIVITY/${activity.id}/LIKE`, {
        method: activity.reactions.mine.includes('LIKE') ? 'DELETE' : 'PUT',
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
  });

  const postComment = useMutation({
    mutationFn: () =>
      api.request<CommentSummary>(`social/comments/FEED_ACTIVITY/${activity.id}`, {
        method: 'POST',
        body: { body: comment, containsSpoilers: false },
      }),
    onSuccess: async () => {
      setComment('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['social-comments', activity.id] }),
        queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
      ]);
    },
  });

  const isLiked = activity.reactions.mine.includes('LIKE');
  const activityMeta = formatActivityType(activity.activityType);
  const formattedDate = new Date(activity.occurredAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      {/* User Header */}
      <View style={styles.activityHeader}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/users/${encodeURIComponent(activity.actor.username)}`)}
          style={styles.actorRow}
        >
          {activity.actor.avatarUrl ? (
            <Image source={{ uri: activity.actor.avatarUrl }} style={styles.actorAvatar} />
          ) : (
            <View style={[styles.actorAvatarFallback, { backgroundColor: colors.surfaceRaised }]}>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 15 }}>
                {activity.actor.displayName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.actorTextWrap}>
            <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 15 }}>
              {activity.actor.displayName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              @{activity.actor.username}
            </Text>
          </View>
        </Pressable>

        <View style={[styles.activityTypeBadge, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.activityTypeText, { color: colors.brand }]}>
            {activityMeta.label}
          </Text>
        </View>
      </View>

      {/* Media Preview Thumbnail Card */}
      {activity.media ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/media/${activity.media?.id}`)}
          style={({ pressed }) => [
            styles.mediaPreviewCard,
            {
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {activity.media.posterUrl ? (
            <Image source={{ uri: activity.media.posterUrl }} style={styles.mediaPoster} />
          ) : (
            <View style={[styles.mediaPosterFallback, { backgroundColor: colors.surface }]}>
              <Ionicons name="film-outline" size={24} color={colors.textDisabled} />
            </View>
          )}
          <View style={styles.mediaInfoWrap}>
            <Text numberOfLines={1} style={[styles.mediaTitle, { color: colors.textPrimary }]}>
              {activity.media.title}
            </Text>
            <Text style={[styles.mediaMeta, { color: colors.textSecondary }]}>
              {activity.media.releaseYear ?? 'TBA'} ·{' '}
              {activity.media.mediaType === 'MOVIE' ? 'Movie' : 'TV'}
            </Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={18} color={colors.textDisabled} />
        </Pressable>
      ) : null}

      <Text style={[styles.timestampText, { color: colors.textDisabled }]}>{formattedDate}</Text>

      {/* Actions (Reactions & Comments) */}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: isLiked }}
          disabled={react.isPending}
          onPress={() => react.mutate()}
          style={({ pressed }) => [
            styles.pill,
            {
              backgroundColor: isLiked ? 'rgba(255, 75, 75, 0.15)' : colors.surfaceRaised,
              opacity: pressed || react.isPending ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={16}
            color={isLiked ? '#FF4B4B' : colors.textPrimary}
          />
          <Text
            style={{
              color: isLiked ? '#FF4B4B' : colors.textPrimary,
              fontWeight: '700',
              fontSize: 13,
            }}
          >
            {activity.reactions.counts.LIKE ?? 0}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => setShowComments((value) => !value)}
          style={({ pressed }) => [
            styles.pill,
            { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.textPrimary} />
          <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
            {activity.commentCount}
          </Text>
        </Pressable>
      </View>

      {/* Comments Drawer */}
      {showComments ? (
        <View
          style={[
            styles.comments,
            { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
          ]}
        >
          {(comments.data ?? []).map((item) => (
            <View key={item.id} style={styles.commentItem}>
              <Text style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>
                <Text style={{ fontWeight: '800' }}>{item.author.displayName}: </Text>
                {item.containsSpoilers ? '[Spoiler] ' : ''}
                {item.body}
              </Text>
            </View>
          ))}
          <Field label="Add a comment" maxLength={5000} onChangeText={setComment} value={comment} />
          <Button
            disabled={comment.trim().length === 0}
            label="Post comment"
            loading={postComment.isPending}
            onPress={() => postComment.mutate()}
          />
          {comments.isError || postComment.isError ? (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {errorMessage(comments.error ?? postComment.error)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export default function SocialScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search.trim());

  const feed = useQuery({
    queryKey: ['social-feed'],
    queryFn: () => api.request<FeedActivitySummary[]>('feed?limit=30'),
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

  if (session === null) return <Redirect href="/(auth)/login" />;
  const incoming = (requests.data ?? []).filter((item) => item.direction === 'INCOMING');
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
            <Text style={[styles.eyebrow, { color: colors.brand }]}>COMMUNITY</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Social Feed
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 22 }}>
              Find film friends and catch up on what they are watching.
            </Text>

            {/* Movie Clubs Hero CTA Card */}
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/clubs')}
              style={({ pressed }) => [
                styles.clubsHeroBanner,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={[styles.clubsIconBox, { backgroundColor: colors.surfaceRaised }]}>
                <Ionicons name="people-outline" size={24} color={colors.brand} />
              </View>
              <View style={styles.grow}>
                <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
                  Explore Movie Clubs
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Join film clubs & host watch parties
                </Text>
              </View>
              <View style={[styles.explorePill, { backgroundColor: colors.brand }]}>
                <Text style={{ color: colors.onBrand, fontWeight: '700', fontSize: 12 }}>
                  Explore
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Member Search Field */}
          <View
            style={[
              styles.searchWrapper,
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
              placeholder="Search username or display name"
              placeholderTextColor={colors.textDisabled}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={search}
            />
            {search.length > 0 ? (
              <Pressable
                accessibilityLabel="Clear member search"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setSearch('')}
              >
                <Ionicons name="close-circle" size={18} color={colors.textDisabled} />
              </Pressable>
            ) : null}
          </View>

          {deferredSearch.length >= 2 ? (
            <View style={styles.section}>
              {(members.data ?? []).map((member) => (
                <MemberRow key={member.id} member={member} />
              ))}
              {members.isPending ? (
                <Text style={{ color: colors.textSecondary }}>Searching…</Text>
              ) : null}
              {members.isError ? (
                <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                  {errorMessage(members.error)}
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Friend Requests */}
          {incoming.length === 0 ? null : (
            <View style={styles.section}>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Friend Requests</Text>
              {incoming.map((request) => (
                <FriendRequest key={request.id} request={request} />
              ))}
            </View>
          )}

          {/* Your Feed */}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Activity Feed</Text>
            {(feed.data ?? []).map((activity) => (
              <ActivityCard activity={activity} key={activity.id} />
            ))}
            {feed.isPending ? (
              <Text style={{ color: colors.textSecondary }}>Loading feed…</Text>
            ) : null}
            {feed.isError ? (
              <Text accessibilityRole="alert" style={{ color: colors.danger }}>
                {errorMessage(feed.error)}
              </Text>
            ) : null}
            {feed.data?.length === 0 ? (
              <Text style={{ color: colors.textSecondary }}>
                Follow members or add friends to see their shared activity here.
              </Text>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { alignSelf: 'center', gap: 20, maxWidth: 640, padding: 20, width: '100%' },
  header: { gap: 8, paddingTop: 10 },
  eyebrow: { fontSize: 12, fontWeight: '700', letterSpacing: 1.4 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 20, fontWeight: '800' },
  section: { gap: 12 },
  clubsHeroBanner: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    padding: 14,
  },
  clubsIconBox: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  explorePill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  searchWrapper: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 10 },
  card: { borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  member: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 6,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  avatarImage: { borderRadius: 22, height: 44, width: 44 },
  grow: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  actionButton: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 42,
    justifyContent: 'center',
  },
  activityHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actorRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  actorAvatar: { borderRadius: 20, height: 40, width: 40 },
  actorAvatarFallback: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  actorTextWrap: { gap: 2 },
  activityTypeBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  activityTypeText: { fontSize: 11, fontWeight: '700' },
  timestampText: { fontSize: 11, marginTop: -4 },
  mediaPreviewCard: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 10,
  },
  mediaPoster: { borderRadius: 6, height: 48, width: 34 },
  mediaPosterFallback: {
    alignItems: 'center',
    borderRadius: 6,
    height: 48,
    justifyContent: 'center',
    width: 34,
  },
  mediaInfoWrap: { flex: 1, gap: 3 },
  mediaTitle: { fontSize: 14, fontWeight: '700' },
  mediaMeta: { fontSize: 12 },
  pill: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  comments: { gap: 10 },
  commentItem: { paddingVertical: 2 },
});
