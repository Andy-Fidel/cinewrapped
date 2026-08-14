import type { JournalEntrySummary, MediaSummary } from '@cinewrapped/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router, useLocalSearchParams } from 'expo-router';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { JournalForm, type JournalFormValue } from '../../src/components/journal-form';
import { Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';

export default function NewJournalEntryScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const { mediaId } = useLocalSearchParams<{ mediaId: string }>();
  const media = useQuery({
    queryKey: ['media-details', mediaId],
    queryFn: () => api.request<MediaSummary>(`media/${mediaId}`),
    enabled: session !== null && typeof mediaId === 'string',
  });
  const create = useMutation({
    mutationFn: (value: JournalFormValue) =>
      api.request<JournalEntrySummary>('journal', {
        method: 'POST',
        body: {
          mediaId,
          status: value.status,
          title: value.title || null,
          notes: value.notes || null,
          viewingLocation: value.viewingLocation || null,
          companionNames: value.companionNames,
          memorableQuotes: value.memorableQuotes,
          moodBefore: value.moodBefore,
          moodAfter: value.moodAfter,
          watchedAt: new Date().toISOString(),
        },
      }),
    onSuccess: async (entry) => {
      await queryClient.invalidateQueries({ queryKey: ['journal'] });
      router.replace(`/journal/${entry.id}`);
    },
    onError: (error) => Alert.alert('Could not save journal entry', errorMessage(error)),
  });
  if (session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'New Journal Entry' }} />
      <FeatureGate feature="MOVIE_JOURNAL">
        <View style={styles.mediaRow}>
          {media.data?.posterUrl ? (
            <Image source={{ uri: media.data.posterUrl }} style={styles.poster} />
          ) : null}
          <View style={styles.mediaCopy}>
            <Text style={[styles.eyebrow, { color: colors.brand }]}>PRIVATE JOURNAL</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {media.data?.title ?? 'Selected title'}
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Capture what this viewing meant to you. Nothing here is shared publicly.
            </Text>
          </View>
        </View>
        <JournalForm saving={create.isPending} onSubmit={(value) => create.mutate(value)} />
      </FeatureGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 13, lineHeight: 19 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  mediaCopy: { flex: 1, gap: 5 },
  mediaRow: { alignItems: 'center', flexDirection: 'row', gap: 14 },
  poster: { borderRadius: 10, height: 108, width: 72 },
  title: { fontSize: 22, fontWeight: '800' },
});
