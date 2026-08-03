import type { EpisodeProgressSummary } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColors } from '../../../../src/components/ui';
import { api } from '../../../../src/lib/api';
import { useAuth } from '../../../../src/providers/auth-provider';

export default function SeasonScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { session, user } = useAuth();
  const { mediaId, seasonNumber } = useLocalSearchParams<{
    mediaId: string;
    seasonNumber: string;
  }>();
  const episodes = useQuery({
    queryKey: ['episodes', mediaId, seasonNumber],
    queryFn: () =>
      api.request<EpisodeProgressSummary[]>(
        `library/media/${mediaId}/seasons/${seasonNumber}/episodes?language=${encodeURIComponent(user?.preferredLanguage ?? 'en-US')}`,
      ),
    enabled: session !== null && typeof mediaId === 'string' && typeof seasonNumber === 'string',
  });
  const progress = useMutation({
    mutationFn: (episode: EpisodeProgressSummary) =>
      api.request(`library/episodes/${episode.episodeId}/progress`, {
        method: 'PUT',
        body: {
          completed: !episode.completed,
          watchedAt: !episode.completed ? new Date().toISOString() : null,
          ...(episode.version === null ? {} : { expectedVersion: episode.version }),
        },
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['episodes', mediaId, seasonNumber] }),
        queryClient.invalidateQueries({ queryKey: ['library'] }),
        queryClient.invalidateQueries({ queryKey: ['tracking-state', mediaId] }),
      ]);
    },
  });
  if (session === null) return <Redirect href="/(auth)/login" />;
  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Season ${seasonNumber}`,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
        }}
      />
      {episodes.isPending ? (
        <ActivityIndicator color={colors.brand} style={styles.center} />
      ) : (
        <FlatList
          data={episodes.data ?? []}
          keyExtractor={(episode) => episode.episodeId}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={{ color: episodes.isError ? colors.danger : colors.textSecondary }}>
              {episodes.isError
                ? 'Episodes could not be loaded.'
                : 'No episodes were reported for this season.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              disabled={progress.isPending}
              onPress={() => progress.mutate(item)}
              style={[
                styles.episode,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <View
                style={[
                  styles.check,
                  { backgroundColor: item.completed ? colors.brand : colors.surfaceRaised },
                ]}
              >
                <Text style={{ color: item.completed ? colors.onBrand : colors.textPrimary }}>
                  {item.completed ? '✓' : item.episodeNumber}
                </Text>
              </View>
              <View style={styles.copy}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={{ color: colors.textSecondary }}>
                  {item.runtimeMinutes === null
                    ? `Episode ${item.episodeNumber}`
                    : `${item.runtimeMinutes} min`}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  center: { flex: 1 },
  list: { gap: 10, padding: 18 },
  episode: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    padding: 14,
  },
  check: {
    alignItems: 'center',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '700' },
});
