import type {
  ClubDetails,
  ClubPollSummary,
  ClubPostSummary,
  ClubWatchEventSummary,
  ClubWatchlistItemSummary,
  MediaSummary,
} from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader, Button, ErrorText, Field, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';

function PostCard({ post }: { post: ClubPostSummary }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={{ color: colors.brand, fontWeight: '800' }}>
        {post.postType === 'ANNOUNCEMENT' ? 'ANNOUNCEMENT' : 'DISCUSSION'}
      </Text>
      {post.title === null ? null : (
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{post.title}</Text>
      )}
      <Text style={{ color: colors.textPrimary }}>
        {post.containsSpoilers ? '[Spoiler] ' : ''}
        {post.body}
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        {post.author.displayName} · {new Date(post.createdAt).toLocaleString()}
      </Text>
    </View>
  );
}

function PollCard({
  clubId,
  poll,
  active,
}: {
  clubId: string;
  poll: ClubPollSummary;
  active: boolean;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const vote = useMutation({
    mutationFn: (optionId: string) =>
      api.request(`clubs/${clubId}/polls/${poll.id}/vote`, {
        method: 'PUT',
        body: { optionId },
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['club', clubId] }),
  });
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{poll.question}</Text>
      {poll.options.map((option) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: option.selectedByViewer }}
          disabled={!active || poll.status === 'CLOSED' || vote.isPending}
          key={option.id}
          onPress={() => vote.mutate(option.id)}
          style={[
            styles.option,
            {
              backgroundColor: option.selectedByViewer ? colors.brand : colors.surfaceRaised,
              borderColor: option.selectedByViewer ? colors.brand : colors.border,
            },
          ]}
        >
          <Text style={{ color: option.selectedByViewer ? colors.onBrand : colors.textPrimary }}>
            {option.label} · {option.voteCount}
          </Text>
        </Pressable>
      ))}
      <Text style={{ color: colors.textSecondary }}>
        {poll.totalVotes} votes · {poll.status.toLowerCase()}
      </Text>
      {vote.isError ? <ErrorText>{errorMessage(vote.error)}</ErrorText> : null}
    </View>
  );
}

function WatchlistItem({
  active,
  clubId,
  item,
}: {
  active: boolean;
  clubId: string;
  item: ClubWatchlistItemSummary;
}) {
  const colors = useColors();
  const queryClient = useQueryClient();
  const vote = useMutation({
    mutationFn: (value: -1 | 1) =>
      api.request(`clubs/${clubId}/watchlist/items/${item.id}/vote`, {
        method: 'PUT',
        body: { value },
      }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['club', clubId] }),
  });
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
        {item.media.title}
        {item.media.releaseYear === null ? '' : ` (${item.media.releaseYear})`}
      </Text>
      {item.note === null ? null : <Text style={{ color: colors.textSecondary }}>{item.note}</Text>}
      <Text style={{ color: colors.textSecondary }}>
        Suggested by {item.suggestedBy.displayName} · score {item.score}
      </Text>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button
            disabled={!active || vote.isPending}
            label={item.viewerVote === 1 ? 'Voted up' : 'Vote up'}
            onPress={() => vote.mutate(1)}
            variant={item.viewerVote === 1 ? 'primary' : 'secondary'}
          />
        </View>
        <View style={styles.grow}>
          <Button
            disabled={!active || vote.isPending}
            label={item.viewerVote === -1 ? 'Voted down' : 'Vote down'}
            onPress={() => vote.mutate(-1)}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );
}

function EventCard({ event }: { event: ClubWatchEventSummary }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{event.title}</Text>
      <Text style={{ color: colors.textPrimary }}>
        {new Date(event.startsAt).toLocaleString()} · {event.timezone}
      </Text>
      {event.media === null ? null : (
        <Text style={{ color: colors.brand }}>{event.media.title}</Text>
      )}
      {event.description === null ? null : (
        <Text style={{ color: colors.textSecondary }}>{event.description}</Text>
      )}
    </View>
  );
}

