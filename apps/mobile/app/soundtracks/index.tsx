import type { SavedSoundtrackSummary } from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect, Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FeatureGate } from '../../src/components/feature-gate';
import { BrandHeader, Screen, useColors } from '../../src/components/ui';
import { api } from '../../src/lib/api';
import { errorMessage } from '../../src/lib/error-message';
import { useAuth } from '../../src/providers/auth-provider';
import { useDialog } from '../../src/providers/dialog-provider';

async function openExternal(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

export default function SavedSoundtracksScreen() {
  const colors = useColors();
  const { session } = useAuth();
  const { confirm, showError } = useDialog();
  const client = useQueryClient();
  const saved = useQuery({
    queryKey: ['saved-soundtracks'],
    queryFn: () => api.request<SavedSoundtrackSummary[]>('soundtracks/saves'),
    enabled: session !== null,
  });
  const remove = useMutation({
    mutationFn: (id: string) =>
      api.request<{ id: string }>(`soundtracks/saves/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['saved-soundtracks'] }),
        client.invalidateQueries({ queryKey: ['soundtracks'] }),
      ]);
    },
    onError: (error) => showError('Could not remove soundtrack', errorMessage(error)),
  });
  const removeSoundtrack = async (album: SavedSoundtrackSummary) => {
    const accepted = await confirm({
      title: 'Remove saved soundtrack?',
      message: `${album.title} by ${album.artistName} will be removed from your saved soundtracks.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (accepted) remove.mutate(album.id);
  };
  if (session === null) return <Redirect href="/(auth)/login" />;
  return (
    <FeatureGate feature="SOUNDTRACKS">
      <Screen>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Saved Soundtracks',
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.textPrimary,
          }}
        />
        <BrandHeader
          title="Saved Soundtracks"
          body="Albums you bookmarked while exploring movies and series."
        />
        {saved.isPending ? <ActivityIndicator color={colors.brand} /> : null}
        {saved.isError ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void saved.refetch()}
            style={[
              styles.message,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons color={colors.danger} name="cloud-offline-outline" size={22} />
            <Text style={{ color: colors.textPrimary, flex: 1 }}>
              Couldn’t load your soundtracks. Tap to retry.
            </Text>
          </Pressable>
        ) : null}
        {saved.data?.map((album) => (
          <View
            key={album.id}
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {album.artworkUrl === null ? (
              <View
                style={[styles.artwork, styles.fallback, { backgroundColor: colors.surfaceRaised }]}
              >
                <Ionicons color={colors.textDisabled} name="musical-notes-outline" size={30} />
              </View>
            ) : (
              <Image source={{ uri: album.artworkUrl }} style={styles.artwork} />
            )}
            <View style={styles.copy}>
              <Text numberOfLines={2} style={[styles.title, { color: colors.textPrimary }]}>
                {album.title}
              </Text>
              <Text numberOfLines={1} style={[styles.artist, { color: colors.textSecondary }]}>
                {album.artistName}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/media/${album.media.id}`)}
              >
                <Text style={[styles.media, { color: colors.brand }]}>
                  From {album.media.title}
                </Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => void openExternal(album.providerUrl)}
                  style={[styles.action, { backgroundColor: colors.surfaceRaised }]}
                >
                  <Ionicons color={colors.brand} name="musical-note" size={15} />
                  <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
                    Listen
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Remove saved soundtrack"
                  accessibilityRole="button"
                  disabled={remove.isPending && remove.variables === album.id}
                  onPress={() => void removeSoundtrack(album)}
                  style={styles.remove}
                >
                  {remove.isPending && remove.variables === album.id ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <Ionicons color={colors.danger} name="trash-outline" size={18} />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        ))}
        {saved.data?.length === 0 ? (
          <View
            style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons color={colors.brand} name="musical-notes-outline" size={36} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No saved soundtracks yet
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Open a movie or series and use its Soundtracks section to discover and save an album.
            </Text>
          </View>
        ) : null}
        {remove.isError ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            Couldn’t remove that soundtrack. Please try again.
          </Text>
        ) : null}
      </Screen>
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  actions: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  artist: { fontSize: 13, marginTop: 3 },
  artwork: { borderRadius: 12, height: 100, width: 100 },
  card: { borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 13, padding: 12 },
  copy: { flex: 1 },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, gap: 8, padding: 28 },
  emptyBody: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800' },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  media: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  message: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  remove: { padding: 8 },
  title: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
});
