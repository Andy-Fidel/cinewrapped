import type { JournalEntryStatus, JournalEntrySummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { SelectChip, settingsControlStyles } from '../../src/components/settings-controls';
import { Button, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/providers/auth-provider';

export default function JournalScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState<JournalEntryStatus | undefined>();
  const journal = useQuery({
    queryKey: ['journal', deferredQuery, status ?? 'ALL'],
    queryFn: () =>
      api.request<JournalEntrySummary[]>(
        `journal?limit=50${status === undefined ? '' : `&status=${status}`}${deferredQuery.trim() === '' ? '' : `&query=${encodeURIComponent(deferredQuery.trim())}`}`,
      ),
    enabled: session !== null,
  });
  if (session === null) return <Redirect href="/(auth)/login" />;

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: 'Movie Journal' }} />
      <FeatureGate feature="MOVIE_JOURNAL">
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            My Movie Journal
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your private notes, memories, moods, and photos. Journal entries never appear in the
            social feed.
          </Text>
        </View>
        <View
          style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons color={colors.textSecondary} name="search-outline" size={18} />
          <TextInput
            accessibilityLabel="Search journal"
            onChangeText={setQuery}
            placeholder="Search titles or notes"
            placeholderTextColor={colors.textDisabled}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            value={query}
          />
        </View>
        <View style={settingsControlStyles.chips}>
          <SelectChip
            label="All"
            onPress={() => setStatus(undefined)}
            selected={status === undefined}
          />
          <SelectChip
            label="Drafts"
            onPress={() => setStatus('DRAFT')}
            selected={status === 'DRAFT'}
          />
          <SelectChip
            label="Completed"
            onPress={() => setStatus('COMPLETED')}
            selected={status === 'COMPLETED'}
          />
        </View>
        <View style={styles.entries}>
          {(journal.data ?? []).map((entry) => (
            <Pressable
              accessibilityRole="button"
              key={entry.id}
              onPress={() => router.push(`/journal/${entry.id}`)}
              style={({ pressed }) => [
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              {entry.media.posterUrl === null ? (
                <View
                  style={[
                    styles.poster,
                    styles.posterFallback,
                    { backgroundColor: colors.surfaceRaised },
                  ]}
                >
                  <Ionicons color={colors.textDisabled} name="film-outline" size={24} />
                </View>
              ) : (
                <Image source={{ uri: entry.media.posterUrl }} style={styles.poster} />
              )}
              <View style={styles.cardCopy}>
                <View style={styles.cardTitleRow}>
                  <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    {entry.title || entry.media.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: colors.surfaceRaised }]}>
                    <Text style={[styles.badgeText, { color: colors.brand }]}>
                      {entry.status === 'DRAFT' ? 'Draft' : 'Complete'}
                    </Text>
                  </View>
                </View>
                <Text numberOfLines={2} style={[styles.preview, { color: colors.textSecondary }]}>
                  {entry.notes || 'No notes yet.'}
                </Text>
                <Text style={[styles.date, { color: colors.textDisabled }]}>
                  {new Date(entry.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons color={colors.textDisabled} name="chevron-forward" size={18} />
            </Pressable>
          ))}
        </View>
        {journal.isPending ? (
          <Text style={{ color: colors.textSecondary }}>Loading journal…</Text>
        ) : null}
        {journal.isError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            Your journal could not be loaded.
          </Text>
        ) : null}
        {!journal.isPending && !journal.isError && journal.data.length === 0 ? (
          <View
            style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons color={colors.brand} name="book-outline" size={34} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Your journal is waiting
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Open a movie or show and choose “Add to Journal” to capture the memory.
            </Text>
            <Button label="Choose a title" onPress={() => router.push('/(tabs)/discover')} />
          </View>
        ) : null}
      </FeatureGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  card: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  cardCopy: { flex: 1, gap: 5 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
  cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  date: { fontSize: 11 },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, gap: 12, padding: 24 },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '800' },
  entries: { gap: 10 },
  hero: { gap: 8 },
  poster: { borderRadius: 8, height: 72, width: 48 },
  posterFallback: { alignItems: 'center', justifyContent: 'center' },
  preview: { fontSize: 13, lineHeight: 18 },
  search: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 15, minHeight: 48, paddingHorizontal: 10 },
  subtitle: { fontSize: 14, lineHeight: 21 },
  title: { fontSize: 28, fontWeight: '800' },
});
