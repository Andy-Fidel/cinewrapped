import type { ClubDetails, ClubSummary } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandHeader, Button, ErrorText, Field, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';

function ClubCard({ club }: { club: ClubSummary }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/clubs/${club.id}`)}
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}
    >
      <View style={styles.row}>
        <Text style={[styles.cardTitle, styles.grow, { color: colors.textPrimary }]}>
          {club.name}
        </Text>
        <Text style={{ color: colors.brand }}>{club.memberCount} members</Text>
      </View>
      <Text numberOfLines={3} style={{ color: colors.textSecondary }}>
        {club.description}
      </Text>
      <Text style={{ color: colors.textSecondary }}>
        {club.visibility.toLowerCase()} · {club.membershipType.toLowerCase().replace('_', ' ')}
        {club.membership === null ? '' : ` · ${club.membership.status.toLowerCase()}`}
      </Text>
    </Pressable>
  );
}

export default function ClubsScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'DISCOVER' | 'MINE'>('DISCOVER');
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search.trim());
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const clubs = useQuery({
    queryKey: ['clubs', scope, query],
    queryFn: () =>
      api.request<ClubSummary[]>(`clubs?scope=${scope}&q=${encodeURIComponent(query)}&limit=30`),
  });
  const create = useMutation({
    mutationFn: () =>
      api.request<ClubDetails>('clubs', {
        method: 'POST',
        body: {
          name,
          description,
          visibility: 'PUBLIC',
          membershipType: 'OPEN',
          category: 'Film discussion',
        },
      }),
    onSuccess: async (club) => {
      await queryClient.invalidateQueries({ queryKey: ['clubs'] });
      router.replace(`/clubs/${club.id}`);
    },
  });
  return (
    <Screen>
      <BrandHeader
        title="Movie clubs"
        body="Discuss films, vote on what to watch, and plan screenings together."
      />
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button
            label="Discover"
            variant={scope === 'DISCOVER' ? 'primary' : 'secondary'}
            onPress={() => setScope('DISCOVER')}
          />
        </View>
        <View style={styles.grow}>
          <Button
            label="My clubs"
            variant={scope === 'MINE' ? 'primary' : 'secondary'}
            onPress={() => setScope('MINE')}
          />
        </View>
      </View>
      <Field
        label="Search clubs"
        onChangeText={setSearch}
        placeholder="Name or description"
        value={search}
      />
      <Button
        label={creating ? 'Cancel new club' : 'Create a club'}
        variant="secondary"
        onPress={() => setCreating((value) => !value)}
      />
      {creating ? (
        <View style={[styles.card, { borderColor: colors.border }]}>
          <Field label="Club name" maxLength={120} onChangeText={setName} value={name} />
          <Field
            label="Description"
            maxLength={2000}
            multiline
            onChangeText={setDescription}
            value={description}
          />
          <Button
            disabled={name.trim().length < 3 || description.trim().length === 0}
            label="Create public club"
            loading={create.isPending}
            onPress={() => create.mutate()}
          />
          {create.isError ? <ErrorText>{errorMessage(create.error)}</ErrorText> : null}
        </View>
      ) : null}
      <View style={styles.list}>
        {(clubs.data ?? []).map((club) => (
          <ClubCard club={club} key={club.id} />
        ))}
        {clubs.isPending ? (
          <Text style={{ color: colors.textSecondary }}>Loading clubs…</Text>
        ) : null}
        {clubs.isError ? <ErrorText>{errorMessage(clubs.error)}</ErrorText> : null}
        {clubs.data?.length === 0 ? (
          <Text style={{ color: colors.textSecondary }}>
            {scope === 'MINE' ? 'You have not joined a club yet.' : 'No clubs match this search.'}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, gap: 12, padding: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  grow: { flex: 1 },
  list: { gap: 12 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
