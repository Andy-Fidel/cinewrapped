import type { MediaSummary } from '@cinewrapped/shared-types';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../lib/api';
import { PosterImage, useColors } from './ui';

export function ShareCollagePicker({
  selected,
  onChange,
}: {
  selected: MediaSummary[];
  onChange: (items: MediaSummary[]) => void;
}) {
  const colors = useColors();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const results = useQuery({
    queryKey: ['share-collage-search', debounced],
    queryFn: () =>
      api.request<{ items: MediaSummary[] }>(
        `search?query=${encodeURIComponent(debounced)}&limit=6`,
      ),
    enabled: debounced.length > 1,
  });
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: colors.textSecondary }}>
        Pick up to four posters in display order. This changes only the card.
      </Text>
      {selected.map((item, i) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.title} from collage`}
          onPress={() => onChange(selected.filter((m) => m.id !== item.id))}
          style={{ padding: 10, backgroundColor: colors.surfaceRaised, borderRadius: 8 }}
        >
          <Text style={{ color: colors.textPrimary }}>
            {i + 1}. {item.title} · Remove
          </Text>
        </Pressable>
      ))}
      <TextInput
        accessibilityLabel="Search collage films"
        value={query}
        onChangeText={setQuery}
        placeholder="Search films for your collage"
        placeholderTextColor={colors.textSecondary}
        style={{
          color: colors.textPrimary,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 12,
          borderRadius: 8,
        }}
      />
      {results.isFetching ? <Text style={{ color: colors.textSecondary }}>Searching…</Text> : null}
      {results.isError ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          Search failed. Change the search to retry.
        </Text>
      ) : null}
      {debounced.length > 1 && results.isSuccess && !results.data.items.length ? (
        <Text style={{ color: colors.textSecondary }}>No matching films.</Text>
      ) : null}
      {(results.data?.items ?? []).map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          disabled={selected.length >= 4 || selected.some((m) => m.id === item.id)}
          onPress={() => onChange([...selected, item])}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 8,
            opacity: selected.length >= 4 || selected.some((m) => m.id === item.id) ? 0.5 : 1,
          }}
        >
          <PosterImage uri={item.posterUrl ?? null} size="sm" />
          <Text style={{ color: colors.textPrimary, flex: 1 }}>{item.title}</Text>
          <Text style={{ color: colors.textSecondary }}>Add</Text>
        </Pressable>
      ))}
    </View>
  );
}