export default function ClubDetailsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const [postBody, setPostBody] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionOne, setPollOptionOne] = useState('');
  const [pollOptionTwo, setPollOptionTwo] = useState('');
  const [mediaSearch, setMediaSearch] = useState('');
  const deferredMediaSearch = useDeferredValue(mediaSearch.trim());
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const club = useQuery({
    queryKey: ['club', clubId],
    queryFn: () => api.request<ClubDetails>(`clubs/${clubId}`),
  });
  const search = useQuery({
    queryKey: ['club-media-search', deferredMediaSearch],
    queryFn: () =>
      api.request<MediaSummary[]>(
        `search/media?q=${encodeURIComponent(deferredMediaSearch)}&language=en-US`,
      ),
    enabled: deferredMediaSearch.length >= 2,
  });
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ['club', clubId] });
  const join = useMutation({
    mutationFn: () => api.request<ClubDetails>(`clubs/${clubId}/join`, { method: 'POST' }),
    onSuccess: refresh,
  });
  const post = useMutation({
    mutationFn: () =>
      api.request(`clubs/${clubId}/posts`, {
        method: 'POST',
        body: { body: postBody, postType: 'DISCUSSION', containsSpoilers: false },
      }),
    onSuccess: async () => {
      setPostBody('');
      await refresh();
    },
  });
  const createPoll = useMutation({
    mutationFn: () =>
      api.request(`clubs/${clubId}/polls`, {
        method: 'POST',
        body: {
          question: pollQuestion,
          allowMultiple: false,
          options: [{ label: pollOptionOne }, { label: pollOptionTwo }],
        },
      }),
    onSuccess: async () => {
      setPollQuestion('');
      setPollOptionOne('');
      setPollOptionTwo('');
      await refresh();
    },
  });
  const addMedia = useMutation({
    mutationFn: (mediaId: string) =>
      api.request(`clubs/${clubId}/watchlist/items`, {
        method: 'POST',
        body: { mediaId },
      }),
    onSuccess: async () => {
      setMediaSearch('');
      await refresh();
    },
  });
  const createEvent = useMutation({
    mutationFn: () =>
      api.request(`clubs/${clubId}/events`, {
        method: 'POST',
        body: {
          title: eventTitle,
          startsAt: eventStartsAt,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        },
      }),
    onSuccess: async () => {
      setEventTitle('');
      setEventStartsAt('');
      await refresh();
    },
  });
  const updateMembership = useMutation({
    mutationFn: ({
      membershipId,
      action,
    }: {
      membershipId: string;
      action: 'APPROVE' | 'REMOVE';
    }) =>
      api.request(`clubs/${clubId}/members/${membershipId}`, {
        method: 'PATCH',
        body: { action, role: 'MEMBER' },
      }),
    onSuccess: refresh,
  });
  if (club.isPending)
    return (
      <Screen>
        <Text style={{ color: colors.textSecondary }}>Loading club…</Text>
      </Screen>
    );
  if (club.isError)
    return (
      <Screen>
        <ErrorText>{errorMessage(club.error)}</ErrorText>
      </Screen>
    );
  const membership = club.data.membership;
  const active = membership?.status === 'ACTIVE';
  const manager = active && membership.role !== 'MEMBER';
  const actionError =
    join.error ??
    post.error ??
    createPoll.error ??
    addMedia.error ??
    createEvent.error ??
    updateMembership.error;
  return (
    <Screen>
      <BrandHeader title={club.data.name} body={club.data.description} />
      <Text style={{ color: colors.textSecondary }}>
        {club.data.memberCount} members · {club.data.visibility.toLowerCase()} · @{club.data.slug}
      </Text>
      {!active ? (
        <Button
          disabled={membership?.status === 'PENDING'}
          label={membership?.status === 'PENDING' ? 'Membership pending' : 'Join club'}
          loading={join.isPending}
          onPress={() => join.mutate()}
        />
      ) : null}
      {actionError === null ? null : <ErrorText>{errorMessage(actionError)}</ErrorText>}
      {active ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Start a discussion</Text>
          <Field
            label="Message"
            maxLength={10000}
            multiline
            onChangeText={setPostBody}
            value={postBody}
          />
          <Button
            disabled={postBody.trim().length === 0}
            label="Post discussion"
            loading={post.isPending}
            onPress={() => post.mutate()}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Discussions</Text>
        {club.data.posts.map((item) => (
          <PostCard key={item.id} post={item} />
        ))}
        {club.data.posts.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No discussions yet.</Text>
        ) : null}
      </View>
      {manager ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Create a poll</Text>
          <Field label="Question" onChangeText={setPollQuestion} value={pollQuestion} />
          <Field label="Option one" onChangeText={setPollOptionOne} value={pollOptionOne} />
          <Field label="Option two" onChangeText={setPollOptionTwo} value={pollOptionTwo} />
          <Button
            disabled={!pollQuestion.trim() || !pollOptionOne.trim() || !pollOptionTwo.trim()}
            label="Create poll"
            loading={createPoll.isPending}
            onPress={() => createPoll.mutate()}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Polls</Text>
        {club.data.polls.map((item) => (
          <PollCard active={active} clubId={club.data.id} key={item.id} poll={item} />
        ))}
        {club.data.polls.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No polls yet.</Text>
        ) : null}
      </View>
      {active ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Suggest a title</Text>
          <Field
            label="Search movies and shows"
            onChangeText={setMediaSearch}
            value={mediaSearch}
          />
          {(search.data ?? []).slice(0, 8).map((media) => (
            <Button
              key={media.id}
              label={`Add ${media.title}`}
              loading={addMedia.isPending}
              onPress={() => addMedia.mutate(media.id)}
              variant="secondary"
            />
          ))}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Collaborative watchlist</Text>
        {club.data.watchlist.map((item) => (
          <WatchlistItem active={active} clubId={club.data.id} item={item} key={item.id} />
        ))}
        {club.data.watchlist.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No suggestions yet.</Text>
        ) : null}
      </View>
      {manager ? (
        <View style={styles.section}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>
            Schedule a watch event
          </Text>
          <Field label="Event title" onChangeText={setEventTitle} value={eventTitle} />
          <Field
            autoCapitalize="none"
            label="Start time (ISO 8601)"
            onChangeText={setEventStartsAt}
            placeholder="2026-08-10T19:00:00+00:00"
            value={eventStartsAt}
          />
          <Button
            disabled={!eventTitle.trim() || Number.isNaN(Date.parse(eventStartsAt))}
            label="Schedule event"
            loading={createEvent.isPending}
            onPress={() => createEvent.mutate()}
          />
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Upcoming events</Text>
        {club.data.watchEvents.map((event) => (
          <EventCard event={event} key={event.id} />
        ))}
        {club.data.watchEvents.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>No watch events scheduled.</Text>
        ) : null}
      </View>
      <View style={styles.section}>
        <Text style={[styles.heading, { color: colors.textPrimary }]}>Members</Text>
        {club.data.members.map((member) => (
          <View key={member.id} style={[styles.card, { borderColor: colors.border }]}>
            <Text style={{ color: colors.textPrimary }}>
              {member.user.displayName} · {member.role.toLowerCase()} ·{' '}
              {member.status.toLowerCase()}
            </Text>
            {manager && member.status === 'PENDING' ? (
              <View style={styles.row}>
                <View style={styles.grow}>
                  <Button
                    disabled={updateMembership.isPending}
                    label="Approve"
                    onPress={() =>
                      updateMembership.mutate({ membershipId: member.id, action: 'APPROVE' })
                    }
                  />
                </View>
                <View style={styles.grow}>
                  <Button
                    disabled={updateMembership.isPending}
                    label="Decline"
                    onPress={() =>
                      updateMembership.mutate({ membershipId: member.id, action: 'REMOVE' })
                    }
                    variant="secondary"
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, gap: 10, padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  grow: { flex: 1 },
  heading: { fontSize: 21, fontWeight: '800' },
  option: { borderRadius: 10, borderWidth: 1, minHeight: 44, padding: 12 },
  row: { flexDirection: 'row', gap: 10 },
  section: { gap: 12 },
});
