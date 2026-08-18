import type { PublicProfile, RelationshipState } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, ErrorText, Screen, useColors } from '../../src/components/ui';
import { errorMessage } from '../../src/lib/error-message';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

export default function MemberProfileScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const { confirm } = useDialog();
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useQuery({
    queryKey: ['public-profile', username],
    queryFn: () => api.request<PublicProfile>(`users/${encodeURIComponent(username)}`),
    enabled: session !== null && typeof username === 'string',
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['public-profile', username] }),
      queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['friendships'] }),
    ]);
  };
  const relationship = useMutation({
    mutationFn: ({ path, method }: { path: string; method: 'POST' | 'PUT' | 'DELETE' }) =>
      api.request<RelationshipState | { deleted: true }>(path, { method }),
    onSuccess: refresh,
  });
  const friendRequest = useMutation({
    mutationFn: (targetId: string) =>
      api.request('friendships', {
        method: 'POST',
        body: { addresseeUserId: targetId },
      }),
    onSuccess: refresh,
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  if (profile.isPending)
    return (
      <Screen>
        <Text style={{ color: colors.textSecondary }}>Loading profile…</Text>
      </Screen>
    );
  if (profile.isError) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Profile' }} />
        <ErrorText>{errorMessage(profile.error)}</ErrorText>
        <Button label="Try again" onPress={() => void profile.refetch()} />
      </Screen>
    );
  }
  const member = profile.data;
  const isSelf = member.id === user?.id;
  const busy = relationship.isPending || friendRequest.isPending;
  const toggleRelationship = (path: string, active: boolean) =>
    relationship.mutate({ path, method: active ? 'DELETE' : 'PUT' });
  const block = async () => {
    const accepted = await confirm({
      title: `Block ${member.displayName}?`,
      message:
        'You will no longer see each other in search, profiles, or feeds. Existing follows are removed.',
      confirmLabel: 'Block',
      destructive: true,
    });
    if (accepted) relationship.mutate({ path: `blocks/${member.id}`, method: 'PUT' });
  };
  return (
    <Screen>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `@${member.username}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      <View style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={[styles.initial, { color: colors.brand }]}>
            {member.displayName.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <Text accessibilityRole="header" style={[styles.name, { color: colors.textPrimary }]}>
          {member.displayName}
        </Text>
        <Text style={{ color: colors.textSecondary }}>@{member.username}</Text>
        {member.bio === null ? null : (
          <Text style={[styles.bio, { color: colors.textPrimary }]}>{member.bio}</Text>
        )}
      </View>
      <View style={[styles.counts, { borderColor: colors.border }]}>
        {Object.entries(member.counts).map(([label, count]) => (
          <View key={label} style={styles.count}>
            <Text style={[styles.countValue, { color: colors.textPrimary }]}>{count}</Text>
            <Text style={{ color: colors.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
      {isSelf ? null : (
        <View style={styles.actions}>
          <Button
            disabled={busy}
            label={member.relationship.following ? 'Unfollow' : 'Follow'}
            onPress={() =>
              toggleRelationship(`follows/${member.id}`, member.relationship.following)
            }
          />
          {member.relationship.friendshipStatus === null ||
          member.relationship.friendshipStatus === 'DECLINED' ? (
            <Button
              disabled={busy}
              label="Add friend"
              onPress={() => friendRequest.mutate(member.id)}
              variant="secondary"
            />
          ) : (
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Friendship: {member.relationship.friendshipStatus.toLowerCase()}
            </Text>
          )}
          <Button
            disabled={busy}
            label={member.relationship.muted ? 'Unmute' : 'Mute'}
            onPress={() => toggleRelationship(`mutes/${member.id}`, member.relationship.muted)}
            variant="secondary"
          />
          <Button disabled={busy} label="Block" onPress={() => void block()} variant="danger" />
        </View>
      )}
      {relationship.isError || friendRequest.isError ? (
        <ErrorText>{errorMessage(relationship.error ?? friendRequest.error)}</ErrorText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', gap: 8 },
  avatar: {
    alignItems: 'center',
    borderRadius: 52,
    height: 104,
    justifyContent: 'center',
    width: 104,
  },
  initial: { fontSize: 40, fontWeight: '800' },
  name: { fontSize: 28, fontWeight: '800' },
  bio: { fontSize: 16, lineHeight: 24, marginTop: 8, textAlign: 'center' },
  counts: { borderBottomWidth: 1, borderTopWidth: 1, flexDirection: 'row', paddingVertical: 16 },
  count: { alignItems: 'center', flex: 1, gap: 3 },
  countValue: { fontSize: 18, fontWeight: '800' },
  actions: { gap: 10 },
});
