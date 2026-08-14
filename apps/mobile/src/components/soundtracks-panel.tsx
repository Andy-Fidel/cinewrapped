import type {
  SavedSoundtrackSummary,
  SoundtrackAlbumSummary,
  SoundtrackDiscoverySummary,
  SoundtrackTrackSummary,
} from '@cinewrapped/shared-types';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { api } from '../lib/api';
import { useColors } from './ui';

async function openExternal(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

function duration(value: number | null) {
  if (value === null) return null;
  const seconds = Math.round(value / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function TrackList({ albumId, countryCode }: { albumId: string; countryCode: string }) {
  const colors = useColors();
  const tracks = useQuery({
    queryKey: ['soundtrack-tracks', albumId, countryCode],
    queryFn: () =>
      api.request<SoundtrackTrackSummary[]>(
        `soundtracks/albums/${encodeURIComponent(albumId)}/tracks?countryCode=${encodeURIComponent(countryCode)}`,
      ),
    staleTime: 6 * 60 * 60 * 1000,
  });
  if (tracks.isPending) return <ActivityIndicator color={colors.brand} style={{ margin: 12 }} />;
  if (tracks.isError)
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => void tracks.refetch()}
        style={styles.retry}
      >
        <Text style={{ color: colors.danger }}>Couldn’t load tracks. Tap to retry.</Text>
      </Pressable>
    );
  return (
    <View style={[styles.trackList, { borderTopColor: colors.border }]}>
      {tracks.data.map((track) => (
        <Pressable
          accessibilityHint={
            track.previewUrl === null
              ? 'Opens this track in Apple Music'
              : 'Streams the Apple preview'
          }
          accessibilityRole="link"
          key={track.providerTrackId}
          onPress={() => void openExternal(track.previewUrl ?? track.providerUrl)}
          style={({ pressed }) => [styles.track, { opacity: pressed ? 0.65 : 1 }]}
        >
          <Text style={[styles.trackNumber, { color: colors.textDisabled }]}>
            {track.trackNumber ?? '–'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={[styles.trackTitle, { color: colors.textPrimary }]}>
              {track.title}
              {track.explicit ? '  E' : ''}
            </Text>
            <Text numberOfLines={1} style={[styles.trackArtist, { color: colors.textSecondary }]}>
              {track.previewUrl === null ? track.artistName : `${track.artistName} · Preview`}
            </Text>
          </View>
          <Text style={{ color: colors.textDisabled }}>{duration(track.durationMs)}</Text>
          <Ionicons
            color={colors.brand}
            name={track.previewUrl === null ? 'open-outline' : 'play-circle-outline'}
            size={21}
          />
        </Pressable>
      ))}
      {tracks.data.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>
          No track list is available for this album.
        </Text>
      ) : null}
      <Text style={[styles.previewNotice, { color: colors.textDisabled }]}>
        Preview audio courtesy of Apple.
      </Text>
    </View>
  );
}

function AlbumCard({
  album,
  countryCode,
  saving,
  onToggleSave,
}: {
  album: SoundtrackAlbumSummary;
  countryCode: string;
  saving: boolean;
  onToggleSave: () => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  return (
    <View style={[styles.album, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.albumTop}>
        {album.artworkUrl === null ? (
          <View
            style={[
              styles.artwork,
              styles.artworkFallback,
              { backgroundColor: colors.surfaceRaised },
            ]}
          >
            <Ionicons color={colors.textDisabled} name="musical-notes-outline" size={28} />
          </View>
        ) : (
          <Image source={{ uri: album.artworkUrl }} style={styles.artwork} />
        )}
        <View style={styles.albumCopy}>
          <Text numberOfLines={2} style={[styles.albumTitle, { color: colors.textPrimary }]}>
            {album.title}
          </Text>
          <Text numberOfLines={1} style={[styles.albumArtist, { color: colors.textSecondary }]}>
            {album.artistName}
          </Text>
          <Text style={[styles.albumMeta, { color: colors.textDisabled }]}>
            {[
              album.releaseDate?.slice(0, 4),
              album.trackCount === null ? null : `${album.trackCount} tracks`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={album.saveId === null ? 'Save soundtrack' : 'Remove saved soundtrack'}
          accessibilityRole="button"
          disabled={saving}
          hitSlop={8}
          onPress={onToggleSave}
        >
          {saving ? (
            <ActivityIndicator color={colors.brand} />
          ) : (
            <Ionicons
              color={colors.brand}
              name={album.saveId === null ? 'bookmark-outline' : 'bookmark'}
              size={25}
            />
          )}
        </Pressable>
      </View>
      <View style={styles.albumActions}>
        {album.serviceLinks.map((link) => (
          <Pressable
            accessibilityRole="link"
            key={link.service}
            onPress={() => void openExternal(link.url)}
            style={({ pressed }) => [
              styles.serviceButton,
              { backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons
              color={colors.brand}
              name={link.service === 'APPLE_MUSIC' ? 'musical-note' : 'radio-outline'}
              size={16}
            />
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '700' }}>
              {link.service === 'APPLE_MUSIC' ? 'Apple Music' : 'Spotify'}
            </Text>
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          onPress={() => setExpanded((value) => !value)}
          style={styles.trackToggle}
        >
          <Text style={{ color: colors.brand, fontSize: 12, fontWeight: '800' }}>
            {expanded ? 'Hide tracks' : 'View tracks'}
          </Text>
          <Ionicons
            color={colors.brand}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={15}
          />
        </Pressable>
      </View>
      {expanded ? <TrackList albumId={album.providerAlbumId} countryCode={countryCode} /> : null}
    </View>
  );
}

export function SoundtracksPanel({
  mediaId,
  countryCode,
}: {
  mediaId: string;
  countryCode: string;
}) {
  const colors = useColors();
  const client = useQueryClient();
  const discoveryKey = ['soundtracks', mediaId, countryCode] as const;
  const soundtracks = useQuery({
    queryKey: discoveryKey,
    queryFn: () =>
      api.request<SoundtrackDiscoverySummary>(
        `media/${encodeURIComponent(mediaId)}/soundtracks?countryCode=${encodeURIComponent(countryCode)}`,
      ),
    staleTime: 6 * 60 * 60 * 1000,
  });
  const save = useMutation({
    mutationFn: (album: SoundtrackAlbumSummary) =>
      album.saveId === null
        ? api.request<SavedSoundtrackSummary>(
            `media/${encodeURIComponent(mediaId)}/soundtracks/saves`,
            {
              method: 'POST',
              body: {
                provider: album.provider,
                providerAlbumId: album.providerAlbumId,
                title: album.title,
                artistName: album.artistName,
                artworkUrl: album.artworkUrl,
                providerUrl: album.providerUrl,
                releaseDate: album.releaseDate,
                trackCount: album.trackCount,
              },
            },
          )
        : api.request<{ id: string }>(`soundtracks/saves/${encodeURIComponent(album.saveId)}`, {
            method: 'DELETE',
          }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: discoveryKey }),
        client.invalidateQueries({ queryKey: ['saved-soundtracks'] }),
      ]);
    },
  });

  return (
    <View style={styles.panel}>
      <View style={styles.headingRow}>
        <View style={[styles.headingIcon, { backgroundColor: colors.surfaceRaised }]}>
          <Ionicons color={colors.brand} name="musical-notes" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heading, { color: colors.textPrimary }]}>Soundtracks</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Discover music from this title and save albums for later.
          </Text>
        </View>
      </View>
      {soundtracks.isPending ? (
        <ActivityIndicator color={colors.brand} style={{ marginVertical: 20 }} />
      ) : null}
      {soundtracks.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => void soundtracks.refetch()}
          style={[
            styles.errorCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons color={colors.danger} name="cloud-offline-outline" size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
              Soundtracks are unavailable
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Tap to try the music catalog again.
            </Text>
          </View>
        </Pressable>
      ) : null}
      {soundtracks.data?.albums.map((album) => (
        <AlbumCard
          album={album}
          countryCode={countryCode}
          key={album.providerAlbumId}
          onToggleSave={() => save.mutate(album)}
          saving={save.isPending && save.variables.providerAlbumId === album.providerAlbumId}
        />
      ))}
      {soundtracks.data?.albums.length === 0 ? (
        <Text style={{ color: colors.textSecondary, lineHeight: 20 }}>
          No matching official soundtrack was found in the Apple catalog.
        </Text>
      ) : null}
      {soundtracks.data ? (
        <Text style={[styles.attribution, { color: colors.textDisabled }]}>
          Music catalog and artwork provided by Apple. Availability varies by region.
        </Text>
      ) : null}
      {save.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          We couldn’t update this saved soundtrack. Please try again.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  album: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', padding: 12 },
  albumActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  albumArtist: { fontSize: 13, marginTop: 3 },
  albumCopy: { flex: 1 },
  albumMeta: { fontSize: 11, marginTop: 5 },
  albumTitle: { fontSize: 15, fontWeight: '800', lineHeight: 19 },
  albumTop: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  artwork: { borderRadius: 10, height: 76, width: 76 },
  artworkFallback: { alignItems: 'center', justifyContent: 'center' },
  attribution: { fontSize: 11, lineHeight: 16 },
  errorCard: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  heading: { fontSize: 20, fontWeight: '800' },
  headingIcon: {
    alignItems: 'center',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  headingRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 11 },
  panel: { gap: 12 },
  previewNotice: { fontSize: 10, marginTop: 4 },
  retry: { padding: 12 },
  serviceButton: {
    alignItems: 'center',
    borderRadius: 9,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  subtitle: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  track: { alignItems: 'center', flexDirection: 'row', gap: 8, minHeight: 44 },
  trackArtist: { fontSize: 11, marginTop: 2 },
  trackList: { borderTopWidth: 1, marginTop: 12, paddingTop: 8 },
  trackNumber: { fontSize: 12, textAlign: 'center', width: 20 },
  trackTitle: { fontSize: 13, fontWeight: '700' },
  trackToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    marginLeft: 'auto',
    padding: 7,
  },
});
