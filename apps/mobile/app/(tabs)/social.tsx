import type {
  CommentSummary,
  FeedActivitySummary,
  FriendshipSummary,
  UserSummary,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
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
      style={[styles.member, { borderColor: colors.border }]}
    >
      <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
        <Text style={{ color: colors.brand, fontWeight: '800' }}>
          {member.displayName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.grow}>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{member.displayName}</Text>
        <Text style={{ color: colors.textSecondary }}>@{member.username}</Text>
      </View>
      <Text style={{ color: colors.brand }}>View</Text>
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
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <MemberRow member={request.otherUser} />
      <View style={styles.actions}>
        <View style={styles.grow}>
          <Button
            disabled={respond.isPending}
            label="Accept"
            onPress={() => respond.mutate('ACCEPT')}
          />
        </View>
        <View style={styles.grow}>
          <Button
            disabled={respond.isPending}
            label="Decline"
            onPress={() => respond.mutate('DECLINE')}
            variant="secondary"
          />
        </View>
      </View>
      {respond.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {errorMessage(respond.error)}
        </Text>
      ) : null}
    </View>
  );
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
  const activityLabel = activity.activityType
    .replace('USER_', '')
    .replaceAll('_', ' ')
    .toLowerCase();
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/users/${encodeURIComponent(activity.actor.username)}`)}
      >
        <Text style={{ color: colors.textPrimary, fontWeight: '800' }}>
          {activity.actor.displayName}
        </Text>
        <Text style={{ color: colors.textSecondary }}>@{activity.actor.username}</Text>
      </Pressable>
      <Text style={{ color: colors.textPrimary, fontSize: 16 }}>
        {activityLabel}
        {activity.media === null ? '' : ` · ${activity.media.title}`}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        {new Date(activity.occurredAt).toLocaleString()}
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: activity.reactions.mine.includes('LIKE') }}
          disabled={react.isPending}
          onPress={() => react.mutate()}
          style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}
        >
          <Text style={{ color: colors.textPrimary }}>♥ {activity.reactions.counts.LIKE ?? 0}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowComments((value) => !value)}
          style={[styles.pill, { backgroundColor: colors.surfaceRaised }]}
        >
          <Text style={{ color: colors.textPrimary }}>Comments {activity.commentCount}</Text>
        </Pressable>
      </View>
      {showComments ? (
        <View style={styles.comments}>
          {(comments.data ?? []).map((item) => (
            <View key={item.id}>
              <Text style={{ color: colors.textPrimary }}>
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
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
              Social
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Find film friends and catch up on what they are watching.
            </Text>
          </View>
          <Field
            autoCapitalize="none"
            label="Find members"
            onChangeText={setSearch}
            placeholder="Search username or display name"
            value={search}
          />
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
          {incoming.length === 0 ? null : (
            <View style={styles.section}>
              <Text style={[styles.heading, { color: colors.textPrimary }]}>Friend requests</Text>
              {incoming.map((request) => (
                <FriendRequest key={request.id} request={request} />
              ))}
            </View>
          )}
          <View style={styles.section}>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Your feed</Text>
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
  content: { alignSelf: 'center', gap: 22, maxWidth: 640, padding: 20, width: '100%' },
  header: { gap: 8, paddingTop: 10 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 21, fontWeight: '800' },
  section: { gap: 12 },
  card: { borderRadius: 14, borderWidth: 1, gap: 12, padding: 14 },
  member: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  avatar: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  grow: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10 },
  pill: { borderRadius: 999, paddingHorizontal: 13, paddingVertical: 9 },
  comments: { gap: 10 },
});
